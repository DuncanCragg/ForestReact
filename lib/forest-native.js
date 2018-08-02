(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', 'react-native', 'react-dom', 'superagent', 'lodash', 'url-search-params', './forest-core', './forest-common'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('react-native'), require('react-dom'), require('superagent'), require('lodash'), require('url-search-params'), require('./forest-core'), require('./forest-common'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.reactNative, global.reactDom, global.superagent, global.lodash, global.urlSearchParams, global.forestCore, global.forestCommon);
    global.forestNative = mod.exports;
  }
})(this, function (module, exports, _react, _reactNative, _reactDom, _superagent, _lodash, _urlSearchParams, _forestCore, _forestCommon) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _react2 = _interopRequireDefault(_react);

  var _reactDom2 = _interopRequireDefault(_reactDom);

  var _superagent2 = _interopRequireDefault(_superagent);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _urlSearchParams2 = _interopRequireDefault(_urlSearchParams);

  var _forestCore2 = _interopRequireDefault(_forestCore);

  var _forestCommon2 = _interopRequireDefault(_forestCommon);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
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

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  var _get = function get(object, property, receiver) {
    if (object === null) object = Function.prototype;
    var desc = Object.getOwnPropertyDescriptor(object, property);

    if (desc === undefined) {
      var parent = Object.getPrototypeOf(object);

      if (parent === null) {
        return undefined;
      } else {
        return get(parent, property, receiver);
      }
    } else if ("value" in desc) {
      return desc.value;
    } else {
      var getter = desc.get;

      if (getter === undefined) {
        return undefined;
      }

      return getter.call(receiver);
    }
  };

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

  function persist(o) {
    return _reactNative.AsyncStorage.setItem(_forestCore2.default.toUID(o.UID), JSON.stringify(o, null, 2)).then(function () {
      return o.UID + ': ' + [].concat(o.is).join(' ');
    });
  }

  function fetch(uid) {
    return _reactNative.AsyncStorage.getItem(uid).then(function (s) {
      return JSON.parse(s);
    });
  }

  function recache() {
    return _reactNative.AsyncStorage.getAllKeys().then(function (uids) {
      return Promise.all(uids.map(function (uid) {
        return fetch(uid).then(function (o) {
          return o.Cache === 'keep-active' ? o : null;
        });
      })).then(function (actives) {
        return actives.filter(function (o) {
          return o;
        });
      });
    });
  }

  function query(is, scope, query) {}

  _forestCore2.default.setPersistence({ persist: persist, fetch: fetch, query: query, recache: recache });

  var Forest = function (_ForestCommon) {
    _inherits(Forest, _ForestCommon);

    function Forest(props) {
      _classCallCheck(this, Forest);

      var _this = _possibleConstructorReturn(this, (Forest.__proto__ || Object.getPrototypeOf(Forest)).call(this, props));

      _this.viewingCB = null;

      _this.handleOpenURL = function (e) {
        return _this.callViewing(e.url);
      };

      _this.urlRE = /.*?:\/\/.*?\/(.*?)\?(.*)/;
      return _this;
    }

    _createClass(Forest, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        var _this2 = this;

        _get(Forest.prototype.__proto__ || Object.getPrototypeOf(Forest.prototype), 'componentDidMount', this).call(this);
        if (this.viewingCB) {
          if (_reactNative.Platform.OS !== 'ios') {
            _reactNative.Linking.getInitialURL().then(function (url) {
              return _this2.callViewing(url);
            }).catch(function (err) {
              return console.log('unable to get initial URL:', err);
            });
          } else {
            _reactNative.Linking.addEventListener('url', this.handleOpenURL); // what if there's already been an event?
          }
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        _get(Forest.prototype.__proto__ || Object.getPrototypeOf(Forest.prototype), 'componentWillUnmount', this).call(this);
        _reactNative.Linking.removeEventListener('url', this.handleOpenURL);
      }
    }, {
      key: 'callViewing',
      value: function callViewing(url) {
        if (!this.viewingCB) return;
        if (!url) return;
        var m = url.match(this.urlRE);
        if (!m) return;
        var route = m[1];
        var query = m[2];
        this.viewingCB(route, new _urlSearchParams2.default(query));
      }
    }, {
      key: 'setViewing',
      value: function setViewing(v) {
        this.viewingCB = v;
      }
    }, {
      key: 'Button',
      value: function Button(name) {
        var _this3 = this;

        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref$label = _ref.label,
            label = _ref$label === undefined ? '' : _ref$label,
            _ref$className = _ref.className,
            className = _ref$className === undefined ? '' : _ref$className,
            _ref$style = _ref.style,
            style = _ref$style === undefined ? null : _ref$style;

        return _react2.default.createElement(
          _reactNative.TouchableHighlight,
          {
            delayPressIn: 0,
            delayLongPress: 800,
            onPressIn: function onPressIn() {
              return _this3.onChange(name, true);
            },
            onLongPress: function onLongPress() {
              return _this3.onChange(name, true);
            },
            onPressOut: function onPressOut() {
              return _this3.onChange(name, false);
            }
          },
          _react2.default.createElement(
            _reactNative.Text,
            { style: style },
            label
          )
        );
      }
    }], [{
      key: 'dropAll',
      value: function dropAll() {
        return _reactNative.AsyncStorage.getAllKeys().then(function (uids) {
          return console.log('*************** dropping', uids) || _reactNative.AsyncStorage.clear();
        });
      }
    }]);

    return Forest;
  }(_forestCommon2.default);

  exports.default = Forest;
  module.exports = exports['default'];
});