(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'lodash'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('lodash'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.lodash);
    global.forestCore = mod.exports;
  }
})(this, function (module, exports, _lodash) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _lodash2 = _interopRequireDefault(_lodash);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var log = {
    update: false,
    evaluate: false,
    changes: false,
    notify: false,
    object: false,
    net: false,
    persist: false
  };

  function setLogging(conf) {
    Object.assign(log, conf);
  }

  var localProps = ['Timer', 'TimerId', 'Notifying', 'Alerted', 'Evaluator', 'Cache', 'ReactNotify', 'userState'];
  var notNotifiableProps = ['Timer', 'TimerId'];
  var noPersistProps = ['TimerId'];

  function makeUID(rem) {
    /*jshint bitwise:false */
    var i = void 0,
        random = void 0;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += (i === 12 ? 4 : i === 16 ? random & 3 | 8 : random).toString(16);
    }
    return (!rem ? 'uid-' : 'rem-') + uuid;
  }

  function difference(a, b) {
    function changes(a, b) {
      return _lodash2.default.transform(b, function (result, value, key) {
        if (!_lodash2.default.isEqual(value, a[key])) {
          result[key] = _lodash2.default.isObject(value) && _lodash2.default.isObject(a[key]) ? changes(value, a[key]) : value;
        }
      });
    }
    return changes(a, b);
  }

  var persistence = null;
  var network = null;

  function setPersistence(p) {
    persistence = p;
  }

  function setNetwork(n) {
    network = n;
  }

  var objects = {};

  function getCachedObject(u) {
    return objects[toUID(u)];
  }

  function getObject(u) {
    var uid = toUID(u);
    var o = objects[uid];
    if (o || !(persistence && persistence.fetch)) return Promise.resolve(o);
    return persistence.fetch(uid).then(function (o) {
      if (o) objects[uid] = o;
      return o;
    });
  }

  var toSave = {};

  function cachePersistAndNotify(o) {
    cacheAndPersist(o, true);
  }

  function cacheAndPersist(o, notify) {
    var uid = toUID(o.UID);
    objects[uid] = o;
    if (persistence && persistence.persist && o.Cache !== 'no-persist') toSave[uid] = toSave[uid] || notify || false;else if (notify) notifyObservers(o);
  }

  setInterval(function () {
    persistenceFlush().then(function (a) {
      return a.length && log.persist && console.log(a);
    });
  }, 10);

  function persistenceFlush() {
    return Promise.all(Object.keys(toSave).map(function (uid) {
      return getObject(uid).then(function (o) {
        if (!o) {
          console.warn('********* persistenceFlush: no object for', uid, toSave[uid], objects[uid]);delete toSave[uid];return;
        }
        var notify = toSave[uid];
        delete toSave[uid];
        return persistence.persist(_lodash2.default.omit(o, noPersistProps)).then(function (r) {
          if (notify) notifyObservers(o);return r;
        });
      });
    }));
  }

  function reCacheObjects() {
    if (persistence && persistence.recache) {
      return persistence.recache().then(function (actives) {
        return actives.map(function (o) {
          objects[o.UID] = o;
          runEvaluator(o.UID);
          return o;
        });
      });
    }
    return Promise.resolve([]);
  }

  function dumpCache() {
    console.log('---------cache-------');
    Object.keys(objects).map(function (k) {
      return console.log(objects[k]);
    });
    console.log('---------------------');
  }

  function spawnObject(o) {
    var UID = o.UID || makeUID();
    var Notify = o.Notify || [];
    cachePersistAndNotify(Object.assign({ UID: UID, Notify: Notify, Version: 1 }, o));
    doEvaluate(UID);
    return UID;
  }

  function spawnTemporaryObject(o) {
    var UID = makeUID();
    objects[UID] = Object.assign({ UID: UID, Version: 1, Cache: 'no-persist' }, o);
    return UID;
  }

  function cacheObjects(list) {
    return list.map(function (o) {
      return spawnObject(o);
    });
  }

  var fetching = {};

  function doGet(url) {
    if (!fetching[url]) {
      fetching[url] = true;
      network && network.doGet(url).then(function (json) {
        fetching[url] = false;incomingObjectFromGET(url, json);
      }).catch(function (e) {
        fetching[url] = false;console.warn('doGet', e, url);
      });
    }
  }

  function ensureObjectState(u, setnotify, observer) {
    var o = getCachedObject(u);
    if (o) {
      if (setnotify) setNotifyAndObserve(o, observer);
      if (isURL(o.UID) && (o.Updated || 0) + 10000 < Date.now()) {
        doGet(u);
      }
      return o;
    }
    getObject(u).then(function (o) {
      if (o) {
        if (setnotify) setNotifyAndObserve(o, observer);
        doEvaluate(observer.UID, { Alerted: o.UID });
        if (isURL(o.UID) && (o.Updated || 0) + 10000 < Date.now()) {
          doGet(u);
        }
      } else if (isURL(u) && setnotify) {
        // FIXME: still set 'remote notify' even if not local (see stash)
        var _o = { UID: u, Notify: [], Version: 0, Peer: toPeer(u), Updated: 0 };
        setNotifyAndObserve(_o, observer);
        cacheAndPersist(_o);
        doGet(u);
      }
    });
    return null;
  }

  function setNotify(o, uid, savelater) {
    if (!o.Notify.find(function (n) {
      return valMatch(n, uid);
    })) {
      o.Notify.push(uid);
      if (!savelater) cacheAndPersist(o);
    }
  }

  function setNotifyAndObserve(o, observer) {
    if (!o.Notify.find(function (n) {
      return valMatch(n, observer.UID);
    })) {
      o.Notify.push(observer.UID);
    }
    observer.Observe && observer.Observe.push(o.UID);
  }

  function remNotify(o, uid) {
    o.Notify = o.Notify.filter(function (n) {
      return !valMatch(n, uid);
    });
    cacheAndPersist(o);
  }

  function isRemote(uid) {
    return getObject(uid).then(function (o) {
      return o && o.Peer;
    });
  }

  function isShell(o) {
    return o.Peer && !o.Updated;
  }

  function notifyObservers(o) {
    var allNotify = _lodash2.default.uniq([].concat(o.Notifying || []).concat(o.Notify || []));
    if (log.notify) console.log('===========================\no.UID/is/Peer:', o.UID + ' / ' + o.is + ' / ' + (o.Peer || '--'));
    var peers = {};
    Promise.all(allNotify.map(function (u) {
      return getObject(u).then(function (n) {
        if (log.notify) console.log('------------------------');
        if (log.notify) console.log('peers start', peers, o.UID, o.is);
        if (log.notify) console.log('n.UID/is/Peer:', n && n.UID + ' / ' + n.is + ' / ' + (n.Peer || '--') || '--', u, toPeer(u));
        if (!n) {
          if (isURL(u) || isNotify(u)) {
            if (log.notify) console.log(isURL(u) && 'isURL' || '', isNotify(u) && 'isNotify' || '');
            var Peer = toPeer(u);
            if (log.notify) console.log('Peer', Peer);
            if (o.Peer !== Peer) {
              if (!peers[Peer]) peers[Peer] = [u];else peers[Peer].push(u);
            }
          } else {
            console.log('***** REMOVE ', u, 'from Notify of\n', o);
          }
        } else {
          if (n.Peer) {
            if (log.notify) console.log('n.Peer');
            if (o.Peer !== n.Peer) {
              if (!peers[n.Peer]) peers[n.Peer] = [n.UID];else peers[n.Peer].push(n.UID);
            }
          } else {
            if (log.notify) console.log('local eval');
            doEvaluate(n.UID, { Alerted: o.UID });
          }
        }
        if (log.notify) console.log('peers now', peers);
        if (log.notify) console.log('\n------------------------');
      }).catch(function (e) {
        return console.log(e);
      });
    })).then(function () {
      return Object.keys(peers).map(function (u) {
        return outgoingObject(Object.assign({}, o, { Notify: peers[u] }), u);
      });
    });
  }

  function outgoingObject(o, u) {
    network && network.doPost(o, u).then(function (ok) {
      if (log.net) {
        if (ok) console.log('-------------->> outgoingObject\n', JSON.stringify(o, null, 4), u);else console.log('no outgoingObject for', u);
      }
    });
  }

  function incomingObjectFromGET(url, json) {
    json = Object.assign({ Updated: Date.now() }, json);
    if (log.net) console.log('<<-------------- incomingObjectFromGET\n', JSON.stringify(json, null, 4));
    updateObject(url, json);
  }

  function incomingObject(json, notify) {
    if (!json.Notify) json.Notify = [];
    if (!json.Peer) json.Peer = toPeer(json.UID);
    json = Object.assign({ Updated: Date.now() }, json);
    if (notify) setNotify(json, notify, true);
    if (log.net) console.log('<<-------------- incomingObject\n', JSON.stringify(json, null, 4), notify);
    getObject(json.UID).then(function (o) {
      if (!o) storeObject(json);else updateObject(json.UID, json);
    });
  }

  function storeObject(o) {
    if (!o.UID) return;
    if (!o.Notify) o.Notify = [];
    if (!o.Version) o.Version = 1;
    cachePersistAndNotify(o);
  }

  function updateObject(uid, update) {
    if (!uid) return null;
    var o = getCachedObject(uid);
    if (!o) return null;
    if (log.changes) console.log(uid, 'before\n', JSON.stringify(o, null, 4), '\nupdate:\n', JSON.stringify(update, null, 4));
    if (o.Version && update.Version && o.Version >= update.Version) {
      console.log('incoming version not newer:', o.Version, 'not less than', update.Version);
      return null;
    }
    var p = mergeUpdate(o, update);
    checkTimer(p);
    var changed = !_lodash2.default.isEqual(o, p);
    var diff = changed && difference(o, p);
    var notifiable = diff && Object.keys(diff).filter(function (e) {
      return !notNotifiableProps.includes(e);
    }).length || diff.Timer;
    if (log.changes) console.log('changed:', changed, 'diff:', diff, 'notifiable:', notifiable);
    if (changed) {
      if (notifiable && !update.Version) p.Version = (p.Version || 0) + 1;
      if (log.changes) console.log('changed, result\n', JSON.stringify(p, null, 4));
      if (notifiable) cachePersistAndNotify(p);else cacheAndPersist(p);
    }
    return { updated: p, changed: changed, notifiable: notifiable };
  }

  function mergeUpdate(o, update) {
    var updateNotify = update.Notify;delete update.Notify;
    var p = Object.assign({}, o, update);
    updateNotify && updateNotify.forEach(function (un) {
      return setNotify(p, un, true);
    });
    return _lodash2.default.omitBy(p, function (v) {
      return v === null || v === undefined || v === '' || v === [];
    });
  }

  function isLink(u) {
    return isUID(u) || isURL(u) || isNotify(u);
  }

  function isUID(u) {
    return u && u.constructor === String && /^uid-/.test(u);
  }

  function isURL(u) {
    return u && u.constructor === String && /^https?:\/\//.test(u);
  }

  function isNotify(u) {
    return u && u.constructor === String && /^rem-/.test(u);
  }

  function toUID(u) {
    if (!isURL(u)) return u;
    var s = u.indexOf('uid-');
    if (s === -1) return u;
    return u.substring(s);
  }

  function toPeer(u) {
    if (!isURL(u)) return u;
    var s = u.indexOf('uid-');
    if (s === -1) return u;
    return u.substring(0, s) + 'notify';
  }

  var isQueryableCacheListLabels = ['queryable', 'cache', 'list'];

  function cacheQuery(o, uid, query) {
    setNotify(o, uid);
    if (!persistence) return Promise.resolve([]);
    var scope = o.list;
    if (scope.includes('local') || scope.includes('remote')) {
      return persistence.query(o.is.filter(function (s) {
        return !isQueryableCacheListLabels.includes(s);
      }), scope, query);
    }
    return Promise.resolve([]);
  }

  function object(u, p, q) {
    var r = function (uid, path, query) {
      if (!uid || !path) return null;
      var o = getCachedObject(uid);
      if (!o) return null;
      var hasMatch = query && query.constructor === Object && query.match;
      if (path === '.') return o;
      var pathbits = path.split('.');
      var observesubs = pathbits[0] !== 'Alerted' && o.Cache !== 'no-persist';
      var c = o;

      var _loop = function _loop(i) {
        if (pathbits[i] === '') return {
            v: c
          };
        if (pathbits[i] === 'Timer') return {
            v: c.Timer || 0
          };

        var isQueryableCacheList = c.is && c.is.constructor === Array && isQueryableCacheListLabels.every(function (s) {
          return c.is.includes(s);
        });
        if (pathbits[i] === 'list' && isQueryableCacheList && hasMatch) return {
            v: cacheQuery(c, uid, query)
          };

        var val = c[pathbits[i]];
        if (val == null) return {
            v: null
          };
        if (i == pathbits.length - 1) {
          if (!hasMatch) return {
              v: val
            };
          if (val.constructor === String) val = [val];
          if (val.constructor === Array) {
            if (query.match.constructor === Array) {
              return {
                v: query.match.length <= val.length && query.match.every(function (q) {
                  return val.find(function (v) {
                    return valMatch(q, v);
                  });
                }) && val || null
              };
            }
            var _r = val.filter(function (v) {
              if (valMatch(v, query.match)) return true;
              if (isLink(v) && query.match.constructor === Object) {
                if (_lodash2.default.isEqual(Object.keys(query.match), ['UID'])) {
                  return valMatch(v, query.match.UID);
                } else {
                  var _p = ensureObjectState(v, observesubs, o);
                  if (!_p) return false;
                  return Object.keys(query.match).every(function (k) {
                    return valMatch(_p[k], query.match[k]);
                  });
                }
              }
              if (v.constructor === Object) {
                return Object.keys(query.match).every(function (k) {
                  return valMatch(v[k], query.match[k]);
                });
              }
              return false;
            });
            return {
              v: _r.length === 1 && _r[0] || _r.length && _r || null
            };
          }
          return {
            v: valMatch(val, query.match) ? val : null
          };
        }
        if (val.constructor === Object) {
          c = val;return 'continue';
        }
        if (val.constructor === String) {
          c = ensureObjectState(val, observesubs, o);
          if (!c) return {
              v: null
            };
        }
      };

      for (var i = 0; i < pathbits.length; i++) {
        var _ret = _loop(i);

        switch (_ret) {
          case 'continue':
            continue;

          default:
            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
      }
    }(u, p, q);
    if (log.object) console.log('object', getCachedObject(u), '\npath:', p, q && 'query:' || '', q || '', '=>', r);
    return r;
  }

  function valMatch(a, b) {
    return a == b || (isURL(a) || isURL(b)) && toUID(a) === toUID(b);
  }

  function checkTimer(o) {
    var time = o.Timer;
    if (time && time > 0 && !o.TimerId) {
      o.TimerId = setTimeout(function () {
        getCachedObject(o.UID).TimerId = null;
        updateObject(o.UID, { Timer: 0 });
        doEvaluate(o.UID);
      }, time);
    }
  }

  function setPromiseState(uid, p) {
    p.then(function (update) {
      if (log.evaluate || log.update) console.log('<<<<<<<<<<<<< promised update:\n', update);
      updateObject(uid, update);
    });
    return {};
  }

  function doEvaluate(uid, params) {
    var o = getCachedObject(uid);
    if (!o) return null;
    var evaluator = o.Evaluator && (typeof o.Evaluator === 'function' ? o.Evaluator : evaluators[o.Evaluator]);
    if (!evaluator) return o;
    var Alerted = params && params.Alerted;
    if (Alerted) params = undefined;
    var reactnotify = o.ReactNotify;
    var observes = [];
    for (var i = 0; i < 4; i++) {
      if (log.update) console.log('>>>>>>>>>>>>>', uid, ['is:'].concat(object(uid, 'is')).join(' '));
      if (log.evaluate) console.log('iteration ' + i);
      if (log.evaluate) console.log('>>>>>>>>>>>>>\n', object(uid, '.'));
      if (log.evaluate && object(uid, 'userState.')) console.log('>>>>>user>>>>\n', object(uid, 'userState.'));
      o.Observe = [];
      if (Alerted) o.Alerted = Alerted;
      var evalout = evaluator(object.bind(null, uid), params) || {};
      delete o.Alerted;
      observes = _lodash2.default.uniq(observes.concat(o.Observe));
      delete o.Observe;
      var update = void 0;
      if (evalout.constructor === Array) {
        update = Object.assign.apply(Object, [{}].concat(_toConsumableArray(evalout.map(function (x) {
          return x && x.constructor === Promise ? setPromiseState(uid, x) : x || {};
        }))));
      } else update = evalout;

      var _updateObject = updateObject(uid, update),
          updated = _updateObject.updated,
          changed = _updateObject.changed,
          notifiable = _updateObject.notifiable;

      if (log.evaluate || log.update) if (changed) console.log('<<<<<<<<<<<<< update:\n', update);
      o = updated;
      if (!changed) break;
    }
    if (Alerted && !observes.includes(Alerted)) {
      if (log.evaluate || log.update) console.log('--------- Alerted not observed back by', uid, 'dropping Notify entry in Alerted:\n', getCachedObject(Alerted));
      remNotify(getCachedObject(Alerted), uid);
    }
    if (reactnotify) reactnotify();
    return o;
  }

  function runEvaluator(uid, params) {
    return getObject(uid).then(function () {
      return doEvaluate(uid, params);
    });
  }

  var evaluators = {};

  function setEvaluator(name, evaluator) {
    evaluators[name] = evaluator;
  }

  exports.default = {
    makeUID: makeUID,
    toUID: toUID,
    spawnObject: spawnObject,
    spawnTemporaryObject: spawnTemporaryObject,
    storeObject: storeObject,
    cacheObjects: cacheObjects,
    reCacheObjects: reCacheObjects,
    setNotify: setNotify,
    updateObject: updateObject,
    incomingObject: incomingObject,
    object: object,
    runEvaluator: runEvaluator,
    setEvaluator: setEvaluator,
    getObject: getObject,
    setPersistence: setPersistence,
    setNetwork: setNetwork,
    localProps: localProps,
    isURL: isURL,
    isNotify: isNotify,
    setLogging: setLogging
  };
  module.exports = exports['default'];
});