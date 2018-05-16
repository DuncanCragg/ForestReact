
import _ from 'lodash';
import sa from 'superagent';

const debug = false;

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

function cacheAndStoreObject(o){
  objects[o.UID] = o;
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
  return UID;
}

function storeObjects(list){
  return list.map(o => spawnObject(o));
}

function ensureObjectState(UID, observer){
  const o = objects[UID];
  if(o){
    setNotify(o,observer);
    return;
  }
  cacheAndStoreObject({ UID, Notify: [ observer ] });
}

function setNotify(o,uid){
  if(o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
}

function setObjectState(uid, update){
  const newState = Object.assign({}, objects[uid], update);
  const changed = !_.isEqual(objects[uid], newState);
  if(!changed) return null;
  if(debug) console.log(uid, 'changed: ', difference(objects[uid], newState))
  cacheAndStoreObject(newState);
  objects[uid].Notify.map(u => setTimeout(doEvaluate.bind(null, u), 1));
  if(objects[uid].Notifying) doPost(objects[uid]);
  return newState;
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
  const val = o[pathbits[0]];
  if(val == null) return null;
  if(val.constructor !== String){
    if(val.constructor === Object){
      if(pathbits[1]) return val[pathbits[1]];
      else return null;
    }
    else return null;
  }
  const linkedObject = objects[val];
  if(!linkedObject){
    const url=val;
    if(!fetching[url]){
      fetching[url]=true;
      ensureObjectState(url, uid);
      doGet(url);
    }
    return null;
  }
  setNotify(linkedObject,uid);
  if(pathbits[1]==='') return linkedObject;
  return linkedObject[pathbits[1]];
  })(u,p,m);
  // if(debug) console.log('UID',u,'path',p,'match',m,'=>',r);
  return r;
}

function doGet(url){
  fetch(url)
    .then(res => { fetching[url]=false; return res.json()})
    .then(json => setObjectState(url, json));
}

const localProps = ['Notifying', 'Timer', 'TimerId', 'Evaluator', 'ReactNotify', 'userState'];

function doPost(o){
  const data = _.omit(o, localProps);
  return sa.post(o.Notifying)
    .timeout({ response: 9000, deadline: 10000 })
    .send(data)
    .then(x => x);
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
  const reactnotify = o.ReactNotify;
  if(!o.Evaluator || typeof o.Evaluator !== 'function') { console.error('no Evaluator function!', o); return; }
  for(var i=0; i<4; i++){
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
    if(debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
    const newState = o.Evaluator(object.bind(null, uid));
    if(debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
    checkTimer(o,newState.Timer);
    o = setObjectState(uid, newState);
    if(!o) break;
  }
  reactnotify();
}

export default {
  spawnObject,
  storeObjects,
  setObjectState,
  object,
  doEvaluate,
  objects,
}

