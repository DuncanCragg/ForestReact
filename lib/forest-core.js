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

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
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

  // import { inspect } from 'util';

  var log = {
    update: false,
    evaluate: false,
    changes: false,
    notify: false,
    object: false,
    net: false,
    persist: false
  };

  var localProps = ['Timer', 'TimerId', 'Updated', 'Notifying', 'Alerted', 'Evaluator', 'Cache', 'ReactNotify'];
  var notNotifiableProps = ['Timer', 'TimerId', 'Updated'];
  var noPersistProps = ['TimerId'];

  function stringify(o) {
    var oo = _lodash2.default.omit(o, noPersistProps);
    try {
      return JSON.stringify(oo, null, 4);
    } catch (e) {
      return '{ "Stringify-Error": "' + e.message + '" }\n';
    }
  }

  function listify() {
    var _ref;

    for (var _len = arguments.length, items = Array(_len), _key = 0; _key < _len; _key++) {
      items[_key] = arguments[_key];
    }

    return (_ref = []).concat.apply(_ref, _toConsumableArray(items.filter(function (i) {
      return ![undefined, null, ''].includes(i);
    })));
  }

  function delistify(i) {
    return [undefined, null, ''].includes(i) ? null : i.constructor === Array ? i.length == 1 ? i[0] : i : i;
  }

  function setLogging(conf) {
    Object.assign(log, conf);
  }

  function makeUID(peer) {
    /*jshint bitwise:false */
    var i = void 0,
        random = void 0;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += (i === 12 ? 4 : i === 16 ? random & 3 | 8 : random).toString(16);
    }
    return (!peer ? 'uid-' : 'peer-') + uuid;
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
    if (!u) return Promise.resolve(null);
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

  function dumpCache(slowness) {
    console.log('---------cache-------');
    if (!slowness) Object.keys(objects).map(function (k) {
      return console.log(stringify(objects[k]));
    });else {
      Object.keys(objects).map(function (k, i) {
        setTimeout(function () {
          return console.log(stringify(objects[k]));
        }, i * slowness);
      });
    }
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

  function cacheObjects(objects) {
    if (objects.constructor === Array) {
      return objects.map(function (o) {
        return spawnObject(o);
      });
    }
    if (objects.constructor === Object) {
      return Object.assign.apply(Object, [{}].concat(_toConsumableArray(Object.keys(objects).map(function (k) {
        return _defineProperty({}, k, spawnObject(objects[k]));
      }))));
    }
  }

  var fetching = {};

  function doGet(url) {
    if (!fetching[url]) {
      fetching[url] = true;
      network && network.doGet(url).then(function (json) {
        fetching[url] = false;incomingObjectFromGET(url, json);
      }).catch(function (e) {
        fetching[url] = false;console.log('doGet', e.message, url);
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
    var prevNotify = listify(o.Notify);
    if (!prevNotify.find(function (n) {
      return valMatch(n, uid);
    })) {
      o.Notify = prevNotify.concat(uid);
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
    var prevNotify = listify(o.Notify);
    o.Notify = prevNotify.filter(function (n) {
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
    var allNotify = _lodash2.default.uniq(listify(o.Notifying, o.Notify));
    if (log.notify) console.log('===========================\no.UID/is/Peer:', o.UID + ' / ' + o.is + ' / ' + (o.Peer || '--'));
    var peers = {};
    Promise.all(allNotify.map(function (u) {
      return getObject(u).then(function (n) {
        if (log.notify) console.log('------------------------');
        if (log.notify) console.log('peers start', peers, o.UID, o.is);
        if (log.notify) console.log('n.UID/is/Peer:', n && n.UID + ' / ' + n.is + ' / ' + (n.Peer || '--') || '--', u, toPeer(u));
        if (!n) {
          if (isURL(u) || isPeer(u)) {
            if (log.notify) console.log(isURL(u) && 'isURL' || '', isPeer(u) && 'isPeer' || '');
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
        return console.log(e.message);
      });
    })).then(function () {
      return Object.keys(peers).map(function (u) {
        return outgoingObject(Object.assign({}, o, { Notify: peers[u] }), u);
      });
    });
  }

  function outgoingObject(o, u) {
    network && network.doPost(o, u).then(function (ok) {
      if (log.net) console.log(ok ? '<<-------------- outgoingObject' : 'no outgoingObject for', u, '\n', stringify(o));
    }).catch(function (e) {
      return console.log('doPost', e.message, u, o);
    });
  }

  function incomingObjectFromGET(url, json) {
    json = Object.assign({ Updated: Date.now() }, json);
    if (log.net) console.log('-------------->> incomingObjectFromGET\n', stringify(json));
    updateObject(url, json, true);
  }

  function incomingObject(json, notify) {
    if (!json.Notify) json.Notify = [];
    if (!json.Peer) json.Peer = toPeer(json.UID);
    json = Object.assign({ Updated: Date.now() }, json);
    if (notify) setNotify(json, notify, true);
    if (log.net) console.log('-------------->> incomingObject\n', stringify(json), notify);
    getObject(json.UID).then(function (o) {
      if (!o) storeObject(json);else updateObject(json.UID, json, true);
    });
  }

  function storeObject(o) {
    if (!o.UID) return;
    if (!o.Notify) o.Notify = [];
    if (!o.Version) o.Version = 1;
    cachePersistAndNotify(o);
  }

  var deltas = {};

  function updateObject(uid, update, full) {
    if (!uid) return null;
    var o = getCachedObject(uid);
    if (!o) return null;
    if (log.changes) console.log(uid, 'before\n', stringify(o), full ? '\nincoming:\n' : '\nupdate:\n', stringify(update));
    var newer = !update.Version || !o.Version || update.Version > o.Version;
    if (!newer) console.log('incoming version not newer:', update.Version, 'not greater than', o.Version, 'is:', update.is);
    var p = mergeUpdate(o, update, full);
    checkTimer(p);
    var changed = !_lodash2.default.isEqual(o, p);
    var delta = changed && difference(o, p);
    if (changed) {
      deltas[uid] = uid in deltas ? Object.assign(deltas[uid], delta) : delta;
    }
    var notifiable = full ? newer : update.Timer || changed && Object.keys(update).filter(function (e) {
      return !notNotifiableProps.includes(e);
    }).length;
    if (log.changes) console.log('changed:', changed, 'delta:', delta, 'notifiable:', notifiable);
    if (changed) {
      if (notifiable && !update.Version) p.Version = (p.Version || 0) + 1;
      if (log.changes) console.log('changed, result\n', stringify(p));
      if (notifiable) cachePersistAndNotify(p);else cacheAndPersist(p);
    }
    return { updated: p, changed: changed, notifiable: notifiable };
  }

  function mergeUpdate(o, update, full) {
    var updateNotify = listify(update.Notify);delete update.Notify;
    var p = Object.assign({ UID: o.UID, Peer: o.Peer, Notify: o.Notify, Version: o.Version, Updated: o.Updated }, full ? {} : o, update);
    updateNotify.forEach(function (un) {
      return setNotify(p, un, true);
    });
    return _lodash2.default.omitBy(p, function (v) {
      return v === null || v === undefined || v === '' || v === [];
    });
  }

  function isLink(u) {
    return isUID(u) || isURL(u) || isPeer(u);
  }

  function isUID(u) {
    return u && u.constructor === String && /^uid-/.test(u);
  }

  function isURL(u) {
    return u && u.constructor === String && /^https?:\/\//.test(u);
  }

  function isPeer(u) {
    return u && u.constructor === String && /^peer-/.test(u);
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

  var isQueryableCacheList = function isQueryableCacheList(is) {
    return is && is.constructor === Array && ['queryable', 'cache', 'list'].every(function (s) {
      return is.includes(s);
    });
  };

  function cacheQuery(o, uid, query) {
    setNotify(o, uid);
    if (!persistence) return Promise.resolve([]);
    var scope = o.list;
    if (!(scope && scope.constructor === Array)) return Promise.resolve([]);
    if (scope.includes('local') || scope.includes('remote')) {
      return persistence.query(scope, query);
    }
    return Promise.resolve([]);
  }

  var regexMatches = [];

  function regexAwareSplit(path) {
    var m1 = path.match(/\/(.+?)\//);
    if (!m1) return path.split('.');
    var p2 = path.replace(m1[1], "$1");
    var pathbits = p2.split('.');
    for (var i = 0; i < pathbits.length; i++) {
      pathbits[i] = pathbits[i].replace("$1", m1[1]);
    }
    return pathbits;
  }

  function checkRegex(regex, target) {
    regexMatches.length = 0;
    for (var p in target) {
      var m2 = p.match(regex[1]);
      if (!m2) continue;
      var match = m2[m2.length > 1 ? 1 : 0];
      regexMatches.push({ value: target[p], match: match });
    }
    return regexMatches.length > 0;
  }

  function checkDeltas(pathbits, observesubs, o, regex) {
    if (pathbits.length !== 2) return console.warn("require two path elements for delta '?'", pathbits) || null;
    var p0 = pathbits[0];
    var p1 = pathbits[1];
    var val = o[p0];
    if (!val) return null;
    var c = ensureObjectState(val, observesubs, o);
    if (!c) return null;
    var delta = deltas[val];
    if (!delta) return null;
    var p2 = p1.slice(0, -1);
    if (regex) {
      if (p2 !== regex[0]) return console.warn("regex must span entire path element - exclusing '?'", p1) || null;
      if (checkRegex(regex, delta)) return delistify(regexMatches.map(function (m) {
        return m.value;
      }));
    }
    var newval = delta[p2];
    return newval !== undefined ? newval : null;
  }

  function checkNonDeltaWithRegex(pathbits, observesubs, o, regex) {
    if (pathbits.length !== 2) return console.warn('require two path elements for regex', pathbits) || null;
    if (pathbits[1] !== regex[0]) return console.warn('regex must span entire path element', pathbits[1]) || null;
    var p0 = pathbits[0];
    var p1 = pathbits[1];
    var val = o[p0];
    if (!val) return null;
    var t = (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object' ? val : typeof val === 'string' ? ensureObjectState(val, observesubs, o) : null;
    if (t && checkRegex(regex, t)) return delistify(regexMatches.map(function (m) {
      return m.value;
    }));
    return null;
  }

  function object(u, p, q) {
    var r = function (uid, path, query) {
      if (!uid || !path) return null;
      var o = getCachedObject(uid);
      if (!o) return null;
      var hasMatch = query && query.constructor === Object && query.match;
      if (path === '.') return o;

      var regexsub = path.match(/\$\d{1}/);
      if (regexsub) return path === "@$1" ? delistify(regexMatches.map(function (m) {
        return m.match;
      })) : delistify(regexMatches.map(function (m) {
        return path.replace(regexsub[0], m.match);
      }).map(function (p) {
        return object(u, p);
      }));

      var pathbits = regexAwareSplit(path);
      var observesubs = pathbits[0] !== 'Alerted' && o.Cache !== 'no-persist';

      var regex = path.match(/\/(.+?)\//);
      if (path.endsWith('?')) return checkDeltas(pathbits, observesubs, o, regex);else if (regex) return checkNonDeltaWithRegex(pathbits, observesubs, o, regex);

      var c = o;

      var _loop = function _loop(i) {
        if (pathbits[i] === '') return {
            v: c
          };
        if (pathbits[i] === 'Timer') return {
            v: c.Timer || 0
          };

        if (pathbits[i] === 'list' && hasMatch && isQueryableCacheList(c.is)) return {
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
      o.Observe = [];
      if (Alerted) o.Alerted = Alerted;
      var evalout = {};
      try {
        evalout = evaluator(object.bind(null, uid), i === 0 && params) || {};
      } catch (e) {
        console.log('Exception in evaluator!', e.message, '\n', e.stack);
      }
      delete deltas[Alerted];
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
      regexMatches.length = 0;
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
    listify: listify,
    delistify: delistify,
    stringify: stringify,
    makeUID: makeUID,
    toUID: toUID,
    spawnObject: spawnObject,
    spawnTemporaryObject: spawnTemporaryObject,
    storeObject: storeObject,
    cacheObjects: cacheObjects,
    reCacheObjects: reCacheObjects,
    dumpCache: dumpCache,
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
    isUID: isUID,
    isURL: isURL,
    isPeer: isPeer,
    setLogging: setLogging,
    log: log
  };
  module.exports = exports['default'];
});