
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.storeObjects(
  [{ evaluate: evalTodo, is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] }],
  renderers
);

function evalTodo(state){
  const todoSubmitted = !state('creating') && state('userState.newTodo-submitted')
  return Object.assign({},
    !state('userState.newTodo-submitted')? { newTodo: state('userState.newTodo') || '' }:{},
    todoSubmitted?
      { todos: state('todos').concat([Forest.spawnObject(
          { evaluate: evalTodoItem, is: 'todoitem', title: state('newTodo'), completed: false, deleted: false, editing: false, parent: state('UID') }
        )]),
        newTodo: ''
      }:{},
    { creating: !!state('userState.newTodo-submitted') },
    !todoSubmitted? { todos: state('todos', {deleted: false})}:{},
    { activeTodos:    state('todos', {completed: false}),
      completedTodos: state('todos', {completed: true}) },
    { clearCompleted: !!state('userState.clearCompleted') },
    { toggleAll: state('activeTodos') == null || state('activeTodos').length == 0 }
  );
}

function evalTodoItem(state){
  return Object.assign({},
    { completed: !state('parent.clearCompleted') && !!state('userState.completed') },
    state('userState.destroy')? { deleted: true }:{}
    // {editing: {state('app.editing') === state('UID')}}
  );
}


