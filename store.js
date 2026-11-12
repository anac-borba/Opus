'use strict';
// Guarda lançamentos em dinheiro, categorias, metas e orçamento.
// Com Upstash Redis (grátis, pelo Marketplace da Vercel) sincroniza entre celular e Mac.
// Sem ele, responde 501 e o app guarda tudo só no navegador do aparelho.
const { send, readJson, sameOrigin } = require('../lib/http');
const { isAuthed } = require('../lib/session');

const KEY = 'meus-gastos:store:v1';

function kv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function cmd(c, args) {
  const r = await fetch(c.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error('kv_http_' + r.status);
  return r.json();
}

module.exports = async (req, res) => {
  if (!isAuthed(req)) return send(res, 401, { error: 'auth' });
  const c = kv();
  if (!c) return send(res, 200, { mode: 'local' });

  try {
    if (req.method === 'GET') {
      const j = await cmd(c, ['GET', KEY]);
      return send(res, 200, { store: j.result ? JSON.parse(j.result) : null });
    }
    if (req.method === 'PUT') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });
      let body;
      try { body = await readJson(req, 200 * 1024); } catch (e) { return send(res, 413, { error: 'too_large' }); }
      if (!body || typeof body.store !== 'object' || body.store === null) return send(res, 400, { error: 'bad_body' });
      await cmd(c, ['SET', KEY, JSON.stringify(body.store)]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, 502, { error: 'store' });
  }
};
