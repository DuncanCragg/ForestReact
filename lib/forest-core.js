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

  var debugall = false;
  var debugevaluate = debugall || false;
  var debugchanges = debugall || false;
  var debugnotify = debugall || false;
  var debugobject = debugall || false;
  var debugnet = debugall || false;
  var debugpersist = debugall || false;

  var localProps = ['Notifying', 'Alerted', 'Timer', 'TimerId', 'Evaluator', 'Cache', 'ReactNotify', 'userState'];
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
      objects[uid] = o;
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
    if (persistence && persistence.persist) toSave[uid] = toSave[uid] || notify || false;else if (notify) notifyObservers(o);
  }

  setInterval(function () {
    persistenceFlush().then(function (a) {
      return a.length && debugpersist && console.log(a);
    });
  }, 10);

  function persistenceFlush() {
    return Promise.all(Object.keys(toSave).map(function (uid) {
      return getObject(uid).then(function (o) {
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
        fetching[url] = false;console.error('doGet', e, url);
      });
    }
  }

  function ensureObjectState(u, obsuid) {
    var o = getCachedObject(u);
    if (o) {
      if (isURL(u) && (o.Updated || 0) + 10000 < Date.now()) {
        doGet(u);
      }
      if (obsuid) setNotify(o, obsuid);
      return o;
    }
    getObject(u).then(function (o) {
      if (o) {
        if (isURL(u) && (o.Updated || 0) + 10000 < Date.now()) {
          doGet(u);
        }
        if (obsuid) {
          setNotify(o, obsuid);notifyObservers(o);
        }
      } else if (isURL(u) && obsuid) {
        cacheAndPersist({ UID: u, Notify: [obsuid], Version: 0, Remote: toRemote(u), Updated: 0 });
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

  function isRemote(uid) {
    return getObject(uid).then(function (o) {
      return o && o.Remote;
    });
  }

  function isShell(o) {
    return o.Remote && !o.Updated;
  }

  function notifyObservers(o) {
    if (o.Notifying) {
      setNotify(o, o.Notifying); // merge here, don't set; also, it saves o here
    }
    if (debugnotify) console.log('===========================\no.UID/is/Remote:', o.UID + ' / ' + o.is + ' / ' + (o.Remote || '--'));
    var remotes = {};
    Promise.all(o.Notify.map(function (u) {
      return getObject(u).then(function (n) {
        if (debugnotify) console.log('------------------------');
        if (debugnotify) console.log('remotes start', remotes, o.UID, o.is);
        if (debugnotify) console.log('n.UID/is/Remote:', n && n.UID + ' / ' + n.is + ' / ' + (n.Remote || '--') || '--', u, toRemote(u));
        if (!n) {
          if (isURL(u) || isNotify(u)) {
            if (debugnotify) console.log(isURL(u) && 'isURL' || '', isNotify(u) && 'isNotify' || '');
            var Remote = toRemote(u);
            if (debugnotify) console.log('Remote', Remote);
            if (o.Remote !== Remote) {
              if (!remotes[Remote]) remotes[Remote] = [u];else remotes[Remote].push(u);
            }
          }
        } else {
          if (n.Remote) {
            if (debugnotify) console.log('n.Remote');
            if (o.Remote !== n.Remote) {
              if (!remotes[n.Remote]) remotes[n.Remote] = [n.UID];else remotes[n.Remote].push(n.UID);
            }
          } else {
            if (debugnotify) console.log('local eval');
            doEvaluate(n.UID, { Alerted: o.UID });
          }
        }
        if (debugnotify) console.log('remotes now', remotes);
        if (debugnotify) console.log('\n------------------------');
      }).catch(function (e) {
        return console.log(e);
      });
    })).then(function () {
      return Object.keys(remotes).map(function (u) {
        return outgoingObject(Object.assign({}, o, { Notify: remotes[u] }), u);
      });
    });
  }

  function outgoingObject(o, u) {
    network && network.doPost(o, u).then(function (ok) {
      if (debugnet) {
        if (ok) console.log('-------------->> outgoingObject\n', JSON.stringify(o, null, 4), u);else console.log('no outgoingObject for', u);
      }
    });
  }

  function incomingObjectFromGET(url, json) {
    json = Object.assign({ Updated: Date.now() }, json);
    if (debugnet) console.log('<<-------------- incomingObjectFromGET\n', JSON.stringify(json, null, 4));
    updateObject(url, json);
  }

  function incomingObject(json, notify) {
    if (!json.Notify) json.Notify = [];
    if (!json.Remote) json.Remote = toRemote(json.UID);
    json = Object.assign({ Updated: Date.now() }, json);
    if (notify) setNotify(json, notify, true);
    if (debugnet) console.log('<<-------------- incomingObject\n', JSON.stringify(json, null, 4), notify);
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
    if (debugchanges) console.log(uid, 'before\n', JSON.stringify(o, null, 4), '\nupdate:\n', JSON.stringify(update, null, 4));
    if (o.Version && update.Version && o.Version >= update.Version) {
      console.log('incoming version not newer:', o.Version, 'not less than', update.Version);
      return null;
    }
    var p = mergeUpdate(o, update);
    checkTimer(p);
    var diff = difference(o, p);
    var changed = !_lodash2.default.isEqual(diff, {});
    var justtimeout = _lodash2.default.isEqual(diff, { Timer: 0 });
    //const justupdated = _.isEqual(diff, { Updated: .. }); // also needed for Version: ?
    if (debugchanges) console.log('diff:', diff, 'changed:', changed, 'justtimeout:', justtimeout /*, 'justupdated:', justupdated*/);
    if (changed) {
      if (!justtimeout && !update.Version) p.Version = (p.Version || 0) + 1;
      if (debugchanges) console.log('changed, result\n', JSON.stringify(p, null, 4));
      if (!justtimeout) cachePersistAndNotify(p);else cacheAndPersist(p);
    }
    return changed && !justtimeout ? p : null;
  }

  function mergeUpdate(o, update) {
    var updateNotify = update.Notify;delete update.Notify;
    var p = Object.assign({}, o, update);
    updateNotify && updateNotify.forEach(function (un) {
      return setNotify(p, un, true);
    });
    return p;
  }

  function isLink(u) {
    return isUID(u) || isURL(u) || isNotify(u);
  }

  function isUID(u) {
    return u.constructor === String && /^uid-/.test(u);
  }

  function isURL(u) {
    return u.constructor === String && /^https?:\/\//.test(u);
  }

  function isNotify(u) {
    return u.constructor === String && /^rem-/.test(u);
  }

  function toUID(u) {
    if (!isURL(u)) return u;
    var s = u.indexOf('uid-');
    if (s === -1) return u;
    return u.substring(s);
  }

  function toRemote(u) {
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
                var _o = ensureObjectState(v, observingMatcher(query.match) && uid);
                if (!_o) return false;
                return Object.keys(query.match).every(function (k) {
                  return valMatch(_o[k], query.match[k]);
                });
              }
              if (v.constructor === Object) {
                return Object.keys(query.match).every(function (k) {
                  return valMatch(v[k], query.match[k]);
                });
              }
              return false;
            });
            return {
              v: _r.length && _r || null
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
          c = ensureObjectState(val, uid);
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
    if (debugobject) console.log('object', getCachedObject(u), '\npath:', p, q && 'query:' || '', q || '', '=>', r);
    return r;
  }

  function valMatch(a, b) {
    return a == b || (isURL(a) || isURL(b)) && toUID(a) === toUID(b);
  }

  function observingMatcher(match) {
    return !_lodash2.default.isEqual(Object.keys(match), ['UID']);
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
      if (debugevaluate) console.log('<<<<<<<<<<<<< promised update:\n', update);
      var o = updateObject(uid, update);
    });
    return {};
  }

  function doEvaluate(uid, params) {
    var o = getCachedObject(uid);
    if (!o) return o;
    var evaluator = o.Evaluator && (typeof o.Evaluator === 'function' ? o.Evaluator : evaluators[o.Evaluator]);
    if (!evaluator) return o;
    var reactnotify = o.ReactNotify;
    for (var i = 0; i < 4; i++) {
      if (debugevaluate) console.log('iteration ' + i);
      if (debugevaluate) console.log('>>>>>>>>>>>>>\n', object(uid, '.'));
      if (debugevaluate && object(uid, 'userState.')) console.log('>>>>>user>>>>\n', object(uid, 'userState.'));
      if (params && params.Alerted) o.Alerted = params.Alerted;
      var evalout = evaluator(object.bind(null, uid), params);
      delete o.Alerted;
      if (!evalout) {
        console.error('no evaluator output for', uid, o);return o;
      }
      var update = void 0;
      if (evalout.constructor === Array) {
        update = Object.assign.apply(Object, [{}].concat(_toConsumableArray(evalout.map(function (x) {
          return x && x.constructor === Promise ? setPromiseState(uid, x) : x || {};
        }))));
      } else update = evalout;
      if (debugevaluate) console.log('<<<<<<<<<<<<< update:\n', update);
      o = updateObject(uid, update);
      if (!o) break;
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
    isNotify: isNotify
  };
  module.exports = exports['default'];
});