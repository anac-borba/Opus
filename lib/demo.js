'use strict';
// Dados fictícios (DEMO=1) para ver o app funcionando sem o banco.
const { merchantKey, categorize } = require('./normalize');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);

function demoData() {
  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const txs = [];
  let seq = 0;

  const add = (date, desc, amount, o) => {
    const opts = o || {};
    const dir = opts.dir || 'out';
    let kind = dir === 'out' ? 'expense' : 'income';
    if (opts.internal) kind = 'internal';
    const isCard = opts.account === 'card';
    txs.push({
      id: 'demo-' + (++seq),
      account: opts.account || 'bank',
      date,
      desc,
      amount: Math.round(amount * 100) / 100,
      dir,
      method: isCard ? 'Cartão' : (opts.method || 'Pix'),
      category: kind === 'internal' ? null : (opts.category !== undefined ? opts.category : categorize(desc, null)),
      kind,
      key: merchantKey(desc, 'demo-' + seq),
      status: opts.status || 'POSTED',
      inst: opts.inst || null,
      purchaseDate: opts.purchaseDate || null
    });
  };

  for (let back = 7; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = first.getFullYear();
    const m = first.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const cur = back === 0;
    const r = rng(y * 100 + m + 7);
    const day = (d) => Math.min(d, lastDay);
    const past = (d) => iso(y, m, day(d)) <= todayIso;
    const st = cur ? 'PENDING' : 'POSTED';

    const card = (d, desc, v, extra) => { if (past(d)) add(iso(y, m, day(d)), desc, v, Object.assign({ account: 'card', status: st }, extra || {})); };
    const bank = (d, desc, v, extra) => { if (past(d)) add(iso(y, m, day(d)), desc, v, extra || {}); };

    // Gatos
    card(10, 'Ração premium gatos', 389.9);
    card(14, 'Areia sanitária Petz', 94.4);
    if (m % 2 === 0) bank(6, 'Clínica veterinária', 210, { method: 'Pix' });
    card(18, 'Brinquedos Cobasi', 20 + Math.round(r() * 30));

    // Alimentação
    for (let k = 0; k < 4; k++) card(3 + k * 7, 'Mercado Bairro', 80 + r() * 90);
    for (let k = 0; k < 3; k++) card(5 + k * 9, 'iFood', 35 + r() * 30);
    for (let k = 0; k < 4; k++) bank(2 + k * 7, 'Padaria Pão Quente', 12 + r() * 15, { method: 'Pix' });

    // Transporte
    for (let k = 0; k < 4; k++) card(4 + k * 6, 'Uber', 14 + r() * 22);

    // Lazer
    card(5, 'Cinema Cinemark', 46);
    if (r() > 0.5) card(20, 'Steam jogos', 59.9);

    // Faculdade
    if (r() > 0.4) card(12, 'Livraria Cultura', 60 + r() * 50);

    // Assinaturas
    card(8, 'Netflix', 39.9);
    card(12, 'Spotify', 21.9);
    card(3, 'iCloud', 14.9);
    card(20, 'Duolingo', 13);

    // Plano de celular
    bank(15, 'Claro plano celular', 54.9, { method: 'Boleto' });

    // Parcelas: notebook (12x, hoje na 9ª) e curso (6x, hoje na 5ª)
    const noteN = 9 - back;
    if (noteN >= 1) card(9, 'Notebook parcelado', 348.9, { inst: { n: noteN, total: 12 }, purchaseDate: '2026-03-09', category: 'Compras' });
    const cursoN = 5 - back;
    if (cursoN >= 1) card(16, 'Curso online', 264, { inst: { n: cursoN, total: 6 }, purchaseDate: '2026-07-16' });

    // Entradas e movimentos internos
    bank(5, 'Pix recebido mesada', 300, { dir: 'in' });
    if (past(7) && r() > 0.5) add(iso(y, m, day(7)), 'Reembolso amiga', 45, { dir: 'in' });
    bank(5, 'Pagamento de fatura cartão', 1500, { internal: true, method: 'Débito' });
    bank(1, 'Aplicação Cofrinho', 300, { internal: true, method: 'Débito' });

    // Uma compra sem categoria no mês atual
    if (cur) card(3, 'LOJA 4471 SP', 57.3, { category: null });
  }

  // Parcelas futuras já lançadas na fatura
  const futures = [
    ['Notebook parcelado', 348.9, 10, 12, 1], ['Notebook parcelado', 348.9, 11, 12, 2], ['Notebook parcelado', 348.9, 12, 12, 3],
    ['Curso online', 264, 6, 6, 1]
  ];
  futures.forEach(([desc, v, n, total, ahead]) => {
    const d = new Date(now.getFullYear(), now.getMonth() + ahead, desc.startsWith('Note') ? 9 : 16);
    add(iso(d.getFullYear(), d.getMonth(), d.getDate()), desc, v, { account: 'card', status: 'PENDING', inst: { n, total }, category: desc.startsWith('Note') ? 'Compras' : 'Faculdade' });
  });

  const nextDue = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 5 ? 1 : 0), 5);
  const nextClose = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 28 ? 1 : 0), 28);

  return {
    meta: { demo: true, generatedAt: now.toISOString(), consentExpiresAt: null },
    accounts: [
      { id: 'demo-cc', kind: 'checking', name: 'Conta corrente', balance: 1840.35, credit: null },
      {
        id: 'demo-card', kind: 'card', name: 'Cartão Itaú', balance: null,
        credit: {
          limit: 8000, available: 6673.6,
          dueDate: iso(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate()),
          closeDate: iso(nextClose.getFullYear(), nextClose.getMonth(), nextClose.getDate())
        }
      }
    ],
    transactions: txs,
    investments: [
      { id: 'demo-i1', name: 'Cofrinho Reserva (CDB)', type: 'FIXED_INCOME', subtype: 'CDB', balance: 6150, amount: 6150, rate: null, date: todayIso },
      { id: 'demo-i2', name: 'Cofrinho Videogame (CDB)', type: 'FIXED_INCOME', subtype: 'CDB', balance: 800, amount: 800, rate: null, date: todayIso }
    ]
  };
}

module.exports = { demoData };
