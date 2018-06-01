(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', './forest-web', 'react'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('./forest-web'), require('react'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.forestWeb, global.react);
    global.renderfed = mod.exports;
  }
})(this, function (module, exports, _forestWeb, _react) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _forestWeb2 = _interopRequireDefault(_forestWeb);

  var _react2 = _interopRequireDefault(_react);

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

  var GuiStack = function (_Forest) {
    _inherits(GuiStack, _Forest);

    function GuiStack() {
      _classCallCheck(this, GuiStack);

      return _possibleConstructorReturn(this, (GuiStack.__proto__ || Object.getPrototypeOf(GuiStack)).apply(this, arguments));
    }

    _createClass(GuiStack, [{
      key: 'render',
      value: function render() {
        if (!this.object('list')) return null;
        return _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'div',
            null,
            this.object('name')
          ),
          this.object('list').map(function (uid) {
            return _react2.default.createElement(Fed, { uid: uid, key: uid });
          })
        );
      }
    }]);

    return GuiStack;
  }(_forestWeb2.default);

  var Fed = function (_Forest2) {
    _inherits(Fed, _Forest2);

    function Fed() {
      _classCallCheck(this, Fed);

      return _possibleConstructorReturn(this, (Fed.__proto__ || Object.getPrototypeOf(Fed)).apply(this, arguments));
    }

    _createClass(Fed, [{
      key: 'render',
      value: function render() {
        return _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement('hr', null),
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          this.object('enableCounting') ? 'GO!' : '...',
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          this.textField('counter', { label: 'Count' }),
          this.button('add', { label: 'increment' }),
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          this.textField('topic', { label: 'Topic' }),
          this.button('loadrandompicture', { label: 'Load picture about that' }),
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          this.object('loading') ? 'loading..' : '',
          _react2.default.createElement('br', null),
          _react2.default.createElement('br', null),
          this.image('image', { label: 'Your random image:' }),
          _react2.default.createElement('br', null),
          _react2.default.createElement('hr', null),
          _react2.default.createElement('br', null)
        );
      }
    }]);

    return Fed;
  }(_forestWeb2.default);

  exports.default = GuiStack;
  module.exports = exports['default'];
});