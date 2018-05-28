
import _ from 'lodash';

const debug = false;

const notifyUID = makeUID();

const localProps = ['Notifying', 'Alerted', 'Timer', 'TimerId', 'Evaluator', 'ReactNotify', 'userState'];

function makeUID(){
  /*jshint bitwise:false */
  var i, random;
  var uuid = '';
  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
    uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return uuid;
}

function difference(a, b) {
  function changes(a, b) {
    return _.transform(b, function(result, value, key) {
      if (!_.isEqual(value, a[key])) {
        result[key] = (_.isObject(value) && _.isObject(a[key])) ? changes(value, a[key]) : value;
      }
    });
  }
  return changes(a, b);
}

const objects = {};

let persistence = null;
let network = null;

function setPersistence(p){ persistence = p; }

function setNetwork(n){ network = n; }

function cacheAndStoreObject(o){
  objects[o.UID] = o;
  if(persistence) persistence.persist(o); // async persistence at the moment
}

function dumpCache(){
  console.log("---------cache-------");
  Object.keys(objects).map(k => console.log(objects[k]));
  console.log("---------------------");
}

function spawnObject(o){
  const UID = o.UID || makeUID();
  const Notify = o.Notify || [];
  cacheAndStoreObject(Object.assign({ UID, Notify }, o));
  doEvaluate(UID);
  return UID;
}

function storeObject(o){
  if(!o.UID)    return;
  if(!o.Notify) o.Notify = [];
  cacheAndStoreObject(o);
  notifyObservers(o);
}

function cacheObjects(list){
  return list.map(o => spawnObject(o));
}

function ensureObjectState(UID, observer){
  const o = objects[UID];
  if(o){
    setNotify(o,observer);
    return o;
  }
  cacheAndStoreObject({ UID, Notify: [ observer ] });
  return null;
}

function setNotify(o,uid){
  if(o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
}

function notifyObservers(o){
  o.Notify.map(uid => setTimeout(
    ()=>{
      const n = objects[uid];
      if(!n) return;
      n.Alerted=o.UID;
      doEvaluate(uid);
      delete n.Alerted;
    }, 1));
}

function setObjectState(uid, update){
  const newState = Object.assign({}, objects[uid], update);
  const changed = !_.isEqual(objects[uid], newState);
  if(!changed) return null;
  if(debug) console.log(uid, 'changed: ', difference(objects[uid], newState))
  cacheAndStoreObject(newState);
  notifyObservers(objects[uid]);
  if(objects[uid].Notifying) network && network.doPost(objects[uid]);
  return newState;
}

function isURL(uid){
  return /^https?:\/\//.test(uid);
}

var fetching = {};

function cacheQuery(o, path, query){
  if(!persistence) return new Promise();
  const scope = o.list;
  if(scope.includes('local') || scope.includes('remote')){
    const is = o.is.split(' ')[0];
    return persistence.query(is, scope, query);
  }
  return new Promise();
}

function object(u,p,q) { const r = ((uid, path, query)=>{
  const o = objects[uid];
  const hasMatch = (query && query.constructor === Object && query.match)
  if(o.is.indexOf('cache list') !== -1 && path === 'list' && hasMatch) return cacheQuery(o, path, query);
  if(path==='.') return o;
  const pathbits = path.split('.');
  if(pathbits.length==1){
    if(path === 'Timer') return o.Timer || 0;
    const val = o[path];
    if(val == null) return null;
    if(val.constructor === Array){
      return !hasMatch? val: val.filter(v => {
        if(v.constructor !== String) return false;
        const o = objects[v];
        if(!o) return false;
        setNotify(o,uid);
        return Object.keys(query.match).every(k => o[k] === query.match[k]);
      });
    }
    return (!hasMatch || val == query.match)? val: null;
  }
  let c=o;
  for(var i=0; i<pathbits.length; i++){
    if(pathbits[i]==='') return c;
    const val = c[pathbits[i]];
    if(val == null) return null;
    if(i==pathbits.length-1) return val;
    if(val.constructor === Object){ c = val; continue; }
    if(val.constructor === String){
      c = ensureObjectState(val, uid);
      if(!c){
        if(isURL(val)){
          const url=val;
          if(!fetching[url]){
            fetching[url]=true;
            network && network.doGet(url)
             .then(json => { fetching[url]=false; setObjectState(url, json) });
          }
        }
        return null;
      }
    }
  }
  })(u,p,q);
  // if(debug) console.log('object',objects[u],'path',p,'query',q,'=>',r);
  return r;
}

function checkTimer(o,time){
  if(time && time > 0 && !o.TimerId){
    o.TimerId = setTimeout(() => {
      objects[o.UID].TimerId = null;
      setObjectState(o.UID, { Timer: 0 });
      doEvaluate(o.UID);
    }, time);
  }
}

function setPromiseState(uid, o, p){
  p.then(newState => {
    if(debug) console.log('<<<<<<<<<<<<< new state bits: ', newState);
    checkTimer(o,newState.Timer);
    setObjectState(uid, newState);
  });
  return {};
}

function doEvaluate(uid, params) {
  var o = objects[uid];
  if(!o || !o.Evaluator || typeof o.Evaluator !== 'function') return;
  const reactnotify = o.ReactNotify;
  for(var i=0; i<4; i++){
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
    const evalout = o.Evaluator(object.bind(null, uid), params);
    if(!evalout){ console.error('no eval output for', uid, o); return; }
    let newState;
    if(evalout.constructor === Array){
      newState = Object.assign({}, ...(evalout.map(x => (x && x.constructor === Promise)? setPromiseState(uid,o,x): (x || {}))))
    }
    else newState = evalout;
    if(debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
    checkTimer(o,newState.Timer);
    o = setObjectState(uid, newState);
    if(!o) break;
  }
  if(reactnotify) reactnotify();
}

function runEvaluator(uid, params){
  doEvaluate(uid, params);
}

export default {
  notifyUID,
  makeUID,
  spawnObject,
  storeObject,
  cacheObjects,
  setObjectState,
  object,
  doEvaluate,
  runEvaluator,
  objects,
  setPersistence,
  setNetwork,
  localProps,
  isURL,
}

