
import Forest from 'forest';
import renderers from 'rendertodo';

Forest.store(
  [
    { UID: 'uid-1', evaluate: evalTodo,     is: 'todoapp', newTodo: '', nowShowing: 'all', todos: [] }
  ],
  renderers
);

/*
  var numactive = todos.reduce(function (accum, todo) {
    return todo.completed ? accum : accum + 1;
  }, 0);

  var numdone = todos.length - numactive;

  var shownTodos = todos.filter(function (todo) {
    switch (state.nowShowing) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  }, this);
*/

function evalTodo(state){
  console.log('evalTodo', state('user-state.'));
  const r= Object.assign({},
    !state('user-state.newTodo-submitted')? { newTodo: state('user-state.newTodo') || '' }:{},
    !state('creating') && state('user-state.newTodo-submitted')?
      {
        todos: state('todos').concat([Forest.spawnObject(
          { evaluate: evalTodoItem, is: 'todoitem', title: state('newTodo'), completed: false, editing: false }
        )]),
        newTodo: ''
      }:{},
    { creating: !!state('user-state.newTodo-submitted') },
    { numactive: 1, numdone: 1 }
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


