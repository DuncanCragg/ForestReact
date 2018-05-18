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

  var uids = _forest2.default.cacheObjects([{ UID: 'uid-1', is: 'guistack', name: 'Forest App', list: ['uid-3', 'uid-2'] }, { UID: 'uid-2', Evaluator: evalFed, is: 'fedexample', counter: 42, topic: 'banana', watching: 'uid-3' }, { UID: 'uid-3', Evaluator: evalFed, is: 'fedexample', counter: 99, topic: 'mango' }]);

  function evalFed(object) {
    var loadButtonPressed = !object('fetching') && object('userState.loadrandompicture');
    var addButtonPressed = !object('adding') && object('userState.add');
    return Object.assign({}, object('Timer') === 0 && { Timer: 2000, enableCounting: !object('enableCounting') }, addButtonPressed && { counter: object('counter') + 1 }, !object('enableCounting') && { counter: 0 }, object('watching') && { counter: object('watching.counter') }, true && { topic: object('userState.topic').toLowerCase() }, (!object('giphy') || loadButtonPressed) && { giphy: 'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=' + object('topic') }, object('giphy.data') && { gdata: object('giphy.data') }, true && { loading: !object('giphy.data') }, object('gdata') && { image: object('gdata.fixed_height_small_url') }, true && { adding: object('userState.add') }, true && { fetching: object('userState.loadrandompicture') });
  }

  _forest2.default.renderDOM(React.createElement(_renderfed2.default, { uid: uids[0] }));
});