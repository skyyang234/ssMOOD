// AI 模块前端编排配置。
// 后端三个入口（agent_llm / agent_skill_exec / agent_chat）签名已冻结，
// 因此所有可调项都集中在本文件，改行为只改前端、不再同步后端。
import config from '@/config';

export const AGENT_ENDPOINTS = {
  llm: `${config.apiUrl}agent_llm.php`,
  skill: `${config.apiUrl}agent_skill_exec.php`,
  final: `${config.apiUrl}agent_chat.php`,
};

export const AGENT_LIMITS = {
  maxToolRounds: 2,        // 一问最多执行两轮工具
  maxToolsPerRound: 4,     // 每轮最多并行 4 个工具
  historyMessages: 8,      // 携带的历史消息条数
  messageMaxLength: 1200,  // 单条历史消息截断长度
  requestTimeoutMs: 120000,
  planTemperature: 0.2,
  planMaxTokens: 900,
  finalTemperature: 0.25,
  // 1000 不够写"解释 + 分点 + 对比表格"这类结构化回答：实测会在句子中间停住
  // （"如果你想查看具体的数据，可以：" 后面直接没了）。1600 覆盖绝大多数回答，
  // 真超长时前端会补一句"到这里被截断"，不会留半句话。
  finalMaxTokens: 1600,
};

// ── 结构化意图判断 ──
// 模型必须从该枚举里选一个 intent；改动这里即可增删意图，不需要改编排代码。
// 解释类细分 explain.term(缩写/术语) / explain.field(字段含义) / explain.threshold(数值判定) /
// explain.data(当前页数据怎么看)，绘图类单独一个 plot。
export const AGENT_INTENTS = [
  'navigate',
  'search',
  'explain',
  'explain.term',
  'explain.field',
  'explain.threshold',
  'explain.data',
  'analyze.expression',
  'analyze.deg',
  'analyze.enrichment',
  'analyze.gwas',
  'analyze.atac',
  'plot',
  'compare',
  'summarize',
  'howto',
  'smalltalk',
  'out_of_scope',
];

// 这些意图不需要查数据，若模型却返回了 toolCalls 视为明显不匹配。
export const AGENT_NO_TOOL_INTENTS = ['smalltalk', 'out_of_scope', 'howto'];

// 意图自检与定向重试。enabled=false 即一键关闭重试（仍会记录日志）。
export const AGENT_PLAN_SELFCHECK = {
  enabled: true,
  maxRetries: 1,
  minReasoningLength: 8,
  // 只有 analyze.* 强制要求工具调用；explain/summarize 允许直接用 reply 作答，
  // 否则「我现在这个页面是什么呀」这类问题会被自检卡死。
  // 置为 false 后改用下面的显式名单，把解释类/绘图类也纳入「必须有工具」。
  requireToolsOnlyForAnalyze: false,
  // 必须带工具的意图前缀：分析类 + 解释类中的"具体术语/字段/阈值"三档。
  // 注意不能写 'explain.'：概念题（「单细胞和空转有什么区别」「这些数据有什么用」）
  // 没有对口的单个术语可查，要求它必须带工具会直接被自检判死——
  // 这正是「生物学问题一问就报错」的根因，也是提示词规则 6 与实际校验互相矛盾之处。
  toolRequiredPrefixes: ['analyze.', 'explain.term', 'explain.field', 'explain.threshold'],
  // 必须带工具的完整意图名：绘图类与检索类。
  toolRequiredIntents: ['plot', 'search', 'compare'],
  // 自检最终仍不通过时，若 Plan 已给出 reply 且不是 analyze.*，用 reply 兜底，
  // 而不是一律返回「无法判断」的保守话术。
  allowReplyFallback: true,
  // 自检/重试过程写控制台，便于排查误判。
  logSelfCheck: true,
  vagueReasoningPatterns: [
    /^(n\/?a|none|null|unknown|uncertain|不确定|不知道|不清楚|无|没有|其他|其它)\.?$/i,
    /^(general|generic)\s+(question|request)\.?$/i,
  ],
};

// 页面上下文体积限制：超限按优先级裁剪（见 agentContext.pruneAgentContext）。
export const AGENT_CONTEXT_LIMITS = {
  maxBytes: 20 * 1024, // 发送前上限
  maxVisibleRows: 20,  // 可见数据摘要最多保留的行数
};

// Plan few-shot：覆盖最容易被误判成寒暄的场景，热改即可生效。
export const AGENT_INTENT_FEW_SHOTS = [
  {
    user: '这个数据集的富集结果是什么',
    intent: 'analyze.enrichment',
    note: 'It asks for enrichment results of a dataset. This is an analysis request, NOT smalltalk. Call an enrichment/dataset tool.',
  },
  {
    user: '这些通路什么意思',
    intent: 'analyze.enrichment',
    note: 'Explaining concrete enrichment pathways still concerns analysis results, not chitchat. Keep a tool call for context.',
  },
  {
    user: 'MDD 和对照组有什么不同',
    intent: 'analyze.deg',
    note: 'A case-vs-control difference question is differential expression analysis.',
  },
  {
    user: 'padj 0.03 算显著吗',
    intent: 'explain.threshold',
    note: 'Asks whether a concrete number is significant. Call explain_domain_knowledge with type=threshold; never answer smalltalk.',
  },
  {
    user: '这个数据怎么看',
    intent: 'explain.data',
    note: 'Asks how to read the currently loaded data. Call describe_current_page and explain_domain_knowledge for the relevant fields.',
  },
  {
    user: 'Pct.1 这一列是什么意思',
    intent: 'explain.field',
    note: 'Asks the meaning of one table column. Call explain_domain_knowledge with type=field.',
  },
  {
    user: 'ASTRO 是什么缩写',
    intent: 'explain.term',
    note: 'Asks what an abbreviation stands for. Call explain_domain_knowledge with type=term.',
  },
  {
    user: '帮我画一下这个基因的表达',
    intent: 'plot',
    note: 'A drawing request. Call plot_gene_expression / plot_cell_composition / plot_deg / plot_atac / plot_gwas / plot_umap / plot_spatial so a real plot action is produced.',
  },
  {
    user: '你好',
    intent: 'smalltalk',
    note: 'Pure greeting with no data need: toolCalls=[] and intentConfidence=high.',
  },
  {
    user: '你能做什么',
    intent: 'howto',
    note: 'Asks about platform capabilities, not about specific data: toolCalls=[].',
  },
  {
    user: '我现在这个页面是什么呀',
    intent: 'summarize',
    note: 'Asks about the current page. Call describe_current_page to read the page state.',
  },
];

// 术语命中时直接用本地文案作答，跳过 Final 调用：
// 更准（不会编造局限说明或外部链接）、更快（少一次 LLM 往返）。
export const AGENT_GLOSSARY_DIRECT_REPLY = true;

// 工具清单缓存时长（毫秒）：避免每轮对话都去拉一次 _manifest。
export const AGENT_TOOL_CATALOG_CACHE_MS = 600000;

// 保守兜底文案：自检两次都没通过时使用，不调用任何工具。
export const AGENT_TEXTS = {
  selfCheckFailed: {
    // P3：兜底也要"说人话 + 给下一步"，不要只说"无法判断"
    zh: '这句我没判断出该走哪种处理，所以没有执行查询。说明得再具体一点就行：想看哪类数据（例如「母鼠的空转数据」）、问某个字段或缩写的含义，或直接给一个样本编号。',
    en: 'I could not tell which path to take, so nothing was queried. Be a little more specific: which data slice you want (e.g. "female mouse spatial data"), what a field or abbreviation means, or a sample id.',
  },
};

// 后置校验的话术微调，原样透传给 agent_chat.php 的 verification 字段。
// 可填：offerPhrases / protectedIdentifiers / neutralReply / conservativeReply / qualitativeWord
// 校验本身不可被前端关闭。
export const AGENT_VERIFICATION = {};

// 后端还没上传、但前端要先行开发的能力：把工具名写进这里即可走本地假数据，
// 后端就绪后从数组里删掉名字即可切到真实实现。
export const AGENT_MOCK_MODE = false;
export const AGENT_MOCK_TOOLS = [];

// ── 工具可见性（只影响「是否注入 Plan 提示词」，不删除任何工具定义）──
// 后端已通过 _manifest 的 capability 标记不可用能力，前端据此自动隐藏。
// 下面两份名单仅作兜底/临时下线：后端还没更新 capability，或想临时隐藏某能力时填写。
export const AGENT_HIDDEN_TOOLS = ['build_plot_action', 'get_plot_data']; // 已被前端 plot_* 工具取代（统一前端取数+拼图），模型不再调用，但前端内部仍用 get_plot_data 取数
export const AGENT_HIDDEN_VIRTUAL_TOOLS = []; // 前端虚拟技能，如 'run_enrichment'

// 启动时打印一次实际注入 Plan 的工具清单（含被隐藏的工具），便于核对。
export const AGENT_TOOL_CATALOG_LOG = true;
