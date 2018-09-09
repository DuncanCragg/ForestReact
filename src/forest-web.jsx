import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import superagent from 'superagent';
import _ from 'lodash';
import core from './forest-core';
import ForestCommon from './forest-common';

class Forest extends ForestCommon {

  constructor(props) {
    super(props)
  }

  button(name, {label='', className=''}={}){
//  core.updateObject(this.userStateUID, { [name]: false });
    return <button className={className} onMouseDown={e => this.onChange(name, true)} onMouseUp={e => this.onChange(name, false)}>{label}</button>;
  }

  textField(name, {label='', className='', placeholder=''}={}){
    core.updateObject(this.userStateUID, { [name+'-submitted']: false });
    return (
      <span><span>{label}</span>
            <input className={className}
                   type="text"
                   onChange={e => this.onChange(name, e.target.value)}
                   onKeyDown={e => this.onKeyDown(name, e)}
                   value={this.onRead(name)||''}
                   placeholder={placeholder}
                   autoFocus={true} />
      </span>
    );
  }

  image(name, {label='', className=''}={}){
    return <span>{label} <img className={className} src={this.object(name)} /></span>;
  }

  checkbox(name, {label='', className=''}={}){
    return label ? <div><input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={!!this.onRead(name)} /><span>{label}</span></div>:
                        <input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={!!this.onRead(name)} />;
  }
}

const callAll = (...fns) => (...args) => fns.forEach(fn => fn && fn(...args));

class Input extends Component {
  constructor(props) {
    super(props);
    this.KEY_ENTER = 13;
  }

  componentDidMount() {
    core.updateObject(this.props.userStateUID, { [`${this.props.name}-submitted`]: false });
  }

  onChange = e => {
    console.log(e.target, 'EVENT TARGET VALUE', e.target.value.length);
    core.updateObject(this.props.userStateUID, { [this.props.name]: e.target.value });
  };

  onKeyDown = e => {
    if (e.keyCode !== this.KEY_ENTER) {
      core.updateObject(this.props.userStateUID, { [`${this.props.name}-submitted`]: false });
      return;
    }
    core.updateObject(this.props.userStateUID, { [`${this.props.name}-submitted`]: true });
    e.preventDefault();
  };

  onRead = e => {
    const stateValue = core.object(this.props.userStateUID, this.props.name);
    core.updateObject(this.props.userStateUID, { [this.props.name]: stateValue });
    console.log(stateValue, 'OBJECT VALUE');
    return stateValue;
  };

  getTextInputProps = (props = {}) => ({
    onChange: callAll(this.onChange, props.onChange),
    value: this.onRead() || '',
    type: 'text',
    placeholder: this.props.placeholder,
    autoFocus: true,
    onKeyDown: this.onKeyDown,
  });

  getAllProps = () => ({
    getTextInputProps: this.getTextInputProps,
  });

  render() {
    if (this.props.children) {
      return this.props.children(this.getAllProps());
    }

    return (
      <div>
        <span>{this.props.label}</span>
        <input {...this.getTextInputProps()} />
      </div>
    );
  }
}

class Button extends Component {
  buttonDown = () => {
    core.updateObject(this.props.userStateUID, { [this.props.name]: true });
  };

  buttonUp = () => {
    core.updateObject(this.props.userStateUID, { [this.props.name]: false });
  };

  toggle = () => {
    const stateValue = core.object(this.props.userStateUID, this.props.name);
    console.log(stateValue, 'TOGGLER');
    core.updateObject(this.props.userStateUID, { [this.props.name]: !stateValue });
  };

  getButtonProps = (props = {}) => ({
    onMouseUp: callAll(this.buttonDown, props.onMouseUp),
    onMouseDown: callAll(this.buttonUp, props.onMouseDown),
  });

  getToggleProps = (props = {}) => ({
    onClick: callAll(this.toggle, props.onClick),
  });

  getAllProps = () => ({
    getButtonProps: this.getButtonProps,
    getToggleProps: this.getToggleProps,
  });

  render() {
    if (this.props.children) {
      return this.props.children(this.getAllProps());
    }

    return (
      <button className={this.props.css} style={this.props.inlineStyles} {...this.getButtonProps()}>
        {this.props.label}
      </button>
    );
  }
}

export { Button, Input, Forest as default };
