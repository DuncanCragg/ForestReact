
import Forest from 'forest';

function renderGuiStack(state){
  return (
    <div>
      <div>{state.name}</div>
      {state.list.map((uid) => <Forest state={Forest.objects[uid]} key={uid}></Forest>)}
    </div>);
}

function renderFed(state,gui){
  return (
    <div>
      <hr/>
      {Object.keys(state).map((key) => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
      <br/><br/>
      {state.enableCounting===true? 'GO!': '...'}
      <br/><br/>
      {gui.textField('counter', 'Count')}
      {gui.button('add','increment')}
      <br/><br/>
      {gui.textField('topic', 'Topic')}
      {gui.button('loadrandompicture', 'Load picture about that')}
      <br/><br/>
      {state.loading? 'loading..': ''}
      <br/><br/>
      {gui.image('image', 'Your random image:')}
      <br/>
      <hr/>
      <br/>
    </div>);
}

export default {
  'guistack':   renderGuiStack,
  'fedexample': renderFed
};

