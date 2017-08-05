
import Forest from 'forest';

function renderGuiStack(state){
  return (
    <div>
      <div>{state('name')}</div>
      {state('list').map(uid => Forest.wrapObject(uid))}
    </div>);
}

      //{false && Object.keys(state).map(key => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
function renderFed(state, userState){
  return (
    <div>
      <hr/>
      <br/><br/>
      {state('enableCounting')===true? 'GO!': '...'}
      <br/><br/>
      {userState.textField({name: 'counter', label: 'Count'})}
      {userState.button({name: 'add', label: 'increment'})}
      <br/><br/>
      {userState.textField({name: 'topic', label: 'Topic'})}
      {userState.button({name: 'loadrandompicture', label: 'Load picture about that'})}
      <br/><br/>
      {state('loading')? 'loading..': ''}
      <br/><br/>
      {userState.image({name: 'image', label: 'Your random image:'})}
      <br/>
      <hr/>
      <br/>
    </div>);
}

export default {
  'guistack':   renderGuiStack,
  'fedexample': renderFed
};

