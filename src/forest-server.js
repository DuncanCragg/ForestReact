
import _ from 'lodash';
import express from 'express';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import mongodb from 'mongodb';
import core from './forest-core';


// --------------------------------

const log = (req, res, next) => {
  console.log(req.method, req.originalUrl, '\n', req.body);
  next();
};

const CORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Notify');
  next();
};


const app = express();

app.use(bodyParser.json());

app.options("/*",
  log,
  CORS,
  (req, res, next) => {
    res.sendStatus(200);
  }
);

app.get('/',
  log,
  CORS,
  (req, res, next) => {
    res.json({ mango: 'http://localhost:8180/banana/' });
    next();
  },
);

const uid2notify = {};
const notify2ws = {};

app.post('/*',
  log,
  CORS,
  (req, res, next) => {
    const o=req.body;
    if(!o || !o.UID) next();
    uid2notify[o.UID] = req.headers.notify;
    const path = req.originalUrl.substring(1);
    const Notify = (path==='notify')? null: [path];
    const addNotify = !(o.Notify && o.Notify.length) && Notify;
    core.storeObject(!addNotify? o: Object.assign(o, { Notify }));
    res.json({ });
    next();
  }
);

function doGet(url){
  return fetch(url).then(res => res.json());
}

const pendingWSpackets = {};

function doPost(o){
  const uid = o.Notifying;
  if(core.isURL(uid)){
    console.log('not posting to peer yet');
  }
  else{
    o.Notify.unshift(uid);
    const packet = JSON.stringify(_.omit(o, core.localProps));
    const notifyUID = uid2notify[uid];
    if(!pendingWSpackets[notifyUID]) pendingWSpackets[notifyUID] = [];
    pendingWSpackets[notifyUID].push(packet);
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
    ws.send(packet);
  }
}

core.setNetwork({ doGet, doPost });

// --------------------------------

let forestdb;

function updateObject(o){
  if(!o.is) return;
  const collectionName = (o.is.constructor===String)? o.is:
                        ((o.is.constructor===Array)? o.is.join('-'): null);
  if(!collectionName) return;
  return forestdb.collection(collectionName)
    .update({ UID: o.UID }, o, { upsert: true })
    .then((result) => { console.log(`updated ${o.UID} in ${collectionName}`); })
    .catch((err) => { console.log(err, `Failed to insert ${o.UID} in ${collectionName}`); });
}

function persist(o){
  return updateObject(o);
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

core.setPersistence({ persist, query });

// --------------------------------

function init(port, wsPort){
  return new Promise((resolve, reject) => {
    mongodb.MongoClient.connect('mongodb://localhost:27017/')
    .then((client) => {
      forestdb = client.db('forest');
      app.listen(port, ()=>{
        console.log(`Server started on port ${port}`);
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


