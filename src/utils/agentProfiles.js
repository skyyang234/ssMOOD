// AI 模块的「人格配置」。
//
// 设计原则：**一个编排引擎 + 多份 profile**，不 fork 代码。
// 引擎（agentOrchestrator）、工具实现（agentTools）、出图（AgentPlotModal）、
// 术语表（agentGlossary）、路由白名单（agentRoutes）全部共用，profile 只决定：
//   ① 模型能看到哪些意图（intents）
//   ② 模型能看到哪些工具（hiddenSkills / hiddenVirtualTools）
//   ③ 用哪套 Plan 提示词规则
//   ④ 面板上显示的名字与空状态文案（title / emptyHints）
//
// 因此「裁剪」= 从可见名单里去掉，不删任何实现；
// 以后要恢复某个能力，把名字从 hidden 名单里删掉即可。
//
// 新增一个 AI = 在这里加一个条目 + 在 App.vue 里挂一个实例。

import { AGENT_INTENTS } from './agentConfig';

// 数据/分析类后端技能：使用助手不需要（查表达、差异、组成、GWAS、ATAC 都属于「数据问答」）。
const DATA_SKILLS = [
  'get_dataset_summary',
  'get_gene_expression_summary',
  'compare_gene_expression',
  'get_deg_summary',
  'compare_deg_summary',
  'get_celltype_composition',
  'get_gwas_signal_summary',
  'get_atac_peak_summary',
  'summarize_external_evidence',
  'combine_data_with_knowledge',
];

// 数据/分析类前端虚拟工具：出图与富集都归数据助手。
const DATA_VIRTUAL_TOOLS = [
  'plot_umap',
  'plot_spatial',
  'plot_cell_composition',
  'plot_gene_expression',
  'plot_deg',
  'plot_atac',
  'plot_gwas',
  'plot_enrichment',
  'run_enrichment',
  'compare_gene_across_groups',
  'summarize_gene_across_datasets',
];

export const AGENT_PROFILES = {
  // ── 使用助手：站内使用指引 + 链接生成 + 术语解释 ──
  guide: {
    id: 'guide',
    title: { zh: '使用助手', en: 'Usage guide' },
    subtitle: {
      zh: '站内操作指引与名词解释',
      en: 'Site usage guidance and terminology',
    },
    // 只保留「怎么用 + 是什么」，不含任何数据分析/绘图意图。
    intents: [
      'navigate',
      'search',
      'howto',
      'explain',
      'explain.term',
      'explain.field',
      'explain.threshold',
      'explain.data',
      'summarize',
      'smalltalk',
      'out_of_scope',
    ],
    hiddenSkills: DATA_SKILLS,
    hiddenVirtualTools: DATA_VIRTUAL_TOOLS,
    // Plan 提示词里额外注入的规则（见 agentPrompts.buildPlanSystemPrompt）。
    promptProfile: 'guide',
    emptyHints: {
      zh: ['我想筛选某个脑区的样本，怎么操作？', 'Pct.1 这一列是什么意思？', 'scDRS 是什么？'],
      en: ['How do I filter samples by brain region?', 'What does the Pct.1 column mean?', 'What is scDRS?'],
    },
    // ── 与数据助手的转交 ──
    // 默认两边对话历史完全独立；只有「用户显式点转交」或「识别到需要数据/画图」时，
    // 才把气泡这几轮的消息带到数据助手（见 utils/aiPanel.handoffConversation）。
    handoff: {
      enabled: true,
      target: 'data',
      // 数据助手是独立页面：转交时直接跳转过去，消息通过 handoffState 带过去。
      route: '/ai',
      label: { zh: '转到数据助手', en: 'Switch to data assistant' },
    },
  },

  // ── 数据助手：数据问答 + 8 类出图（= 现有能力的完整集合） ──
  data: {
    id: 'data',
    title: { zh: '数据助手', en: 'Data assistant' },
    subtitle: {
      zh: '数据查询、对比与图表',
      en: 'Query, compare and plot data',
    },
    intents: [...AGENT_INTENTS],
    hiddenSkills: [],
    hiddenVirtualTools: [],
    promptProfile: 'data',
    emptyHints: {
      zh: ['画一下这个样本的 UMAP', 'MALAT1 在这个样本里表达吗？', '这个样本的细胞类型组成是什么？'],
      en: ['Plot the UMAP of this sample', 'Is MALAT1 expressed in this sample?', 'What is the cell-type composition?'],
    },
    handoff: {
      enabled: false,
      target: 'guide',
      label: { zh: '转到使用助手', en: 'Switch to usage guide' },
    },
  },
};

export const DEFAULT_AGENT_PROFILE = 'data';

export function getAgentProfile(id) {
  return AGENT_PROFILES[String(id || '')] || AGENT_PROFILES[DEFAULT_AGENT_PROFILE];
}

// 该 profile 下「模型可见」的意图清单（注入 Plan 提示词用）。
export function allowedIntentsFor(id) {
  const profile = getAgentProfile(id);
  const set = new Set(profile.intents || AGENT_INTENTS);
  return AGENT_INTENTS.filter(intent => set.has(intent));
}

// 该 profile 下需要隐藏的工具名集合（与全局隐藏名单合并）。
export function hiddenToolNamesFor(id, globalHiddenSkills = [], globalHiddenVirtual = []) {
  const profile = getAgentProfile(id);
  return new Set([
    ...(globalHiddenSkills || []),
    ...(globalHiddenVirtual || []),
    ...(profile.hiddenSkills || []),
    ...(profile.hiddenVirtualTools || []),
  ]);
}

// 面板标题：跟随语言，无需改 i18n 文件（名字只在这里维护一处）。
export function profileTitle(id, locale = 'zh') {
  const profile = getAgentProfile(id);
  const zh = String(locale || '').startsWith('zh');
  return zh ? profile.title.zh : profile.title.en;
}

export function profileSubtitle(id, locale = 'zh') {
  const profile = getAgentProfile(id);
  const zh = String(locale || '').startsWith('zh');
  return zh ? profile.subtitle.zh : profile.subtitle.en;
}

export function profileHints(id, locale = 'zh') {
  const profile = getAgentProfile(id);
  const zh = String(locale || '').startsWith('zh');
  return zh ? profile.emptyHints.zh : profile.emptyHints.en;
}
