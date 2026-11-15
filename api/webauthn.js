'use strict';
const crypto = require('crypto');
const { send, readJson, sameOrigin, clientIp } = require('../lib/http');
const { configOk, createToken, isAuthed, sessionCookie, sign, parseCookies } = require('../lib/session');
const { parseRegistration, verifyAssertion } = require('../lib/webauthn');

const PK_COOKIE = 'mg_pk';
const PK_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano
const CH_TTL_MS = 5 * 60 * 1000;
const used = new Map();   // desafios já usados (melhor esforço)
const fails = new Map();  // tentativas erradas por IP

const secret = () => process.env.SESSION_SECRET;
const isLocal = (req) => /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
const hostOf = (req) => String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
const rpIdOf = (req) => hostOf(req).replace(/:\d+$/, '');
const originOf = (req) => (isLocal(req) ? 'http://' : 'https://') + hostOf(req);

function packSigned(obj) {
  const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return p + '.' + sign(p, secret());
}
function unpackSigned(tok) {
  const parts = String(tok || '').split('.');
  if (parts.length !== 2) return null;
  const e = Buffer.from(sign(parts[0], secret())), g = Buffer.from(parts[1]);
  if (e.length !== g.length || !crypto.timingSafeEqual(e, g)) return null;
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch (x) { return null; }
}
function newChallenge(kind) {
  const c = crypto.randomBytes(32).toString('base64url');
  return { challenge: c, token: packSigned({ k: kind, c, exp: Date.now() + CH_TTL_MS }) };
}
function takeChallenge(token, kind) {
  const o = unpackSigned(token);
  if (!o || o.k !== kind || !(o.exp > Date.now()) || used.has(o.c)) return null;
  used.set(o.c, o.exp);
  for (const [k, v] of used) if (v < Date.now()) used.delete(k);
  return o.c;
}
function pkCookie(value, req, clear) {
  const parts = [PK_COOKIE + '=' + (clear ? '' : value), 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=' + (clear ? 0 : PK_MAX_AGE)];
  if (!isLocal(req)) parts.push('Secure');
  return parts.join('; ');
}
function storedKey(req) {
  const o = unpackSigned(parseCookies(req.headers.cookie)[PK_COOKIE]);
  return o && o.id && o.jwk ? o : null;
}

module.exports = async (req, res) => {
  const cfg = configOk();
  if (!cfg.ok) return send(res, 500, { error: 'config' });

  // Este aparelho já tem Face ID ativado?
  if (req.method === 'GET') return send(res, 200, { enabled: !!storedKey(req) });
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });

  let body;
  try { body = await readJson(req, 8 * 1024); } catch (e) { return send(res, 413, { error: 'too_large' }); }
  if (!body || typeof body.step !== 'string') return send(res, 400, { error: 'bad_request' });
  const rpId = rpIdOf(req), origin = originOf(req);

  try {
    if (body.step === 'reg-options') {
      if (!isAuthed(req)) return send(res, 401, { error: 'auth' });
      const ch = newChallenge('reg');
      return send(res, 200, { token: ch.token, publicKey: {
        challenge: ch.challenge, rp: { name: 'Meus Gastos', id: rpId },
        user: { id: Buffer.from('meus-gastos').toString('base64url'), name: 'meus-gastos', displayName: 'Meus Gastos' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000, attestation: 'none'
      } });
    }

    if (body.step === 'reg-verify') {
      if (!isAuthed(req)) return send(res, 401, { error: 'auth' });
      const c = takeChallenge(body.token, 'reg');
      if (!c) return send(res, 400, { error: 'challenge' });
      const k = parseRegistration(String(body.attestationObject), String(body.clientDataJSON), c, origin, rpId);
      return send(res, 200, { ok: true }, { 'Set-Cookie': pkCookie(packSigned({ id: k.id, jwk: k.jwk }), req) });
    }

    if (body.step === 'auth-options') {
      const k = storedKey(req);
      if (!k) return send(res, 404, { error: 'not_enabled' });
      const ch = newChallenge('auth');
      return send(res, 200, { token: ch.token, publicKey: { challenge: ch.challenge, rpId, allowCredentials: [{ type: 'public-key', id: k.id }], userVerification: 'required', timeout: 60000 } });
    }

    if (body.step === 'auth-verify') {
      const ip = clientIp(req);
      const rec = fails.get(ip) || { n: 0, until: 0 };
      if (rec.until > Date.now()) return send(res, 429, { error: 'locked' });
      const k = storedKey(req);
      const c = k && takeChallenge(body.token, 'auth');
      let ok = false;
      if (k && c) {
        try { ok = verifyAssertion({ id: String(body.id), clientDataJSON: String(body.clientDataJSON), authenticatorData: String(body.authenticatorData), signature: String(body.signature) }, k, c, origin, rpId); } catch (e) { ok = false; }
      }
      if (!ok) {
        rec.n += 1;
        if (rec.n >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.n = 0; }
        fails.set(ip, rec);
        return send(res, 401, { error: 'invalid' });
      }
      fails.delete(ip);
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(createToken(secret()), req) });
    }

    if (body.step === 'remove') {
      if (!isAuthed(req)) return send(res, 401, { error: 'auth' });
      return send(res, 200, { ok: true }, { 'Set-Cookie': pkCookie('', req, true) });
    }
  } catch (e) {
    return send(res, 400, { error: 'invalid' });
  }
  return send(res, 400, { error: 'bad_request' });
};
