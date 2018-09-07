
import _ from 'lodash';

const log = {
  update:   false,
  evaluate: false,
  changes:  false,
  notify:   false,
  object:   false,
  net:      false,
  persist:  false,
}

function listify(...items){
  return [].concat(...(items.filter(i=>(![undefined, null, ''].includes(i)))));
}

function setLogging(conf){
  Object.assign(log, conf);
}

const localProps =         ['Timer', 'TimerId', 'Notifying', 'Alerted', 'Evaluator', 'Cache', 'ReactNotify'];
const notNotifiableProps = ['Timer', 'TimerId'];
const noPersistProps =     [         'TimerId'];

function makeUID(peer){
  /*jshint bitwise:false */
  let i, random;
  let uuid = '';
  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
    uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return (!peer? 'uid-': 'peer-') + uuid;
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
  return objects[toUID(u)];
}

function getObject(u){
  if(!u) return Promise.resolve(null);
  const uid=toUID(u);
  const o = objects[uid];
  if(o || !(persistence && persistence.fetch)) return Promise.resolve(o);
  return persistence.fetch(uid).then(o=>{
    if(o) objects[uid]=o;
    return o;
  });
}

const toSave = {};

function cachePersistAndNotify(o){
  cacheAndPersist(o, true);
}

function cacheAndPersist(o, notify){
  const uid=toUID(o.UID);
  objects[uid]=o;
  if(persistence && persistence.persist && o.Cache !== 'no-persist') toSave[uid]=(toSave[uid] || notify || false);
  else if(notify) notifyObservers(o);
}

setInterval(()=>{ persistenceFlush().then((a)=> (a.length && log.persist && console.log(a)))}, 10);

function persistenceFlush(){
  return Promise.all(Object.keys(toSave).map(uid=>{
    return getObject(uid).then(o=>{
      if(!o){ console.warn('********* persistenceFlush: no object for', uid, toSave[uid], objects[uid]); delete toSave[uid]; return; }
      const notify = toSave[uid];
      delete toSave[uid];
      return persistence.persist(_.omit(o, noPersistProps)).then(r => { if(notify) notifyObservers(o); return r; });
    });
  }));
}

function reCacheObjects(){
  if(persistence && persistence.recache){
    return persistence.recache().then(actives=>actives.map(o=>{
      objects[o.UID]=o;
      runEvaluator(o.UID);
      return o;
    }));
  }
  return Promise.resolve([]);
}

function dumpCache(){
  console.log('---------cache-------');
  Object.keys(objects).map(k => console.log(objects[k]));
  console.log('---------------------');
}

function spawnObject(o){
  const UID = o.UID || makeUID();
  const Notify = o.Notify || [];
  cachePersistAndNotify(Object.assign({ UID, Notify, Version: 1 }, o));
  doEvaluate(UID);
  return UID;
}

function spawnTemporaryObject(o){
  const UID=makeUID();
  objects[UID]=Object.assign({ UID, Version: 1, Cache: 'no-persist' }, o);
  return UID;
}

function cacheObjects(list){
  return list.map(o => spawnObject(o));
}

let fetching = {};

function doGet(url){
  if(!fetching[url]){
    fetching[url]=true;
    network && network.doGet(url)
      .then(json => { fetching[url]=false; incomingObjectFromGET(url, json); })
      .catch(e => { fetching[url]=false; console.warn('doGet',e,url); });
  }
}

function ensureObjectState(u, setnotify, observer){
  const o = getCachedObject(u);
  if(o){
    if(setnotify) setNotifyAndObserve(o,observer);
    if(isURL(o.UID) && (o.Updated||0)+10000 < Date.now()){
      doGet(u);
    }
    return o;
  }
  getObject(u).then(o=>{
    if(o){
      if(setnotify) setNotifyAndObserve(o,observer);
      doEvaluate(observer.UID, { Alerted: o.UID });
      if(isURL(o.UID) && (o.Updated||0)+10000 < Date.now()){
        doGet(u);
      }
    }
    else if(isURL(u) && setnotify){ // FIXME: still set 'remote notify' even if not local (see stash)
      const o={ UID: u, Notify: [], Version: 0, Peer: toPeer(u), Updated: 0 };
      setNotifyAndObserve(o,observer);
      cacheAndPersist(o);
      doGet(u);
    }
  });
  return null;
}

function setNotify(o,uid,savelater){
  const prevNotify=listify(o.Notify);
  if(!prevNotify.find(n=>valMatch(n,uid))){
    o.Notify=prevNotify.concat(uid);
    if(!savelater) cacheAndPersist(o);
  }
}

function setNotifyAndObserve(o,observer){
  if(!o.Notify.find(n=>valMatch(n,observer.UID))){
    o.Notify.push(observer.UID);
  }
  observer.Observe && observer.Observe.push(o.UID);
}

function remNotify(o,uid){
  const prevNotify=listify(o.Notify);
  o.Notify=prevNotify.filter(n=>!valMatch(n,uid));
  cacheAndPersist(o);
}

function isRemote(uid){
  return getObject(uid).then(o=>o && o.Peer);
}

function isShell(o){
  return o.Peer && !o.Updated;
}

function notifyObservers(o){
  const allNotify = _.uniq(listify(o.Notifying, o.Notify));
  if(log.notify) console.log('===========================\no.UID/is/Peer:', `${o.UID} / ${o.is} / ${o.Peer||'--'}`);
  const peers = {};
  Promise.all(allNotify.map(u => getObject(u).then(n=>{
    if(log.notify) console.log('------------------------');
    if(log.notify) console.log('peers start', peers, o.UID, o.is);
    if(log.notify) console.log('n.UID/is/Peer:', (n && (`${n.UID} / ${n.is} / ${n.Peer||'--'}`))||'--', u, toPeer(u));
    if(!n){
      if(isURL(u) || isPeer(u)){
        if(log.notify) console.log(isURL(u) && 'isURL' || '', isPeer(u) && 'isPeer' || '');
        const Peer=toPeer(u);
        if(log.notify) console.log('Peer',Peer);
        if(o.Peer !== Peer){
          if(!peers[Peer]) peers[Peer]=[u];
          else             peers[Peer].push(u);
        }
      }
      else{
        console.log('***** REMOVE ', u, 'from Notify of\n', o);
      }
    }
    else {
      if(n.Peer){
        if(log.notify) console.log('n.Peer');
        if(o.Peer !== n.Peer){
          if(!peers[n.Peer]) peers[n.Peer]=[n.UID];
          else               peers[n.Peer].push(n.UID);
        }
      }
      else {
        if(log.notify) console.log('local eval');
        doEvaluate(n.UID, { Alerted: o.UID });
      }
    }
    if(log.notify) console.log('peers now', peers);
    if(log.notify) console.log('\n------------------------');
  })
  .catch(e => console.log(e))
  ))
  .then(()=>Object.keys(peers).map(u => outgoingObject(Object.assign({}, o, { Notify: peers[u] }), u)));
}

function outgoingObject(o,u){
  network && network.doPost(o,u).then((ok) => {
    if(log.net) console.log(ok? '<<-------------- outgoingObject': 'no outgoingObject for', u, '\n', JSON.stringify(o, null, 4));
  });
}

function incomingObjectFromGET(url, json){
  json = Object.assign({ Updated: Date.now() }, json);
  if(log.net) console.log('-------------->> incomingObjectFromGET\n', JSON.stringify(json, null, 4));
  updateObject(url, json);
}

function incomingObject(json, notify){
  if(!json.Notify) json.Notify=[];
  if(!json.Peer) json.Peer=toPeer(json.UID);
  json = Object.assign({ Updated: Date.now() }, json);
  if(notify) setNotify(json, notify, true);
  if(log.net) console.log('-------------->> incomingObject\n', JSON.stringify(json, null, 4), notify);
  getObject(json.UID).then(o=>{
    if(!o) storeObject(json);
    else updateObject(json.UID, json);
  });
}

function storeObject(o){
  if(!o.UID)     return;
  if(!o.Notify)  o.Notify = [];
  if(!o.Version) o.Version = 1;
  cachePersistAndNotify(o);
}

const deltas = {};

function updateObject(uid, update){
  if(!uid) return null;
  const o=getCachedObject(uid);
  if(!o) return null;
  if(log.changes) console.log(uid, 'before\n', JSON.stringify(o,null,4),'\nupdate:\n',JSON.stringify(update,null,4));
  if(o.Version && update.Version && o.Version >= update.Version){
    console.log('incoming version not newer:', o.Version, 'not less than', update.Version);
    return null;
  }
  const p=mergeUpdate(o, update);
  checkTimer(p);
  const changed = !_.isEqual(o,p);
  const delta = changed && difference(o,p);
  if (changed) {
    deltas[uid] = delta;
  }
  const notifiable = delta && Object.keys(delta).filter(e=>!notNotifiableProps.includes(e)).length || delta.Timer;
  if(log.changes) console.log('changed:', changed, 'delta:', delta, 'notifiable:', notifiable);
  if(changed){
    if(notifiable && !update.Version) p.Version = (p.Version||0)+1;
    if(log.changes) console.log('changed, result\n', JSON.stringify(p,null,4));
    if(notifiable) cachePersistAndNotify(p);
    else           cacheAndPersist(p);
  }
  return { updated: p, changed, notifiable };
}

function mergeUpdate(o,update){
  const updateNotify=listify(update.Notify); delete update.Notify;
  const p=Object.assign({}, o, update);
  updateNotify.forEach(un=>setNotify(p,un,true));
  return _.omitBy(p, v => v===null||v===undefined||v===''||v===[]);
}

function isLink(u){
  return isUID(u) || isURL(u) || isPeer(u);
}

function isUID(u){
  return u && u.constructor === String && /^uid-/.test(u);
}

function isURL(u){
  return u && u.constructor === String && /^https?:\/\//.test(u);
}

function isPeer(u){
  return u && u.constructor === String && /^peer-/.test(u);
}

function toUID(u){
  if(!isURL(u)) return u;
  const s=u.indexOf('uid-');
  if(s=== -1) return u;
  return u.substring(s);
}

function toPeer(u){
  if(!isURL(u)) return u;
  const s=u.indexOf('uid-');
  if(s=== -1) return u;
  return u.substring(0,s)+'notify';
}

const isQueryableCacheListLabels = ['queryable', 'cache', 'list'];

function cacheQuery(o, uid, query){
  setNotify(o,uid);
  if(!persistence) return Promise.resolve([]);
  const scope = o.list;
  if(scope.includes('local') || scope.includes('remote')){
    return persistence.query(o.is.filter(s => !isQueryableCacheListLabels.includes(s)), scope, query);
  }
  return Promise.resolve([]);
}

function checkDeltas(pathbits, observesubs, o){
  if(pathbits[0] == 'user-state' && pathbits.length == 2 && 'user-state' in o){
    const userStateUID = o['user-state'];
    ensureObjectState(userStateUID, observesubs, o);
    const p = pathbits[1].substring(0, pathbits[1].length - 1);
    const userStateDelta = deltas[userStateUID];
    if(userStateDelta){
      const delta = userStateDelta[p];
      return delta !== undefined ? delta : null;
    }
  }
  return null;
}

function object(u,p,q) { const r = ((uid, path, query)=>{
  if(!uid || !path) return null;
  const o=getCachedObject(uid);
  if(!o) return null;
  const hasMatch = query && query.constructor===Object && query.match;
  if(path==='.') return o;
  const pathbits = path.split('.');
  const observesubs = pathbits[0]!=='Alerted' && o.Cache !== 'no-persist';
  if (path.endsWith('?')) {
    return checkDeltas(pathbits, observesubs, o);
  }
  let c=o;
  for(let i=0; i<pathbits.length; i++){
    if(pathbits[i]==='') return c;
    if(pathbits[i]==='Timer') return c.Timer || 0;

    const isQueryableCacheList = c.is && c.is.constructor===Array && isQueryableCacheListLabels.every(s => c.is.includes(s));
    if(pathbits[i]==='list' && isQueryableCacheList && hasMatch) return cacheQuery(c, uid, query);

    let val = c[pathbits[i]];
    if(val == null) return null;
    if(i==pathbits.length-1){
      if(!hasMatch) return val;
      if(val.constructor === String) val=[val];
      if(val.constructor === Array){
        if(query.match.constructor===Array){
          return (query.match.length <= val.length && query.match.every(q => val.find(v=>valMatch(q,v))) && val) || null;
        }
        const r = val.filter(v => {
          if(valMatch(v, query.match)) return true;
          if(isLink(v) && query.match.constructor===Object){
            if(_.isEqual(Object.keys(query.match), [ 'UID' ])){
              return valMatch(v, query.match.UID);
            }
            else{
              const p=ensureObjectState(v, observesubs, o);
              if(!p) return false;
              return Object.keys(query.match).every(k => valMatch(p[k], query.match[k]));
            }
          }
          if(v.constructor===Object){
            return Object.keys(query.match).every(k => valMatch(v[k], query.match[k]));
          }
          return false;
        });
        return (r.length===1 && r[0]) || (r.length && r) || null;
      }
      return valMatch(val,query.match)? val: null;
    }
    if(val.constructor === Object){ c = val; continue; }
    if(val.constructor === String){
      c = ensureObjectState(val, observesubs, o);
      if(!c) return null;
    }
  }
  })(u,p,q);
  if(log.object) console.log('object', getCachedObject(u), '\npath:', p, q && 'query:' || '', q || '', '=>', r);
  return r;
}

function valMatch(a, b){
  return a == b || ((isURL(a) || isURL(b)) && toUID(a) === toUID(b));
}

function checkTimer(o){
  const time=o.Timer;
  if(time && time > 0 && !o.TimerId){
    o.TimerId = setTimeout(() => {
      getCachedObject(o.UID).TimerId = null;
      updateObject(o.UID, { Timer: 0 });
      doEvaluate(o.UID);
    }, time);
  }
}

function setPromiseState(uid, p){
  p.then(update => {
    if(log.evaluate || log.update) console.log('<<<<<<<<<<<<< promised update:\n', update);
    updateObject(uid, update);
  });
  return {};
}

function doEvaluate(uid, params) {
  let o = getCachedObject(uid);
  if(!o) return null;
  const evaluator = o.Evaluator && (typeof o.Evaluator === 'function'? o.Evaluator: evaluators[o.Evaluator]);
  if(!evaluator) return o;
  const Alerted  = params && params.Alerted;
  if(Alerted) params=undefined;
  const reactnotify = o.ReactNotify;
  let observes=[];
  for(let i=0; i<4; i++){
    if(log.update) console.log('>>>>>>>>>>>>>', uid, ['is:'].concat(object(uid, 'is')).join(' '));
    if(log.evaluate) console.log(`iteration ${i}`);
    if(log.evaluate) console.log('>>>>>>>>>>>>>\n', object(uid, '.'));
    o.Observe=[];
    if(Alerted) o.Alerted=Alerted;
    const evalout = evaluator(object.bind(null, uid), i===0 && params) || {};
    delete o.Alerted;
    observes=_.uniq(observes.concat(o.Observe));
    delete o.Observe;
    let update;
    if(evalout.constructor === Array){
      update = Object.assign({}, ...(evalout.map(x => (x && x.constructor === Promise)? setPromiseState(uid,x): (x || {}))));
    }
    else update = evalout;
    const { updated, changed, notifiable } = updateObject(uid, update);
    if(log.evaluate || log.update) if(changed) console.log('<<<<<<<<<<<<< update:\n', update);
    o = updated;
    delete deltas[Alerted];
    if(!changed) break;
  }
  if(Alerted && !observes.includes(Alerted)){
    if(log.evaluate || log.update) console.log('--------- Alerted not observed back by', uid, 'dropping Notify entry in Alerted:\n', getCachedObject(Alerted));
    remNotify(getCachedObject(Alerted), uid);
  }
  if(reactnotify) reactnotify();
  return o;
}

function runEvaluator(uid, params){
  return getObject(uid).then(()=>doEvaluate(uid, params));
}

const evaluators = {}

function setEvaluator(name, evaluator){
  evaluators[name]=evaluator;
}

export default {
  listify,
  makeUID,
  toUID,
  spawnObject,
  spawnTemporaryObject,
  storeObject,
  cacheObjects,
  reCacheObjects,
  setNotify,
  updateObject,
  incomingObject,
  object,
  runEvaluator,
  setEvaluator,
  getObject,
  setPersistence,
  setNetwork,
  localProps,
  isURL,
  isPeer,
  setLogging,
}

