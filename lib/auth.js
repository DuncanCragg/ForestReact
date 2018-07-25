(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module', 'exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module, exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod, mod.exports);
    global.auth = mod.exports;
  }
})(this, function (module, exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var Peer = null;
  var Identity = null;
  var User = null;

  function setPeerIdentityUser(_ref) {
    var peer = _ref.peer,
        identity = _ref.identity,
        user = _ref.user;

    if (peer) Peer = peer;
    if (identity) Identity = identity;
    if (user) User = user;
    return { peer: Peer, identity: Identity, user: User };
  }

  function makeHTTPAuth() {
    return Peer ? { Authorization: 'Forest Peer="' + Peer + '", User="' + (User || '') + '"' } : {};
  }

  function makeWSAuth() {
    return Peer ? JSON.stringify({ Peer: Peer, User: User }) : '{}';
  }

  var authRE = /Forest Peer="(.*?)", User="(.*)"/;

  function getPeerUser(req) {
    var auth = req.headers.authorization;
    var m = auth && auth.match(authRE);
    var Peer = m && m[1];
    var User = m && m[2];
    return { Peer: Peer, User: User };
  }

  function checkSig(pk) {
    console.log('checkSig', pk);
    return true;
  }

  exports.default = { makeHTTPAuth: makeHTTPAuth, makeWSAuth: makeWSAuth, getPeerUser: getPeerUser, setPeerIdentityUser: setPeerIdentityUser, checkSig: checkSig };
  module.exports = exports['default'];
});