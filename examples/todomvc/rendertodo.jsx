
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

const ALL_TODOS = 'all';
const ACTIVE_TODOS = 'active';
const COMPLETED_TODOS = 'completed';

function renderTodoApp(state,gui){
  var main, footer;
  const todos = [{ completed: false }]; //state.todos;

  var activeTodoCount = todos.reduce(function (accum, todo) {
    return todo.completed ? accum : accum + 1;
  }, 0);

  var completedCount = todos.length - activeTodoCount;

  if (activeTodoCount || completedCount) {

    var activeTodoWord = pluralize(activeTodoCount, 'item');
    var clearButton = null;

    if (completedCount > 0) {
      clearButton = (
        <button
          className="clear-completed"
          onClick={clearCompleted}>
          Clear completed
        </button>
      );
    }

    footer = (
      <footer className="footer">
        <span className="todo-count">
          <strong>{activeTodoCount}</strong> {activeTodoWord} left
        </span>
        <ul className="filters">
          <li> <a href="#/" className={classNames({selected: state.nowShowing === ALL_TODOS})}> All </a> </li> {' '}
          <li> <a href="#/active" className={classNames({selected: state.nowShowing === ACTIVE_TODOS})}> Active </a> </li> {' '}
          <li> <a href="#/completed" className={classNames({selected: state.nowShowing === COMPLETED_TODOS})}> Completed </a> </li>
        </ul>
        {clearButton}
      </footer>
    );
  }

  var shownTodos = todos.filter(function (todo) {
    switch (state.nowShowing) {
      case ACTIVE_TODOS:
        return !todo.completed;
      case COMPLETED_TODOS:
        return todo.completed;
      default:
        return true;
    }
  }, this);

  shownTodos = state.todos;

  if (shownTodos.length) {
console.log(shownTodos);
    main = (
      <section className="main">
        <input
          className="toggle-all"
          type="checkbox"
          onChange={this.toggleAll}
          checked={activeTodoCount === 0}
        />
        <ul className="todo-list">
          {shownTodos.map((uid) => <Forest state={Forest.objects[uid]} key={uid}></Forest>)}
        </ul>
      </section>
    );
  }

      // {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        {gui.textField('newTodo','','new-todo','What needs to be done?')}
      </header>
      {main}
      {footer}
    </div>
  );
}

   // {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
function renderTodoItem(state,gui){
  return (
    <li className={classNames({
      completed: state.completed,
      editing: state.editing
    })}>
      <div className="view">
        {gui.checkbox('completed', 'toggle')}
        <label onDoubleClick={this.handleEdit}>
          {state.title}
        </label>
        {gui.button('destroy','','destroy')}
      </div>
      {gui.textField('title', '', 'edit')}
      <input
        ref="editField"
        className="edit"
        value={state.editText}

        onBlur={this.handleSubmit}
        onChange={this.handleChange}
        onKeyDown={this.handleKeyDown}
      />
    </li>
  );
}

export default {
  'todoapp':  renderTodoApp,
  'todoitem': renderTodoItem
};

