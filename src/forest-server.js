
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
    res.json({ mango: 'http://localhost:8080/banana/' });
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

function doPost(o){
  const data = _.omit(o, core.localProps);
  const uid = o.Notifying;
  if(core.isURL(uid)){
    console.log('not posting to peer yet');
  }
  else{
    const notifyUID = uid2notify[uid];
    const ws = notify2ws[notifyUID];
    if(!ws) return;
    ws.send(JSON.stringify(data));
  }
}

const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const o = JSON.parse(data);
    if(o.notifyUID){
      notify2ws[o.notifyUID]=ws;
      console.log('initialised:', o);
    }
    else{
      console.log('ws incoming json', o);
    }
  });
});

core.setNetwork({ doGet, doPost });

// --------------------------------

let forestdb;

function updateObject(o){
  const collectionName = o.is;
  return forestdb.collection(collectionName)
    .update({ UID: o.UID }, o, { upsert: true })
    .then((result) => { console.log(`updated ${o.UID} in ${collectionName}`); })
    .catch((err) => { console.log(err, `Failed to insert ${o.UID} in ${collectionName}`); });
}

function persist(o){
  return updateObject(o);
}

core.setPersistence(persist);

// --------------------------------

function init(port){
  return new Promise((resolve, reject) => {
    mongodb.MongoClient.connect('mongodb://localhost:27017/')
    .then((client) => {
      forestdb = client.db('forest');
      app.listen(port, ()=>{
        console.log(`Server started on port ${port}`);
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


