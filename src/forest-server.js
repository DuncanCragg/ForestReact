
import _ from 'lodash';
import express from 'express';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import superagent from 'superagent';
import mongodb from 'mongodb';
import core from './forest-core';

let serverHost=null;
let serverPort=0;

// --------------------------------

const logRequest = (req, res, next) => {
  console.log('---------------------------->');
  if(req.method==='POST') console.log(req.method, req.originalUrl, req.headers.remote||'', '\n', req.body);
  else                    console.log(req.method, req.originalUrl, req.headers.remote||'');
  next();
};

const logResponse = (req, res, next) => {
  console.log(res.statusCode)
  console.log('<----------------------------');
  next();
};

const CORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Remote'); // Accept, X-Requested-By, Origin, Cache-Control
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
  return s.replace(/"(uid-[^"]*"[^:])/g, `"http://${serverHost}:${serverPort}/$1`)
}

app.get('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const Remote = req.headers.remote;
    const uid = req.originalUrl.substring(1);
    core.getObject(uid)
      .then(o => { if(o){ res.json(JSON.parse(prefixUIDs(o))); if(Remote) core.setNotify(o,Remote)} else res.status(404).send('Not found')})
      .then(()=>next())
      .catch(e => console.error(e));
  },
  logResponse,
);

const remote2ws = {};

app.post('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const json=req.body;
    if(!json || !json.UID) next();
    const Remote = req.headers.remote;
    const path = req.originalUrl.substring(1);
    core.incomingObject(Object.assign(json, Remote && { Remote }), path!=='notify' && path)
    res.json({ });
    next();
  },
  logResponse,
);

let serverRemote = null;

function doGet(url){
  return superagent.get(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(serverRemote? { Remote: serverRemote}: {})
    .then(x => x.body);
}

const pendingWSpackets = {};

function doPost(o, u){
  if(core.isURL(u)){
    console.log('not posting to peer yet:', u);
  }
  else{
    const Remote = core.isNotify(u)? u: o.Remote;
    if(!pendingWSpackets[Remote]) pendingWSpackets[Remote] = [];
    pendingWSpackets[Remote].push(prefixUIDs(o));
    wsFlush(Remote);
  }
}

function wsInit(config){
  const wss = new WebSocket.Server(config);
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const json = JSON.parse(data);
      if(json.Remote){
        console.log('ws init:', json);
        remote2ws[json.Remote]=ws;
        if(serverRemote) ws.send(JSON.stringify({ Remote: serverRemote }));
        wsFlush(json.Remote);
      }
      else{
        console.log('ws incoming json:', json);
      }
    });
  });
}

function wsFlush(Remote){
  const ws = remote2ws[Remote];
  if(!ws){
    console.log('websocket not found', Remote);
    return;
  }
  let packet;
  while((packet=(pendingWSpackets[Remote]||[]).shift())){
    try{
      console.log('<<----------ws---------------\n', Remote, '\n', packet, '\n<<---------------------------');
      if(ws.readyState === ws.OPEN) ws.send(packet);
      else console.log('WebSocket closed sending\n', packet, '\nto', Remote)
    }
    catch(e){
      console.error('error sending\n', packet, '\nto', Remote, '\n', e)
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
    .then((result) => { console.log(`updated ${o.UID} in ${collectionName}`); return result.result })
    .catch((err) => { console.log(err, `Failed to insert ${o.UID} in ${collectionName}`); return err });
}

function fetch(uid){
  return forestdb.collections().then(colls=>findOneFirst(colls, uid))
}

function findOneFirst(colls, uid){
  if(!(colls && colls.length)) return Promise.resolve(null);
  return colls[0].findOne({ UID: uid }, { projection: { _id: 0 }}).then(o => o || findOneFirst(colls.slice(1), uid));
}

function recache(){
  return forestdb.collections()
    .then(colls=>Promise.all(colls.map(coll=>coll.find({ Cache: 'keep-active' }, { projection: { _id: 0 }}).toArray()))
                  .then(actives => [].concat(...actives)))
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
  return Object.assign({}, ...inline.map(k => o[k] && { [k]: o[k] }), { More: o.UID })
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

function setRemote(Remote){ serverRemote = Remote; }

export default {
  init,
  setRemote,
  cacheObjects:   core.cacheObjects,
  reCacheObjects: core.reCacheObjects,
  setEvaluator:   core.setEvaluator,
  getObject:      core.getObject,
  spawnObject:    core.spawnObject,
  makeUID:        core.makeUID,
}


