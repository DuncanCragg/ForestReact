
import _ from 'lodash';
import express from 'express';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import superagent from 'superagent';
import mongodb from 'mongodb';
import core from './forest-core';
import auth from './auth';

let serverHost=null;
let serverPort=0;

// --------------------------------

const logRequest = (req, res, next) => {
  console.log('---------------------------->');
  if(req.method==='POST') console.log(req.method, req.originalUrl, req.body && req.body.UID, req.headers.authorization||'');
  else                    console.log(req.method, req.originalUrl,                           req.headers.authorization||'');
  next();
};

const logResponse = (req, res, next) => {
  console.log(res.statusCode);
  console.log('<----------------------------');
  next();
};

const CORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'); // Accept, X-Requested-By, Origin, Cache-Control
  next();
};


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

function prefixUIDs(o){
  const s = JSON.stringify(_.omit(o, core.localProps), null, 2);
  return s.replace(/"(uid-[^"]*"[^:])/g, `"http://${serverHost}:${serverPort}/$1`);
}

function checkPKAndReturnObject(Peer, uid, res, r){
  if(!r.PK || r.PK==='FAIL'){
    res.status(404).send('Not found');
  }
  else if(r.PK==='OK' || auth.checkSig(r.PK)){
  // TODO: delete r
    return core.getObject(uid).then(o => {
      res.json(JSON.parse(prefixUIDs(o)));
      if(Peer) core.setNotify(o,Peer);
    });
  }
  else{
    res.status(404).send('Not found');
  }
  // TODO: delete r
}

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
      method: 'GET',
      url: uid,
    });
    core.runEvaluator(rc).then(r => {
      if(r.PK) return checkPKAndReturnObject(Peer, uid, res, r);
      return new Promise(resolve => setTimeout(()=>core.getObject(rc).then(r=>resolve(checkPKAndReturnObject(Peer, uid, res, r))), 500));
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

function checkPKAndSaveObject(User, Peer, json, path, res, r){
  if(!r.PK || r.PK==='FAIL'){
    res.status(403).send('Forbidden');
  }
  else if(r.PK==='OK' || auth.checkSig(r.PK)){
    core.incomingObject(Object.assign({ User }, Peer && { Peer }, json), path!=='notify' && path);
    res.json({ });
  }
  else{
    res.status(403).send('Forbidden');
  }
  // TODO: delete r
}

app.post('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const json=req.body;
    if(!json || !json.UID) next();
    const { Peer, User } = auth.getPeerUser(req);
    const path = req.originalUrl.substring(1);
    const rc=core.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      method: 'POST',
      url: json.UID,
      body: json,
    });
    core.runEvaluator(rc).then(r => {
      if(r.PK) return checkPKAndSaveObject(User, Peer, json, path, res, r);
      return new Promise(resolve => setTimeout(()=>core.getObject(rc).then(r=>resolve(checkPKAndSaveObject(User, Peer, json, path, res, r))), 500));
    })
    .then(()=>next())
    .catch(e => {
      console.error(e);
      res.status(403).send('Forbidden');
      next();
    });
  },
  logResponse,
);

function doGet(url){
  return superagent.get(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(auth.makeHTTPAuth())
    .then(x => x.body);
}

const pendingWSpackets = {};

function doPost(o, u){
  if(core.isURL(u)) return Promise.resolve(false);
  const Peer = core.isNotify(u)? u: o.Peer;
  if(!pendingWSpackets[Peer]) pendingWSpackets[Peer] = [];
  pendingWSpackets[Peer].push(prefixUIDs(o));
  wsFlush(Peer);
  return Promise.resolve(true);
}

const peer2ws = {};

function wsInit(config){
  const wss = new WebSocket.Server(config);
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const json = JSON.parse(data);
      if(json.Peer){
        console.log('ws init:', json);
        peer2ws[json.Peer]=ws;
        ws.send(auth.makeWSAuth());
        wsFlush(json.Peer);
      }
      else{
        console.log('ws incoming json:', json);
      }
    });
  });
}

function wsFlush(Peer){
  const ws = peer2ws[Peer];
  if(!ws){
    console.log('websocket not found', Peer);
    return;
  }
  let packet;
  while((packet=(pendingWSpackets[Peer]||[]).shift())){
    try{
      console.log('<<----------ws---------------', Peer);
      if(ws.readyState === ws.OPEN) ws.send(packet);
      else console.log('WebSocket closed sending\n', packet, '\nto', Peer);
    }
    catch(e){
      console.error('error sending\n', packet, '\nto', Peer, '\n', e);
    }
  }
}

core.setNetwork({ doGet, doPost });

// --------------------------------

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

function dropAll(){
  return forestdb.collections()
            .then(colls=>Promise.all(colls.map(coll=>coll.stats()
              .then(s=>{
                  if(!/system.indexes/.test(s.ns)){
                    console.log('*************** dropping', s.ns, s.count);
                    return coll.drop();
                  }
              })
            )));
}

core.setPersistence({ persist, fetch, recache, query });

// --------------------------------

function init({httpHost, httpPort, wsPort, mongoHostPort}){
  serverHost=httpHost; serverPort=httpPort;
  return new Promise((resolve, reject) => {
    persistenceInit(mongoHostPort)
      .then(() => {
        app.listen(httpPort, ()=>{
          console.log(`Server started on port ${httpPort}`);
          wsInit({ port: wsPort });
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
  getObject:           core.getObject,
  spawnObject:         core.spawnObject,
  makeUID:             core.makeUID,
  setLogging:          core.setLogging,
  setPeerIdentityUser: auth.setPeerIdentityUser,
}


