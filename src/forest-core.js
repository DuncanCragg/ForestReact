
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

const debug = false;

function setObjectState(uid, state){
  const newState = Object.assign({}, objects[uid], state);
  const changed = !_.isEqual(objects[uid], newState);
  if(changed){
    if(debug) console.log(uid, 'changed: ', difference(objects[uid], newState))
    objects[uid] = newState;
    objects[uid].Notify.map(o => setTimeout(objects[o].doEvaluate, 1));
  }
  return changed;
}

function stateAccess(uid,p,m) { const r = ((uid, path, match)=>{
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
  })(uid,p,m);
  // if(this.debug) console.log('UID',uid,'path',p,'match',m,'=>',r);
  return r;
}

var fetching = {};

export default {
  spawnObject,
  storeObjects,
  ensureObjectState,
  setNotify,
  setObjectState,
  stateAccess,
  fetching,
  objects,
}

