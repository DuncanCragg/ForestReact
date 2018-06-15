
import _ from 'lodash';
import express from 'express';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import mongodb from 'mongodb';
import core from './forest-core';

let serverHost=null;
let serverPort=0;

// --------------------------------

const logRequest = (req, res, next) => {
  console.log('---------------------------->');
  if(req.method==='POST') console.log(req.method, req.originalUrl, '\n', req.body);
  else                    console.log(req.method, req.originalUrl);
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
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Notify'); // Accept, X-Requested-By, Origin, Cache-Control
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
  const s = JSON.stringify(_.omit(o, core.localProps));
  return s.replace(/"uid-/g, `"http://${serverHost}:${serverPort}/uid-`)
}

app.get('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const notify = req.headers.notify;
    const uid = req.originalUrl.substring(1);
    core.getObject(uid)
      .then(o => { if(o){ res.json(JSON.parse(prefixUIDs(o))); if(notify) core.setNotify(o,notify)} else res.status(404).send('Not found')})
      .then(()=>next())
      .catch(e => console.error(e));
  },
  logResponse,
);

const notify2ws = {};

app.post('/*',
  logRequest,
  CORS,
  (req, res, next) => {
    const o=req.body;
    if(!o || !o.UID) next();
    const notify = req.headers.notify;
    const path = req.originalUrl.substring(1);
    const Notify = ((path==='notify')? []: [path]).concat(o.Notify || []);
    core.storeObject(Object.assign(o, { Notify, Remote: notify }));
    res.json({ });
    next();
  },
  logResponse,
);

function doGet(url){
  return fetch(url)
    .then(res => res.json())
    .catch(e => console.error('doGet', e));
}

const pendingWSpackets = {};

function doPost(o, u){
  if(core.isURL(u)){
    console.log('not posting to peer yet:', u);
  }
  else{
    const notifyUID = core.isNotify(u)? u: o.Remote;
    if(!pendingWSpackets[notifyUID]) pendingWSpackets[notifyUID] = [];
    pendingWSpackets[notifyUID].push(prefixUIDs(o));
    wsFlush(notifyUID);
  }
}

function wsInit(config){
  const wss = new WebSocket.Server(config);
  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const json = JSON.parse(data);
      if(json.notifyUID){
        console.log('ws init:', json);
        notify2ws[json.notifyUID]=ws;
        ws.send(JSON.stringify({ notifyUID: core.notifyUID }));
        wsFlush(json.notifyUID);
      }
      else{
        console.log('ws incoming json:', json);
      }
    });
  });
}

function wsFlush(notifyUID){
  const ws = notify2ws[notifyUID];
  if(!ws){
    console.log('websocket not found', notifyUID);
    return;
  }
  let packet;
  while((packet=(pendingWSpackets[notifyUID]||[]).shift())){
    try{
      if(ws.readyState === ws.OPEN) ws.send(packet);
      else console.log('WebSocket closed sending\n', packet, '\nto', notifyUID)
    }
    catch(e){
      console.error('error sending\n', packet, '\nto', notifyUID, '\n', e)
    }
  }
}

core.setNetwork({ doGet, doPost });

// --------------------------------

let forestdb;

function saveObject(o){
  if(!o.is) return Promise.resolve();
  const collectionName = (o.is.constructor===String)? o.is:
                        ((o.is.constructor===Array)? o.is.join('-'): null);
  if(!collectionName) return Promise.resolve();
  return forestdb.collection(collectionName)
    .update({ UID: o.UID }, o, { upsert: true })
    .then((result) => { console.log(`updated ${o.UID} in ${collectionName}`); return result.result })
    .catch((err) => { console.log(err, `Failed to insert ${o.UID} in ${collectionName}`); return err });
}

const toSave = {};

function persist(o){
  toSave[core.toUID(o.UID)]=true;
}

function fetch(uid){
  return Promise.resolve(null /*{ fix: 'me' }*/)
}

function toMongoProp(key, val){
  if(val.length===3 && val[1]==='..'){
    return { $gt: val[0], $lt: val[2] };
  }
  return val;
}

function toMongo(scope, match){
  return Object.assign({}, ...Object.keys(match).map(k => ({[k]: toMongoProp(k,match[k])})));
}

function getInlineVals(o, inline){
  return Object.assign({}, ...inline.map(k => o[k] && { [k]: o[k] }), { More: o.UID })
}

function query(is, scope, query){
  return forestdb.collection(is.join('-'))
    .find(toMongo(scope, query.match))
    .toArray()
    .then(r => r.map(o => query.inline? getInlineVals(o, query.inline): o.UID))
    .catch(e => console.error(e));
}

function persistenceFlush(){
  return Promise.all(Object.keys(toSave).map(uid=>{
    return core.getObject(uid).then(o=>{
      delete toSave[uid];
      return saveObject(o);
    })
  }))
}

function persistenceInit(mongoHostPort, saveInterval){
  return mongodb.MongoClient.connect(mongoHostPort)
    .then((client) => {
      forestdb = client.db('forest');
      setInterval(()=>{ persistenceFlush().then((a)=> (a.length && console.log(a)))}, saveInterval)
    });
}

core.setPersistence({ persist, fetch, query });

// --------------------------------

function init({httpHost, httpPort, wsPort, mongoHostPort, saveInterval}){
  serverHost=httpHost; serverPort=httpPort;
  return new Promise((resolve, reject) => {
    persistenceInit(mongoHostPort, saveInterval)
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
  cacheObjects: core.cacheObjects,
  spawnObject:  core.spawnObject,
}


