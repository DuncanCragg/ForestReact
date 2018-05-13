(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports', './forest', 'react'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports, require('./forest'), require('react'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports, global.forest, global.react);
    global.renderfed = mod.exports;
  }
})(this, function (module, exports, _forest, _react) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _forest2 = _interopRequireDefault(_forest);

  var _react2 = _interopRequireDefault(_react);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function renderGuiStack(state) {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'div',
        null,
        state('name')
      ),
      state('list').map(function (uid) {
        return _forest2.default.wrapObject(uid);
      })
    );
  }

  //{false && Object.keys(state).map(key => (typeof(state[key]) !== 'function') && <span key={key}> | {key}: {String(state[key])} | </span>)}
  function renderFed(state, userState) {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement('hr', null),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      state('enableCounting') ? 'GO!' : '...',
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      userState.textField('counter', { label: 'Count' }),
      userState.button('add', { label: 'increment' }),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      userState.textField('topic', { label: 'Topic' }),
      userState.button('loadrandompicture', { label: 'Load picture about that' }),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      state('loading') ? 'loading..' : '',
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      userState.image('image', { label: 'Your random image:' }),
      _react2.default.createElement('br', null),
      _react2.default.createElement('hr', null),
      _react2.default.createElement('br', null)
    );
  }

  exports.default = {
    'guistack': renderGuiStack,
    'fedexample': renderFed
  };
  module.exports = exports['default'];
});