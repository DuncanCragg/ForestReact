
# Forest

A React-based, Javascript implementation of the ideas of [FOREST](https://link.springer.com/chapter/10.1007/978-1-4419-8303-9_7) - "Functional
Observer REST" - replacing Redux in your dynamic Web pages.


## _"Functional Observer REST?"_

Yes, *Functional Observer* is a programming model that is entirely based around state
and pure functional transformation from state to state.

There are no actions, events or messages in Functional Observer, just state observing
other state and updating itself.

FOREST (Functional Observer REST) just adds HTTP to that model.

## _"Sounds very academic! Show me the code!!"_

OK, here's a minimal example:

```javascript
function renderMin(state,gui){
  return (
    <div>
      <hr/>
      <span>Count: {state.counter}</span>&nbsp;&nbsp;&nbsp;
      {gui.button('inc','increment')}
      <br/><br/>
      {gui.textField('message', '')}
      <br/><br/><hr/><br/>
    </div>);
}

const renderers = {
  'minimal': renderMin
};

forest.renderTree(
  { UID: 'uid-1',
    is: 'minimal',
    evaluate: evalMin,
    counter: 17,
    message: 'Hello World!'
  },
  renderers
);

function evalMin(state){
  return Object.assign({},
    (!state('inc') && state('user-state.inc'))? { counter: state('counter') + 1 }:{},
    { inc: !!state('user-state.inc') },
    (typeof state('user-state.message') !== 'undefined')? { message: state('user-state.message').toLowerCase() }:{}
  );
}
```

## Credit

Thanks to my Tes colleague, [Federico 'framp' Rampazzo](https://github.com/framp), for
the inspiration, example and base code from [Storry](https://github.com/framp/storry)!



