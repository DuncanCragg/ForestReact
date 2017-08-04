
# Forest

A React-based, Javascript implementation of the ideas of [FOREST](https://link.springer.com/chapter/10.1007/978-1-4419-8303-9_7) - "Functional
Observer REST" - replacing Redux in your dynamic Web pages.


## _"Functional Observer REST?"_

Yes, *Functional Observer* is a programming model that is entirely based around state
and pure functional transformation from state to state.

There are no actions, events, messages, commands, calls, queues, streams, etc. in
Functional Observer, just state observing other state and updating itself. The React
component state observes other states around it:

`ReactComponentState` =

#### &nbsp; ƒ(
&nbsp; &nbsp; `ReactComponentState`,<br/>
&nbsp; &nbsp; `UserEnteredState`,<br/>
&nbsp; &nbsp; `PeerReactComponentStates`,<br/>
&nbsp; &nbsp; `RemoteJSONAPIStates`<br/>
#### &nbsp; )

FOREST (Functional Observer REST) just adds HTTP to that model, via the `RemoteJSONAPIStates` above.

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

forest.storeObjects(
  [{ evaluate: evalMin,
     is: 'minimal',
     counter: 17,
     message: 'Hello World!'
  }],
  renderers
);

function evalMin(state){
  return Object.assign({},
    (!state('inc') && state('user-state.inc'))? { counter: state('counter') + 1 }:{},
    { inc: !!state('user-state.inc') },
    { message: state('user-state.message').toLowerCase() }
  );
}
```

See how, in `evalMin`, the returned component state is a function of previous state and
user state. It always reads these states around it through its own state, because in
Forest, _the dot `.` can jump across to those other objects to observe them_ which makes
the whole process incredibly powerful, consistent and simple.

The fact that Forest doesn't use actions or events means that detecting change is done
via comparison to previous state, as in the expression `!state('inc') && state('user-state.inc')`,
which detects that the user-state `inc` button is `true` (down) while the known state
was `false` (up). The line `inc: !!state('user-state.inc')` then records the latest
state for the next time around.

It can also discover peer component and remote API state in the same way in order to
determine it's own next state (e.g. `state('selectorpeer.choice')` or
`state('remote324.choicelist')`).

## _"Why is that better?"_

It's consistent and simple, putting a lot of power into small state reducer or
transformation functions and expressions - one single dot `.` can give a component
access to all the state around it, locally and remotely, _and_ subscribe it to that
state so that it's notified if it changes. All the interactive logic is held in pure
functions.

## Credit

Thanks to my Tes colleague, [Federico 'framp' Rampazzo](https://github.com/framp), for
the inspiration, example and base code from [Storry](https://github.com/framp/storry)!



