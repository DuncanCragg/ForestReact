
function makeHTTPAuth(Peer, Identity){
  return `Forest Peer="${Peer}", Identity="${Identity}"`;
}

function makeWSAuth(Peer, Identity){
  return JSON.stringify({ Peer, Identity });
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

export default { makeHTTPAuth, makeWSAuth, getPeerIdentity, checkSig };

