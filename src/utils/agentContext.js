import { reactive } from 'vue';
import { AGENT_CONTEXT_LIMITS } from './agentConfig';

const registeredAgentContext = reactive({
  businessState: {},
  plotState: {},
  pageSummary: {},
  // ── 页面快照扩展段（可选上报，缺失不影响既有流程）──
  entity: {},       // 当前实体：数据集/性状元信息
  selection: {},    // 当前选择：cluster / 基因 / 性状 / 筛选条件
  visibleData: [],  // 可见数据摘要：页面已加载、用户肉眼可见的 Top N 行
  capabilities: [], // 页面能力：本页支持哪些操作
  modules: [],      // 页面模块清单：本页有哪些模块、各自选中了什么
  // ── 页面自描述（P4）：筛选维度 / 表格列 / 图表类型 ──
  // 由页面自己上报，而不是在 agentContext 里按页面类型写死。
  // 新增一个筛选维度时，页面多报一项即可，提示词与快照自动带上，无需改 AI 代码。
  pageSchema: { filters: [], columns: [], charts: [] },
  // ── 模块归属：用户最后一次实际操作所在的模块 ──
  // 单独记录而不再只依赖 selection.activeTab：后者会被 DEG 表的被动刷新覆盖，
  // 导致用户在「基因表达」模块选了基因，AI 却按 DEG 页讲解。
  activeModule: '',
  activeModuleLabel: '',
  activeTab: '',
  userPrimaryAction: '',
});

const PAGE_TYPES = [
  { test: name => name === 'SingleCellPage' || name === 'scStudy', type: 'single_cell_detail', omicsType: 'SC' },
  { test: name => name === 'SingleCellList', type: 'single_cell_list', omicsType: 'SC' },
  { test: name => name === 'STPage' || name === 'stStudy', type: 'spatial_detail', omicsType: 'ST' },
  { test: name => name === 'SpatialTranscriptomeList', type: 'spatial_list', omicsType: 'ST' },
  { test: name => name === 'ATACPage', type: 'atac_detail', omicsType: 'ATAC' },
  { test: name => name === 'ATACList', type: 'atac_list', omicsType: 'ATAC' },
  { test: name => name === 'GWASPage' || name === 'GWASTraitPage', type: 'gwas', omicsType: 'GWAS' },
  { test: name => name === 'BrowseHub', type: 'browse', omicsType: '' },
  { test: name => name === 'Home', type: 'home', omicsType: '' },
];

// 页面能力：仅描述「页面 UI 自身能点的操作」，纯粹用于帮助 AI 理解用户当前环境、用用户术语组织回答。
// 它绝不是对 AI 能力的限制——AI 能调用哪些工具由工具目录决定，与页面无关（见 agentPrompts.js 的页面上下文原则）。
const PAGE_CAPABILITIES = {
  single_cell_detail: ['select_cluster', 'select_gene', 'filter_deg', 'expand_enrichment', 'view_gwas'],
  single_cell_list: ['browse_list', 'filter_species', 'filter_brain_region', 'filter_condition'],
  spatial_detail: ['select_gene', 'filter_deg', 'view_gsmap'],
  spatial_list: ['browse_list'],
  atac_detail: ['select_cluster', 'select_gene', 'filter_dap'],
  atac_list: ['browse_list'],
  gwas: ['select_trait', 'view_scdrs', 'view_signal'],
  browse: ['browse_list'],
  home: [],
  general: [],
};

// 页面能力的中文说明。
// 能力 key（如 select_cluster）是给模型看的字段名，直接展示给用户会变成
// 「点击页面上的 select_cluster / select_gene 等能力」这种内部术语泄漏；
// UI 与提示词统一走这里换成可操作的真实描述。
const CAPABILITY_LABELS = {
  select_cluster: '切换细胞类型/聚类',
  select_gene: '选择基因',
  filter_deg: '设置 DEG 筛选条件',
  expand_enrichment: '展开富集结果',
  view_gwas: '查看 GWAS 关联',
  browse_list: '浏览数据集列表',
  filter_species: '按物种筛选',
  filter_brain_region: '按脑区筛选',
  filter_condition: '按条件筛选',
  filter_sex: '按性别筛选',
  filter_tissue: '按组织筛选',
  filter_trait: '按性状筛选',
  view_table: '查看数据表',
  filter_dap: '设置差异 peak 筛选',
  select_trait: '选择性状',
  view_scdrs: '查看 scDRS 结果',
  view_signal: '查看 GWAS 信号',
  select_region: '选择脑区',
  select_peak: '选择 peak',
  select_motif: '选择 motif',
};

// 英文环境下的能力说明。缺了这张表，英文界面会直接显示 filter_species 这类内部字段名。
const CAPABILITY_LABELS_EN = {
  select_cluster: 'switch cell type / cluster',
  select_gene: 'pick a gene',
  filter_deg: 'set DEG thresholds',
  expand_enrichment: 'expand enrichment results',
  view_gwas: 'view GWAS association',
  browse_list: 'browse dataset list',
  filter_species: 'filter by species',
  filter_brain_region: 'filter by brain region',
  filter_condition: 'filter by condition',
  filter_sex: 'filter by sex',
  filter_tissue: 'filter by tissue',
  filter_trait: 'filter by trait',
  filter_dap: 'set differential-peak thresholds',
  select_trait: 'pick a trait',
  view_scdrs: 'view scDRS results',
  view_signal: 'view GWAS signals',
  select_region: 'pick a brain region',
  select_peak: 'pick a peak',
  select_motif: 'pick a motif',
  view_table: 'view the data table',
};

export function describeCapabilities(capabilities = [], locale = 'zh') {
  const zh = String(locale || '').toLowerCase().startsWith('zh');
  return (Array.isArray(capabilities) ? capabilities : [])
    .map(item => {
      const key = String(item || '').trim();
      if (!key) return '';
      return zh ? (CAPABILITY_LABELS[key] || key) : (CAPABILITY_LABELS_EN[key] || key);
    })
    .filter(Boolean);
}

// 把页面自描述翻译成可直接展示/喂给模型的人话。
// 页面新增一个筛选维度后，这里自动多一项，不需要改提示词（P4 的核心诉求）。
export function describePageSchema(schema = {}, locale = 'zh') {
  const zh = String(locale || '').toLowerCase().startsWith('zh');
  const labelOf = item => String(item?.labels?.[0] || item?.key || '').trim();
  const filters = (Array.isArray(schema?.filters) ? schema.filters : []).map(labelOf).filter(Boolean);
  const columns = (Array.isArray(schema?.columns) ? schema.columns : []).map(labelOf).filter(Boolean);
  const charts = (Array.isArray(schema?.charts) ? schema.charts : []).filter(Boolean);
  return {
    filters,
    columns,
    charts,
    filtersText: filters.length ? (zh ? `可按 ${filters.join(' / ')} 筛选` : `Filterable by ${filters.join(', ')}`) : '',
    columnsText: columns.length ? (zh ? `表格列：${columns.join('、')}` : `Columns: ${columns.join(', ')}`) : '',
  };
}

// ── 页面模块 ──
// 之前上下文是一串平铺字段，模型只能看到「有这些选择」，看不到「用户此刻在哪个模块」，
// 于是回答时会把数据集概览、字段说明、DEG 表、可做什么全倒在一起。
// 这里把模块显式化：模块中文名 + activeTab → 模块 id 的映射。
const MODULE_LABELS = {
  dataset_overview: '数据集概览',
  clustering: '单细胞聚类 UMAP',
  gene_expression: '当前基因表达',
  gwas_score: 'GWAS/scDRS 细胞评分',
  deg_table: '差异表达基因表（DEG）',
  dap_table: '差异可及性 peak 表（DAP）',
  peak_accessibility: 'peak 可及性',
  enrichment: '富集分析',
  trait_detail: '性状详情',
};

// activeTab → 模块 id。页面只上报 activeTab 时也能定位模块（多数页面都这么做）。
// 匹配按 key 在 tab 里出现为准，长 key 放前面避免被短 key 抢先命中。
const TAB_MODULES = {
  gene_expression: 'gene_expression',
  gwas_score: 'gwas_score',
  scdrs: 'gwas_score',
  differential_peaks: 'dap_table',
  differential: 'dap_table',
  peak_accessibility: 'peak_accessibility',
  enrichment: 'enrichment',
  deg_table: 'deg_table',
  deg: 'deg_table',
  gene: 'gene_expression',
  clustering: 'clustering',
  single_cell_detail: 'dataset_overview',
  spatial_detail: 'dataset_overview',
  atac_detail: 'dataset_overview',
  trait_detail: 'trait_detail',
};

export function moduleIdFromTab(tab = '') {
  const key = String(tab || '').toLowerCase();
  if (!key) return '';
  const hit = Object.keys(TAB_MODULES).find(item => key.includes(item));
  return hit ? TAB_MODULES[hit] : '';
}

export function describeModule(id = '') {
  const key = String(id || '').trim();
  if (!key) return '';
  return MODULE_LABELS[key] || key;
}

// 实体字段：从 businessState 派生当前实体，页面无需重复上报。
const ENTITY_FIELDS = [
  'datasetId', 'studyId', 'traitId', 'omicsType', 'species', 'brainRegion', 'tissue',
  'condition', 'technology', 'cells', 'clusters', 'spots', 'sampleSize', 'sex', 'age',
  'ancestry', 'category',
];

// 选择字段：用户当前选中的 cluster / 基因 / 性状 / 筛选条件。
// geneSource / activeModule 是模块归属字段：告诉模型「这个基因是从哪个模块选的」
// 与「用户此刻在哪个模块」，避免把 DEG 表的选择说成基因表达模块的选择。
const SELECTION_FIELDS = [
  'selectedGene', 'selectedCellType', 'selectedCluster', 'selectedRegion', 'selectedTrait',
  'selectedPeak', 'selectedMotif', 'activeTab', 'degFilter', 'contrast', 'searchQuery',
  'dimension', 'userPrimaryAction', 'geneSource', 'activeModule',
];

// 裁剪时最后保留的实体关键字段。
const KEY_ENTITY_FIELDS = ['datasetId', 'studyId', 'traitId', 'omicsType', 'species', 'brainRegion', 'condition'];

function pickPageMeta(route) {
  const routeName = String(route?.name || '');
  const found = PAGE_TYPES.find(item => item.test(routeName));
  if (found) return { pageType: found.type, omicsType: found.omicsType };
  const path = String(route?.path || '').toLowerCase();
  if (path.includes('/singlecell')) return { pageType: 'single_cell', omicsType: 'SC' };
  if (path.includes('/spatialtranscriptome')) return { pageType: 'spatial', omicsType: 'ST' };
  if (path.includes('/atac')) return { pageType: 'atac', omicsType: 'ATAC' };
  if (path.includes('/gwas')) return { pageType: 'gwas', omicsType: 'GWAS' };
  return { pageType: 'general', omicsType: '' };
}

function inferPrimaryAction(meta, route) {
  const queryTab = String(route?.query?.tab || '').toLowerCase();
  if (queryTab.includes('deg')) return 'viewing_deg_table';
  if (queryTab.includes('gene')) return 'viewing_gene_expression';
  if (queryTab.includes('enrichment')) return 'viewing_enrichment_result';
  if (meta.pageType.includes('list') || meta.pageType === 'browse') return 'browsing_dataset_list';
  if (meta.pageType === 'gwas') return route?.params?.id ? 'viewing_trait_detail' : 'browsing_dataset_list';
  if (meta.pageType === 'atac_detail') return 'viewing_dataset_overview';
  if (meta.pageType.includes('detail')) return 'viewing_dataset_overview';
  return '';
}


function shortValue(value, max = 120) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function cleanArray(value, maxItems = 8) {
  return value
    .filter(item => item !== null && item !== undefined && typeof item !== 'object')
    .slice(0, maxItems)
    .map(item => shortValue(item, 50))
    .join(', ');
}

function cleanObject(source, maxKeys = 12) {
  const out = {};
  Object.entries(source || {}).slice(0, maxKeys).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) {
      const arraySummary = cleanArray(value);
      if (arraySummary) out[key] = arraySummary;
      return;
    }
    if (value && typeof value === 'object') return;
    out[key] = shortValue(value, 80);
  });
  return out;
}

// 单个模块：只保留 id / label / source / note / selection，避免把整块页面状态塞进来。
function cleanModule(module = {}) {
  const id = String(module?.id || module?.key || '').trim();
  if (!id) return null;
  const out = { id, label: String(module.label || describeModule(id)) };
  if (module.source) out.source = shortValue(module.source, 40);
  if (module.note) out.note = shortValue(module.note, 80);
  const selection = cleanObject(module.selection || {}, 8);
  if (Object.keys(selection).length) out.selection = selection;
  return out;
}

// 模块清单：优先用页面显式上报的；没上报时按 visibleData 的 source 反推，
// 保证老页面（只上报 visibleData）也能拿到按模块分组的结构。
function buildModules(reported = [], visibleData = []) {
  const listed = (Array.isArray(reported) ? reported : [])
    .map(item => cleanModule(item))
    .filter(Boolean);
  if (listed.length) return listed;

  const groups = new Map();
  (Array.isArray(visibleData) ? visibleData : []).forEach(row => {
    const source = String(row?.source || '').trim() || '页面数据';
    if (!groups.has(source)) groups.set(source, []);
    groups.get(source).push(row);
  });
  return [...groups.entries()].map(([source, rows]) => ({
    id: source,
    label: source,
    source,
    note: `可见 ${rows.length} 行`,
  }));
}

// 把模块可见行数补进 note，并标出用户当前所在的模块，
// 模型据此判断该模块有没有数据可讲、该重点讲哪个模块。
function annotateModuleRows(modules = [], visibleData = [], activeModule = '') {
  if (!modules.length) return modules;
  const counts = new Map();
  (Array.isArray(visibleData) ? visibleData : []).forEach(row => {
    const source = String(row?.source || '').trim();
    if (!source) return;
    counts.set(source, (counts.get(source) || 0) + 1);
  });
  return modules.map(module => {
    const count = module.source ? counts.get(module.source) || 0 : 0;
    const note = count
      ? (module.note ? `${module.note} · 可见 ${count} 行` : `可见 ${count} 行`)
      : (module.note || '');
    const active = activeModule && module.id === activeModule;
    return { ...module, ...(note ? { note } : {}), ...(active ? { active: true } : {}) };
  });
}

function mergeClean(base, extra, maxKeys = 20) {
  return {
    ...cleanObject(base, maxKeys),
    ...cleanObject(extra, maxKeys),
  };
}

// 只取指定字段，避免把整份 businessState 塞进实体/选择段。
function pickFields(source = {}, fields = []) {
  const picked = {};
  fields.forEach(field => {
    if (source[field] !== undefined && source[field] !== null && source[field] !== '') picked[field] = source[field];
  });
  return picked;
}

// 可见数据摘要：只留 Top N 行，每行带来源标记（缺失时用页面类型兜底）。
function cleanRows(value, maxRows = 20, defaultSource = '') {
  if (!Array.isArray(value)) return [];
  const out = [];
  value.slice(0, maxRows).forEach(row => {
    if (row === null || row === undefined) return;
    const cleaned = typeof row === 'object' ? cleanObject(row, 10) : { value: shortValue(row, 80) };
    if (!Object.keys(cleaned).length) return;
    if (!cleaned.source && defaultSource) cleaned.source = defaultSource;
    out.push(cleaned);
  });
  return out;
}

function estimateBytes(value) {
  const text = JSON.stringify(value || {});
  try {
    return new TextEncoder().encode(text).length;
  } catch (e) {
    return text.length;
  }
}

// 发送前按优先级裁剪：先裁可见数据摘要（保留来源标记），再裁实体非关键字段，
// 路由段与当前选择段永远保留。
export function pruneAgentContext(context = {}, maxBytes = AGENT_CONTEXT_LIMITS?.maxBytes) {
  const limit = Number(maxBytes) || 20 * 1024;
  let draft = context;
  if (estimateBytes(draft) <= limit) return draft;

  // 1) 可见数据摘要：行数逐步减半
  const rows = Array.isArray(draft.visibleData) ? draft.visibleData : [];
  let keep = Math.floor(rows.length / 2);
  while (keep > 0) {
    draft = { ...draft, visibleData: rows.slice(0, keep) };
    if (estimateBytes(draft) <= limit) return draft;
    keep = Math.floor(keep / 2);
  }

  // 2) 行内容全部丢弃，只保留来源标记
  const sources = [];
  rows.forEach(row => {
    const source = row?.source;
    if (source && !sources.includes(source)) sources.push(source);
  });
  draft = { ...draft, visibleData: [], visibleDataSources: sources };
  if (estimateBytes(draft) <= limit) return draft;

  // 3) 实体只保留关键字段
  draft = { ...draft, entity: cleanObject(pickFields(draft.entity || {}, KEY_ENTITY_FIELDS)) };
  if (estimateBytes(draft) <= limit) return draft;

  // 4) 兜底丢弃次要段，路由与选择（含模块归属）必须留下
  draft = { ...draft, pageSummary: {}, plotState: {}, modules: [], pageSchema: { filters: [], columns: [], charts: [] } };
  if (estimateBytes(draft) <= limit) return draft;

  return {
    pageType: draft.pageType,
    locale: draft.locale,
    route: draft.route,
    entity: draft.entity,
    selection: draft.selection,
  };
}

// ── 页面自描述清洗 ──
// 页面只需上报「我有什么」，不给任意大对象：筛选维度只留 key/labels/values，
// 表格列只留 key/labels（labels 用来在 DOM 里定位表头文案），图表只留类型名。
function schemaText(value, max = 40) {
  const text = String(value ?? '').trim();
  return text ? shortValue(text, max) : '';
}

function schemaLabels(item) {
  const raw = Array.isArray(item?.labels) ? item.labels : [item?.label, item?.labelEn];
  const out = [];
  raw.forEach(value => {
    const text = schemaText(value, 40);
    if (text && !out.includes(text)) out.push(text);
  });
  return out.slice(0, 4);
}

function schemaValues(values, maxItems = 12) {
  if (!Array.isArray(values)) return [];
  return values.map(value => schemaText(value, 24)).filter(Boolean).slice(0, maxItems);
}

function cleanSchema(schema = {}) {
  const pick = (list, maxItems, maxKey, withValues) => (Array.isArray(list) ? list : [])
    .slice(0, maxItems)
    .map(item => {
      const key = schemaText(item?.key, maxKey);
      if (!key) return null;
      const out = { key, labels: schemaLabels(item) };
      if (withValues) out.values = schemaValues(item?.values);
      return out;
    })
    .filter(Boolean);
  return {
    filters: pick(schema?.filters, 10, 40, true),
    columns: pick(schema?.columns, 24, 60, false),
    charts: schemaValues(schema?.charts, 12),
  };
}

// 记录「用户当前所在模块」。只有真实操作（或页面显式指定）才改写，
// 被动刷新（例如 DEG 表的 watch）不传 activeModule，也就抢不走模块归属。
function setActiveModule(id, { label = '', activeTab = '', userPrimaryAction = '' } = {}) {
  const key = String(id || '').trim();
  if (!key) return;
  registeredAgentContext.activeModule = key;
  registeredAgentContext.activeModuleLabel = String(label || describeModule(key));
  if (activeTab) registeredAgentContext.activeTab = shortValue(activeTab, 40);
  if (userPrimaryAction) registeredAgentContext.userPrimaryAction = shortValue(userPrimaryAction, 40);
}

export function updateAgentContext(partial = {}) {
  // 模块归属：显式 activeModule 优先；否则从 businessState.activeTab 推导。
  // 这样只上报 activeTab 的老页面（ST/ATAC/GWAS）无需改动也能定位模块。
  const explicitModule = partial.activeModule;
  if (explicitModule !== undefined) {
    setActiveModule(explicitModule, {
      label: partial.activeModuleLabel,
      activeTab: partial.activeTab || partial.businessState?.activeTab || '',
      userPrimaryAction: partial.userPrimaryAction || partial.businessState?.userPrimaryAction || '',
    });
  } else if (partial.businessState && partial.businessState.activeTab !== undefined) {
    setActiveModule(moduleIdFromTab(partial.businessState.activeTab), {
      activeTab: partial.businessState.activeTab,
      userPrimaryAction: partial.businessState.userPrimaryAction || '',
    });
  }

  if (partial.businessState) {
    registeredAgentContext.businessState = mergeClean(registeredAgentContext.businessState, partial.businessState);
  }
  if (partial.plotState) {
    registeredAgentContext.plotState = mergeClean(registeredAgentContext.plotState, partial.plotState);
  }
  if (partial.pageSummary) {
    registeredAgentContext.pageSummary = mergeClean(registeredAgentContext.pageSummary, partial.pageSummary);
  }
  if (partial.entity) {
    registeredAgentContext.entity = mergeClean(registeredAgentContext.entity, partial.entity);
  }
  if (partial.selection) {
    registeredAgentContext.selection = mergeClean(registeredAgentContext.selection, partial.selection);
  }
  if (partial.visibleData !== undefined) {
    const maxRows = Number(AGENT_CONTEXT_LIMITS?.maxVisibleRows) || 20;
    registeredAgentContext.visibleData = Array.isArray(partial.visibleData)
      ? partial.visibleData.slice(0, maxRows)
      : [];
  }
  if (partial.capabilities !== undefined) {
    registeredAgentContext.capabilities = Array.isArray(partial.capabilities) ? partial.capabilities : [];
  }
  if (partial.modules !== undefined) {
    registeredAgentContext.modules = Array.isArray(partial.modules)
      ? partial.modules.slice(0, 12).map(item => cleanModule(item)).filter(Boolean)
      : [];
  }
  // 页面自描述：整体替换而不是合并，页面重新挂载时不会残留上一页的筛选维度
  if (partial.pageSchema !== undefined) {
    registeredAgentContext.pageSchema = cleanSchema(partial.pageSchema);
  }
}

export function clearAgentContext(keys = ['businessState', 'plotState', 'pageSummary', 'entity', 'selection', 'visibleData', 'capabilities', 'modules', 'pageSchema']) {
  keys.forEach(key => {
    if (key === 'pageSchema') {
      registeredAgentContext.pageSchema = { filters: [], columns: [], charts: [] };
      return;
    }
    if (key === 'visibleData' || key === 'capabilities' || key === 'modules') {
      if (Array.isArray(registeredAgentContext[key])) registeredAgentContext[key] = [];
      return;
    }
    if (registeredAgentContext[key]) registeredAgentContext[key] = {};
  });
  if (keys.includes('modules')) {
    registeredAgentContext.activeModule = '';
    registeredAgentContext.activeModuleLabel = '';
    registeredAgentContext.activeTab = '';
    registeredAgentContext.userPrimaryAction = '';
  }
}

export function getRegisteredAgentContext() {
  return registeredAgentContext;
}

function inferCapabilities(meta) {
  const fromPage = PAGE_CAPABILITIES[meta.pageType] || [];
  const reported = Array.isArray(registeredAgentContext.capabilities) ? registeredAgentContext.capabilities : [];
  const merged = [];
  [...fromPage, ...reported].forEach(item => {
    const value = String(item || '').trim();
    if (value && !merged.includes(value)) merged.push(value);
  });

  // 能力与筛选项必须一致：页面自描述说"本页只有物种/脑区/性别"，
  // 能力表若还留着 filter_condition，模型就会照着写"可按条件筛选"，
  // 用户在当前页面根本找不到那个控件。以页面实际上报的 filters 为准。
  const schemaKeys = new Set(
    (Array.isArray(registeredAgentContext.pageSchema?.filters) ? registeredAgentContext.pageSchema.filters : [])
      .map(item => String(item?.key || '').trim())
      .filter(Boolean)
  );
  if (!schemaKeys.size) return merged;

  return merged.filter(item => {
    if (!item.startsWith('filter_')) return true;
    const key = item.slice('filter_'.length);
    const alias = key === 'brain_region' ? 'area' : key;
    return schemaKeys.has(key) || schemaKeys.has(alias);
  });
}

export function buildAgentContext(route, locale) {
  const meta = pickPageMeta(route);
  const params = cleanObject(route?.params);
  const query = cleanObject(route?.query);
  const datasetId = params.id || params.study || query.datasetId || query.dataset || '';

  const routeBusinessState = {
    datasetId,
    studyId: params.study || query.study || '',
    omicsType: meta.omicsType,
    species: query.species || '',
    brainRegion: query.brainRegion || query.area || query.tissue || '',
    condition: query.condition || '',
    technology: query.technology || '',
    selectedGene: query.gene || '',
    selectedCellType: query.cellType || query.cell_type || '',
    selectedCluster: query.cluster || '',
    selectedRegion: query.region || '',
    // selectedTrait 只在 GWAS 页（或显式 trait 参数）下才有意义。
    // 早期实现用 params.id 兜底，导致单细胞页把 datasetId 当成 trait 上报，
    // 表现为上下文里出现 "selectedTrait: F_BA11_C_rep6" 这种串味字段。
    selectedTrait: query.trait || (meta.pageType === 'gwas' ? params.id : '') || '',
    selectedPeak: query.peak || '',
    selectedMotif: query.motif || '',
    activeTab: query.tab || '',
    userPrimaryAction: inferPrimaryAction(meta, route),
  };

  const businessState = mergeClean(routeBusinessState, registeredAgentContext.businessState);

  // 实体与选择：优先用页面显式上报的，未上报时从 businessState 派生，
  // 这样老页面（只上报 businessState）无需改动也能拿到快照。
  const entity = mergeClean(
    pickFields(businessState, ENTITY_FIELDS),
    registeredAgentContext.entity
  );
  const selection = mergeClean(
    pickFields(businessState, SELECTION_FIELDS),
    registeredAgentContext.selection
  );
  const maxRows = Number(AGENT_CONTEXT_LIMITS?.maxVisibleRows) || 20;
  const visibleData = cleanRows(registeredAgentContext.visibleData, maxRows, meta.pageType);

  // 模块归属兜底：页面从没写过 businessState.activeTab（例如只上报 selection）时，
  // 至少从路由推断的 activeTab 推出一个模块，避免回答里完全没有模块定位。
  const activeModule = String(registeredAgentContext.activeModule || '')
    || moduleIdFromTab(businessState.activeTab)
    || moduleIdFromTab(selection.activeTab);

  // 模块归属优先于 selection 里的 activeTab / userPrimaryAction。
  // 原因：selection 常被 DEG 表的被动刷新写死成 DEG，而用户实际在别的模块操作。
  if (activeModule) {
    selection.activeModule = registeredAgentContext.activeModuleLabel || describeModule(activeModule);
    if (registeredAgentContext.activeTab) selection.activeTab = registeredAgentContext.activeTab;
    if (registeredAgentContext.userPrimaryAction) {
      selection.userPrimaryAction = registeredAgentContext.userPrimaryAction;
    }
    // 页面没显式说「基因从哪选的」时，归属到当前模块，
    // 免得 AI 只能看到一个裸基因名、自己猜它属于哪张表。
    if (selection.selectedGene && !selection.geneSource) {
      selection.geneSource = selection.activeModule;
    }
  }

  const modules = annotateModuleRows(
    buildModules(registeredAgentContext.modules, visibleData),
    visibleData,
    String(registeredAgentContext.activeModule || activeModule || '')
  );

  const full = {
    // ── 既有字段：保持兼容，后端与既有读取方都能继续用 ──
    routeName: shortValue(route?.name || '', 80),
    path: shortValue(route?.path || '', 160),
    locale: shortValue(locale || 'en', 16),
    title: typeof document !== 'undefined' ? shortValue(document.title, 120) : '',
    pageType: meta.pageType,
    businessState,
    plotState: mergeClean({}, registeredAgentContext.plotState),
    pageSummary: mergeClean({}, registeredAgentContext.pageSummary),
    // ── 扩展的五段快照 ──
    route: {
      name: shortValue(route?.name || '', 80),
      path: shortValue(route?.path || '', 160),
      pageType: meta.pageType,
      omicsType: meta.omicsType,
      primaryAction: inferPrimaryAction(meta, route),
    },
    entity,
    selection,
    visibleData,
    capabilities: inferCapabilities(meta),
    // ── 页面自描述：筛选维度 / 表格列 / 图表类型（页面自己上报，见 P4）──
    // 模型据此回答「这页能怎么筛」「这列什么意思」，新增维度不用改提示词。
    pageSchema: cleanSchema(registeredAgentContext.pageSchema),
    // ── 模块层：本页有哪些模块、各自选中了什么，供模型按模块组织回答 ──
    modules,
    activeModule: activeModule ? (registeredAgentContext.activeModuleLabel || describeModule(activeModule)) : '',
  };

  return pruneAgentContext(full);
}

// 供虚拟技能使用的「当前页快照」：只含五段 + 页面能力 + 一句话摘要。
export function getPageSnapshot(route, locale) {
  const context = buildAgentContext(route, locale);
  return {
    route: context.route,
    entity: context.entity,
    selection: context.selection,
    visibleData: context.visibleData,
    capabilities: context.capabilities,
    pageSchema: context.pageSchema,
    modules: context.modules || [],
    activeModule: context.activeModule || '',
    pageType: context.pageType,
    locale: context.locale,
    summary: summarizeAgentContext(context),
  };
}

export function summarizeAgentContext(context) {
  const parts = [];
  const push = value => {
    const text = String(value ?? '').trim();
    if (text && !parts.includes(text)) parts.push(text);
  };
  push(context?.businessState?.omicsType);
  push(context?.entity?.datasetId || context?.businessState?.datasetId);
  push(context?.entity?.traitId || context?.businessState?.traitId);
  push(context?.selection?.selectedTrait || context?.businessState?.selectedTrait);
  push(context?.selection?.selectedGene || context?.businessState?.selectedGene);
  push(context?.selection?.selectedCellType || context?.businessState?.selectedCellType);
  push(context?.selection?.selectedCluster || context?.businessState?.selectedCluster);
  // 模块优先于 activeTab：activeTab 会被 DEG 表的被动刷新写死，模块才是用户真实所在。
  push(context?.activeModule || context?.selection?.activeModule);
  push(context?.selection?.activeTab || context?.businessState?.activeTab);
  if (!parts.length && context?.pageType) push(context.pageType);
  return parts.join(' · ');
}
