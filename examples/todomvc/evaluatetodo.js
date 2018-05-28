
import React from 'react';
import Forest from '../forest-web';
import TodoApp from './rendertodo';

const uids = Forest.cacheObjects(
  [{ Evaluator: evalTodo,
     is: 'todoapp',
     newTodo: '',
     nowShowing: 'all',
     todos: []
  }]
);

function evalTodo(object){
  const todoSubmitted = !object('creating') && object('userState.newTodo-submitted')
  return Object.assign({},
   !object('userState.newTodo-submitted') && { newTodo: object('userState.newTodo')|| '' },
    todoSubmitted                         && { newTodo: '',
                                               todos: object('todos').concat([Forest.spawnObject(
                                                 { Evaluator: evalTodoItem,
                                                   is: 'todoitem',
                                                   title: object('newTodo'),
                                                   completed: false,
                                                   deleted: false,
                                                   editing: false,
                                                   parent: object('UID')
                                                 })])
                                             },
   !todoSubmitted                         && { todos:          object('todos', { match: { deleted:   false }})},
    true                                  && { activeTodos:    object('todos', { match: { completed: false }}),
                                               completedTodos: object('todos', { match: { completed: true  }})},
    true                                  && { clearCompleted: object('userState.clearCompleted') },
    true                                  && { toggleAll: object('activeTodos') == null || object('activeTodos').length == 0 },
    true                                  && { creating: object('userState.newTodo-submitted') },
  );
}

function evalTodoItem(object){
  return Object.assign({},
    true                        && { completed: !object('parent.clearCompleted') && !!object('userState.completed') },
    object('userState.destroy') && { deleted: true }
 // true                        && { editing: object('parent.editing') === object('UID') }
  );
}

Forest.renderDOM(<TodoApp uid={uids[0]} key={uids[0]} />);

