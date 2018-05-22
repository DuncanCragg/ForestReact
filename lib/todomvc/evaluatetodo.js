(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['react', '../forest', './rendertodo'], factory);
  } else if (typeof exports !== "undefined") {
    factory(require('react'), require('../forest'), require('./rendertodo'));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.react, global.forest, global.rendertodo);
    global.evaluatetodo = mod.exports;
  }
})(this, function (_react, _forest, _rendertodo) {
  'use strict';

  var _react2 = _interopRequireDefault(_react);

  var _forest2 = _interopRequireDefault(_forest);

  var _rendertodo2 = _interopRequireDefault(_rendertodo);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var uids = _forest2.default.cacheObjects([{ Evaluator: evalTodo,
    is: 'todoapp',
    newTodo: '',
    nowShowing: 'all',
    todos: []
  }]);

  function evalTodo(object) {
    var todoSubmitted = !object('creating') && object('userState.newTodo-submitted');
    return Object.assign({}, !object('userState.newTodo-submitted') && { newTodo: object('userState.newTodo') || '' }, todoSubmitted && { newTodo: '',
      todos: object('todos').concat([_forest2.default.spawnObject({ Evaluator: evalTodoItem,
        is: 'todoitem',
        title: object('newTodo'),
        completed: false,
        deleted: false,
        editing: false,
        parent: object('UID')
      })])
    }, !todoSubmitted && { todos: object('todos', { deleted: false }) }, true && { activeTodos: object('todos', { completed: false }),
      completedTodos: object('todos', { completed: true }) }, true && { clearCompleted: object('userState.clearCompleted') }, true && { toggleAll: object('activeTodos') == null || object('activeTodos').length == 0 }, true && { creating: object('userState.newTodo-submitted') });
  }

  function evalTodoItem(object) {
    return Object.assign({}, true && { completed: !object('parent.clearCompleted') && !!object('userState.completed') }, object('userState.destroy') && { deleted: true
      // true                        && { editing: object('parent.editing') === object('UID') }
    });
  }

  _forest2.default.renderDOM(_react2.default.createElement(_rendertodo2.default, { uid: uids[0], key: uids[0] }));
});