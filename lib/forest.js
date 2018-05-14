(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', 'react-native', 'react-dom', 'react-dom/server', './forest-core'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('react-native'), require('react-dom'), require('react-dom/server'), require('./forest-core'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.reactNative, global.reactDom, global.reactDomServer, global.forestCore);
    global.forest = mod.exports;
  }
})(this, function (module, exports, _react, _reactNative, _reactDom, _server, _forestCore) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _react2 = _interopRequireDefault(_react);

  var _reactDom2 = _interopRequireDefault(_reactDom);

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

  var Forest = function (_Component) {
    _inherits(Forest, _Component);

    _createClass(Forest, null, [{
      key: 'storeObjects',
      value: function storeObjects(list, renderers) {
        var rootId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'root';

        var uids = _forestCore2.default.storeObjects(list);
        Forest.renderers = renderers;
        return new Promise(function (resolve, reject) {
          _reactDom2.default.render(Forest.wrapObject(uids[0]), document.getElementById(rootId), function (err) {
            return err ? reject(err) : resolve();
          });
        });
      }
    }, {
      key: 'storeObjectsToString',
      value: function storeObjectsToString(list, renderers) {
        var uids = _forestCore2.default.storeObjects(list);
        Forest.renderers = renderers;
        return (0, _server.renderToString)(Forest.wrapObject(uids[0]));
      }
    }, {
      key: 'storeObjectsInComponent',
      value: function storeObjectsInComponent(list, renderers) {
        var uids = _forestCore2.default.storeObjects(list);
        Forest.renderers = renderers;
        return Forest.wrapObject(uids[0]);
      }
    }, {
      key: 'wrapObject',
      value: function wrapObject(uid) {
        return _react2.default.createElement(Forest, { state: _forestCore2.default.objects[uid], key: uid });
      }
    }, {
      key: 'spawnObject',
      value: function spawnObject(o) {
        return _forestCore2.default.spawnObject(o);
      }
    }]);

    function Forest(props) {
      _classCallCheck(this, Forest);

      var _this = _possibleConstructorReturn(this, (Forest.__proto__ || Object.getPrototypeOf(Forest)).call(this, props));

      _this.mounted = false;

      _this.onChange = function (name, value) {
        _forestCore2.default.setObjectState(_this.userStateUID, _defineProperty({}, name, value));
      };

      _this.KEY_ENTER = 13;

      _this.state = props.state || {};
      _this.UID = _this.state.UID;
      _this.userStateUID = _forestCore2.default.spawnObject({});
      _this.state.userState = _this.userStateUID; // hardwiring from obj to react
      _this.state.react = _this; //        --- " ---
      _this.stateAccess = _this.stateAccess.bind(_this);
      _this.notify = _this.notify.bind(_this);
      return _this;
    }

    _createClass(Forest, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        this.mounted = true;_forestCore2.default.doEvaluate(this.UID);
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        this.mounted = false;
      }
    }, {
      key: 'stateAccess',
      value: function stateAccess(path, match) {
        return _forestCore2.default.stateAccess(this.UID, path, match);
      }
    }, {
      key: 'notify',
      value: function notify() {
        if (this.mounted) this.setState({});
      }
    }, {
      key: 'onRead',
      value: function onRead(name) {
        var value = this.stateAccess(name);
        _forestCore2.default.setObjectState(this.userStateUID, _defineProperty({}, name, value));
        return value;
      }
    }, {
      key: 'onKeyDown',
      value: function onKeyDown(name, e) {
        if (e.keyCode !== this.KEY_ENTER) {
          _forestCore2.default.setObjectState(this.userStateUID, _defineProperty({}, name + '-submitted', false));
          return;
        }
        _forestCore2.default.setObjectState(this.userStateUID, _defineProperty({}, name + '-submitted', true));
        e.preventDefault();
      }
    }, {
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
      key: 'Button',
      value: function Button(name) {
        var _this3 = this;

        var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref2$label = _ref2.label,
            label = _ref2$label === undefined ? '' : _ref2$label,
            _ref2$className = _ref2.className,
            className = _ref2$className === undefined ? '' : _ref2$className,
            _ref2$style = _ref2.style,
            style = _ref2$style === undefined ? null : _ref2$style;

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
    }, {
      key: 'textField',
      value: function textField(name) {
        var _this4 = this;

        var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref3$label = _ref3.label,
            label = _ref3$label === undefined ? '' : _ref3$label,
            _ref3$className = _ref3.className,
            className = _ref3$className === undefined ? '' : _ref3$className,
            _ref3$placeholder = _ref3.placeholder,
            placeholder = _ref3$placeholder === undefined ? '' : _ref3$placeholder;

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
              return _this4.onChange(name, e.target.value);
            },
            onKeyDown: function onKeyDown(e) {
              return _this4.onKeyDown(name, e);
            },
            value: this.onRead(name),
            placeholder: placeholder,
            autoFocus: true })
        );
      }
    }, {
      key: 'image',
      value: function image(name) {
        var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref4$label = _ref4.label,
            label = _ref4$label === undefined ? '' : _ref4$label,
            _ref4$className = _ref4.className,
            className = _ref4$className === undefined ? '' : _ref4$className;

        return _react2.default.createElement(
          'span',
          null,
          label,
          ' ',
          _react2.default.createElement('img', { className: className, src: this.stateAccess(name) })
        );
      }
    }, {
      key: 'checkbox',
      value: function checkbox(name) {
        var _this5 = this;

        var _ref5 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref5$label = _ref5.label,
            label = _ref5$label === undefined ? '' : _ref5$label,
            _ref5$className = _ref5.className,
            className = _ref5$className === undefined ? '' : _ref5$className;

        return label ? _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement('input', { className: className, type: 'checkbox', onChange: function onChange(e) {
              return _this5.onChange(name, e.target.checked);
            }, checked: this.onRead(name) }),
          _react2.default.createElement(
            'span',
            null,
            label
          )
        ) : _react2.default.createElement('input', { className: className, type: 'checkbox', onChange: function onChange(e) {
            return _this5.onChange(name, e.target.checked);
          }, checked: this.onRead(name) });
      }
    }, {
      key: 'render',
      value: function render() {
        return Forest.renderers[this.stateAccess('is')](this.stateAccess, this);
      }
    }]);

    return Forest;
  }(_react.Component);

  exports.default = Forest;
  module.exports = exports['default'];
});