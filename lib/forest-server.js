(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'express', 'body-parser', 'mongodb', './forest-core'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('express'), require('body-parser'), require('mongodb'), require('./forest-core'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.express, global.bodyParser, global.mongodb, global.forestCore);
    global.forestServer = mod.exports;
  }
})(this, function (module, exports, _express, _bodyParser, _mongodb, _forestCore) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _express2 = _interopRequireDefault(_express);

  var _bodyParser2 = _interopRequireDefault(_bodyParser);

  var _mongodb2 = _interopRequireDefault(_mongodb);

  var _forestCore2 = _interopRequireDefault(_forestCore);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var log = function log(req, res, next) {
    console.log(req.method, req.originalUrl, '\n', req.body);
    next();
  };

  var CORS = function CORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
  };

  var app = (0, _express2.default)();

  app.use(_bodyParser2.default.json());

  app.options("/*", log, CORS, function (req, res, next) {
    res.sendStatus(200);
  });

  app.get('/', log, CORS, function (req, res, next) {
    res.json({ mango: 'http://localhost:8080/banana/' });
    next();
  });

  app.post('/cache-notify', log, CORS, function (req, res, next) {
    _forestCore2.default.storeObject(req.body);
    res.json({ banana: 'http://localhost:8080/' });
    next();
  });

  var PORT = 8080;

  var forestdb = void 0;

  _mongodb2.default.MongoClient.connect('mongodb://localhost:27017/').then(function (client) {
    forestdb = client.db('forest');
    app.listen(PORT, function () {
      console.log('Server started on port ' + PORT);
    });
  });

  function updateObject(o) {
    var collectionName = o.is;
    return forestdb.collection(collectionName).update({ UID: o.UID }, o, { upsert: true }).then(function (result) {
      console.log('updated ' + o.UID + ' in ' + collectionName);
    }).catch(function (err) {
      console.log(err, 'Failed to insert ' + o.UID + ' in ' + collectionName);
    });
  }

  function persist(o) {
    console.log('persist:', o);
    return updateObject(o);
  }

  _forestCore2.default.setPersistence(persist);

  exports.default = {};
  module.exports = exports['default'];
});