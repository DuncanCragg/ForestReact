
import Forest from 'forest';
import renderers from 'renderfed';

Forest.renderTree(
  { UID: 'uid-1',
    is: 'app',
    name: 'Forest App',
    children: [
      {UID: 'uid-2', evaluate: evalFed, is: 'fedexample', counter: 42, topic: 'banana', watching: 'uid-3'},
      {UID: 'uid-3', evaluate: evalFed, is: 'fedexample', counter: 99, topic: 'mango', children: [
        {UID: 'uid-4', evaluate: evalFed, is: 'fedexample', counter: 17, topic: 'damson'}
      ] }
    ]
  },
  renderers
);

function evalFed(state){
  return {
    Timer: 4000,
    enableCounting: state('Timer') === 0? !state('enableCounting'): state('enableCounting'),
    counter: state('watching.counter') || (state('enableCounting')!==false? (!state('adding') && state('user-state.add')? state('counter')+1: state('counter')): 0),
    topic: (typeof state('user-state.topic') === 'undefined' && state('topic')) || state('user-state.topic').toLowerCase(),
    giphy: ((state('fetching') === undefined) || (!state('fetching') && state('user-state.loadrandompicture')))? 'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + state('topic'): state('giphy'),
    image: state('giphy.fixed_height_small_url') || state('image'),
    loading: !state('giphy.fixed_height_small_url'),
    adding: !!state('user-state.add'),
    fetching: !!state('user-state.loadrandompicture')
  };
}

