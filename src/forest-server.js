
import _ from 'lodash';
import express from 'express';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import superagent from 'superagent';
import mongodb from 'mongodb';
import core from './forest-core';
import auth from './auth';
import mosca from 'mosca';

let serverHost=null;
let serverPort=0;

// --------------------------------

function safeParse(s){
  try{
    return JSON.parse(s);
  }
  catch(e){
    console.error('incoming data corrupt:', s, e);
    return {};
  }
}

// --------------------------------

const logRequest = (req, res, next) => {
  console.log('------------http------------>', new Date().toISOString());
  if(req.method==='POST') console.log(req.method, req.originalUrl, req.body && (req.body.Notify+' '+req.body.UID), req.headers.authorization||'');
  else                    console.log(req.method, req.originalUrl,                                                 req.headers.authorization||'');
  next();
};

const logResponse = (req, res, next) => {
  console.log(res.statusCode);
  console.log('<-----------http-------------');
  next();
};

const logMQTTPublish = (notifying, body) => {
  console.log('------------mqtt------------>', new Date().toISOString());
  console.log('Publish', notifying, body.UID, body.Peer, body.User);
};

const logMQTTResult = ok => {
  console.log(ok? 'OK': 'FAIL');
  console.log('<-----------mqtt-------------');
};

const CORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'); // Accept, X-Requested-By, Origin, Cache-Control
  next();
};

// --------------------------------

const pendingNotifies = {};

function prefixUIDs(o){
  const s = JSON.stringify(_.omit(o, core.localProps), null, 2);
  return s.replace(/"(uid-[^"]*"[^:])/g, `"http://${serverHost}:${serverPort}/$1`);
}

function checkPKAndReturnObject(Peer, uid, r){
  if(!r.pk || r.pk==='FAIL') return null;
  if(r.pk==='OK' || auth.checkSig(r.pk)){
    return core.getObject(uid).then(o => {
      if(Peer) core.setNotify(o,Peer);
      return o;
    });
  }
  return null;
  // TODO: delete r
}

function checkPKAndSaveObject(User, Peer, body, setnotify, r){
  if(!r.pk || r.pk==='FAIL') return false;
  if(r.pk==='OK' || auth.checkSig(r.pk)){
    core.incomingObject(Object.assign({ User }, Peer && { Peer }, body), setnotify);
    return true;
  }
  return false;
  // TODO: delete r
}

// ---- HTTP ----------------------

const app = express();

app.use(bodyParser.json());

app.options("/*",
  logRequest,
  CORS,
  (req, res, next) => {
    res.sendStatus(200);
  },
  logResponse,
);

app.get('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const { Peer, User } = auth.getPeerUser(req);
    const uid = req.originalUrl.substring(1);
    const rc=core.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      direction: 'Observe',
      uid,
    });
    core.runEvaluator(rc).then(r => {
      if(r.pk) return checkPKAndReturnObject(Peer, uid, r);
      return new Promise(resolve => setTimeout(()=>core.getObject(rc).then(r=>{
        return resolve(checkPKAndReturnObject(Peer, uid, r));
      }), 500));
    })
    .then(o => {
      if(o) res.json(JSON.parse(prefixUIDs(o)));
      else  res.status(404).send('Not found');
    })
    .then(()=>next())
    .catch(e => {
      console.error(e);
      res.status(404).send('Not found');
      next();
    });
  },
  logResponse,
);

app.post('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const body=req.body;
    if(!body || !body.UID) next();
    const { Peer, User } = auth.getPeerUser(req);
    const path = req.originalUrl.substring(1);
    const setnotify=(path!=='notify' && path || '');
    const n=_.uniq(core.listify(setnotify, body.Notify));
    const notifying=(n.length===1 && n[0]) || n;
    const rc=core.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      direction: 'Notify',
      uid: body.UID,
      notifying,
      body,
    });
    core.runEvaluator(rc).then(r => {
      if(r.pk) return checkPKAndSaveObject(User, Peer, body, setnotify, r);
      return new Promise(resolve => setTimeout(()=>core.getObject(rc).then(r=>{
        return resolve(checkPKAndSaveObject(User, Peer, body, setnotify, r));
      }), 500));
    })
    .then(ok=>ok? res.json({ }): res.status(403).send('Forbidden'))
    .then(()=>next())
    .catch(e => {
      console.error(e);
      res.status(403).send('Forbidden');
      next();
    });
  },
  logResponse,
);

// ---- WebSockets ----------------

const peer2ws = {};

function wsInit(config){
  const wss = new WebSocket.Server(config);
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const body = safeParse(data);
      if(body.Peer){
        console.log('ws init:', body);
        peer2ws[body.Peer]=ws;
        ws.send(auth.makeWSAuth());
        wsFlushNotify(body.Peer);
      }
      else{
        console.log('ws incoming:', body);
      }
    });
  });
}

function wsFlushNotify(Peer){
  const ws = peer2ws[Peer];
  let o;
  while((o=(pendingNotifies[Peer]||[]).shift())){
    try{
      console.log('<<----------ws---------------', Peer);
      if(ws.readyState === ws.OPEN) ws.send(o);
      else console.log('WebSocket closed sending\n', o, '\nto', Peer);
    }
    catch(e){
      console.error('error sending\n', o, '\nto', Peer, '\n', e);
    }
  }
}

// ---- MQTT ----------------------

let mqtts=null;

const peer2mqtt = {};

function mqttInit(config){

  mqtts = new mosca.Server(config);

  var authenticate = (client, username, password, cb) => {
    const ok = true;
    cb(null, ok);
  }

  mqtts.on('ready', () => {
    mqtts.authenticate = authenticate;
    console.log('MQTT running on ports', config.port, config.secure.port)
  });

  mqtts.on('clientConnected', (client) => {
  });

  mqtts.on('subscribed', (topic, client) => {
  });

  mqtts.on('published', ({ topic, payload }, client) => {
    if(topic.startsWith('$')) return;
    if(topic.startsWith('peer-')) return;
    const body = safeParse(payload.toString());
    if(!body || !body.UID) return;
    const { Peer, User } = body;
    const setnotify=(topic!=='notify' && topic || '');
    const n=_.uniq(core.listify(setnotify, body.Notify));
    const notifying=(n.length===1 && n[0]) || n;
    logMQTTPublish(notifying, body);
    const rc=core.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      direction: 'Notify',
      uid: body.UID,
      notifying,
      body,
    });
    core.runEvaluator(rc).then(r => {
      if(r.pk) return checkPKAndSaveObject(User, Peer, body, setnotify, r);
      return new Promise(resolve => setTimeout(()=>core.getObject(rc).then(r=>{
        return resolve(checkPKAndSaveObject(User, Peer, body, setnotify, r));
      }), 500));
    })
    .then(ok=>{
      peer2mqtt[Peer]=ok;
      mqttFlushNotify(Peer);
      logMQTTResult(ok);
    })
    .catch(e => {
      console.error(e);
    });
  });
}

function mqttFlushNotify(Peer){
  let o;
  while((o=(pendingNotifies[Peer]||[]).shift())){
    const packet = {
      topic: Peer,
      payload: o,
      qos: 1,
      retain: false,
    };
    try{
      mqtts.publish(packet, () => {
        console.log('<<----------mqtt-------------', Peer);
      });
    }
    catch(e){
      console.error('error sending\n', o, '\nto', Peer, '\n', e);
    }
  }
}

// --------------------------------

function doGet(url){
  return superagent.get(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(auth.makeHTTPAuth())
    .then(x => x.body);
}

function doPost(o, u){
  if(core.isURL(u)) return Promise.resolve(false);
  const Peer = core.isPeer(u)? u: o.Peer;
  if(!pendingNotifies[Peer]) pendingNotifies[Peer] = [];
  pendingNotifies[Peer].push(prefixUIDs(o));
  if(peer2ws[Peer]) wsFlushNotify(Peer);
  else
  if(peer2mqtt[Peer]) mqttFlushNotify(Peer);
  return Promise.resolve(true);
}

core.setNetwork({ doGet, doPost });

// ---- Mongo ---------------------

let forestdb;

function persistenceInit(mongoHostPort){
  return mongodb.MongoClient.connect(mongoHostPort)
    .then((client) => {
      forestdb = client.db('forest');
    });
}

function persist(o){
  if(!o.is) return Promise.resolve();
  const collectionName = (o.is.constructor===String)? o.is:
                        ((o.is.constructor===Array)? o.is.join('-'): null);
  if(!collectionName) return Promise.resolve();
  return forestdb.collection(collectionName)
    .update({ UID: o.UID }, o, { upsert: true })
    .then(result => result.result)
    .catch(err => { console.log(err, `Failed to insert ${o.UID} in ${collectionName}`); return err });
}

function fetch(uid){
  return forestdb.collections().then(colls=>findOneFirst(colls, uid));
}

function findOneFirst(colls, uid){
  if(!(colls && colls.length)) return Promise.resolve(null);
  return colls[0].findOne({ UID: uid }, { projection: { _id: 0 }}).then(o => o || findOneFirst(colls.slice(1), uid));
}

function recache(){
  return forestdb.collections()
    .then(colls=>Promise.all(colls.map(coll=>coll.find({ Cache: 'keep-active' }, { projection: { _id: 0 }}).toArray()))
                  .then(actives => [].concat(...actives)));
}

function query(is, scope, query){
  return forestdb.collection(is.join('-'))
    .find(toMongo(scope, query.match), { projection: { _id: 0 }})
    .toArray()
    .then(r => r.map(o => query.inline? getInlineVals(o, query.inline): o.UID))
    .catch(e => console.error(e));
}

function toMongo(scope, match){
  return Object.assign({}, ...Object.keys(match).map(k => ({[k]: toMongoProp(k,match[k])})));
}

function toMongoProp(key, val){
  if(val.length===3 && val[1]==='..'){
    return { $gt: val[0], $lt: val[2] };
  }
  return val;
}

function getInlineVals(o, inline){
  return Object.assign({}, ...inline.map(k => o[k] && { [k]: o[k] }), { More: o.UID });
}

function dropAll(actually){
  return forestdb.collections()
            .then(colls=>Promise.all(colls.map(coll=>coll.stats()
              .then(s=>{
                  if(!/system.indexes/.test(s.ns)){
                    console.log(actually? '*************** dropping': '(not dropping)', s.ns, s.count);
                    return actually && coll.drop();
                  }
              })
            )));
}

core.setPersistence({ persist, fetch, recache, query });

// --------------------------------

function init({httpHost, httpPort, mongoHostPort, wsPort, mqttConfig}){
  serverHost=httpHost; serverPort=httpPort;
  return new Promise((resolve, reject) => {
    persistenceInit(mongoHostPort)
      .then(() => {
        app.listen(httpPort, ()=>{
          console.log(`Server started on port ${httpPort}`);
          if(wsPort) wsInit({ port: wsPort });
          if(mqttConfig) mqttInit(mqttConfig);
          resolve();
        }).on('error', (err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export default {
  init,
  dropAll,
  cacheObjects:        core.cacheObjects,
  reCacheObjects:      core.reCacheObjects,
  setEvaluator:        core.setEvaluator,
  runEvaluator:        core.runEvaluator,
  getObject:           core.getObject,
  spawnObject:         core.spawnObject,
  makeUID:             core.makeUID,
  listify:             core.listify,
  setLogging:          core.setLogging,
  setPeerIdentityUser: auth.setPeerIdentityUser,
}


