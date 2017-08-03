
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.store(
  [{ UID: 'uid-1', evaluate: evalTodo, is: 'todoapp', newTodo: '', nowShowing: 'active', todos: [] }],
  renderers
);

function evalTodo(state){
  console.log('evalTodo', state('user-state.'));
  const r= Object.assign({},
    !state('user-state.newTodo-submitted')? { newTodo: state('user-state.newTodo') || '' }:{},
    !state('creating') && state('user-state.newTodo-submitted')?
      { todos: state('todos').concat([Forest.spawnObject(
          { evaluate: evalTodoItem, is: 'todoitem', title: state('newTodo'), completed: false, editing: false }
        )]),
        newTodo: ''
      }:{},
    { creating: !!state('user-state.newTodo-submitted') },
    { activeTodos: state('todos'), completedTodos: state('todos') }
// toggleAll: activeTodos.length == 0
  );
  console.log('new state: ', r);
  return r;
}

function evalTodoItem(state){
  console.log('evalTodoItem', state('user-state.'));
  const r= Object.assign({},
    { completed: !!state('user-state.completed') }
    // {editing: {state('app.editing') === state('UID')}}
  );
  console.log('new state: ', r);
  return r;
}


