(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'lodash', 'express', 'ws', 'body-parser', 'mongodb', './forest-core'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('lodash'), require('express'), require('ws'), require('body-parser'), require('mongodb'), require('./forest-core'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.lodash, global.express, global.ws, global.bodyParser, global.mongodb, global.forestCore);
    global.forestServer = mod.exports;
  }
})(this, function (module, exports, _lodash, _express, _ws, _bodyParser, _mongodb, _forestCore) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _lodash2 = _interopRequireDefault(_lodash);

  var _express2 = _interopRequireDefault(_express);

  var _ws2 = _interopRequireDefault(_ws);

  var _bodyParser2 = _interopRequireDefault(_bodyParser);

  var _mongodb2 = _interopRequireDefault(_mongodb);

  var _forestCore2 = _interopRequireDefault(_forestCore);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

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

  // --------------------------------

  var log = function log(req, res, next) {
    console.log(req.method, req.originalUrl, '\n', req.body);
    next();
  };

  var CORS = function CORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Notify');
    next();
  };

  var app = (0, _express2.default)();

  app.use(_bodyParser2.default.json());

  app.options("/*", log, CORS, function (req, res, next) {
    res.sendStatus(200);
  });

  app.get('/', log, CORS, function (req, res, next) {
    res.json({ mango: 'http://localhost:8180/banana/' });
    next();
  });

  var uid2notify = {};
  var notify2ws = {};

  app.post('/*', log, CORS, function (req, res, next) {
    var o = req.body;
    if (!o || !o.UID) next();
    uid2notify[o.UID] = req.headers.notify;
    var path = req.originalUrl.substring(1);
    var Notify = path === 'notify' ? null : [path];
    var addNotify = !(o.Notify && o.Notify.length) && Notify;
    _forestCore2.default.storeObject(!addNotify ? o : Object.assign(o, { Notify: Notify }));
    res.json({});
    next();
  });

  function doGet(url) {
    return fetch(url).then(function (res) {
      return res.json();
    });
  }

  function doPost(o) {
    var uid = o.Notifying;
    o.Notify.unshift(uid);
    var data = _lodash2.default.omit(o, _forestCore2.default.localProps);
    if (_forestCore2.default.isURL(uid)) {
      console.log('not posting to peer yet');
    } else {
      var notifyUID = uid2notify[uid];
      var ws = notify2ws[notifyUID];
      if (!ws) return;
      ws.send(JSON.stringify(data));
    }
  }

  function wsInit(config) {
    var wss = new _ws2.default.Server(config);
    wss.on('connection', function (ws) {
      ws.on('message', function (data) {
        var o = JSON.parse(data);
        if (o.notifyUID) {
          notify2ws[o.notifyUID] = ws;
          console.log('initialised:', o);
        } else {
          console.log('ws incoming json', o);
        }
      });
    });
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  // --------------------------------

  var forestdb = void 0;

  function updateObject(o) {
    var collectionName = o.is;
    return forestdb.collection(collectionName).update({ UID: o.UID }, o, { upsert: true }).then(function (result) {
      console.log('updated ' + o.UID + ' in ' + collectionName);
    }).catch(function (err) {
      console.log(err, 'Failed to insert ' + o.UID + ' in ' + collectionName);
    });
  }

  function persist(o) {
    return updateObject(o);
  }

  function toMongoProp(key, val) {
    if (key === 'time' && val.length === 3 && val[1] === '..') {
      return { $gt: val[0], $lt: val[2] };
    }
    return val;
  }

  function toMongo(scope, match) {
    return Object.assign.apply(Object, [{}].concat(_toConsumableArray(Object.keys(match).map(function (k) {
      return _defineProperty({}, k, toMongoProp(k, match[k]));
    }))));
  }

  function query(collectionName, scope, match) {
    return forestdb.collection(collectionName).find(toMongo(scope, match)).toArray().then(function (r) {
      return r.map(function (o) {
        return o.UID;
      });
    }).catch(function (e) {
      return console.error(e);
    });
  }

  _forestCore2.default.setPersistence({ persist: persist, query: query });

  // --------------------------------

  function init(port, wsPort) {
    return new Promise(function (resolve, reject) {
      _mongodb2.default.MongoClient.connect('mongodb://localhost:27017/').then(function (client) {
        forestdb = client.db('forest');
        app.listen(port, function () {
          console.log('Server started on port ' + port);
          wsInit({ port: wsPort });
          resolve();
        }).on('error', function (err) {
          return reject(err);
        });
      }).catch(function (err) {
        return reject(err);
      });
    });
  }

  exports.default = {
    init: init,
    cacheObjects: _forestCore2.default.cacheObjects,
    spawnObject: _forestCore2.default.spawnObject
  };
  module.exports = exports['default'];
});