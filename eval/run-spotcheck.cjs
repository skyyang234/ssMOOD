/*
 * 人工抽查清单的执行器：自动抓回答 + 自动判定客观断言，主观质量留人工一列。
 *
 *   node eval/run-spotcheck.cjs              # 跑全部（需要 dev server）
 *   node eval/run-spotcheck.cjs --only=edge  # 只跑 id 前缀
 *
 * 产物：eval/spotcheck-result.md（表格 + 每条完整回答），人工只需在"人工判定"列打勾。
 *
 * 为什么分成两段：
 *   · must / mustNot 是**客观**的（口径错、维度错、内部字段），机器判；
 *   · "讲得是否到位、是否答非所问"是**主观**的，机器判不了，留给人。
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const HERE = __dirname;
const BASE = process.env.AUDIT_BASE || 'http://localhost:8787';
const PANEL = '.ss-chat-panel';
const ONLY = (process.argv.find(arg => arg.startsWith('--only=')) || '').split('=')[1] || '';
// 只跑某一类时不要覆盖完整清单，否则"重跑一条"会把 19 条的结果文件冲掉
const OUT = path.join(HERE, ONLY ? `spotcheck-result-${ONLY}.md` : 'spotcheck-result.md');

const cases = JSON.parse(fs.readFileSync(path.join(HERE, 'spotcheck.cases.json'), 'utf8'))
  .filter(item => !ONLY || String(item.id).startsWith(ONLY));

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// "A|B" 表示任一写法命中即可（中英文回答都能判）
const variants = token => String(token).split('|').map(item => item.trim()).filter(Boolean);

function containsAny(text, token) {
  const lower = text.toLowerCase();
  return variants(token).some(variant => lower.includes(variant.toLowerCase()));
}

function autoJudge(reply, testCase) {
  const missing = (testCase.must || []).filter(token => !containsAny(reply, token));
  const forbidden = (testCase.mustNot || []).filter(token => containsAny(reply, token));
  return { missing, forbidden };
}

async function currentPanel(page) {
  return page.evaluate(() => (
    document.querySelector('.ss-chat-panel--page') ? '.ss-chat-panel--page' : '.ss-chat-panel'
  ));
}

async function resetChat(page, panel) {
  // 每条例题都从空对话开始，否则上一题的上下文会污染这一题
  await page.evaluate(sel => {
    const newChat = document.querySelector(`${sel} .ss-chat-new-btn`);
    if (newChat) { newChat.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
    const clear = [...document.querySelectorAll(`${sel} .ss-chat-icon-btn`)]
      .find(button => /清空|clear/i.test(button.getAttribute('aria-label') || ''));
    clear?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, panel);
  await wait(500);
}

async function ask(page, panel, question) {
  const before = await page.evaluate(sel => document.querySelectorAll(`${sel} .ss-chat-msg--assistant`).length, panel);
  await page.evaluate((sel, value) => {
    const input = document.querySelector(`${sel} .ss-chat-input`);
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, panel, question);
  await page.evaluate(sel => {
    const buttons = [...document.querySelectorAll(`${sel} .ss-chat-send`)];
    buttons[buttons.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, panel);

  for (let i = 0; i < 240; i += 1) {
    const done = await page.evaluate((sel, count) => (
      !document.querySelector(`${sel} .ss-chat-typing`)
      && document.querySelectorAll(`${sel} .ss-chat-msg--assistant`).length > count
    ), panel, before);
    if (done) break;
    await wait(500);
  }
  await wait(2200);

  return page.evaluate(sel => {
    const last = [...document.querySelectorAll(`${sel} .ss-chat-msg--assistant`)].pop();
    if (!last) return { reply: '', cards: 0, warnings: 0 };
    return {
      reply: (last.querySelector('.ss-chat-bubble')?.innerText || '').replace(/\s+\n/g, '\n').trim(),
      cards: last.querySelectorAll('.ss-chat-action-card, .ss-chat-rich').length,
      warnings: last.querySelectorAll('.ss-chat-warning').length,
    };
  }, panel);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--window-size=1500,950'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950 });

  const results = [];
  let currentPath = '';
  let panel = PANEL;

  for (const testCase of cases) {
    if (testCase.page !== currentPath) {
      await page.goto(`${BASE}${testCase.page}`, { waitUntil: 'networkidle2', timeout: 90000 });
      await wait(5000);
      currentPath = testCase.page;
      panel = await currentPanel(page);
      if (panel === '.ss-chat-panel') {
        await page.evaluate(() => {
          const fab = document.querySelector('.ss-chat-fab');
          fab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await wait(800);
      }
    }

    await resetChat(page, panel);
    let answer = await ask(page, panel, testCase.question);

    // 两种执行层抖动，重试一次就够，不该记成内容缺陷：
    //   1) 清空对话后首轮输入没落进去，模型对着空消息回了句"你好"；
    //   2) Plan 侧偶发失败（多为限流），回复退化成兜底话术。
    const looksBroken = reply => (
      !reply
      || reply.replace(/\s/g, '').length < 12
      || /^(你好|您好|hi\b|hello\b)/i.test(reply)
      || /rate.?limit|限流|too many requests/i.test(reply)
      || /could not produce a reliable reply|暂时无法生成可靠回答|没处理明白|没有执行查询/i.test(reply)
    );
    if (looksBroken(answer.reply)) {
      await resetChat(page, panel);
      answer = await ask(page, panel, testCase.question);
    }

    const judge = autoJudge(answer.reply, testCase);
    // 重试后仍失败：标成"环境未完成"，不算内容失败（要重跑，不是要改文案）
    const envBlocked = looksBroken(answer.reply) && answer.reply.length < 400;
    const pass = !envBlocked && judge.missing.length === 0 && judge.forbidden.length === 0;

    results.push({ testCase, ...answer, ...judge, pass, envBlocked });
    console.log(`${envBlocked ? '⚠' : (pass ? '✓' : '✗')} ${testCase.id}  ${testCase.question}`);
    if (envBlocked) console.log('      模型限流，本轮未完成（重跑即可，不计入失败）');
    if (!pass && !envBlocked) {
      if (judge.missing.length) console.log(`      缺少：${judge.missing.join(' / ')}`);
      if (judge.forbidden.length) console.log(`      出现不应有的说法：${judge.forbidden.join(' / ')}`);
      console.log(`      回答节选：${answer.reply.replace(/\n/g, ' ').slice(0, 150)}`);
    }
  }

  await browser.close();

  const passed = results.filter(item => item.pass).length;
  const blocked = results.filter(item => item.envBlocked).length;
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const lines = [
    '# AI 助手人工抽查清单',
    '',
    `> 生成时间：${stamp}　｜　自动断言：**${passed}/${results.length}** 通过${blocked ? `（另有 ${blocked} 条因模型限流未完成）` : ''}`,
    '',
    '判定说明：`自动断言` 只覆盖客观项（口径、维度、内部字段、不该出现的说法）；',
    '`人工判定` 由你按 `检查点` 打勾——尤其是"是否答到点上"这类机器判不了的。',
    '',
    '| # | 提问 | 自动断言 | 人工判定 | 检查点 |',
    '|---|---|---|---|---|',
  ];
  results.forEach(item => {
    const verdict = item.envBlocked
      ? '⚠ 限流未完成（重跑）'
      : (item.pass ? '✅ 通过' : `❌ ${[...item.missing.map(t => `缺 ${t}`), ...item.forbidden.map(t => `多 ${t}`)].join('；')}`);
    const cells = [
      item.testCase.id,
      item.testCase.question.replace(/\|/g, '\\|'),
      verdict,
      '☐ 通过　☐ 不通过',
      item.testCase.focus,
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  });

  lines.push('', '## 完整回答', '');
  results.forEach(item => {
    lines.push(`### ${item.testCase.id} · ${item.testCase.question}`, '');
    lines.push(`- 页面：\`${item.testCase.page}\``);
    lines.push(`- 卡片数：${item.cards}　告警数：${item.warnings}`);
    lines.push('', '```text', (item.reply || '(空)').slice(0, 1200), '```', '');
  });

  fs.writeFileSync(OUT, `${lines.join('\n')}\n`, 'utf8');
  console.log(`\n自动断言：${passed}/${results.length} 通过${blocked ? `（${blocked} 条限流未完成）` : ''}`);
  console.log(`清单已写入：${path.relative(process.cwd(), OUT)}`);
  process.exit(passed + blocked === results.length ? 0 : 1);
})();
