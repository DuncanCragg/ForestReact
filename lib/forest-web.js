(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', 'react-dom', 'superagent', 'lodash', './forest-core', './forest-common'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('react-dom'), require('superagent'), require('lodash'), require('./forest-core'), require('./forest-common'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.reactDom, global.superagent, global.lodash, global.forestCore, global.forestCommon);
    global.forestWeb = mod.exports;
  }
})(this, function (module, exports, _react, _reactDom, _superagent, _lodash, _forestCore, _forestCommon) {
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

  var Forest = function (_ForestCommon) {
    _inherits(Forest, _ForestCommon);

    function Forest(props) {
      _classCallCheck(this, Forest);

      return _possibleConstructorReturn(this, (Forest.__proto__ || Object.getPrototypeOf(Forest)).call(this, props));
    }

    _createClass(Forest, [{
      key: 'button',
      value: function button(name) {
        var _this2 = this;

        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref$label = _ref.label,
            label = _ref$label === undefined ? '' : _ref$label,
            _ref$className = _ref.className,
            className = _ref$className === undefined ? '' : _ref$className;

        //  core.setObjectState(this.userStateUID, { [name]: false });
        return _react2.default.createElement(
          'button',
          { className: className, onMouseDown: function onMouseDown(e) {
              return _this2.onChange(name, true);
            }, onMouseUp: function onMouseUp(e) {
              return _this2.onChange(name, false);
            } },
          label
        );
      }
    }, {
      key: 'textField',
      value: function textField(name) {
        var _this3 = this;

        var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref2$label = _ref2.label,
            label = _ref2$label === undefined ? '' : _ref2$label,
            _ref2$className = _ref2.className,
            className = _ref2$className === undefined ? '' : _ref2$className,
            _ref2$placeholder = _ref2.placeholder,
            placeholder = _ref2$placeholder === undefined ? '' : _ref2$placeholder;

        _forestCore2.default.setObjectState(this.userStateUID, _defineProperty({}, name + '-submitted', false));
        return _react2.default.createElement(
          'span',
          null,
          _react2.default.createElement(
            'span',
            null,
            label
          ),
          _react2.default.createElement('input', { className: className,
            type: 'text',
            onChange: function onChange(e) {
              return _this3.onChange(name, e.target.value);
            },
            onKeyDown: function onKeyDown(e) {
              return _this3.onKeyDown(name, e);
            },
            value: this.onRead(name),
            placeholder: placeholder,
            autoFocus: true })
        );
      }
    }, {
      key: 'image',
      value: function image(name) {
        var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref3$label = _ref3.label,
            label = _ref3$label === undefined ? '' : _ref3$label,
            _ref3$className = _ref3.className,
            className = _ref3$className === undefined ? '' : _ref3$className;

        return _react2.default.createElement(
          'span',
          null,
          label,
          ' ',
          _react2.default.createElement('img', { className: className, src: this.object(name) })
        );
      }
    }, {
      key: 'checkbox',
      value: function checkbox(name) {
        var _this4 = this;

        var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref4$label = _ref4.label,
            label = _ref4$label === undefined ? '' : _ref4$label,
            _ref4$className = _ref4.className,
            className = _ref4$className === undefined ? '' : _ref4$className;

        return label ? _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement('input', { className: className, type: 'checkbox', onChange: function onChange(e) {
              return _this4.onChange(name, e.target.checked);
            }, checked: this.onRead(name) }),
          _react2.default.createElement(
            'span',
            null,
            label
          )
        ) : _react2.default.createElement('input', { className: className, type: 'checkbox', onChange: function onChange(e) {
            return _this4.onChange(name, e.target.checked);
          }, checked: this.onRead(name) });
      }
    }]);

    return Forest;
  }(_forestCommon2.default);

  exports.default = Forest;
  module.exports = exports['default'];
});