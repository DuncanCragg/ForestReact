
import React, { Component } from 'react';
import { Text, TouchableHighlight, AsyncStorage } from 'react-native';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import ForestCommon from './forest-common';

function persist(o){
  return AsyncStorage.setItem(core.toUID(o.UID), JSON.stringify(o, null, 2)).then(()=>[].concat(o.is).join(' '));
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
}

