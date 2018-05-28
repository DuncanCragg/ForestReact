
import React, { Component } from 'react';
import { Text, TouchableHighlight } from 'react-native';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import ForestCommon from './forest-common';

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

