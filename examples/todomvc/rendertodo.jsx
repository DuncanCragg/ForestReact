
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

function renderGuiStack(state){
  var main, footer;
  const todos = [];

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

  var activeTodoCount = todos.reduce(function (accum, todo) {
    return todo.completed ? accum : accum + 1;
  }, 0);

  var completedCount = todos.length - activeTodoCount;

  if (true ||activeTodoCount || completedCount) {

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
          <li>
            <a
              href="#/"
              className={classNames({selected: state.nowShowing === ALL_TODOS})}>
                All
            </a>
          </li>
          {' '}
          <li>
            <a
              href="#/active"
              className={classNames({selected: state.nowShowing === ACTIVE_TODOS})}>
                Active
            </a>
          </li>
          {' '}
          <li>
            <a
              href="#/completed"
              className={classNames({selected: state.nowShowing === COMPLETED_TODOS})}>
                Completed
            </a>
          </li>
        </ul>
        {clearButton}
      </footer>
    );
  }

  if (todos.length) {
    var todoItems = [];/* = shownTodos.map(function (todo) {
      return (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={this.toggle.bind(this, todo)}
          onDestroy={this.destroy.bind(this, todo)}
          onEdit={this.edit.bind(this, todo)}
          editing={state.editing === todo.id}
          onSave={this.save.bind(this, todo)}
          onCancel={this.cancel}
        />
      );
    }, this);
    */

    main = (
      <section className="main">
        <input
          className="toggle-all"
          type="checkbox"
          onChange={this.toggleAll}
          checked={activeTodoCount === 0}
        />
        <ul className="todo-list">
/*
          {todoItems}
      {state.list.map((uid) => <Forest state={Forest.objects[uid]} key={uid}></Forest>)}
*/
        </ul>
      </section>
    );
  }

  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          value={state.newTodo}
          onKeyDown={this.handleNewTodoKeyDown}
          onChange={this.handleChange}
          autoFocus={true}
        />
      </header>
      {main}
      {footer}
    </div>
  );
}

function renderTodo(state,gui){
  return (
    <div>
      <hr/>
      {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
      <br/><br/>
      {state.enableCounting===true? 'GO!': '...'}
      <br/><br/>
      {gui.textField('counter', 'Count')}
      {gui.button('add','increment')}
      <br/><br/>
      {gui.textField('topic', 'Topic')}
      {gui.button('loadrandompicture', 'Load picture about that')}
      <br/><br/>
      {state.loading? 'loading..': ''}
      <br/><br/>
      {gui.image('image', 'Your random image:')}
      <br/>
      <hr/>
      <br/>
    </div>);
}

export default {
  'guistack': renderGuiStack,
  'todomvc':  renderTodo
};

