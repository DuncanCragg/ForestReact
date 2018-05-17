
import Forest from './forest';
import GuiStack from './renderfed';

const uids = Forest.cacheObjects(
  [
    { UID: 'uid-1',                     is: 'guistack',   name: 'Forest App', list: ['uid-3', 'uid-2'] },
    { UID: 'uid-2', Evaluator: evalFed, is: 'fedexample', counter: 42, topic: 'banana', watching: 'uid-3' },
    { UID: 'uid-3', Evaluator: evalFed, is: 'fedexample', counter: 99, topic: 'mango' }
  ]
);

function evalFed(object){
  const loadButtonPressed = !object('fetching') && object('userState.loadrandompicture');
  const addButtonPressed  = !object('adding') && object('userState.add')
  return Object.assign({},
    object('Timer') === 0                  && { Timer:    2000, enableCounting: !object('enableCounting') },
    addButtonPressed                       && { counter:  object('counter')+1 },
   !object('enableCounting')               && { counter:  0 },
    object('watching')                     && { counter:  object('watching.counter') },
    true                                   && { topic:    object('userState.topic').toLowerCase() },
  (!object('giphy') || loadButtonPressed)  && { giphy:   'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + object('topic') },
    object('giphy.data')                   && { gdata:    object('giphy.data') },
    true                                   && { loading: !object('giphy.data') },
    object('gdata')                        && { image:    object('gdata.fixed_height_small_url') },
    true                                   && { adding:   object('userState.add') },
    true                                   && { fetching: object('userState.loadrandompicture') }
  );
}

Forest.renderDOM(<GuiStack uid={uids[0]} />);

