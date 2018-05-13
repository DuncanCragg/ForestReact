(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', '../forest', 'react', 'classnames'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('../forest'), require('react'), require('classnames'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.forest, global.react, global.classnames);
    global.rendertodo = mod.exports;
  }
})(this, function (module, exports, _forest, _react, _classnames) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _forest2 = _interopRequireDefault(_forest);

  var _react2 = _interopRequireDefault(_react);

  var _classnames2 = _interopRequireDefault(_classnames);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function pluralize(count, word) {
    return count === 1 ? word : word + 's';
  }

  function renderTodoApp(state, userState) {

    var all = state('todos');
    var active = state('activeTodos') || [];
    var completed = state('completedTodos') || [];

    var numactive = active.length;
    var numcompleted = completed.length;

    var shownTodos = { all: all, active: active, completed: completed }[state('nowShowing')];

    //{false && Object.keys(state).map(key => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
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
        userState.textField('newTodo', { className: 'new-todo', placeholder: 'What needs to be done?' })
      ),
      shownTodos.length != 0 && _react2.default.createElement(
        'section',
        { className: 'main' },
        userState.checkbox('toggleAll', { className: 'toggle-all-X' }),
        _react2.default.createElement(
          'ul',
          { className: 'todo-list' },
          shownTodos.map(function (uid) {
            return _forest2.default.wrapObject(uid);
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
              { href: '#/', className: (0, _classnames2.default)({ selected: state('nowShowing') === 'all' }) },
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
              { href: '#/active', className: (0, _classnames2.default)({ selected: state('nowShowing') === 'active' }) },
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
              { href: '#/completed', className: (0, _classnames2.default)({ selected: state('nowShowing') === 'completed' }) },
              'Completed'
            )
          )
        ),
        /* (numcompleted!=0) && */userState.button('clearCompleted', { label: 'Clear completed', className: 'clear-completed' })
      )
    );
  }

  //{false && Object.keys(state).map(key => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
  function renderTodoItem(state, userState) {
    return _react2.default.createElement(
      'li',
      { className: (0, _classnames2.default)({ completed: state('completed'), editing: state('editing') }) },
      _react2.default.createElement(
        'div',
        { className: 'view' },
        userState.checkbox('completed', { className: 'toggle' }),
        _react2.default.createElement(
          'label',
          { onDoubleClick: this.handleEdit },
          state('title')
        ),
        userState.button('destroy', { className: 'destroy' })
      ),
      userState.textField('title', { className: 'edit' })
    );
  }

  exports.default = {
    'todoapp': renderTodoApp,
    'todoitem': renderTodoItem
  };
  module.exports = exports['default'];
});