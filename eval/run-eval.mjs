#!/usr/bin/env node
/**
 * AI 助手 P0 评测集运行器（离线）
 *
 * 用法：
 *   node eval/run-eval.mjs              # 跑全部离线断言
 *   node eval/run-eval.mjs --verbose    # 额外打印每条用例生成的动作
 *   node eval/run-eval.mjs --checklist  # 额外生成 eval/checklist.md（人工/端到端核对用）
 *
 * 覆盖三层：
 *   A. 理解层：说法 → 路由 + 筛选（agentStudyLinks.detectStudyNavigation）
 *   B. 契约层：路径在白名单、query 键与取值合法、同页不重复
 *   C. 不变量：提示词/路由清单没有自相矛盾、长度在预算内
 *
 * 不在本脚本内：后端 LLM 的 intent / 工具调用（需联网，见文档 6.4）。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = new Set(process.argv.slice(2));
const VERBOSE = argv.has('--verbose');
const CHECKLIST = argv.has('--checklist');

// ── 列表页的参数契约（与 STList.vue / SingleCellList.vue / ATACList.vue 对齐）──
const PAGE_RULES = {
  '/browse/SingleCell': {
    // brainRegion 是后端 build_navigation_action 的写法，页面已兼容，这里同样放行
    keys: ['species', 'sex', 'area', 'brainRegion'],
    areas: ['I', 'II', 'III', 'IV', 'V', 'BA9', 'BA11', 'BA12', 'BA46'],
  },
  '/browse/SpatialTranscriptome': {
    keys: ['species', 'sex', 'area', 'brainRegion'],
    areas: ['I', 'II', 'III', 'IV', 'V', 'BA12', 'BA46'],
  },
  '/browse/atac': {
    // ATAC 的 tissue 取值来自数据本身，不做静态白名单
    keys: ['species', 'sex', 'tissue'],
    areas: null,
  },
};
const SPECIES_VALUES = ['mouse', 'human'];
const SEX_VALUES = ['male', 'female'];
const MOUSE_AREAS = ['I', 'II', 'III', 'IV', 'V'];

function splitRoute(route) {
  const [pathPart, queryPart = ''] = String(route || '').split('?');
  const query = {};
  for (const pair of queryPart.split('&')) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    const key = idx < 0 ? pair : pair.slice(0, idx);
    const value = idx < 0 ? '' : pair.slice(idx + 1);
    query[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return { path: pathPart, query };
}

/**
 * 把 src/utils 整体复制到临时目录再 import。
 *
 * 早期版本是「读源码 → 去掉 export → 写临时 .mjs」，只能加载**没有任何 import** 的模块。
 * P4 把筛选逻辑统一到 agentFilters.js 后，agentSlots / agentStudyLinks 都开始有相对导入，
 * 那种写法直接 ERR_MODULE_NOT_FOUND。改成复制目录：
 *   · 相对导入补上 .js 后缀（Node ESM 不自动补）
 *   · 补一个 package.json {"type":"module"}，否则 .js 会被当成 CJS
 * 只复制不执行，因此目录里其他依赖 vue / @/ 的模块不影响这里。
 */
let moduleDir = null;

function ensureModuleDir() {
  if (moduleDir) return moduleDir;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssmood-eval-'));
  const sourceDir = path.join(ROOT, 'src/utils');
  fs.readdirSync(sourceDir)
    .filter(name => name.endsWith('.js'))
    .forEach(name => {
      const source = fs.readFileSync(path.join(sourceDir, name), 'utf8')
        // from './agentFilters' → from './agentFilters.js'
        .replace(/(from\s+')(\.\/[^']+?)(')/g, (whole, head, spec, tail) => (
          spec.endsWith('.js') ? whole : `${head}${spec}.js${tail}`
        ));
      fs.writeFileSync(path.join(dir, name), source, 'utf8');
    });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}', 'utf8');
  moduleDir = dir;
  process.on('exit', () => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* 忽略 */ }
  });
  return dir;
}

async function loadModule(relPath, exportNames) {
  const dir = ensureModuleDir();
  const target = path.join(dir, path.basename(relPath));
  const mod = await import(pathToFileURL(target).href);
  return Object.fromEntries(exportNames.map(name => [name, mod[name]]));
}

const { detectStudyNavigation } = await loadModule('src/utils/agentStudyLinks.js', ['detectStudyNavigation']);
const { buildNavActionsFromSlots } = await loadModule('src/utils/agentSlots.js', ['buildNavActionsFromSlots']);
const { isKnownRoutePath } = await loadModule('src/utils/agentRoutes.js', ['isKnownRoutePath']);

// ── B 层：单条动作的合法性 ──
function validateAction(action) {
  const problems = [];
  const route = String(action?.route || '');
  if (!route) {
    problems.push('动作缺少 route');
    return problems;
  }
  const { path: pagePath, query } = splitRoute(route);
  if (!isKnownRoutePath(route)) problems.push(`路径不在路由清单：${pagePath}`);

  const rule = PAGE_RULES[pagePath];
  if (!rule) return problems;

  for (const [key, value] of Object.entries(query)) {
    if (!rule.keys.includes(key)) problems.push(`${pagePath} 不支持参数 ${key}`);
    if (key === 'species' && !SPECIES_VALUES.includes(value)) problems.push(`species 取值非法：${value}`);
    if (key === 'sex' && !SEX_VALUES.includes(value)) problems.push(`sex 取值非法：${value}`);
    if (key === 'area' || key === 'brainRegion') {
      if (rule.areas && !rule.areas.includes(value)) problems.push(`${pagePath} 不支持脑区 ${value}`);
      if (query.species === 'mouse' && !MOUSE_AREAS.includes(value)) problems.push(`小鼠不应出现脑区 ${value}`);
      if (query.species === 'human' && !/^BA\d+$/.test(value)) problems.push(`人类不应出现皮层分层 ${value}`);
    }
  }
  return problems;
}

// ── A 层：按用例断言 ──
function checkCase(testCase, actions) {
  const problems = [];
  const expect = testCase.expect || {};
  const described = actions.length
    ? actions.map(a => a.route || '(无 route)').join(' , ')
    : '(无)';

  if (expect.routePath === null) {
    if (actions.length) problems.push(`不应产出导航卡，实际 ${actions.length} 条：${described}`);
    return problems;
  }

  const target = actions.find(a => splitRoute(a.route).path === expect.routePath);
  if (!target) {
    problems.push(`缺少 ${expect.routePath}，实际：${described}`);
    return problems;
  }

  const { query } = splitRoute(target.route);
  for (const [key, value] of Object.entries(expect.query || {})) {
    if (query[key] !== value) {
      problems.push(`参数 ${key} 期望 ${value}，实际 ${query[key] === undefined ? '(缺失)' : query[key]}`);
    }
  }
  for (const key of expect.notQuery || []) {
    if (key in query) problems.push(`参数 ${key} 不应出现（实际 ${query[key]}）`);
  }
  if (expect.labelContains && !String(target.label || '').includes(expect.labelContains)) {
    problems.push(`标签应包含「${expect.labelContains}」，实际「${target.label || ''}」`);
  }
  return problems;
}

// ── 主流程 ──
const cases = JSON.parse(fs.readFileSync(path.join(HERE, 'cases.json'), 'utf8'));
const results = [];
let failed = 0;
const colloquial = { total: 0, covered: 0 };

console.log(`\nAI 助手评测集（离线） — ${cases.length} 条用例\n${'─'.repeat(64)}`);

for (const testCase of cases) {
  // 有 slots 的用例测「模型理解正确之后，代码能否拼对 URL」；其余测关键词兜底层
  const actions = testCase.slots
    ? buildNavActionsFromSlots(testCase.slots)
    : (detectStudyNavigation(testCase.input) || []);
  const problems = [...checkCase(testCase, actions)];

  // B 层：所有产出的动作都要合法
  for (const action of actions) {
    for (const problem of validateAction(action)) problems.push(problem);
  }
  // 同一个页面出现多次 → 就是"两张卡"那个 bug
  const seen = new Map();
  for (const action of actions) {
    const pagePath = splitRoute(action.route).path;
    if (!seen.has(pagePath)) seen.set(pagePath, 0);
    seen.set(pagePath, seen.get(pagePath) + 1);
  }
  for (const [pagePath, count] of seen) {
    if (count > 1) problems.push(`同一页面重复出现 ${count} 次：${pagePath}`);
  }

  const ok = problems.length === 0;
  const isColloquial = testCase.category === 'colloquial';
  if (isColloquial) {
    // 口语说法只统计「兜底层覆盖率」，不算失败：这些本来就该由模型 slots 兜住
    colloquial.total += 1;
    if (ok) colloquial.covered += 1;
  } else if (!ok) {
    failed += 1;
  }
  results.push({ testCase, actions, problems, ok });

  const shouldPrint = (isColloquial ? VERBOSE : !ok) || VERBOSE;
  if (shouldPrint) {
    const mark = ok ? '✓' : (isColloquial ? '△' : '✗');
    console.log(`${mark} ${testCase.id}  ${testCase.input || JSON.stringify(testCase.slots)}`);
    for (const problem of problems) console.log(`      - ${problem}`);
    if (VERBOSE && actions.length) {
      for (const action of actions) console.log(`      → ${action.label}  ${action.route}`);
    }
  }
}

// ── C 层：提示词 / 路由清单不变量 ──
const promptSrc = fs.readFileSync(path.join(ROOT, 'src/utils/agentPrompts.js'), 'utf8');
const routeSrc = fs.readFileSync(path.join(ROOT, 'src/utils/agentRoutes.js'), 'utf8');
const configSrc = fs.readFileSync(path.join(ROOT, 'src/utils/agentConfig.js'), 'utf8');

// 把 Plan / Final 两块切出来分别检查（P2 的预算与规则数约束）
const planBlock = promptSrc.slice(promptSrc.indexOf('export function buildPlanSystemPrompt'), promptSrc.indexOf('// 自检失败时的定向重试提示'));
const finalBlock = promptSrc.slice(promptSrc.indexOf('export function buildFinalSystemPrompt'), promptSrc.indexOf('// 把工具表编进 Plan 提示词'));
const countRules = block => (block.match(/'(\d+)\.\s+[A-Z]/g) || []).length;
const planRules = countRules(planBlock);
const finalRules = countRules(finalBlock);

// 规则编号必须唯一：曾经因为加规则时没核对，出现过两条 "22."。
// 编号重复不会报错，只会让模型看到两个 22（后一条更容易被忽略），属于静默退化。
const ruleNumbers = block => [...block.matchAll(/'(\d+)\.\s+[A-Z]/g)].map(match => Number(match[1]));
const duplicateRules = block => {
  const seen = new Set();
  const dup = new Set();
  ruleNumbers(block).forEach(number => {
    if (seen.has(number)) dup.add(number);
    seen.add(number);
  });
  return [...dup];
};

// 这些工具名一旦从提示词里消失，模型就再也不会调用它们（P2 重构的防误删护栏）
const CRITICAL_PLAN_TOKENS = [
  'compare_gene_across_groups', 'summarize_gene_across_datasets', 'get_dataset_summary',
  'get_deg_summary', 'search_datasets', 'explain_domain_knowledge',
  'plot_umap', 'plot_spatial', 'plot_cell_composition', 'plot_gene_expression',
  'plot_deg', 'plot_atac', 'plot_gwas', 'plot_enrichment',
];
const missingPlanTokens = CRITICAL_PLAN_TOKENS.filter(token => !planBlock.includes(token));

const invariants = [
  {
    name: '提示词不再声明「链接不带筛选参数」（历史矛盾残留）',
    ok: !/never carry filter query parameters|never read filter parameters from the URL/i.test(promptSrc),
  },
  {
    name: 'Plan 契约声明了 slots 四个字段',
    ok: ['modality', 'species', 'sex', 'area'].every(key => planBlock.includes(key)) && /slots/i.test(planBlock),
  },
  {
    name: 'Plan 规则数 ≤ 25（P2 目标）',
    ok: planRules <= 25,
    detail: `${planRules} 条`,
  },
  {
    name: 'Final 规则数 ≤ 20（P2 目标）',
    ok: finalRules <= 20,
    detail: `${finalRules} 条`,
  },
  {
    name: 'Plan 规则编号唯一（加规则时不会撞号）',
    ok: duplicateRules(planBlock).length === 0,
    detail: duplicateRules(planBlock).length ? `重复：${duplicateRules(planBlock).join(', ')}` : `${planRules} 条编号均唯一`,
  },
  {
    name: 'Final 规则编号唯一（加规则时不会撞号）',
    ok: duplicateRules(finalBlock).length === 0,
    detail: duplicateRules(finalBlock).length ? `重复：${duplicateRules(finalBlock).join(', ')}` : `${finalRules} 条编号均唯一`,
  },
  {
    name: '提示词总字符数 < 20000（重构前 38589）',
    ok: promptSrc.length < 20000,
    detail: `${promptSrc.length} 字符`,
  },
  {
    name: '关键工具名未被误删',
    ok: missingPlanTokens.length === 0,
    detail: missingPlanTokens.length ? `缺少 ${missingPlanTokens.join(', ')}` : `${CRITICAL_PLAN_TOKENS.length} 个全部在`,
  },
  {
    // 组成类问题被抓到过"只回 44 个聚类、不给细胞类型"，两头都加了硬约束
    name: '组成问题必须给真实细胞类型（不能拿聚类数顶替）',
    ok: /COMPOSITION QUESTIONS/.test(planBlock) && /COMPOSITION — describe it with actual cell types/.test(finalBlock),
  },
  {
    name: 'Final 保留了引用样本 / 阈值 / 对比口径约束',
    ok: ['referencedSamples', 'explain_domain_knowledge', 'compare_gene_across_groups'].every(key => finalBlock.includes(key)),
  },
  {
    // 曾经写成 'explain.'，导致「单细胞和空转有什么区别」这种没有单个术语可查的概念题
    // 被自检判成"必须带工具"，连试两次后直接回兜底话术。
    name: '自检不要求所有 explain.* 带工具（概念题必须能直接作答）',
    ok: !/toolRequiredPrefixes:\s*\[[^\]]*'explain\.'\s*[,\]]/.test(configSrc),
    detail: /'explain\.term'/.test(configSrc) ? '已细分为 term/field/threshold' : '',
  },
  {
    name: '路由清单含三个列表页，且不含 query 语法（列表链接由前端 slots 构造）',
    ok: ['/browse/SingleCell', '/browse/SpatialTranscriptome', '/browse/atac']
      .every(item => routeSrc.includes(`path: '${item}'`)) && !/\?species=/.test(routeSrc),
  },
];

console.log(`${'─'.repeat(64)}\n提示词与路由契约`);
for (const item of invariants) {
  if (!item.ok) failed += 1;
  console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? `（${item.detail}）` : ''}`);
}

// ── D 层：概念问题的本地兜底 ──
// 这类问题不查库、也不依赖模型。它曾经整条缺失，导致「单细胞和空转有什么区别」
// 被自检拦下后只回一句"没判断出该走哪种处理"。这里把它钉住。
const { buildConceptAnswer } = await loadModule('src/utils/agentConcepts.js', ['buildConceptAnswer']);

const CONCEPT_CASES = [
  {
    input: '单细胞和空转分别是什么意思，这些数据有什么用啊',
    must: ['单细胞', '空间转录组'],
    routes: ['/browse/SingleCell', '/browse/SpatialTranscriptome'],
  },
  { input: 'ATAC 是什么', must: ['染色质'], routes: ['/browse/atac'] },
  { input: 'GWAS 有什么用', must: ['关联'], routes: ['/browse/gwas'] },
  // 反例：浏览请求不能被概念兜底截胡，否则会答一堆定义却不去列表页
  { input: '查看母老鼠的单细胞数据', expectNull: true },
  { input: '打开人类空转数据', expectNull: true },
  // 反例：只提到术语、没问概念，也不该被截胡
  { input: 'Pct.1 是什么意思', expectNull: true },
];

console.log(`${'─'.repeat(64)}\n概念问题本地兜底（不依赖模型）`);
let conceptFailed = 0;
for (const item of CONCEPT_CASES) {
  const answer = buildConceptAnswer({ text: item.input, locale: 'zh' });
  const problems = [];
  if (item.expectNull) {
    if (answer) problems.push('该交给 Plan 的请求被概念兜底抢走了');
  } else if (!answer) {
    problems.push('没有产出答案（会退化成兜底话术）');
  } else {
    (item.must || []).forEach(word => {
      if (!answer.reply.includes(word)) problems.push(`答案缺少「${word}」`);
    });
    (item.routes || []).forEach(route => {
      if (!answer.actions.some(action => action.route === route)) problems.push(`缺少入口 ${route}`);
    });
    // 答案里不能出现裸 URL：链接一律由卡片承载
    if (/https?:\/\//.test(answer.reply)) problems.push('答案里出现了裸 URL');
  }
  if (problems.length) conceptFailed += 1;
  failed += problems.length ? 1 : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${item.input}`);
  problems.forEach(problem => console.log(`      - ${problem}`));
}

// ── E 层：回答排版（Markdown 渲染）──
// 模型稳定输出表格/列表，渲染器坏掉时用户看到的是一堆竖线和塌成一行的列表。
const { renderMarkdown } = await loadModule('src/utils/markdownLite.js', ['renderMarkdown']);

const MARKDOWN_CASES = [
  {
    name: '对比表格渲染为 <table>',
    input: '| 维度 | 单细胞 | 空转 |\n|---|---|---|\n| 空间信息 | 无 | 有 |',
    must: ['<table>', '<th>维度</th>', '<td>无</td>'],
    not: ['| 维度 |'],
  },
  {
    name: '两级列表各自成列表',
    input: '- 一级\n  - 二级\n- 另一项',
    must: ['<ul>', '<li>二级</li>', '<li>另一项</li>'],
  },
  {
    name: '代码块内不解析表格与粗体',
    input: '```\n| a | b |\n**x**\n```',
    must: ['<pre>', '**x**'],
    not: ['<table>', '<strong>'],
  },
  {
    name: 'HTML 被转义（v-html 不留注入面）',
    input: '<img src=x onerror=alert(1)>',
    must: ['&lt;img'],
    not: ['<img'],
  },
  // 模型实际写法比标准 Markdown 松散：行尾少竖线、干脆不写分隔行
  {
    name: '表格行尾缺 "|" 也能识别',
    input: '| 维度 | 单细胞 | 空转\n|---|---|---\n| 空间 | 无 | 有',
    must: ['<table>', '<td>无</td>'],
    not: ['| 维度 |'],
  },
  {
    name: '缺分隔行也能识别（首行当表头）',
    input: '| 维度 | 单细胞\n| 空间 | 无\n| 分辨率 | 单细胞',
    must: ['<table>', '<th>维度</th>', '<td>分辨率</td>'],
  },
  {
    name: '只有表头无数据时不渲染空表',
    input: '| 只有 | 表头 |',
    must: ['<p>'],
    not: ['<table>'],
  },
];

console.log(`${'─'.repeat(64)}\n回答排版（Markdown）`);
for (const item of MARKDOWN_CASES) {
  const html = renderMarkdown(item.input);
  const problems = [];
  (item.must || []).forEach(token => {
    if (!html.includes(token)) problems.push(`缺少 ${token}`);
  });
  (item.not || []).forEach(token => {
    if (html.includes(token)) problems.push(`不应出现 ${token}`);
  });
  failed += problems.length ? 1 : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${item.name}`);
  problems.forEach(problem => console.log(`      - ${problem}`));
}

// ── F 层：术语表覆盖 ──
// 用户高频问的词必须能查到；查不到时模型会自由发挥（Pct.1 曾被讲反）。
const { searchGlossary } = await loadModule('src/utils/agentGlossary.js', ['searchGlossary']);
const GLOSSARY_PROBES = [
  'Pct.1 是什么意思',
  'spot 是什么',
  '火山图怎么看',
  'KEGG 富集是什么',
  'cluster 是什么意思',
];

console.log(`${'─'.repeat(64)}\n术语表覆盖`);
for (const probe of GLOSSARY_PROBES) {
  const hits = searchGlossary(probe, 3).filter(item => Number(item.score) >= 55);
  const ok = hits.length > 0;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${probe}${ok ? `（命中 ${hits[0].term}）` : ' —— 查不到，模型会自由发挥'}`);
}

// ── G 层：卡片预算 ──
// 泛问题一次弹出五六张样本卡，是"看起来炸了一屏"的直接原因。
const { budgetActions } = await loadModule('src/utils/agentActionBudget.js', ['budgetActions']);

const datasetCard = id => ({
  type: 'dataset_card',
  route: `/browse/SingleCell/${id}`,
  label: `打开 ${id}`,
  omicsType: 'SC',
});
const listNav = { type: 'navigate', route: '/browse/SingleCell', label: '打开人类单细胞数据' };
const plotCard = { type: 'plot', plotType: 'umap', title: 'UMAP' };

const BUDGET_CASES = [
  {
    name: '5 张样本卡 + 列表入口 → 只留列表入口',
    input: [datasetCard('a'), datasetCard('b'), datasetCard('c'), datasetCard('d'), datasetCard('e'), listNav],
    expect: { dataset: 0, nav: 1, total: 1 },
  },
  {
    name: '4 张样本卡无列表入口 → 留 3 张 + 一张"查看全部"',
    input: [datasetCard('a'), datasetCard('b'), datasetCard('c'), datasetCard('d')],
    expect: { dataset: 3, nav: 1, total: 4 },
  },
  {
    name: '2 张样本卡保持原样（不打扰）',
    input: [datasetCard('a'), datasetCard('b')],
    expect: { dataset: 2, nav: 0, total: 2 },
  },
  {
    name: '绘图卡不受预算影响',
    input: [plotCard, datasetCard('a'), datasetCard('b'), datasetCard('c'), datasetCard('d'), listNav],
    expect: { dataset: 0, nav: 1, plots: 1, total: 2 },
  },
];

console.log(`${'─'.repeat(64)}\n卡片预算`);
for (const item of BUDGET_CASES) {
  const out = budgetActions(item.input, { locale: 'zh' });
  const dataset = out.filter(a => a.type === 'dataset_card').length;
  const nav = out.filter(a => a.type === 'navigate').length;
  const plots = out.filter(a => a.type === 'plot' || a.type === 'plot_card').length;
  const problems = [];
  if (item.expect.dataset !== undefined && dataset !== item.expect.dataset) problems.push(`样本卡 ${dataset}，期望 ${item.expect.dataset}`);
  if (item.expect.nav !== undefined && nav !== item.expect.nav) problems.push(`导航卡 ${nav}，期望 ${item.expect.nav}`);
  if (item.expect.plots !== undefined && plots !== item.expect.plots) problems.push(`绘图卡 ${plots}，期望 ${item.expect.plots}`);
  if (item.expect.total !== undefined && out.length !== item.expect.total) problems.push(`总数 ${out.length}，期望 ${item.expect.total}`);
  failed += problems.length ? 1 : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${item.name}`);
  problems.forEach(problem => console.log(`      - ${problem}`));
}

// ── H 层：可核验层不误报 ──
// 纯知识性回答（没查库）不该把 APOE 这类通用基因名标成"未能核实"。
const { buildEvidence } = await loadModule('src/utils/agentEvidence.js', ['buildEvidence']);

console.log(`${'─'.repeat(64)}\n可核验层`);
{
  const quiet = buildEvidence({
    reply: '阿尔兹海默症与 APOE ε4 等位基因相关，也与 tau 蛋白过度磷酸化有关。',
    toolResults: [],
    context: {},
    userMessage: '阿尔兹海默症是什么',
  });
  const ok = (quiet.unverified || []).length === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} 纯知识回答不产生"未能核实的表述"${ok ? '' : `（实际：${quiet.unverified.join('、')}）`}`);
}

// ── I 层：页面事实校对 ──
// 列表页只有物种/脑区/性别，模型却把表格里的 Conditions 说成筛选项。
const { pruneFilterClaims, stripInternalRefs } = await loadModule('src/utils/agentPageFacts.js', ['pruneFilterClaims', 'stripInternalRefs']);

const PAGE_CTX = {
  pageSchema: {
    filters: [
      { key: 'species', labels: ['物种', 'Species'], values: ['mouse', 'human'] },
      { key: 'area', labels: ['脑区', 'Brain region'], values: ['I', 'II'] },
      { key: 'sex', labels: ['性别', 'Sex'], values: ['male', 'female'] },
    ],
    columns: [{ key: 'conditions', labels: ['条件', 'Condition'] }],
    charts: [],
  },
};

const PAGE_FACT_CASES = [
  {
    name: '删掉不存在的「条件」筛选项',
    input: '页面上共 143 个数据集，支持按物种、脑区、条件、性别过滤。',
    must: ['按物种、脑区、性别过滤'],
    not: ['条件'],
  },
  {
    name: '全部对得上时原样保留',
    input: '可以按物种、性别筛选。',
    must: ['可以按物种、性别筛选'],
  },
  {
    // 一个已知维度都没有 → 这句话不是在说本页筛选（"按当前条件筛选后仍为 40 个"）
    name: '没有任何已知维度时保持原样',
    input: '按当前条件筛选后仍为 40 个。',
    must: ['按当前条件筛选后仍为 40 个'],
  },
  {
    name: '页面没上报 filters 时不改动',
    input: '支持按条件、批次过滤。',
    must: ['条件、批次'],
  },
  {
    // 模型的另一种写法：没有"支持/可以"，直接"…：按 A、B、C 过滤"
    name: '弱句式也能删掉不存在的维度',
    input: '筛选数据列表：按物种、脑区、性别、条件过滤出更相关的数据集。',
    must: ['按物种、脑区、性别过滤'],
    not: ['条件'],
  },
];

{
  const dirty = '页面顶部设有筛选栏（filters 列表中无 condition 字段），可筛选。';
  const clean = stripInternalRefs(dirty);
  const ok = !/filters|condition 字段/.test(clean);

  const capabilityDirty = 'Condition（条件）：（对应能力 filter_condition）';
  const capabilityClean = stripInternalRefs(capabilityDirty);
  const ok2 = !/filter_condition/.test(capabilityClean);

  // 正文里的裸能力名要换成页面上的真实控件说法
  const bareKey = stripInternalRefs('可选操作：select_gene、select_cluster');
  const ok3 = !/select_(gene|cluster)/.test(bareKey) && bareKey.includes('选择基因');

  if (!ok || !ok2 || !ok3) failed += 1;
  console.log(`${'─'.repeat(64)}\n内部字段泄漏清理`);
  console.log(`${ok ? '✓' : '✗'} 去掉「（filters 列表中无 condition 字段）」${ok ? '' : `（实际：${clean}）`}`);
  console.log(`${ok2 ? '✓' : '✗'} 去掉「（对应能力 filter_condition）」${ok2 ? '' : `（实际：${capabilityClean}）`}`);
  console.log(`${ok3 ? '✓' : '✗'} 裸能力名换成控件说法${ok3 ? '' : `（实际：${bareKey}）`}`);
}

console.log(`${'─'.repeat(64)}\n页面事实校对`);
for (const item of PAGE_FACT_CASES) {
  const ctx = item.name.includes('没上报') ? {} : PAGE_CTX;
  const out = pruneFilterClaims(item.input, ctx);
  const problems = [];
  (item.must || []).forEach(token => {
    if (!out.includes(token)) problems.push(`缺少「${token}」（实际：${out}）`);
  });
  (item.not || []).forEach(token => {
    if (out.includes(token)) problems.push(`不应出现「${token}」（实际：${out}）`);
  });
  failed += problems.length ? 1 : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${item.name}`);
  problems.forEach(problem => console.log(`      - ${problem}`));
}

{
  // 一句话里点两个缩写（Sus / Res），两个都要能查到；3 字母缩写靠"独立单词"规则命中
  const hits = searchGlossary('CSDS 模型里的 Sus 和 Res 是什么', 5).map(item => item.term);
  const ok = hits.includes('Susceptible') && hits.includes('Resilient') && hits.includes('CSDS');
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} 一句提问同时命中 Sus 与 Res（实际：${hits.join(', ') || '无'}）`);
}

// ── J 层："编造数据缺失"守卫 ──
// 模型把"我没拿到"说成"库里没有"，是抽查里发现的最危险的一类错误。
const {
  detectMissingClaims, hasTurnData, stripDenialSentences, summarizeClaim, DATA_CLAIMS, isHowToAsk,
} = await loadModule('src/utils/agentDataClaims.js', [
  'detectMissingClaims', 'hasTurnData', 'stripDenialSentences', 'summarizeClaim', 'DATA_CLAIMS', 'isHowToAsk',
]);

console.log(`${'─'.repeat(64)}\n数据缺失断言守卫`);
{
  const cases = [
    {
      name: '组成：识别"尚未注释"',
      got: detectMissingClaims('该样本分出了 44 个聚类，但细胞类型尚未注释。', '这个样本的细胞类型组成是怎样的？').map(item => item.key),
      want: ['composition'],
    },
    {
      name: 'DEG：识别"没有差异基因"',
      got: detectMissingClaims('该细胞类型没有显著差异基因。', '这个细胞类型有哪些差异基因？').map(item => item.key),
      want: ['deg'],
    },
    {
      name: '表达：识别"未检测到表达"',
      got: detectMissingClaims('未检测到该基因的表达。', 'MALAT1 表达多少？').map(item => item.key),
      want: ['expression'],
    },
    {
      name: '正常回答不误判',
      got: detectMissingClaims('该样本共 45 类细胞，Astro 最多。', '这个样本的细胞类型组成是怎样的？').map(item => item.key),
      want: [],
    },
    {
      name: '问题不相关时不触发（问页面，答"没有注释"）',
      got: detectMissingClaims('这个页面没有细胞类型注释模块。', '这个页面怎么用？').map(item => item.key),
      want: [],
    },
    {
      // 模型把"我没工具/拿不到"也当成结论，同样是假声明
      name: '组成：识别"没有可用工具/无法获取"',
      got: detectMissingClaims(
        'I cannot fetch or plot the composition here because no matching catalog tool is available.',
        '这个样本的细胞类型组成是怎样的？',
      ).map(item => item.key),
      want: ['composition'],
    },
    {
      name: '"组成是怎样的"不算 how-to（要补真实值）',
      got: isHowToAsk('这个样本的细胞类型组成是怎样的？'),
      want: false,
    },
    {
      name: '"怎么看组成"算 how-to（不补数据）',
      got: isHowToAsk('怎么看这个样本的细胞类型组成？'),
      want: true,
    },
    {
      // 表达问题里也有"多少"，不能被组成守卫抢走
      name: '表达问题只触发 expression，不触发 composition',
      got: detectMissingClaims('未检测到该基因的表达。', 'MALAT1 在这个样本里表达多少？').map(item => item.key),
      want: ['expression'],
    },
  ];
  cases.forEach(item => {
    const ok = JSON.stringify(item.got) === JSON.stringify(item.want);
    if (!ok) failed += 1;
    console.log(`${ok ? '✓' : '✗'} ${item.name}${ok ? '' : `（实际 ${JSON.stringify(item.got)}）`}`);
  });
}

{
  const composition = DATA_CLAIMS.find(item => item.key === 'composition');
  const deg = DATA_CLAIMS.find(item => item.key === 'deg');
  const atac = DATA_CLAIMS.find(item => item.key === 'atac');
  const expression = DATA_CLAIMS.find(item => item.key === 'expression');

  const checks = [
    {
      name: '本轮已有真实组成数据 → 不触发纠正',
      ok: hasTurnData([{ skill: 'get_celltype_composition', ok: true, result: { items: [{ cellType: 'Astro', count: 3 }] } }], composition),
    },
    {
      name: '本轮工具成功但为空 → 允许纠查',
      ok: hasTurnData([{ skill: 'get_celltype_composition', ok: true, result: { items: [] } }], composition) === false,
    },
    {
      name: 'ATAC 用 datasetPeakRows 判断（没有 items 数组）',
      ok: atac.hasData({ datasetPeakRows: 166970, differentialPeaks: [] }) === true,
    },
    {
      name: '表达用 nonzeroCount 判断',
      ok: expression.hasData({ nonzeroCount: 6866, cellCount: 6867 }) === true
        && expression.hasData({ nonzeroCount: 0, cellCount: 10 }) === false,
    },
    {
      name: '删掉否认句但保留前文',
      ok: (() => {
        const out = stripDenialSentences('这是该样本的概况。细胞类型尚未注释。请看组成模块。', [composition]);
        return out.includes('这是该样本的概况') && out.includes('请看组成模块') && !out.includes('尚未注释');
      })(),
    },
  ];
  checks.forEach(item => {
    if (!item.ok) failed += 1;
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
  });

  const summaries = [
    {
      name: '组成摘要含真实类型与占比',
      text: summarizeClaim(composition, {
        items: [{ cellType: 'Astro AQP4 SLC1A2', count: 30 }, { cellType: 'Oligo MOG OPALIN', count: 10 }],
      }, { zh: true, context: { businessState: { datasetId: 'D1' } } }),
      must: ['D1', 'Astro AQP4 SLC1A2', '75.0%'],
    },
    {
      name: 'DEG 摘要给出条数与对比',
      text: summarizeClaim(deg, {
        items: [{ contrast: 'Astro vs others', log2fc: 5.68, padj: 0.087 }],
      }, { zh: true, context: {} }),
      must: ['1 条', 'Astro vs others', '5.68'],
    },
    {
      name: 'ATAC 摘要说明"差异峰为空但峰表有数据"',
      text: summarizeClaim(atac, { datasetPeakRows: 166970, differentialPeaks: [] }, { zh: true, context: { businessState: { datasetId: 'D2' } } }),
      must: ['166970', '差异可及峰这一项当前为空'],
    },
  ];
  summaries.forEach(item => {
    const missing = item.must.filter(token => !item.text.includes(token));
    if (missing.length) failed += 1;
    console.log(`${missing.length ? '✗' : '✓'} ${item.name}${missing.length ? `（缺少 ${missing.join('/')}）` : ''}`);
  });
}

// ── F 层：绘图正文守卫 ──
// 实测事故：图真的画出来了（43 条 trace），正文却写"未在已选样本中检测到可用于绘图的 UMAP 数据"。
// 根因是 Final 收到的工具结果被精简成空 payload，模型把"空"读成"没有数据"。
const PlotGuard = await loadModule('src/utils/agentPlotGuard.js', [
  'replyContradictsPlot', 'plotActionSummary', 'plotReadyReply', 'slimPlotActionForFinal',
]);

console.log(`${'─'.repeat(64)}\n绘图正文守卫`);
{
  const umapAction = {
    type: 'plot',
    plotType: 'umap',
    title: '单细胞 UMAP 聚类图 · F_BA9_C_rep9',
    subtitle: '单样本 UMAP 坐标与细胞聚类分布',
    datasets: [{ datasetId: 'F_BA9_C_rep9', label: 'F_BA9_C_rep9' }],
    payload: {
      data: [
        { x: [1, 2, 3], y: [1, 2, 3], name: 'Oligo' },
        { x: [4, 5], y: [4, 5], name: 'Astro' },
      ],
      layout: {},
    },
  };

  const cases = [
    { reply: '当前未在已选样本中检测到可用于绘图的 UMAP 数据。请在 Browse / SingleCell 勾选样本后重试。', expect: true },
    { reply: '未能获取 UMAP 坐标：F_BA9_C_rep9', expect: true },
    { reply: '已生成「单细胞 UMAP 聚类图」，点击下方卡片查看。', expect: false },
    // 正常描述不能误杀：这里在说基因，不是在否认图
    { reply: '图中灰色点表示该基因未检测到表达。', expect: false },
    { reply: '这个样本没有 UMAP 数据。', expect: true },
    // 另一种否认：图都画好了还让用户去勾选样本
    { reply: '当前没有在界面中选中任何样本，无法直接绘制 F_BA9_C_rep9 的 UMAP。', expect: true },
    { reply: '请在 Browse / SingleCell 页面勾选该样本后再试。', expect: true },
  ];
  cases.forEach(item => {
    const got = PlotGuard.replyContradictsPlot(item.reply);
    const ok = got === item.expect;
    if (!ok) failed += 1;
    console.log(`${ok ? '✓' : '✗'} 否认判定 ${item.expect ? '（应命中）' : '（不应命中）'}：${item.reply.slice(0, 24)}`);
  });

  const checks = [
    {
      name: '摘要能数出点数与聚类数',
      ok: (() => {
        const s = PlotGuard.plotActionSummary(umapAction);
        return s.pointCount === 5 && s.clusterCount === 2 && s.samples[0] === 'F_BA9_C_rep9';
      })(),
    },
    {
      name: '校正话术带上点数与「每个点是一个细胞」',
      ok: (() => {
        const text = PlotGuard.plotReadyReply([umapAction], 'zh');
        return text.includes('5 个细胞点') && text.includes('每个点代表一个细胞') && text.includes('F_BA9_C_rep9');
      })(),
    },
    {
      name: '发给 Final 的绘图动作带非空摘要（rendered + 点数），不是空 payload',
      ok: (() => {
        const slim = PlotGuard.slimPlotActionForFinal(umapAction);
        return slim.payload?.rendered === true
          && slim.payload.pointCount === 5
          && slim.payload.clusterCount === 2
          && slim.payload.samples[0] === 'F_BA9_C_rep9'
          && typeof slim.payload.note === 'string';
      })(),
    },
  ];
  checks.forEach(item => {
    if (!item.ok) failed += 1;
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
  });
}

// ── K 层：多轮会话存储 ──
// 之前只存"当前这一条"，关掉标签页就没了。这层逻辑是纯函数，可以完整离线测。
const ChatStore = await loadModule('src/utils/agentChatStore.js', [
  'parseStore', 'serializeStore', 'upsertSession', 'removeSession',
  'titleFromQuestion', 'relativeTime', 'normalizeSession', 'firstUserText',
]);

console.log(`${'─'.repeat(64)}\n多轮会话存储`);
{
  const messages = [
    { role: 'user', text: '查看母老鼠的单细胞数据', content: '查看母老鼠的单细胞数据' },
    { role: 'assistant', text: '', content: '这是回答' },
  ];

  const checks = [
    {
      name: '标题超长截断到 18 字 + 省略号',
      ok: (() => {
        const title = ChatStore.titleFromQuestion('单细胞和空转分别是什么意思，这些数据有什么用啊');
        return title.endsWith('…') && title.length === 19;
      })(),
    },
    {
      name: '旧格式（纯消息数组）能迁移成一条会话',
      ok: (() => {
        const store = ChatStore.parseStore(JSON.stringify(messages));
        return store.sessions.length === 1
          && store.sessions[0].messages.length === 2
          && store.activeId === store.sessions[0].id
          && store.sessions[0].title.includes('母老鼠');
      })(),
    },
    {
      name: '坏数据不炸，退化成空存储',
      ok: (() => {
        const store = ChatStore.parseStore('{not json');
        return store.sessions.length === 0 && store.activeId === '';
      })(),
    },
    {
      name: 'activeId 为空时恢复成"空对话"，不自动跳回旧会话',
      ok: (() => {
        const base = ChatStore.parseStore(JSON.stringify(messages));
        const reopened = ChatStore.parseStore(ChatStore.serializeStore({ activeId: '', sessions: base.sessions }));
        return reopened.activeId === '' && reopened.sessions.length === 1;
      })(),
    },
    {
      name: '写入同 id 会话是覆盖而不是新增',
      ok: (() => {
        const first = ChatStore.upsertSession({ activeId: '', sessions: [] }, { id: 'x', title: 'A', at: 1, messages });
        const again = ChatStore.upsertSession(first, { id: 'x', title: 'A2', at: 2, messages });
        return again.sessions.length === 1 && again.sessions[0].title === 'A2';
      })(),
    },
    {
      name: '会话数超过上限时丢最旧的',
      ok: (() => {
        let store = { activeId: '', sessions: [] };
        for (let i = 0; i < 13; i += 1) {
          store = ChatStore.upsertSession(store, { id: `s${i}`, title: `t${i}`, at: i, messages });
        }
        return store.sessions.length === 10 && store.sessions[0].title === 't12';
      })(),
    },
    {
      name: '删掉当前会话会顺位打开下一条',
      ok: (() => {
        const a = ChatStore.upsertSession({ activeId: '', sessions: [] }, { id: 'a', title: 'A', at: 2, messages });
        const b = ChatStore.upsertSession(a, { id: 'b', title: 'B', at: 1, messages });
        const after = ChatStore.removeSession(b, 'b');
        return after.sessions.length === 1 && after.activeId === 'a';
      })(),
    },
    {
      name: '删光后回到空存储',
      ok: (() => {
        const one = ChatStore.upsertSession({ activeId: '', sessions: [] }, { id: 'a', title: 'A', at: 1, messages });
        const after = ChatStore.removeSession(one, 'a');
        return after.sessions.length === 0 && after.activeId === '';
      })(),
    },
    {
      name: '标题为空时用第一条用户消息兜底',
      ok: (() => {
        const session = ChatStore.normalizeSession({ id: 'z', messages });
        return session.title.includes('母老鼠');
      })(),
    },
    {
      name: '相对时间按量级换单位',
      ok: (() => {
        const now = 1000 * 60 * 60 * 24 * 10;
        return ChatStore.relativeTime(now - 1000, { now, locale: 'zh' }) === '刚刚'
          && ChatStore.relativeTime(now - 5 * 60 * 1000, { now, locale: 'zh' }) === '5 分钟前'
          && ChatStore.relativeTime(now - 3 * 60 * 60 * 1000, { now, locale: 'zh' }) === '3 小时前';
      })(),
    },
  ];

  checks.forEach(item => {
    if (!item.ok) failed += 1;
    console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
  });
}

// ── 汇总 ──
const byCategory = {};
for (const item of results) {
  const key = item.testCase.category;
  byCategory[key] = byCategory[key] || { total: 0, pass: 0 };
  byCategory[key].total += 1;
  if (item.ok) byCategory[key].pass += 1;
}

console.log(`${'─'.repeat(64)}\n分类汇总`);
for (const [key, stat] of Object.entries(byCategory)) {
  console.log(`  ${key.padEnd(12)} ${stat.pass}/${stat.total}`);
}
const scored = results.filter(item => item.testCase.category !== 'colloquial');
const passed = scored.filter(item => item.ok).length;
console.log(`\n总计：${passed}/${scored.length} 通过${failed ? `，${failed} 项失败` : '，全部通过'}`);
if (colloquial.total) {
  console.log(`口语说法兜底覆盖率：${colloquial.covered}/${colloquial.total}（未覆盖的由模型 slots 承载，见 P1）`);
}

// ── 人工核对清单 ──
if (CHECKLIST) {
  const lines = [
    '# AI 助手端到端核对清单',
    '',
    '> 由 `node eval/run-eval.mjs --checklist` 生成。逐条在气泡里提问，按期望打勾。',
    '',
    '| # | 提问 | 期望路由 | 期望参数 | 结果 |',
    '|---|---|---|---|---|',
  ];
  for (const testCase of cases) {
    // slots 用例是代码级断言（模拟模型输出），不需要人工在气泡里问
    if (testCase.category === 'slots') continue;
    const expect = testCase.expect || {};
    const query = Object.entries(expect.query || {}).map(([k, v]) => `${k}=${v}`).join(' & ') || '—';
    const route = expect.routePath === null ? '不应出现链接卡' : expect.routePath;
    lines.push(`| ${testCase.id} | ${testCase.input} | ${route} | ${query} | ☐ |`);
  }
  const out = path.join(HERE, 'checklist.md');
  // 带 BOM：Windows 上的记事本 / Excel 打开中文才不乱码
  fs.writeFileSync(out, `\ufeff${lines.join('\n')}\n`, 'utf8');
  console.log(`\n已生成人工核对清单：${path.relative(ROOT, out)}`);
}

process.exit(failed ? 1 : 0);
