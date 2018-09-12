import React from 'react';

const Context = React.createContext({
  onChange: () => {},
  onRead: () => {},
  object: () => {},
});

const Provider = props => (
  <Context.Provider value={props.childrenProps}>{props.children}</Context.Provider>
);

function connect(Component) {
  const Consumer = props => (
    <Context.Consumer>
      {({ onChange, onRead, object }) => (
        <Component onChange={onChange} onRead={onRead} object={object} {...props} />
      )}
    </Context.Consumer>
  );
  return Consumer;
}

export { Provider, connect, Context };
