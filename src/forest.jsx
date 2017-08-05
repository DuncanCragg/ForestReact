
import { Component } from 'React';

export default class Forest extends Component {

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

  static renderers;
  static objects = {};

  static spawnObject(o){
    const UID = o.UID || this.makeUID();
    Forest.objects[UID] = Object.assign(o, { UID, Notify: [] });
    return UID;
  }

  static storeObjects(list, renderers){
    const uids=list.map(state => Forest.spawnObject(state));
    Forest.renderers = renderers;
    ReactDOM.render(
      this.wrapObject(uids[0]),
      document.getElementById('root')
    );
  }

  static wrapObject(uid){
    return <Forest state={Forest.objects[uid]} key={uid}></Forest>
  }

  static fetching = {};

  static setNotify(o,uid){
    if(o.Notify.indexOf(uid) === -1) o.Notify.push(uid);
  }

  static ensureObjectState(UID, observer){
    const o = Forest.objects[UID];
    if(o){
      Forest.setNotify(o,observer);
      return;
    }
    Forest.objects[UID] = { UID, Notify: [ observer ] };
  }

  static difference(object, base) {
    function changes(object, base) {
      return _.transform(object, function(result, value, key) {
        if (!_.isEqual(value, base[key])) {
          result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
        }
      });
    }
    return changes(object, base);
  }

  static setObjectState(uid, state){
    const newState = Object.assign({}, Forest.objects[uid], state);
    const changed = !_.isEqual(Forest.objects[uid], newState);
    if(changed){
      // console.log('changed: ', Forest.difference(Forest.objects[uid], newState))
      Forest.objects[uid] = newState;
      Forest.objects[uid].Notify.map(o => setTimeout(Forest.objects[o].doEvaluate, 1));
    }
    return changed;
  }

  UID;
  userState = {};

  constructor(props) {
    super(props)
    this.state = props.state || {};
    this.UID = this.state.UID;
    const userStateUID = this.UID + '-1';
    this.userState.UID = userStateUID;
    this.state['user-state'] = userStateUID; // :0(
    this.userState.Notify = [];
    this.state.doEvaluate = this.doEvaluate.bind(this);
    this.stateAccess = this.stateAccess.bind(this);
    this.evaluate = this.state.evaluate;
    Forest.objects[userStateUID] = this.userState;
  }

  componentDidMount() { this.doEvaluate(); }

  onRead(name){
    const value = this.state[name];
    this.userState[name]=value;
    return value;
  }

  onChange = (name, value) => {
    this.userState[name]=value;
    this.doEvaluate();
  }

  KEY_ENTER = 13;

  onKeyDown(name, e){
    if (e.keyCode !== this.KEY_ENTER){
      this.userState[name+'-submitted']=false;
      return;
    }
    e.preventDefault();
    this.userState[name+'-submitted']=true;
    this.doEvaluate();
  }

  stateAccess(p,m) { const r = ((path, match)=>{
    const uid = this.UID;
    const state = Forest.objects[uid];
    if(path==='.') return state;
    const pathbits = path.split('.');
    if(pathbits.length==1){
      if(path === 'Timer') return state.Timer || 0;
      const val = state[path];
      if(val == null) return null;
      if(val.constructor === Array){
        if(match == null || match.constructor !== Object) return val;
        return val.filter(v => {
          if(v.constructor !== String) return false;
          const o = Forest.objects[v];
          if(!o) return false;
          Forest.setNotify(o,uid);
          return Object.keys(match).every(k => o[k] === match[k]);
        });
      }
      return (match == null || val == match)? val: null;
    }
    const val = state[pathbits[0]];
    if(val == null) return null;
    if(val.constructor !== String) return null;
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
    Forest.setNotify(linkedObject,uid);
    if(pathbits[1]==='') return linkedObject;
    return linkedObject[pathbits[1]];
  })(p,m);
    // console.log('path',p,'match',m,'=>',r);
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

  debug = false;

  doEvaluate() {
    if(!this.evaluate) return;
    for(var i=0; i<4; i++){
      if(this.debug) console.log('>>>>>>>>>>>>> ', stateAccess('.'), stateAccess('user-state.'));
      const newState = this.evaluate(this.stateAccess);
      if(this.debug) console.log('<<<<<<<<<<<<< new state bits: ', newState);
      this.checkTimer(newState.Timer);
      const changed = Forest.setObjectState(this.UID, newState);
      if(!changed) break;
    }
    this.setState(Forest.objects[this.UID]);
  }

  // ------------- Widgets ---------------

  button(name, label, className){
    if(this.userState[name]===undefined) this.userState[name] = false;
    return <button className={className} onMouseDown={e => this.onChange(name, true)} onMouseUp={e => this.onChange(name, false)}>{label}</button>;
  }

  textField(name, label, className, placeholder){
    if(this.userState[name]===undefined) this.userState[name] = '';
    if(this.userState[name+'-submitted']===undefined) this.userState[name+'-submitted']=false;
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

  image(name, label, className){
    return <span>{label} <img className={className} src={this.state[name]} /></span>;
  }

  checkbox(name, className){
    if(this.userState[name]===undefined) this.userState[name] = false;
    return <input className={className} type="checkbox" onChange={e => this.onChange(name, e.target.checked)} checked={this.onRead(name)} />;
  }
  // -------------------------------------

  render () {
    return Forest.renderers[this.state.is](this.state, this);
  }
}

