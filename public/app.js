'use strict';
(() => {
  /* ---------- Constantes e utilidades ---------- */
  // Categorias: cada uma tem um id fixo (não muda ao renomear), um nome e uma cor.
  const DEFAULT_CATS = [
    { id: 'Gatos', name: 'Gatos', color: '#EC4899' },
    { id: 'Alimentação', name: 'Alimentação', color: '#F59E0B' },
    { id: 'Transporte', name: 'Transporte', color: '#0EA5E9' },
    { id: 'Lazer', name: 'Lazer', color: '#8B5CF6' },
    { id: 'Faculdade', name: 'Faculdade', color: '#14B8A6' },
    { id: 'Assinaturas', name: 'Assinaturas', color: '#64748B' },
    { id: 'Saúde', name: 'Saúde', color: '#EF4444' },
    { id: 'Compras', name: 'Compras', color: '#A855F7' },
    { id: 'Contas e planos', name: 'Contas e planos', color: '#0D9488' },
    { id: 'Outros', name: 'Outros', color: '#94A3B8' }
  ];
  const PALETTE = ['#BE123C', '#E11D48', '#EF4444', '#F43F5E', '#EC4899', '#DB2777', '#EA580C', '#F97316', '#F59E0B', '#EAB308', '#CA8A04', '#A16207', '#84CC16', '#65A30D', '#22C55E', '#16A34A', '#10B981', '#0D9488', '#14B8A6', '#06B6D4', '#0EA5E9', '#0284C7', '#3B82F6', '#2563EB', '#1D4ED8', '#4F46E5', '#6366F1', '#8B5CF6', '#7C3AED', '#A855F7', '#C026D3', '#D946EF', '#64748B', '#94A3B8', '#475569', '#334155', '#78716C', '#A8A29E', '#92400E', '#7F1D1D'];
  const NOCAT = 'Sem categoria';
  const HEX = /^#[0-9a-fA-F]{6}$/;
  let CATMAP = {};
  const catsList = () => (Array.isArray(STORE.cats) ? STORE.cats : DEFAULT_CATS);
  const sanitizeCats = (l) => (Array.isArray(l)
    ? l.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && HEX.test(c.color)).map((c) => ({ id: c.id, name: c.name.slice(0, 24), color: c.color }))
    : null);
  function rebuildCats() {
    if (STORE.cats !== null && STORE.cats !== undefined) STORE.cats = sanitizeCats(STORE.cats);
    const m = {};
    catsList().forEach((c) => { m[c.id] = c; });
    CATMAP = m;
  }
  const catName = (id) => (CATMAP[id] ? CATMAP[id].name : NOCAT);
  const catLabel = (id) => (id === NOCAT ? NOCAT : catName(id));
  const catColor = (id) => (CATMAP[id] && HEX.test(CATMAP[id].color) ? CATMAP[id].color : '#D97706');
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
  const defaultStore = () => ({ manual: [], rules: {}, goals: [], budget: null, cofrinho: null, fixedHidden: {}, catCount: 2, cats: null, hidden: {}, hideKeys: {}, notes: {}, invest: { rate: 13, monthly: null }, look: { accent: 'blue', face: 'big', body: 'classic' } });
  const state = { tab: 'inicio', month: CUR, dir: 'out', filter: 'all', fl: { methods: [], cats: [], days: [] }, open: {}, q: '', showAll: false, sim: { valor: '2000', juros: '0', desc: '0', pay: 'card12' } };
  let DATA = null, STORE = defaultStore(), TX = [], FIX = null, storeMode = 'local', saveTimer = null;

  /* ---------- Telas (entrar / problema / app) ---------- */
  function show(which) {
    $('#login').hidden = which !== 'login';
    $('#problem').hidden = which !== 'problem';
    $('#app').hidden = which !== 'app';
    if (which === 'login') {
      faceStatus().then(() => { setFaceUi(); if (!faceOn) $('#pw').focus(); });
    }
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
      $('#problemText').textContent = 'A Pluggy respondeu com o código ' + (j.status || 'desconhecido') + (j.step ? ' na etapa ' + j.step : '') + '. Confira o Client ID, o Client Secret e o itemId. Se tudo estiver certo, a autorização do Open Finance pode ter vencido: renove no Meu Pluggy.';
    } else {
      $('#problemTitle').textContent = 'Algo deu errado';
      $('#problemText').textContent = 'Código ' + status + '. Tente de novo em instantes.';
    }
    show('problem');
  }

  const ACCENTS_OK = (a) => a === 'blue' || a === 'green' || a === 'violet';
  /* ---------- Tema ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('#themeBtn').innerHTML = t === 'dark' ? SUN : MOON;
    try { localStorage.setItem('mg-theme', t); } catch (e) { /* ignorado */ }
    if (typeof applyLook === 'function') applyLook();
  }
  function initTheme() {
    try { const r = JSON.parse(localStorage.getItem('mg-look') || 'null'); if (r && ACCENTS_OK(r.accent)) STORE.look = { accent: r.accent, face: r.face || 'big', body: r.body || 'classic' }; } catch (e) { /* ignorado */ }
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
          if (j.store) { STORE = Object.assign(defaultStore(), j.store); return; }
          // Nuvem vazia: leva para lá o que já estava salvo neste aparelho (só na primeira vez).
          try {
            const raw0 = localStorage.getItem('mg-store');
            if (raw0) {
              STORE = Object.assign(defaultStore(), JSON.parse(raw0));
              fetch('/api/store', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ store: STORE }) }).catch(() => {});
            }
          } catch (e) { /* ignorado */ }
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
  function saveNote(t, v) {
    v = String(v || '').trim().slice(0, 80);
    if (t.manual) { const m = (STORE.manual || []).find((x) => x.id === t.id); if (m) m.note = v; return; }
    STORE.notes = STORE.notes || {};
    if (v) STORE.notes[t.id] = v; else delete STORE.notes[t.id];
  }
  function moveCat(id, d) {
    const l = catsList().map((c) => Object.assign({}, c));
    const i = l.findIndex((c) => c.id === id), j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return;
    const x = l[i]; l[i] = l[j]; l[j] = x;
    STORE.cats = l; saveStore();
  }
  function goList(setup) {
    setup(); state.tab = 'gastos'; state.showAll = false; render();
    const el = $('#txcard');
    if (el) el.scrollIntoView({ block: 'start' });
  }
  function buildTx() {
    rebuildCats();
    const rules = STORE.rules || {};
    const hidden = STORE.hidden || {}, hk = STORE.hideKeys || {}, notes = STORE.notes || {};
    const list = DATA.transactions
      .filter((t) => !hidden[t.id] && !(t.kind !== 'internal' && hk[(t.dir === 'in' ? 'in:' : 'out:') + t.key]))
      .map((t) => Object.assign({}, t, { note: notes[t.id] || '' }));
    (STORE.manual || []).forEach((m) => {
      const inc = m.kind === 'income';
      list.push({
        id: m.id, account: 'manual', date: m.date, desc: m.desc, amount: m.amount, dir: inc ? 'in' : 'out', method: m.method || 'Dinheiro',
        category: inc ? null : (m.category || null), kind: inc ? 'income' : 'expense', key: 'manual:' + m.id, status: 'POSTED', inst: null, manual: true, note: m.note || ''
      });
    });
    list.forEach((t) => { if (t.kind === 'expense' && !t.manual && rules[t.key]) t.category = rules[t.key]; });
    // Categoria apagada (ou desconhecida) vira "Sem categoria".
    list.forEach((t) => { if (t.kind !== 'internal' && t.category && !CATMAP[t.category]) t.category = null; });
    list.sort((a, b) => b.date.localeCompare(a.date));
    TX = list;
    FIX = null;
  }

  /* ---------- Análises ---------- */
  const expenseIn = (ym) => TX.filter((t) => t.kind === 'expense' && t.date.slice(0, 7) === ym);
  const incomeIn = (ym) => TX.filter((t) => t.kind === 'income' && t.date.slice(0, 7) === ym);
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
  function holdings() { const t = investTotals(); return t.all + (t.cofrinho == null && STORE.cofrinho > 0 ? STORE.cofrinho : 0); }
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

  /* ---------- Mascote Bit ---------- */
  const FACES = { big: 'Olhão', brows: 'Sobrancelhas', grin: 'Sorrisão' };
  const ACCENTS = { blue: { n: 'Azul', c: '#0A66D9' }, green: { n: 'Verde', c: '#0F7B5F' }, violet: { n: 'Violeta', c: '#6045E0' } };
  const lookNow = () => Object.assign({ accent: 'blue', face: 'big' }, STORE && STORE.look, { body: 'critter' });
  function bitFace(face, mood) {
    const base = { big: '#8BE9C9', brows: '#FFD27A', grin: '#7FE3FF' }[face] || '#8BE9C9';
    const c = { happy: '#C8F36B', sad: '#A9C8FF', angry: '#FF8A5C', sleepy: '#9CA3AF' }[mood] || base;
    const st = (d, w) => '<path d="' + d + '" stroke="' + c + '" stroke-width="' + (w || 3) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    const fl = (d) => '<path d="' + d + '" fill="' + c + '"/>';
    const zzz = st('M62 38 h7 l-7 8 h7', 2.4);
    const tear = '<path d="M69 58 q-3 5 0 8 q3 -3 0 -8z" fill="#CFE2FF"/>';
    const cheeks = (o) => '<ellipse cx="29" cy="63" rx="5" ry="3" fill="#FF8FA3" fill-opacity="' + o + '"/><ellipse cx="71" cy="63" rx="5" ry="3" fill="#FF8FA3" fill-opacity="' + o + '"/>';
    const glint = (x, y, r) => '<circle cx="' + (x - 2) + '" cy="' + (y - 3) + '" r="' + r + '" fill="#fff"/>';
    if (face === 'brows') {
      const pill = (x, y, h) => '<rect class="eye" x="' + x + '" y="' + y + '" width="8" height="' + h + '" rx="4" fill="' + c + '"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="2.8" height="' + Math.min(5, h - 4) + '" rx="1.4" fill="#fff" fill-opacity=".85"/>';
      return ({
        idle: st('M31 44 Q37 40 43 43') + st('M57 41 Q63 37 69 41') + pill(34, 47, 16) + pill(58, 47, 16) + st('M43 67 Q50 71 57 66', 2.8),
        happy: st('M31 41 Q37 36 43 40') + st('M57 40 Q63 36 69 41') + st('M32 56 Q38 46 44 56 M56 56 Q62 46 68 56', 4.6) + fl('M42 64 Q50 73 58 64Z'),
        sad: st('M31 47 L43 41 M69 47 L57 41', 3.2) + pill(34, 50, 12) + pill(58, 50, 12) + st('M44 69 Q50 64 56 69', 2.8) + tear,
        angry: st('M31 44 L43 41 M69 44 L57 41', 3.4).replace('M31 44 L43 41 M69 44 L57 41', 'M31 41 L43 46 M69 41 L57 46') + pill(34, 50, 10) + pill(58, 50, 10) + st('M43 68 H57', 2.8),
        sleepy: st('M31 47 Q37 50 43 47 M57 47 Q63 50 69 47', 2.6) + st('M33 56 H45 M55 56 H67', 3.6) + zzz,
        thinking: st('M31 42 Q37 36 43 41') + st('M57 44 Q63 41 69 44') + pill(36, 46, 16) + pill(60, 46, 16) + st('M44 67 Q50 70 58 65', 2.8),
        surprised: st('M31 38 Q37 33 43 37') + st('M57 37 Q63 33 69 38') + '<circle cx="38" cy="52" r="6.5" fill="' + c + '"/><circle cx="62" cy="52" r="6.5" fill="' + c + '"/>' + glint(38, 52, 2) + glint(62, 52, 2) + '<ellipse cx="50" cy="67" rx="3.5" ry="4.5" fill="' + c + '"/>'
      })[mood];
    }
    if (face === 'grin') {
      const dot = (x, y, r) => '<circle class="eye" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/>' + glint(x, y, 1.6);
      const tongue = '<path d="M44 66 Q50 71 56 66 Q50 63 44 66Z" fill="#FF8FA3"/>';
      return ({
        idle: dot(38, 48, 4.8) + dot(62, 48, 4.8) + fl('M37 58 Q50 76 63 58Z') + tongue,
        happy: st('M32 50 Q38 42 44 50 M56 50 Q62 42 68 50', 4.2) + fl('M35 57 Q50 79 65 57Z') + '<path d="M43 67 Q50 73 57 67 Q50 63 43 67Z" fill="#FF8FA3"/>',
        sad: st('M32 43 L44 47 M68 43 L56 47') + dot(38, 52, 4.8) + dot(62, 52, 4.8) + st('M41 69 Q50 60 59 69') + tear,
        angry: st('M31 42 L45 47 M69 42 L55 47', 3.4) + dot(38, 53, 4) + dot(62, 53, 4) + st('M41 67 H59', 3),
        sleepy: st('M32 52 H44 M56 52 H68', 3.6) + '<ellipse cx="50" cy="64" rx="3" ry="2.5" fill="' + c + '"/>' + zzz,
        thinking: dot(40, 46, 4.8) + dot(64, 46, 4.8) + st('M43 66 Q50 64 57 68', 3) + '<circle cx="72" cy="38" r="1.8" fill="' + c + '"/>',
        surprised: '<circle cx="38" cy="51" r="7" fill="' + c + '"/><circle cx="62" cy="51" r="7" fill="' + c + '"/>' + glint(38, 51, 2.4) + glint(62, 51, 2.4) + '<ellipse cx="50" cy="67" rx="4" ry="5" fill="' + c + '"/>'
      })[mood];
    }
    const eye = (x, y, ry) => '<ellipse class="eye" cx="' + x + '" cy="' + y + '" rx="6.5" ry="' + (ry || 8) + '" fill="' + c + '"/>' + glint(x, y, 2.6) + '<circle cx="' + (x + 2) + '" cy="' + (y + 3) + '" r="1.2" fill="#fff" fill-opacity=".7"/>';
    return ({
      idle: eye(38, 51) + eye(62, 51) + cheeks(0.6) + st('M45 63 Q50 68 55 63', 2.6),
      happy: st('M31 54 Q38 43 45 54 M55 54 Q62 43 69 54', 4.6) + cheeks(0.8) + fl('M43 62 Q50 72 57 62Z'),
      sad: st('M31 44 L44 47 M69 44 L56 47') + eye(38, 54) + eye(62, 54) + st('M45 68 Q50 63 55 68', 2.6) + tear,
      angry: st('M31 46 L45 51 M69 46 L55 51', 3.4) + eye(38, 56, 5.5) + eye(62, 56, 5.5) + st('M44 67 H56', 2.6),
      sleepy: st('M32 54 Q38 59 44 54 M56 54 Q62 59 68 54', 3.6) + zzz,
      thinking: eye(40, 49) + eye(64, 49) + '<circle cx="46" cy="67" r="2.4" fill="' + c + '"/><circle cx="53" cy="67" r="2.4" fill="' + c + '" fill-opacity=".7"/><circle cx="60" cy="67" r="2.4" fill="' + c + '" fill-opacity=".4"/>',
      surprised: '<circle cx="38" cy="50" r="7.5" fill="' + c + '"/><circle cx="62" cy="50" r="7.5" fill="' + c + '"/>' + glint(38, 50, 2.6) + glint(62, 50, 2.6) + '<ellipse cx="50" cy="67" rx="3.5" ry="4.5" fill="' + c + '"/>'
    })[mood];
  }
  const BODIES = {
    critter: { n: 'Mascote', vb: [0, 8, 100, 90], custom: true }
  };
  function critterEyes(mood) {
    const e = 'fill:var(--bg)', st = 'fill:none;stroke:var(--bg);stroke-width:5;stroke-linecap:round';
    if (mood === 'happy') return '<path class="eye" style="' + st + '" d="M35 68 Q40.500 57 46 68 M54 68 Q59.500 57 65 68"/>';
    if (mood === 'sleepy') return '<path style="' + st + '" d="M35 66 H46 M54 66 H65"/>';
    if (mood === 'surprised') return '<circle class="eye" style="' + e + '" cx="40.500" cy="64" r="6.500"/><circle class="eye" style="' + e + '" cx="59.500" cy="64" r="6.500"/>';
    const h = mood === 'sad' ? 14 : 20;
    return '<rect class="eye" style="' + e + '" x="36" y="' + (mood === 'sad' ? 62 : 56) + '" width="8" height="' + h + '" rx="4"/><rect class="eye" style="' + e + '" x="56" y="' + (mood === 'sad' ? 62 : 56) + '" width="8" height="' + h + '" rx="4"/>';
  }
  function bit(mood, size, float, face, body) {
    face = face || lookNow().face;
    body = BODIES.critter;
    mood = mood || 'idle';
    const v = body.vb, w = Math.round(size * v[2] / v[3]);
    if (body.custom) return '<svg class="bit' + (float ? ' float' : '') + '" width="' + w + '" height="' + size + '" viewBox="' + v.join(' ') + '" role="img" aria-label="Mascote do Opus"><path class="b" d="M26 44 C22 30 24 16 30 15 C37 14 46 24 48 34 Z"/><path class="b" d="M74 44 C78 30 76 16 70 15 C63 14 54 24 52 34 Z"/><ellipse class="b" cx="50" cy="64" rx="42" ry="33"/>' + critterEyes(mood) + '</svg>';
    return '<svg class="bit' + (float ? ' float' : '') + '" width="' + w + '" height="' + size + '" viewBox="' + v.join(' ') + '" role="img" aria-label="Bit, o robô do Opus">' + body.u + '<rect class="b" x="5" y="46" width="9" height="20" rx="4.5"/><rect class="b" x="86" y="46" width="9" height="20" rx="4.5"/><rect class="b" x="14" y="22" width="72" height="62" rx="22"/><rect class="s" x="22" y="31" width="56" height="42" rx="15"/>' + (bitFace(face, mood) || bitFace(face, 'idle')) + '</svg>';
  }
  function applyLook() {
    const L = lookNow();
    document.documentElement.dataset.accent = L.accent;
    try { localStorage.setItem('mg-look', JSON.stringify(L)); } catch (e) { /* ignorado */ }
    const m = document.getElementById('themeColor');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#F5F5F7';
    const bb = document.getElementById('brandBit');
    if (bb) bb.innerHTML = bit('idle', 44, false);
  }
  const CHV = '<svg class="cv" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>';
  const greeting = () => { const h = new Date().getHours(); return (h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + ', Ana.'; };

  /* ---------- Blocos de interface ---------- */
  const barRow = (label, right, pct, color, extra, act) => {
    const inner =
      '<span class="br-top"><span class="br-l">' + esc(label) + '</span><span class="num br-r">' + right + '</span></span>' +
      '<span class="bar br-bar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + color + '"></i></span>' +
      (extra ? '<span class="note br-note">' + extra + '</span>' : '');
    return act ? '<button type="button" class="rowbtn" ' + act + '>' + inner + '</button>' : '<div class="rowbtn static">' + inner + '</div>';
  };

  const item = (nm, ds, vl, extra) =>
    '<div class="item"><div style="min-width:0"><div class="nm">' + esc(nm) + '</div><div class="ds">' + ds + '</div></div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex:none"><span class="vl">' + vl + '</span>' + (extra || '') + '</div></div>';

  function txRow(t) {
    const income = t.kind === 'income';
    const col = income ? '#16A34A' : catColor(catOf(t));
    const cat = income ? 'Entrada' : (t.category ? esc(catName(t.category)) : '<span class="amber">Sem categoria</span>');
    const inst = t.inst ? ' · ' + t.inst.n + '/' + t.inst.total : '';
    const note = t.note ? '<span class="tx-note">' + esc(t.note) + '</span>' : '';
    const inner =
      '<span class="tx-ico" style="background:' + col + '26"><i style="background:' + col + '"></i></span>' +
      '<span class="tx-main"><span class="tx-desc" style="display:block">' + esc(t.desc) + '</span>' +
      '<span class="tx-meta"><span>' + cat + '</span><span aria-hidden="true">·</span><span>' + esc(t.method) + inst + '</span><span aria-hidden="true">·</span><span>' + dShort(t.date) + '</span></span>' + note + '</span>' +
      '<span class="tx-amt" style="color:' + (income ? 'var(--good)' : 'var(--text)') + '">' + (income ? '+ ' : '− ') + BRL(t.amount) + '</span>';
    return '<button type="button" class="tx" data-act="tx" data-id="' + esc(t.id) + '" aria-label="Abrir ' + esc(t.desc) + '">' + inner + '</button>';
  }

  /* ---------- Início ---------- */
  const kpi = (label, valueHtml, sub, cls, act) => {
    const inner = '<span class="k-l">' + label + '</span><span class="k-v ' + (cls || '') + '">' + valueHtml + '</span><span class="k-s">' + sub + '</span>';
    return act ? '<button type="button" class="card kpi" ' + act + '>' + inner + '</button>' : '<div class="card kpi">' + inner + '</div>';
  };

  function viewInicio() {
    const ym = state.month;
    const list = expenseIn(ym);
    const total = sum(list);
    const B = budgetValue();
    const pct = B > 0 ? Math.round((total / B) * 100) : 0;
    const left = B - total;
    const cats = byCat(list);
    const inc = incomeIn(ym), incT = sum(inc), saldo = incT - total;

    const irow = (label, sub, valueHtml, act, cls) => '<' + (act ? 'button type="button"' : 'div') + ' class="ir"' + (act ? ' ' + act : '') + '><span><span class="l">' + label + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</span><span class="v ' + (cls || '') + '">' + valueHtml + '</span>' + (act ? CHV : '') + '</' + (act ? 'button' : 'div') + '>';
    const kpis = '<div class="inset">' +
      irow('Entrou em ' + esc(mName(ym)), inc.length ? inc.length + (inc.length > 1 ? ' entradas' : ' entrada') + ' · ver detalhes' : 'Nenhuma entrada ainda', BRL(incT), 'data-act="goin"', 'good') +
      irow('Saldo do mês', saldo >= 0 ? 'Entrou mais do que saiu' : 'Saiu mais do que entrou', (saldo < 0 ? '−' : '') + BRL(Math.abs(saldo)), '', saldo >= 0 ? 'good' : 'amber') +
      irow('Guardado', 'Cofrinho e investimentos', BRL(holdings()), 'data-tab="invest"') + '</div>';

    const bar = cats.length
      ? '<div class="stack-bar" role="img" aria-label="' + esc('Gastos por categoria: ' + cats.map(([c, v]) => catLabel(c) + ' ' + Math.round((v / total) * 100) + '%').join(', ')) + '">' +
        cats.map(([c, v]) => '<div style="flex:' + v + ' 1 0;background:' + catColor(c) + '"></div>').join('') + '</div>'
      : '<p class="muted">Nenhum gasto neste mês ainda.</p>';
    const legend = cats.length
      ? '<div class="legend">' + cats.map(([c, v]) =>
          '<button type="button" class="it lg-btn" data-act="gocat" data-cat="' + esc(c) + '" aria-label="' + esc('Ver compras de ' + catLabel(c)) + '"><span class="dot" style="background:' + catColor(c) + '"></span><span><span class="lg-name">' + esc(catLabel(c)) + ' · ' + Math.round((v / total) * 100) + '%</span><span class="lg-val">' + BRL(v) + '</span></span></button>').join('') + '</div>' +
        '<p class="note" style="margin-top:-4px">Toque em uma categoria para ver só as compras dela.</p>'
      : '';

    // Humor do Bit conforme o mês
    let mood = 'idle', say;
    if (total === 0 && !inc.length) { mood = 'sleepy'; say = 'Nenhum lançamento em ' + esc(mName(ym)) + ' ainda. Estou até cochilando.'; }
    else if (pct > 100) { mood = 'sad'; say = 'Passou ' + BRL(-left) + ' do combinado. Acontece. A gente ajusta.'; }
    else if (pct >= 90) { mood = 'surprised'; say = 'Quase no limite: faltam só ' + BRL(left) + '. Vale ir devagar.'; }
    else if (pct <= 60) { mood = 'happy'; say = 'Está sobrando! Que tal mandar um pouco para o Cofrinho?'; }
    else { mood = 'idle'; say = 'Tudo no lugar. Ainda dá para gastar ' + BRL(left) + '.'; }

    const mascot = '<div class="mood">' + bit(mood, 120, true) + '<div class="bubble">' + say + '</div></div>';
    const hero =
      '<section class="card hero"><div><h2 class="eyebrow">' + (left >= 0 ? 'Pode gastar' : 'Passou do orçamento') + '</h2><div class="big" style="margin-top:6px">' + money(Math.abs(left)) + '</div>' +
      '<div class="small muted" style="margin-top:6px">Gasto em ' + esc(mName(ym)) + ': ' + BRL(total) + ' de ' + BRL(B) + ' · ' + pct + '%</div></div>' +
      '<div class="bar lg"><i style="width:' + Math.min(100, pct) + '%;background:' + (pct > 100 ? 'var(--amber)' : 'var(--accent)') + '"></i></div>' +
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

    // Como paguei
    const grp = { 'Cartão': 0, 'Pix': 0, 'Boleto': 0, 'Dinheiro': 0, 'Outros': 0 };
    list.forEach((t) => { const k = t.method in grp ? t.method : 'Outros'; grp[k] += t.amount; });
    const gcol = { 'Cartão': 'var(--accent)', 'Pix': '#0D9488', 'Boleto': '#8B5CF6', 'Dinheiro': '#D97706', 'Outros': '#94A3B8' };
    const gflt = { 'Cartão': 'Cartão', 'Pix': 'Pix', 'Boleto': 'Boleto', 'Dinheiro': 'Dinheiro', 'Outros': 'Outros' };
    const payHtml =
      '<section class="card"><div><h2>Como eu paguei</h2><p class="sub">Total do mês por forma de pagamento</p></div><div class="list" style="gap:18px">' +
      Object.entries(grp).filter(([, v]) => v > 0 || total === 0).map(([k, v]) => barRow(k, BRL(v), total ? (v / total) * 100 : 0, gcol[k], total ? Math.round((v / total) * 100) + '% do total' : '', 'data-act="gomethod" data-id="' + gflt[k] + '"')).join('') +
      '</div><p class="note hr" style="margin-top:auto">Cartão, Pix e boleto entram sozinhos pelo banco. Dinheiro vivo você lança em <b style="color:var(--text)">+ Lançar</b>.</p></section>';

    return '<h2 class="greet">' + greeting() + '</h2>' + mascot + hero + kpis + warn + '<div class="row-wrap">' + cardHtml + payHtml + '</div>';
  }

  /* ---------- Gastos ---------- */
  const QUICK_OUT = [['all', 'Todas'], ['Cartão', 'Cartão'], ['Pix', 'Pix'], ['Boleto', 'Boletos'], ['parc', 'Parcelas'], ['Dinheiro', 'Dinheiro'], ['Outros', 'Outros'], ['uncat', 'Sem categoria']];
  const QUICK_IN = [['all', 'Todas'], ['Pix', 'Pix'], ['Dinheiro', 'Dinheiro'], ['Outros', 'Outros']];
  const METHODS = ['Cartão', 'Pix', 'Boleto', 'Transferência', 'Débito', 'Dinheiro', 'Parcelado'];
  const isParc = (t) => !!(t.inst && t.inst.total > 1);
  const flCount = () => state.fl.methods.length + state.fl.cats.length + state.fl.days.length;
  function matchQuick(t, f) {
    if (f === 'all') return true;
    if (f === 'parc') return isParc(t);
    if (f === 'Outros') return !['Cartão', 'Pix', 'Dinheiro', 'Boleto'].includes(t.method);
    if (f === 'uncat') return t.kind === 'expense' && !t.category;
    return t.method === f;
  }
  function filteredTx() {
    const want = state.dir === 'in' ? 'income' : 'expense';
    let l = TX.filter((t) => t.kind === want && t.date.slice(0, 7) === state.month);
    l = l.filter((t) => matchQuick(t, state.filter));
    const fl = state.fl;
    if (fl.methods.length) l = l.filter((t) => fl.methods.some((m) => (m === 'Parcelado' ? isParc(t) : t.method === m)));
    if (fl.cats.length && want === 'expense') l = l.filter((t) => fl.cats.includes(catOf(t)));
    if (fl.days.length) l = l.filter((t) => fl.days.includes(t.date.slice(8, 10)));
    if (state.q) { const q = strip(state.q); l = l.filter((t) => strip(t.desc).includes(q) || strip(t.note).includes(q)); }
    return l;
  }
  function pillsHtml() {
    const fl = state.fl;
    const p = [];
    const pill = (g, v, label) => '<button type="button" class="pill-x" data-act="fl" data-g="' + g + '" data-v="' + esc(v) + '" aria-label="Remover filtro ' + esc(label) + '">' + esc(label) + ' <span aria-hidden="true">✕</span></button>';
    fl.methods.forEach((m) => p.push(pill('methods', m, m)));
    if (state.dir === 'out') fl.cats.forEach((c) => p.push(pill('cats', c, catLabel(c))));
    fl.days.forEach((d) => p.push(pill('days', d, 'Dia ' + Number(d))));
    return p.length ? '<div class="pills">' + p.join('') + '<button type="button" class="pill-x clear" data-act="fl-clear">Limpar filtros</button></div>' : '';
  }
  function txListHtml() {
    const l = filteredTx();
    const isIn = state.dir === 'in';
    const head = '<div class="sum-line"><span>' + l.length + (l.length === 1 ? ' transação' : ' transações') + '</span><b class="num">' + (isIn ? '+ ' : '− ') + BRL(sum(l)) + '</b></div>';
    if (!l.length) return head + '<p class="muted" style="padding:16px 0">Nada encontrado com esses filtros neste mês.</p>';
    const shown = state.showAll ? l : l.slice(0, 30);
    return head + shown.map(txRow).join('') + (l.length > shown.length ? '<button type="button" class="btn block soft" style="margin-top:8px" data-act="more">Ver mais ' + (l.length - shown.length) + '</button>' : '');
  }
  const FUNNEL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>';

  function viewGastos() {
    const isIn = state.dir === 'in';
    const quick = (isIn ? QUICK_IN : QUICK_OUT).map(([id, l]) => '<button type="button" class="chip" data-act="filter" data-id="' + id + '" aria-pressed="' + (state.filter === id) + '">' + l + '</button>').join('');
    const n = flCount();
    const seg = '<div class="seg" role="group" aria-label="Tipo de transação"><button type="button" data-act="dir" data-id="out" aria-pressed="' + !isIn + '">Saídas</button><button type="button" data-act="dir" data-id="in" aria-pressed="' + isIn + '">Entradas</button></div>';

    let side;
    if (isIn) {
      const inc = incomeIn(state.month), incT = sum(inc), outT = sum(expenseIn(state.month));
      const big = inc.slice().sort((a, b) => b.amount - a.amount)[0];
      side = '<section class="card"><div><h2>Resumo de ' + esc(mName(state.month)) + '</h2><p class="sub">O que entrou e o que saiu</p></div><div>' +
        item('Entrou', inc.length + (inc.length === 1 ? ' entrada' : ' entradas'), '<span class="good">+ ' + BRL(incT) + '</span>') +
        item('Saiu', 'Total de gastos', '− ' + BRL(outT)) +
        item('Saldo do mês', big ? 'Maior entrada: ' + esc(big.desc) : '', '<b class="' + (incT - outT >= 0 ? 'good' : 'amber') + '">' + (incT - outT < 0 ? '− ' : '') + BRL(Math.abs(incT - outT)) + '</b>') + '</div>' +
        '<p class="note">Toque em uma entrada para anotar de onde veio (por exemplo, “meu pai me emprestou”) ou para remover o que não é seu, como Pix de clientes da sua mãe.</p>' +
        '<button type="button" class="btn soft" data-act="add-in">+ Lançar entrada</button></section>';
    } else {
      const list = expenseIn(state.month);
      const avg = avgByCat();
      const cur = {};
      byCat(list).forEach(([c, v]) => { cur[c] = v; });
      const names = Array.from(new Set(Object.keys(cur).concat(Object.keys(avg)))).sort((a, b) => Math.max(cur[b] || 0, avg[b] || 0) - Math.max(cur[a] || 0, avg[a] || 0)).slice(0, 8);
      const cmp = names.length
        ? names.map((c) => {
            const v = cur[c] || 0, a = avg[c] || 0;
            const over = a > 0 && v > a;
            return barRow(catLabel(c), BRL(v) + (a > 0 ? ' <span class="muted">de ' + BRL(a) + '</span>' : ''), a > 0 ? (v / a) * 100 : (v > 0 ? 100 : 0), catColor(c), a > 0 ? (over ? '<span class="amber">' + Math.round((v / a) * 100) + '% da sua média · acima</span>' : Math.round((v / a) * 100) + '% da sua média') : 'Sem histórico para comparar', 'data-act="gocat" data-cat="' + esc(c) + '"');
          }).join('')
        : '<p class="muted">Sem dados ainda.</p>';
      side = '<section class="card"><div><h2>Comparado com sua média</h2><p class="sub">Média dos últimos 3 meses · toque para filtrar</p></div><div class="list" style="gap:12px">' + cmp + '</div></section>';
    }

    return '<div class="row-wrap top"><section class="card wide" id="txcard"><div class="split" style="align-items:center"><div><h2>' + (isIn ? 'Entradas' : 'Transações') + '</h2><p class="sub">' + (DATA.meta.demo ? 'Dados de exemplo' : 'Sincronizadas do Itaú') + '</p></div>' + seg + '</div>' +
      '<div class="search-row"><div style="flex:1 1 auto"><label class="sr-only" for="q">Buscar transação</label><input id="q" class="input" type="search" placeholder="Buscar transação" value="' + esc(state.q) + '" autocomplete="off"></div>' +
      '<button type="button" class="icon-btn filt" data-act="filter-open" aria-label="Filtros avançados' + (n ? ', ' + n + ' ativos' : '') + '">' + FUNNEL + (n ? '<span class="badge">' + n + '</span>' : '') + '</button></div>' +
      '<div class="chips">' + quick + '</div>' + pillsHtml() + '<div id="txlist">' + txListHtml() + '</div></section>' + side + '</div>';
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

    return '<button type="button" class="sim-back" data-act="goto-config">‹ Configurações</button><section class="card"><div><h2 style="font-size:18px;font-weight:700">Simular uma compra</h2><p class="sub">Veja como a compra mexe no seu orçamento de ' + BRL(S.B) + ', mês a mês.</p></div>' +
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

  /* ---------- Investimentos ---------- */
  const invCfg = () => Object.assign({ rate: 13, monthly: null }, STORE.invest || {});
  const mRate = (aa) => Math.pow(1 + aa / 100, 1 / 12) - 1;
  const pct2 = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
  function fv(b, p, aa, n) {
    const i = mRate(aa);
    if (!(i > 0)) return b + p * n;
    const g = Math.pow(1 + i, n);
    return b * g + p * ((g - 1) / i);
  }
  function monthsTo(target, b, p, aa) {
    if (b >= target) return 0;
    for (let n = 1; n <= 600; n++) if (fv(b, p, aa, n) >= target) return n;
    return null;
  }
  function monthsLabel(n) {
    if (n == null) return 'mais de 50 anos';
    if (n === 0) return 'já atingida';
    if (n < 12) return n + (n > 1 ? ' meses' : ' mês');
    const y = Math.floor(n / 12), m = n % 12;
    return y + (y > 1 ? ' anos' : ' ano') + (m ? ' e ' + m + (m > 1 ? ' meses' : ' mês') : '');
  }
  function surplusAvg() {
    const rows = [];
    for (let i = 1; i <= 3; i++) {
      const ym = addM(CUR, -i);
      const e = expenseIn(ym);
      if (e.length) rows.push(sum(incomeIn(ym)) - sum(e));
    }
    return rows.length ? rows.reduce((s, v) => s + v, 0) / rows.length : null;
  }
  function plannedMonthly() {
    const c = invCfg();
    if (c.monthly != null && c.monthly >= 0) return { v: c.monthly, auto: false };
    const s = surplusAvg();
    return { v: s != null && s > 0 ? Math.floor(s / 10) * 10 : 0, auto: true };
  }
  function lineChart(a, b) {
    const W = 560, H = 190, pl = 6, pr = 6, pt = 10, pb = 24, n = a.length;
    const mx = Math.max.apply(null, a.concat(b).concat([1])) * 1.06;
    const x = (i) => pl + ((W - pl - pr) * i) / (n - 1);
    const y = (v) => pt + (H - pt - pb) * (1 - v / mx);
    const pts = (arr) => arr.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    const area = pts(a) + ' ' + x(n - 1).toFixed(1) + ',' + (H - pb) + ' ' + x(0).toFixed(1) + ',' + (H - pb);
    const ticks = [0, 6, 12, 18, 24].filter((i) => i < n).map((i) => '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + (i === 0 ? 'hoje' : i + ' m') + '</text>').join('');
    return '<svg class="lc" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Projeção do saldo em ' + (n - 1) + ' meses: com aportes chega a ' + BRL(a[n - 1]) + ', só com rendimento a ' + BRL(b[n - 1])) + '">' +
      '<line class="gl" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '"/><polygon class="ar" points="' + area + '"/><polyline class="ln-b" points="' + pts(b) + '"/><polyline class="ln-a" points="' + pts(a) + '"/>' + ticks + '</svg>';
  }

  function viewInvest() {
    const c = invCfg();
    const B0 = holdings();
    const P = plannedMonthly();
    const rate = c.rate;
    const at = (n) => ({ n, com: fv(B0, P.v, rate, n), sem: fv(B0, 0, rate, n) });
    const hz = [6, 12, 24, 36].map(at);
    const yieldM = B0 * mRate(rate);
    const N = 24, sa = [], sb = [];
    for (let k = 0; k <= N; k++) { sa.push(fv(B0, P.v, rate, k)); sb.push(fv(B0, 0, rate, k)); }
    const h12 = hz[1];

    const inv = (DATA.investments || []).slice().sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const invRows = inv.length
      ? inv.map((i) => item(i.name, esc(i.subtype || i.type || 'Investimento') + (i.rate ? ' · ' + i.rate + '%' : ''), BRL(i.balance != null ? i.balance : i.amount))).join('')
      : '<p class="muted">O banco não enviou investimentos.</p>';
    const totals = investTotals();
    const manualNote = totals.cofrinho == null
      ? '<p class="note hr">O Itaú pode não enviar o Cofrinho. ' + (STORE.cofrinho > 0 ? 'Saldo informado por você: <b style="color:var(--text)">' + BRL(STORE.cofrinho) + '</b>. ' : 'Se ele não aparece, informe o saldo à mão. ') + '<button type="button" class="linkbtn" data-act="cofrinho">' + (STORE.cofrinho > 0 ? 'Atualizar saldo' : 'Informar saldo do Cofrinho') + '</button></p>'
      : '';

    const hero =
      '<section class="card hero"><div class="split"><div><h2 class="eyebrow">Guardado hoje</h2><div class="big" style="margin-top:6px">' + money(B0) + '</div>' +
      '<p class="small muted" style="margin-top:8px">' + (B0 > 0 ? 'Rende cerca de <b style="color:var(--text)">' + BRL(yieldM) + '</b> por mês, a ' + pct2(rate) + ' ao ano (estimativa)' : 'Informe o saldo do seu Cofrinho para ver as previsões') + '</p></div>' +
      '<div class="params"><button type="button" class="param" data-act="rate"><span class="k">Rendimento estimado</span><span class="v">' + pct2(rate) + ' a.a.</span></button>' +
      '<button type="button" class="param" data-act="aporte"><span class="k">Aporte mensal' + (P.auto ? ' (automático)' : '') + '</span><span class="v">' + BRL(P.v) + '</span></button></div></div></section>';

    const sens = (d) => fv(B0, P.v, Math.max(0.1, rate + d), 12);
    const proj =
      '<section class="card"><div><h2>Previsão do seu saldo</h2><p class="sub">' + (P.v > 0 ? 'Guardando ' + BRL(P.v) + ' por mês' : 'Sem novos aportes, só rendimento') + ' · rendimento bruto de ' + pct2(rate) + ' ao ano</p></div>' +
      '<div class="stats">' + hz.map((h) => '<div><div class="k">Em ' + h.n + ' meses</div><div class="v">' + BRL(h.com) + '</div>' + (P.v > 0 ? '<div class="note">só rendimento: ' + BRL(h.sem) + '</div>' : '') + '</div>').join('') + '</div>' +
      lineChart(sa, sb) +
      '<div class="keys"><span><i style="background:var(--accent)"></i>' + (P.v > 0 ? 'Com aportes de ' + BRL(P.v) + '/mês' : 'Saldo previsto') + '</span>' + (P.v > 0 ? '<span><i style="background:var(--muted)"></i>Só com rendimento</span>' : '') + '</div>' +
      (B0 > 0 || P.v > 0
        ? '<div class="callout">Em 12 meses você teria cerca de <b>' + BRL(h12.com) + '</b>, sendo ' + BRL(P.v * 12) + ' guardados por você e ' + BRL(Math.max(0, h12.com - B0 - P.v * 12)) + ' de rendimento. Se a taxa for 2 pontos menor (' + pct2(Math.max(0.1, rate - 2)) + '), seriam ' + BRL(sens(-2)) + '; com 2 pontos a mais (' + pct2(rate + 2) + '), ' + BRL(sens(2)) + '.</div>'
        : '<div class="callout">Defina um aporte mensal ou informe o saldo do Cofrinho para ver a previsão.</div>') +
      '</section>';

    // Reserva de emergência
    const base = avgTotal() || sum(expenseIn(CUR));
    const target = base * 6;
    const cover = base > 0 ? B0 / base : null;
    const rp = target > 0 ? Math.min(100, (B0 / target) * 100) : 0;
    const toGo = monthsTo(target, B0, P.v, rate);
    const reserve =
      '<section class="card"><div><h2>Reserva de emergência</h2><p class="sub">Meta comum: 6 meses do seu gasto médio</p></div>' +
      (base > 0
        ? '<div><div class="between"><span style="font-size:14px;font-weight:600">' + BRL(B0) + ' de ' + BRL(target) + '</span><b class="num">' + Math.round(rp) + '%</b></div><div class="bar lg" style="margin-top:8px"><i style="width:' + rp + '%;background:' + (rp >= 100 ? 'var(--good)' : 'var(--accent)') + '"></i></div>' +
          '<p class="note" style="margin-top:8px">Hoje cobre ' + (cover >= 10 ? Math.round(cover) : cover.toFixed(1).replace('.', ',')) + ' meses de gastos (média de ' + BRL(base) + '/mês). ' + (rp >= 100 ? 'Meta atingida.' : 'Com o aporte e o rendimento atuais, você chega lá em ' + monthsLabel(toGo) + '.') + '</p></div>'
        : '<p class="muted">Preciso de alguns meses de gastos para calcular.</p>') + '</section>';

    // Indicações
    const tips = [];
    const tip = (tone, title, text) => tips.push('<div class="tip ' + tone + '"><div class="tip-t">' + esc(title) + '</div><div class="tip-x">' + esc(text) + '</div></div>');
    if (cover != null) {
      if (cover < 3) tip('warn', 'Reserva ainda curta', 'Seu saldo cobre ' + cover.toFixed(1).replace('.', ',') + ' meses de gastos. Antes de pensar em investimentos de maior risco, vale chegar a pelo menos 3 meses (' + BRL(base * 3) + ') e depois a 6.');
      else if (cover < 6) tip('ok', 'Reserva a caminho', 'Você já cobre ' + cover.toFixed(1).replace('.', ',') + ' meses. Faltam ' + BRL(Math.max(0, target - B0)) + ' para a meta de 6 meses.');
      else tip('good', 'Reserva completa', 'Seu saldo cobre ' + Math.floor(cover) + ' meses de gastos. O que passar disso pode ir para objetivos de prazo mais longo; compare opções como CDB, Tesouro Selic e LCI/LCA, olhando liquidez e imposto.');
    }
    const sMonth = sum(incomeIn(CUR)) - sum(expenseIn(CUR));
    const sAvg = surplusAvg();
    if (sAvg != null && sAvg > 0) {
      tip('ok', 'Sobra média de ' + BRL(sAvg) + ' por mês', 'É a média de entradas menos gastos nos últimos 3 meses. Guardando tudo isso por 12 meses, com o rendimento estimado, seriam cerca de ' + BRL(fv(0, sAvg, rate, 12)) + '.');
    } else if (sAvg != null) {
      tip('warn', 'Os gastos vêm passando as entradas', 'Nos últimos 3 meses saiu em média ' + BRL(-sAvg) + ' a mais do que entrou. Se houver Pix que não é seu (como de clientes da sua mãe), remova em Gastos → Entradas ou Saídas para a conta ficar certa.');
    }
    if (state.month === CUR && sum(incomeIn(CUR)) > 0 && sMonth < 0) tip('warn', 'Este mês está no vermelho', 'Até agora saiu ' + BRL(-sMonth) + ' a mais do que entrou em ' + mName(CUR) + '.');
    const avg = avgByCat();
    const curBy = {};
    byCat(expenseIn(CUR)).forEach(([cc, v]) => { curBy[cc] = v; });
    let worst = null;
    Object.keys(curBy).forEach((cc) => { const d = curBy[cc] - (avg[cc] || 0); if ((avg[cc] || 0) > 0 && d > 100 && curBy[cc] > avg[cc] * 1.2 && (!worst || d > worst.d)) worst = { c: cc, d }; });
    if (worst) tip('warn', catLabel(worst.c) + ' acima da sua média', 'Neste mês você já gastou ' + BRL(worst.d) + ' a mais que o normal. Voltar à média liberaria esse valor para guardar: em 12 meses, repetindo isso, seriam cerca de ' + BRL(fv(0, worst.d, rate, 12)) + '.');
    const fx = fixed();
    let drop = null;
    for (let i = 1; i <= 12; i++) { if (fx.at(i) < fx.at(i - 1) - 0.005) { drop = i; break; } }
    if (drop) { const freed = fx.at(drop - 1) - fx.at(drop); tip('ok', 'Parcelas terminando em ' + mName(addM(CUR, drop)), 'Seus gastos fixos caem ' + BRL(freed) + ' por mês. Se esse valor virar aporte, em 12 meses somariam cerca de ' + BRL(fv(0, freed, rate, 12)) + '.'); }
    tip('info', 'Compare o rendimento', 'O Cofrinho costuma render perto de 100% do CDI. Vale comparar com CDB de liquidez diária e Tesouro Selic para o dinheiro da reserva, conferindo a taxa e o imposto antes.');
    const advice =
      '<section class="card"><div><h2>Indicações</h2><p class="sub">Calculadas com os seus números</p></div><div class="tips">' + tips.join('') + '</div>' +
      '<p class="note">Estimativas simples, com o rendimento que você definiu. O rendimento real varia, e há imposto de renda sobre investimentos. Isto não é recomendação de investimento.</p></section>';

    // Metas
    const goals = STORE.goals || [];
    const goalRows = goals.length
      ? goals.map((g) => {
          const p = g.target > 0 ? (g.saved / g.target) * 100 : 0;
          const missing = Math.max(0, g.target - g.saved);
          const months = g.monthly > 0 ? monthsTo(g.target, g.saved, g.monthly, rate) : null;
          return '<div><div class="between"><span style="font-size:14px;font-weight:600">' + esc(g.name) + '</span><span class="num" style="font-size:14px">' + BRL(g.saved) + ' de ' + BRL(g.target) + '</span></div>' +
            '<div class="bar lg" style="margin-top:6px"><i style="width:' + Math.min(100, p) + '%;background:#0D9488"></i></div>' +
            '<div class="between" style="margin-top:4px;align-items:center"><span class="note">' + Math.round(p) + '% · ' + (missing > 0 ? 'faltam ' + BRL(missing) + (g.monthly > 0 ? ', cerca de ' + monthsLabel(months) + ' guardando ' + BRL(g.monthly) + ' (com rendimento)' : '') : 'meta atingida') + '</span>' +
            '<button type="button" class="btn small" data-act="goal" data-id="' + esc(g.id) + '">Editar</button></div></div>';
        }).join('')
      : '<p class="muted">Você ainda não criou metas.</p>';
    const goalCard =
      '<section class="card"><div><h2>Minhas metas</h2><p class="sub">Quanto falta para cada uma</p></div><div class="list" style="gap:18px">' + goalRows + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn soft" data-act="goal">+ Nova meta</button><button type="button" class="btn soft" data-act="goto-sim">Simular uma compra</button></div></section>';

    const holdCard = '<section class="card" style="gap:4px"><div><h2>O que você tem investido</h2><p class="sub">Saldo que o Itaú compartilha</p></div><div style="margin-top:8px">' + invRows + '</div>' + manualNote + '</section>';

    return '<div class="page-h"><h2>Investimentos</h2><p>Previsões, estimativas e indicações com base nos seus números</p></div>' + hero +
      '<div class="row-wrap top"><div class="stack" style="flex:1.4 1 420px">' + proj + reserve + '</div><div class="stack" style="flex:1 1 320px">' + advice + goalCard + holdCard + '</div></div>';
  }

  /* ---------- Configurações ---------- */
  const CHEV = '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
  const DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  function acc(id, title, sub, body) {
    const open = !!state.open[id];
    return '<section class="card acc"><button type="button" class="acc-h" data-act="acc" data-id="' + id + '" aria-expanded="' + open + '"><span><span class="acc-t">' + title + '</span><span class="acc-s">' + sub + '</span></span>' + CHEV + '</button>' +
      (open ? '<div class="acc-b">' + body + '</div>' : '') + '</section>';
  }
  const row = (nm, ds, right) => '<div class="item"><div style="min-width:0"><div class="nm">' + nm + '</div>' + (ds ? '<div class="ds">' + ds + '</div>' : '') + '</div><div style="display:flex;align-items:center;gap:8px;flex:none">' + right + '</div></div>';

  function viewConfig() {
    const meta = DATA.meta || {};
    const when = meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const dark = document.documentElement.dataset.theme === 'dark';

    const LK = lookNow();
    const accBtns = Object.keys(ACCENTS).map((k) => '<button type="button" class="opt' + (LK.accent === k ? ' on' : '') + '" data-act="set-accent" data-id="' + k + '" aria-pressed="' + (LK.accent === k) + '"><i class="dot" style="background:' + ACCENTS[k].c + '"></i>' + ACCENTS[k].n + '</button>').join('');
    const summary = ACCENTS[LK.accent].n;
    const look = '<section class="card" style="gap:0"><button type="button" class="look-head" data-act="toggle-look" aria-expanded="' + lookOpen + '"><span><span class="l">Aparência</span><span class="s">' + summary + '</span></span><span class="cvwrap' + (lookOpen ? ' open' : '') + '">' + CHV + '</span></button>' +
      (lookOpen ? '<div class="look-body"><div class="item"><div><div class="nm">Tema</div><div class="ds">' + (dark ? 'Escuro' : 'Claro') + ' ativo</div></div>' +
      '<div class="seg" role="group" aria-label="Tema"><button type="button" data-act="set-theme" data-id="light" aria-pressed="' + !dark + '">Claro</button><button type="button" data-act="set-theme" data-id="dark" aria-pressed="' + dark + '">Escuro</button></div></div>' +
      '<div class="item"><div style="min-width:0;width:100%"><div class="nm">Cor de destaque</div><div class="opts" role="group" aria-label="Cor de destaque">' + accBtns + '</div></div></div>' +
      '</div>' : '') + '</section>';

    const faceSub = !faceSupported() ? 'Este navegador não oferece Face ID' : faceOn ? 'Ativado: entre sem digitar a senha' : 'Desativado neste aparelho';
    const security = '<section class="card" style="gap:0"><div class="item" style="border-top:0;padding-top:0"><div style="min-width:0"><div class="nm">Entrar com Face ID</div><div class="ds">' + esc(faceMsg || faceSub) + '</div></div>' +
      (faceSupported() ? (faceOn ? '<button type="button" class="btn small" data-act="face-disable"' + (faceBusy ? ' disabled' : '') + '>Desativar</button>' : '<button type="button" class="btn small soft" data-act="face-enable"' + (faceBusy ? ' disabled' : '') + '>Ativar</button>') : '') + '</div>' +
      '<p class="note" style="margin-top:6px">Vale só para este aparelho: ative no iPhone e no Mac separadamente. A senha continua funcionando.</p></section>';

    const cl = catsList();
    const usage = {};
    TX.forEach((t) => { if (t.kind === 'expense' && t.category) usage[t.category] = (usage[t.category] || 0) + 1; });
    const catBody = (cl.length
      ? cl.map((c, i) => row('<span style="display:flex;align-items:center;gap:10px"><span class="dot" style="margin:0;background:' + catColor(c.id) + '"></span>' + esc(c.name) + '</span>', (usage[c.id] || 0) + (usage[c.id] === 1 ? ' compra' : ' compras'),
          '<button type="button" class="icon-btn sm" data-act="cat-up" data-id="' + esc(c.id) + '" aria-label="Subir ' + esc(c.name) + '"' + (i === 0 ? ' disabled' : '') + '>' + UP + '</button>' +
          '<button type="button" class="icon-btn sm" data-act="cat-down" data-id="' + esc(c.id) + '" aria-label="Descer ' + esc(c.name) + '"' + (i === cl.length - 1 ? ' disabled' : '') + '>' + DOWN + '</button>' +
          '<button type="button" class="btn small" data-act="cat-edit" data-id="' + esc(c.id) + '" aria-label="Editar ' + esc(c.name) + '">Editar</button>')).join('')
      : '<p class="muted">Nenhuma categoria. Crie a primeira abaixo.</p>') +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px"><button type="button" class="btn soft" data-act="cat-edit">+ Nova categoria</button>' + (Array.isArray(STORE.cats) ? '<button type="button" class="btn" data-act="cat-reset">Restaurar padrão</button>' : '') + '</div>' +
      '<p class="note" style="margin-top:10px">A ordem aqui é a mesma que aparece ao escolher a categoria de uma compra.</p>';

    const c = invCfg(), P = plannedMonthly();
    const budBody =
      row('Orçamento mensal', STORE.budget > 0 ? 'Definido por você' : 'Automático, com base na sua média', '<b class="num">' + BRL(budgetValue()) + '</b><button type="button" class="btn small" data-act="budget">Alterar</button>') +
      row('Saldo do Cofrinho', investTotals().cofrinho != null ? 'Lido do Itaú' : (STORE.cofrinho > 0 ? 'Informado por você' : 'O Itaú não enviou; informe à mão'), '<b class="num">' + BRL(savedTotal()) + '</b>' + (investTotals().cofrinho != null ? '' : '<button type="button" class="btn small" data-act="cofrinho">' + (STORE.cofrinho > 0 ? 'Atualizar' : 'Informar') + '</button>')) +
      row('Rendimento estimado', 'Usado nas previsões de Investimentos', '<b class="num">' + pct2(c.rate) + ' a.a.</b><button type="button" class="btn small" data-act="rate">Alterar</button>') +
      row('Aporte mensal planejado', P.auto ? 'Automático: sobra média das entradas menos gastos' : 'Definido por você', '<b class="num">' + BRL(P.v) + '</b><button type="button" class="btn small" data-act="aporte">Alterar</button>');

    const hid = Object.entries(STORE.hidden || {});
    const hk = Object.entries(STORE.hideKeys || {});
    const fxN = Object.keys(STORE.fixedHidden || {}).length;
    const hidBody =
      (hid.length || hk.length || fxN
        ? hk.map(([k, v]) => row('Entradas de “' + esc((v && v.n) || k) + '”', 'Ignoradas sempre', '<button type="button" class="btn small" data-act="restore-key" data-key="' + esc(k) + '">Restaurar</button>')).join('') +
          hid.slice(0, 60).map(([id, v]) => row(esc(v.d || 'Transação'), esc((v.dt ? dShort(v.dt) : '') + ' · ' + (v.dir === 'in' ? 'Entrada' : 'Saída')), '<span class="vl">' + BRL(v.a) + '</span><button type="button" class="btn small" data-act="restore-tx" data-id="' + esc(id) + '">Restaurar</button>')).join('') +
          (fxN ? row('Gastos fixos ocultos', 'Marcados como “Não é fixo”', '<button type="button" class="btn small" data-act="restore-fixed">Mostrar ' + fxN + '</button>') : '')
        : '<p class="muted">Nada removido. Para tirar uma transação das contas, toque nela em Gastos e escolha “Remover”.</p>') +
      '<p class="note" style="margin-top:10px">Transações removidas deixam de entrar nos totais, nas médias e nas previsões. Você pode restaurá-las aqui.</p>';

    const account =
      '<section class="card"><div><h2>Conta e dados</h2></div><div class="small muted" style="line-height:1.6">' + (meta.demo ? 'Dados de demonstração.' : 'Dados lidos em ' + esc(when) + '. O Meu Pluggy atualiza o banco a cada 24 horas.') +
      (meta.consentExpiresAt ? '<br>Autorização do Open Finance até ' + esc(meta.consentExpiresAt.split('-').reverse().join('/')) + '.' : '') +
      '<br>' + (storeMode === 'server' ? 'Lançamentos, categorias e metas sincronizam entre seus aparelhos.' : 'Lançamentos, categorias e metas ficam só neste aparelho.') + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn soft" data-act="refresh" id="refreshBtn">Atualizar dados</button><button type="button" class="btn" data-act="logout">Sair</button></div></section>';

    const tools = '<div class="inset"><button type="button" class="ir" data-act="goto-sim"><span><span class="l">Simulador de compra</span><span class="s">Veja como uma compra mexe no orçamento, mês a mês</span></span>' + CHV + '</button></div>';
    return '<div class="page-h"><h2>Configurações</h2><p>Tudo o que você pode ajustar no app</p></div>' +
      '<div class="cfg">' + tools + look + security +
      acc('cats', 'Editar categorias', cl.length + (cl.length === 1 ? ' categoria' : ' categorias') + ' · nome, cor e ordem', catBody) +
      acc('budget', 'Orçamento e conta', 'Orçamento, Cofrinho, rendimento e aporte', budBody) +
      acc('hidden', 'Transações removidas', (hid.length + hk.length + fxN) ? (hid.length + hk.length + fxN) + ' itens para restaurar' : 'Nenhuma', hidBody) +
      account + '</div>';
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
  let lastTab = null, lastLook = '', lookOpen = false;
  function render() {
    { const lk = JSON.stringify(lookNow()); if (lk !== lastLook) { lastLook = lk; applyLook(); } }
    if (!DATA) return;
    const shown = state.tab === 'simular' ? 'config' : state.tab;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === shown ? 'page' : 'false'));
    $('#monthLabel').textContent = mLong(state.month);
    const mt = state.tab === 'inicio' || state.tab === 'gastos';
    document.querySelector('.month').hidden = !mt;
    $('#addBtn').hidden = !mt;
    $('#subtitle').textContent = DATA.meta.demo ? 'Dados de exemplo' : 'Itaú';
    const views = { inicio: viewInicio, gastos: viewGastos, simular: viewSimular, fixos: viewFixos, invest: viewInvest, config: viewConfig };
    const vw = $('#view'); vw.innerHTML = views[state.tab]();
    if (state.tab !== lastTab) { vw.classList.remove('go'); void vw.offsetWidth; vw.classList.add('go'); lastTab = state.tab; }
    renderBanner();
  }

  /* ---------- Diálogos ---------- */
  const dlg = () => $('#dlg');
  function openDlg(html) { dlg().innerHTML = html; if (!dlg().open) dlg().showModal(); }
  function closeDlg() { if (dlg().open) dlg().close(); }
  const cancelBtn = '<button type="button" class="btn" data-act="close">Cancelar</button>';
  const catOptions = (sel) => '<option value="">Sem categoria</option>' + catsList().map((c) => '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');

  function openAdd(type) {
    const inc = type === 'in';
    const seg = '<div class="seg" role="group" aria-label="Tipo" style="margin-top:12px"><button type="button" data-act="add-type" data-id="out" aria-pressed="' + !inc + '">Gasto</button><button type="button" data-act="add-type" data-id="in" aria-pressed="' + inc + '">Entrada</button></div>';
    const methods = inc ? ['Pix', 'Dinheiro', 'Transferência'] : ['Dinheiro', 'Pix', 'Cartão', 'Boleto'];
    openDlg('<h2>' + (inc ? 'Lançar entrada' : 'Lançar gasto') + '</h2><p class="muted small">' + (inc ? 'Dinheiro que entrou e o banco não mostra, ou algo para anotar.' : 'Para dinheiro vivo e o que o banco não mostra.') + '</p>' + seg +
      '<form id="fAdd" data-type="' + (inc ? 'in' : 'out') + '"><label class="lbl" for="a-desc">' + (inc ? 'De quem ou de onde veio?' : 'O que foi?') + '</label><input id="a-desc" class="input" required maxlength="60" autocomplete="off">' +
      '<label class="lbl" for="a-val">Valor (R$)</label><input id="a-val" class="input" inputmode="decimal" required autocomplete="off">' +
      (inc ? '<label class="lbl" for="a-note">Descritivo (opcional)</label><input id="a-note" class="input" maxlength="80" placeholder="Ex.: meu pai me emprestou" autocomplete="off">'
           : '<label class="lbl" for="a-cat">Categoria</label><select id="a-cat" class="input">' + catOptions('Alimentação') + '</select>') +
      '<label class="lbl" for="a-met">Forma de pagamento</label><select id="a-met" class="input">' + methods.map((m) => '<option>' + m + '</option>').join('') + '</select>' +
      '<label class="lbl" for="a-date">Data</label><input id="a-date" type="date" class="input" value="' + TODAY + '" max="' + TODAY + '" required>' +
      '<div class="actions">' + cancelBtn + '<button class="btn primary" type="submit">Salvar</button></div></form>');
    setTimeout(() => $('#a-desc').focus(), 50);
  }
  function openTx(id) {
    const t = TX.find((x) => x.id === id);
    if (!t) return;
    const income = t.kind === 'income';
    const canAll = income && !t.manual && t.key && t.key.indexOf('id:') !== 0;
    openDlg('<h2>' + esc(t.desc) + '</h2><p class="muted small">' + (income ? '+ ' : '− ') + BRL(t.amount) + ' · ' + esc(t.method) + ' · ' + dShort(t.date) + '</p>' +
      '<form id="fTx" data-id="' + esc(id) + '"><label class="lbl" for="t-note">Descritivo (opcional)</label>' +
      '<input id="t-note" class="input" maxlength="80" autocomplete="off" placeholder="' + (income ? 'Ex.: meu pai me emprestou' : 'Ex.: presente da minha mãe') + '" value="' + esc(t.note || '') + '">' +
      (income ? '' : '<span class="lbl">Categoria</span>' + (t.manual ? '' : '<p class="note" style="margin-bottom:6px">Vale para todas as compras parecidas, hoje e nas próximas.</p>') +
        '<div class="cat-grid" style="margin-top:6px">' + catsList().map((c) => '<button type="button" class="btn" data-act="setcat" data-id="' + esc(id) + '" data-cat="' + esc(c.id) + '" aria-pressed="' + (t.category === c.id) + '"><span class="dot" style="margin:0;background:' + catColor(c.id) + '"></span>' + esc(c.name) + '</button>').join('') + '</div>' +
        '<div style="margin-top:8px"><button type="button" class="linkbtn" data-act="manage-cats">Editar categorias</button></div>') +
      '<div class="actions">' + cancelBtn + '<button class="btn primary" type="submit">Salvar</button></div></form>' +
      '<div class="hr danger-zone" style="margin-top:16px"><div class="upper" style="margin-bottom:8px">Não é meu?</div><div class="actions" style="margin-top:0">' +
      '<button type="button" class="btn danger" data-act="tx-remove" data-id="' + esc(id) + '">' + (t.manual ? 'Apagar lançamento' : 'Remover esta transação') + '</button>' +
      (canAll ? '<button type="button" class="btn danger" data-act="tx-remove-all" data-id="' + esc(id) + '">Remover todas de “' + esc(t.key) + '”</button>' : '') + '</div>' +
      '<p class="note" style="margin-top:8px">Removida, ela deixa de entrar nas contas. Dá para restaurar em Configurações.</p></div>');
  }
  function openFilter(keepScroll) {
    const top = keepScroll ? dlg().scrollTop : 0;
    const fl = state.fl;
    const sel = (g, v) => fl[g].includes(v);
    const chip = (g, v, label, dot) => '<button type="button" class="chip sm" data-act="fl" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + sel(g, v) + '">' + (dot ? '<span class="dot" style="margin:0 6px 0 0;background:' + dot + ';display:inline-block;vertical-align:middle"></span>' : '') + esc(label) + '</button>';
    const [y, m] = state.month.split('-').map(Number);
    const nDays = new Date(y, m, 0).getDate();
    const has = new Set(TX.filter((t) => t.kind !== 'internal' && t.date.slice(0, 7) === state.month).map((t) => t.date.slice(8, 10)));
    const days = Array.from({ length: nDays }, (_, i) => { const d = pad(i + 1); return '<button type="button" class="day' + (has.has(d) ? ' has' : '') + '" data-act="fl" data-g="days" data-v="' + d + '" aria-pressed="' + sel('days', d) + '" aria-label="Dia ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('');
    const isIn = state.dir === 'in';
    openDlg('<div class="between" style="align-items:center"><h2>Filtros</h2><button type="button" class="btn small" data-act="fl-clear">Limpar</button></div>' +
      '<p class="muted small">Escolha um ou vários. Dentro de cada grupo vale qualquer um; entre grupos, todos.</p>' +
      '<span class="lbl">Tipo de transação</span><div class="chips">' + METHODS.map((x) => chip('methods', x, x)).join('') + '</div>' +
      (isIn ? '' : '<span class="lbl">Categoria</span><div class="chips">' + catsList().map((c) => chip('cats', c.id, c.name, catColor(c.id))).join('') + chip('cats', NOCAT, 'Sem categoria', '#D97706') + '</div>') +
      '<span class="lbl">Dia de ' + esc(mName(state.month)) + '</span><div class="days">' + days + '</div><p class="note" style="margin-top:6px">O ponto marca os dias com transações.</p>' +
      '<div class="actions"><button type="button" class="btn primary" data-act="close">Ver ' + filteredTx().length + ' resultado' + (filteredTx().length === 1 ? '' : 's') + '</button></div>');
    dlg().scrollTop = top;
  }
  function swatchesHtml(sel) {
    const all = PALETTE.includes(sel) ? PALETTE : PALETTE.concat([sel]);
    return all.map((c) => '<button type="button" class="swatch" data-act="pickcolor" data-color="' + c + '" style="background:' + c + '" aria-label="Cor ' + c + '" aria-pressed="' + (c.toLowerCase() === sel.toLowerCase()) + '"></button>').join('');
  }
  function openCatEdit(id) {
    const c = catsList().find((x) => x.id === id) || { id: '', name: '', color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
    openDlg('<h2>' + (id ? 'Editar categoria' : 'Nova categoria') + '</h2><form id="fCat" data-id="' + esc(c.id) + '">' +
      '<label class="lbl" for="c-name">Nome</label><input id="c-name" class="input" required maxlength="24" autocomplete="off" value="' + esc(c.name) + '">' +
      '<span class="lbl">Cor</span><div class="swatches" id="swatches">' + swatchesHtml(c.color) + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><label class="lbl" for="c-color" style="margin:0">Outra cor</label><input id="c-color" type="color" value="' + c.color + '"></div>' +
      '<input type="hidden" id="c-hex" value="' + c.color + '">' +
      '<div class="actions">' + cancelBtn + (id ? '<button type="button" class="btn danger" data-act="del-cat" data-id="' + esc(id) + '">Apagar</button>' : '') + '<button class="btn primary" type="submit">Salvar</button></div>' +
      (id ? '<p class="muted small" style="margin-top:10px">Ao apagar, os gastos dessa categoria ficam em "Sem categoria".</p>' : '') + '</form>');
    setTimeout(() => $('#c-name').focus(), 50);
  }
  function setPickedColor(hex) {
    $('#c-hex').value = hex;
    $('#c-color').value = hex;
    document.querySelectorAll('#swatches .swatch').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === hex.toLowerCase())));
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
  function openValue(formId, title, text, value, extra, label) {
    openDlg('<h2>' + title + '</h2><p class="muted small">' + text + '</p><form id="' + formId + '"><label class="lbl" for="v-val">' + (label || 'Valor (R$)') + '</label><input id="v-val" class="input" inputmode="decimal" required value="' + esc(value == null ? '' : value) + '">' +
      '<div class="actions">' + cancelBtn + (extra || '') + '<button class="btn primary" type="submit">Salvar</button></div></form>');
    setTimeout(() => $('#v-val').focus(), 50);
  }

  /* ---------- Ações ---------- */
  const actions = {
    close: closeDlg,
    reload: () => location.reload(),
    theme: () => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); if (state.tab === 'config') render(); },
    prev: () => { if (diffM(state.month, CUR) < 12) { state.month = addM(state.month, -1); state.showAll = false; state.fl.days = []; render(); } },
    next: () => { if (diffM(CUR, state.month) < 2) { state.month = addM(state.month, 1); state.showAll = false; state.fl.days = []; render(); } },
    add: () => openAdd(state.tab === 'gastos' && state.dir === 'in' ? 'in' : 'out'),
    'add-in': () => openAdd('in'),
    'add-type': (el) => openAdd(el.dataset.id),
    filter: (el) => { state.filter = el.dataset.id; state.showAll = false; render(); },
    dir: (el) => { state.dir = el.dataset.id; state.filter = 'all'; state.showAll = false; render(); },
    more: () => { state.showAll = true; $('#txlist').innerHTML = txListHtml(); },
    'filter-open': () => openFilter(false),
    fl: (el) => {
      const g = el.dataset.g, v = el.dataset.v, a = state.fl[g];
      const i = a.indexOf(v);
      if (i >= 0) a.splice(i, 1); else a.push(v);
      state.showAll = false; render();
      if (dlg().open) openFilter(true);
    },
    'fl-clear': () => { state.fl = { methods: [], cats: [], days: [] }; state.showAll = false; render(); if (dlg().open) openFilter(true); },
    gocat: (el) => { goList(() => { state.dir = 'out'; state.filter = 'all'; state.q = ''; state.fl = { methods: [], cats: [el.dataset.cat], days: [] }; }); },
    gomethod: (el) => { goList(() => { state.dir = 'out'; state.filter = el.dataset.id; state.q = ''; state.fl = { methods: [], cats: [], days: [] }; }); },
    goin: () => { goList(() => { state.dir = 'in'; state.filter = 'all'; state.q = ''; state.fl = { methods: [], cats: [], days: [] }; }); },
    'goto-uncat': () => { goList(() => { state.dir = 'out'; state.filter = 'uncat'; state.q = ''; state.fl = { methods: [], cats: [], days: [] }; }); },
    'goto-sim': () => { state.tab = 'simular'; render(); $('#scroll').scrollTop = 0; },
    'goto-config': () => { state.tab = 'config'; render(); $('#scroll').scrollTop = 0; },
    pay: (el) => { state.sim.pay = el.dataset.id; render(); },
    tx: (el) => openTx(el.dataset.id),
    setcat: (el) => {
      const t = TX.find((x) => x.id === el.dataset.id);
      if (!t) return;
      if ($('#t-note')) saveNote(t, $('#t-note').value);
      if (t.manual) { const m = STORE.manual.find((x) => x.id === t.id); if (m) m.category = el.dataset.cat; }
      else { STORE.rules = STORE.rules || {}; STORE.rules[t.key] = el.dataset.cat; }
      closeDlg(); saveStore();
    },
    'tx-remove': (el) => {
      const t = TX.find((x) => x.id === el.dataset.id);
      if (!t) return;
      if (!confirm(t.manual ? 'Apagar este lançamento?' : 'Remover esta transação das suas contas? Você pode restaurar em Configurações.')) return;
      if (t.manual) STORE.manual = STORE.manual.filter((x) => x.id !== t.id);
      else { STORE.hidden = STORE.hidden || {}; STORE.hidden[t.id] = { d: t.desc.slice(0, 60), a: t.amount, dt: t.date, dir: t.dir }; }
      closeDlg(); saveStore();
    },
    'tx-remove-all': (el) => {
      const t = TX.find((x) => x.id === el.dataset.id);
      if (!t) return;
      if (!confirm('Ignorar sempre as entradas de “' + t.key + '”? Você pode restaurar em Configurações.')) return;
      STORE.hideKeys = STORE.hideKeys || {};
      STORE.hideKeys['in:' + t.key] = { n: t.key };
      closeDlg(); saveStore();
    },
    'restore-tx': (el) => { if (STORE.hidden) delete STORE.hidden[el.dataset.id]; saveStore(); },
    'restore-key': (el) => { if (STORE.hideKeys) delete STORE.hideKeys[el.dataset.key]; saveStore(); },
    acc: (el) => { state.open[el.dataset.id] = !state.open[el.dataset.id]; render(); },
    'cat-up': (el) => moveCat(el.dataset.id, -1),
    'cat-down': (el) => moveCat(el.dataset.id, 1),
    rate: () => openValue('fRate', 'Rendimento estimado', 'Percentual bruto ao ano usado nas previsões. Confira a taxa do seu Cofrinho no app do Itaú.', String(invCfg().rate).replace('.', ','), '', 'Taxa (% ao ano)'),
    aporte: () => openValue('fAporte', 'Aporte mensal planejado', 'Quanto você pretende guardar por mês. No modo automático, o app usa a sobra média entre entradas e gastos.', plannedMonthly().v, '<button type="button" class="btn" data-act="aporte-auto">Automático</button>', 'Valor por mês (R$)'),
    'aporte-auto': () => { STORE.invest = Object.assign(invCfg(), { monthly: null }); closeDlg(); saveStore(); },
    'set-theme': (el) => { applyTheme(el.dataset.id); render(); },
    'set-accent': (el) => { STORE.look = Object.assign(lookNow(), { accent: el.dataset.id }); saveStore(); },
    'toggle-look': () => { lookOpen = !lookOpen; render(); },
    'set-body': (el) => { STORE.look = Object.assign(lookNow(), { body: el.dataset.id }); saveStore(); },
    'set-face': (el) => { STORE.look = Object.assign(lookNow(), { face: el.dataset.id }); saveStore(); },
    'faceid-login': () => faceLogin(),
    'face-enable': () => faceEnable(),
    'face-disable': () => faceDisable(),
    pwtoggle: (el) => {
      const i = $('#pw'); const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      el.setAttribute('aria-pressed', String(show));
      el.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    },
    'hide-fixed': (el) => { STORE.fixedHidden = STORE.fixedHidden || {}; STORE.fixedHidden[el.dataset.key] = true; saveStore(); },
    'restore-fixed': () => { STORE.fixedHidden = {}; saveStore(); },
    'manage-cats': () => { closeDlg(); state.tab = 'config'; state.open.cats = true; render(); $('#scroll').scrollTop = 0; },
    'cat-edit': (el) => openCatEdit(el.dataset.id || ''),
    pickcolor: (el) => setPickedColor(el.dataset.color),
    'del-cat': (el) => {
      const l = catsList().filter((c) => c.id !== el.dataset.id);
      STORE.cats = l;
      closeDlg(); saveStore();
    },
    'cat-reset': () => { if (confirm('Voltar às categorias originais?')) { STORE.cats = null; saveStore(); } },
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
      const inc = f.dataset.type === 'in';
      STORE.manual = STORE.manual || [];
      const entry = { id: 'm' + Date.now().toString(36), date: $('#a-date').value || TODAY, desc: $('#a-desc').value.trim(), amount, method: $('#a-met').value, kind: inc ? 'income' : 'expense' };
      if (inc) entry.note = $('#a-note').value.trim().slice(0, 80); else entry.category = $('#a-cat').value;
      STORE.manual.push(entry);
      state.month = entry.date.slice(0, 7);
      if (state.tab === 'gastos') { state.dir = inc ? 'in' : 'out'; state.filter = 'all'; state.fl = { methods: [], cats: [], days: [] }; }
      closeDlg(); saveStore();
    } else if (f.id === 'fTx') {
      const t = TX.find((x) => x.id === f.dataset.id);
      if (t) saveNote(t, $('#t-note').value);
      closeDlg(); saveStore();
    } else if (f.id === 'fRate') {
      const v = parseNum($('#v-val').value);
      STORE.invest = Object.assign(invCfg(), { rate: v > 0 && v <= 100 ? v : 13 });
      closeDlg(); saveStore();
    } else if (f.id === 'fAporte') {
      STORE.invest = Object.assign(invCfg(), { monthly: parseNum($('#v-val').value) });
      closeDlg(); saveStore();
    } else if (f.id === 'fCat') {
      const name = $('#c-name').value.trim().slice(0, 24);
      const color = $('#c-hex').value;
      const id = f.dataset.id;
      const l = catsList().map((c) => Object.assign({}, c));
      const dup = l.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
      if (!name || name.toLowerCase() === NOCAT.toLowerCase() || dup || !HEX.test(color)) {
        $('#c-name').setCustomValidity(dup ? 'Já existe uma categoria com esse nome' : 'Escolha outro nome'); $('#c-name').reportValidity(); return;
      }
      const i = l.findIndex((c) => c.id === id);
      if (i >= 0) { l[i].name = name; l[i].color = color; }
      else l.push({ id: 'c' + Date.now().toString(36), name, color });
      STORE.cats = l;
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
  document.addEventListener('input', (e) => { if (e.target.id === 'a-val' || e.target.id === 'c-name') e.target.setCustomValidity('');
    if (e.target.id === 'c-color') setPickedColor(e.target.value); });

  /* ---------- Face ID / Touch ID (WebAuthn) ---------- */
  const b64u = {
    enc: (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => { let t = s.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return Uint8Array.from(atob(t), (c) => c.charCodeAt(0)); }
  };
  const faceSupported = () => !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  let faceOn = false, faceMsg = '', faceBusy = false;
  async function wa(step, extra) {
    const r = await fetch('/api/webauthn', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ step }, extra || {})) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'erro'); e.status = r.status; throw e; }
    return j;
  }
  async function faceStatus() {
    faceOn = false;
    if (!faceSupported()) return;
    try { const r = await fetch('/api/webauthn', { credentials: 'same-origin' }); const j = await r.json(); faceOn = !!j.enabled; } catch (e) { /* sem Face ID */ }
  }
  function setFaceUi() {
    $('#faceBtn').hidden = !faceOn;
    $('#faceOr').hidden = !faceOn;
  }
  async function faceLogin() {
    const msg = $('#loginMsg'), btn = $('#faceBtn');
    btn.disabled = true; msg.hidden = true;
    try {
      const o = await wa('auth-options');
      const pk = o.publicKey;
      const cred = await navigator.credentials.get({ publicKey: { challenge: b64u.dec(pk.challenge), rpId: pk.rpId, allowCredentials: pk.allowCredentials.map((c) => ({ type: c.type, id: b64u.dec(c.id) })), userVerification: 'required', timeout: pk.timeout } });
      await wa('auth-verify', { token: o.token, id: cred.id, clientDataJSON: b64u.enc(cred.response.clientDataJSON), authenticatorData: b64u.enc(cred.response.authenticatorData), signature: b64u.enc(cred.response.signature) });
      $('#pw').value = '';
      await boot();
    } catch (e) {
      msg.textContent = e.name === 'NotAllowedError' || e.name === 'AbortError' ? 'Face ID cancelado. Tente de novo ou use a senha.'
        : e.status === 429 ? 'Muitas tentativas. Use a senha ou tente mais tarde.' : 'Não foi possível entrar com Face ID. Use a senha.';
      msg.hidden = false;
    }
    btn.disabled = false;
  }
  async function faceEnable() {
    faceBusy = true; faceMsg = ''; render();
    try {
      const o = await wa('reg-options');
      const pk = o.publicKey;
      const cred = await navigator.credentials.create({ publicKey: { challenge: b64u.dec(pk.challenge), rp: pk.rp, user: { id: b64u.dec(pk.user.id), name: pk.user.name, displayName: pk.user.displayName }, pubKeyCredParams: pk.pubKeyCredParams, authenticatorSelection: pk.authenticatorSelection, timeout: pk.timeout, attestation: 'none' } });
      await wa('reg-verify', { token: o.token, attestationObject: b64u.enc(cred.response.attestationObject), clientDataJSON: b64u.enc(cred.response.clientDataJSON) });
      faceOn = true; faceMsg = 'Face ID ativado neste aparelho.';
    } catch (e) {
      faceMsg = e.name === 'NotAllowedError' || e.name === 'AbortError' ? 'Ativação cancelada.' : 'Não foi possível ativar o Face ID neste aparelho.';
    }
    faceBusy = false; render();
  }
  async function faceDisable() {
    faceBusy = true; render();
    try { await wa('remove'); faceOn = false; faceMsg = 'Face ID desativado neste aparelho.'; } catch (e) { faceMsg = 'Não foi possível desativar.'; }
    faceBusy = false; render();
  }

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
    await faceStatus();
    await loadStore();
    buildTx();
    show('app');
    render();
  }
  initTheme();
  boot().catch(() => showProblem(0, null));
})();
