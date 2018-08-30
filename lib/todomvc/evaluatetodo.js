(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['react', '../forest-common', './rendertodo'], factory);
  } else if (typeof exports !== "undefined") {
    factory(require('react'), require('../forest-common'), require('./rendertodo'));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.react, global.forestCommon, global.rendertodo);
    global.evaluatetodo = mod.exports;
  }
})(this, function (_react, _forestCommon, _rendertodo) {
  'use strict';

  var _react2 = _interopRequireDefault(_react);

  var _forestCommon2 = _interopRequireDefault(_forestCommon);

  var _rendertodo2 = _interopRequireDefault(_rendertodo);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var uids = _forestCommon2.default.cacheObjects([{ Evaluator: evalTodo,
    is: 'todoapp',
    nowShowing: 'all'
  }]);

  function evalTodo(object) {
    var todoSubmitted = !object('creating') && object('user-state.newTodo-submitted');
    return Object.assign({}, !object('user-state.newTodo-submitted') && { newTodo: object('user-state.newTodo') || '' }, todoSubmitted && { newTodo: '',
      todos: [].concat(object('todos') || []).concat([_forestCommon2.default.spawnObject({ Evaluator: evalTodoItem,
        is: 'todoitem',
        title: object('newTodo'),
        completed: false,
        deleted: false,
        editing: false,
        parent: object('UID')
      })])
    }, !todoSubmitted && { todos: object('todos', { match: { deleted: false } }) }, true && { activeTodos: object('todos', { match: { completed: false } }),
      completedTodos: object('todos', { match: { completed: true } }) }, true && { clearCompleted: object('user-state.clearCompleted') }, true && { toggleAll: !object('activeTodos') }, true && { creating: object('user-state.newTodo-submitted') });
  }

  function evalTodoItem(object) {
    return Object.assign({}, true && { completed: !object('parent.clearCompleted') && !!object('user-state.completed') }, object('user-state.destroy') && { deleted: true
      // true                         && { editing: object('parent.editing') === object('UID') }
    });
  }

  _forestCommon2.default.renderDOM(_react2.default.createElement(_rendertodo2.default, { uid: uids[0], key: uids[0] }));

  _forestCommon2.default.setLogging({ update: false });
});