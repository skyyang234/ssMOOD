// AI 模块编排层：整个 Agent 循环都在前端。
// 后端只提供三个冻结入口，本文件负责：Plan → 执行工具 → Final → 后置校验结果。
//
// 一问的完整流程：
//   1. 组装 Plan 提示词（含页面上下文 + 工具表）→ agent_llm.php（jsonMode）
//   2. 模型给出 toolCalls，逐个执行（虚拟技能本地跑 / 后端技能走 agent_skill_exec.php）
//   3. 把工具结果 + Final 提示词 → agent_chat.php（内含后端后置校验）
//   4. 返回 { reply, actions, warnings } 给 UI 直接渲染
//
// 要新增能力：改 agentTools.js（虚拟技能）或让后端在映射表加一行，本文件通常不用动。
import {
  AGENT_ENDPOINTS,
  AGENT_LIMITS,
  AGENT_VERIFICATION,
  AGENT_INTENTS,
  AGENT_NO_TOOL_INTENTS,
  AGENT_PLAN_SELFCHECK,
  AGENT_TEXTS,
  AGENT_GLOSSARY_DIRECT_REPLY,
} from './agentConfig';
import { buildPlanSystemPrompt, buildPlanRepairMessage, buildFinalSystemPrompt, buildToolCatalogText } from './agentPrompts';
import { buildToolCatalog, runTool, postJson, glossaryActionsFromResults, knowledgeActionsFromResults } from './agentTools';
import { isKnownRoutePath, normalizeRoutePath, routeParamValues } from './agentRoutes';
import { detectStudyNavigation, looksLikeBrowsing } from './agentStudyLinks';
import { buildNavActionsFromSlots, slotsFromPlan } from './agentSlots';
import { searchGlossary } from './agentGlossary';
import { buildConceptAnswer } from './agentConcepts';
import { pickPlotActions, replyContradictsPlot, plotReadyReply, slimPlotActionForFinal } from './agentPlotGuard';
import { budgetActions } from './agentActionBudget';
import {
  DATA_CLAIMS, detectMissingClaims, hasTurnData, isHowToAsk, stripDenialSentences, summarizeClaim,
} from './agentDataClaims';
import { pruneFilterClaims, stripInternalRefs } from './agentPageFacts';
import { loadSampleCatalog } from './agentSampleCatalog';
import { recordTurn } from './agentTelemetry';
import { buildEvidence } from './agentEvidence';

const isZh = locale => String(locale || '').toLowerCase().startsWith('zh');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    /* fall through */
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (e) {
      /* fall through */
    }
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 兜底文案：不再是干巴巴的"无法生成可靠回答"，而是给出三条**本站确实支持**的出路。
// 原则：宁可少说一句，也不能承诺工具做不到的事（见文档 P3）。
function fallbackText(locale) {
  return isZh(locale)
    ? '这句我没处理明白。可以试试：① 说清想看哪类数据，例如「母鼠的空转数据」；② 问某个缩写或字段，例如「Pct.1 是什么意思」；③ 报一个样本编号，我查它的概况。'
    : 'I could not handle that one. Try: (1) name the data slice you want, e.g. "female mouse spatial data"; (2) ask what an abbreviation or column means, e.g. "what is Pct.1"; (3) give a sample id and I will summarize it.';
}

// Final 失败（或回复为空）但本地仍能给出确定性卡片时，说一句具体的话，
// 而不是千篇一律的「已为您生成以下内容」，避免用户觉得助手"答不上来"。
function recoveredReplyText(actions = [], locale) {
  const nav = (actions || []).find(action => action?.type === 'navigate' && action.label);
  if (isZh(locale)) {
    return nav
      ? `已经帮你定位到入口：${nav.label}。点击下方卡片即可打开。`
      : '已为您生成以下内容，点击下方卡片即可查看。';
  }
  return nav
    ? `Here is the page you need: ${nav.label}. Click the card below to open it.`
    : 'I prepared the following for you — click the card(s) below to view.';
}

// 澄清选项兜底：后端对 Plan JSON 的字段是白名单式的，新增的 clarifyOptions
// 不一定能透传回来（实测模型追问了但没带选项）。所以「画什么图」这类
// 最常见的澄清场景，直接按当前组学类型给出确定性的选项，保证按钮一定可点。
// 选项写成「动词 + 图名」的祈使句：点下去就是一句明确指令，
// 模型才会直接调用绘图工具，而不是回一句「请到页面右侧点模块」。
const PLOT_CLARIFY_OPTIONS = {
  SC: {
    zh: ['画 UMAP 聚类图', '画细胞类型组成图', '画基因表达分布图'],
    en: ['Plot UMAP clusters', 'Plot cell-type composition', 'Plot gene expression'],
  },
  ST: {
    zh: ['画空间表达图', '画细胞类型组成图', '画基因表达分布图'],
    en: ['Plot spatial expression', 'Plot cell-type composition', 'Plot gene expression'],
  },
  ATAC: {
    zh: ['画细胞类型组成图', '画 peak 可及性图'],
    en: ['Plot cell-type composition', 'Plot peak accessibility'],
  },
};

// 模型给的选项可能跨模态（单细胞数据集上给「空间表达」），点了必然失败。
// 这里按当前组学类型做一次硬过滤：SC 不留空间图，ST 不留 UMAP/聚类（plot_umap 仅单细胞）。
function pruneClarifyOptions(options = [], context = {}) {
  const omics = String(context?.businessState?.omicsType || '').toUpperCase();
  return (Array.isArray(options) ? options : []).filter(item => {
    const text = String(item || '');
    if (omics === 'SC' && /空间|spatial/i.test(text)) return false;
    if (omics === 'ST' && /umap|聚类|cluster/i.test(text)) return false;
    return true;
  });
}

function clarifyOptionsFor({ plan, context, locale, userMessage = '', profile = 'data' }) {
  // 使用助手（guide）看不到任何绘图工具，此时给「画什么图」的选项只会误导用户
  if (String(profile || 'data') !== 'data') return [];
  const question = String(plan?.clarifyingQuestion || plan?.reply || '');
  const hint = `${question} ${plan?.intent || ''} ${plan?.intentReasoning || ''}`;
  // 只在「要画图」的场景补：其他澄清（要哪个数据集/哪个基因）交给模型给选项更合适
  const asksToPlot = /画|绘制|plot|draw|chart/i.test(String(userMessage || ''));
  if (!asksToPlot && !/图|plot|chart|figure|画/i.test(hint)) return [];
  // 模型有时把追问写进 reply 而不是 clarifyingQuestion，这里用「意图 / 标记 / 句尾是问号」兜住
  const plotIntent = /plot/i.test(String(plan?.intent || ''));
  const asking = /[？?：:]\s*$/.test(question.trim());
  if (!plotIntent && plan?.needsClarification !== true && !asking && !asksToPlot) return [];
  const omics = String(context?.businessState?.omicsType || '').toUpperCase();
  const preset = PLOT_CLARIFY_OPTIONS[omics];
  if (!preset) return [];
  return (isZh(locale) ? preset.zh : preset.en).slice(0, 3);
}

// ── 筛选能不能落地（P4 收尾）──
// 库里没有雌性空转样本，但 AI 照样给出 ?sex=female 的链接并说"已帮你定位到入口"，
// 用户点进去是空列表。这里在返回前用样本目录核对一次：
// 条件命不中时先降级（去性别 → 去脑区），并**明确说出来**，不假装筛到了。
const NAV_OMICS_BY_PATH = {
  '/browse/SingleCell': 'SC',
  '/browse/SpatialTranscriptome': 'ST',
  '/browse/atac': 'ATAC',
};
const NAV_OMICS_LABEL = {
  SC: { zh: '单细胞', en: 'single-cell' },
  ST: { zh: '空转', en: 'spatial' },
  ATAC: { zh: 'ATAC', en: 'ATAC' },
};

function catalogMatches(catalog = [], omics = '', filters = {}) {
  return (catalog || []).filter(item => {
    if (String(item?.omicsType || '').toUpperCase() !== omics) return false;
    if (filters.species && String(item.speciesKey || '') !== filters.species) return false;
    if (filters.sex && String(item.sex || '').toLowerCase() !== filters.sex) return false;
    if (filters.area && String(item.brainRegion || '') !== filters.area) return false;
    return true;
  });
}

function splitRoute(route = '') {
  const [path, qs = ''] = String(route).split('?');
  return { path, params: new URLSearchParams(qs) };
}

async function groundFilteredNavigation(actions = [], locale = 'zh') {
  const zh = isZh(locale);
  const candidates = (actions || []).filter(action => action?.type === 'navigate' && String(action.route || '').includes('?'));
  if (!candidates.length) return { actions, note: '' };

  let catalog = [];
  try {
    catalog = await loadSampleCatalog();
  } catch (e) {
    catalog = [];
  }
  if (!Array.isArray(catalog) || !catalog.length) return { actions, note: '' };

  const notes = [];
  const out = [];
  (actions || []).forEach(action => {
    if (!candidates.includes(action)) {
      out.push(action);
      return;
    }
    const { path, params } = splitRoute(action.route);
    const omics = NAV_OMICS_BY_PATH[path];
    if (!omics) {
      out.push(action);
      return;
    }
    const species = params.get('species') || '';
    const sex = params.get('sex') || '';
    const area = params.get('area') || '';
    const label = NAV_OMICS_LABEL[omics];

    // 去掉某个筛选后，卡片标题也得跟着改：否则会出现
    // 「标题写着 (Mouse · Female)，链接其实是不限性别的全部小鼠样本」这种自相矛盾。
    const rebuildLabel = () => {
      const parts = [];
      const sp = params.get('species');
      if (sp) parts.push(sp === 'mouse' ? (zh ? '小鼠' : 'Mouse') : (zh ? '人' : 'Human'));
      const ar = params.get('area');
      if (ar) parts.push(ar);
      const suffix = parts.length ? (zh ? `（${parts.join(' · ')}）` : ` (${parts.join(' · ')})`) : '';
      return zh ? `浏览${label.zh}样本列表${suffix}` : `Browse ${label.en} sample list${suffix}`;
    };

    if (catalogMatches(catalog, omics, { species, sex, area }).length) {
      out.push(action);
      return;
    }

    // 1) 去掉性别还能命中 → 给列表，但说清楚"没有这个性别"
    const withoutSex = catalogMatches(catalog, omics, { species, area });
    if (sex && withoutSex.length) {
      params.delete('sex');
      const speciesWord = species === 'mouse' ? (zh ? '小鼠' : 'mouse') : (zh ? '人' : 'human');
      const sexWord = sex === 'female' ? (zh ? '雌性' : 'female') : (zh ? '雄性' : 'male');
      out.push({ ...action, route: `${path}?${params.toString()}`, label: rebuildLabel() });
      notes.push(zh
        ? `库里目前没有${speciesWord}的${sexWord}${label.zh}样本（现有 ${withoutSex.length} 个都不是${sexWord}），下面给的是该方法下的全部${label.zh}样本。`
        : `There is no ${sexWord} ${label.en} sample for ${speciesWord} yet (all ${withoutSex.length} available ones are the other sex); the link lists them all.`);
      return;
    }

    // 2) 去掉脑区还能命中 → 保留物种（脑区名对不上时不至于给空列表）
    const withoutArea = catalogMatches(catalog, omics, { species, sex });
    if (area && withoutArea.length) {
      params.delete('area');
      out.push({ ...action, route: `${path}?${params.toString()}`, label: rebuildLabel() });
      notes.push(zh
        ? `库里没有该脑区的${label.zh}样本，已放宽为全部${label.zh}样本（${withoutArea.length} 个）。`
        : `No ${label.en} sample in that region; showing all ${withoutArea.length} available.`);
      return;
    }

    // 3) 都不行 → 不给链接，直接说明
    notes.push(zh
      ? `库里没有符合这些条件的${label.zh}样本，换个条件我再找（例如不限定性别或脑区）。`
      : `No ${label.en} sample matches those filters; try relaxing sex or region.`);
  });

  return { actions: out, note: notes.join(' ') };
}

// 把"筛选落不了地"的说明并进正文。
// 如果原文只是"正在打开……"这类导航播报，就用说明**替换**它（否则会自相矛盾：
// 一边说"正在打开雌性空转列表"，一边说"库里没有雌性样本"）；正文本身有内容时则追加。
function mergeReplyWithNote(baseReply = '', grounded = { note: '' }, locale = 'zh') {
  if (!grounded?.note) return baseReply;
  const zh = isZh(locale);
  // 导航播报的固定句式：命中就直接用说明替换，不再受长度限制
  // （英文 "Here is the page you need: … Click the card below to open it." 就有 90+ 字符）
  const navish = !baseReply
    || /here is the page|click the card below|opening the/i.test(baseReply)
    || /已帮你定位|点击下方卡片|正在打开|定位到入口/.test(baseReply);
  const tail = grounded.actions?.some(action => action?.type === 'navigate')
    ? (zh ? '已按可用的条件给出列表入口，点击下方卡片打开。' : 'Click the card below to open the list with the conditions available.')
    : '';
  if (navish) return [grounded.note, tail].filter(Boolean).join('\n\n');
  return [baseReply, grounded.note].filter(Boolean).join('\n\n');
}

// 本地离线兜底：Plan 失败、Plan 退化（既没工具也没文案）时，不把问题直接判死。
// 两级顺序：
//   1) 具体术语/字段（Pct.1、logFC）→ 术语表，命中即答，还能定位表格列；
//   2) 概念类（「单细胞和空转有什么区别」「这些数据有什么用」）→ 固定知识作答。
// 第 2 级之前缺失，导致这类问题被自检拦下后只能回"没判断出该走哪种处理"。
// 只有"在问这个术语本身"才允许用词表覆盖正文。
// 否则「解释这个页面里的 UMAP」也会命中 UMAP 条目，把页面说明换成术语定义。
const TERM_QUESTION_CUES = /是什么|什么意思|啥意思|含义|缩写|怎么读|指什么|代表什么|定义|what\s+(is|does)|mean(s|ing)?\b/i;

// 阈值 55：整句提问里包含术语（Pct.1 / LogFC）时的得分就是 55。
function localGlossaryMatches(query) {
  return searchGlossary(query, 3)
    .filter(item => Number(item.score) >= 55)
    .map(item => ({
      term: item.term,
      fullName: item.fullName,
      chineseName: item.chineseName,
      explanation: item.explanation,
      source: item.source,
      route: item.route,
    }));
}

function glossaryAnswerFromMatches(matches, context, locale) {
  const termActions = glossaryActionsFromResults([{ result: { matches } }]);
  return {
    reply: glossaryReplyText(matches, locale),
    actions: [...termActions, ...focusColumnActions(context, termActions)],
  };
}

// ── "编造数据缺失"守卫 ──
// 工具没拿到数据（没调用 / 参数不匹配 / 调用失败）时，模型会把"我没拿到"写成
// "库里没有"：「该样本尚未注释」「没有差异基因」。这类回答伪装成诚实，
// 用户不会重试，只会以为数据缺失。
//
// 命中条件（三者同时）：
//   1) 问的是某类数据（组成 / DEG / 表达 / ATAC 峰）；
//   2) 正文出现该类数据的否认句；
//   3) 本轮没有该技能"成功且确实有数据"的结果。
// 命中就自己查一次，有数据则删掉否认句、补上真实结论。


async function repairMissingDataClaims({ reply = '', userMessage = '', context = {}, toolResults = [], locale = 'zh' }) {
  // ① 明确否认有数据（"尚未注释/没有差异基因"）→ 必查
  const targets = detectMissingClaims(reply, userMessage)
    .filter(spec => !hasTurnData(toolResults, spec))
    .map(spec => ({ spec, stripDenial: true }));

  // ② 问的是"具体值"，回答却只让用户自己去点图表 → 也补真实数据
  //    只对能判断"正文是否已列出真实值"的技能生效（目前是组成），
  //    且"怎么看组成"这种 how-to 问题不插手。
  if (!isHowToAsk(userMessage)) {
    DATA_CLAIMS.forEach(spec => {
      if (!spec.names || !spec.valueAsk) return;
      if (targets.some(item => item.spec.key === spec.key)) return;
      // 必须问的是这类数据本身（"细胞类型组成"），而不是碰巧带了"多少"
      if (!spec.ask.test(userMessage) || !spec.valueAsk.test(userMessage)) return;
      if (hasTurnData(toolResults, spec)) return;
      targets.push({ spec, stripDenial: false });
    });
  }

  if (!targets.length) return null;

  // 语言跟随正文：站点 locale 是 en，但模型可能用中文答，补写部分不该突然切英文
  const zh = /[\u4e00-\u9fa5]/.test(reply) || isZh(locale);
  const patches = [];
  const kinds = [];
  const stripped = [];

  for (const { spec, stripDenial } of targets) {
    const params = spec.params(context, userMessage);
    // 只校验必填项：cellType 这类可选参数缺失时仍然可以查
    if (!params || (spec.required || []).some(key => !params[key])) continue;
    const result = await runTool(spec.skill, params, { locale, context }).catch(() => null);
    if (!result?.ok || !spec.hasData(result.result)) continue;   // 真的没有：不动，别硬编

    // 非否认场景：正文已经列出两类以上真实值，就说明它确实看过数据，不用插手
    if (!stripDenial && spec.names) {
      const names = spec.names(result.result);
      if (names.filter(name => reply.includes(name)).length >= 2) continue;
    }

    patches.push(summarizeClaim(spec, result.result, { zh, context }));
    kinds.push(spec.key);
    if (stripDenial) stripped.push(spec);
  }

  if (!patches.length) return null;
  // 已补真实结论：先把"没有…"的否认句删掉，否则会自相矛盾
  const cleaned = stripped.length ? stripDenialSentences(reply, stripped) : String(reply).trim();
  return { reply: [cleaned, ...patches].filter(Boolean).join('\n\n'), kinds };
}

function localOfflineAnswer({ userMessage = '', context = {}, locale = 'zh' } = {}) {
  const matches = localGlossaryMatches(userMessage);
  if (matches.length) return glossaryAnswerFromMatches(matches, context, locale);

  const concept = buildConceptAnswer({ text: userMessage, locale });
  if (concept) return concept;

  return null;
}

// 导航类动作的两级校验，避免出现「点了没反应」或「点开是空白页」的链接：
//   1) 路径形态必须在站点路由清单里，否则根本跳不过去；
//   2) 路径/卡片里的 id 必须能溯源到本次工具结果、页面上下文或用户原话，
//      否则是模型编造的详情页 id。没有 route 的卡片由 UI 按 id 拼装，同样校验 id。
function filterRoutableActions(actions = [], haystack = '') {
  const traceable = value => {
    const text = String(value ?? '').trim();
    if (!text || !haystack) return true; // 没有可溯源材料时不误杀
    return haystack.toLowerCase().includes(text.toLowerCase());
  };
  return (Array.isArray(actions) ? actions : []).filter(action => {
    const type = action?.type;
    if (type !== 'navigate' && type !== 'dataset_card' && type !== 'gene_card') return true;
    if (action.route) {
      if (!isKnownRoutePath(action.route)) return false;
      if (routeParamValues(action.route).some(id => !traceable(id))) return false;
    }
    return traceable(action.datasetId || action.traitId);
  });
}

// 确定性补强：在 Final/直答结果之后追加脑区整合导航链接（含空转）。
// 仅用 isKnownRoutePath 校验——链接由本地配置确定性构造，不需溯源，
// 因此不受上述「id 必须能溯源」规则影响，避免 study4.BA12 这类链接被静默丢弃。
// P1：模型 slots 是导航的主路径；关键词层降级为「模型没给 slots 时的兜底」。
// 关键词层仍然保留一点价值——它能给出 slots 表达不了的「整合研究页」链接，
// 所以两者都跑，同一条路径上让位给 slots（带筛选参数，信息更全）。
// 同一条路径只保留「筛选条件更全」的那张：参数多者胜出。
// 典型场景：模型 slots 只给了 species，而关键词层从原文里识别出了 sex —— 这时要能补上 sex。
const countRouteParams = route => String(route || '').split('?')[1]?.split('&').filter(Boolean).length || 0;

function mergeNavByPage(actions = []) {
  const countParams = countRouteParams;
  const out = [];
  for (const action of actions) {
    if (!action?.route) continue;
    const page = normalizeRoutePath(action.route);
    const index = out.findIndex(item => normalizeRoutePath(item.route) === page);
    if (index >= 0) {
      if (countParams(action.route) > countParams(out[index].route)) out[index] = action;
      continue;
    }
    out.push(action);
  }
  return out;
}

function parseQueryOf(route) {
  const query = {};
  const raw = String(route || '').split('?')[1] || '';
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    query[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
  }
  return query;
}

// 只有这些意图才允许把 slots 变成"浏览列表"链接。
// 取数类问题（analyze.* / explain.* / plot / compare）即使填了 species/sex，也不该塞一张浏览卡。
const NAV_INTENTS = new Set(['navigate', 'howto', 'search']);

function generatedNavigationActions({ plan, userMessage, locale, profile } = {}) {
  const intent = String(plan?.intent || '');
  const slots = slotsFromPlan(plan);

  // 文本侧闸门：只有数据助手才需要。使用助手（guide）的职责就是"数据问题指路"，
  // 给它加这道闸会破坏 G2 的设计；而数据助手对"表达/组成/差异"这类问题应直接取数，
  // 不该被模型误判出的 navigate 意图带出一张浏览卡。
  if (profile !== 'guide' && !looksLikeBrowsing(userMessage)) return [];

  const slotActions = (slots && NAV_INTENTS.has(intent))
    ? buildNavActionsFromSlots(slots, { isZh: isZh(locale) })
    : [];
  const keywordActions = detectStudyNavigation(userMessage);

  // 模型填槽会出错（实测把"母老鼠"填成 sex=male），而关键词层只认原文里明确出现的词
  // （母/雌/公/雄/female/male），两者在同一页面且物种/性别冲突时，以关键词层为准，
  // 这样链接和卡片标题也与模型自己写的回复文字（"小鼠 · 雌性"）保持一致。
  const conflicts = slotAction => keywordActions.some(keyword => {
    if (normalizeRoutePath(keyword.route) !== normalizeRoutePath(slotAction.route)) return false;
    const kwQuery = parseQueryOf(keyword.route);
    const slotQuery = parseQueryOf(slotAction.route);
    return ['species', 'sex'].some(key => kwQuery[key] && slotQuery[key] && kwQuery[key] !== slotQuery[key]);
  });

  // 关键词层不能无条件让位：它还负责补上模型漏掉的筛选维度。
  return mergeNavByPage([...slotActions.filter(action => !conflicts(action)), ...keywordActions]);
}

// 列表页只认这三个筛选参数：合并时也只动它们，避免把模型乱写的参数带进 URL
const LIST_QUERY_KEYS = ['species', 'sex', 'area'];

// 把 extra 的筛选并进 base（extra 优先）。
// 用途：模型自己给的导航卡常常漏筛选（例如只写 species、丢了 sex），
// 而确定性层是完整的；按字段取并集后，链接一定是最全的那份，不再靠"参数个数"赌输赢。
function mergeListQuery(base = '', extra = '') {
  const [path, qs = ''] = String(base).split('?');
  const params = new URLSearchParams(qs);
  const extraParams = new URLSearchParams(String(extra).split('?')[1] || '');
  LIST_QUERY_KEYS.forEach(key => {
    const value = extraParams.get(key);
    if (value) params.set(key, value);
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

function augmentNavigation(actions = [], { plan, userMessage, locale, profile } = {}) {
  // 同一条列表页只保留一张卡，但筛选条件按字段合并（确定性层优先）。
  const kept = (actions || []).slice();
  const added = [];
  for (const action of generatedNavigationActions({ plan, userMessage, locale, profile })) {
    if (!isKnownRoutePath(action.route)) continue;
    const page = normalizeRoutePath(action.route);
    const samePathIndex = kept.findIndex(x => normalizeRoutePath(x?.route) === page);
    if (samePathIndex >= 0) {
      kept[samePathIndex] = {
        ...kept[samePathIndex],
        route: mergeListQuery(kept[samePathIndex].route, action.route),
        // 标签也用确定性层的那份：它描述了完整筛选（例如「小鼠 · 雄性」）
        label: action.label || kept[samePathIndex].label,
      };
      continue;
    }
    if (!added.some(x => x.route === action.route)) added.push(action);
  }
  return [...kept, ...added];
}

// 给返回体附加「回答依据」：让用户能自己核对 AI 这句话是依据什么说的。
// 正文里出现、但在工具结果/页面上下文/领域词表都找不到的大写标识符，
// 会被标到 evidence.unverified 并追加 unverified_reference 警告。
// 后端偶尔会把工具调用痕迹写进正文（例如整行 "skill_result:build_navigation_action"），
// 统一在最外层清掉，避免用户看到内部字段名。
function sanitizeReplyText(text) {
  return String(text || '')
    .split('\n')
    .filter(line => !/^\s*(skill_result|tool_result|tool_calls?|function_call|function_result)\s*[:：]/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function attachEvidence(payload, { context, toolResults = [], userMessage = '' } = {}) {
  const reply = sanitizeReplyText(payload?.reply || '');
  const evidence = buildEvidence({
    context,
    toolResults,
    reply,
    userMessage,
  });
  // 模型/后端偶尔把工具调用痕迹塞进 warnings（如 "skill_result:build_navigation_action"），
  // 这不是给用户看的告警，和正文一样在出口处清掉。
  const NOISE_WARNING = /^\s*(skill_result|tool_result|tool_calls?|function_call|function_result)\s*[:：]/i;
  const warnings = (Array.isArray(payload?.warnings) ? payload.warnings : [])
    .filter(warning => !NOISE_WARNING.test(String(warning || '')));
  if (evidence.unverified.length && !warnings.includes('unverified_reference')) {
    warnings.push('unverified_reference');
  }
  return { ...payload, reply, evidence, warnings };
}

// Final 是否成功。
// 关键：后端成功时返回的是 { reply, actions, warnings }，**没有 ok 字段**；
// 旧代码要求 data.ok 为真才算成功，于是把有效回答判成失败并丢弃，
// 用户拿到的是兜底话术——表现为"答非所问/像没听懂"。
function finalCallSucceeded(call) {
  if (!call?.httpOk || call.parseError) return false;
  const data = call.data || {};
  if (data.ok === false) return false;
  if (data.ok === true) return true;
  return typeof data.reply === 'string' || Array.isArray(data.actions);
}

function collectResultActions(results = []) {
  const actions = [];
  results.forEach(result => {
    const list = result?.result?.actions;
    if (Array.isArray(list)) actions.push(...list);
  });
  return actions;
}

// 发给 Final 的工具结果只保留轻量元信息：绘图动作的坐标/布局数组体积巨大，
// Final 只需据此写一句说明，并不需要那些数据点。裁掉它们可显著降低 Final 调用超时/超限的概率。
function slimToolResultsForFinal(results = []) {
  return (results || []).map(result => {
    const actions = Array.isArray(result?.result?.actions) ? result.result.actions : [];
    // 绘图动作：整块 payload（坐标数组）发过去只会超限，剥掉；
    // 但不能留下一个空 payload —— 模型会把"空"读成"没有数据"，
    // 于是正文写"未检测到可用于绘图的 UMAP 数据"，而卡片其实已经生成。
    // 改成给一份可读摘要 + 明确的 plotReady 标记。
    const slimActions = actions.map(action => (
      action?.type === 'plot' || action?.type === 'plot_card'
        ? slimPlotActionForFinal(action)
        : action
    ));
    return { ...result, result: { ...(result.result || {}), actions: slimActions } };
  });
}

// Final 调用对失败做一次重试，吸收后端偶发抖动 / 超时，
// 避免「图都画好了、Final 却因一次抖动判失败而说无法回答」的左右脑互搏。
async function postJsonWithRetry(url, body, timeoutMs, retries = 1, signal) {
  let last = { httpOk: false, data: {} };
  for (let attempt = 0; attempt <= retries; attempt++) {
    last = await postJson(url, body, timeoutMs, signal);
    // 用户点了停止：不要再重试，否则"停止"只停了界面、还在继续烧配额
    if (last.error === 'aborted') return last;
    // 以前只看 httpOk：后端偶尔回 200 + 空体/非 JSON，这里会当成成功直接返回，
    // 结果 Final 被判失败、用户看到"生成失败"。空响应体同样值得重试一次。
    const emptyBody = last.parseError || !last.data || Object.keys(last.data).length === 0;
    if (last.httpOk && !emptyBody) return last;
  }
  return last;
}

// 对绘图动作去重：同一工具可能产出多张相同图（如重试 / 多轮合并），
// 按 类型 + plotType + 标题 + 副标题 判定为同一张，避免重复卡片。
function dedupePlotActions(actions = []) {
  const seen = new Set();
  const out = [];
  actions.forEach(action => {
    const key = `${action?.type}|${action?.plotType || ''}|${action?.title || ''}|${action?.subtitle || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(action);
    }
  });
  return out;
}

// 单元格取值统一转字符串，避免把对象/数组塞进表格卡。
function shortCell(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return shortCell(value.join('; '));
  if (typeof value === 'object') return shortCell(JSON.stringify(value));
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

const LIST_ROUTES = { SC: '/browse/SingleCell', ST: '/browse/SpatialTranscriptome', ATAC: '/browse/atac', GWAS: '/browse/gwas' };

// 表格卡：把工具返回的结构化行数据渲染成可排序、可下载的表。
// 只在分析类意图下生成，避免每个查询都弹出一张表。
// 跨数据集 / 跨分组的汇总天然是一张表，即使意图没被判成 analyze.* 也要出表格卡。
const FORCED_TABLE_SKILLS = new Set(['compare_gene_across_groups', 'summarize_gene_across_datasets']);
function tableCardFromResults(results = [], intent = '') {
  const forced = (results || []).some(result => FORCED_TABLE_SKILLS.has(result?.skill));
  if (!forced && !String(intent || '').startsWith('analyze.')) return null;
  for (const result of results) {
    const items = result?.result?.items;
    if (!Array.isArray(items) || !items.length) continue;
    const first = items[0];
    if (!first || typeof first !== 'object') continue;
    const columns = Object.keys(first).slice(0, 8);
    if (!columns.length) continue;
    const rows = items.slice(0, 20).map(item => {
      const row = {};
      columns.forEach(column => { row[column] = shortCell(item?.[column]); });
      return row;
    });
    return {
      type: 'table_card',
      label: result?.skill ? `${result.skill} 结果` : '查询结果',
      columns,
      rows,
      rowCount: items.length,
      source: String(result?.skill || ''),
    };
  }
  return null;
}

// 筛选建议卡：从检索结果里抽出可继续筛选的维度，渲染成可点击 chip。
// 列表页已支持 URL 筛选参数（species / sex / area），因此 chip 带上 params，
// 点一下就能落到「已勾好条件」的列表页，而不是让用户再手动选一遍。
const SPECIES_TEXT = { mouse: '小鼠', human: '人' };
const SEX_TEXT = { male: '雄性', female: '雌性' };
function filterCardFromResults(results = [], intent = '') {
  if (!['search', 'navigate'].includes(String(intent || ''))) return null;
  for (const result of results) {
    const items = result?.result?.items;
    if (!Array.isArray(items) || !items.length) continue;
    const omics = String(items[0]?.omicsType || '').toUpperCase();
    const route = LIST_ROUTES[omics];
    if (!route) continue;
    const chips = [];
    const push = (kind, text, key, value) => {
      const label = String(text ?? '').trim();
      if (!label || label === '-' || !value) return;
      if (chips.some(item => item.label === `${kind}: ${label}`)) return;
      chips.push({ label: `${kind}: ${label}`, route, params: { [key]: value } });
    };
    items.slice(0, 10).forEach(item => {
      const species = String(item.species || '').toLowerCase();
      if (SPECIES_TEXT[species]) push('物种', SPECIES_TEXT[species], 'species', species);
      const sex = String(item.sex || '').toLowerCase();
      if (SEX_TEXT[sex]) push('性别', SEX_TEXT[sex], 'sex', sex);
      const area = String(item.brainRegion || item.tissue || '').trim();
      if (area && area !== '-') push('脑区', area, 'area', area);
    });
    if (!chips.length) continue;
    return {
      type: 'filter_card',
      label: '可继续筛选',
      chips: chips.slice(0, 8),
      note: '点击后跳转到列表页，并自动勾选对应条件。',
    };
  }
  return null;
}

// 数据解释卡：「当前页数据怎么看」场景，带上实体、选择与页面能力。
function dataGuideCardFromContext(context = {}, intent = '') {
  if (!['explain.data', 'summarize', 'explain'].includes(String(intent || ''))) return null;
  const entity = context?.entity || {};
  const selection = context?.selection || {};
  if (!Object.keys(entity).length && !Object.keys(selection).length) return null;
  return {
    type: 'data_guide_card',
    label: '当前页数据导读',
    pageType: String(context?.pageType || ''),
    // 用户当前所在模块 + 本页模块清单：让导读按模块分层，而不是把整页状态平铺成一串。
    activeModule: String(context?.activeModule || context?.selection?.activeModule || ''),
    modules: Array.isArray(context?.modules) ? context.modules : [],
    entity,
    selection,
    visibleDataCount: Array.isArray(context?.visibleData) ? context.visibleData.length : 0,
    capabilities: Array.isArray(context?.capabilities) ? context.capabilities : [],
    // 页面自描述（P4）：本页可筛选的维度与表格列，按页面真实上报的内容展示
    filters: (Array.isArray(context?.pageSchema?.filters) ? context.pageSchema.filters : [])
      .map(item => String(item?.labels?.[0] || item?.key || '').trim())
      .filter(Boolean),
    columns: (Array.isArray(context?.pageSchema?.columns) ? context.pageSchema.columns : [])
      .map(item => String(item?.labels?.[0] || item?.key || '').trim())
      .filter(Boolean),
  };
}

// 术语 → 表格列（P4）：用户问某个字段时，除了给含义，还能「在表格中定位」。
// 只在页面自描述里确实有这一列时才生成，避免出现点了没反应的按钮。
function focusColumnActions(context = {}, knowledgeCards = []) {
  const columns = Array.isArray(context?.pageSchema?.columns) ? context.pageSchema.columns : [];
  if (!columns.length) return [];
  const norm = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const indexed = columns.map(col => ({
    col,
    names: [col.key, ...(Array.isArray(col.labels) ? col.labels : [])].map(norm).filter(Boolean),
  }));
  const out = [];
  (knowledgeCards || []).forEach(card => {
    // 字段解释可能来自领域知识（knowledge_card）或术语表（glossary_card），两边都要认
    if (card?.type !== 'knowledge_card' && card?.type !== 'glossary_card') return;
    const raw = card.key || card.term;
    const term = norm(raw);
    if (!term) return;
    const hit = indexed.find(item => item.names.includes(term));
    if (!hit) return;
    if (out.some(item => item.column === hit.col.key)) return;
    out.push({
      type: 'focus_column',
      column: hit.col.key,
      label: String(hit.col.labels?.[0] || hit.col.key),
      term: String(raw),
    });
  });
  return out;
}

// 本地组装的动作卡片：知识卡 + 列定位 + 数据导读卡 + 表格卡 + 筛选建议卡。
// 后端 sanitize_actions 只放行既有动作类型，这些新类型一律走前端合并。
function buildLocalCards({ intent = '', context = {}, results = [] } = {}) {
  const cards = [];
  const knowledgeCards = knowledgeActionsFromResults(results);
  cards.push(...knowledgeCards);
  // 术语卡本身由 Final 阶段合并，这里只借用它做「列定位」匹配，避免重复渲染卡片
  const glossaryCards = glossaryActionsFromResults(results);
  cards.push(...focusColumnActions(context, [...knowledgeCards, ...glossaryCards]));
  const guide = dataGuideCardFromContext(context, intent);
  if (guide) cards.push(guide);
  const table = tableCardFromResults(results, intent);
  if (table) cards.push(table);
  const filter = filterCardFromResults(results, intent);
  if (filter) cards.push(filter);
  return cards;
}

function compactHistory(history = []) {
  return history
    .slice(-AGENT_LIMITS.historyMessages)
    .filter(message => message && (message.role === 'user' || message.role === 'assistant'))
    .map(message => ({
      role: message.role,
      content: String(message.content || '').slice(0, AGENT_LIMITS.messageMaxLength),
    }));
}

// 汇总工具结果里的术语命中（只有 explain_terminology 返回 matches）。
function collectGlossaryMatches(results = []) {
  const out = [];
  (results || []).forEach(result => {
    const list = result?.result?.matches;
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      if (item?.term) out.push(item);
    });
  });
  return out;
}

// 术语命中时用它直接生成正文，保证与卡片一致、且不带任何外部链接。
function glossaryReplyText(matches = [], locale = 'zh') {
  const zh = isZh(locale);
  return (matches || []).map(item => {
    const parts = [];
    if (item.chineseName) parts.push(item.chineseName);
    if (item.fullName && item.fullName !== item.chineseName) parts.push(item.fullName);
    const bracket = zh ? ['（', '）'] : [' (', ')'];
    const head = parts.length ? `${item.term}${bracket[0]}${parts.join(zh ? '，' : ', ')}${bracket[1]}` : String(item.term);
    const body = item.explanation || '';
    const source = item.source ? (zh ? `出处：${item.source}` : `Source: ${item.source}`) : '';
    return `${head}：${body}${source ? ` ${source}` : ''}`;
  }).join('\n');
}

function selfCheckFailedText(locale) {
  const text = AGENT_TEXTS?.selfCheckFailed || {};
  return isZh(locale)
    ? (text.zh || '我暂时无法判断该用哪种方式处理这个问题，因此没有执行任何查询。')
    : (text.en || 'I could not decide how to handle this request, so no query was executed.');
}

// 结构化意图自检：返回 { pass, reason }。
// 触发重试的四类情况：smaltalk 置信度不足、analyze.*/explain 无工具、
// intentReasoning 缺失/过短/含糊、intent 与 toolCalls 明显不匹配。
function selfCheckPlan(plan, allowedNames) {
  if (!plan || typeof plan !== 'object') return { pass: false, reason: 'plan_not_object' };
  const cfg = AGENT_PLAN_SELFCHECK || {};
  const intent = String(plan.intent ?? '').trim();
  const confidence = String(plan.intentConfidence ?? '').trim().toLowerCase();
  const reasoning = String(plan.intentReasoning ?? '').trim();
  const rawCalls = Array.isArray(plan.toolCalls) ? plan.toolCalls : [];
  const toolCalls = rawCalls.filter(call => call && allowedNames.has(call.name));

  if (!AGENT_INTENTS.includes(intent)) return { pass: false, reason: `unknown_intent:${intent || 'empty'}` };
  // 模型点了不存在的工具：以前会被过滤成"没有工具"，最终只报 no_tools_and_no_reply，
  // 重试时模型看不到"你编了个工具名"，于是原样再犯一次。这里单独报出来。
  if (allowedNames.size > 0 && rawCalls.length && !toolCalls.length) {
    return { pass: false, reason: `tools_not_in_catalog:${rawCalls.map(call => call?.name || '?').join(',')}` };
  }
  if (intent === 'smalltalk' && confidence !== 'high') {
    return { pass: false, reason: `smalltalk_confidence_not_high:${confidence || 'missing'}` };
  }
  if (!reasoning) return { pass: false, reason: 'intent_reasoning_empty' };
  if (reasoning.length < (cfg.minReasoningLength ?? 8)) return { pass: false, reason: 'intent_reasoning_too_short' };
  if ((cfg.vagueReasoningPatterns || []).some(pattern => pattern instanceof RegExp && pattern.test(reasoning))) {
    return { pass: false, reason: 'intent_reasoning_vague' };
  }

  // 需要澄清时（needsClarification=true），本轮不调用任何工具是合理行为：
  // 澄清问题本身就是本轮输出（下游在 Plan 通过后、执行工具前短路成回复）。
  // 因此跳过「必须带工具 / 意图↔工具不匹配 / 无工具也无回复」三项检查，
  // 但上面的意图合法性与意图理由校验仍已执行。
  if (plan.needsClarification === true) return { pass: true, reason: '' };

  // 必须带工具的意图：分析类 / 解释类（前缀）+ 绘图检索类（完整名）。
  // 解释类与绘图类若不带工具，说明模型想凭空作答，必须重试；
  // 兜底时仍可用 plan.reply，因此「我现在这个页面是什么呀」不会被卡死。
  const analyzeOnly = (AGENT_PLAN_SELFCHECK || {}).requireToolsOnlyForAnalyze !== false;
  const prefixes = (AGENT_PLAN_SELFCHECK || {}).toolRequiredPrefixes || ['analyze.'];
  const namedIntents = (AGENT_PLAN_SELFCHECK || {}).toolRequiredIntents || [];
  const replyText = String(plan.reply ?? '').trim();
  const needsTools = analyzeOnly
    ? intent.startsWith('analyze.')
    : (prefixes.some(prefix => intent.startsWith(prefix)) || namedIntents.includes(intent));
  if (needsTools && !toolCalls.length) return { pass: false, reason: 'intent_requires_tools_but_none' };

  // intent 与 toolCalls 明显不匹配：绘图意图却没有绘图工具。
  if (intent === 'plot' && toolCalls.length && !toolCalls.some(call => /plot/i.test(call.name))) {
    return { pass: false, reason: 'plot_intent_without_plot_tool' };
  }

  if (!toolCalls.length && !replyText) return { pass: false, reason: 'no_tools_and_no_reply' };
  if ((AGENT_NO_TOOL_INTENTS || []).includes(intent) && toolCalls.length > 0) {
    return { pass: false, reason: 'non_data_intent_with_tools' };
  }
  return { pass: true, reason: '' };
}

async function requestPlan(messages, signal) {
  return postJson(
    AGENT_ENDPOINTS.llm,
    {
      messages,
      temperature: AGENT_LIMITS.planTemperature,
      maxTokens: AGENT_LIMITS.planMaxTokens,
      jsonMode: true,
    },
    AGENT_LIMITS.requestTimeoutMs,
    signal
  ).catch(() => ({ httpOk: false, data: {} }));
}

// Plan → 自检 → 定向重试（最多一次，可一键关闭）。
// 重试时把上一次的输出与失败原因原样拼回提示词，要求模型重新判断。
async function planWithSelfCheck({ baseMessages, allowedNames, userMessage, signal }) {
  const cfg = AGENT_PLAN_SELFCHECK || {};
  const maxAttempts = cfg.enabled === false ? 1 : (Number(cfg.maxRetries) || 0) + 1;
  const log = { userMessage, attempts: [], finalStatus: '' };
  let messages = baseMessages;
  let previous = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const call = await requestPlan(messages, signal);
    // 用户主动停止：直接结束，不重试、不当作模型故障
    if (call.error === 'aborted') {
      log.finalStatus = 'aborted';
      return { status: 'aborted', plan: null };
    }
    if (!call.httpOk || !call.data?.ok) {
      // data.error / data.message 是后端自己给的失败原因（模型不可用、配额、超时…），
      // 比笼统的 "ok:false" 有用得多，一并记进诊断日志。
      const serverMessage = String(call.data?.error || call.data?.message || '').slice(0, 80);
      // 上游 429（模型服务商限流）被后端包成 HTTP 200 + ok:false，
      // 只能从 error 字段识别；这类失败必须区别对待，否则会被当成"模型不会答"。
      const rateLimited = /429|rate.?limit|quota|too many/i.test(`${serverMessage} ${call.error || ''} ${call.status}`);
      log.attempts.push({ attempt, stage: 'call', httpStatus: call.status, error: call.error || '', serverMessage, rateLimited });
      // 调用层失败（超时 / 限流 / 断连）是瞬时的，值得重试；
      // 以前这里直接 return，等于把"可自愈的抖动"直接判死刑。
      if (attempt + 1 < maxAttempts) {
        await sleep(rateLimited ? 1200 * (attempt + 1) : 400);
        continue;
      }
      log.finalStatus = rateLimited ? 'plan_rate_limited' : 'plan_call_failed';
      console.warn('[agent] plan failed', log);
      return {
        status: rateLimited ? 'plan_rate_limited' : 'plan_call_failed',
        plan: null,
        detail: {
          httpStatus: call.status || 0,
          error: call.error || '',
          serverMessage,
        },
      };
    }
    const plan = extractJson(call.data?.content);
    if (!plan) {
      log.finalStatus = 'plan_json_invalid';
      console.warn('[agent] plan failed', log);
      return { status: 'plan_json_invalid', plan: null };
    }

    const check = selfCheckPlan(plan, allowedNames);
    log.attempts.push({
      attempt,
      intent: plan.intent ?? null,
      confidence: plan.intentConfidence ?? null,
      reasoning: plan.intentReasoning ?? null,
      toolCalls: (plan.toolCalls || []).map(item => item?.name),
      pass: check.pass,
      reason: check.reason,
    });

    if (check.pass) {
      log.finalStatus = 'ok';
      // 触发过重试才落日志：原始输入 / 第一次意图与理由 / 失败原因 / 第二次结果。
      if (cfg.logSelfCheck !== false && log.attempts.some(item => !item.pass)) {
        console.warn('[agent] plan self-check: recovered after retry', log);
      }
      return { status: 'ok', plan };
    }

    previous = plan;
    if (attempt + 1 >= maxAttempts) break;
    messages = [
      ...baseMessages,
      { role: 'assistant', content: JSON.stringify(plan) },
      { role: 'user', content: buildPlanRepairMessage({ previous: plan, reason: check.reason }) },
    ];
  }

  log.finalStatus = 'self_check_failed';
  if (cfg.logSelfCheck !== false) console.warn('[agent] plan self-check failed', log);
  return { status: 'self_check_failed', plan: previous };
}

export async function runAgentTurn({ locale = 'zh', context = {}, history = [], userMessage = '', conversationSummary = '', profile = 'data', onStage, signal } = {}) {
  const warnings = [];
  const trimmedHistory = compactHistory(history);
  // 真实阶段回调：UI 据此显示「正在判断意图 / 正在查询数据 / 正在组织回答」，
  // 而不是一个转圈动画等到底（P3 的"体感"改动，不需要后端支持流式）。
  const notify = stage => {
    try { onStage?.(stage); } catch (e) { /* 回调异常不影响主流程 */ }
  };

  // ── 诊断记录（P6）──
  // 只记结构化摘要（意图/工具/分段耗时/警告码），不记用户原话。
  // 用可变对象承载：finalize 定义在 plan 之前，直接引用 plan 会踩 TDZ。
  const turnStart = Date.now();
  const turn = {
    profile,
    locale,
    intent: '',
    planStatus: '',
    finalStatus: '',
    tools: [],
    planMs: 0,
    toolMs: 0,
    finalMs: 0,
    questionChars: String(userMessage || '').length,
  };

  // ── 统一出口（P5：收敛冗余）──
  // 这个函数原来有 10 个 return，每个都自带一套「导航落地核对 + 说明合并 + evidence 附加」。
  // 结果是补防线时"补了 4 处、漏了 1 处"（sex=female 空列表就是漏了 Final 失败分支，
  // 术语短路分支同样漏过）。现在所有出口都走这里，新增任何防线只改一处。
  const finalize = async ({ reply = '', actions = [], extraWarnings = [], toolResults = null } = {}) => {
    // 去重：同一条术语/知识/导读卡可能同时来自工具结果和模型回显，重复渲染会让用户以为"答了两遍"。
    // 绘图卡不在这里去重（同标题不同基因/参数是合法的，交给 dedupePlotActions 按 payload 判断）。
    const seen = new Set();
    const deduped = (actions || []).filter(action => {
      if (!action) return false;
      if (action.type === 'plot' || action.type === 'plot_card') return true;
      const key = [
        action.type,
        action.route || '',
        action.label || action.title || '',
        action.key || action.term || action.column || '',
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const grounded = await groundFilteredNavigation(deduped, locale);

    // 术语事实校验（P6）：问的是词表里确实有的术语、本轮却没有任何词表命中时，
    // 模型会拿教科书知识补齐——实测把 Pct.1 解释成"该细胞类型占总细胞数的比例"（错）。
    // 词表是本站维护的事实源且带来源，这种情况用词表覆盖正文，其余卡片照留。
    const glossaryOverride = (() => {
      if (!String(turn.intent || '').startsWith('explain')) return null;
      // 用户在问术语本身（"X 是什么意思"）才覆盖；"解释这个页面"不算
      if (!TERM_QUESTION_CUES.test(userMessage)) return null;
      const hasHit = (Array.isArray(toolResults) ? toolResults : []).some(item => (
        item?.skill === 'explain_terminology'
        && Array.isArray(item?.result?.matches)
        && item.result.matches.length > 0
      ));
      if (hasHit) return null;
      const matches = localGlossaryMatches(userMessage);
      return matches.length ? glossaryAnswerFromMatches(matches, context, locale) : null;
    })();
    // 「没查到」类告警：同一轮已经有卡片/术语答出来时属于噪声
    // （模型常同时调 explain_domain_knowledge 和 explain_terminology，一个命中一个不命中）。
    // 只有整轮什么都没查到时才需要告诉用户。
    const SOFT_MISS_WARNINGS = new Set(['knowledge_no_match', 'glossary_no_match']);
    const allWarnings = [...new Set([...warnings, ...extraWarnings])]
      .filter(warning => !(SOFT_MISS_WARNINGS.has(warning) && grounded.actions.length > 0))
      // 后端内部重试过、最终成功时仍会把中间失败写进 warnings；
      // 既然这轮已经拿到回答，就不该再向用户展示"最终回答生成失败"。
      .filter(warning => !(warning === 'final_call_failed' && turn.finalStatus === 'ok'));
    if (glossaryOverride) {
      // 这段正文已经被词表替换，针对"模型原来那段话"的核验告警就不该再展示，
      // 否则用户看到"已移除缺乏依据的引用"却找不到任何引用。
      const DISCARDED_REPLY_WARNINGS = new Set([
        'unverified_reference',
        'unsupported_reference_removed',
        'reply_downgraded_to_verified_scope',
      ]);
      for (let i = allWarnings.length - 1; i >= 0; i -= 1) {
        if (DISCARDED_REPLY_WARNINGS.has(allWarnings[i])) allWarnings.splice(i, 1);
      }
      allWarnings.push('reply_replaced_by_glossary');
    }

    let finalReply = glossaryOverride ? glossaryOverride.reply : reply;
    let finalActions = glossaryOverride
      ? [...glossaryOverride.actions, ...grounded.actions].filter((action, index, list) => (
        list.findIndex(other => other.type === action.type
          && (other.route || '') === (action.route || '')
          && (other.label || '') === (action.label || '')) === index
      ))
      : grounded.actions;

    // 概念题没有任何卡片时，补上两个入口：
    // 模型经常把回答停在"如果你想查看具体的数据，可以："就没了，
    // 用户既没有链接也不知道能点哪里。入口由本地知识生成，不依赖模型。
    if (!finalActions.length) {
      const concept = buildConceptAnswer({ text: userMessage, locale });
      if (concept?.actions?.length) finalActions = concept.actions;
    }

    // 卡片预算：后端按检索结果逐条生成 dataset_card，泛问题会一次弹出五六张样本卡，
    // 看起来像"炸了一屏"，信息密度却不如一个能筛选的列表页。
    finalActions = budgetActions(finalActions, { locale });

    // "编造数据缺失"守卫：模型说"没有注释/没有差异基因/没有表达/没有峰"时，
    // 自己按技能规格查一次；查到就删掉否认句、补真实结论。
    const missingFix = await repairMissingDataClaims({
      reply: finalReply, userMessage, context, toolResults, locale,
    });
    if (missingFix) {
      finalReply = missingFix.reply;
      allWarnings.push('missing_data_recomputed');
    }

    // 图已生成、正文却否认这笔数据（实测："未在已选样本中检测到可用于绘图的 UMAP 数据"，
    // 而同一条消息的卡片点开是 43 条真实 trace）。
    // 原因在 Final 只拿到精简后的工具结果，把"payload 被剥掉"读成了"没有数据"。
    const plotActions = pickPlotActions(finalActions);
    if (plotActions.length && replyContradictsPlot(finalReply)) {
      finalReply = plotReadyReply(plotActions, locale);
      // 不往 user-facing warnings 里塞：用户看到"文案已校正"只会更疑惑，
      // 图在、话说清了就够了。留痕给诊断日志/控制台。
      turn.replyGuarded = 'plot';
      console.warn('[agent] reply contradicted an existing plot; replaced with deterministic wording');
    }

    // 页面事实校对：模型会把表格列当成筛选项（"支持按物种、脑区、条件、性别过滤"），
    // 而列表页只有物种/脑区/性别。凡是不在本页 filters 里的维度，从这句话里删掉。
    finalReply = pruneFilterClaims(finalReply, context);
    finalReply = stripInternalRefs(finalReply);

    // 截断兜底：超长回答被截断时常停在"…可以："这种半句上。
    // 与其让用户对着一句没说完的话，不如明确告诉他发生了什么、下一步怎么问。
    const trimmedReply = String(finalReply || '').trim();
    if (/[：:，,、]$/.test(trimmedReply) || /(可以|如下|例如|比如|包括)$/.test(trimmedReply)) {
      const tailNote = isZh(locale)
        ? '（回答较长，到这里被截断了。可以让我只讲其中一部分，或直接说想看哪类数据。）'
        : '(The answer was cut off here. Ask me to focus on one part, or name the data you want.)';
      finalReply = `${trimmedReply}\n\n${tailNote}`;
      // 只在诊断里标一下，不再额外弹一条告警框：正文里已经说清楚了，
      // 同一件事用两种样式重复出现反而更像出了大事。
      turn.outcome = turn.outcome || 'truncated';
    }

    // 记录这一轮：出问题时能一眼看出卡在哪一环（Plan 不合法 / 工具没数据 / 只是慢）
    recordTurn({
      ...turn,
      outcome: turn.outcome
        || (allWarnings.includes('final_call_failed') ? 'final_failed'
          : allWarnings.some(warning => String(warning).startsWith('plan_')) ? 'plan_failed'
            : 'ok'),
      warnings: allWarnings,
      totalMs: Date.now() - turnStart,
      actionCount: finalActions.length,
    });

    return attachEvidence({
      reply: mergeReplyWithNote(finalReply, { ...grounded, actions: finalActions }, locale),
      actions: finalActions,
      warnings: allWarnings,
    }, { context, toolResults, userMessage });
  };

  // ── 停止检查点（P5）──
  // 用户点「停止」后，不再继续发起 Plan/Final 调用：界面上的停止必须真的停，
  // 否则只是在骗眼睛，配额照花、日志还会多出一条"Plan 失败"的假故障。
  const stopIfAborted = async () => {
    if (!signal?.aborted) return null;
    turn.outcome = 'aborted';
    const payload = await finalize({ reply: '', extraWarnings: ['turn_aborted'] });
    return { ...payload, stopped: true };
  };

  let catalog = [];
  try {
    // profile 决定「这一份 AI 能看到哪些工具/意图」，引擎逻辑完全共用。
    catalog = await buildToolCatalog(locale, profile);
  } catch (e) {
    warnings.push('tool_catalog_unavailable');
  }
  const allowedNames = new Set(
    catalog.filter(tool => tool.capability !== 'unavailable').map(tool => tool.name)
  );

  // ── 1. Plan（结构化意图判断 + 自检 + 定向重试）──
  const planBaseMessages = [
    { role: 'system', content: buildPlanSystemPrompt(locale, profile) },
    // 历史在前、当前请求在后：模型看到的最后一条必须是本轮问题，
    // 否则会去回答上一轮（表现为"回复隔着一条消息"）。
    ...trimmedHistory,
    {
      role: 'user',
      content: JSON.stringify({
        messageType: 'agent_plan_input',
        userMessage,
        conversationSummary,
        pageContext: context,
        toolCatalog: buildToolCatalogText(catalog),
        rules: [
          'Respond to the userMessage of THIS message only; the preceding messages are history.',
          'Fill intent, intentConfidence and intentReasoning before toolCalls.',
          'Tool names must come from toolCatalog.',
          'Do not invent database values.',
        ],
      }),
    },
  ];

  const stoppedBeforePlan = await stopIfAborted();
  if (stoppedBeforePlan) return stoppedBeforePlan;

  notify('planning');
  const planStart = Date.now();
  const planOutcome = await planWithSelfCheck({
    baseMessages: planBaseMessages,
    allowedNames,
    userMessage,
    signal,
  });
  turn.planStatus = String(planOutcome.status || '');
  turn.planMs = Date.now() - planStart;

  // Plan 期间被停止：不要再走「Plan 失败」那套兜底（那会推一条"没处理明白"给用户）
  if (planOutcome.status === 'aborted') {
    const stoppedAfterPlan = await stopIfAborted();
    if (stoppedAfterPlan) return stoppedAfterPlan;
  }
  turn.intent = String(planOutcome.plan?.intent || '');
  // 失败细节：区分"被拒（429/5xx）"和"超时"，否则两类失败在日志里长得一样
  turn.planDetail = planOutcome.detail
    ? [
      planOutcome.detail.httpStatus || '',
      planOutcome.detail.error || '',
      planOutcome.detail.serverMessage || '',
    ].filter(Boolean).join(':')
    : '';

  if (planOutcome.status !== 'ok') {
    // 模型这次连规划都没给出来（限流 / 调用失败 / JSON 不合法）：
    // 概念与术语的答案本来就在本地，没理由让用户等模型——限流时也能答。
    if (['plan_rate_limited', 'plan_call_failed', 'plan_json_invalid'].includes(planOutcome.status)) {
      const offline = localOfflineAnswer({ userMessage, context, locale });
      if (offline) return finalize({ reply: offline.reply, actions: offline.actions });
    }

    // 限流不是"不会答"：这是外部服务忙，如实说明 + 给出还能用的入口，
    // 比甩一句"没处理明白"有用得多（也更诚实地指向了真正的原因）。
    if (planOutcome.status === 'plan_rate_limited') {
      const navActions = augmentNavigation([], { plan: null, userMessage, locale, profile });
      const note = isZh(locale)
        ? '模型服务当前在限流（请求太多），等几秒再问一次就行。'
        : 'The model service is rate-limiting requests right now — please retry in a few seconds.';
      return finalize({
        reply: navActions.length
          ? `${note}\n\n${isZh(locale) ? '下面这些入口可以直接打开：' : 'You can open these directly:'}`
          : note,
        actions: navActions,
      });
    }

    // 自检两次都没通过：走保守话术，不调用任何工具。
    if (planOutcome.status === 'self_check_failed') {
      // 优先用 Plan 自己的 reply 兜底（非 analyze.* 时），
      // 避免「我现在这个页面是什么呀」这类问题被一律挡回「无法判断」。
      const cfg = AGENT_PLAN_SELFCHECK || {};
      const draft = String(planOutcome.plan?.reply || '').trim();
      const intent = String(planOutcome.plan?.intent || '');
      if (cfg.allowReplyFallback !== false && draft && !intent.startsWith('analyze.')) {
        // 拿到的是可用文案：自检没过属于内部实现细节，不该摊到用户眼前
        // （否则一条正常回答下面挂着一句"意图判断未通过自检"，读起来仍像报错）。
        // 诊断信息已由 turn.planStatus='self_check_failed' 记录，排查不受影响。
        return finalize({ reply: draft });
      }
      // 模型既没过自检、也没写文案：概念/术语类问题仍可本地作答。
      // 之前这条分支直接回「没判断出该走哪种处理」，正是「单细胞和空转有什么区别」翻车的地方。
      const offline = localOfflineAnswer({ userMessage, context, locale });
      if (offline) return finalize({ reply: offline.reply, actions: offline.actions });
      warnings.push('plan_self_check_failed');
      return finalize({ reply: selfCheckFailedText(locale) });
    }
    warnings.push(planOutcome.status);
    // Plan 整体失败时，若这条消息能被确定性识别成浏览请求，仍然给出链接而不是一句"答不上来"。
    const navActions = augmentNavigation([], { plan: null, userMessage, locale, profile });
    if (navActions.length) {
      // 库里没有该性别/脑区的样本时，finalize 会核对并降级说明
      return finalize({ reply: recoveredReplyText(navActions, locale), actions: navActions });
    }

    // 其次试本地术语表：像「Pct.1 是什么意思」这种纯查表问题，
    // 不该因为模型这次输出不合法就回一句"没处理明白"。
    const localAnswer = localOfflineAnswer({ userMessage, context, locale });
    if (localAnswer) {
      return finalize({ reply: localAnswer.reply, actions: localAnswer.actions });
    }

    return finalize({ reply: fallbackText(locale) });
  }

  const plan = planOutcome.plan;
  if (Array.isArray(plan.warnings)) warnings.push(...plan.warnings);

  if (plan.needsClarification && plan.clarifyingQuestion) {
    // 澄清优先（P4）：把模型给的选项做成一排按钮，点一下就继续，
    // 用户不用把问题重新描述一遍。选项必须短，过长的一律丢弃（那是句子不是选项）。
    const fromModel = pruneClarifyOptions((Array.isArray(plan.clarifyOptions) ? plan.clarifyOptions : [])
      .map(item => String(item || '').trim())
      .filter(item => item && item.length <= 24), context)
      .slice(0, 3);
    const options = fromModel.length ? fromModel : clarifyOptionsFor({ plan, context, locale, userMessage, profile });
    turn.outcome = 'clarify';
    return finalize({
      reply: String(plan.clarifyingQuestion),
      actions: options.length
        ? [{ type: 'clarify_card', label: isZh(locale) ? '选一个继续' : 'Pick one to continue', options }]
        : [],
    });
  }

  const calls = (Array.isArray(plan.toolCalls) ? plan.toolCalls : [])
    .filter(call => call && allowedNames.has(call.name))
    .slice(0, AGENT_LIMITS.maxToolsPerRound);

  // 不需要数据时直接返回 Plan 的文案，省掉一次 Final 调用。
  if (!calls.length) {
    // 注意：这条分支原先不带任何导航卡，导致「模型只写了一句文字」时用户拿不到链接。
    // 这里补上由 slots / 关键词层生成的链接，保证"问怎么看"总能点到入口。
    const localOnly = buildLocalCards({ intent: String(plan.intent || ''), context, results: [] });
    const planReply = String(plan.reply || '').trim();
    // 模型既没给工具也没给文案（退化输出）：纯查表问题先从本地术语表答，
    // 避免用户问「Pct.1 是什么」却收到一句"没处理明白"。
    const localAnswer = planReply ? null : localOfflineAnswer({ userMessage, context, locale });
    const navActions = augmentNavigation(localOnly, { plan, userMessage, locale, profile });
    // 用户说要画图、但这一轮没有产出任何图时，补上可点选项（追问写在 reply 里也能兜住）
    const clarify = clarifyOptionsFor({ plan, context, locale, userMessage, profile });
    const baseReply = planReply || localAnswer?.reply || fallbackText(locale);
    // finalize 会做「筛选能否落地」的核对与说明合并
    return finalize({
      reply: baseReply,
      actions: [
        ...(localAnswer?.actions || []),
        ...(clarify.length
          ? [{ type: 'clarify_card', label: isZh(locale) ? '选一个继续' : 'Pick one to continue', options: clarify }]
          : []),
        ...navActions,
      ],
    });
  }

  // ── 2. 执行工具 ──
  const stoppedBeforeTools = await stopIfAborted();
  if (stoppedBeforeTools) return stoppedBeforeTools;

  notify('tools');
  const toolStart = Date.now();
  const toolResults = await Promise.all(
    calls.map(call => runTool(call.name, call.params || {}, { locale, context, signal }).catch(() => ({
      ok: false,
      skill: call.name,
      result: null,
      warnings: ['tool_exception'],
      truncated: false,
    })))
  );
  // 工具/后端偶尔把调用痕迹塞进 warnings（如 "skill_result:build_navigation_action"）：
  // 这不是告警，在入口就过滤掉，避免它一路流进 UI 和诊断日志。
  const NOISE_WARNING = /^\s*(skill_result|tool_result|tool_calls?|function_call|function_result)\s*[:：]/i;
  toolResults.forEach(result => {
    (result?.warnings || []).forEach(warning => {
      if (!NOISE_WARNING.test(String(warning || ''))) warnings.push(warning);
    });
  });
  turn.toolMs = Date.now() - toolStart;
  turn.tools = calls.map(call => String(call?.name || '')).filter(Boolean);

  // 本地组装的卡片（知识卡 / 导读卡 / 表格卡 / 筛选建议卡）：
  // 后端 sanitize_actions 不放行新动作类型，因此这些卡片不经过后端。
  const localCards = buildLocalCards({ intent: String(plan.intent || ''), context, results: toolResults });

  // 术语命中：直接用本地文案作答，跳过 Final。
  // 这样正文不会与卡片矛盾，也不会出现模型无视工具结果、自行编造「暂不支持」或外部链接的情况。
  // 例外：命中领域知识（字段/阈值）时不短路——这类问题需要模型把阈值套到用户给的具体数值上
  // （如「padj 0.03 算显著吗」），交给 Final 才能给出针对性回答，阈值卡则由 localCards 兜底。
  const hasKnowledgeCard = localCards.some(card => card?.type === 'knowledge_card');
  if (AGENT_GLOSSARY_DIRECT_REPLY && !hasKnowledgeCard) {
    const glossaryMatches = collectGlossaryMatches(toolResults);
    if (glossaryMatches.length) {
      // 确定性补空转/单细胞整合链接：术语卡默认只指向单细胞 study3，
      // 当用户明确要空转（或小鼠分层）时，这里直接注入正确的 study 页 + 列表页链接，
      // 不依赖 LLM，避免「空转链接缺失 / 拼成死链」的问题。
      const studyActions = generatedNavigationActions({ plan, userMessage, locale, profile });
      // 这条分支也会产出研究页/列表页链接，同样要过"筛选能否落地"的核对
      return finalize({
        reply: glossaryReplyText(glossaryMatches, locale),
        actions: [...glossaryActionsFromResults(toolResults), ...studyActions, ...localCards],
        toolResults,
      });
    }
  }

  // ── 3. Final（后端在此执行后置校验）──
  // 工具跑完（可能几十秒）用户已停止：不要再花一次 Final 调用去组织一段没人看的回答
  const stoppedBeforeFinal = await stopIfAborted();
  if (stoppedBeforeFinal) return stoppedBeforeFinal;

  notify('answering');
  const finalStart = Date.now();
  const finalMessages = [
    { role: 'system', content: buildFinalSystemPrompt(locale) },
    // 同样保证当前请求是最后一条，避免回答上一轮的问题。
    ...trimmedHistory,
    {
      role: 'user',
      content: JSON.stringify({
        messageType: 'final_answer_input',
        userMessage,
        conversationSummary,
        pageContext: context,
      }),
    },
  ];

  const finalCall = await postJsonWithRetry(
    AGENT_ENDPOINTS.final,
    {
      messages: finalMessages,
      // 绘图数据体积极大，只把轻量元信息发给 Final，避免调用超时/超限导致整体失败。
      structured_tool_results: slimToolResultsForFinal(toolResults),
      locale,
      context,
      temperature: AGENT_LIMITS.finalTemperature,
      maxTokens: AGENT_LIMITS.finalMaxTokens,
      verification: AGENT_VERIFICATION,
    },
    AGENT_LIMITS.requestTimeoutMs,
    1,
    signal
  ).catch(() => ({ httpOk: false, data: {} }));
  turn.finalMs = Date.now() - finalStart;
  turn.finalStatus = finalCallSucceeded(finalCall) ? 'ok' : 'failed';
  turn.finalDetail = turn.finalStatus === 'ok'
    ? ''
    : [
      finalCall.status || '',
      finalCall.parseError ? 'empty_body' : '',
      finalCall.error || '',
      finalCall.data?.ok === false ? 'ok_false' : '',
      // 失败时把返回体的字段名列出来：能立刻看出后端是不是用了别的信封（如 success/reply）
      `keys[${Object.keys(finalCall.data || {}).slice(0, 6).join('|')}]`,
      String(finalCall.data?.error || finalCall.data?.message || '').slice(0, 60),
    ].filter(Boolean).join(':');

  // 术语卡片由前端本地组装：后端 sanitize_actions 只放行既有动作类型，
  // 所以 glossary_card 不经过后端，直接在结果里合并。
  const glossaryActions = glossaryActionsFromResults(toolResults);

  // 可溯源材料：本次工具结果 + 页面上下文 + 用户原话。
  // 链接里出现的 id 必须能在其中找到，否则视为模型编造。
  const traceableText = [
    JSON.stringify(toolResults || []),
    JSON.stringify(context || {}),
    String(userMessage || ''),
  ].join('\n');

  // Final 调用失败（HTTP 非 2xx）或后端显式返回 ok:false 时，都视为失败：
  // 后端信封与 Plan 一致是 { ok, ... }，Final 偶尔会回 200 但 ok:false / reply 为空，
  // 此时不应再用 fallbackText 掩盖已成功生成的图卡。
  if (!finalCallSucceeded(finalCall)) {
    const recoveredActions = augmentNavigation(
      filterRoutableActions([...glossaryActions, ...collectResultActions(toolResults)], traceableText),
      { plan, userMessage, locale, profile }
    );
    const toolPlots = collectResultActions(toolResults).filter(a => a?.type === 'plot' || a?.type === 'plot_card');
    const recovered = recoveredActions.length > 0 || toolPlots.length > 0;
    // 工具已产出可用卡片（尤其是绘图卡）时，向用户展示引导语即可，不要记录
    // final_call_failed——否则 UI 会把「最终回答生成失败」当警告显示出来，与引导语自相矛盾。
    // 只有真的零卡片（彻底失败）才记录该警告。
    // 彻底没有卡片时的最后一层：纯查表问题仍可从本地术语表答出来
    const localAnswer = recovered ? null : localOfflineAnswer({ userMessage, context, locale });
    // 图已经生成时，引导语要说清"图在哪、一共多少点"，
    // 而不是笼统的"已为您生成以下内容"。
    const baseReply = recovered
      ? (toolPlots.length
        ? plotReadyReply(toolPlots, locale)
        : recoveredReplyText([...recoveredActions, ...localCards], locale))
      : (localAnswer?.reply || fallbackText(locale));
    // 已经用本地术语表答出实质内容时，不要再挂「最终回答生成失败」：
    // 用户拿到的是完整解释，界面却提示失败，只会让人觉得"这 AI 又出问题了"。
    if (!recovered && !localAnswer) warnings.push('final_call_failed');
    // finalize 会核对链接里的筛选能否落地（这条分支曾经漏补，导致 sex=female 空列表）
    return finalize({
      reply: baseReply,
      actions: [...(localAnswer?.actions || []), ...recoveredActions, ...localCards],
      toolResults,
    });
  }

  const finalActions = Array.isArray(finalCall.data?.actions)
    ? finalCall.data.actions
    : collectResultActions(toolResults);

  // 绘图动作（plot / plot_card）必须由工具产出、由前端确定性渲染。
  // Final 不应回显绘图动作：它的回显常改写 payload 字段，导致卡片点不开，
  // 且会与工具版本撞成两张卡片。因此绘图动作只取工具结果里的版本；
  // 仅当工具一个都没产出时，才兜底用 Final 的。
  const isPlotAction = action => action?.type === 'plot' || action?.type === 'plot_card';
  const finalNonPlot = finalActions.filter(action => !isPlotAction(action));
  const toolPlotActions = collectResultActions(toolResults).filter(isPlotAction);
  const finalPlotFallback = finalActions.filter(isPlotAction);
  const plotActions = toolPlotActions.length ? toolPlotActions : finalPlotFallback;
  const finalWithPlots = [...finalNonPlot, ...dedupePlotActions(plotActions)];

  const mergedActions = [...glossaryActions, ...finalWithPlots];
  const filtered = filterRoutableActions(mergedActions, traceableText);
  if (filtered.length !== mergedActions.length) {
    // 模型仍拼出了清单外的路径：卡片已被剔除，这里留痕便于排查。
    warnings.push('route_not_in_catalog');
    console.warn('[agent] dropped actions with unknown route', {
      dropped: mergedActions.filter(action => !filtered.includes(action)).map(action => action?.route),
    });
  }
  const actions = [...augmentNavigation(filtered, { plan, userMessage, locale, profile }), ...localCards];

  // Final 成功返回但 reply 为空（后端偶发没生成文本）时，只要已有可渲染卡片
  // （尤其是绘图卡），就用引导语替代吓人的「无法生成可靠回答」，避免图文自相矛盾。
  const rawReply = String(finalCall.data?.reply || '').trim();
  const localAnswer = (rawReply || actions.length) ? null : localOfflineAnswer({ userMessage, context, locale });
  const baseReply = rawReply
    ? rawReply
    : (actions.length ? recoveredReplyText(actions, locale) : (localAnswer?.reply || fallbackText(locale)));
  return finalize({
    reply: baseReply,
    actions: localAnswer ? [...localAnswer.actions, ...actions] : actions,
    extraWarnings: Array.isArray(finalCall.data?.warnings) ? finalCall.data.warnings : [],
    toolResults,
  });
}
