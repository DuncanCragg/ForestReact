(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', 'react-native', 'react-dom', 'superagent', 'lodash', './forest-core', './forest-common'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('react-native'), require('react-dom'), require('superagent'), require('lodash'), require('./forest-core'), require('./forest-common'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.reactNative, global.reactDom, global.superagent, global.lodash, global.forestCore, global.forestCommon);
    global.forestNative = mod.exports;
  }
})(this, function (module, exports, _react, _reactNative, _reactDom, _superagent, _lodash, _forestCore, _forestCommon) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _react2 = _interopRequireDefault(_react);

  var _reactDom2 = _interopRequireDefault(_reactDom);

  var _superagent2 = _interopRequireDefault(_superagent);

  var _lodash2 = _interopRequireDefault(_lodash);

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

      return _possibleConstructorReturn(this, (Forest.__proto__ || Object.getPrototypeOf(Forest)).call(this, props));
    }

    _createClass(Forest, [{
      key: 'Button',
      value: function Button(name) {
        var _this2 = this;

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
              return _this2.onChange(name, true);
            },
            onLongPress: function onLongPress() {
              return _this2.onChange(name, true);
            },
            onPressOut: function onPressOut() {
              return _this2.onChange(name, false);
            }
          },
          _react2.default.createElement(
            _reactNative.Text,
            { style: style },
            label
          )
        );
      }
    }]);

    return Forest;
  }(_forestCommon2.default);

  exports.default = Forest;
  module.exports = exports['default'];
});