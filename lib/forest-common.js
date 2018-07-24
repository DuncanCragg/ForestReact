(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', 'react-dom', 'superagent', 'lodash', './forest-core', './auth'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('react-dom'), require('superagent'), require('lodash'), require('./forest-core'), require('./auth'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.reactDom, global.superagent, global.lodash, global.forestCore, global.auth);
    global.forestCommon = mod.exports;
  }
})(this, function (module, exports, _react, _reactDom, _superagent, _lodash, _forestCore, _auth) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _react2 = _interopRequireDefault(_react);

  var _reactDom2 = _interopRequireDefault(_reactDom);

  var _superagent2 = _interopRequireDefault(_superagent);

  var _lodash2 = _interopRequireDefault(_lodash);

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

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  function doGet(url) {
    return _superagent2.default.get(url).timeout({ response: 9000, deadline: 10000 }).set(_auth2.default.makeHTTPAuth()).then(function (x) {
      return x.body;
    });
  }

  function doPost(o, url) {
    if (!_forestCore2.default.isURL(url)) return Promise.resolve(false);
    var data = _lodash2.default.omit(o, _forestCore2.default.localProps);
    return _superagent2.default.post(url).timeout({ response: 9000, deadline: 10000 }).set(_auth2.default.makeHTTPAuth()).send(data).then(function (x) {
      return x.body;
    }).catch(function (e) {
      return console.error('doPost', e, url, data);
    });
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  var ForestCommon = function (_Component) {
    _inherits(ForestCommon, _Component);

    _createClass(ForestCommon, null, [{
      key: 'setLogging',
      value: function setLogging(conf) {
        return _forestCore2.default.setLogging(conf);
      }
    }, {
      key: 'wsInit',
      value: function wsInit(host, port) {
        var _this2 = this;

        var ws = new WebSocket('ws://' + host + ':' + port);

        ws.onopen = function () {
          _this2.wsRetryIn = 1000;
          _this2.wsRetryDither = Math.floor(Math.random() * 5000);
          ws.send(_auth2.default.makeWSAuth());
        };

        ws.onclose = function () {
          var timeout = _this2.wsRetryIn + _this2.wsRetryDither;
          _this2.wsRetryDither = 0;
          console.log('WebSocket closed, retry in.. ', timeout / 1000);
          setTimeout(function () {
            _this2.wsRetryIn = Math.min(Math.floor(_this2.wsRetryIn * 1.5), 15000);
            _this2.wsInit(host, port);
          }, timeout);
        };

        ws.onmessage = function (message) {
          var json = JSON.parse(message.data);
          if (json.Peer) {
            console.log('ws init:', json);
            ws.Peer = json.Peer;
          } else if (json.UID) {
            console.log('------------ws------------->>', ws.Peer);
            _forestCore2.default.incomingObject(json);
          }
        };

        ws.onerror = function (e) {
          console.log('websocket error', e);
        };
      }
    }, {
      key: 'cacheObjects',
      value: function cacheObjects(list) {
        return _forestCore2.default.cacheObjects(list);
      }
    }, {
      key: 'reCacheObjects',
      value: function reCacheObjects() {
        return _forestCore2.default.reCacheObjects();
      }
    }, {
      key: 'renderDOM',
      value: function renderDOM(Cpt) {
        var rootId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'root';

        return new Promise(function (resolve, reject) {
          _reactDom2.default.render(Cpt, document.getElementById(rootId), function (err) {
            return err ? reject(err) : resolve();
          });
        });
      }
    }, {
      key: 'spawnObject',
      value: function spawnObject(o) {
        return _forestCore2.default.spawnObject(o);
      }
    }, {
      key: 'setEvaluator',
      value: function setEvaluator(name, evaluator) {
        return _forestCore2.default.setEvaluator(name, evaluator);
      }
    }, {
      key: 'runEvaluator',
      value: function runEvaluator(uid, params) {
        return _forestCore2.default.runEvaluator(uid, params);
      }
    }, {
      key: 'getObject',
      value: function getObject(uid) {
        return _forestCore2.default.getObject(uid);
      }
    }, {
      key: 'makeUID',
      value: function makeUID(rem) {
        return _forestCore2.default.makeUID(rem);
      }
    }, {
      key: 'setPeerIdentityUser',
      value: function setPeerIdentityUser(pi) {
        return _auth2.default.setPeerIdentityUser(pi);
      }
    }]);

    function ForestCommon(props) {
      _classCallCheck(this, ForestCommon);

      var _this = _possibleConstructorReturn(this, (ForestCommon.__proto__ || Object.getPrototypeOf(ForestCommon)).call(this, props));

      _this.mounted = false;
      _this.KEY_ENTER = 13;

      _forestCore2.default.getObject(props.uid).then(function (o) {
        _this.state = o;
        _this.UID = props.uid;
        _this.userStateUID = _forestCore2.default.spawnObject({ 'is': ['user', 'state'] });
        _this.state.userState = _this.userStateUID; // hardwiring from obj to react
        _this.object = _this.object.bind(_this);
        _this.notify = _this.notify.bind(_this);
        _this.state.ReactNotify = _this.notify; // hardwiring from obj to react
        _forestCore2.default.runEvaluator(_this.UID);
        _this.notify();
      });
      return _this;
    }

    _createClass(ForestCommon, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        this.mounted = true;
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        this.mounted = false;
      }
    }, {
      key: 'object',
      value: function object(path, match) {
        return _forestCore2.default.object(this.UID, path, match);
      }
    }, {
      key: 'notify',
      value: function notify() {
        if (this.mounted) this.setState({});
      }
    }, {
      key: 'onRead',
      value: function onRead(name) {
        var value = this.object(name);
        _forestCore2.default.updateObject(this.userStateUID, _defineProperty({}, name, value));
        return value;
      }
    }, {
      key: 'onChange',
      value: function onChange(name, value) {
        _forestCore2.default.updateObject(this.userStateUID, _defineProperty({}, name, value));
      }
    }, {
      key: 'onKeyDown',
      value: function onKeyDown(name, e) {
        if (e.keyCode !== this.KEY_ENTER) {
          _forestCore2.default.updateObject(this.userStateUID, _defineProperty({}, name + '-submitted', false));
          return;
        }
        _forestCore2.default.updateObject(this.userStateUID, _defineProperty({}, name + '-submitted', true));
        e.preventDefault();
      }
    }]);

    return ForestCommon;
  }(_react.Component);

  ForestCommon.wsRetryIn = 1000;
  ForestCommon.wsRetryDither = Math.floor(Math.random() * 5000);
  exports.default = ForestCommon;
  module.exports = exports['default'];
});