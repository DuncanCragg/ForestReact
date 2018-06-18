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

  var debug = false;

  var notifyUID = makeUID(true);

  var localProps = ['Notifying', 'Alerted', 'Timer', 'TimerId', 'Evaluator', 'ReactNotify', 'userState'];

  function makeUID(notify) {
    /*jshint bitwise:false */
    var i, random;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += (i === 12 ? 4 : i === 16 ? random & 3 | 8 : random).toString(16);
    }
    return (!notify ? 'uid-' : 'ntf-') + uuid;
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

  function cacheAndPersist(o) {
    objects[toUID(o.UID)] = o;
    if (persistence && persistence.persist) persistence.persist(o);
  }

  function dumpCache() {
    console.log("---------cache-------");
    Object.keys(objects).map(function (k) {
      return console.log(objects[k]);
    });
    console.log("---------------------");
  }

  function spawnObject(o) {
    var UID = o.UID || makeUID();
    var Notify = o.Notify || [];
    cacheAndPersist(Object.assign({ UID: UID, Notify: Notify }, o));
    doEvaluate(UID);
    return UID;
  }

  function cacheObjects(list) {
    return list.map(function (o) {
      return spawnObject(o);
    });
  }

  var fetching = {};

  function ensureObjectState(u, obsuid) {
    var o = getCachedObject(u);
    if (o) {
      // if(isURL(u) && o.timeSinceFetched < ..){ // and below after getObject
      setNotify(o, obsuid);
      return o;
    }
    getObject(u).then(function (o) {
      if (o) {
        setNotify(o, obsuid);
        //notifyObservers(o);
      } else if (isURL(u)) {
        var url = u;
        cacheAndPersist({ UID: url, Notify: [obsuid], Remote: url });
        if (!fetching[url]) {
          fetching[url] = true;
          network && network.doGet(url).then(function (json) {
            fetching[url] = false;updateObject(url, json);
          });
        }
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

  function notifyObservers(o) {
    if (o.Notifying) {
      setNotify(o, o.Notifying);
    }
    var remotes = {};
    Promise.all(o.Notify.map(function (u) {
      return getObject(u).then(function (n) {
        if (!n) {
          if (isURL(u) || isNotify(u)) {
            network && network.doPost(Object.assign({}, o, { Notify: [u] }), u); // TODO: !dropping o.Notify entries..
          }
        } else {
          if (n.Remote) {
            if (!remotes[n.Remote]) remotes[n.Remote] = [n.UID];else remotes[n.Remote].concat(n.UID);
          } else {
            n.Alerted = o.UID;
            doEvaluate(n.UID);
            delete n.Alerted;
          }
        }
      }).catch(function (e) {
        return console.log(e);
      });
    })).then(function () {
      return Object.keys(remotes).map(function (r) {
        return network && network.doPost(Object.assign({}, o, { Notify: remotes[r] }), r);
      });
    });
  }

  function incomingObject(json, notify) {
    if (!json.Notify) json.Notify = [];
    if (notify) setNotify(json, notify, true);
    getObject(json.UID).then(function (o) {
      if (!o) storeObject(json);else updateObject(json.UID, json);
    });
  }

  function storeObject(o) {
    if (!o.UID) return;
    if (!o.Notify) o.Notify = [];
    cacheAndPersist(o);
    notifyObservers(o);
  }

  function updateObject(uid, update) {
    if (!uid) return null;
    var o = getCachedObject(uid);
    if (!o) return null;
    var p = Object.assign({}, o, update);
    var changed = !_lodash2.default.isEqual(o, p);
    if (!changed) return null;
    if (debug) console.log(uid, 'changed: ', difference(o, p));
    cacheAndPersist(p);
    notifyObservers(p);
    return p;
  }

  function isUID(u) {
    return (/^uid-/.test(u)
    );
  }

  function isURL(u) {
    return (/^https?:\/\//.test(u)
    );
  }

  function isNotify(u) {
    return (/^ntf-/.test(u)
    );
  }

  function toUID(u) {
    if (!isURL(u)) return u;
    var s = u.indexOf('uid-');
    if (s === -1) return u;
    return u.substring(s);
  }

  var isQueryableCacheListLabels = ['queryable', 'cache', 'list'];

  function cacheQuery(o, path, query) {
    if (!persistence) return new Promise();
    var scope = o.list;
    if (scope.includes('local') || scope.includes('remote')) {
      return persistence.query(o.is.filter(function (s) {
        return !isQueryableCacheListLabels.includes(s);
      }), scope, query);
    }
    return new Promise();
  }

  function object(u, p, q) {
    var r = function (uid, path, query) {
      if (!uid || !path) return null;
      var o = getCachedObject(uid);
      if (!o) return null;
      var isQueryableCacheList = o.is && o.is.constructor === Array && isQueryableCacheListLabels.every(function (s) {
        return o.is.includes(s);
      });
      var hasMatch = query && query.constructor === Object && query.match;
      if (path === 'list' && isQueryableCacheList && hasMatch) return cacheQuery(o, path, query);
      if (path === '.') return o;
      var pathbits = path.split('.');
      var c = o;

      var _loop = function _loop() {
        if (pathbits[i] === '') return {
            v: c
          };
        if (pathbits[i] === 'Timer') return {
            v: c.Timer || 0
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
              if (v.constructor === String) {
                // TODO: ensureObjectState?
                var _o = getCachedObject(v);
                if (!_o) return false;
                setNotify(_o, uid); // TODO: don't do that when it needn't observe: String:String case, UID:, etc
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
        var _ret = _loop();

        switch (_ret) {
          case 'continue':
            continue;

          default:
            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
      }
    }(u, p, q);
    // if(debug) console.log('object',getCachedObject(u),'path',p,'query',q,'=>',r);
    return r;
  }

  function valMatch(a, b) {
    return a == b || (isURL(a) || isURL(b)) && toUID(a) === toUID(b);
  }

  function checkTimer(o, time) {
    if (time && time > 0 && !o.TimerId) {
      o.TimerId = setTimeout(function () {
        getCachedObject(o.UID).TimerId = null;
        updateObject(o.UID, { Timer: 0 });
        doEvaluate(o.UID);
      }, time);
    }
  }

  function setPromiseState(uid, o, p) {
    p.then(function (newState) {
      if (debug) console.log('<<<<<<<<<<<<< promised update: ', newState);
      checkTimer(o, newState.Timer);
      updateObject(uid, newState);
    });
    return {};
  }

  function doEvaluate(uid, params) {
    var o = getCachedObject(uid);
    if (!o || !o.Evaluator || typeof o.Evaluator !== 'function') return o;
    var reactnotify = o.ReactNotify;
    for (var i = 0; i < 4; i++) {
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
      if (debug && object(uid, 'userState.')) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
      var evalout = o.Evaluator(object.bind(null, uid), params);
      if (!evalout) {
        console.error('no eval output for', uid, o);return o;
      }
      var newState = void 0;
      if (evalout.constructor === Array) {
        newState = Object.assign.apply(Object, [{}].concat(_toConsumableArray(evalout.map(function (x) {
          return x && x.constructor === Promise ? setPromiseState(uid, o, x) : x || {};
        }))));
      } else newState = evalout;
      if (debug) console.log(i, '<<<<<<<<<<<<< update: ', newState);
      checkTimer(o, newState.Timer);
      o = updateObject(uid, newState);
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

  exports.default = {
    notifyUID: notifyUID,
    toUID: toUID,
    spawnObject: spawnObject,
    storeObject: storeObject,
    cacheObjects: cacheObjects,
    setNotify: setNotify,
    updateObject: updateObject,
    incomingObject: incomingObject,
    object: object,
    runEvaluator: runEvaluator,
    getObject: getObject,
    setPersistence: setPersistence,
    setNetwork: setNetwork,
    localProps: localProps,
    isURL: isURL,
    isNotify: isNotify
  };
  module.exports = exports['default'];
});