
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.store(
  [
    { UID: 'uid-1', evaluate: evalTodo,     is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] },
    { UID: 'uid-2', evaluate: evalTodoItem, is: 'todoitem', title: 'banana', completed: false, editing: false },
    { UID: 'uid-3', evaluate: evalTodoItem, is: 'todoitem', title: 'mango' , completed: false, editing: false }
  ],
  renderers
);

function spawn(){
  return 'uid-2';
}

function evalTodo(state){
console.log('evalTodo', state('user-state.'));
  const r= Object.assign({},
    !state('user-state.newTodo-submitted')? { newTodo: state('user-state.newTodo') || '' }:{},
    !state('creating') && state('user-state.newTodo-submitted')? { todos: state('todos').concat([spawn()]), newTodo: '' }:{},
    { creating: !!state('user-state.newTodo-submitted') },
  );
  console.log('new state: ', r);
  return r;
}

function evalTodoItem(state){
console.log('evalTodoItem', state('user-state.'));
  // todoitem.editing={state.editing === todo.uid}
  return Object.assign({},
    { completed: !!state('user-state.completed') }
  );
}


