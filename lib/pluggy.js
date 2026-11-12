'use strict';
// Cliente mínimo da API da Pluggy (somente leitura). Sem dependências.
const BASE = 'https://api.pluggy.ai';

let cachedKey = null; // { key, at }
const KEY_TTL_MS = 100 * 60 * 1000; // renova a cada ~1h40

function creds() {
  const id = process.env.PLUGGY_CLIENT_ID;
  const secret = process.env.PLUGGY_CLIENT_SECRET;
  const items = String(process.env.PLUGGY_ITEM_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const missing = [];
  if (!id) missing.push('PLUGGY_CLIENT_ID');
  if (!secret) missing.push('PLUGGY_CLIENT_SECRET');
  if (!items.length) missing.push('PLUGGY_ITEM_IDS');
  return { id, secret, items, missing };
}

async function getApiKey(force) {
  if (!force && cachedKey && Date.now() - cachedKey.at < KEY_TTL_MS) return cachedKey.key;
  const c = creds();
  const r = await fetch(BASE + '/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ clientId: c.id, clientSecret: c.secret })
  });
  if (!r.ok) {
    const e = new Error('pluggy_auth');
    e.status = r.status;
    e.step = '/auth';
    throw e;
  }
  const j = await r.json();
  cachedKey = { key: j.apiKey, at: Date.now() };
  return cachedKey.key;
}

async function get(path, params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const url = BASE + path + (qs.toString() ? '?' + qs.toString() : '');
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = await getApiKey(attempt > 0);
    const r = await fetch(url, { headers: { 'X-API-KEY': key, Accept: 'application/json' } });
    if ((r.status === 401 || r.status === 403) && attempt === 0) continue;
    if (!r.ok) {
      const e = new Error('pluggy_http');
      e.status = r.status;
      e.step = path.split('?')[0]; // só o caminho, sem ids
      throw e;
    }
    return r.json();
  }
}

// Transações: endpoint novo (por cursor). O antigo, por páginas, foi descontinuado (410).
async function listTransactions(accountId, dateFrom, dateTo) {
  const out = [];
  let first = { accountId, dateFrom };
  if (dateTo) first.dateTo = dateTo;
  let j;
  try {
    j = await get('/v2/transactions', first);
  } catch (e) {
    if (e.status === 400 && dateTo) {
      first = { accountId, dateFrom }; // tenta sem a data final
      j = await get('/v2/transactions', first);
    } else {
      throw e;
    }
  }
  for (let i = 0; i < 40; i++) {
    out.push(...((j && j.results) || []));
    const next = j && j.next;
    if (!next) break;
    j = await get('/v2/transactions' + next); // "next" já vem pronto: ?accountId=...&after=...
  }
  return out;
}

module.exports = { creds, get, listTransactions };
