
import Forest from 'forest';

function pluralize(count, word) {
  return count === 1 ? word : word + 's';
}

function classNames () {
  var hasOwn = {}.hasOwnProperty;
  var classes = '';
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (!arg) continue;
    var argType = typeof arg;
    if (argType === 'string' || argType === 'number') {
      classes += ' ' + arg;
    } else if (Array.isArray(arg)) {
      classes += ' ' + classNames.apply(null, arg);
    } else if (argType === 'object') {
      for (var key in arg) {
        if (hasOwn.call(arg, key) && arg[key]) {
          classes += ' ' + key;
        }
      }
    }
  }
  return classes.substr(1);
}

// {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
function renderTodoApp(state,gui){

  const numactive    = state.activeTodos && state.activeTodos.length;
  const numcompleted = state.completedTodos && state.completedTodos.length;
  const shownTodos = {'all': state.todos, 'active': state.activeTodos, 'completed': state.completedTodos}[state.nowShowing];

  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        {gui.textField('newTodo','','new-todo','What needs to be done?')}
      </header>

      {(shownTodos.length!=0) && (
      <section className="main">
        {gui.checkbox('toggleAll','toggle-all-X')}
        <ul className="todo-list">
          {shownTodos.map((uid) => <Forest state={Forest.objects[uid]} key={uid}></Forest>)}
        </ul>
      </section>)}

      {(numactive!=0 || numcompleted!=0) && (
      <footer className="footer">
        <span className="todo-count"><strong>{numactive}</strong> {pluralize(numactive, 'item')} left</span>
        <ul className="filters">
          <li><a href="#/"          className={classNames({selected: state.nowShowing === 'all'      })}>All</a></li> {' '}
          <li><a href="#/active"    className={classNames({selected: state.nowShowing === 'active'   })}>Active</a></li> {' '}
          <li><a href="#/completed" className={classNames({selected: state.nowShowing === 'completed'})}>Completed</a></li>
        </ul>
        {(numcompleted!=0) && gui.button('clear', 'Clear completed', 'clear-completed')}
      </footer>)}
    </div>
  );
}

// {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
function renderTodoItem(state,gui){
  return (
    <li className={classNames({completed: state.completed, editing: state.editing})}>
      <div className="view">
        {gui.checkbox('completed', 'toggle')}
        <label onDoubleClick={this.handleEdit}>{state.title}</label>
        {gui.button('destroy','','destroy')}
      </div>
      {gui.textField('title', '', 'edit')}
    </li>
  );
}

export default {
  'todoapp':  renderTodoApp,
  'todoitem': renderTodoItem
};

