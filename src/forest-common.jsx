
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';

const remote2ws = {};

let clientRemote = null;

function doGet(url){
  return superagent.get(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(clientRemote? { Remote: clientRemote}: {})
    .then(x => x.body)
    .catch(e => console.error('doGet',e,url));
}

function doPost(o,url){
  if(!core.isURL(url)) return;
  const data = _.omit(o, core.localProps);
  return superagent.post(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(clientRemote? { Remote: clientRemote}: {})
    .send(data)
    .then(x => x.body)
    .catch(e => console.error('doPost',e,url,data));
}

core.setNetwork({ doGet, doPost });

export default class ForestCommon extends Component {

  static wsRetry=1000

  static wsInit(host,port){

    const ws = new WebSocket(`ws://${host}:${port}`);

    ws.onopen = () => {
      if(clientRemote) ws.send(JSON.stringify({ Remote: clientRemote }));
    };

    ws.onmessage = (message) => {
      const json = JSON.parse(message.data);
      if(json.Remote){
        console.log('ws init:', json);
        remote2ws[json.Remote]=ws;
      }
      else
      if(json.UID){
        console.log('------------ws------------->>\n', message.data, '\n--------------------------->>');
        core.incomingObject(json);
      }
    };

    ws.onerror = (e) => {
      setTimeout(()=>{
        this.wsInit(host, port)
        this.wsRetry=Math.min(Math.floor(this.wsRetry*1.5), 10000)
        console.log('retry WebSocket in..', this.wsRetry/1000)
      }, this.wsRetry);
    };
  }

  static cacheObjects(list){
    return core.cacheObjects(list);
  }

  static reCacheObjects(){
    return core.reCacheObjects();
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

  static setEvaluator(name, evaluator){
    return core.setEvaluator(name, evaluator)
  }

  static runEvaluator(uid, params){
    return core.runEvaluator(uid, params);
  }

  static getObject(uid){
    return core.getObject(uid);
  }

  static makeUID(rem){
    return core.makeUID(rem);
  }

  static setRemote(Remote){
    clientRemote = Remote;
  }

  UID;
  userStateUID;

  constructor(props) {
    super(props)
    core.getObject(props.uid).then(o=>{
      this.state = o;
      this.UID = props.uid;
      this.userStateUID = core.spawnObject({ 'is': ['user', 'state'] });
      this.state.userState = this.userStateUID;  // hardwiring from obj to react
      this.object = this.object.bind(this);
      this.notify = this.notify.bind(this);
      this.state.ReactNotify = this.notify;      // hardwiring from obj to react
      core.runEvaluator(this.UID)
      this.notify()
    })
  }

  mounted = false;

  componentDidMount() { this.mounted = true; }

  componentWillUnmount() { this.mounted = false; }

  object(path, match) {
    return core.object(this.UID, path, match);
  }

  notify(){
    if(this.mounted) this.setState({});
  }

  onRead(name){
    const value = this.object(name);
    core.updateObject(this.userStateUID, { [name]: value });
    return value;
  }

  onChange(name, value){
    core.updateObject(this.userStateUID, { [name]: value });
  }

  KEY_ENTER = 13;

  onKeyDown(name, e){
    if (e.keyCode !== this.KEY_ENTER){
      core.updateObject(this.userStateUID, { [name+'-submitted']: false });
      return;
    }
    core.updateObject(this.userStateUID, { [name+'-submitted']: true });
    e.preventDefault();
  }
}

