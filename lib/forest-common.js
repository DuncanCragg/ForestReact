(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'react', 'react-dom', 'superagent', 'lodash', './forest-core', './auth'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('react'), require('react-dom'), require('superagent'), require('lodash'), require('./forest-core'), require('./auth'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.react, global.reactDom, global.superagent, global.lodash, global.forestCore, global.auth);
    global.forestCommon = mod.exports;
  }
})(this, function (exports, _react, _reactDom, _superagent, _lodash, _forestCore, _auth) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = exports.ForestWidget = exports.ForestCommon = undefined;

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

  var _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

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
    });
  }

  _forestCore2.default.setNetwork({ doGet: doGet, doPost: doPost });

  var Context = _react2.default.createContext && _react2.default.createContext({
    onChange: function onChange() {
      return null;
    },
    onRead: function onRead() {
      return null;
    },
    object: function object() {
      return null;
    }
  });

  var Provider = function Provider(props) {
    return _react2.default.createElement(
      Context.Provider,
      { value: props.forestProps },
      props.children
    );
  };

  var ForestCommon = function (_Component) {
    _inherits(ForestCommon, _Component);

    _createClass(ForestCommon, null, [{
      key: 'setLogging',
      value: function setLogging(conf) {
        return _forestCore2.default.setLogging(conf);
      }
    }, {
      key: 'wsInit',
      value: function wsInit(prot, host, port) {
        var _this2 = this;

        var urlselect = { http: 'ws://' + host + ':' + port + '/sockets',
          https: 'wss://' + host + '/sockets' };
        var ws = new WebSocket(urlselect[prot]);

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
            _this2.wsInit(prot, host, port);
          }, timeout);
        };

        ws.onmessage = function (message) {
          var json = JSON.parse(message.data);
          if (json.is === 'websocket-init') {
            console.log('websocket init:', json);
            ws.Peer = json.Peer;
          } else if (json.UID) {
            console.log('------------ws------------->>', ws.Peer);
            _forestCore2.default.incomingObject(json);
          }
        };

        ws.onerror = function (e) {
          console.log('websocket error', e.message);
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
          _reactDom2.default.render(Cpt, document.getElementById(rootId), function (e) {
            return e ? reject(e) : resolve();
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
      key: 'updateObject',
      value: function updateObject(uid, update) {
        return _forestCore2.default.updateObject(uid, update);
      }
    }, {
      key: 'makeUID',
      value: function makeUID(peer) {
        return _forestCore2.default.makeUID(peer);
      }
    }, {
      key: 'toUID',
      value: function toUID(uid) {
        return _forestCore2.default.toUID(uid);
      }
    }, {
      key: 'listify',
      value: function listify() {
        return _forestCore2.default.listify.apply(_forestCore2.default, arguments);
      }
    }, {
      key: 'setPeerIdentityUser',
      value: function setPeerIdentityUser(pi) {
        return _auth2.default.setPeerIdentityUser(pi);
      }
    }, {
      key: 'connect',
      value: function connect(Component) {
        var Consumer = function Consumer(props) {
          return _react2.default.createElement(
            Context.Consumer,
            null,
            function (_ref) {
              var onChange = _ref.onChange,
                  onRead = _ref.onRead,
                  object = _ref.object;
              return _react2.default.createElement(Component, _extends({ onChange: onChange, onRead: onRead, object: object }, props));
            }
          );
        };
        return Consumer;
      }
    }]);

    function ForestCommon(props) {
      _classCallCheck(this, ForestCommon);

      var _this = _possibleConstructorReturn(this, (ForestCommon.__proto__ || Object.getPrototypeOf(ForestCommon)).call(this, props));

      _this.mounted = false;
      _this.KEY_ENTER = 13;

      _forestCore2.default.getObject(props.uid).then(function (o) {
        if (!o) {
          console.log('No bound object', props.uid);return;
        }
        _this.state = o;
        _this.UID = props.uid;
        _this.userStateUID = _forestCore2.default.spawnObject({ 'is': ['user', 'state'] });
        _this.state['user-state'] = _this.userStateUID; // hardwiring from obj to react
        _this.object = _this.object.bind(_this);
        _this.notify = _this.notify.bind(_this);
        _this.onChange = _this.onChange.bind(_this);
        _this.getProvider = _this.getProvider.bind(_this);
        _this.Provider = _this.getProvider();
        _this.state.ReactNotify = _this.notify; // hardwiring from obj to react
        _forestCore2.default.runEvaluator(_this.UID);
        _this.notify();
      });
      return _this;
    }

    _createClass(ForestCommon, [{
      key: 'getProvider',
      value: function getProvider() {
        Provider.defaultProps = {
          forestProps: {
            object: this.object,
            onRead: this.onRead,
            onChange: this.onChange }
        };
        return Provider;
      }
    }, {
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

  var ForestWidget = function (_Component2) {
    _inherits(ForestWidget, _Component2);

    function ForestWidget() {
      var _ref2;

      var _temp, _this3, _ret;

      _classCallCheck(this, ForestWidget);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this3 = _possibleConstructorReturn(this, (_ref2 = ForestWidget.__proto__ || Object.getPrototypeOf(ForestWidget)).call.apply(_ref2, [this].concat(args))), _this3), _this3.onChange = function (value) {
        return _this3.props.onChange(_this3.props.name, value);
      }, _this3.getWebButtonProps = function () {
        return {
          onMouseDown: function onMouseDown() {
            return _this3.onChange(true);
          },
          onMouseUp: function onMouseUp() {
            return _this3.onChange(false);
          },
          onClick: function onClick() {
            _this3.props.onChange(_this3.props.name + '-clicked', true);
            setTimeout(function () {
              _this3.props.onChange(_this3.props.name + '-clicked', false);
            }, 250);
          }
        };
      }, _this3.getAndroidButtonProps = function () {
        return {
          onPressIn: function onPressIn() {
            return _this3.onChange(true);
          },
          onPressOut: function onPressOut() {
            return _this3.onChange(false);
          },
          onPress: function onPress() {
            _this3.props.onChange(_this3.props.name + '-clicked', true);
            setTimeout(function () {
              _this3.props.onChange(_this3.props.name + '-clicked', false);
            }, 250);
          },
          onLongPress: function onLongPress() {
            _this3.props.onChange(_this3.props.name + '-held', true);
            setTimeout(function () {
              _this3.props.onChange(_this3.props.name + '-held', false);
            }, 250);
          }
        };
      }, _this3.getAllProps = function () {
        return {
          getWebButtonProps: _this3.getWebButtonProps,
          getAndroidButtonProps: _this3.getAndroidButtonProps
        };
      }, _temp), _possibleConstructorReturn(_this3, _ret);
    }

    _createClass(ForestWidget, [{
      key: 'render',
      value: function render() {
        return this.props.children(this.getAllProps());
      }
    }]);

    return ForestWidget;
  }(_react.Component);

  exports.ForestCommon = ForestCommon;
  exports.ForestWidget = ForestWidget;
  exports.default = ForestCommon;
});