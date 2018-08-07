
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import auth from './auth';

function doGet(url){
  return superagent.get(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(auth.makeHTTPAuth())
    .then(x => x.body);
}

function doPost(o,url){
  if(!core.isURL(url)) return Promise.resolve(false);
  const data = _.omit(o, core.localProps);
  return superagent.post(url)
    .timeout({ response: 9000, deadline: 10000 })
    .set(auth.makeHTTPAuth())
    .send(data)
    .then(x => x.body)
    .catch(e => console.warn('doPost',e,url,data));
}

core.setNetwork({ doGet, doPost });

export default class ForestCommon extends Component {

  static setLogging(conf){
    return core.setLogging(conf);
  }

  static wsRetryIn=1000;
  static wsRetryDither=Math.floor(Math.random()*5000);

  static wsInit(host,port){

    const ws = new WebSocket(`ws://${host}:${port}`);

    ws.onopen = () => {
      this.wsRetryIn=1000;
      this.wsRetryDither=Math.floor(Math.random()*5000);
      ws.send(auth.makeWSAuth());
    };

    ws.onclose = () => {
      const timeout=this.wsRetryIn + this.wsRetryDither;
      this.wsRetryDither=0;
      console.log('WebSocket closed, retry in.. ', timeout/1000);
      setTimeout(()=>{
        this.wsRetryIn=Math.min(Math.floor(this.wsRetryIn*1.5), 15000)
        this.wsInit(host, port)
      }, timeout);
    }

    ws.onmessage = (message) => {
      const json = JSON.parse(message.data);
      if(json.Peer){
        console.log('ws init:', json);
        ws.Peer = json.Peer;
      }
      else
      if(json.UID){
        console.log('------------ws------------->>', ws.Peer);
        core.incomingObject(json);
      }
    };

    ws.onerror = e => {
      console.log('websocket error');
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

  static toUID(uid){
    return core.toUID(uid);
  }

  static setPeerIdentityUser(pi){
    return auth.setPeerIdentityUser(pi);
  }

  UID;
  userStateUID;

  constructor(props) {
    super(props)
    core.getObject(props.uid).then(o=>{
      if(!o){ console.error('No bound object', props.uid); return; }
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

  componentDidMount(){ this.mounted = true; }

  componentWillUnmount(){ this.mounted = false; }

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

