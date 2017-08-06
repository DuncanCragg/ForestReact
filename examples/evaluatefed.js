
import Forest from 'forest';
import renderers from 'renderfed';

Forest.storeObjects(
  [
    { UID: 'uid-1',                    is: 'guistack',   name: 'Forest App', list: ['uid-3', 'uid-2'] },
    { UID: 'uid-2', evaluate: evalFed, is: 'fedexample', counter: 42, topic: 'banana', watching: 'uid-3' },
    { UID: 'uid-3', evaluate: evalFed, is: 'fedexample', counter: 99, topic: 'mango' }
  ],
  renderers
);

function evalFed(state){
  const loadButtonPressed = !state('fetching') && state('userState.loadrandompicture');
  const addButtonPressed  = !state('adding') && state('userState.add')
  return Object.assign({},
    state('Timer') === 0                   && { Timer:    2000, enableCounting: !state('enableCounting') },
    addButtonPressed                       && { counter:  state('counter')+1 },
   !state('enableCounting')                && { counter:  0 },
    state('watching')                      && { counter:  state('watching.counter') },
    true                                   && { topic:    state('userState.topic').toLowerCase() },
  (!state('giphy') || loadButtonPressed)   && { giphy:   'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + state('topic') },
    state('giphy.fixed_height_small_url')  && { image:    state('giphy.fixed_height_small_url') },
    true                                   && { loading: !state('giphy.fixed_height_small_url') },
    true                                   && { adding:   state('userState.add') },
    true                                   && { fetching: state('userState.loadrandompicture') }
  );
}

