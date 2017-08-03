
import { Component } from 'React';

export default class Forest extends Component {

  static renderers;
  static objects = {};

  static store(list, renderers){
    list.map((o) => Forest.objects[o.UID] = o);
    Forest.renderers = renderers;
    const top = list[0];
    ReactDOM.render(
      <Forest state={top}></Forest>,
      document.getElementById('root')
    );
  }

  static fetching = {};

  static ensureObjectState(uid, observer){
    if(Forest.objects[uid]) return;
    Forest.objects[uid] = { UID: uid, Notify: [ observer ] };
  }

  static setObjectState(uid, state){
    const newState = Object.assign({}, Forest.objects[uid], state);
    const changed = !_.isEqual(Forest.objects[uid], newState);
    if(changed){
      Forest.objects[uid] = newState;
      Forest.objects[uid].Notify.map(o => setTimeout(Forest.objects[o].doEvaluate, 1));
    }
    return changed;
  }

  static makeUID(){
    /*jshint bitwise:false */
    var i, random;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
      uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
  }

  static spawnObject(state){
    const uid = this.makeUID();
    const o = Object.assign(state, { UID: uid });
    Forest.objects[uid] = o;
    return uid;
  }

  UID;
  userState = {};

  constructor(props) {
    super(props)
    this.state = props.state || {};
    this.UID = this.state.UID;
    const userStateUID = this.UID + '-1';
    this.userState.UID = userStateUID;
    this.state['user-state'] = userStateUID;
    this.state.Notify = [];
    this.userState.Notify = [];
    this.state.doEvaluate = this.doEvaluate.bind(this);
    this.stateAccess = this.stateAccess.bind(this);
    this.evaluate = this.state.evaluate;
    Forest.objects[userStateUID] = this.userState;
  }

  componentDidMount() { this.doEvaluate(); }

  onChange = (name, value) => {
    this.userState[name]=value;
    this.doEvaluate();
  }

  ENTER_KEY = 13;

  onKeyDown(name, e){
    if (e.keyCode !== this.ENTER_KEY){
      this.userState[name+'-submitted']=false;
      return;
    }
    e.preventDefault();
    this.userState[name+'-submitted']=true;
    this.doEvaluate();
  }

  stateAccess(p) { const r = ((path)=>{
    const uid = this.UID;
    const state = Forest.objects[uid];
    const pathbits = path.split('.');
    if(pathbits.length==1){
      if(path === 'Timer') return state.Timer || 0;
      return state[path];
    }
    const val = state[pathbits[0]];
    if(typeof val === 'undefined' || val === null) return null;
    if(val.constructor !== String){ console.log('Not implemented yet', path, val); return null; }
    const linkedObject = Forest.objects[val];
    if(!linkedObject){
      if(!Forest.fetching[val]){
        Forest.fetching[val]=true;
        Forest.ensureObjectState(val, uid);
        fetch(val)
        .then(res => { Forest.fetching[val]=false; return res.json()})
        .then(json => Forest.setObjectState(val, json.data));
      }
      return null;
    }
    if(linkedObject.Notify.indexOf(uid) === -1) linkedObject.Notify.push(uid);
    if(pathbits[1]==='') return linkedObject;
    return linkedObject[pathbits[1]];
  })(p);
    // console.log('path',p,'=>',r);
    return r;
  }

  timerId = null;

  checkTimer(time){
    if(time && time > 0 && !this.timerId){
      this.timerId = setTimeout(() => {
        this.timerId = null;
        Forest.setObjectState(this.UID, { Timer: 0 });
        this.doEvaluate();
      }, time);
    }
  }

  doEvaluate() {
    if(!this.evaluate) return;
    for(var i=0; i<4; i++){
      const newState = this.evaluate(this.stateAccess);
      this.checkTimer(newState.Timer);
      const changed = Forest.setObjectState(this.UID, newState);
      if(!changed) break;
    }
    this.setState(Forest.objects[this.UID]);
  }

  // ------------- Widgets ---------------

  button(name, label, className){
    return <button className={className} onMouseDown={(e) => this.onChange(name, true)} onMouseUp={(e) => this.onChange(name, false)}>{label}</button>;
  }

  textField(name, label, className, placeholder){
    return (
      <span><span>{label}</span>
            <input className={className}
                   type="text"
                   onChange={(e) => this.onChange(name, e.target.value)}
                   onKeyDown={(e) => this.onKeyDown(name, e)}
                   value={this.state[name]}
                   placeholder={placeholder}
                   autoFocus={true} />
      </span>
    );
  }

  image(name, label, className){
    return <span>{label} <img className={className} src={this.state[name]} /></span>;
  }

  checkbox(name, className){
    return <input className={className} type="checkbox" onChange={(e) => this.onChange(name, e.target.checked)} checked={this.state[name]} />;
  }

  // -------------------------------------

  render () {
    return Forest.renderers[this.state.is](this.state, this);
  }
}

