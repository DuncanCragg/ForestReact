
import Forest from './forest-web';
import React from 'react';

class GuiStack extends Forest {
  render(){
    if(!this.object('list')) return null;
    return (
      <div>
        <div>{this.object('name')}</div>
        {this.object('list').map(uid => <Fed uid={uid} key={uid} />)}
      </div>);
  }
}

class Fed extends Forest {
  //{false && Object.keys(this.object).map(key => (typeof(this.object[key]) !== 'function') && <span key={key}> | {key}: {String(this.object[key])} | </span>)}
  render(){
    return (
      <div>
        <hr/>
        <br/><br/>
        {this.object('enableCounting')? 'GO!': '...'}
        <br/><br/>
        {this.textField('counter', {label: 'Count'})}
        {this.button('add', {label: 'increment'})}
        <br/><br/>
        {this.textField('topic', {label: 'Topic'})}
        {this.button('load', {label: 'Load picture about that'})}
        <br/><br/>
        {this.object('loading')? 'loading..': ''}
        <br/><br/>
        {this.image('image', {label: 'Your random image:'})}
        <br/>
        <hr/>
        <br/>
      </div>);
  }
}

export default GuiStack;

