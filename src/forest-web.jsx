import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import { ForestCommon, ForestWidget } from './forest-common';

function persist(o){
  return Promise.resolve(localStorage.setItem(core.toUID(o.UID), core.stringify(o)))
          .then(() => o.UID + ': ' + [].concat(o.is).join(' '));
}

function fetch(uid){
  return Promise.resolve(localStorage.getItem(uid)).then(s=>JSON.parse(s));
}

function recache(){
  return Promise.resolve(Object.keys(localStorage))
    .then(uids => Promise.all(uids.map(uid => fetch(uid).then(o=>o.Cache==='keep-active'? o: null)))
                         .then(actives => actives.filter(o=>o)));
}

function query(is, scope, query){ }

try{ localStorage && core.setPersistence({ persist, fetch, query, recache }); } catch(e){}

class Forest extends ForestCommon {

  constructor(props){
    super(props);
  }

  static dropAll(actually){
    return Promise.resolve(Object.keys(localStorage))
      .then(uids => console.log(actually? '*************** dropping': '(not dropping)', uids) || (actually && localStorage.clear()));
  }

  button(name, { label = '', className = '' } = {}) {
    //  core.updateObject(this.userStateUID, { [name]: false });
    return (
      <button
        className={className}
        onMouseDown={e => this.onChange(name, true)}
        onMouseUp={e => this.onChange(name, false)}
      >
        {label}
      </button>
    );
  }

  textField(name, { label = '', className = '', placeholder = '' } = {}) {
    core.updateObject(this.userStateUID, { [name + '-submitted']: false });
    return (
      <span>
        <span>{label}</span>
        <input
          className={className}
          type="text"
          onChange={e => this.onChange(name, e.target.value)}
          onKeyDown={e => this.onKeyDown(name, e)}
          value={this.onRead(name) || ''}
          placeholder={placeholder}
          autoFocus={true}
        />
      </span>
    );
  }

  image(name, { label = '', className = '' } = {}) {
    return (
      <span>
        {label} <img className={className} src={this.object(name)} />
      </span>
    );
  }

  checkbox(name, { label = '', className = '' } = {}) {
    return label ? (
      <div>
        <input
          className={className}
          type="checkbox"
          onChange={e => this.onChange(name, e.target.checked)}
          checked={!!this.onRead(name)}
        />
        <span>{label}</span>
      </div>
    ) : (
      <input
        className={className}
        type="checkbox"
        onChange={e => this.onChange(name, e.target.checked)}
        checked={!!this.onRead(name)}
      />
    );
  }
}

export { Forest, ForestWidget, Forest as default };
