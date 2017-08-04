
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.storeObjects(
  [{ evaluate: evalTodo, is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] }],
  renderers
);

function evalTodo(state){
  console.log('>>>>>>>>>>>>> evalTodo', state('.'), state('user-state.'));
  const todoSubmitted = !state('creating') && state('user-state.newTodo-submitted')
  const r= Object.assign({},
    !state('user-state.newTodo-submitted')? { newTodo: state('user-state.newTodo') || '' }:{},
    todoSubmitted?
      { todos: state('todos').concat([Forest.spawnObject(
          { evaluate: evalTodoItem, is: 'todoitem', title: state('newTodo'), completed: false, deleted: false, editing: false, parent: state('UID') }
        )]),
        newTodo: ''
      }:{},
    { creating: !!state('user-state.newTodo-submitted') },
    !todoSubmitted? { todos: state('todos', {deleted: false})}:{},
    { activeTodos:    state('todos', {completed: false}),
      completedTodos: state('todos', {completed: true}) },
    { clearCompleted: !!state('user-state.clearCompleted') },
    { toggleAll: state('activeTodos') == null || state('activeTodos').length == 0 }
  );
  console.log('<<<<<<<<<<<<<<<<<<<new state bits: ', r);
  return r;
}

function evalTodoItem(state){
  console.log('>>>>>>>>>>>>> evalTodoItem', state('.'), state('user-state.'));
  const r= Object.assign({},
    { completed: !state('parent.clearCompleted') && !!state('user-state.completed') },
    state('user-state.destroy')? { deleted: true }:{}
    // {editing: {state('app.editing') === state('UID')}}
  );
  console.log('<<<<<<<<<<<<<<<<<<<new state bits: ', r);
  return r;
}


