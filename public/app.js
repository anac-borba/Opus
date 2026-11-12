'use strict';
(() => {
  /* ---------- Constantes e utilidades ---------- */
  const CATS = {
    'Gatos': '#EC4899', 'Alimentação': '#F59E0B', 'Transporte': '#0EA5E9', 'Lazer': '#8B5CF6',
    'Faculdade': '#14B8A6', 'Assinaturas': '#64748B', 'Saúde': '#EF4444', 'Compras': '#A855F7',
    'Contas e planos': '#0D9488', 'Outros': '#94A3B8'
  };
  const NOCAT = 'Sem categoria';
  const catColor = (c) => CATS[c] || '#D97706';
  const catOf = (t) => t.category || NOCAT;

  const $ = (s, r) => (r || document).querySelector(s);
  const BRL = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const pad = (n) => String(n).padStart(2, '0');
  const ymdOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const TODAY = ymdOf(new Date());
  const CUR = TODAY.slice(0, 7);
  const addM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const diffM = (a, b) => { const [ya, ma] = a.split('-').map(Number); const [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
  const mLong = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const mName = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }); };
  const mShort = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''); };
  const dShort = (d) => d.slice(8, 10) + ' ' + mShort(d.slice(0, 7));
  const sum = (a) => a.reduce((s, t) => s + t.amount, 0);
  const parseNum = (s) => {
    s = String(s == null ? '' : s).trim().replace(/[R$\s]/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    const v = parseFloat(s);
    return isFinite(v) && v >= 0 ? v : 0;
  };
  const money = (n) => {
    const parts = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',');
    return '<span class="cur">R$</span>' + (n < 0 ? '−' : '') + parts[0] + '<span class="cents">,' + parts[1] + '</span>';
  };

  const MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';
  const SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>';

  /* ---------- Estado ---------- */
  const defaultStore = () => ({ manual: [], rules: {}, goals: [], budget: null, cofrinho: null, fixedHidden: {}, catCount: 2 });
  const state = { tab: 'inicio', month: CUR, filter: 'all', q: '', showAll: false, sim: { valor: '2000', juros: '0', desc: '0', pay: 'card12' } };
  let DATA = null, STORE = defaultStore(), TX = [], FIX = null, storeMode = 'local', saveTimer = null;

  /* ---------- Telas (entrar / problema / app) ---------- */
  function show(which) {
    $('#login').hidden = which !== 'login';
    $('#problem').hidden = which !== 'problem';
    $('#app').hidden = which !== 'app';
    if (which === 'login') setTimeout(() => $('#pw').focus(), 50);
  }
  function showProblem(status, j) {
    const list = $('#problemList');
    list.innerHTML = '';
    if (j && j.error === 'config') {
      $('#problemTitle').textContent = 'Faltam configurações';
      $('#problemText').textContent = 'Adicione estas variáveis na Vercel (Settings → Environment Variables) e faça um novo deploy:';
      (j.missing || []).forEach((m) => { const li = document.createElement('li'); li.textContent = m; list.appendChild(li); });
    } else if (j && j.error === 'pluggy') {
      $('#problemTitle').textContent = 'Não consegui ler o Itaú';
      $('#problemText').textContent = 'A Pluggy respondeu com o código ' + (j.status || 'desconhecido') + '. Confira o Client ID, o Client Secret e o itemId. Se tudo estiver certo, a autorização do Open Finance pode ter vencido: renove no Meu Pluggy.';
    } else {
      $('#problemTitle').textContent = 'Algo deu errado';
      $('#problemText').textContent = 'Código ' + status + '. Tente de novo em instantes.';
    }
    show('problem');
  }

  /* ---------- Tema ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('#themeColor').content = t === 'dark' ? '#0B1220' : '#F3F5F9';
    $('#themeBtn').innerHTML = t === 'dark' ? SUN : MOON;
    try { localStorage.setItem('mg-theme', t); } catch (e) { /* ignorado */ }
  }
  function initTheme() {
    let t = null;
    try { t = localStorage.getItem('mg-theme'); } catch (e) { /* ignorado */ }
    if (t !== 'dark' && t !== 'light') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(t);
  }

  /* ---------- Dados e armazenamento ---------- */
  async function fetchData(refresh) {
    const r = await fetch('/api/data' + (refresh ? '?refresh=1' : ''), { credentials: 'same-origin' });
    if (r.status === 401) { show('login'); return false; }
    let j = null;
    try { j = await r.json(); } catch (e) { /* ignorado */ }
    if (!r.ok) { showProblem(r.status, j); return false; }
    DATA = j;
    return true;
  }
  async function loadStore() {
    try {
      const r = await fetch('/api/store', { credentials: 'same-origin' });
      if (r.ok) {
        const j = await r.json();
        if (j.mode !== 'local') {
          storeMode = 'server';
          if (j.store) STORE = Object.assign(defaultStore(), j.store);
          return;
        }
      }
    } catch (e) { /* cai para o modo local */ }
    storeMode = 'local';
    try {
      const raw = localStorage.getItem('mg-store');
      if (raw) STORE = Object.assign(defaultStore(), JSON.parse(raw));
    } catch (e) { /* ignorado */ }
  }
  function saveStore() {
    buildTx();
    if (storeMode === 'server') {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        fetch('/api/store', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store: STORE }) }).catch(() => {});
      }, 400);
    } else {
      try { localStorage.setItem('mg-store', JSON.stringify(STORE)); } catch (e) { /* ignorado */ }
    }
    render();
  }
  function buildTx() {
    const rules = STORE.rules || {};
    const list = DATA.transactions.map((t) => Object.assign({}, t));
    (STORE.manual || []).forEach((m) => list.push({
      id: m.id, account: 'manual', date: m.date, desc: m.desc, amount: m.amount, dir: 'out', method: m.method || 'Dinheiro',
      category: m.category || null, kind: 'expense', key: 'manual:' + m.id, status: 'POSTED', inst: null, manual: true
    }));
    list.forEach((t) => { if (t.kind !== 'internal' && !t.manual && rules[t.key]) t.category = rules[t.key]; });
    list.sort((a, b) => b.date.localeCompare(a.date));
    TX = list;
    FIX = null;
  }

  /* ---------- Análises ---------- */
  const expenseIn = (ym) => TX.filter((t) => t.kind === 'expense' && t.date.slice(0, 7) === ym);
  function byCat(list) {
    const m = {};
    list.forEach((t) => { const c = catOf(t); m[c] = (m[c] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  function prevMonths(n) {
    const out = [];
    for (let i = 1; i <= n; i++) {
      const ym = addM(CUR, -i);
      const list = expenseIn(ym);
      if (list.length) out.push({ ym, list, total: sum(list) });
    }
    return out;
  }
  function avgTotal() { const p = prevMonths(3); return p.length ? p.reduce((s, x) => s + x.total, 0) / p.length : 0; }
  function avgByCat() {
    const p = prevMonths(3);
    const m = {};
    p.forEach((x) => byCat(x.list).forEach(([c, v]) => { m[c] = (m[c] || 0) + v / p.length; }));
    return m;
  }
  function budgetValue() {
    if (STORE.budget > 0) return STORE.budget;
    const a = avgTotal();
    return a > 0 ? Math.max(500, Math.ceil((a * 1.1) / 100) * 100) : 3000;
  }
  function investTotals() {
    const inv = DATA.investments || [];
    const cof = inv.filter((i) => /cofrinho/i.test(i.name));
    const val = (l) => l.reduce((s, i) => s + (i.balance != null ? i.balance : (i.amount || 0)), 0);
    return { all: val(inv), cofrinho: cof.length ? val(cof) : null };
  }
  function savedTotal() {
    const t = investTotals();
    if (t.cofrinho != null) return t.cofrinho;
    if (STORE.cofrinho > 0) return STORE.cofrinho;
    return t.all;
  }

  // Gastos fixos: parcelas em andamento + o que se repete todo mês com valor parecido.
  function fixed() {
    if (FIX) return FIX;
    const items = [];
    const hidden = STORE.fixedHidden || {};

    const ig = {};
    TX.filter((t) => t.kind === 'expense' && t.inst && t.inst.total > 1).forEach((t) => {
      const k = t.key + '#' + t.inst.total;
      (ig[k] = ig[k] || []).push(t);
    });
    Object.keys(ig).forEach((k) => {
      if (hidden[k]) return;
      const upto = ig[k].filter((t) => t.date.slice(0, 7) <= CUR).sort((a, b) => b.date.localeCompare(a.date));
      const last = upto[0];
      if (!last) return;
      const lastYM = last.date.slice(0, 7);
      if (diffM(lastYM, CUR) > 1) return;
      const remaining = Math.max(0, last.inst.total - last.inst.n);
      const endOffset = lastYM === CUR ? remaining : remaining - 1;
      if (endOffset < 0) return;
      items.push({ type: 'inst', key: k, desc: last.desc, amount: last.amount, n: last.inst.n, total: last.inst.total, endOffset });
    });

    const from = addM(CUR, -5);
    const groups = {};
    TX.filter((t) => t.kind === 'expense' && !t.manual && !(t.inst && t.inst.total > 1) && t.date.slice(0, 7) >= from && t.date.slice(0, 7) <= CUR)
      .forEach((t) => { (groups[t.key] = groups[t.key] || []).push(t); });
    Object.keys(groups).forEach((k) => {
      if (hidden[k]) return;
      const arr = groups[k];
      const months = Array.from(new Set(arr.map((t) => t.date.slice(0, 7)))).sort();
      if (months.length < 3) return;
      if (diffM(months[months.length - 1], CUR) > 1) return;
      if (arr.length > months.length * 1.3) return;
      const amts = arr.map((t) => t.amount).sort((a, b) => a - b);
      const med = amts[Math.floor(amts.length / 2)];
      const cat = arr[0].category;
      const isSub = cat === 'Assinaturas' || cat === 'Contas e planos';
      if (!(med > 0) || (amts[amts.length - 1] - amts[0]) / med > (isSub ? 0.35 : 0.15)) return;
      const latest = arr.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      items.push({
        type: cat === 'Assinaturas' ? 'sub' : cat === 'Contas e planos' ? 'bill' : 'other',
        key: k, desc: latest.desc, amount: latest.amount, day: Number(latest.date.slice(8, 10)), method: latest.method
      });
    });

    FIX = { items, at: (i) => items.reduce((s, x) => (x.type === 'inst' ? (i <= x.endOffset ? s + x.amount : s) : s + x.amount), 0) };
    return FIX;
  }
  function varAvg() {
    const a = avgTotal();
    const base = a > 0 ? a : sum(expenseIn(CUR));
    return Math.max(0, base - fixed().at(0));
  }

  /* ---------- Blocos de interface ---------- */
  const barRow = (label, right, pct, color, extra) =>
    '<div><div class="between"><span style="font-size:14px;font-weight:600">' + esc(label) + '</span><span class="num" style="font-size:14px">' + right + '</span></div>' +
    '<div class="bar" style="margin-top:6px"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + color + '"></i></div>' +
    (extra ? '<div class="note" style="margin-top:4px">' + extra + '</div>' : '') + '</div>';

  const item = (nm, ds, vl, extra) =>
    '<div class="item"><div style="min-width:0"><div class="nm">' + esc(nm) + '</div><div class="ds">' + ds + '</div></div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex:none"><span class="vl">' + vl + '</span>' + (extra || '') + '</div></div>';

  function txRow(t) {
    const income = t.kind === 'income';
    const col = income ? '#16A34A' : catColor(catOf(t));
    const cat = income ? 'Entrada' : (t.category ? esc(t.category) : '<span class="amber">Sem categoria</span>');
    const inst = t.inst ? ' · ' + t.inst.n + '/' + t.inst.total : '';
    const inner =
      '<span class="tx-ico" style="background:' + col + '26"><i style="background:' + col + '"></i></span>' +
      '<span class="tx-main"><span class="tx-desc" style="display:block">' + esc(t.desc) + '</span>' +
      '<span class="tx-meta"><span>' + cat + '</span><span aria-hidden="true">·</span><span>' + esc(t.method) + inst + '</span><span aria-hidden="true">·</span><span>' + dShort(t.date) + '</span></span></span>' +
      '<span class="tx-amt" style="color:' + (income ? 'var(--good)' : 'var(--text)') + '">' + (income ? '+ ' : '− ') + BRL(t.amount) + '</span>';
    return income
      ? '<div class="tx">' + inner + '</div>'
      : '<button type="button" class="tx" data-act="cat" data-id="' + esc(t.id) + '" aria-label="Mudar a categoria de ' + esc(t.desc) + '">' + inner + '</button>';
  }

  /* ---------- Início ---------- */
  function viewInicio() {
    const ym = state.month;
    const list = expenseIn(ym);
    const total = sum(list);
    const B = budgetValue();
    const pct = B > 0 ? Math.round((total / B) * 100) : 0;
    const left = B - total;
    const cats = byCat(list);

    const bar = cats.length
      ? '<div class="stack-bar" role="img" aria-label="' + esc('Gastos por categoria: ' + cats.map(([c, v]) => c + ' ' + Math.round((v / total) * 100) + '%').join(', ')) + '">' +
        cats.map(([c, v]) => '<div style="flex:' + v + ' 1 0;background:' + catColor(c) + '"></div>').join('') + '</div>'
      : '<p class="muted">Nenhum gasto neste mês ainda.</p>';
    const legend = cats.length
      ? '<div class="legend">' + cats.map(([c, v]) =>
          '<div class="it"><span class="dot" style="background:' + catColor(c) + '"></span><div><div class="lg-name">' + esc(c) + ' · ' + Math.round((v / total) * 100) + '%</div><div class="lg-val">' + BRL(v) + '</div></div></div>').join('') + '</div>'
      : '';

    const hero =
      '<section class="card hero"><div class="split"><div><h2 class="eyebrow">Gasto em ' + esc(mName(ym)) + '</h2><div class="big" style="margin-top:6px">' + money(total) + '</div></div>' +
      '<div class="grow"><div class="between small muted"><span>Orçamento do mês · ' + BRL(B) + '</span><b style="color:var(--text)">' + pct + '%</b></div>' +
      '<div class="bar lg" style="margin-top:8px"><i style="width:' + Math.min(100, pct) + '%;background:' + (pct > 100 ? 'var(--amber)' : 'var(--accent)') + '"></i></div>' +
      '<div class="small ' + (left >= 0 ? 'good' : 'amber') + '" style="margin-top:8px">' + (left >= 0 ? 'Ainda dá para gastar ' + BRL(left) : 'Passou ' + BRL(-left) + ' do orçamento') + '</div></div></div>' +
      bar + legend + '</section>';

    const uncat = list.filter((t) => !t.category).length;
    const warn = uncat
      ? '<div class="callout warn" style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between"><span>' + uncat + (uncat > 1 ? ' compras sem categoria' : ' compra sem categoria') + '. Classifique uma vez e o app lembra das próximas da mesma loja.</span><button class="btn small" type="button" data-act="goto-uncat">Classificar</button></div>'
      : '';

    // Cartão
    const card = (DATA.accounts || []).find((a) => a.kind === 'card');
    const hasCard = card || TX.some((t) => t.account === 'card');
    let cardHtml = '';
    if (hasCard) {
      const cardTotal = sum(list.filter((t) => t.account === 'card'));
      const cols = [0, 1, 2, 3].map((i) => { const m = addM(ym, i); return { m, v: sum(expenseIn(m).filter((t) => t.account === 'card')) }; });
      const mx = Math.max.apply(null, cols.map((c) => c.v).concat([1]));
      const cr = card && card.credit;
      const lim = cr && cr.limit > 0 && cr.available != null ? cr : null;
      const usedPct = lim ? Math.round(((lim.limit - lim.available) / lim.limit) * 100) : 0;
      cardHtml =
        '<section class="card"><div><h2>' + esc((card && card.name) || 'Cartão') + '</h2><p class="sub">' +
        (cr && cr.dueDate ? 'Fatura vence em ' + cr.dueDate.slice(8, 10) + '/' + cr.dueDate.slice(5, 7) : 'Compras no cartão') + (cr && cr.closeDate ? ' · fecha dia ' + cr.closeDate.slice(8, 10) : '') + '</p></div>' +
        '<div class="mid">' + money(cardTotal) + '</div>' +
        (lim ? '<div><div class="between small muted"><span>Limite livre ' + BRL(lim.available) + '</span><b style="color:var(--text)">' + usedPct + '% usado</b></div><div class="bar" style="margin-top:8px"><i style="width:' + usedPct + '%"></i></div></div>' : '') +
        '<div class="hr"><div class="upper">Compras por mês no cartão</div><div class="mini-cols" style="margin-top:12px">' +
        cols.map((c, i) => '<div><div class="col"><i class="' + (i === 0 ? 'on' : '') + '" style="height:' + Math.max(4, Math.round((c.v / mx) * 96)) + 'px"></i></div><div class="mo">' + esc(mShort(c.m)) + '</div><div class="mv">' + Math.round(c.v).toLocaleString('pt-BR') + '</div></div>').join('') +
        '</div><p class="note" style="margin-top:12px">Meses seguintes mostram só o que já está lançado (parcelas).</p></div></section>';
    }

    // Gatos
    const gatos = list.filter((t) => t.category === 'Gatos');
    const gTotal = sum(gatos);
    const sub = { 'Ração': 0, 'Veterinário': 0, 'Areia': 0, 'Outros': 0 };
    gatos.forEach((t) => {
      const d = strip(t.desc);
      const k = /rac/.test(d) ? 'Ração' : /vet|clinic|consulta/.test(d) ? 'Veterinário' : /areia|sanit/.test(d) ? 'Areia' : 'Outros';
      sub[k] += t.amount;
    });
    const n = STORE.catCount || 2;
    const gatosHtml =
      '<section class="card"><div style="display:flex;align-items:center;gap:12px"><div class="tx-ico" style="width:44px;height:44px;border-radius:14px;background:rgba(236,72,153,.15)">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="10.5" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/><path d="M8.5 16.5c0-2 1.7-3.5 3.5-3.5s3.5 1.5 3.5 3.5c0 1.4-1.1 2.5-2.5 2.5h-2c-1.4 0-2.5-1.1-2.5-2.5z"/></svg></div>' +
      '<div><h2>Gatos</h2><p class="sub">Média de ' + BRL(gTotal / n) + ' por gato</p></div></div>' +
      '<div class="mid">' + money(gTotal) + '</div>' +
      (gTotal > 0 ? '<div class="list">' + Object.entries(sub).filter(([, v]) => v > 0).map(([k, v]) => barRow(k, BRL(v), (v / gTotal) * 100, '#EC4899')).join('') + '</div>' : '<p class="muted">Nenhum gasto com os gatos neste mês.</p>') +
      '</section>';

    // Como paguei
    const grp = { 'Cartão': 0, 'Pix': 0, 'Dinheiro': 0, 'Outros': 0 };
    list.forEach((t) => { const k = t.method === 'Cartão' || t.method === 'Pix' || t.method === 'Dinheiro' ? t.method : 'Outros'; grp[k] += t.amount; });
    const gcol = { 'Cartão': 'var(--accent)', 'Pix': '#0D9488', 'Dinheiro': '#D97706', 'Outros': '#94A3B8' };
    const payHtml =
      '<section class="card"><div><h2>Como eu paguei</h2><p class="sub">Total do mês por forma de pagamento</p></div><div class="list" style="gap:18px">' +
      Object.entries(grp).filter(([, v]) => v > 0 || total === 0).map(([k, v]) => barRow(k, BRL(v), total ? (v / total) * 100 : 0, gcol[k], total ? Math.round((v / total) * 100) + '% do total' : '')).join('') +
      '</div><p class="note hr" style="margin-top:auto">Cartão e Pix entram sozinhos pelo banco. Dinheiro vivo você lança em <b style="color:var(--text)">+ Lançar</b>.</p></section>';

    return hero + warn + '<div class="row-wrap">' + cardHtml + gatosHtml + payHtml + '</div>';
  }

  /* ---------- Gastos ---------- */
  function filteredTx() {
    const ym = state.month;
    let l = TX.filter((t) => t.kind !== 'internal' && t.date.slice(0, 7) === ym);
    const f = state.filter;
    if (f === 'Cartão' || f === 'Pix' || f === 'Dinheiro') l = l.filter((t) => t.method === f);
    else if (f === 'Outros') l = l.filter((t) => !['Cartão', 'Pix', 'Dinheiro'].includes(t.method));
    else if (f === 'uncat') l = l.filter((t) => t.kind === 'expense' && !t.category);
    if (state.q) { const q = strip(state.q); l = l.filter((t) => strip(t.desc).includes(q)); }
    return l;
  }
  function txListHtml() {
    const l = filteredTx();
    if (!l.length) return '<p class="muted" style="padding:16px 0">Nada encontrado neste mês.</p>';
    const shown = state.showAll ? l : l.slice(0, 30);
    return shown.map(txRow).join('') + (l.length > shown.length ? '<button type="button" class="btn block soft" style="margin-top:8px" data-act="more">Ver mais ' + (l.length - shown.length) + '</button>' : '');
  }
  function viewGastos() {
    const filters = [['all', 'Todas'], ['Cartão', 'Cartão'], ['Pix', 'Pix'], ['Dinheiro', 'Dinheiro'], ['Outros', 'Outros'], ['uncat', 'Sem categoria']];
    const chips = filters.map(([id, l]) => '<button type="button" class="chip" data-act="filter" data-id="' + id + '" aria-pressed="' + (state.filter === id) + '">' + l + '</button>').join('');

    const list = expenseIn(state.month);
    const avg = avgByCat();
    const cur = {};
    byCat(list).forEach(([c, v]) => { cur[c] = v; });
    const names = Array.from(new Set(Object.keys(cur).concat(Object.keys(avg)))).sort((a, b) => Math.max(cur[b] || 0, avg[b] || 0) - Math.max(cur[a] || 0, avg[a] || 0)).slice(0, 8);
    const cmp = names.length
      ? names.map((c) => {
          const v = cur[c] || 0, a = avg[c] || 0;
          const over = a > 0 && v > a;
          return barRow(c, BRL(v) + (a > 0 ? ' <span class="muted">de ' + BRL(a) + '</span>' : ''), a > 0 ? (v / a) * 100 : (v > 0 ? 100 : 0), catColor(c), a > 0 ? (over ? '<span class="amber">' + Math.round((v / a) * 100) + '% da sua média · acima</span>' : Math.round((v / a) * 100) + '% da sua média') : 'Sem histórico para comparar');
        }).join('')
      : '<p class="muted">Sem dados ainda.</p>';

    return '<div class="row-wrap top"><section class="card wide"><div class="split" style="align-items:center"><div><h2>Transações</h2><p class="sub">' + (DATA.meta.demo ? 'Dados de exemplo' : 'Sincronizadas do Itaú') + '</p></div></div>' +
      '<div><label class="sr-only" for="q">Buscar transação</label><input id="q" class="input" type="search" placeholder="Buscar por nome" value="' + esc(state.q) + '" autocomplete="off"></div>' +
      '<div class="chips">' + chips + '</div><div id="txlist">' + txListHtml() + '</div></section>' +
      '<section class="card"><div><h2>Comparado com sua média</h2><p class="sub">Média dos últimos 3 meses</p></div><div class="list" style="gap:18px">' + cmp + '</div></section></div>';
  }

  /* ---------- Simular ---------- */
  function simulate() {
    const P = parseNum(state.sim.valor);
    const jur = parseNum(state.sim.juros) / 100;
    const dsc = Math.min(parseNum(state.sim.desc), 100);
    const pmt = (n) => (jur > 0 ? (P * jur) / (1 - Math.pow(1 + jur, -n)) : P / n);
    const pix = P * (1 - dsc / 100);
    const m1 = addM(CUR, 1), m2 = addM(CUR, 2), m12 = addM(CUR, 12);
    const scen = [
      { id: 'pix', label: 'Pix à vista', start: 0, n: 1, parcela: pix, total: pix, sub: dsc > 0 ? 'Sai em ' + mShort(CUR) + ', com ' + dsc + '% de desconto' : 'Sai da conta agora' },
      { id: 'card1', label: 'Cartão à vista', start: 1, n: 1, parcela: P, total: P, sub: 'Cai na fatura de ' + mShort(m1) },
      { id: 'card2', label: 'Cartão em 2x', start: 1, n: 2, parcela: pmt(2), total: pmt(2) * 2, sub: mShort(m1) + ' e ' + mShort(m2) },
      { id: 'card12', label: 'Cartão em 12x', start: 1, n: 12, parcela: pmt(12), total: pmt(12) * 12, sub: mShort(m1) + ' a ' + mShort(m12) + '/' + m12.slice(2, 4) }
    ];
    const va = varAvg(), fx = fixed(), B = budgetValue();
    const totalsOf = (sc) => Array.from({ length: 13 }, (_, i) => va + fx.at(i) + (i >= sc.start && i < sc.start + sc.n ? sc.parcela : 0));
    scen.forEach((sc) => {
      const t = totalsOf(sc);
      let w = 0;
      t.forEach((v, i) => { if (v > t[w]) w = i; });
      sc.totals = t; sc.worst = w; sc.gap = B - t[w];
    });
    return { P, dsc, scen, B, cur: scen.find((s) => s.id === state.sim.pay) || scen[3] };
  }
  function viewSimular() {
    const S = simulate();
    const cur = S.cur;
    const over = cur.totals.filter((v) => v > S.B).length;
    const maxV = Math.max.apply(null, [S.B].concat(cur.totals)) * 1.08;
    const H = 150;
    const worstYM = addM(CUR, cur.worst);
    const worstName = mShort(worstYM) + (worstYM.slice(0, 4) !== CUR.slice(0, 4) ? '/' + worstYM.slice(2, 4) : '');
    const tip = over === 0
      ? 'Cabe no orçamento em todos os meses. O mês mais apertado é ' + worstName + ', com sobra de ' + BRL(cur.gap) + '.'
      : 'Você passaria do orçamento em ' + over + (over > 1 ? ' meses' : ' mês') + '. O pior é ' + worstName + ': ' + BRL(-cur.gap) + ' acima.';
    const saved = savedTotal();
    const cofLine = S.P > 0 ? (S.P <= saved
      ? 'Pagando à vista com o que você tem guardado (' + BRL(saved) + '), ficariam ' + BRL(saved - S.P) + '.'
      : 'O que você tem guardado (' + BRL(saved) + ') não cobre essa compra.') : '';
    const waitLine = S.P > 0 ? 'Juntando R$ 300,00 por mês, você chega a ' + BRL(S.P) + ' em ' + Math.ceil(S.P / 300) + ' meses, sem juros.' : '';

    const opts = S.scen.map((o) =>
      '<button type="button" class="opt" data-act="pay" data-id="' + o.id + '" aria-pressed="' + (o.id === cur.id) + '"><span class="t">' + o.label + '</span><span class="small muted">' + esc(o.sub) + '</span>' +
      '<span class="p">' + (o.n > 1 ? o.n + 'x de ' + BRL(o.parcela) : BRL(o.parcela)) + '</span><span class="small muted">Total: ' + BRL(o.total) + '</span>' +
      '<span class="f ' + (o.gap < 0 ? 'amber' : 'good') + '">' + (o.gap < 0 ? 'Passa ' : 'Sobra ') + BRL(Math.abs(o.gap)) + ' em ' + mShort(addM(CUR, o.worst)) + '</span></button>').join('');

    const bars = cur.totals.map((v) => '<i style="height:' + Math.max(4, Math.round((v / maxV) * H)) + 'px;background:' + (v > S.B ? '#D97706' : 'var(--accent)') + '"></i>').join('');
    const axis = cur.totals.map((_, i) => '<span>' + esc(mShort(addM(CUR, i))) + '</span>').join('');
    const stat = cur.id === 'pix' ? ['Desconto', BRL(S.P * S.dsc / 100)] : ['Juros', BRL(Math.max(0, cur.total - S.P))];

    return '<section class="card"><div><h2 style="font-size:18px;font-weight:700">Simular uma compra</h2><p class="sub">Veja como a compra mexe no seu orçamento de ' + BRL(S.B) + ', mês a mês.</p></div>' +
      '<div class="form-grid"><div><label class="lbl" for="s-valor">Valor da compra (R$)</label><input id="s-valor" class="input" inputmode="decimal" data-sim="valor" value="' + esc(state.sim.valor) + '"></div>' +
      '<div><label class="lbl" for="s-juros">Juros do parcelado (% ao mês)</label><input id="s-juros" class="input" inputmode="decimal" data-sim="juros" value="' + esc(state.sim.juros) + '"></div>' +
      '<div><label class="lbl" for="s-desc">Desconto no Pix (%)</label><input id="s-desc" class="input" inputmode="decimal" data-sim="desc" value="' + esc(state.sim.desc) + '"></div></div>' +
      '<p class="note">Juros 0 = sem juros. Confira a taxa real na loja ou no app do Itaú.</p></section>' +
      '<div class="grid-opts">' + opts + '</div>' +
      '<section class="card"><div><h2>Seus próximos 13 meses</h2><p class="sub">' + cur.label + ' · de ' + mShort(CUR) + '/' + CUR.slice(2, 4) + ' a ' + mShort(addM(CUR, 12)) + '/' + addM(CUR, 12).slice(2, 4) + '</p></div>' +
      '<div class="stats"><div><div class="k">Valor por mês</div><div class="v">' + (cur.n > 1 ? cur.n + 'x de ' + BRL(cur.parcela) : BRL(cur.parcela) + ' à vista') + '</div></div>' +
      '<div><div class="k">Total pago</div><div class="v">' + BRL(cur.total) + '</div></div><div><div class="k">' + stat[0] + '</div><div class="v">' + stat[1] + '</div></div>' +
      '<div><div class="k">Meses acima do orçamento</div><div class="v">' + over + '</div></div></div>' +
      '<div><div class="chart" role="img" aria-label="' + esc('Gasto previsto por mês comparado ao orçamento de ' + BRL(S.B) + '. ' + tip) + '"><div class="budget" style="bottom:' + Math.round((S.B / maxV) * H) + 'px"></div>' + bars + '</div><div class="axis">' + axis + '</div>' +
      '<div class="keys"><span><i style="background:var(--accent)"></i>Dentro do orçamento</span><span><i style="background:#D97706"></i>Acima do orçamento</span><span><i style="width:14px;height:0;border-top:2px dashed var(--muted);border-radius:0"></i>Orçamento de ' + BRL(S.B) + '</span></div></div>' +
      '<div class="callout">' + esc(tip) + '</div><div class="small muted" style="line-height:1.5">' + esc(cofLine) + '<br>' + esc(waitLine) + '</div>' +
      '<p class="note">Estimativa com base nos seus gastos fixos e na média dos gastos variáveis dos últimos meses. No cartão, o valor sai no vencimento da fatura do mês seguinte.</p></section>';
  }

  /* ---------- Fixos ---------- */
  function viewFixos() {
    const fx = fixed();
    const now = fx.at(0);
    const B = budgetValue();
    const base = avgTotal() || sum(expenseIn(CUR));
    const typeSum = (t) => fx.items.filter((x) => x.type === t && (t !== 'inst' || x.endOffset >= 0)).reduce((s, x) => s + x.amount, 0);
    const sums = { inst: typeSum('inst'), sub: typeSum('sub'), bill: typeSum('bill'), other: typeSum('other') };
    const names = { inst: 'Parcelas', sub: 'Assinaturas', bill: 'Contas e planos', other: 'Outros fixos' };
    const colors = { inst: 'var(--accent)', sub: '#8B5CF6', bill: '#0D9488', other: '#F59E0B' };
    const keys = Object.keys(sums).filter((k) => sums[k] > 0);

    const hideBtn = (k) => '<button type="button" class="btn small" data-act="hide-fixed" data-key="' + esc(k) + '">Não é fixo</button>';
    const section = (type) => {
      const l = fx.items.filter((x) => x.type === type).sort((a, b) => b.amount - a.amount);
      if (!l.length) return '';
      return '<section class="card" style="gap:4px"><div class="between"><h2>' + names[type] + '</h2><b class="num">' + BRL(sums[type]) + '</b></div>' +
        l.map((x) => item(x.desc,
          x.type === 'inst' ? 'Parcela ' + x.n + ' de ' + x.total + ' · termina em ' + esc(mShort(addM(CUR, x.endOffset))) + '/' + addM(CUR, x.endOffset).slice(2, 4) : 'Todo dia ' + x.day + ' · ' + esc(x.method),
          BRL(x.amount), hideBtn(x.key))).join('') + '</section>';
    };

    let drop = null;
    for (let i = 1; i <= 12; i++) { if (fx.at(i) < fx.at(i - 1) - 0.005) { drop = i; break; } }
    const callout = drop
      ? 'Em ' + mName(addM(CUR, drop)) + ', quando terminam as parcelas, seus fixos caem para ' + BRL(fx.at(drop)) + ' por mês.'
      : 'Seus fixos devem ficar perto de ' + BRL(now) + ' por mês nos próximos meses.';
    const cols = [0, 1, 2, 3, 4].map((i) => ({ m: addM(CUR, i), v: fx.at(i) }));
    const mx = Math.max.apply(null, cols.map((c) => c.v).concat([1]));
    const hiddenN = Object.keys(STORE.fixedHidden || {}).length;

    const head =
      '<section class="card hero"><div><h2 class="eyebrow">Gastos fixos por mês</h2><div class="big" style="margin-top:6px">' + money(now) + '</div>' +
      '<p class="small muted" style="margin-top:8px">' + Math.round((now / B) * 100) + '% do orçamento' + (base > 0 ? ' · ' + Math.round((now / base) * 100) + '% do que você gasta por mês' : '') + '</p></div>' +
      (keys.length ? '<div class="stack-bar" role="img" aria-label="' + esc(keys.map((k) => names[k] + ' ' + Math.round((sums[k] / now) * 100) + '%').join(', ')) + '">' + keys.map((k) => '<div style="flex:' + sums[k] + ' 1 0;background:' + colors[k] + '"></div>').join('') + '</div>' +
        '<div class="keys" style="margin-top:0">' + keys.map((k) => '<span><i style="background:' + colors[k] + ';border-radius:50%"></i>' + names[k] + ' · ' + Math.round((sums[k] / now) * 100) + '%</span>').join('') + '</div>' : '<p class="muted">Ainda não encontrei gastos que se repetem todo mês. Preciso de pelo menos 3 meses de histórico.</p>') + '</section>';

    const side =
      '<section class="card"><div><h2>Fixos nos próximos meses</h2><p class="sub">Caem quando as parcelas terminam</p></div><div class="mini-cols">' +
      cols.map((c, i) => '<div><div class="col"><i class="' + (i === 0 ? 'on' : '') + '" style="height:' + Math.max(4, Math.round((c.v / mx) * 96)) + 'px"></i></div><div class="mo">' + esc(mShort(c.m)) + '</div><div class="mv">' + Math.round(c.v).toLocaleString('pt-BR') + '</div></div>').join('') +
      '</div><div class="callout">' + esc(callout) + '</div>' +
      '<p class="note">O app marca como fixo o que se repete todo mês com valor parecido, e as parcelas em andamento. Se algo não for fixo, toque em “Não é fixo”.</p>' +
      (hiddenN ? '<button type="button" class="btn small" data-act="restore-fixed">Mostrar os ' + hiddenN + ' ocultos de novo</button>' : '') + '</section>';

    return head + '<div class="row-wrap top"><div class="stack" style="flex:2 1 420px">' + ['inst', 'sub', 'bill', 'other'].map(section).join('') + '</div><div class="stack" style="flex:1 1 300px">' + side + '</div></div>';
  }

  /* ---------- Metas ---------- */
  function viewMetas() {
    const inv = (DATA.investments || []).slice().sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const totals = investTotals();
    const hasCof = totals.cofrinho != null;
    const invRows = inv.length
      ? inv.map((i) => item(i.name, esc(i.subtype || i.type || 'Investimento') + (i.rate ? ' · ' + i.rate + '%' : ''), BRL(i.balance != null ? i.balance : i.amount))).join('')
      : '<p class="muted">O banco não enviou investimentos.</p>';
    const manual = !hasCof
      ? '<div class="hr"><p class="small muted" style="margin-bottom:8px">O Itaú pode não enviar o Cofrinho. ' + (STORE.cofrinho > 0 ? 'Saldo informado por você: <b style="color:var(--text)">' + BRL(STORE.cofrinho) + '</b>.' : 'Se ele não aparece acima, informe o saldo à mão.') + '</p><button type="button" class="btn small" data-act="cofrinho">' + (STORE.cofrinho > 0 ? 'Atualizar saldo do Cofrinho' : 'Informar saldo do Cofrinho') + '</button></div>'
      : '';
    const invCard =
      '<section class="card" style="gap:4px"><div><h2>Investimentos</h2><p class="sub">Saldo que o Itaú compartilha</p></div><div class="mid" style="margin:12px 0 4px">' + money(totals.all + (!hasCof && STORE.cofrinho > 0 ? STORE.cofrinho : 0)) + '</div>' + invRows + manual + '</section>';

    const goals = STORE.goals || [];
    const goalRows = goals.length
      ? goals.map((g) => {
          const p = g.target > 0 ? (g.saved / g.target) * 100 : 0;
          const missing = Math.max(0, g.target - g.saved);
          const months = g.monthly > 0 ? Math.ceil(missing / g.monthly) : null;
          return '<div><div class="between"><span style="font-size:14px;font-weight:600">' + esc(g.name) + '</span><span class="num" style="font-size:14px">' + BRL(g.saved) + ' de ' + BRL(g.target) + '</span></div>' +
            '<div class="bar lg" style="margin-top:6px"><i style="width:' + Math.min(100, p) + '%;background:#0D9488"></i></div>' +
            '<div class="between" style="margin-top:4px"><span class="note">' + Math.round(p) + '% · ' + (missing > 0 ? 'faltam ' + BRL(missing) + (months ? ', ou ' + months + (months > 1 ? ' meses' : ' mês') + ' guardando ' + BRL(g.monthly) : '') : 'meta atingida') + '</span>' +
            '<button type="button" class="btn small" data-act="goal" data-id="' + esc(g.id) + '">Editar</button></div></div>';
        }).join('')
      : '<p class="muted">Você ainda não criou metas.</p>';
    const goalCard =
      '<section class="card"><div><h2>Minhas metas</h2><p class="sub">Quanto falta para cada uma</p></div><div class="list" style="gap:18px">' + goalRows + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn soft" data-act="goal">+ Nova meta</button><button type="button" class="btn soft" data-act="goto-sim">Simular uma compra</button></div></section>';

    const meta = DATA.meta || {};
    const when = meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const accountCard =
      '<section class="card"><div><h2>Orçamento e conta</h2></div>' +
      '<div class="between"><div><div class="nm" style="font-weight:600">Orçamento mensal</div><div class="small muted">' + (STORE.budget > 0 ? 'Definido por você' : 'Automático, com base na sua média') + '</div></div><div style="display:flex;align-items:center;gap:8px"><b class="num">' + BRL(budgetValue()) + '</b><button type="button" class="btn small" data-act="budget">Alterar</button></div></div>' +
      '<div class="hr small muted" style="line-height:1.6">' + (meta.demo ? 'Dados de demonstração.' : 'Dados lidos em ' + esc(when) + '. O Meu Pluggy atualiza o banco a cada 24 horas.') +
      (meta.consentExpiresAt ? '<br>Autorização do Open Finance até ' + esc(meta.consentExpiresAt.split('-').reverse().join('/')) + '.' : '') +
      '<br>' + (storeMode === 'server' ? 'Lançamentos, categorias e metas sincronizam entre seus aparelhos.' : 'Lançamentos, categorias e metas ficam só neste aparelho.') + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn soft" data-act="refresh" id="refreshBtn">Atualizar dados</button><button type="button" class="btn" data-act="logout">Sair</button></div></section>';

    return '<div class="row-wrap top"><div class="stack" style="flex:1 1 340px">' + invCard + '</div><div class="stack" style="flex:1 1 340px">' + goalCard + accountCard + '</div></div>';
  }

  /* ---------- Banner e renderização ---------- */
  function renderBanner() {
    const parts = [];
    if (DATA.meta.demo) parts.push('<div class="callout warn">Modo demonstração: todos os valores são fictícios.</div>');
    const exp = DATA.meta.consentExpiresAt;
    if (exp) {
      const days = Math.ceil((new Date(exp + 'T00:00:00') - new Date()) / 86400000);
      if (days <= 30) parts.push('<div class="callout warn">A autorização do Open Finance ' + (days > 0 ? 'vence em ' + days + (days > 1 ? ' dias' : ' dia') : 'venceu') + '. Renove no Meu Pluggy para não perder a sincronização.</div>');
    }
    $('#banner').innerHTML = parts.join('');
  }
  function render() {
    if (!DATA) return;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === state.tab ? 'page' : 'false'));
    $('#monthLabel').textContent = mLong(state.month);
    document.querySelector('.month').hidden = state.tab !== 'inicio' && state.tab !== 'gastos';
    $('#subtitle').textContent = DATA.meta.demo ? 'Dados de exemplo' : 'Itaú';
    const views = { inicio: viewInicio, gastos: viewGastos, simular: viewSimular, fixos: viewFixos, metas: viewMetas };
    $('#view').innerHTML = views[state.tab]();
    renderBanner();
  }

  /* ---------- Diálogos ---------- */
  const dlg = () => $('#dlg');
  function openDlg(html) { dlg().innerHTML = html; if (!dlg().open) dlg().showModal(); }
  function closeDlg() { if (dlg().open) dlg().close(); }
  const cancelBtn = '<button type="button" class="btn" data-act="close">Cancelar</button>';
  const catOptions = (sel) => Object.keys(CATS).map((c) => '<option' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>').join('');

  function openAdd() {
    openDlg('<h2>Lançar gasto</h2><p class="muted small">Para dinheiro vivo e o que o banco não mostra.</p>' +
      '<form id="fAdd"><label class="lbl" for="a-desc">O que foi?</label><input id="a-desc" class="input" required maxlength="60" autocomplete="off">' +
      '<label class="lbl" for="a-val">Valor (R$)</label><input id="a-val" class="input" inputmode="decimal" required autocomplete="off">' +
      '<label class="lbl" for="a-cat">Categoria</label><select id="a-cat" class="input">' + catOptions('Alimentação') + '</select>' +
      '<label class="lbl" for="a-met">Forma de pagamento</label><select id="a-met" class="input"><option>Dinheiro</option><option>Pix</option><option>Cartão</option></select>' +
      '<label class="lbl" for="a-date">Data</label><input id="a-date" type="date" class="input" value="' + TODAY + '" max="' + TODAY + '" required>' +
      '<div class="actions">' + cancelBtn + '<button class="btn primary" type="submit">Salvar</button></div></form>');
    setTimeout(() => $('#a-desc').focus(), 50);
  }
  function openCat(id) {
    const t = TX.find((x) => x.id === id);
    if (!t) return;
    openDlg('<h2>Categoria</h2><p class="muted small">' + esc(t.desc) + ' · ' + BRL(t.amount) + '</p>' +
      (t.manual ? '' : '<p class="note" style="margin-top:8px">Vale para todas as compras parecidas, hoje e nas próximas.</p>') +
      '<div class="cat-grid">' + Object.keys(CATS).map((c) => '<button type="button" class="btn" data-act="setcat" data-id="' + esc(id) + '" data-cat="' + esc(c) + '"><span class="dot" style="margin:0;background:' + CATS[c] + '"></span>' + esc(c) + '</button>').join('') + '</div>' +
      '<div class="actions">' + cancelBtn + (t.manual ? '<button type="button" class="btn danger" data-act="del-manual" data-id="' + esc(id) + '">Apagar lançamento</button>' : '') + '</div>');
  }
  function openGoal(id) {
    const g = (STORE.goals || []).find((x) => x.id === id) || { name: '', target: '', saved: '', monthly: 300 };
    openDlg('<h2>' + (id ? 'Editar meta' : 'Nova meta') + '</h2><form id="fGoal" data-id="' + esc(id || '') + '">' +
      '<label class="lbl" for="g-name">Nome</label><input id="g-name" class="input" required maxlength="40" value="' + esc(g.name) + '">' +
      '<label class="lbl" for="g-target">Quanto quer juntar (R$)</label><input id="g-target" class="input" inputmode="decimal" required value="' + esc(g.target) + '">' +
      '<label class="lbl" for="g-saved">Quanto já tem (R$)</label><input id="g-saved" class="input" inputmode="decimal" value="' + esc(g.saved) + '">' +
      '<label class="lbl" for="g-monthly">Quanto guarda por mês (R$)</label><input id="g-monthly" class="input" inputmode="decimal" value="' + esc(g.monthly) + '">' +
      '<div class="actions">' + cancelBtn + (id ? '<button type="button" class="btn danger" data-act="del-goal" data-id="' + esc(id) + '">Apagar</button>' : '') + '<button class="btn primary" type="submit">Salvar</button></div></form>');
  }
  function openValue(formId, title, text, value, extra) {
    openDlg('<h2>' + title + '</h2><p class="muted small">' + text + '</p><form id="' + formId + '"><label class="lbl" for="v-val">Valor (R$)</label><input id="v-val" class="input" inputmode="decimal" required value="' + esc(value || '') + '">' +
      '<div class="actions">' + cancelBtn + (extra || '') + '<button class="btn primary" type="submit">Salvar</button></div></form>');
    setTimeout(() => $('#v-val').focus(), 50);
  }

  /* ---------- Ações ---------- */
  const actions = {
    close: closeDlg,
    reload: () => location.reload(),
    theme: () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
    prev: () => { if (diffM(state.month, CUR) < 12) { state.month = addM(state.month, -1); state.showAll = false; render(); } },
    next: () => { if (diffM(CUR, state.month) < 2) { state.month = addM(state.month, 1); state.showAll = false; render(); } },
    add: openAdd,
    filter: (el) => { state.filter = el.dataset.id; state.showAll = false; render(); },
    more: () => { state.showAll = true; $('#txlist').innerHTML = txListHtml(); },
    'goto-uncat': () => { state.tab = 'gastos'; state.filter = 'uncat'; render(); $('#scroll').scrollTop = 0; },
    'goto-sim': () => { state.tab = 'simular'; render(); $('#scroll').scrollTop = 0; },
    pay: (el) => { state.sim.pay = el.dataset.id; render(); },
    cat: (el) => openCat(el.dataset.id),
    setcat: (el) => {
      const t = TX.find((x) => x.id === el.dataset.id);
      if (!t) return;
      if (t.manual) { const m = STORE.manual.find((x) => x.id === t.id); if (m) m.category = el.dataset.cat; }
      else { STORE.rules = STORE.rules || {}; STORE.rules[t.key] = el.dataset.cat; }
      closeDlg(); saveStore();
    },
    'del-manual': (el) => { STORE.manual = STORE.manual.filter((x) => x.id !== el.dataset.id); closeDlg(); saveStore(); },
    'hide-fixed': (el) => { STORE.fixedHidden = STORE.fixedHidden || {}; STORE.fixedHidden[el.dataset.key] = true; saveStore(); },
    'restore-fixed': () => { STORE.fixedHidden = {}; saveStore(); },
    goal: (el) => openGoal(el.dataset.id),
    'del-goal': (el) => { STORE.goals = STORE.goals.filter((g) => g.id !== el.dataset.id); closeDlg(); saveStore(); },
    budget: () => openValue('fBudget', 'Orçamento mensal', 'Quanto você quer gastar por mês, no máximo.', STORE.budget > 0 ? STORE.budget : budgetValue(), '<button type="button" class="btn" data-act="budget-auto">Automático</button>'),
    'budget-auto': () => { STORE.budget = null; closeDlg(); saveStore(); },
    cofrinho: () => openValue('fCof', 'Saldo do Cofrinho', 'Informe o saldo atual do seu Cofrinho no app do Itaú.', STORE.cofrinho),
    refresh: async (el) => {
      el.disabled = true; el.textContent = 'Atualizando...';
      try { if (await fetchData(true)) { buildTx(); render(); } } catch (e) { el.textContent = 'Sem conexão'; el.disabled = false; }
    },
    logout: async () => { try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { /* ignorado */ } location.reload(); }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act],[data-tab]');
    if (!el) return;
    if (el.dataset.tab) { state.tab = el.dataset.tab; render(); $('#scroll').scrollTop = 0; return; }
    const fn = actions[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.sim;
    if (k) { state.sim[k] = e.target.value; render(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'q') { state.q = e.target.value; state.showAll = false; $('#txlist').innerHTML = txListHtml(); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'loginForm') return;
    e.preventDefault();
    if (f.id === 'fAdd') {
      const amount = parseNum($('#a-val').value);
      if (!(amount > 0)) { $('#a-val').setCustomValidity('Informe um valor maior que zero'); $('#a-val').reportValidity(); return; }
      STORE.manual = STORE.manual || [];
      STORE.manual.push({ id: 'm' + Date.now().toString(36), date: $('#a-date').value || TODAY, desc: $('#a-desc').value.trim(), amount, category: $('#a-cat').value, method: $('#a-met').value });
      state.month = ($('#a-date').value || TODAY).slice(0, 7);
      closeDlg(); saveStore();
    } else if (f.id === 'fGoal') {
      const id = f.dataset.id;
      const g = { id: id || 'g' + Date.now().toString(36), name: $('#g-name').value.trim(), target: parseNum($('#g-target').value), saved: parseNum($('#g-saved').value), monthly: parseNum($('#g-monthly').value) };
      STORE.goals = STORE.goals || [];
      const i = STORE.goals.findIndex((x) => x.id === g.id);
      if (i >= 0) STORE.goals[i] = g; else STORE.goals.push(g);
      closeDlg(); saveStore();
    } else if (f.id === 'fBudget') {
      const v = parseNum($('#v-val').value);
      STORE.budget = v > 0 ? v : null;
      closeDlg(); saveStore();
    } else if (f.id === 'fCof') {
      const v = parseNum($('#v-val').value);
      STORE.cofrinho = v > 0 ? v : null;
      closeDlg(); saveStore();
    }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'a-val') e.target.setCustomValidity(''); });

  /* ---------- Entrar ---------- */
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'), msg = $('#loginMsg');
    btn.disabled = true; msg.hidden = true;
    try {
      const r = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
      if (r.ok) { $('#pw').value = ''; await boot(); }
      else if (r.status === 429) { const j = await r.json().catch(() => ({})); msg.textContent = 'Muitas tentativas. Tente de novo em ' + Math.max(1, Math.ceil((j.retryInSec || 900) / 60)) + ' min.'; msg.hidden = false; }
      else if (r.status === 500) { const j = await r.json().catch(() => ({})); showProblem(500, j); }
      else { msg.textContent = 'Senha incorreta.'; msg.hidden = false; }
    } catch (err) { msg.textContent = 'Sem conexão. Tente de novo.'; msg.hidden = false; }
    btn.disabled = false;
  });

  /* ---------- Início do app ---------- */
  async function boot() {
    if (!(await fetchData(false))) return;
    await loadStore();
    buildTx();
    show('app');
    render();
  }
  initTheme();
  boot().catch(() => showProblem(0, null));
})();
