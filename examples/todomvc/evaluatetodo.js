
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.storeObjects(
  [{ evaluate: evalTodo, is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] }],
  renderers
);

function evalTodo(state){
  const todoSubmitted = !state('creating') && state('userState.newTodo-submitted')
  return Object.assign({},
   !state('userState.newTodo-submitted')  && { newTodo: state('userState.newTodo') },
    todoSubmitted                         && { newTodo: '',
                                               todos: state('todos').concat([Forest.spawnObject(
                                                 { evaluate: evalTodoItem,
                                                   is: 'todoitem',
                                                   title: state('newTodo'),
                                                   completed: false,
                                                   deleted: false,
                                                   editing: false,
                                                   parent: state('UID')
                                                 })])
                                             },
   !todoSubmitted                         && { todos: state('todos', {deleted: false})},
    true                                  && { activeTodos:    state('todos', {completed: false}),
                                               completedTodos: state('todos', {completed: true}) },
    true                                  && { clearCompleted: state('userState.clearCompleted') },
    true                                  && { toggleAll: state('activeTodos') == null || state('activeTodos').length == 0 },
    true                                  && { creating: state('userState.newTodo-submitted') },
  );
}

function evalTodoItem(state){
  return Object.assign({},
    true                       && { completed: !state('parent.clearCompleted') && state('userState.completed') },
    state('userState.destroy') && { deleted: true }
 // true                       && { editing: state('parent.editing') === state('UID') }
  );
}


