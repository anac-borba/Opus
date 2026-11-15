'use strict';
// Face ID / Touch ID via WebAuthn (passkey), sem dependências.
// O app guarda só a chave PÚBLICA do aparelho, num cookie assinado pelo servidor.
const crypto = require('crypto');

// Leitor mínimo de CBOR (o suficiente para o attestationObject e a chave COSE).
function cborRead(buf, off) {
  const ib = buf[off];
  const major = ib >> 5;
  let info = ib & 31;
  let p = off + 1;
  let val;
  if (info < 24) val = info;
  else if (info === 24) { val = buf[p]; p += 1; }
  else if (info === 25) { val = buf.readUInt16BE(p); p += 2; }
  else if (info === 26) { val = buf.readUInt32BE(p); p += 4; }
  else throw new Error('cbor_unsupported');
  if (major === 0) return [val, p];
  if (major === 1) return [-1 - val, p];
  if (major === 2 || major === 3) {
    const b = buf.subarray(p, p + val);
    return [major === 3 ? b.toString('utf8') : b, p + val];
  }
  if (major === 4) {
    const arr = [];
    for (let i = 0; i < val; i++) { const [v, np] = cborRead(buf, p); arr.push(v); p = np; }
    return [arr, p];
  }
  if (major === 5) {
    const m = new Map();
    for (let i = 0; i < val; i++) {
      const [k, p1] = cborRead(buf, p);
      const [v, p2] = cborRead(buf, p1);
      m.set(k, v); p = p2;
    }
    return [m, p];
  }
  if (major === 7) return [info === 20 ? false : info === 21 ? true : null, p];
  throw new Error('cbor_unsupported');
}

const sha256 = (b) => crypto.createHash('sha256').update(b).digest();

function parseAuthData(ad) {
  if (ad.length < 37) throw new Error('authdata');
  return { rpIdHash: ad.subarray(0, 32), flags: ad[32], counter: ad.readUInt32BE(33), rest: ad.subarray(37) };
}

// Confere o que o navegador assinou: tipo, desafio, site de origem.
function checkClientData(clientDataB64, type, challenge, origin) {
  const raw = Buffer.from(clientDataB64, 'base64url');
  const cd = JSON.parse(raw.toString('utf8'));
  if (cd.type !== type) throw new Error('type');
  if (cd.challenge !== challenge) throw new Error('challenge');
  if (cd.origin !== origin) throw new Error('origin');
  return raw;
}

// Cadastro: extrai o id e a chave pública (ES256) do attestationObject.
function parseRegistration(attB64, clientDataB64, challenge, origin, rpId) {
  checkClientData(clientDataB64, 'webauthn.create', challenge, origin);
  const [att] = cborRead(Buffer.from(attB64, 'base64url'), 0);
  const ad = parseAuthData(att.get('authData'));
  if (!ad.rpIdHash.equals(sha256(Buffer.from(rpId)))) throw new Error('rpid');
  if (!(ad.flags & 0x01) || !(ad.flags & 0x04) || !(ad.flags & 0x40)) throw new Error('flags');
  const rest = ad.rest;
  const idLen = rest.readUInt16BE(16);
  const credId = rest.subarray(18, 18 + idLen);
  const [cose] = cborRead(rest, 18 + idLen);
  if (cose.get(1) !== 2 || cose.get(3) !== -7 || cose.get(-1) !== 1) throw new Error('alg');
  const x = cose.get(-2), y = cose.get(-3);
  if (!x || !y || x.length !== 32 || y.length !== 32) throw new Error('key');
  return { id: credId.toString('base64url'), jwk: { kty: 'EC', crv: 'P-256', x: x.toString('base64url'), y: y.toString('base64url') } };
}

// Login: confere a assinatura feita pelo Face ID com a chave pública guardada.
function verifyAssertion(a, stored, challenge, origin, rpId) {
  const cdRaw = checkClientData(a.clientDataJSON, 'webauthn.get', challenge, origin);
  const authData = Buffer.from(a.authenticatorData, 'base64url');
  const ad = parseAuthData(authData);
  if (!ad.rpIdHash.equals(sha256(Buffer.from(rpId)))) throw new Error('rpid');
  if (!(ad.flags & 0x01) || !(ad.flags & 0x04)) throw new Error('flags'); // presença + verificação biométrica
  if (a.id !== stored.id) throw new Error('credential');
  const key = crypto.createPublicKey({ key: stored.jwk, format: 'jwk' });
  const ok = crypto.verify('sha256', Buffer.concat([authData, sha256(cdRaw)]), key, Buffer.from(a.signature, 'base64url'));
  if (!ok) throw new Error('signature');
  return true;
}

module.exports = { parseRegistration, verifyAssertion };
