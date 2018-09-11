import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import { ForestCommon } from './forest-common';

export default class Forest extends Component {
  render() {
    const { Provider, object } = this.props;
    return (
      <Provider value={object}>
        {this.props.children}
      </Provider>
    )
  }
}
