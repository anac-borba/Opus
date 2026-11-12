'use strict';
const { send, sameOrigin } = require('../lib/http');
const { sessionCookie } = require('../lib/session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });
  send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', req, true) });
};
