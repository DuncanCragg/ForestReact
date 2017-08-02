
function renderApp(state){
  return (
    <div>
      <div>{state.name}</div>
      {state.children}
    </div>);
}

function renderFed(state,gui){
  return (
    <div>
      <hr/>
      {Object.keys(state).map((key) => (key !== 'children' && typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
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
      {state.children}
    </div>);
}

export default {
  'app':        renderApp,
  'fedexample': renderFed
};

