
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.store(
  [
    { UID: 'uid-1', evaluate: evalTodo,     is: 'todoapp', newTodo: '', nowShowing: 'all', todos: ['uid-2', 'uid-3'] },
    { UID: 'uid-2', evaluate: evalTodoItem, is: 'todoitem', title: 'banana', completed: false, editing: false },
    { UID: 'uid-3', evaluate: evalTodoItem, is: 'todoitem', title: 'mango' , completed: false, editing: false }
  ],
  renderers
);

function evalTodo(state){
console.log('evalTodo', state('is'));
  return {
  };
}

function evalTodoItem(state){
console.log('evalTodoItem', state('is'));
  // todoitem.editing={state.editing === todo.uid}
  return Object.assign({},
    { completed: !!state('user-state.completed') }
  );
}


