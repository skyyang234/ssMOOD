// AI 回答「可核验」层。
//
// 目的：让用户可以自己判断 AI 回答对不对。做法是把两件事结构化输出：
//   1) sources   —— 这一答的依据是什么（当前实体 / 当前选择 / 页面可见数据 / 知识表命中 / 工具结果）
//   2) unverified —— 正文里提到、但在上述依据和词表里都找不到的大写标识符（多为模型自行编造的基因名/ID）
// 全部在前端计算，不改后端任何接口。
import { GLOSSARY_TERMS } from './agentGlossary';
import { KNOWLEDGE_ENTRIES } from './agentKnowledge';

// 正文里常见、但不算「数据引用」的通用大写词，避免核对时误报。
const GENERIC_TOKENS = new Set([
  'UMAP', 'TSNE', 'PCA', 'DEG', 'DAP', 'ATAC', 'GWAS', 'SNV', 'SNP', 'RNA', 'DNA', 'TPM', 'CPM', 'UMI',
  'GO', 'KEGG', 'MSIGDB', 'FDR', 'PCT', 'CSV', 'HTML', 'JSON', 'DOI', 'PMID',
  'MDD', 'ADHD', 'PTSD', 'SCZ', 'BDNF', 'CNS', 'PBS', 'PCR', 'HLA', 'ENCODE',
  'MAGMA', 'LDSC', 'TWAS', 'PWAS', 'GSMAP', 'GTEx', 'TCGA',
  // Brodmann 分区与小鼠分层
  'BA4', 'BA6', 'BA9', 'BA10', 'BA11', 'BA12', 'BA17', 'BA24', 'BA46',
  'THE', 'AND', 'FOR', 'NOT', 'HOW', 'WHAT', 'WHY', 'ALL', 'CAN', 'MAY', 'NEW', 'TOP', 'NOTE', 'TIPS',
]);

function addWords(target, ...values) {
  values.forEach(value => {
    String(value || '')
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .forEach(word => {
        if (word.length >= 2) target.add(word);
      });
  });
}

// 领域词表：术语表 + 知识表 + 通用词。命中即视为「有出处」，不算未核实。
let vocabulary = null;
function getVocabulary() {
  if (vocabulary) return vocabulary;
  const vocab = new Set(GENERIC_TOKENS);
  (GLOSSARY_TERMS || []).forEach(item => addWords(vocab, item.term, item.fullName, ...(item.aliases || [])));
  (KNOWLEDGE_ENTRIES || []).forEach(item => addWords(vocab, item.key, item.fullName, ...(item.aliases || [])));
  vocabulary = vocab;
  return vocab;
}

// 只取「大写字母开头、长度 3-10」的标识符：基因符号（A1BG / AQP4 / SLC1A3 / ABRACL）
// 与数据集 ID 片段都属于这一类，普通中文行文不会产生。
const TOKEN_RE = /\b[A-Z][A-Z0-9]{2,9}\b/g;

function extractTokens(text = '') {
  const out = new Set();
  (String(text).match(TOKEN_RE) || []).forEach(token => out.add(token));
  return [...out];
}

// 正文引用校验：逐个标识符判断是否能在可溯源材料或领域词表里找到。
export function checkReplyReferences(reply = '', haystack = '') {
  const vocab = getVocabulary();
  const lower = String(haystack || '').toLowerCase();
  return extractTokens(reply).filter(token => {
    if (vocab.has(token)) return false;
    return !lower.includes(token.toLowerCase());
  });
}

function entriesOf(source = {}, max = 8) {
  return Object.entries(source || {})
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .slice(0, max)
    .map(([key, value]) => ({ key, value: String(value) }));
}

function rowLabel(row = {}) {
  return String(row.gene || row.name || row.label || row.id || row.term || '行');
}

function rowSummary(row = {}) {
  return Object.entries(row)
    .filter(([key, value]) => key !== 'source' && value !== '' && value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ');
}

// 组装「回答依据」。sources 供用户逐条核对，unverified 标出没核实到的表述。
export function buildEvidence({ context = {}, toolResults = [], reply = '', userMessage = '' } = {}) {
  const sources = [];

  const entity = entriesOf(context?.entity);
  if (entity.length) sources.push({ kind: 'entity', label: '当前实体', items: entity });

  const selection = entriesOf(context?.selection);
  if (selection.length) sources.push({ kind: 'selection', label: '当前选择', items: selection });

  // 模块分组：按模块摊开「这个模块选中了什么 / 能看到几行」，
  // 而不是把整页可见数据混成一大坨，用户核对不出 AI 讲的是哪一块。
  const rows = Array.isArray(context?.visibleData) ? context.visibleData : [];
  const modules = Array.isArray(context?.modules) ? context.modules : [];
  const activeModule = String(context?.activeModule || context?.selection?.activeModule || '');

  if (modules.length) {
    const rowsBySource = new Map();
    rows.forEach(row => {
      const source = String(row?.source || '').trim();
      if (!source) return;
      if (!rowsBySource.has(source)) rowsBySource.set(source, []);
      rowsBySource.get(source).push(row);
    });

    modules.forEach(module => {
      const moduleRows = module.source ? (rowsBySource.get(module.source) || []) : [];
      const items = entriesOf(module.selection || {}, 8);
      moduleRows.slice(0, 4).forEach(row => {
        items.push({ key: rowLabel(row), value: rowSummary(row) });
      });
      if (!items.length) return;
      const note = [module.note, module.active ? '当前所在模块' : ''].filter(Boolean).join(' · ');
      sources.push({
        kind: 'module',
        label: `模块 · ${module.label || module.id}`,
        note,
        active: !!module.active,
        items,
      });
    });
  } else if (rows.length) {
    const rowSources = [];
    rows.forEach(row => {
      const source = row?.source;
      if (source && !rowSources.includes(source)) rowSources.push(source);
    });
    sources.push({
      kind: 'visibleData',
      label: '页面可见数据',
      note: rowSources.length ? rowSources.join('、') : '',
      rowCount: rows.length,
      items: rows.slice(0, 6).map(row => ({ key: rowLabel(row), value: rowSummary(row) })),
    });
  }

  if (activeModule && !sources.some(group => group.active)) {
    sources.unshift({
      kind: 'module',
      label: '当前所在模块',
      note: '',
      active: true,
      items: [{ key: 'module', value: activeModule }],
    });
  }

  const consumed = new Set();
  (toolResults || []).forEach(result => {
    const matches = result?.result?.matches;
    if (!Array.isArray(matches) || !matches.length) return;
    const isKnowledge = matches.some(item => item && item.key);
    if (!isKnowledge && !matches.some(item => item && item.term)) return;
    consumed.add(result);
    sources.push({
      kind: isKnowledge ? 'knowledge' : 'glossary',
      label: isKnowledge ? '知识表命中' : '术语表命中',
      items: matches.slice(0, 6).map(item => ({
        key: String(item.key || item.term),
        value: [item.chineseName || item.fullName, item.source].filter(Boolean).join(' · '),
      })),
    });
  });

  (toolResults || []).forEach(result => {
    if (consumed.has(result) || !result?.ok) return;
    const payload = result.result || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const count = Number(payload.resultCount ?? items.length) || 0;
    if (!count && !payload.pageType) return;
    sources.push({
      kind: 'tool',
      label: `工具 ${result.skill || ''}`.trim(),
      note: count ? `${count} 条` : '',
      items: items.slice(0, 4).map(item => ({
        key: rowLabel(item || {}),
        value: rowSummary(item || {}),
      })),
    });
  });

  const haystack = [
    JSON.stringify(toolResults || []),
    JSON.stringify(context || {}),
    String(userMessage || ''),
  ].join('\n');

  // 只有"这一轮真的查到了数据"时，才去核对正文里的标识符。
  // 纯知识性回答（例如"阿尔兹海默症是什么"）本来就是模型自己的知识，
  // 把 APOE 这类通用基因名标成"未能核实"既没有依据、也像在报错。
  const grounded = (toolResults || []).some(result => result?.ok);
  return {
    sources,
    unverified: grounded ? checkReplyReferences(reply, haystack) : [],
  };
}
