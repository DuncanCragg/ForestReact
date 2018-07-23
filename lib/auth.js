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

  function setPeerIdentity(_ref) {
    var peer = _ref.peer,
        identity = _ref.identity;

    if (peer) Peer = peer;
    if (identity) Identity = identity;
    return { peer: Peer, identity: Identity };
  }

  function makeHTTPAuth() {
    return Peer ? { Authorization: 'Forest Peer="' + Peer + '", Identity="' + Identity + '"' } : {};
  }

  function makeWSAuth() {
    return Peer ? JSON.stringify({ Peer: Peer, Identity: Identity }) : '{}';
  }

  var authRE = /Forest Peer="(.*?)", Identity="(.*)"/;

  function getPeerIdentity(req) {
    var auth = req.headers.authorization;
    var m = auth && auth.match(authRE);
    var Peer = m && m[1];
    var Identity = m && m[2];
    return { Peer: Peer, Identity: Identity };
  }

  function checkSig(pk) {
    console.log('checkSig', pk);
    return true;
  }

  exports.default = { makeHTTPAuth: makeHTTPAuth, makeWSAuth: makeWSAuth, getPeerIdentity: getPeerIdentity, setPeerIdentity: setPeerIdentity, checkSig: checkSig };
  module.exports = exports['default'];
});