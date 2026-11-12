'use strict';
// Converte os dados da Pluggy para o formato simples usado pelo app.

const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Chave do estabelecimento: usada para lembrar categorias e detectar gastos fixos.
const GENERIC = new Set(['pix', 'enviado', 'enviada', 'recebido', 'recebida', 'transferencia', 'transf', 'transferido', 'pagamento', 'pagto', 'pgto', 'pag', 'pago', 'paga', 'compra', 'compras', 'boleto', 'debito', 'deb', 'credito', 'cartao', 'ted', 'doc', 'de', 'da', 'do', 'dos', 'das', 'para', 'por', 'via', 'em', 'com', 'no', 'na', 'saque', 'aut', 'autorizado', 'parc', 'parcela', 'cobranca', 'conta', 'qr', 'code', 'dinamico', 'estatico']);

// Chave do estabelecimento: usada para lembrar categorias e detectar gastos fixos.
// Ignora palavras genéricas ("Pix enviado", "Boleto"), para que um Pix para o Uber
// não seja confundido com outro Pix qualquer. Sem nome útil => chave única da transação.
function merchantKey(desc, id) {
  const t = strip(desc)
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !GENERIC.has(w));
  return t.slice(0, 2).join(' ') || 'id:' + (id || strip(desc));
}

const INTERNAL = [
  /pagamento.*fatura|fatura.*(cartao|paga|pgto)|pgto.*fatura|pag.*fatura|pagto.*cartao|pagamento recebido|pagamento efetuado/,
  /cofrinho|aplicacao|resgate|rdb|cdb\b|poupanca|investimento|aplic\./
];

const RULES = [
  ['Gatos', /\bpet\b|petz|cobasi|petlove|racao|areia sanit|veterin|\bvet\b|petshop|pet shop|banho e tosa/],
  ['Assinaturas', /netflix|spotify|disney|hbo|\bmax\b|prime video|amazon prime|youtube|icloud|google one|apple\.com|apple com|deezer|globoplay|canva|chatgpt|openai|anthropic|claude|duolingo|paramount|crunchyroll|notion/],
  ['Contas e planos', /\bclaro\b|\bvivo\b|\btim\b|\boi\b|internet|energia|enel|saneago|agua|\bluz\b|condominio|plano de saude|unimed/],
  ['Alimentação', /ifood|mercado|supermerc|padaria|restaur|lanchon|lanche|atacad|assai|carrefour|hortifruti|acai|pizza|burger|mcdonald|rappi|cafe|cafeteria|sorvet|churrasc|bar do|açougue|acougue|hamburg|sushi/],
  ['Transporte', /uber|\b99\b|99app|cabify|posto|shell|ipiranga|combust|estaciona|metro|onibus|bilhete|sem parar|pedagio|gasolina|etanol/],
  ['Lazer', /cinema|ingresso|steam|playstation|\bpsn\b|xbox|nintendo|\bgame|jogos|show|teatro|sympla|eventim|spa\b/],
  ['Faculdade', /\bufg\b|faculdade|universidade|curso|udemy|alura|coursera|xerox|copias|livraria|papelaria|mensalidade|apostila/],
  ['Saúde', /farmac|drogaria|droga|raia|pacheco|clinica|medic|hospital|dentis|laborat|exame|psicolog/],
  ['Compras', /amazon|mercado livre|mercadolivre|shopee|magalu|magazine|americanas|shein|aliexpress|kabum|renner|riachuelo|zara|\bc&a\b|netshoes|centauro/]
];

function pluggyCategory(c) {
  const s = strip(c);
  if (!s) return null;
  if (/pet/.test(s)) return 'Gatos';
  if (/subscription|assinatura|streaming/.test(s)) return 'Assinaturas';
  if (/grocer|supermarket|restaurant|food|eating|alimenta|mercado|bakery/.test(s)) return 'Alimentação';
  if (/transport|taxi|ride|fuel|gas station|combust|parking|uber/.test(s)) return 'Transporte';
  if (/entertainment|leisure|lazer|game|cinema|event/.test(s)) return 'Lazer';
  if (/educa|school|universit|course/.test(s)) return 'Faculdade';
  if (/health|pharm|saude|farm|dental|medical/.test(s)) return 'Saúde';
  if (/shopping|compras|online|retail|clothing/.test(s)) return 'Compras';
  if (/utilit|telecom|internet|phone|energy|water|conta/.test(s)) return 'Contas e planos';
  return null;
}

function categorize(desc, pluggyCat) {
  const s = strip(desc);
  for (const [cat, re] of RULES) if (re.test(s)) return cat;
  return pluggyCategory(pluggyCat);
}

function isInternal(desc) {
  const s = strip(desc);
  return INTERNAL.some((re) => re.test(s));
}

function methodOf(tx, isCard) {
  if (isCard) return 'Cartão';
  const pm = strip(tx.paymentData && tx.paymentData.paymentMethod);
  const d = strip(tx.description || tx.descriptionRaw);
  if (pm === 'pix' || /\bpix\b/.test(d)) return 'Pix';
  if (pm === 'boleto' || /boleto/.test(d)) return 'Boleto';
  if (pm === 'ted' || pm === 'doc' || /\bted\b|\bdoc\b|transfer/.test(d)) return 'Transferência';
  return 'Débito';
}

function accountKind(a) {
  if (a.type === 'CREDIT' || a.subtype === 'CREDIT_CARD') return 'card';
  if (a.subtype === 'SAVINGS_ACCOUNT') return 'savings';
  if (a.subtype === 'CHECKING_ACCOUNT') return 'checking';
  return 'other';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAccount(a) {
  const cd = a.creditData || {};
  return {
    id: a.id,
    kind: accountKind(a),
    name: a.marketingName || a.name || 'Conta',
    balance: num(a.balance),
    credit: accountKind(a) === 'card'
      ? {
          limit: num(cd.creditLimit),
          available: num(cd.availableCreditLimit),
          dueDate: cd.balanceDueDate ? String(cd.balanceDueDate).slice(0, 10) : null,
          closeDate: cd.balanceCloseDate ? String(cd.balanceCloseDate).slice(0, 10) : null
        }
      : null
  };
}

function normalizeTx(t, acc) {
  const isCard = acc.kind === 'card';
  const desc = String(t.description || t.descriptionRaw || 'Sem descrição').trim();
  const amt = Number(t.amount) || 0;
  let dir;
  if (t.type === 'DEBIT') dir = 'out';
  else if (t.type === 'CREDIT') dir = 'in';
  else dir = isCard ? (amt >= 0 ? 'out' : 'in') : (amt < 0 ? 'out' : 'in');

  let kind = dir === 'out' ? 'expense' : 'income';
  if (isInternal(desc)) kind = 'internal';

  const meta = t.creditCardMetadata || {};
  let inst = meta.totalInstallments > 1
    ? { n: Number(meta.installmentNumber) || 1, total: Number(meta.totalInstallments) }
    : null;
  // Se o banco não mandar os dados de parcela, tenta ler "03/12" no fim da descrição (só cartão).
  if (!inst && isCard) {
    const m = desc.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
    if (m && Number(m[2]) >= 2 && Number(m[2]) <= 48 && Number(m[1]) >= 1 && Number(m[1]) <= Number(m[2])) {
      inst = { n: Number(m[1]), total: Number(m[2]) };
    }
  }

  return {
    id: t.id,
    account: isCard ? 'card' : 'bank',
    date: String(t.date || '').slice(0, 10),
    desc,
    amount: Math.abs(amt),
    dir,
    method: methodOf(t, isCard),
    category: kind === 'internal' ? null : categorize(desc, t.category),
    kind,
    key: merchantKey(desc, t.id),
    status: t.status || 'POSTED',
    inst,
    purchaseDate: meta.purchaseDate ? String(meta.purchaseDate).slice(0, 10) : null
  };
}

function normalizeInvestment(i) {
  return {
    id: i.id,
    name: i.name || 'Investimento',
    type: i.type || null,
    subtype: i.subtype || null,
    balance: num(i.balance),
    amount: num(i.amount),
    rate: num(i.rate),
    date: i.date ? String(i.date).slice(0, 10) : null
  };
}

module.exports = { normalizeAccount, normalizeTx, normalizeInvestment, merchantKey, categorize };
