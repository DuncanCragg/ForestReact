
import _ from 'lodash';

const debug = false;

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

let persist = null;
let network = null;

function setPersistence(f){ persist = f; }

function setNetwork(n){ network = n; }

function cacheAndStoreObject(o){
  objects[o.UID] = o;
  if(persist) persist(o); // async persistence at the moment
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

function ensureObjectState(uid, observer){
  const o = objects[uid];
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

function object(u,p,m) { const r = ((uid, path, match)=>{
  const o = objects[uid];
  if(path==='.') return o;
  const pathbits = path.split('.');
  if(pathbits.length==1){
    if(path === 'Timer') return o.Timer || 0;
    const val = o[path];
    if(val == null) return null;
    if(val.constructor === Array){
      if(match == null || match.constructor !== Object) return val;
      return val.filter(v => {
        if(v.constructor !== String) return false;
        const o = objects[v];
        if(!o) return false;
        setNotify(o,uid);
        return Object.keys(match).every(k => o[k] === match[k]);
      });
    }
    return (match == null || val == match)? val: null;
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
  })(u,p,m);
  // if(debug) console.log('object',objects[u],'path',p,'match',m,'=>',r);
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

function doEvaluate(uid) {
  var o = objects[uid];
  if(!o || !o.Evaluator || typeof o.Evaluator !== 'function') return;
  const reactnotify = o.ReactNotify;
  for(var i=0; i<4; i++){
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
    const newState = o.Evaluator(object.bind(null, uid));
    if(debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
    checkTimer(o,newState.Timer);
    o = setObjectState(uid, newState);
    if(!o) break;
  }
  if(reactnotify) reactnotify();
}

export default {
  makeUID,
  spawnObject,
  storeObject,
  cacheObjects,
  setObjectState,
  object,
  doEvaluate,
  objects,
  setPersistence,
  setNetwork,
  localProps,
  isURL,
}

