(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'lodash', 'express', 'ws', 'body-parser', 'superagent', 'mongodb', './forest-core', './auth', 'mosca'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('lodash'), require('express'), require('ws'), require('body-parser'), require('superagent'), require('mongodb'), require('./forest-core'), require('./auth'), require('mosca'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.lodash, global.express, global.ws, global.bodyParser, global.superagent, global.mongodb, global.forestCore, global.auth, global.mosca);
    global.forestServer = mod.exports;
  }
})(this, function (module, exports, _lodash, _express, _ws, _bodyParser, _superagent, _mongodb, _forestCore, _auth, _mosca) {
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

  var _mosca2 = _interopRequireDefault(_mosca);

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

  var serverProt = null;
  var serverHost = null;
  var serverPort = 0;

  // --------------------------------

  function safeParse(s) {
    try {
      return JSON.parse(s);
    } catch (e) {
      console.log('incoming data corrupt:', s, e.message);
      return {};
    }
  }

  // --------------------------------

  var logRequest = function logRequest(req, res, next) {
    console.log('------------http------------>', new Date().toISOString());
    if (req.method === 'POST') console.log(req.method, req.originalUrl, req.body && req.body.Notify + ' ' + req.body.UID, req.headers.authorization || '');else console.log(req.method, req.originalUrl, req.headers.authorization || '');
    next();
  };

  var logResponse = function logResponse(req, res, next) {
    console.log(res.statusCode);
    console.log('<-----------http-------------');
    next();
  };

  var logMQTTPublish = function logMQTTPublish(notifying, body) {
    console.log('------------mqtt------------>', new Date().toISOString());
    console.log('Publish', notifying, body.UID, body.Peer, body.User);
  };

  var logMQTTResult = function logMQTTResult(ok) {
    console.log(ok ? 'OK' : 'FAIL');
    console.log('<-----------mqtt-------------');
  };

  var CORS = function CORS(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'); // Accept, X-Requested-By, Origin, Cache-Control
    next();
  };

  // --------------------------------

  var pendingNotifies = {};

  function toURL(uid) {
    var urlselect = {
      http: 'http://' + serverHost + ':' + serverPort + '/' + uid,
      https: 'https://' + serverHost + '/' + uid
    };
    return urlselect[serverProt];
  }

  function prefixUIDs(o) {
    var s = _forestCore2.default.stringify(_lodash2.default.omit(o, _forestCore2.default.localProps));
    var urlselect = {
      http: '"http://' + serverHost + ':' + serverPort + '/$1',
      https: '"https://' + serverHost + '/$1'
    };
    return s.replace(/"(uid-[^"]*"[^:])/g, urlselect[serverProt]);
  }

  function checkPKAndReturnObject(Peer, uid, r) {
    if (!r.pk || r.pk === 'FAIL') return null;
    if (r.pk === 'OK' || _auth2.default.checkSig(r.pk)) {
      return _forestCore2.default.getObject(uid).then(function (o) {
        if (Peer) _forestCore2.default.setNotify(o, Peer);
        return o;
      });
    }
    return null;
    // TODO: delete r
  }

  function checkPKAndSaveObject(User, Peer, body, setnotify, r) {
    if (!r.pk || r.pk === 'FAIL') return false;
    if (r.pk === 'OK' || _auth2.default.checkSig(r.pk)) {
      _forestCore2.default.incomingObject(Object.assign({ User: User }, Peer && { Peer: Peer }, body), setnotify);
      return true;
    }
    return false;
    // TODO: delete r
  }

  // ---- HTTP ----------------------

  var app = (0, _express2.default)();

  app.use(_bodyParser2.default.json());

  app.options("/*", logRequest, CORS, function (req, res, next) {
    res.sendStatus(200);
  }, logResponse);

  app.get('/*', logRequest, CORS, function (req, res, next) {
    var _auth$getPeerUser = _auth2.default.getPeerUser(req),
        Peer = _auth$getPeerUser.Peer,
        User = _auth$getPeerUser.User;

    var uid = req.originalUrl.substring(1);
    var rc = _forestCore2.default.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      direction: 'Observe',
      uid: uid
    });
    _forestCore2.default.runEvaluator(rc).then(function (r) {
      if (r.pk) return checkPKAndReturnObject(Peer, uid, r);
      return new Promise(function (resolve) {
        return setTimeout(function () {
          return _forestCore2.default.getObject(rc).then(function (r) {
            return resolve(checkPKAndReturnObject(Peer, uid, r));
          });
        }, 500);
      });
    }).then(function (o) {
      if (o) res.json(JSON.parse(prefixUIDs(o)));else res.status(404).send('Not found');
    }).then(function () {
      return next();
    }).catch(function (e) {
      console.log(e.message);
      res.status(404).send('Not found');
      next();
    });
  }, logResponse);

  app.post('/*', logRequest, CORS, function (req, res, next) {
    var body = req.body;
    if (!body || !body.UID) next();

    var _auth$getPeerUser2 = _auth2.default.getPeerUser(req),
        Peer = _auth$getPeerUser2.Peer,
        User = _auth$getPeerUser2.User;

    var path = req.originalUrl.substring(1);
    var setnotify = path !== 'notify' && path || '';
    var n = _lodash2.default.uniq(_forestCore2.default.listify(setnotify, body.Notify));
    var notifying = n.length === 1 && n[0] || n;
    var rc = _forestCore2.default.spawnTemporaryObject({
      Evaluator: 'evalRequestChecker',
      is: ['request', 'checker'],
      user: User,
      peer: Peer,
      direction: 'Notify',
      uid: body.UID,
      notifying: notifying,
      body: body
    });
    _forestCore2.default.runEvaluator(rc).then(function (r) {
      if (r.pk) return checkPKAndSaveObject(User, Peer, body, setnotify, r);
      return new Promise(function (resolve) {
        return setTimeout(function () {
          return _forestCore2.default.getObject(rc).then(function (r) {
            return resolve(checkPKAndSaveObject(User, Peer, body, setnotify, r));
          });
        }, 500);
      });
    }).then(function (ok) {
      return ok ? res.json({}) : res.status(403).send('Forbidden');
    }).then(function () {
      return next();
    }).catch(function (e) {
      console.log(e.message);
      res.status(403).send('Forbidden');
      next();
    });
  }, logResponse);

  // ---- WebSockets ----------------

  var peer2ws = {};

  function wsInit(config) {
    var wss = new _ws2.default.Server(config);
    wss.on('connection', function (ws) {
      ws.on('message', function (data) {
        var body = safeParse(data);
        if (body.is === 'websocket-init') {
          console.log('websocket init:', body);
          peer2ws[body.Peer] = ws;
          ws.send(_auth2.default.makeWSAuth());
          wsFlushNotify(body.Peer);
        } else {
          console.log('ws incoming:', body);
        }
      });
    });
  }

  function wsFlushNotify(Peer) {
    var ws = peer2ws[Peer];
    var o = void 0;
    while (o = (pendingNotifies[Peer] || []).shift()) {
      try {
        console.log('<<----------ws---------------', Peer);
        if (ws.readyState === ws.OPEN) ws.send(o);else console.log('WebSocket closed sending\n', o, '\nto', Peer);
      } catch (e) {
        console.log('error sending\n', o, '\nto', Peer, '\n', e.message);
      }
    }
  }

  // ---- MQTT ----------------------

  var mqtts = null;

  var peer2mqtt = {};

  function mqttInit(config) {

    mqtts = new _mosca2.default.Server(config);

    var authenticate = function authenticate(client, username, password, cb) {
      var ok = true;
      cb(null, ok);
    };

    mqtts.on('ready', function () {
      mqtts.authenticate = authenticate;
      console.log('MQTT running on ' + (config.secure ? 'secure ' : '') + 'port', config.secure && config.secure.port || config.port);
    });

    mqtts.on('clientConnected', function (client) {});

    mqtts.on('subscribed', function (topic, client) {});

    mqtts.on('published', function (_ref, client) {
      var topic = _ref.topic,
          payload = _ref.payload;

      if (topic.startsWith('$')) return;
      if (topic.startsWith('peer-')) return;
      var body = safeParse(payload.toString());
      if (!body || !body.UID) return;
      var Peer = body.Peer,
          User = body.User;

      var setnotify = topic !== 'notify' && topic || '';
      var n = _lodash2.default.uniq(_forestCore2.default.listify(setnotify, body.Notify));
      var notifying = n.length === 1 && n[0] || n;
      logMQTTPublish(notifying, body);
      var rc = _forestCore2.default.spawnTemporaryObject({
        Evaluator: 'evalRequestChecker',
        is: ['request', 'checker'],
        user: User,
        peer: Peer,
        direction: 'Notify',
        uid: body.UID,
        notifying: notifying,
        body: body
      });
      _forestCore2.default.runEvaluator(rc).then(function (r) {
        if (r.pk) return checkPKAndSaveObject(User, Peer, body, setnotify, r);
        return new Promise(function (resolve) {
          return setTimeout(function () {
            return _forestCore2.default.getObject(rc).then(function (r) {
              return resolve(checkPKAndSaveObject(User, Peer, body, setnotify, r));
            });
          }, 500);
        });
      }).then(function (ok) {
        peer2mqtt[Peer] = ok;
        mqttFlushNotify(Peer);
        logMQTTResult(ok);
      }).catch(function (e) {
        console.log(e.message);
      });
    });
  }

  function mqttFlushNotify(Peer) {
    var o = void 0;
    while (o = (pendingNotifies[Peer] || []).shift()) {
      var packet = {
        topic: Peer,
        payload: o,
        qos: 1,
        retain: false
      };
      try {
        mqtts.publish(packet, function () {
          console.log('<<----------mqtt-------------', Peer);
        });
      } catch (e) {
        console.log('error sending\n', o, '\nto', Peer, '\n', e.message);
      }
    }
  }

  // --------------------------------

  function doGet(url) {
    return _superagent2.default.get(url).timeout({ response: 9000, deadline: 10000 }).set(_auth2.default.makeHTTPAuth()).then(function (x) {
      return x.body;
    });
  }

  function doPost(o, u) {
    if (_forestCore2.default.isURL(u)) return Promise.resolve(false);
    var Peer = _forestCore2.default.isPeer(u) ? u : o.Peer;
    if (!pendingNotifies[Peer]) pendingNotifies[Peer] = [];
    pendingNotifies[Peer].push(prefixUIDs(o));
    if (peer2ws[Peer]) wsFlushNotify(Peer);else if (peer2mqtt[Peer]) mqttFlushNotify(Peer);
    return Promise.resolve(true);
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  // ---- Mongo ---------------------

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
    }).catch(function (e) {
      console.log(e.message, 'Failed to insert ' + o.UID + ' in ' + collectionName);return e;
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
        var _ref2;

        return (_ref2 = []).concat.apply(_ref2, _toConsumableArray(actives));
      });
    });
  }

  function query(scope, query) {
    return forestdb.collection(query.match.is.join('-')).find(toMongo(scope, query.match), { projection: { _id: 0 } }).toArray().then(function (r) {
      return r.map(function (o) {
        return query.inline ? getInlineVals(o, query.inline) : o.UID;
      });
    }).catch(function (e) {
      return console.log(e.message);
    });
  }

  function toMongo(scope, match) {
    var r = Object.assign.apply(Object, [{}].concat(_toConsumableArray(Object.keys(match).map(function (k) {
      return _defineProperty({}, k, toMongoProp(k, match[k]));
    }))));
    if (_forestCore2.default.log.persist) console.log('toMongo:', r);
    return r;
  }

  function toMongoProp(key, val) {
    if (key === 'is') return _forestCore2.default.delistify(val);
    if (_forestCore2.default.isURL(val)) {
      return { $in: [val, _forestCore2.default.toUID(val)] };
    }
    if (_forestCore2.default.isUID(val)) {
      return { $in: [val, toURL(val)] };
    }
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

  function dropAll(actually) {
    return forestdb.collections().then(function (colls) {
      return Promise.all(colls.map(function (coll) {
        return coll.stats().then(function (s) {
          if (!/system.indexes/.test(s.ns)) {
            console.log(actually ? '*************** dropping' : '(not dropping)', s.ns, s.count);
            return actually && coll.drop();
          }
        });
      }));
    });
  }

  _forestCore2.default.setPersistence({ persist: persist, fetch: fetch, recache: recache, query: query });

  // --------------------------------

  function init(_ref5) {
    var httpProt = _ref5.httpProt,
        httpHost = _ref5.httpHost,
        httpPort = _ref5.httpPort,
        mongoHostPort = _ref5.mongoHostPort,
        wsPort = _ref5.wsPort,
        mqttConfig = _ref5.mqttConfig;

    serverProt = httpProt;serverHost = httpHost;serverPort = httpPort;
    return new Promise(function (resolve, reject) {
      persistenceInit(mongoHostPort).then(function () {
        app.listen(httpPort, function () {
          console.log('Server started on port ' + httpPort);
          if (wsPort) wsInit({ port: wsPort });
          if (mqttConfig) mqttInit(mqttConfig);
          resolve();
        }).on('error', function (e) {
          return reject(e);
        });
      }).catch(function (e) {
        return reject(e);
      });
    });
  }

  exports.default = {
    init: init,
    dropAll: dropAll,
    cacheObjects: _forestCore2.default.cacheObjects,
    reCacheObjects: _forestCore2.default.reCacheObjects,
    setEvaluator: _forestCore2.default.setEvaluator,
    runEvaluator: _forestCore2.default.runEvaluator,
    getObject: _forestCore2.default.getObject,
    spawnObject: _forestCore2.default.spawnObject,
    updateObject: _forestCore2.default.updateObject,
    makeUID: _forestCore2.default.makeUID,
    listify: _forestCore2.default.listify,
    setLogging: _forestCore2.default.setLogging,
    setPeerIdentityUser: _auth2.default.setPeerIdentityUser
  };
  module.exports = exports['default'];
});