(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'lodash', 'superagent'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('lodash'), require('superagent'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.lodash, global.superagent);
    global.forestCore = mod.exports;
  }
})(this, function (module, exports, _lodash, _superagent) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _lodash2 = _interopRequireDefault(_lodash);

  var _superagent2 = _interopRequireDefault(_superagent);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var debug = false;

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

  function spawnObject(o) {
    var UID = o.UID || makeUID();
    objects[UID] = Object.assign(o, { UID: UID, Notify: [] });
    return UID;
  }

  function storeObjects(list) {
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
    objects[UID] = { UID: UID, Notify: [observer] };
  }

  function setNotify(o, uid) {
    if (o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
  }

  function setObjectState(uid, update) {
    var newState = Object.assign({}, objects[uid], update);
    var changed = !_lodash2.default.isEqual(objects[uid], newState);
    if (!changed) return null;
    if (debug) console.log(uid, 'changed: ', difference(objects[uid], newState));
    objects[uid] = newState;
    objects[uid].Notify.map(function (u) {
      return setTimeout(doEvaluate.bind(null, u), 1);
    });
    if (objects[uid].Notifying) doPost(objects[uid]);
    return newState;
  }

  var fetching = {};

  function object(u, p, m) {
    var r = function (uid, path, match) {
      var o = objects[uid];
      if (path === '.') return o;
      var pathbits = path.split('.');
      if (pathbits.length == 1) {
        if (path === 'Timer') return o.Timer || 0;
        var _val = o[path];
        if (_val == null) return null;
        if (_val.constructor === Array) {
          if (match == null || match.constructor !== Object) return _val;
          return _val.filter(function (v) {
            if (v.constructor !== String) return false;
            var o = objects[v];
            if (!o) return false;
            setNotify(o, uid);
            return Object.keys(match).every(function (k) {
              return o[k] === match[k];
            });
          });
        }
        return match == null || _val == match ? _val : null;
      }
      var val = o[pathbits[0]];
      if (val == null) return null;
      if (val.constructor !== String) {
        if (val.constructor === Object) {
          if (pathbits[1]) return val[pathbits[1]];else return null;
        } else return null;
      }
      var linkedObject = objects[val];
      if (!linkedObject) {
        var url = val;
        if (!fetching[url]) {
          fetching[url] = true;
          ensureObjectState(url, uid);
          doGet(url);
        }
        return null;
      }
      setNotify(linkedObject, uid);
      if (pathbits[1] === '') return linkedObject;
      return linkedObject[pathbits[1]];
    }(u, p, m);
    // if(debug) console.log('UID',u,'path',p,'match',m,'=>',r);
    return r;
  }

  function doGet(url) {
    fetch(url).then(function (res) {
      fetching[url] = false;return res.json();
    }).then(function (json) {
      return setObjectState(url, json);
    });
  }

  var localProps = ['Notifying', 'Timer', 'evaluate', 'react', 'userState', 'timerId'];

  function doPost(o) {
    var data = _lodash2.default.omit(o, localProps);
    return _superagent2.default.post(o.Notifying).timeout({ response: 9000, deadline: 10000 }).send(data).then(function (x) {
      return x;
    });
  }

  function checkTimer(o, time) {
    if (time && time > 0 && !o.timerId) {
      o.timerId = setTimeout(function () {
        objects[o.UID].timerId = null;
        setObjectState(o.UID, { Timer: 0 });
        doEvaluate(o.UID);
      }, time);
    }
  }

  function doEvaluate(uid) {
    var o = objects[uid];
    var reactnotify = o.react.notify;
    if (!o.evaluate || typeof o.evaluate !== 'function') {
      console.error('no evaluate function!', o);return;
    }
    for (var i = 0; i < 4; i++) {
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, '.'));
      if (debug) console.log(i, '>>>>>>>>>>>>> ', object(uid, 'userState.'));
      var newState = o.evaluate(object.bind(null, uid));
      if (debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
      checkTimer(o, newState.Timer);
      o = setObjectState(uid, newState);
      if (!o) break;
    }
    reactnotify();
  }

  exports.default = {
    spawnObject: spawnObject,
    storeObjects: storeObjects,
    setObjectState: setObjectState,
    object: object,
    doEvaluate: doEvaluate,
    objects: objects
  };
  module.exports = exports['default'];
});