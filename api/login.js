'use strict';
const crypto = require('crypto');
const { send, readJson, sameOrigin, clientIp } = require('../lib/http');
const { configOk, createToken, sessionCookie } = require('../lib/session');

// Limite de tentativas por IP (melhor esforço; a memória reinicia em cada instância).
const fails = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });

  const cfg = configOk();
  if (!cfg.ok) return send(res, 500, { error: 'config', missing: cfg.missing });

  const ip = clientIp(req);
  const rec = fails.get(ip) || { n: 0, until: 0 };
  if (rec.until > Date.now()) {
    return send(res, 429, { error: 'locked', retryInSec: Math.ceil((rec.until - Date.now()) / 1000) });
  }

  let body;
  try { body = await readJson(req, 2048); } catch (e) { return send(res, 413, { error: 'too_large' }); }
  const pw = body && typeof body.password === 'string' ? body.password : '';

  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(process.env.APP_PASSWORD).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    rec.n += 1;
    if (rec.n >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.n = 0; }
    fails.set(ip, rec);
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'invalid' });
  }

  fails.delete(ip);
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(createToken(process.env.SESSION_SECRET), req) });
};
