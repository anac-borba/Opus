'use strict';
const crypto = require('crypto');

const COOKIE = 'mg_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 dias

function configOk() {
  const missing = [];
  if (!process.env.APP_PASSWORD || process.env.APP_PASSWORD.length < 8) missing.push('APP_PASSWORD (mínimo 8 caracteres)');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) missing.push('SESSION_SECRET (mínimo 32 caracteres)');
  return { ok: missing.length === 0, missing };
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createToken(secret) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_SEC * 1000 })).toString('base64url');
  return payload + '.' + sign(payload, secret);
}

function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const expected = Buffer.from(sign(parts[0], secret));
  const given = Buffer.from(parts[1]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')).exp > Date.now();
  } catch (e) {
    return false;
  }
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) {
      try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { /* cookie inválido: ignora */ }
    }
  });
  return out;
}

function isAuthed(req) {
  if (!configOk().ok) return false;
  return verifyToken(parseCookies(req.headers.cookie)[COOKIE], process.env.SESSION_SECRET);
}

function sessionCookie(token, req, clear) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
  const parts = [
    COOKIE + '=' + (clear ? '' : token),
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=' + (clear ? 0 : MAX_AGE_SEC)
  ];
  if (!local) parts.push('Secure');
  return parts.join('; ');
}

module.exports = { configOk, createToken, isAuthed, sessionCookie };
