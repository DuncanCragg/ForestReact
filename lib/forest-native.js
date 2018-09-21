(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'react', 'react-native', 'react-dom', 'superagent', 'lodash', 'url-search-params', './forest-core', './forest-common'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('react'), require('react-native'), require('react-dom'), require('superagent'), require('lodash'), require('url-search-params'), require('./forest-core'), require('./forest-common'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.react, global.reactNative, global.reactDom, global.superagent, global.lodash, global.urlSearchParams, global.forestCore, global.forestCommon);
    global.forestNative = mod.exports;
  }
})(this, function (exports, _react, _reactNative, _reactDom, _superagent, _lodash, _urlSearchParams, _forestCore, _forestCommon) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = exports.ForestWidget = exports.Forest = undefined;

  var _react2 = _interopRequireDefault(_react);

  var _reactDom2 = _interopRequireDefault(_reactDom);

  var _superagent2 = _interopRequireDefault(_superagent);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _urlSearchParams2 = _interopRequireDefault(_urlSearchParams);

  var _forestCore2 = _interopRequireDefault(_forestCore);

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
    return _reactNative.AsyncStorage.setItem(_forestCore2.default.toUID(o.UID), _forestCore2.default.stringify(o)).then(function () {
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

      _this.backButtonCB = null;
      _this.initialURLCB = null;

      _this.backButtonPushed = function () {
        if (!_this.backButtonCB) return;
        _this.backButtonCB();
        return true;
      };

      _this.initialURLSupplied = function (e) {
        return _this.callInitialURL(e.url);
      };

      _this.urlRE = /.*?:\/\/.*?\/(.*?)\?(.*)/;
      return _this;
    }

    _createClass(Forest, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        var _this2 = this;

        _get(Forest.prototype.__proto__ || Object.getPrototypeOf(Forest.prototype), 'componentDidMount', this).call(this);
        if (this.backButtonCB) {
          _reactNative.BackHandler.addEventListener('hardwareBackPress', this.backButtonPushed);
        }
        if (this.initialURLCB) {
          if (_reactNative.Platform.OS !== 'ios') {
            _reactNative.Linking.getInitialURL().then(function (url) {
              return _this2.callInitialURL(url);
            }).catch(function (e) {
              return console.log('unable to get initial URL:', e.message);
            });
          } else {
            _reactNative.Linking.addEventListener('url', this.initialURLSupplied); // what if there's already been an event?
          }
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        _get(Forest.prototype.__proto__ || Object.getPrototypeOf(Forest.prototype), 'componentWillUnmount', this).call(this);
        _reactNative.BackHandler.removeEventListener('hardwareBackPress', this.backButtonPushed);
        _reactNative.Linking.removeEventListener('url', this.initialURLSupplied);
      }
    }, {
      key: 'callInitialURL',
      value: function callInitialURL(url) {
        if (!this.initialURLCB) return;
        if (!url) return;
        var m = url.match(this.urlRE);
        if (!m) return;
        var route = m[1];
        var query = m[2];
        this.initialURLCB(route, new _urlSearchParams2.default(query));
      }
    }, {
      key: 'setBackButtonCB',
      value: function setBackButtonCB(cb) {
        this.backButtonCB = cb;
      }
    }, {
      key: 'setInitialURLCB',
      value: function setInitialURLCB(cb) {
        this.initialURLCB = cb;
      }
    }, {
      key: 'Button',
      value: function Button(name) {
        var _this3 = this;

        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref$label = _ref.label,
            label = _ref$label === undefined ? '' : _ref$label,
            _ref$children = _ref.children,
            children = _ref$children === undefined ? null : _ref$children,
            _ref$style = _ref.style,
            style = _ref$style === undefined ? null : _ref$style;

        var nested = children && children.length;
        return _react2.default.createElement(
          _reactNative.TouchableOpacity,
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
            },
            style: nested && style
          },
          nested && children || _react2.default.createElement(
            _reactNative.Text,
            { style: style },
            label
          )
        );
      }
    }], [{
      key: 'dropAll',
      value: function dropAll(actually) {
        return _reactNative.AsyncStorage.getAllKeys().then(function (uids) {
          return console.log(actually ? '*************** dropping' : '(not dropping)', uids) || actually && _reactNative.AsyncStorage.clear();
        });
      }
    }]);

    return Forest;
  }(_forestCommon.ForestCommon);

  exports.Forest = Forest;
  exports.ForestWidget = _forestCommon.ForestWidget;
  exports.default = Forest;
});