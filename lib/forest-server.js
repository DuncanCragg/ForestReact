(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'lodash', 'express', 'ws', 'body-parser', 'superagent', 'mongodb', './forest-core', './auth'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('lodash'), require('express'), require('ws'), require('body-parser'), require('superagent'), require('mongodb'), require('./forest-core'), require('./auth'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.lodash, global.express, global.ws, global.bodyParser, global.superagent, global.mongodb, global.forestCore, global.auth);
    global.forestServer = mod.exports;
  }
})(this, function (module, exports, _lodash, _express, _ws, _bodyParser, _superagent, _mongodb, _forestCore, _auth) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _lodash2 = _interopRequireDefault(_lodash);

  var _express2 = _interopRequireDefault(_express);

  var _ws2 = _interopRequireDefault(_ws);

  var _bodyParser2 = _interopRequireDefault(_bodyParser);

  var _superagent2 = _interopRequireDefault(_superagent);

  var _mongodb2 = _interopRequireDefault(_mongodb);

  var _forestCore2 = _interopRequireDefault(_forestCore);

  var _auth2 = _interopRequireDefault(_auth);

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
    if (req.method === 'POST') console.log(req.method, req.originalUrl, req.body && req.body.UID, req.headers.authorization || '');else console.log(req.method, req.originalUrl, req.headers.authorization || '');
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
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'); // Accept, X-Requested-By, Origin, Cache-Control
    next();
  };

  var app = (0, _express2.default)();

  app.use(_bodyParser2.default.json());

  app.options("/*", logRequest, CORS, function (req, res, next) {
    res.sendStatus(200);
  }, logResponse);

  function prefixUIDs(o) {
    var s = JSON.stringify(_lodash2.default.omit(o, _forestCore2.default.localProps), null, 2);
    return s.replace(/"(uid-[^"]*"[^:])/g, '"http://' + serverHost + ':' + serverPort + '/$1');
  }

  function checkPKAndReturnObject(Peer, uid, res, r) {
    if (!r.PK || r.PK === 'FAIL') {
      res.status(404).send('Not found');
    } else if (r.PK === 'OK' || _auth2.default.checkSig(r.PK)) {
      // TODO: delete r
      return _forestCore2.default.getObject(uid).then(function (o) {
        res.json(JSON.parse(prefixUIDs(o)));
        if (Peer) _forestCore2.default.setNotify(o, Peer);
      });
    } else {
      res.status(404).send('Not found');
    }
    // TODO: delete r
  }

  app.get('/*', logRequest, CORS, function (req, res, next) {
    var _auth$getPeerUser = _auth2.default.getPeerUser(req),
        Peer = _auth$getPeerUser.Peer,
        _auth$getPeerUser$Use = _auth$getPeerUser.User,
        User = _auth$getPeerUser$Use === undefined ? 'no-user' : _auth$getPeerUser$Use;

    var uid = req.originalUrl.substring(1);
    var rc = _forestCore2.default.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      method: 'GET',
      url: uid
    });
    _forestCore2.default.runEvaluator(rc).then(function (r) {
      if (r.PK) return checkPKAndReturnObject(Peer, uid, res, r);
      return new Promise(function (resolve) {
        return setTimeout(function () {
          return _forestCore2.default.getObject(rc).then(function (r) {
            return resolve(checkPKAndReturnObject(Peer, uid, res, r));
          });
        }, 500);
      });
    }).then(function () {
      return next();
    }).catch(function (e) {
      console.error(e);
      res.status(404).send('Not found');
      next();
    });
  }, logResponse);

  function checkPKAndSaveObject(User, Peer, json, path, res, r) {
    if (!r.PK || r.PK === 'FAIL') {
      res.status(403).send('Forbidden');
    } else if (r.PK === 'OK' || _auth2.default.checkSig(r.PK)) {
      _forestCore2.default.incomingObject(Object.assign({ User: User }, Peer && { Peer: Peer }, json), path !== 'notify' && path);
      res.json({});
    } else {
      res.status(403).send('Forbidden');
    }
    // TODO: delete r
  }

  app.post('/*', logRequest, CORS, function (req, res, next) {
    var json = req.body;
    if (!json || !json.UID) next();

    var _auth$getPeerUser2 = _auth2.default.getPeerUser(req),
        Peer = _auth$getPeerUser2.Peer,
        _auth$getPeerUser2$Us = _auth$getPeerUser2.User,
        User = _auth$getPeerUser2$Us === undefined ? 'no-user' : _auth$getPeerUser2$Us;

    var path = req.originalUrl.substring(1);
    var rc = _forestCore2.default.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      method: 'POST',
      url: json.UID
    });
    _forestCore2.default.runEvaluator(rc).then(function (r) {
      if (r.PK) return checkPKAndSaveObject(User, Peer, json, path, res, r);
      return new Promise(function (resolve) {
        return setTimeout(function () {
          return _forestCore2.default.getObject(rc).then(function (r) {
            return resolve(checkPKAndSaveObject(User, Peer, json, path, res, r));
          });
        }, 500);
      });
    }).then(function () {
      return next();
    }).catch(function (e) {
      console.error(e);
      res.status(403).send('Forbidden');
      next();
    });
  }, logResponse);

  function doGet(url) {
    return _superagent2.default.get(url).timeout({ response: 9000, deadline: 10000 }).set(_auth2.default.makeHTTPAuth()).then(function (x) {
      return x.body;
    });
  }

  var pendingWSpackets = {};

  function doPost(o, u) {
    if (_forestCore2.default.isURL(u)) return Promise.resolve(false);
    var Peer = _forestCore2.default.isNotify(u) ? u : o.Peer;
    if (!pendingWSpackets[Peer]) pendingWSpackets[Peer] = [];
    pendingWSpackets[Peer].push(prefixUIDs(o));
    wsFlush(Peer);
    return Promise.resolve(true);
  }

  var peer2ws = {};

  function wsInit(config) {
    var wss = new _ws2.default.Server(config);
    wss.on('connection', function (ws) {
      ws.on('message', function (data) {
        var json = JSON.parse(data);
        if (json.Peer) {
          console.log('ws init:', json);
          peer2ws[json.Peer] = ws;
          ws.send(_auth2.default.makeWSAuth());
          wsFlush(json.Peer);
        } else {
          console.log('ws incoming json:', json);
        }
      });
    });
  }

  function wsFlush(Peer) {
    var ws = peer2ws[Peer];
    if (!ws) {
      console.log('websocket not found', Peer);
      return;
    }
    var packet = void 0;
    while (packet = (pendingWSpackets[Peer] || []).shift()) {
      try {
        console.log('<<----------ws---------------', Peer);
        if (ws.readyState === ws.OPEN) ws.send(packet);else console.log('WebSocket closed sending\n', packet, '\nto', Peer);
      } catch (e) {
        console.error('error sending\n', packet, '\nto', Peer, '\n', e);
      }
    }
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  // --------------------------------

  var forestdb = void 0;

  function persistenceInit(mongoHostPort) {
    return _mongodb2.default.MongoClient.connect(mongoHostPort).then(function (client) {
      forestdb = client.db('forest');
    });
  }

  function persist(o) {
    if (!o.is) return Promise.resolve();
    var collectionName = o.is.constructor === String ? o.is : o.is.constructor === Array ? o.is.join('-') : null;
    if (!collectionName) return Promise.resolve();
    return forestdb.collection(collectionName).update({ UID: o.UID }, o, { upsert: true }).then(function (result) {
      return result.result;
    }).catch(function (err) {
      console.log(err, 'Failed to insert ' + o.UID + ' in ' + collectionName);return err;
    });
  }

  function fetch(uid) {
    return forestdb.collections().then(function (colls) {
      return findOneFirst(colls, uid);
    });
  }

  function findOneFirst(colls, uid) {
    if (!(colls && colls.length)) return Promise.resolve(null);
    return colls[0].findOne({ UID: uid }, { projection: { _id: 0 } }).then(function (o) {
      return o || findOneFirst(colls.slice(1), uid);
    });
  }

  function recache() {
    return forestdb.collections().then(function (colls) {
      return Promise.all(colls.map(function (coll) {
        return coll.find({ Cache: 'keep-active' }, { projection: { _id: 0 } }).toArray();
      })).then(function (actives) {
        var _ref;

        return (_ref = []).concat.apply(_ref, _toConsumableArray(actives));
      });
    });
  }

  function query(is, scope, query) {
    return forestdb.collection(is.join('-')).find(toMongo(scope, query.match), { projection: { _id: 0 } }).toArray().then(function (r) {
      return r.map(function (o) {
        return query.inline ? getInlineVals(o, query.inline) : o.UID;
      });
    }).catch(function (e) {
      return console.error(e);
    });
  }

  function toMongo(scope, match) {
    return Object.assign.apply(Object, [{}].concat(_toConsumableArray(Object.keys(match).map(function (k) {
      return _defineProperty({}, k, toMongoProp(k, match[k]));
    }))));
  }

  function toMongoProp(key, val) {
    if (val.length === 3 && val[1] === '..') {
      return { $gt: val[0], $lt: val[2] };
    }
    return val;
  }

  function getInlineVals(o, inline) {
    return Object.assign.apply(Object, [{}].concat(_toConsumableArray(inline.map(function (k) {
      return o[k] && _defineProperty({}, k, o[k]);
    })), [{ More: o.UID }]));
  }

  function dropAll() {
    return forestdb.collections().then(function (colls) {
      return colls.map(function (coll) {
        return coll.stats().then(function (s) {
          if (!/system.indexes/.test(s.ns)) {
            console.log('dropping', s.ns, s.count);
            coll.drop();
          }
        });
      });
    });
  }

  _forestCore2.default.setPersistence({ persist: persist, fetch: fetch, recache: recache, query: query });

  // --------------------------------

  function init(_ref4) {
    var httpHost = _ref4.httpHost,
        httpPort = _ref4.httpPort,
        wsPort = _ref4.wsPort,
        mongoHostPort = _ref4.mongoHostPort;

    serverHost = httpHost;serverPort = httpPort;
    return new Promise(function (resolve, reject) {
      persistenceInit(mongoHostPort).then(function () {
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
    dropAll: dropAll,
    cacheObjects: _forestCore2.default.cacheObjects,
    reCacheObjects: _forestCore2.default.reCacheObjects,
    setEvaluator: _forestCore2.default.setEvaluator,
    getObject: _forestCore2.default.getObject,
    spawnObject: _forestCore2.default.spawnObject,
    makeUID: _forestCore2.default.makeUID,
    setLogging: _forestCore2.default.setLogging,
    setPeerIdentityUser: _auth2.default.setPeerIdentityUser
  };
  module.exports = exports['default'];
});