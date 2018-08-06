
import React, { Component } from 'react';
import { View, Text, TouchableOpacity, AsyncStorage, Linking, Platform } from 'react-native';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import URLSearchParams from 'url-search-params';
import core from './forest-core';
import ForestCommon from './forest-common';

function persist(o){
  return AsyncStorage.setItem(core.toUID(o.UID), JSON.stringify(o, null, 2)).then(() => o.UID + ': ' + [].concat(o.is).join(' '));
}

function fetch(uid){
  return AsyncStorage.getItem(uid).then(s=>JSON.parse(s))
}

function recache(){
  return AsyncStorage.getAllKeys()
    .then(uids => Promise.all(uids.map(uid => fetch(uid).then(o=>o.Cache==='keep-active'? o: null)))
                   .then(actives => actives.filter(o=>o)))
}

function query(is, scope, query){ }

core.setPersistence({ persist, fetch, query, recache });

export default class Forest extends ForestCommon {

  constructor(props) {
    super(props)
  }

  static dropAll(actually){
    return AsyncStorage.getAllKeys()
      .then(uids => console.log(actually? '*************** dropping': '(not dropping)', uids) || actually && AsyncStorage.clear());
  }

  viewingCB=null;

  componentDidMount(){
    super.componentDidMount();
    if(this.viewingCB){
      if(Platform.OS !== 'ios'){
        Linking.getInitialURL()
          .then(url=>this.callViewing(url))
          .catch(err => console.log('unable to get initial URL:', err));
      } else {
        Linking.addEventListener('url', this.handleOpenURL); // what if there's already been an event?
      }
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Linking.removeEventListener('url', this.handleOpenURL);
  }

  handleOpenURL = e => this.callViewing(e.url);

  urlRE=/.*?:\/\/.*?\/(.*?)\?(.*)/;

  callViewing(url){
    if(!this.viewingCB) return;
    if(!url) return;
    const m = url.match(this.urlRE);
    if(!m) return;
    const route=m[1];
    const query=m[2];
    this.viewingCB(route, new URLSearchParams(query));
  }

  setViewing(v){ this.viewingCB=v; }

  Button(name, {label='', children=null, style=null}={}){
    const nested = children && children.length;
    return <TouchableOpacity
             delayPressIn={0}
             delayLongPress={800}
             onPressIn={() => this.onChange(name, true)}
             onLongPress={() => this.onChange(name, true)}
             onPressOut={() => this.onChange(name, false)}
             style={nested && style}
           >
             {nested && children || <Text style={style}>{label}</Text>}
           </TouchableOpacity>
  }
}

