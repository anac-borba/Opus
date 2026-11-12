'use strict';
const { send } = require('../lib/http');
const { isAuthed } = require('../lib/session');
const pluggy = require('../lib/pluggy');
const { normalizeAccount, normalizeTx, normalizeInvestment } = require('../lib/normalize');
const { demoData } = require('../lib/demo');

let cache = null; // { at, data }
const CACHE_MS = 5 * 60 * 1000;

function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function loadAll(c) {
  const now = new Date();
  const from = isoDate(new Date(now.getFullYear(), now.getMonth() - 7, 1));
  const to = isoDate(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));

  const accounts = [];
  const transactions = [];
  const investments = [];
  let consentExpiresAt = null;

  for (const itemId of c.items) {
    try {
      const item = await pluggy.get('/items/' + encodeURIComponent(itemId));
      if (item && item.consentExpiresAt) {
        const d = String(item.consentExpiresAt).slice(0, 10);
        if (!consentExpiresAt || d < consentExpiresAt) consentExpiresAt = d;
      }
    } catch (e) { /* opcional */ }

    const accRes = await pluggy.get('/accounts', { itemId });
    const accs = ((accRes && accRes.results) || []).map(normalizeAccount);
    accounts.push(...accs);

    for (const acc of accs) {
      let rows;
      try {
        rows = await pluggy.getAllPages('/transactions', { accountId: acc.id, from, to });
      } catch (e) {
        // Se o filtro de data futura não for aceito, tenta só com a data inicial.
        rows = await pluggy.getAllPages('/transactions', { accountId: acc.id, from });
      }
      rows.forEach((t) => transactions.push(normalizeTx(t, acc)));
    }

    try {
      const inv = await pluggy.get('/investments', { itemId });
      ((inv && inv.results) || []).forEach((i) => investments.push(normalizeInvestment(i)));
    } catch (e) { /* o item pode não ter investimentos */ }
  }

  return {
    meta: { demo: false, generatedAt: new Date().toISOString(), consentExpiresAt },
    accounts,
    transactions,
    investments
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'method' });
  if (!isAuthed(req)) return send(res, 401, { error: 'auth' });

  if (process.env.DEMO === '1') return send(res, 200, demoData());

  const c = pluggy.creds();
  if (c.missing.length) return send(res, 500, { error: 'config', missing: c.missing });

  const refresh = /(^|[?&])refresh=1/.test(req.url || '');
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return send(res, 200, cache.data);

  try {
    const data = await loadAll(c);
    cache = { at: Date.now(), data };
    send(res, 200, data);
  } catch (e) {
    // Não devolve detalhes (nem do erro nem das chaves), só o código HTTP da Pluggy.
    send(res, 502, { error: 'pluggy', status: e.status || null });
  }
};
