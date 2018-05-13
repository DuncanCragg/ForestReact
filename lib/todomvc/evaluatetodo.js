(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['../forest', './rendertodo'], factory);
  } else if (typeof exports !== "undefined") {
    factory(require('../forest'), require('./rendertodo'));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.forest, global.rendertodo);
    global.evaluatetodo = mod.exports;
  }
})(this, function (_forest, _rendertodo) {
  'use strict';

  var _forest2 = _interopRequireDefault(_forest);

  var _rendertodo2 = _interopRequireDefault(_rendertodo);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  _forest2.default.storeObjects([{ evaluate: evalTodo, is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] }], _rendertodo2.default);

  function evalTodo(state) {
    var todoSubmitted = !state('creating') && state('userState.newTodo-submitted');
    return Object.assign({}, !state('userState.newTodo-submitted') && { newTodo: state('userState.newTodo') }, todoSubmitted && { newTodo: '',
      todos: state('todos').concat([_forest2.default.spawnObject({ evaluate: evalTodoItem,
        is: 'todoitem',
        title: state('newTodo'),
        completed: false,
        deleted: false,
        editing: false,
        parent: state('UID')
      })])
    }, !todoSubmitted && { todos: state('todos', { deleted: false }) }, true && { activeTodos: state('todos', { completed: false }),
      completedTodos: state('todos', { completed: true }) }, true && { clearCompleted: state('userState.clearCompleted') }, true && { toggleAll: state('activeTodos') == null || state('activeTodos').length == 0 }, true && { creating: state('userState.newTodo-submitted') });
  }

  function evalTodoItem(state) {
    return Object.assign({}, true && { completed: !state('parent.clearCompleted') && state('userState.completed') }, state('userState.destroy') && { deleted: true
      // true                       && { editing: state('parent.editing') === state('UID') }
    });
  }
});