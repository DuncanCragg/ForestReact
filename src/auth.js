
let Peer = null;
let Identity = null;
let User = null;

function setPeerIdentityUser({ peer, identity, user}){
  if(peer) Peer = peer;
  if(identity) Identity = identity;
  if(user) User = user;
  return { peer: Peer, identity: Identity, user: User };
}

function makeHTTPAuth(){
  return Peer? { Authorization: `Forest Peer="${Peer}", User="${User}"` }: {};
}

function makeWSAuth(){
  return Peer? JSON.stringify({ Peer, User }): '{}';
}

const authRE=/Forest Peer="(.*?)", User="(.*)"/;

function getPeerUser(req){
  const auth = req.headers.authorization;
  const m = auth && auth.match(authRE);
  const Peer=m && m[1];
  const User=m && m[2];
  return { Peer, User };
}

function checkSig(pk){
  console.log('checkSig', pk);
  return true;
}

export default { makeHTTPAuth, makeWSAuth, getPeerUser, setPeerIdentityUser, checkSig };

