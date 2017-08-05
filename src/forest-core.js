
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

function spawnObject(o){
  const UID = o.UID || makeUID();
  objects[UID] = Object.assign(o, { UID, Notify: [] });
  return UID;
}

function storeObjects(list){
  return list.map(state => spawnObject(state));
}

function ensureObjectState(UID, observer){
  const o = objects[UID];
  if(o){
    setNotify(o,observer);
    return;
  }
  objects[UID] = { UID, Notify: [ observer ] };
}

function setNotify(o,uid){
  if(o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
}

function setObjectState(uid, state){
  const newState = Object.assign({}, objects[uid], state);
  const changed = !_.isEqual(objects[uid], newState);
  if(!changed) return null;
  if(debug) console.log(uid, 'changed: ', difference(objects[uid], newState))
  objects[uid] = newState;
  objects[uid].Notify.map(u => setTimeout(doEvaluate.bind(null, u), 1));
  return newState;
}

var fetching = {};

function stateAccess(u,p,m) { const r = ((uid, path, match)=>{
  const state = objects[uid];
  if(path==='.') return state;
  const pathbits = path.split('.');
  if(pathbits.length==1){
    if(path === 'Timer') return state.Timer || 0;
    const val = state[path];
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
  const val = state[pathbits[0]];
  if(val == null) return null;
  if(val.constructor !== String) return null;
  const linkedObject = objects[val];
  if(!linkedObject){
    if(!fetching[val]){
      fetching[val]=true;
      ensureObjectState(val, uid);
      fetch(val)
      .then(res => { fetching[val]=false; return res.json()})
      .then(json => setObjectState(val, json.data));
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

function checkTimer(o,time){
  if(time && time > 0 && !o.timerId){
    o.timerId = setTimeout(() => {
      objects[o.UID].timerId = null;
      setObjectState(o.UID, { Timer: 0 });
      doEvaluate(o.UID);
    }, time);
  }
}

function doEvaluate(uid) {
  var o = objects[uid];
  const reactnotify = o.react.notify;
  if(!o.evaluate) return;
  for(var i=0; i<4; i++){
    if(debug) console.log(i, '>>>>>>>>>>>>> ', stateAccess(uid, '.'));
    if(debug) console.log(i, '>>>>>>>>>>>>> ', stateAccess(uid, 'userState.'));
    const newState = o.evaluate(stateAccess.bind(null, uid));
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
  stateAccess,
  doEvaluate,
  objects,
}

