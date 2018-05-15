
import React, { Component } from 'react';
import { Text, TouchableHighlight } from 'react-native';
import ReactDOM from 'react-dom';
import { renderToString } from 'react-dom/server';

import core from './forest-core';

export default class Forest extends Component {

  static renderers;

  static cacheObjects(list, renderers){
    Forest.renderers = renderers;
    return core.storeObjects(list);
  }

  static renderDOM(Cpt, rootId = 'root'){
    return new Promise((resolve, reject) => {
      ReactDOM.render(
        Cpt,
        document.getElementById(rootId),
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  static storeObjects(list, renderers, rootId = 'root'){
    const uids = core.storeObjects(list);
    Forest.renderers = renderers;
    return new Promise((resolve, reject) => {
      ReactDOM.render(
        Forest.wrapObject(uids[0]),
        document.getElementById(rootId),
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  static storeObjectsToString(list, renderers){
    const uids = core.storeObjects(list);
    Forest.renderers = renderers;
    return renderToString(Forest.wrapObject(uids[0]));
  }

  static storeObjectsInComponent(list, renderers){
    const uids = core.storeObjects(list);
    Forest.renderers = renderers;
    return Forest.wrapObject(uids[0]);
  }

  static wrapObject(uid){
    return <Forest uid={uid} key={uid}></Forest>
  }

  static spawnObject(o){
    return core.spawnObject(o);
  }

  UID;
  userStateUID;

  constructor(props) {
    super(props)
    if(props.state){
      this.state = props.state;
      this.UID = this.state.UID;
    }
    else
    if(props.uid){
      this.state = core.objects[props.uid];
      this.UID = props.uid;
    }
    else{
      this.state = {};
      this.UID = undefined;
    }
    this.userStateUID = core.spawnObject({});
    this.state.userState = this.userStateUID;  // hardwiring from obj to react
    this.state.react = this;                   //        --- " ---
    this.stateAccess = this.stateAccess.bind(this);
    this.notify = this.notify.bind(this);
  }

  mounted = false;

  componentDidMount() { this.mounted = true; core.doEvaluate(this.UID); }

  componentWillUnmount() { this.mounted = false; }

  stateAccess(path, match) {
    return core.stateAccess(this.UID, path, match);
  }

  notify(){
    if(this.mounted) this.setState({});
  }

  onRead(name){
    const value = this.stateAccess(name);
    core.setObjectState(this.userStateUID, { [name]: value });
    return value;
  }

  onChange = (name, value) => {
    core.setObjectState(this.userStateUID, { [name]: value });
  }

  KEY_ENTER = 13;

  onKeyDown(name, e){
    if (e.keyCode !== this.KEY_ENTER){
      core.setObjectState(this.userStateUID, { [name+'-submitted']: false });
      return;
    }
    core.setObjectState(this.userStateUID, { [name+'-submitted']: true });
    e.preventDefault();
  }

  button(name, {label='', className=''}={}){
//  core.setObjectState(this.userStateUID, { [name]: false });
    return <button className={className} onMouseDown={e => this.onChange(name, true)} onMouseUp={e => this.onChange(name, false)}>{label}</button>;
  }

  Button(name, {label='', className='', style=null}={}){
    return <TouchableHighlight
             delayPressIn={0}
             delayLongPress={800}
             onPressIn={() => this.onChange(name, true)}
             onLongPress={() => this.onChange(name, true)}
             onPressOut={() => this.onChange(name, false)}
           >
             <Text style={style}>{label}</Text>
           </TouchableHighlight>
  }

  textField(name, {label='', className='', placeholder=''}={}){
    core.setObjectState(this.userStateUID, { [name+'-submitted']: false });
    return (
      <span><span>{label}</span>
            <input className={className}
                   type="text"
                   onChange={e => this.onChange(name, e.target.value)}
                   onKeyDown={e => this.onKeyDown(name, e)}
                   value={this.onRead(name)}
                   placeholder={placeholder}
                   autoFocus={true} />
      </span>
    );
  }

  image(name, {label='', className=''}={}){
    return <span>{label} <img className={className} src={this.stateAccess(name)} /></span>;
  }

  checkbox(name, {label='', className=''}={}){
    return label ? <div><input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} /><span>{label}</span></div>:
                        <input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} />;
  }

  render () {
    return Forest.renderers[this.stateAccess('is')](this.stateAccess, this);
  }
}

