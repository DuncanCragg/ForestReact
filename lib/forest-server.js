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

  var serverHost = null;
  var serverPort = 0;

  // --------------------------------

  var logRequest = function logRequest(req, res, next) {
    console.log('---------------------------->');
    if (req.method === 'POST') console.log(req.method, req.originalUrl, '\n', req.body);else console.log(req.method, req.originalUrl);
    next();
  };

  var logResponse = function logResponse(req, res, next) {
    console.log(res.statusCode);
    console.log('<----------------------------');
    next();
  };

  var CORS = function CORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Notify'); // Accept, X-Requested-By, Origin, Cache-Control
    next();
  };

  var app = (0, _express2.default)();

  app.use(_bodyParser2.default.json());

  app.options("/*", logRequest, CORS, function (req, res, next) {
    res.sendStatus(200);
  }, logResponse);

  function prefixUIDs(o) {
    var s = JSON.stringify(_lodash2.default.omit(o, _forestCore2.default.localProps), null, 2);
    return s.replace(/"uid-/g, '"http://' + serverHost + ':' + serverPort + '/uid-');
  }

  app.get('/*', logRequest, CORS, function (req, res, next) {
    var notify = req.headers.notify;
    var uid = req.originalUrl.substring(1);
    _forestCore2.default.getObject(uid).then(function (o) {
      if (o) {
        res.json(JSON.parse(prefixUIDs(o)));if (notify) _forestCore2.default.setNotify(o, notify);
      } else res.status(404).send('Not found');
    }).then(function () {
      return next();
    }).catch(function (e) {
      return console.error(e);
    });
  }, logResponse);

  var notify2ws = {};

  app.post('/*', logRequest, CORS, function (req, res, next) {
    var json = req.body;
    if (!json || !json.UID) next();
    var notify = req.headers.notify;
    var path = req.originalUrl.substring(1);
    _forestCore2.default.incomingObject(Object.assign(json, notify && { Remote: notify }), path !== 'notify' && path);
    res.json({});
    next();
  }, logResponse);

  function doGet(url) {
    return fetch(url).then(function (res) {
      return res.json();
    }).catch(function (e) {
      return console.error('doGet', e);
    });
  }

  var pendingWSpackets = {};

  function doPost(o, u) {
    if (_forestCore2.default.isURL(u)) {
      console.log('not posting to peer yet:', u);
    } else {
      var notifyUID = _forestCore2.default.isNotify(u) ? u : o.Remote;
      if (!pendingWSpackets[notifyUID]) pendingWSpackets[notifyUID] = [];
      pendingWSpackets[notifyUID].push(prefixUIDs(o));
      wsFlush(notifyUID);
    }
  }

  function wsInit(config) {
    var wss = new _ws2.default.Server(config);
    wss.on('connection', function (ws) {
      ws.on('message', function (data) {
        var json = JSON.parse(data);
        if (json.notifyUID) {
          console.log('ws init:', json);
          notify2ws[json.notifyUID] = ws;
          ws.send(JSON.stringify({ notifyUID: _forestCore2.default.notifyUID }));
          wsFlush(json.notifyUID);
        } else {
          console.log('ws incoming json:', json);
        }
      });
    });
  }

  function wsFlush(notifyUID) {
    var ws = notify2ws[notifyUID];
    if (!ws) {
      console.log('websocket not found', notifyUID);
      return;
    }
    var packet = void 0;
    while (packet = (pendingWSpackets[notifyUID] || []).shift()) {
      try {
        console.log('<<----------ws---------------\n', notifyUID, '\n', packet, '\n<<---------------------------');
        if (ws.readyState === ws.OPEN) ws.send(packet);else console.log('WebSocket closed sending\n', packet, '\nto', notifyUID);
      } catch (e) {
        console.error('error sending\n', packet, '\nto', notifyUID, '\n', e);
      }
    }
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  // --------------------------------

  var forestdb = void 0;

  function saveObject(o) {
    if (!o.is) return Promise.resolve();
    var collectionName = o.is.constructor === String ? o.is : o.is.constructor === Array ? o.is.join('-') : null;
    if (!collectionName) return Promise.resolve();
    return forestdb.collection(collectionName).update({ UID: o.UID }, o, { upsert: true }).then(function (result) {
      console.log('updated ' + o.UID + ' in ' + collectionName);return result.result;
    }).catch(function (err) {
      console.log(err, 'Failed to insert ' + o.UID + ' in ' + collectionName);return err;
    });
  }

  var toSave = {};

  function persist(o) {
    toSave[_forestCore2.default.toUID(o.UID)] = true;
  }

  function findOneFirst(colls, uid) {
    if (!(colls && colls.length)) return Promise.resolve(null);
    return colls[0].findOne({ UID: uid }).then(function (o) {
      return o || findOneFirst(colls.slice(1), uid);
    });
  }

  function fetch(uid) {
    return forestdb.collections().then(function (colls) {
      return findOneFirst(colls, uid);
    });
  }

  function recache() {
    return forestdb.collections().then(function (colls) {
      return Promise.all(colls.map(function (coll) {
        return coll.find({ Cache: 'keep-active' }).toArray();
      })).then(function (actives) {
        var _ref;

        return (_ref = []).concat.apply(_ref, _toConsumableArray(actives));
      });
    });
  }

  function toMongoProp(key, val) {
    if (val.length === 3 && val[1] === '..') {
      return { $gt: val[0], $lt: val[2] };
    }
    return val;
  }

  function toMongo(scope, match) {
    return Object.assign.apply(Object, [{}].concat(_toConsumableArray(Object.keys(match).map(function (k) {
      return _defineProperty({}, k, toMongoProp(k, match[k]));
    }))));
  }

  function getInlineVals(o, inline) {
    return Object.assign.apply(Object, [{}].concat(_toConsumableArray(inline.map(function (k) {
      return o[k] && _defineProperty({}, k, o[k]);
    })), [{ More: o.UID }]));
  }

  function query(is, scope, query) {
    return forestdb.collection(is.join('-')).find(toMongo(scope, query.match)).toArray().then(function (r) {
      return r.map(function (o) {
        return query.inline ? getInlineVals(o, query.inline) : o.UID;
      });
    }).catch(function (e) {
      return console.error(e);
    });
  }

  function persistenceFlush() {
    return Promise.all(Object.keys(toSave).map(function (uid) {
      return _forestCore2.default.getObject(uid).then(function (o) {
        delete toSave[uid];
        return saveObject(o);
      });
    }));
  }

  function persistenceInit(mongoHostPort, saveInterval) {
    return _mongodb2.default.MongoClient.connect(mongoHostPort).then(function (client) {
      forestdb = client.db('forest');
      setInterval(function () {
        persistenceFlush().then(function (a) {
          return a.length && console.log(a);
        });
      }, saveInterval);
    });
  }

  _forestCore2.default.setPersistence({ persist: persist, fetch: fetch, query: query, recache: recache });

  // --------------------------------

  function init(_ref4) {
    var httpHost = _ref4.httpHost,
        httpPort = _ref4.httpPort,
        wsPort = _ref4.wsPort,
        mongoHostPort = _ref4.mongoHostPort,
        saveInterval = _ref4.saveInterval;

    serverHost = httpHost;serverPort = httpPort;
    return new Promise(function (resolve, reject) {
      persistenceInit(mongoHostPort, saveInterval).then(function () {
        app.listen(httpPort, function () {
          console.log('Server started on port ' + httpPort);
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
    reCacheObjects: _forestCore2.default.reCacheObjects,
    setEvaluator: _forestCore2.default.setEvaluator,
    getObject: _forestCore2.default.getObject,
    spawnObject: _forestCore2.default.spawnObject
  };
  module.exports = exports['default'];
});