(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["module", "exports"], factory);
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
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  function makeHTTPAuth(Peer, Identity) {
    return "Forest Peer=\"" + Peer + "\", Identity=\"" + Identity + "\"";
  }

  function makeWSAuth(Peer, Identity) {
    return JSON.stringify({ Peer: Peer, Identity: Identity });
  }

  var authRE = /Forest Peer="(.*?)", Identity="(.*)"/;

  function getPeerIdentity(req) {
    var auth = req.headers.authorization;
    var m = auth && auth.match(authRE);
    var Peer = m && m[1];
    var Identity = m && m[2];
    return { Peer: Peer, Identity: Identity };
  }

  exports.default = { makeHTTPAuth: makeHTTPAuth, makeWSAuth: makeWSAuth, getPeerIdentity: getPeerIdentity };
  module.exports = exports["default"];
});