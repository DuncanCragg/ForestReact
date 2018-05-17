
import express from 'express';
import bodyParser from 'body-parser';
import mongodb from 'mongodb';
import core from './forest-core';


const log = (req, res, next) => {
  console.log(req.method, req.originalUrl, '\n', req.body);
  next();
};

const CORS = (req, res, next) => {
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
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

app.post('/cache-notify',
  log,
  CORS,
  (req, res, next) => {
    core.storeObject(req.body);
    next();
  }
);

const PORT = 8080;

let forestdb;

mongodb.MongoClient.connect('mongodb://localhost:27017/').then((client) => {
  forestdb = client.db('forest');
  app.listen(PORT, ()=>{ console.log(`Server started on port ${PORT}`); });
})

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

export default {
}


