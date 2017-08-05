
import Forest from 'forest';

function pluralize(count, word) {
  return count === 1 ? word : word + 's';
}

function renderTodoApp(state, userState){

  const numactive    = state('activeTodos') && state('activeTodos').length;
  const numcompleted = state('completedTodos') && state('completedTodos').length;
  const shownTodos = {'all': state('todos'), 'active': state('activeTodos') || [], 'completed': state('completedTodos') || []}[state('nowShowing')];

      //{false && Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        {userState.textField({name: 'newTodo', className: 'new-todo', placeholder: 'What needs to be done?'})}
      </header>

      {(shownTodos.length!=0) && (
      <section className="main">
        {userState.checkbox({name: 'toggleAll', className: 'toggle-all-X'})}
        <ul className="todo-list">
          {shownTodos.map((uid) => Forest.wrapObject(uid))}
        </ul>
      </section>)}

      {(numactive!=0 || numcompleted!=0) && (
      <footer className="footer">
        <span className="todo-count"><strong>{numactive}</strong> {pluralize(numactive, 'item')} left</span>
        <ul className="filters">
          <li><a href="#/"          className={classNames({selected: state('nowShowing') === 'all'      })}>All</a></li> {' '}
          <li><a href="#/active"    className={classNames({selected: state('nowShowing') === 'active'   })}>Active</a></li> {' '}
          <li><a href="#/completed" className={classNames({selected: state('nowShowing') === 'completed'})}>Completed</a></li>
        </ul>
        {/* (numcompleted!=0) && */ userState.button({name: 'clearCompleted', label: 'Clear completed', className: 'clear-completed'})}
      </footer>)}
    </div>
  );
}

     //{false && Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
function renderTodoItem(state, userState){
  return (
    <li className={classNames({completed: state('completed'), editing: state('editing')})}>
      <div className="view">
        {userState.checkbox({name: 'completed', className: 'toggle'})}
        <label onDoubleClick={this.handleEdit}>{state('title')}</label>
        {userState.button({name: 'destroy', className: 'destroy'})}
      </div>
      {userState.textField({name: 'title', className: 'edit'})}
    </li>
  );
}

export default {
  'todoapp':  renderTodoApp,
  'todoitem': renderTodoItem
};

