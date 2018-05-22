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

  var debug = false;

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

  var persist = null;
  var network = null;

  function setPersistence(f) {
    persist = f;
  }

  function setNetwork(n) {
    network = n;
  }

  function cacheAndStoreObject(o) {
    objects[o.UID] = o;
    if (persist) persist(o); // async persistence at the moment
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

  function ensureObjectState(UID, observer) {
    var o = objects[UID];
    if (o) {
      setNotify(o, observer);
      return;
    }
    cacheAndStoreObject({ UID: UID, Notify: [observer] });
  }

  function setNotify(o, uid) {
    if (o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
  }

  function notifyObservers(o) {
    o.Notify.map(function (uid) {
      return setTimeout(function () {
        var n = objects[uid];
        if (!n) return;
        n.Alerted = o.UID;
        doEvaluate(uid);
        delete n.Alerted;
      }, 1);
    });
  }

  function setObjectState(uid, update) {
    var newState = Object.assign({}, objects[uid], update);
    var changed = !_lodash2.default.isEqual(objects[uid], newState);
    if (!changed) return null;
    if (debug) console.log(uid, 'changed: ', difference(objects[uid], newState));
    cacheAndStoreObject(newState);
    notifyObservers(objects[uid]);
    if (objects[uid].Notifying) network && network.doPost(objects[uid]);
    return newState;
  }

  function isURL(uid) {
    return (/^https?:\/\//.test(uid)
    );
  }

  var fetching = {};

  function object(u, p, m) {
    var r = function (uid, path, match) {
      var o = objects[uid];
      if (path === '.') return o;
      var pathbits = path.split('.');
      if (pathbits.length == 1) {
        if (path === 'Timer') return o.Timer || 0;
        var val = o[path];
        if (val == null) return null;
        if (val.constructor === Array) {
          if (match == null || match.constructor !== Object) return val;
          return val.filter(function (v) {
            if (v.constructor !== String) return false;
            var o = objects[v];
            if (!o) return false;
            setNotify(o, uid);
            return Object.keys(match).every(function (k) {
              return o[k] === match[k];
            });
          });
        }
        return match == null || val == match ? val : null;
      }
      var c = o;
      for (var i = 0; i < pathbits.length; i++) {
        if (pathbits[i] === '') return c;
        var _val = c[pathbits[i]];
        if (_val == null) return null;
        if (_val.constructor === Object) {
          if (pathbits[i + 1]) return _val[pathbits[i + 1]];else return null;
        }
        if (i == pathbits.length - 1) return _val;
        c = objects[_val];
        if (!c) {
          if (isURL(_val)) {
            var _ret = function () {
              var url = _val;
              if (!fetching[url]) {
                fetching[url] = true;
                ensureObjectState(url, uid);
                network && network.doGet(url).then(function (json) {
                  fetching[url] = false;setObjectState(url, json);
                });
              }
              return {
                v: null
              };
            }();

            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
          }
        }
        setNotify(c, uid);
      }
    }(u, p, m);
    // if(debug) console.log('object',objects[u],'path',p,'match',m,'=>',r);
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

  function doEvaluate(uid) {
    var o = objects[uid];
    if (!o || !o.Evaluator || typeof o.Evaluator !== 'function') return;
    var reactnotify = o.ReactNotify;
    for (var i = 0; i < 4; i++) {
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
      var newState = o.Evaluator(object.bind(null, uid));
      if (debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
      checkTimer(o, newState.Timer);
      o = setObjectState(uid, newState);
      if (!o) break;
    }
    if (reactnotify) reactnotify();
  }

  exports.default = {
    makeUID: makeUID,
    spawnObject: spawnObject,
    storeObject: storeObject,
    cacheObjects: cacheObjects,
    setObjectState: setObjectState,
    object: object,
    doEvaluate: doEvaluate,
    objects: objects,
    setPersistence: setPersistence,
    setNetwork: setNetwork,
    localProps: localProps,
    isURL: isURL
  };
  module.exports = exports['default'];
});