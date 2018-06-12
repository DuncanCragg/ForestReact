
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
  return 'uid-' + uuid;
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

let persistence = null;
let network = null;

function setPersistence(p){ persistence = p; }

function setNetwork(n){ network = n; }

const objects = {};

function getCachedObject(u){
  return objects[toUID(u)]
}

function getObject(u){
  const uid=toUID(u);
  const o = objects[uid]
  if(o || !(persistence && persistence.fetch)) return Promise.resolve(o)
  return persistence.fetch(uid).then(o=>{
    objects[uid] = o;
    return o
  })
}

function cacheAndPersist(o){
  objects[toUID(o.UID)]=o;
  if(persistence && persistence.persist) persistence.persist(o);
}

function dumpCache(){
  console.log("---------cache-------");
  Object.keys(objects).map(k => console.log(objects[k]));
  console.log("---------------------");
}

function spawnObject(o){
  const UID = o.UID || makeUID();
  const Notify = o.Notify || [];
  cacheAndPersist(Object.assign({ UID, Notify }, o));
  doEvaluate(UID);
  return UID;
}

function storeObject(o){
  if(!o.UID)    return;
  if(!o.Notify) o.Notify = [];
  cacheAndPersist(o);
  notifyObservers(o);
}

function cacheObjects(list){
  return list.map(o => spawnObject(o));
}

var fetching = {};

function ensureObjectState(u, obsuid){
  const o = getCachedObject(u);
  if(o){
    // if(isURL(u) && o.timeSinceFetched < ..){ // and below after getObject
    setNotify(o,obsuid);
    return o;
  }
  getObject(u).then(o=>{
    if(o){
      setNotify(o,obsuid);
      //notifyObservers(o);
    }
    else if(isURL(u)){
      const url=u;
      cacheAndPersist({ UID: url, Notify: [ obsuid ] });
      if(!fetching[url]){
        fetching[url]=true;
        network && network.doGet(url)
         .then(json => { fetching[url]=false; setObjectState(url, json) });
      }
    }
  })
  return null;
}

function setNotify(o,uid){
  if(o.Notify.indexOf(uid) === -1){
    o.Notify.push(uid);
    cacheAndPersist(o)
  }
}

function notifyObservers(o){
  o.Notify.map(u => getObject(u).then(n=>{
    if(!n) return;
    n.Alerted=o.UID;
    doEvaluate(toUID(u));
    delete n.Alerted;
  }));
}

function setObjectState(uid, update){
  if(!uid) return null
  const o=getCachedObject(uid)
  if(!o) return null;
  const p = Object.assign({}, o, update);
  const changed = !_.isEqual(o, p);
  if(!changed) return null;
  if(debug) console.log(uid, 'changed: ', difference(o, p))
  cacheAndPersist(p);
  notifyObservers(p);
  if(p.Notifying) network && network.doPost(p);
  return p;
}

function isURL(uid){
  return /^https?:\/\//.test(uid);
}

function toUID(u){
  if(!isURL(u)) return u;
  const s=u.indexOf('uid-');
  if(s=== -1) return u;
  return u.substring(s);
}

const isQueryableCacheListLabels = ['queryable', 'cache', 'list'];

function cacheQuery(o, path, query){
  if(!persistence) return new Promise();
  const scope = o.list;
  if(scope.includes('local') || scope.includes('remote')){
    return persistence.query(o.is.filter(s => !isQueryableCacheListLabels.includes(s)), scope, query);
  }
  return new Promise();
}

function object(u,p,q) { const r = ((uid, path, query)=>{
  if(!uid || !path) return null;
  const o=getCachedObject(uid)
  if(!o) return null;
  const isQueryableCacheList = o.is && o.is.constructor===Array && isQueryableCacheListLabels.every(s => o.is.includes(s));
  const hasMatch = query && query.constructor===Object && query.match
  if(path==='list' && isQueryableCacheList && hasMatch) return cacheQuery(o, path, query);
  if(path==='.') return o;
  const pathbits = path.split('.');
  let c=o;
  for(var i=0; i<pathbits.length; i++){
    if(pathbits[i]==='') return c;
    if(pathbits[i]==='Timer') return c.Timer || 0;
    const val = c[pathbits[i]];
    if(val == null) return null;
    if(i==pathbits.length-1){
      if(!hasMatch) return val;
      if(val.constructor === Array){
        if(query.match.constructor===Array){
          return (query.match.length===val.length && query.match.every((q,j) => q==val[j]) && val) || null;
        }
        return val.filter(v => {
          if(v===query.match) return true;
          if(v.constructor === String){
            // TODO: ensureObjectState?
            const o=getCachedObject(v)
            if(!o) return false;
            setNotify(o,uid);
            return Object.keys(query.match).every(k => o[k] === query.match[k]);
          }
          if(v.constructor===Object){
            return Object.keys(query.match).every(k => v[k] === query.match[k]);
          }
          return false;
        });
      }
      return val==query.match? val: null;
    }
    if(val.constructor === Object){ c = val; continue; }
    if(val.constructor === String){
      c = ensureObjectState(val, uid);
      if(!c) return null;
    }
  }
  })(u,p,q);
  // if(debug) console.log('object',getCachedObject(u),'path',p,'query',q,'=>',r);
  return r;
}

function checkTimer(o,time){
  if(time && time > 0 && !o.TimerId){
    o.TimerId = setTimeout(() => {
      getCachedObject(o.UID).TimerId = null;
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
  var o = getCachedObject(uid);
  if(!o || !o.Evaluator || typeof o.Evaluator !== 'function') return o;
  const reactnotify = o.ReactNotify;
  for(var i=0; i<4; i++){
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
    const evalout = o.Evaluator(object.bind(null, uid), params);
    if(!evalout){ console.error('no eval output for', uid, o); return o; }
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
  return o;
}

function runEvaluator(uid, params){
  return getObject(uid).then(()=>doEvaluate(uid, params));
}

export default {
  notifyUID,
  makeUID,
  toUID,
  spawnObject,
  storeObject,
  cacheObjects,
  setObjectState,
  object,
  runEvaluator,
  getObject,
  setPersistence,
  setNetwork,
  localProps,
  isURL,
}

