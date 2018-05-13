(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['./forest', './renderfed'], factory);
  } else if (typeof exports !== "undefined") {
    factory(require('./forest'), require('./renderfed'));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.forest, global.renderfed);
    global.evaluatefed = mod.exports;
  }
})(this, function (_forest, _renderfed) {
  'use strict';

  var _forest2 = _interopRequireDefault(_forest);

  var _renderfed2 = _interopRequireDefault(_renderfed);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  _forest2.default.storeObjects([{ UID: 'uid-1', is: 'guistack', name: 'Forest App', list: ['uid-3', 'uid-2'] }, { UID: 'uid-2', evaluate: evalFed, is: 'fedexample', counter: 42, topic: 'banana', watching: 'uid-3' }, { UID: 'uid-3', evaluate: evalFed, is: 'fedexample', counter: 99, topic: 'mango' }], _renderfed2.default);

  function evalFed(state) {
    var loadButtonPressed = !state('fetching') && state('userState.loadrandompicture');
    var addButtonPressed = !state('adding') && state('userState.add');
    return Object.assign({}, state('Timer') === 0 && { Timer: 2000, enableCounting: !state('enableCounting') }, addButtonPressed && { counter: state('counter') + 1 }, !state('enableCounting') && { counter: 0 }, state('watching') && { counter: state('watching.counter') }, true && { topic: state('userState.topic').toLowerCase() }, (!state('giphy') || loadButtonPressed) && { giphy: 'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + state('topic') }, state('giphy.data') && { gdata: state('giphy.data') }, true && { loading: !state('giphy.data') }, state('gdata') && { image: state('gdata.fixed_height_small_url') }, true && { adding: state('userState.add') }, true && { fetching: state('userState.loadrandompicture') });
  }
});