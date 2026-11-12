// 页面事实校对：把回答里"对不上当前页面"的说法删掉。
//
// 典型错误（实测）：列表页只有 物种 / 脑区 / 性别 三个筛选项，
// 模型看到表格里有 Conditions 列，就写成"支持按物种、脑区、条件、性别过滤"。
// 用户照着找，页面上根本没有"条件"这个筛选项。
//
// 规则刻意收得很窄：只处理"支持按 A、B、C 筛选/过滤"这一种句式，
// 且只删除不在 pageSchema.filters 里的维度——不做全文改写，避免把正常句子改坏。

function normalize(text = '') {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, '');
}

// 允许出现的筛选项：key + 中英文 label（"物种" / "Species" / "species" 都算）
function allowedFilterWords(context = {}) {
  const out = new Set();
  const filters = Array.isArray(context?.pageSchema?.filters) ? context.pageSchema.filters : [];
  filters.forEach(item => {
    const values = [item?.key, ...(Array.isArray(item?.labels) ? item.labels : [])];
    values.forEach(value => {
      const text = normalize(value);
      if (text) out.add(text);
    });
  });
  return out;
}

// 前面那个动词是可选的：模型也会写"筛选数据列表：按物种、脑区、性别、条件过滤"。
// 但只有带明确动词时，才允许把整句删掉——否则容易误伤"按 logFC 过滤 DEG"这类正常句子。
const FILTER_CLAIM = /(?:支持|可|可以|能|能够)?\s*(?:按|用|通过|依据)\s*([^。；\n]{1,50}?)\s*(?:进行)?\s*(?:筛选|过滤)/g;

// 模型有时会把内部字段名写进正文（"（filters 列表中无 condition 字段）"）。
// 这类解释是把我们的数据结构讲给用户听，用户只需要结论。
const INTERNAL_NOTE = /[（(][^（()）]{0,90}?(?:pageContext|pageSchema|businessState|capabilities|referencedSamples|filters\s*列表|filters\s*数组|filter_[a-z_]+|select_[a-z_]+|view_[a-z_]+|browse_[a-z_]+)[^（()）]{0,90}?[)）]/g;

// 能力 key → 人话。模型有时把 select_gene / filter_dap 直接写进正文，
// 用户看到的是代码而不是页面上的控件。
const CAPABILITY_TEXT = {
  select_gene: { zh: '选择基因', en: 'pick a gene' },
  select_cluster: { zh: '切换细胞类型', en: 'switch cell type' },
  select_trait: { zh: '选择性状', en: 'pick a trait' },
  select_peak: { zh: '选择 peak', en: 'pick a peak' },
  select_region: { zh: '选择脑区', en: 'pick a brain region' },
  select_motif: { zh: '选择 motif', en: 'pick a motif' },
  filter_deg: { zh: '设置差异基因阈值', en: 'set DEG thresholds' },
  filter_dap: { zh: '设置差异峰阈值', en: 'set differential-peak thresholds' },
  filter_species: { zh: '按物种筛选', en: 'filter by species' },
  filter_brain_region: { zh: '按脑区筛选', en: 'filter by brain region' },
  filter_sex: { zh: '按性别筛选', en: 'filter by sex' },
  filter_tissue: { zh: '按组织筛选', en: 'filter by tissue' },
  view_gwas: { zh: '查看 GWAS 关联', en: 'view GWAS association' },
  view_scdrs: { zh: '查看 scDRS 结果', en: 'view scDRS results' },
  view_signal: { zh: '查看关联信号', en: 'view association signals' },
  view_gsmap: { zh: '查看 GSMap 结果', en: 'view GSMap results' },
  expand_enrichment: { zh: '展开富集结果', en: 'expand enrichment results' },
  browse_list: { zh: '浏览数据集列表', en: 'browse the dataset list' },
};

const MACHINE_KEY = /\b(?:select|filter|view|expand|browse)_[a-z_]+\b/g;

export function stripInternalRefs(reply = '') {
  const text = String(reply || '');
  const zh = /[\u4e00-\u9fa5]/.test(text);
  return text
    .replace(INTERNAL_NOTE, '')
    // 正文里裸出现的上下文字段名，换成用户能懂的说法
    .replace(/\bpageContext\b/g, zh ? '当前页面信息' : 'the current page')
    .replace(/\bpageSchema\b/g, zh ? '页面结构' : 'the page structure')
    .replace(/\bbusinessState\b/g, zh ? '当前页面状态' : 'the page state')
    .replace(/\bpageSummary\b/g, zh ? '页面概况' : 'the page summary')
    .replace(/\bvisibleData\b/g, zh ? '页面可见数据' : 'visible page data')
    .replace(/\breferencedSamples\b/g, zh ? '引用样本' : 'referenced samples')
    .replace(MACHINE_KEY, key => {
      const entry = CAPABILITY_TEXT[key];
      if (!entry) return '';
      return zh ? entry.zh : entry.en;
    })
    .replace(/[（(]\s*[)）]/g, '')
    .replace(/[，,、]\s*。/g, '。')
    .replace(/[，,、]\s*(?=[。；\n])/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function pruneFilterClaims(reply = '', context = {}) {
  const text = String(reply || '');
  const allowed = allowedFilterWords(context);
  // 页面没有上报筛选维度时，不做任何猜测性删除
  if (!allowed.size) return text;

  const isAllowed = dim => {
    const value = normalize(dim);
    if (!value) return false;
    if (allowed.has(value)) return true;
    // 单字维度不做包含匹配（"性"会误配"性别"）；两字以上才允许混写包含
    if (value.length < 2) return false;
    return [...allowed].some(item => item.includes(value) || value.includes(item));
  };

  return text
    .replace(FILTER_CLAIM, (whole, dims) => {
      const parts = String(dims).split(/[、,，/／]/).map(item => item.trim()).filter(Boolean);
      if (!parts.length) return whole;
      const kept = parts.filter(isAllowed);
      if (kept.length === parts.length) return whole;   // 全都对得上，原样保留
      // 一个已知维度都没有 → 这句话不是在描述本页筛选（"按当前条件筛选后仍为 40 个"
      // "按以下维度筛选"），别动，否则会误删正常句子。
      if (!kept.length) return whole;
      return whole.replace(dims, kept.join('、'));
    })
    // 删句后清理留下的空标点
    .replace(/[，,]\s*。/g, '。')
    .replace(/[，,]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
