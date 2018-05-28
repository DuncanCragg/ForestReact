(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', 'react', '../forest-web', 'classnames'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('react'), require('../forest-web'), require('classnames'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.react, global.forestWeb, global.classnames);
    global.rendertodo = mod.exports;
  }
})(this, function (module, exports, _react, _forestWeb, _classnames) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _react2 = _interopRequireDefault(_react);

  var _forestWeb2 = _interopRequireDefault(_forestWeb);

  var _classnames2 = _interopRequireDefault(_classnames);

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

  function pluralize(count, word) {
    return count === 1 ? word : word + 's';
  }

  var TodoApp = function (_Forest) {
    _inherits(TodoApp, _Forest);

    function TodoApp() {
      _classCallCheck(this, TodoApp);

      return _possibleConstructorReturn(this, (TodoApp.__proto__ || Object.getPrototypeOf(TodoApp)).apply(this, arguments));
    }

    _createClass(TodoApp, [{
      key: 'render',
      value: function render() {
        var all = this.object('todos');
        var active = this.object('activeTodos') || [];
        var completed = this.object('completedTodos') || [];

        var numactive = active.length;
        var numcompleted = completed.length;

        var shownTodos = { all: all, active: active, completed: completed }[this.object('nowShowing')];

        return _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'header',
            { className: 'header' },
            _react2.default.createElement(
              'h1',
              null,
              'todos'
            ),
            this.textField('newTodo', { className: 'new-todo', placeholder: 'What needs to be done?' })
          ),
          shownTodos.length != 0 && _react2.default.createElement(
            'section',
            { className: 'main' },
            this.checkbox('toggleAll', { className: 'toggle-all-X' }),
            _react2.default.createElement(
              'ul',
              { className: 'todo-list' },
              shownTodos.map(function (uid) {
                return _react2.default.createElement(TodoItem, { uid: uid, key: uid });
              })
            )
          ),
          (numactive != 0 || numcompleted != 0) && _react2.default.createElement(
            'footer',
            { className: 'footer' },
            _react2.default.createElement(
              'span',
              { className: 'todo-count' },
              _react2.default.createElement(
                'strong',
                null,
                numactive
              ),
              ' ',
              pluralize(numactive, 'item'),
              ' left'
            ),
            _react2.default.createElement(
              'ul',
              { className: 'filters' },
              _react2.default.createElement(
                'li',
                null,
                _react2.default.createElement(
                  'a',
                  { href: '#/', className: (0, _classnames2.default)({ selected: this.object('nowShowing') === 'all' }) },
                  'All'
                )
              ),
              ' ',
              ' ',
              _react2.default.createElement(
                'li',
                null,
                _react2.default.createElement(
                  'a',
                  { href: '#/active', className: (0, _classnames2.default)({ selected: this.object('nowShowing') === 'active' }) },
                  'Active'
                )
              ),
              ' ',
              ' ',
              _react2.default.createElement(
                'li',
                null,
                _react2.default.createElement(
                  'a',
                  { href: '#/completed', className: (0, _classnames2.default)({ selected: this.object('nowShowing') === 'completed' }) },
                  'Completed'
                )
              )
            ),
            /* (numcompleted!=0) && */this.button('clearCompleted', { label: 'Clear completed', className: 'clear-completed' })
          )
        );
      }
    }]);

    return TodoApp;
  }(_forestWeb2.default);

  var TodoItem = function (_Forest2) {
    _inherits(TodoItem, _Forest2);

    function TodoItem() {
      _classCallCheck(this, TodoItem);

      return _possibleConstructorReturn(this, (TodoItem.__proto__ || Object.getPrototypeOf(TodoItem)).apply(this, arguments));
    }

    _createClass(TodoItem, [{
      key: 'render',
      value: function render() {
        return _react2.default.createElement(
          'li',
          { className: (0, _classnames2.default)({ completed: this.object('completed'), editing: this.object('editing') }) },
          _react2.default.createElement(
            'div',
            { className: 'view' },
            this.checkbox('completed', { className: 'toggle' }),
            _react2.default.createElement(
              'label',
              { onDoubleClick: this.handleEdit },
              this.object('title')
            ),
            this.button('destroy', { className: 'destroy' })
          ),
          this.textField('title', { className: 'edit' })
        );
      }
    }]);

    return TodoItem;
  }(_forestWeb2.default);

  exports.default = TodoApp;
  module.exports = exports['default'];
});