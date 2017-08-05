
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
/* React render reading from `state` for this object's state */
/* Also has `userState` for declaring widgets without actions or events! */
/* If the `name` field matches a `state` field, it reads from there */
function renderMin(state, userState){
  return (
    <div>
      <hr/>
      <span>Count: {state.counter}</span>&nbsp;&nbsp;&nbsp;
      {userState.button({name: 'inc', label: 'increment'})}
      <br/><br/>
      {userState.textField({name: 'message'})}
      <br/><br/><hr/><br/>
    </div>);
}

/* Mapping to above render function from a string matching */
/* the `is:` property of the backing state object. */
const renderers = {
  'minimal': renderMin
};

/* Initial list of state objects */
/* The first one is taken to be the 'top' state object. */
forest.storeObjects(
  [{ evaluate: evalMin,
     is: 'minimal',
     counter: 17,
     message: 'Hello World!'
  }],
  renderers
);

/* Where all the domain logic goes: pure functional */
/* transform/reduction of visible state to new component state: */
/* `componentState = f(componentState, userState)` */
function evalMin(state){
  const incrementPushed  = !state('inc') && state('userState.inc');
  return Object.assign({},
    incrementPushed? { counter: state('counter') + 1 }:{},
    { inc: state('userState.inc') },
    { message: state('userState.message').toLowerCase() }
  );
}
```

An object reads the states around it (`userState` above, but also peer states and API
states) 'through' its own state, because in Forest, _the dot `.` can jump across to those
other objects to read (and then observe) them_.

For example, above, `state('userState.message')` reads `userState`, which is simply the
UID of the userState object, then fetches that object and reads its `message` property.
It then continues to be notified of changes to that object.

This consistent object graph traversal combined with the pure functional state
transformation makes the domain logic simple and powerful.

The fact that Forest only uses state instead of actions or events means that detecting
change is done through comparison to previous state. For example, the expression above
`!state('inc') && state('userState.inc')` detects that the userState `inc` button is
`true` (down) while the known state was `false` (up). The line 
`inc: state('userState.inc')` then records the latest state for the next time around.

You can also discover peer component and remote API state in the same way
(e.g. `state('selectorPeerComponent.choice')` or `state('referenceData.choicelist')`).

## _"Why is that better?"_

It's consistent and simple, putting a lot of power into small state reducer or
transformation functions and expressions - one single dot `.` can give a component
access to all the state around it, locally and remotely, _and_ subscribe it to that
state so that it's notified if it changes. All the interactive logic is held in pure
functions.

## Credit

Thanks to my Tes colleague, [Federico 'framp' Rampazzo](https://github.com/framp), for
the inspiration, example and base code from [Storry](https://github.com/framp/storry)!



