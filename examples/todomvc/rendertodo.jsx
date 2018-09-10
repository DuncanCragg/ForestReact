
import React from 'react';
import { Forest, ForestWidget } from '../forest-web';
import classNames from 'classnames';

function pluralize(count, word) {
  return count === 1 ? word : word + 's';
}

class TodoApp extends Forest {
  render(){
    const all       = [].concat(this.object('todos')          || []);
    const active    = [].concat(this.object('activeTodos')    || []);
    const completed = [].concat(this.object('completedTodos') || []);

    const numactive    = active.length;
    const numcompleted = completed.length;

    const shownTodos = { all, active, completed }[this.object('nowShowing')];

    return (
      <div>
        <header className="header">
          <h1>todos</h1>
          {this.textField('newTodo', {className: 'new-todo', placeholder: 'What needs to be done?'})}
        </header>

        {(shownTodos && shownTodos.length!=0) && (
        <section className="main">
          {this.checkbox('toggleAll', {className: 'toggle-all-X'})}
          <ul className="todo-list">
            {shownTodos.map(uid => <TodoItem uid={uid} key={uid} />)}
          </ul>
        </section>)}

        {(numactive!=0 || numcompleted!=0) && (
        <footer className="footer">
          <span className="todo-count"><strong>{numactive}</strong> {pluralize(numactive, 'item')} left</span>
          <ul className="filters">
            <li><a href="#/"          className={classNames({selected: this.object('nowShowing') === 'all'      })}>All</a></li> {' '}
            <li><a href="#/active"    className={classNames({selected: this.object('nowShowing') === 'active'   })}>Active</a></li> {' '}
            <li><a href="#/completed" className={classNames({selected: this.object('nowShowing') === 'completed'})}>Completed</a></li>
          </ul>
          <ForestWidget onRead={this.onRead} onChange={this.onChange} name="clearCompleted">
            {({ getWebButtonProps }) => <button {...getWebButtonProps()} className="clear-completed">Clear mango</button>}
          </ForestWidget>
        </footer>)}
      </div>
    );
  }
}

class TodoItem extends Forest {
  render(){
    return (
      <li className={classNames({completed: this.object('completed'), editing: this.object('editing')})}>
        <div className="view">
          {this.checkbox('completed', {className: 'toggle'})}
          <label onDoubleClick={this.handleEdit}>{this.object('title')}</label>
          <ForestWidget onRead={this.onRead} onChange={this.onChange} name="destroy">
            {({ getWebButtonProps }) => <button {...getWebButtonProps()} className="destroy"/>}
          </ForestWidget>
        </div>
        {this.textField('title', {className: 'edit'})}
      </li>
    );
  }
}

export default TodoApp;

