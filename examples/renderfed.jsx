
import Forest from 'forest';

function renderGuiStack(state){
  return (
    <div>
      <div>{state.name}</div>
      {state.list.map((uid) => <Forest state={Forest.objects[uid]} key={uid}></Forest>)}
    </div>);
}

function renderFed(state, userState){
  return (
    <div>
      <hr/>
      {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
      <br/><br/>
      {state.enableCounting===true? 'GO!': '...'}
      <br/><br/>
      {userState.textField('counter', 'Count')}
      {userState.button('add','increment')}
      <br/><br/>
      {userState.textField('topic', 'Topic')}
      {userState.button('loadrandompicture', 'Load picture about that')}
      <br/><br/>
      {state.loading? 'loading..': ''}
      <br/><br/>
      {userState.image('image', 'Your random image:')}
      <br/>
      <hr/>
      <br/>
    </div>);
}

export default {
  'guistack':   renderGuiStack,
  'fedexample': renderFed
};

