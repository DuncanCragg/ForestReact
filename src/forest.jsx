
import React, { Component } from 'react';
import { Text, TouchableHighlight } from 'react-native';
import ReactDOM from 'react-dom';
import { renderToString } from 'react-dom/server';
import sa from 'superagent';

import core from './forest-core';


function doGet(url){
  fetch(url)
    .then(res => { fetching[url]=false; return res.json()})
    .then(json => setObjectState(url, json));
}

const localProps = ['Notifying', 'Timer', 'TimerId', 'Evaluator', 'ReactNotify', 'userState'];

function doPost(o){
  const data = _.omit(o, localProps);
  const uid = o.Notifying;
  return sa.post(uid)
    .timeout({ response: 9000, deadline: 10000 })
    .send(data)
    .then(x => x)
    .catch(e => console.error(e));
}

core.setNetwork({ doGet, doPost });


export default class Forest extends Component {

  static cacheObjects(list){
    return core.cacheObjects(list);
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

  static spawnObject(o){
    return core.spawnObject(o);
  }

  UID;
  userStateUID;

  constructor(props) {
    super(props)
    if(props.uid){
      this.state = core.objects[props.uid];
      this.UID = props.uid;
    }
    else{
      this.state = {};
      this.UID = undefined;
    }
    this.userStateUID = core.spawnObject({ 'is': 'user state' });
    this.state.userState = this.userStateUID;  // hardwiring from obj to react
    this.object = this.object.bind(this);
    this.notify = this.notify.bind(this);
    this.state.ReactNotify = this.notify;      // hardwiring from obj to react
  }

  mounted = false;

  componentDidMount() { this.mounted = true; core.doEvaluate(this.UID); }

  componentWillUnmount() { this.mounted = false; }

  object(path, match) {
    return core.object(this.UID, path, match);
  }

  notify(){
    if(this.mounted) this.setState({});
  }

  onRead(name){
    const value = this.object(name);
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
    return <span>{label} <img className={className} src={this.object(name)} /></span>;
  }

  checkbox(name, {label='', className=''}={}){
    return label ? <div><input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} /><span>{label}</span></div>:
                        <input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} />;
  }
}

