
# Forest

A React-based, Javascript implementation of the ideas of
[FOREST](https://link.springer.com/chapter/10.1007/978-1-4419-8303-9_7) -
"Functional Observer REST" - replacing Redux, Reselect and Redux Saga in
your dynamic Web pages.


## _"Functional Observer REST?"_

Yes, *Functional Observer* is a programming model that is entirely based around state
and pure functional transformation from state to state.

There are no actions, events, messages, commands, calls, queues, streams, etc. in
Functional Observer, just state observing other state and updating itself. The React
component state observes other states around it:

`ComponentState` =

#### &nbsp; ƒ(
&nbsp; &nbsp; `ComponentState`,<br/>
&nbsp; &nbsp; `UserEnteredState`,<br/>
&nbsp; &nbsp; `PeerComponentStates`,<br/>
&nbsp; &nbsp; `RemoteJSONAPIStates`<br/>
#### &nbsp; )

FOREST (Functional Observer REST) just adds HTTP to that model, via the `RemoteJSONAPIStates` above.

This simple model replaces all the complexity of Redux, Reselect and Redux Saga with a
highly declarative, visible set of state transformation functions, per component.

## _"Sounds very academic! Show me the code!!"_

OK, here's a minimal example:

```javascript
/* React render reading from `object` for this object's state */
/* Also has `this` for declaring widgets without actions or events! */
/* If the first, name arg matches an `object` fieldname, it reads from there */
class Min extends Forest{
  render(){
    return (
      <div>
        <hr/>
        {this.textField('message')}
        <br/><br/>
        <span>Count: {this.object('counter')}</span>&nbsp;&nbsp;&nbsp;
        {this.button('inc', {label: 'increment'})}
        <br/><br/><hr/><br/>
      </div>);
  }
}

/* Initial list of state objects */
const uids = Forest.cacheObjects(
  [{ Evaluator: evalMin,
     is: 'minimal',
     message: 'Hello World!',
     counter: 17
  }]
);

/* Where all the domain logic goes: pure functional */
/* transform/reduction of visible state to new component state: */
/* `state = f(state, state.user-state)` */
function evalMin(object){
  const incrementPushed  = !object('inc') && object('user-state.inc');
  return [
    true            && { message: object('user-state.message').toLowerCase() },
    incrementPushed && { counter: object('counter') + 1 },
    true            && { inc: object('user-state.inc') }
  ];
}

Forest.renderDOM(<Min uid={uids[0]} />);
```

An object reads the states around it (`user-state` above, but also peer states and API
states) 'through' its own state, because in Forest, _the dot `.` can jump across to those
other objects to read (and then observe) them_.

For example, above, `state('user-state.message')` reads `user-state`, which is simply the
UID of the `user-state` object, then fetches that object and reads its `message` property.
It then continues to be notified of changes to that object.

You can also discover peer component and remote API state in the same way
(e.g. `state('selectorPeerComponent.choice')` or `state('referenceData.choicelist')`).

The fact that Forest only uses state instead of actions or events means that detecting
change is done through comparison to previous state. For example, the expression above
`incrementPushed = !state('inc') && state('user-state.inc')` detects that the `user-state`
`inc` button is `true` (down) while the known state was `false` (up). The line 
`inc: state('user-state.inc')` then records the latest state for the next time around.

## _"Why is that better?"_

This consistent object graph traversal for all state (component, current user input,
peer component, remote data), combined with the pure functional state transformation
makes the domain logic simple and powerful.

It puts a lot of power into small state reducer or transformation functions and
expressions - one single dot `.` can give a component access to all the state around it,
locally and remotely, _and_ subscribe it to that state so that it's notified if it
changes. All the interactive logic is held in pure functions.

## Similar

The [Eve Language](http://witheve.com/) is one of the closest examples I've found of
a similar approach. The [Red Language](http://www.red-lang.org/) also has a number of
aspects in common.

## Credit

Thanks to my ex-Tes colleague, [Federico 'framp' Rampazzo](https://github.com/framp), for
the inspiration, example and base code from [Storry](https://github.com/framp/storry)!



