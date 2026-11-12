// 采集真实链路的质量信号：把一批问题跑一遍，导出每轮的
// 意图 / 工具 / 分段耗时 / 失败原因，并给出汇总。
//
// 用法：
//   node eval/collect-telemetry.cjs                 # 默认 10 条，guide（气泡）
//   node eval/collect-telemetry.cjs --n=20          # 跑 20 条
//   node eval/collect-telemetry.cjs --profile=data  # 数据助手（/ai）
//
// 产出：eval/telemetry-report.json（可直接看，也可作为回归基线）
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = 'http://localhost:8787/';
const wait = ms => new Promise(r => setTimeout(r, ms));

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(item => item.startsWith('--'))
    .map(item => {
      const [key, value = 'true'] = item.replace(/^--/, '').split('=');
      return [key, value];
    })
);

const LIMIT = Number(args.n || 10);
const PROFILE = args.profile || 'guide';
const PANEL = PROFILE === 'data' ? '.ss-chat-panel--inline' : '.ss-chat-panel:not(.ss-chat-panel--inline)';

// 一批覆盖不同失败模式的问题（不是随机挑的：每类都对准一种故障）
const QUESTIONS = {
  guide: [
    '查看公老鼠的单细胞数据',        // 导航：应带 sex
    '我想查看母老鼠的空转数据',      // 数据缺口：库中无 female
    'Pct.1 这一列是什么意思？',      // 术语 + 列定位
    'padj 0.03 算显著吗？',          // 阈值类
    'scDRS 是什么？',                // 纯术语
    '怎么筛选某个脑区的样本？',      // howto
    'BA12 的空转数据',               // 脑区 + 模态
    '这个页面能按什么筛选？',        // 页面自描述
    '你好',                          // smalltalk（不应调用工具）
    '帮我画一下 MALAT1 的表达',      // guide 不支持画图：应转交而非硬答
  ],
  data: [
    '画一下这个样本的 UMAP',
    '这个样本的细胞类型组成是什么？',
    'MALAT1 在这个样本里表达吗？',
    '这个样本有哪些差异表达基因？',
  ],
};

async function ask(page, text) {
  await page.evaluate((panel, q) => {
    const el = document.querySelector(`${panel} textarea.ss-chat-input`);
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, q);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }, PANEL, text);
  await wait(150);
  await page.keyboard.press('Enter');
}

async function waitIdle(page, timeoutMs = 150000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const busy = await page.evaluate(panel => Boolean(document.querySelector(`${panel} .ss-chat-typing`)), PANEL);
    if (!busy) {
      await wait(1500);
      return true;
    }
    await wait(400);
  }
  return false;
}

(async () => {
  const questions = (QUESTIONS[PROFILE] || QUESTIONS.guide).slice(0, LIMIT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  const rows = [];
  let moduleSummary = null;
  try {
    await page.goto(PROFILE === 'data' ? `${APP}#/ai` : APP, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(3500);
    if (PROFILE !== 'data') {
      await page.evaluate(() => document.querySelector('.ss-chat-fab')?.click());
      await wait(800);
    }
    // 从干净状态开始
    await page.evaluate(() => window.__ssAgent?.clear?.());

    for (const [index, question] of questions.entries()) {
      const before = await page.evaluate(() => (window.__ssAgent?.records?.() || []).length);
      await ask(page, question);
      const finished = await waitIdle(page);
      const records = await page.evaluate(() => window.__ssAgent?.records?.() || []);
      const record = records[records.length - 1];
      if (record && records.length > before) {
        rows.push({ question, ...record });
        const flag = record.outcome === 'ok' && record.actionCount ? '✓' : '!';
        console.log(
          `${flag} ${String(index + 1).padStart(2)}. ${question.padEnd(24)} `
          + `plan=${record.planStatus || '-'} final=${record.finalStatus || '-'}${record.finalDetail ? `(${record.finalDetail})` : ''} `
          + `tools=${(record.tools || []).join(',') || '-'} `
          + `${record.totalMs}ms 卡片${record.actionCount}`
          + (record.warnings?.length ? ` 警告:${record.warnings.join(',')}` : '')
        );
      } else {
        console.log(`? ${index + 1}. ${question} —— 没有采到记录（超时=${!finished}）`);
      }
      // 清空对话，尽量模拟单轮提问
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('.ss-chat-icon-btn')]
          .find(b => /clear|清空/i.test(b.getAttribute('title') || b.getAttribute('aria-label') || ''));
        btn?.click();
      });
      await wait(700);
      // 问题之间留间隔：上游有明显限流，密集连问会自造 429，
      // 采集到的是"我们的节奏"而不是"真实用户的节奏"。
      await wait(Number(args.gap ?? 2500));
    }
    // 汇总交给前端模块算，和用户点「导出诊断」看到的是同一份口径
    moduleSummary = await page.evaluate(() => window.__ssAgent?.summary?.() || null);
  } finally {
    await browser.close();
  }

  const total = rows.length;
  const rate = pick => (total ? +(rows.filter(pick).length / total).toFixed(3) : 0);
  const summary = moduleSummary || {
    profile: PROFILE,
    collectedAt: new Date().toISOString(),
    total,
    planFailRate: rate(r => r.planStatus && r.planStatus !== 'ok'),
    finalFailRate: rate(r => r.finalStatus === 'failed'),
    emptyActionRate: rate(r => !r.actionCount),
    noToolRate: rate(r => !(r.tools || []).length),
    latency: {
      avg: total ? Math.round(rows.reduce((sum, r) => sum + r.totalMs, 0) / total) : 0,
      max: total ? Math.max(...rows.map(r => r.totalMs)) : 0,
      planAvg: total ? Math.round(rows.reduce((sum, r) => sum + r.planMs, 0) / total) : 0,
      toolAvg: total ? Math.round(rows.reduce((sum, r) => sum + r.toolMs, 0) / total) : 0,
      finalAvg: total ? Math.round(rows.reduce((sum, r) => sum + r.finalMs, 0) / total) : 0,
    },
    warningTop: Object.entries(rows.flatMap(r => r.warnings || []).reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]),
  };
  summary.profile = PROFILE;
  summary.collectedAt = new Date().toISOString();

  console.log('\n────────────────────────────────────────');
  console.log(`样本 ${summary.total} 条（${summary.profile}）`);
  console.log(`Plan 失败率   ${(summary.planFailRate * 100).toFixed(0)}%`);
  console.log(`Final 失败率  ${(summary.finalFailRate * 100).toFixed(0)}%`);
  console.log(`零卡片占比    ${(summary.emptyActionRate * 100).toFixed(0)}%（仅统计"本该有卡片"的轮次：${(summary.emptyAmongCardNeededRate * 100).toFixed(0)}%）`);
  const noToolRate = summary.noToolRate ?? (total ? rows.filter(r => !(r.tools || []).length).length / total : 0);
  console.log(`未调用工具    ${(noToolRate * 100).toFixed(0)}%`);
  const latency = summary.latency || {};
  console.log(
    `耗时 p50 ${latency.p50 ?? latency.avg ?? 0}ms / p95 ${latency.p95 ?? latency.max ?? 0}ms`
    + `（plan ${latency.planP50 ?? latency.planAvg ?? 0} / tools ${latency.toolP50 ?? latency.toolAvg ?? 0} / final ${latency.finalP50 ?? latency.finalAvg ?? 0}）`
  );
  if (summary.warningTop.length) {
    console.log(`告警 top: ${summary.warningTop.map(([k, v]) => `${k}×${v}`).join(', ')}`);
  }
  if (summary.failureDetails?.length) {
    console.log('失败细节:');
    summary.failureDetails.forEach(([detail, count]) => console.log(`  ${detail} ×${count}`));
  }

  const out = path.join(__dirname, 'telemetry-report.json');
  fs.writeFileSync(out, JSON.stringify({ summary, rows }, null, 2), 'utf8');
  console.log(`\n已写入 ${out}`);
})().catch(error => {
  console.error('COLLECT_FAILED:', error.message);
  process.exit(1);
});
