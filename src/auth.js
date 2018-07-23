
let Peer = null;
let Identity = null;

function setPeerIdentity({ peer, identity }){
  if(peer) Peer = peer;
  if(identity) Identity = identity;
  return { peer: Peer, identity: Identity };
}

function makeHTTPAuth(){
  return Peer? { Authorization: `Forest Peer="${Peer}", Identity="${Identity}"` }: {};
}

function makeWSAuth(){
  return Peer? JSON.stringify({ Peer, Identity }): '{}';
}

const authRE=/Forest Peer="(.*?)", Identity="(.*)"/;

function getPeerIdentity(req){
  const auth = req.headers.authorization;
  const m = auth && auth.match(authRE);
  const Peer=m && m[1];
  const Identity=m && m[2];
  return { Peer, Identity };
}

function checkSig(pk){
  console.log('checkSig', pk);
  return true;
}

export default { makeHTTPAuth, makeWSAuth, getPeerIdentity, setPeerIdentity, checkSig };

