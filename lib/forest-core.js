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

  var notifyUID = makeUID();

  var localProps = ['Notifying', 'Alerted', 'Timer', 'TimerId', 'Evaluator', 'ReactNotify', 'userState'];

  function makeUID() {
    /*jshint bitwise:false */
    var i, random;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += (i === 12 ? 4 : i === 16 ? random & 3 | 8 : random).toString(16);
    }
    return uuid;
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

  var objects = {};

  function getObject(uid) {
    var o = objects[uid];
    if (o || !(persistence && persistence.fetch)) return Promise.resolve(o);
    return persistence.fetch(uid).then(function (o) {
      objects[uid] = o;
      return o;
    });
  }

  var persistence = null;
  var network = null;

  function setPersistence(p) {
    persistence = p;
  }

  function setNetwork(n) {
    network = n;
  }

  function cacheAndStoreObject(o) {
    objects[o.UID] = o;
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
    cacheAndStoreObject(Object.assign({ UID: UID, Notify: Notify }, o));
    doEvaluate(UID);
    return UID;
  }

  function storeObject(o) {
    if (!o.UID) return;
    if (!o.Notify) o.Notify = [];
    cacheAndStoreObject(o);
    notifyObservers(o);
  }

  function cacheObjects(list) {
    return list.map(function (o) {
      return spawnObject(o);
    });
  }

  var fetching = {};

  function ensureObjectState(UID, obsuid) {
    var o = objects[UID];
    if (o) {
      setNotify(o, obsuid);
      return o;
    }
    getObject(UID).then(function (o) {
      if (o) {
        setNotify(o, obsuid);
        notifyObservers(o);
      } else if (isURL(UID)) {
        cacheAndStoreObject({ UID: UID, Notify: [obsuid] });
        var url = UID;
        if (!fetching[url]) {
          fetching[url] = true;
          network && network.doGet(url).then(function (json) {
            fetching[url] = false;setObjectState(url, json);
          });
        }
      }
    });
    return null;
  }

  function setNotify(o, uid) {
    if (o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
  }

  function notifyObservers(o) {
    o.Notify.map(function (uid) {
      return getObject(uid).then(function (n) {
        if (!n) return;
        n.Alerted = o.UID;
        doEvaluate(uid);
        delete n.Alerted;
      });
    });
  }

  function setObjectState(uid, update) {
    if (!uid) return null;
    var o = objects[uid];
    if (!o) return null;
    var p = Object.assign({}, o, update);
    var changed = !_lodash2.default.isEqual(o, p);
    if (!changed) return null;
    if (debug) console.log(uid, 'changed: ', difference(o, p));
    cacheAndStoreObject(p);
    notifyObservers(p);
    if (p.Notifying) network && network.doPost(p);
    return p;
  }

  function isURL(uid) {
    return (/^https?:\/\//.test(uid)
    );
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
      var o = objects[uid];
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
                v: query.match.length === val.length && query.match.every(function (q, j) {
                  return q == val[j];
                }) && val || null
              };
            }
            return {
              v: val.filter(function (v) {
                if (v === query.match) return true;
                if (v.constructor === String) {
                  var _o = objects[v];
                  if (!_o) return false;
                  setNotify(_o, uid);
                  return Object.keys(query.match).every(function (k) {
                    return _o[k] === query.match[k];
                  });
                }
                if (v.constructor === Object) {
                  return Object.keys(query.match).every(function (k) {
                    return v[k] === query.match[k];
                  });
                }
                return false;
              })
            };
          }
          return {
            v: val == query.match ? val : null
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
    // if(debug) console.log('object',objects[u],'path',p,'query',q,'=>',r);
    return r;
  }

  function checkTimer(o, time) {
    if (time && time > 0 && !o.TimerId) {
      o.TimerId = setTimeout(function () {
        objects[o.UID].TimerId = null;
        setObjectState(o.UID, { Timer: 0 });
        doEvaluate(o.UID);
      }, time);
    }
  }

  function setPromiseState(uid, o, p) {
    p.then(function (newState) {
      if (debug) console.log('<<<<<<<<<<<<< new state bits: ', newState);
      checkTimer(o, newState.Timer);
      setObjectState(uid, newState);
    });
    return {};
  }

  function doEvaluate(uid, params) {
    var o = objects[uid];
    if (!o || !o.Evaluator || typeof o.Evaluator !== 'function') return o;
    var reactnotify = o.ReactNotify;
    for (var i = 0; i < 4; i++) {
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
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
      if (debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
      checkTimer(o, newState.Timer);
      o = setObjectState(uid, newState);
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
    makeUID: makeUID,
    spawnObject: spawnObject,
    storeObject: storeObject,
    cacheObjects: cacheObjects,
    setObjectState: setObjectState,
    object: object,
    runEvaluator: runEvaluator,
    getObject: getObject,
    setPersistence: setPersistence,
    setNetwork: setNetwork,
    localProps: localProps,
    isURL: isURL
  };
  module.exports = exports['default'];
});