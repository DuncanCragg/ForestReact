
import React from 'react';
import Forest from '../forest-common';
import TodoApp from './rendertodo';

const uids = Forest.cacheObjects(
  [{ Evaluator: evalTodo,
     is: 'todoapp',
     nowShowing: 'all',
  }]
);

function evalTodo(object){
  const todoSubmitted = object('user-state.newTodo-submitted?');
  return [
   !object('user-state.newTodo-submitted') && { newTodo: object('user-state.newTodo')|| '' },
    todoSubmitted                          && { newTodo: '',
                                                todos: [].concat(object('todos')||[]).concat([Forest.spawnObject(
                                                  { Evaluator: evalTodoItem,
                                                    is: 'todoitem',
                                                    title: object('newTodo'),
                                                    completed: false,
                                                    deleted: false,
                                                    editing: false,
                                                    parent: object('UID')
                                                  })])
                                              },
   !todoSubmitted                          && { todos:          object('todos', { match: { deleted:   false }})},
    true                                   && { activeTodos:    object('todos', { match: { completed: false }}),
                                                completedTodos: object('todos', { match: { completed: true  }})},
    true                                   && { clearCompleted: object('user-state.clearCompleted') },
    true                                   && { toggleAll: !object('activeTodos') },
  ];
}

function evalTodoItem(object){
  return Object.assign({},
    true                         && { completed: !object('parent.clearCompleted') && !!object('user-state.completed') },
    object('user-state.destroy') && { deleted: true }
 // true                         && { editing: object('parent.editing') === object('UID') }
  );
}

Forest.renderDOM(<TodoApp uid={uids[0]} key={uids[0]} />);

Forest.setLogging({ update: false });

