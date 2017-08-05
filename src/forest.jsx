
import { Component } from 'React';
import core from 'forest-core';

export default class Forest extends Component {

  static renderers;

  static storeObjects(list, renderers){
    const uids = core.storeObjects(list);
    Forest.renderers = renderers;
    ReactDOM.render(
      Forest.wrapObject(uids[0]),
      document.getElementById('root')
    );
  }

  static wrapObject(uid){
    return <Forest state={core.objects[uid]} key={uid}></Forest>
  }

  static spawnObject(o){
    return core.spawnObject(o);
  }

  UID;
  userStateUID;

  constructor(props) {
    super(props)
    this.state = props.state || {};
    this.UID = this.state.UID;
    this.userStateUID = core.spawnObject({});
    this.state.userState = this.userStateUID;
    this.state.doEvaluate = this.doEvaluate.bind(this);
    this.stateAccess = this.stateAccess.bind(this);
    this.evaluate = this.state.evaluate;
  }

  componentDidMount() { this.doEvaluate(); }

  notifyReact(){
    this.setState({});
  }

  // ------------ ONF/ONP -----------------------

  stateAccess(path, match) {
    return core.stateAccess(this.UID, path, match);
  }

  timerId = null;

  checkTimer(time){
    if(time && time > 0 && !this.timerId){
      this.timerId = setTimeout(() => {
        this.timerId = null;
        core.setObjectState(this.UID, { Timer: 0 });
        this.doEvaluate();
      }, time);
    }
  }

  static debug = false;

  doEvaluate() {
    if(!this.evaluate) return;
    for(var i=0; i<4; i++){
      if(this.debug) console.log(i, '>>>>>>>>>>>>> ', this.stateAccess('.'));
      if(this.debug) console.log(i, '>>>>>>>>>>>>> ', this.stateAccess('userState.'));
      const newState = this.evaluate(this.stateAccess);
      if(this.debug) console.log(i, '<<<<<<<<<<<<< new state bits: ', newState);
      this.checkTimer(newState.Timer);
      const changed = core.setObjectState(this.UID, newState);
      if(!changed) break;
    }
    this.notifyReact();
  }

  // ------------- Widgets ---------------

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

  // ------

  button({name, label='', className=''}){
    core.setObjectState(this.userStateUID, { [name]: false });
    return <button className={className} onMouseDown={e => this.onChange(name, true)} onMouseUp={e => this.onChange(name, false)}>{label}</button>;
  }

  textField({name, label='', className='', placeholder=''}){
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

  image({name, label='', className=''}){
    return <span>{label} <img className={className} src={this.stateAccess(name)} /></span>;
  }

  checkbox({name, label='', className=''}){
    return <input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} />;
  }

  // -------------------------------------

  render () {
    return Forest.renderers[this.stateAccess('is')](this.stateAccess, this);
  }
}

