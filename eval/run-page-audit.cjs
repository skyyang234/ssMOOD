/*
 * 逐页核对「回答里的页面描述」是否与真实上下文一致。
 *
 * 做法：打开页面 → 抓发给 Plan 的 pageContext → 问一句"解释当前页面"
 *      → 用 pageContext 反查回答里的断言（筛选项 / 图表 / 数量 / 内部字段）。
 *
 * 用法：
 *   npm run serve                       # 另开一个终端
 *   node eval/run-page-audit.cjs         # 默认审计内置页面清单
 *   node eval/run-page-audit.cjs --only=SingleCellList
 */
const puppeteer = require('puppeteer-core');

const BASE = process.env.AUDIT_BASE || 'http://localhost:8787';
const PANEL = '.ss-chat-panel';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const ONLY = (process.argv.find(arg => arg.startsWith('--only=')) || '').split('=')[1] || '';

const PAGES = [
  { name: 'Home', path: '/#/' },
  { name: 'BrowseHub', path: '/#/browse' },
  { name: 'SingleCellList', path: '/#/browse/SingleCell' },
  { name: 'STList', path: '/#/browse/SpatialTranscriptome' },
  { name: 'ATACList', path: '/#/browse/atac' },
  { name: 'GWASList', path: '/#/browse/gwas' },
  { name: 'SingleCellDetail', path: '/#/browse/SingleCell/F_BA11_C_rep1' },
  { name: 'STDetail', path: '/#/browse/SpatialTranscriptome/M_V_3D_rep1' },
  { name: 'ATACDetail', path: '/#/browse/atac/C_female_rep1' },
  { name: 'GWASDetail', path: '/#/browse/gwas/A-ADHD' },
  { name: 'SingleCellStudy', path: '/#/browse/singleCellStudy/study1' },
  { name: 'STStudy', path: '/#/browse/stStudy/study2' },
];

const INTERNAL_KEY = /\b(pageContext|pageSchema|businessState|referencedSamples|filter_[a-z_]+|select_[a-z_]+|browse_[a-z_]+|view_[a-z_]+)\b/;
const CHART_CLAIM = /(?:可切换|可以切换|可查看|可以查看|能切换)[^。；\n]{0,16}?(?:图表|视图|UMAP|空间图|聚类图)/;
const COUNT_CLAIM = /(?:共|总计|一共)?\s*(\d{1,6})\s*(?:个|条)\s*(?:数据集|样本|性状|记录)/g;
// "按能力/维度/当前条件筛选"这类含糊说法没有具体维度，无法核对，也不该算虚报
const VAGUE_DIMS = new Set([
  '能力', '维度', '方式', '需求', '情况', '以下', '下列', '上述', '这些', '该', '此',
  '当前', '已选', '任意', '不同', '某个', '哪些', '哪一', '一个',
]);

function filterWords(context = {}) {
  const out = new Set();
  const filters = Array.isArray(context?.pageSchema?.filters) ? context.pageSchema.filters : [];
  filters.forEach(item => {
    [item?.key, ...(Array.isArray(item?.labels) ? item.labels : [])].forEach(value => {
      const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
      if (text) out.add(text);
    });
  });
  return out;
}

function filterClaimProblems(reply, context) {
  const allowed = filterWords(context);
  const problems = [];
  const claim = /(?:支持|可|可以|能|能够)?\s*(?:按|用|通过|依据)\s*([^。；\n]{1,40}?)\s*(?:进行)?\s*(?:筛选|过滤)/g;
  const isAllowed = dim => {
    const value = String(dim || '').toLowerCase().replace(/\s+/g, '');
    if (!value) return false;
    if (allowed.has(value)) return true;
    if (value.length < 2) return false;
    return [...allowed].some(item => item.includes(value) || value.includes(item));
  };
  let match;
  while ((match = claim.exec(reply)) !== null) {
    const dims = match[1].split(/[、,，/／]/).map(item => item.trim()).filter(Boolean);
    // 一个真实维度都没有 → 不是"本页筛选"的声明（"按以下维度筛选""按当前条件筛选后…"）
    if (!dims.some(isAllowed)) continue;
    dims.forEach(dim => {
      // 含糊词（"按能力/维度筛选"）不是具体维度，不可核对，也不算虚报
      if (VAGUE_DIMS.has(dim)) return;
      if (!isAllowed(dim)) problems.push(`声称可按「${dim}」筛选，但页面未上报该筛选项`);
    });
  }
  return problems;
}

function chartProblems(reply, context) {
  const charts = Array.isArray(context?.pageSchema?.charts) ? context.pageSchema.charts : [];
  if (charts.length) return [];
  // "没有可切换的图表" 是否定句，不算虚假声明
  const pattern = new RegExp(CHART_CLAIM.source, 'g');
  let match;
  while ((match = pattern.exec(reply)) !== null) {
    const before = reply.slice(Math.max(0, match.index - 12), match.index);
    if (/(没有|无|不存在|不支持|未|并非)/.test(before)) continue;
    return ['页面没有图表，但回答声称可切换图表/视图'];
  }
  return [];
}

function countProblems(reply, context) {
  const summary = context?.pageSummary || {};
  const known = [summary.datasetCount, summary.filteredDatasetCount, summary.traitCount]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0);
  if (!known.length) return [];
  const problems = [];
  let match;
  COUNT_CLAIM.lastIndex = 0;
  while ((match = COUNT_CLAIM.exec(reply)) !== null) {
    const value = Number(match[1]);
    if (!known.includes(value)) problems.push(`声称 ${value} 个，页面实际为 ${known.join('/')}`);
  }
  return problems;
}

async function openChat(page) {
  const opened = await page.evaluate(panel => Boolean(document.querySelector(`${panel}`)) , PANEL);
  if (opened) return;
  await page.evaluate(() => {
    const fab = document.querySelector('.ss-chat-fab');
    fab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await wait(800);
}

async function auditPage(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  let context = null;
  page.on('request', req => {
    if (!/agent_llm\.php/.test(req.url())) return;
    try {
      const body = JSON.parse(req.postData() || '{}');
      for (const message of body.messages || []) {
        if (message.role !== 'user' || typeof message.content !== 'string') continue;
        const parsed = JSON.parse(message.content);
        if (parsed?.messageType === 'agent_plan_input') context = parsed.pageContext;
      }
    } catch (e) { /* 忽略非 JSON */ }
  });

  const result = { name: target.name, path: target.path, problems: [], reply: '' };
  try {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle2', timeout: 90000 });
    // 详情/研究页要先取数再上报上下文，等太短会拿到"还没上报"的空 schema
    await wait(6000);
    await openChat(page);

    await page.evaluate((panel, value) => {
      const input = document.querySelector(`${panel} .ss-chat-input`);
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, PANEL, '解释一下当前页面');

    await page.evaluate(panel => {
      const buttons = [...document.querySelectorAll(`${panel} .ss-chat-send`)];
      buttons[buttons.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, PANEL);

    for (let i = 0; i < 240; i += 1) {
      const done = await page.evaluate(panel => !document.querySelector(`${panel} .ss-chat-typing`), PANEL);
      const count = await page.evaluate(panel => document.querySelectorAll(`${panel} .ss-chat-msg--assistant`).length, PANEL);
      if (done && count > 0) break;
      await wait(500);
    }
    await wait(2500);

    result.reply = await page.evaluate(panel => {
      const last = [...document.querySelectorAll(`${panel} .ss-chat-msg--assistant`)].pop();
      return last?.querySelector('.ss-chat-bubble')?.innerText.replace(/\s+/g, ' ').trim() || '';
    }, PANEL);

    if (!context) {
      result.problems.push('没有抓到 pageContext（可能根本没发起 Plan 请求）');
    } else {
      result.context = {
        charts: context?.pageSchema?.charts || [],
        filters: (context?.pageSchema?.filters || []).map(item => item.key),
        datasetCount: context?.pageSummary?.datasetCount || '',
      };
      if (INTERNAL_KEY.test(result.reply)) {
        result.problems.push(`回答里出现内部字段名：${(result.reply.match(INTERNAL_KEY) || [])[0]}`);
      }
      result.problems.push(...filterClaimProblems(result.reply, context));
      result.problems.push(...chartProblems(result.reply, context));
      result.problems.push(...countProblems(result.reply, context));
    }
  } catch (error) {
    result.problems.push(`审计异常：${error.message}`);
  }
  await page.close();
  return result;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1500,950'],
  });

  const targets = ONLY ? PAGES.filter(item => item.name === ONLY) : PAGES;
  const results = [];
  for (const target of targets) {
    const result = await auditPage(browser, target);
    results.push(result);
    const mark = result.problems.length ? '✗' : '✓';
    console.log(`${mark} ${result.name}  (${result.path})`);
    result.problems.forEach(problem => console.log(`      - ${problem}`));
    if (result.problems.length) {
      console.log(`      上下文：${JSON.stringify(result.context || null)}`);
      console.log(`      回复节选：${result.reply.slice(0, 160)}`);
    }
  }

  const failed = results.filter(item => item.problems.length).length;
  console.log(`\n页面核对：${results.length - failed}/${results.length} 通过`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
