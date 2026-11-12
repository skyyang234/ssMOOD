// 端到端核对：用真实 Chrome 逐条提问，抓取回复与卡片。
//
// 两个 profile 的计分口径不同（同一个问题，两边的正确行为本来就不一样）：
//   guide（默认）：右下角「使用助手」气泡 —— 不做取数，遇到数据问题会给页面入口，
//                  所以 no_browse 类用例只记录、不计分。
//   data         ：/#/ai「数据助手」页 —— 取数类问题必须直接回答，出现浏览卡才算失败。
//
// 前置条件：
//   1. 本机 dev server 已启动（npm run serve，端口 8787），且 /php 代理指向可用的后端；
//   2. 本机装了 Chrome（可用 --chrome= 覆盖）。
//
// 用法：
//   node eval/run-ui-check.cjs --from=0 --to=13
//   node eval/run-ui-check.cjs --profile=data --from=30 --to=50
//
// 结果逐条追加到 eval/ui-results.jsonl。
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v = ''] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);

const CHROME = args.chrome || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = args.app || 'http://localhost:8787/';
const OUT = path.join(__dirname, `ui-results-${args.profile || 'guide'}.jsonl`);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const PROFILE = args.profile === 'data' ? 'data' : 'guide';
// 气泡版与内嵌页面版同时存在于 /#/ai，必须用不同选择器区分，否则会抓到另一个面板
const PANEL = PROFILE === 'guide' ? '.ss-chat-panel:not(.ss-chat-panel--inline)' : '.ss-chat-panel--inline';

const from = Number(args.from || 0);
const to = Number(args.to || 1000);

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'))
  .filter(item => item.category !== 'slots') // slots 用例是代码级断言，不在 UI 里问
  .slice(from, to);

// 站点可能是英文界面，卡片文案中英文都要能判定
const VALUE_TOKENS = {
  mouse: ['小鼠', 'Mouse', 'mouse'],
  human: ['人', 'Human', 'human'],
  male: ['雄性', 'Male', 'male'],
  female: ['雌性', 'Female', 'female'],
};

function hasArea(blob, value) {
  return new RegExp(`(^|[^A-Za-z0-9])${value}([^A-Za-z0-9]|$)`).test(blob);
}

function judge(testCase, got) {
  // 端到端会做"筛选能否落地"的核对（库里没有的性别会被放宽并说明），
  // 因此同一条用例在浏览器里的期望可能和纯函数层（离线套件）不同。
  const expect = testCase.expectUi || testCase.expect || {};
  const problems = [];
  const cards = got?.cards || [];

  if (expect.routePath === null) {
    // 取数类问题允许出现具体数据集卡（那是答案的一部分），但不应出现"浏览列表"跳转卡
    const routeCards = cards.filter(card => card.kind === 'route');
    if (routeCards.length) {
      problems.push(`不应出现浏览跳转卡，实际 ${routeCards.length} 张：${routeCards.map(c => c.label).join(' / ')}`);
    }
    return problems;
  }
  if (!cards.length) {
    problems.push('没有任何卡片');
    return problems;
  }
  const routeCards = cards.filter(card => card.kind === 'route');
  const blob = (routeCards.length ? routeCards : cards).map(c => `${c.label} ${c.meta}`).join(' | ');

  for (const [key, value] of Object.entries(expect.query || {})) {
    const hit = key === 'area'
      ? hasArea(blob, value)
      : (VALUE_TOKENS[value] || [value]).some(token => blob.includes(token));
    if (!hit) problems.push(`卡片未体现 ${key}=${value}，实际：${blob}`);
  }
  for (const key of expect.notQuery || []) {
    if (key === 'sex' && ['雄性', '雌性', 'Male', 'Female'].some(t => blob.includes(t))) {
      problems.push(`不应出现性别筛选，实际：${blob}`);
    }
  }
  return problems;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const results = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const openPanel = async () => {
      if (PROFILE === 'guide') {
        await page.goto(APP, { waitUntil: 'networkidle2', timeout: 60000 });
        await wait(2500);
        await page.click('.ss-chat-fab');
        await wait(800);
      } else {
        await page.goto(`${APP}#/ai`, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector(PANEL, { timeout: 60000 });
        await wait(1500);
      }
    };
    await openPanel();

    for (const testCase of cases) {
      // 每轮先清空，保证用例互不干扰（气泡版有清空按钮，页面版用「开启新对话」）
      const cleared = await page.evaluate((panel, profile) => {
        if (profile === 'guide') {
          const btn = [...document.querySelectorAll(`${panel} .ss-chat-head button`)]
            .find(b => (b.getAttribute('aria-label') || '').includes('清空'));
          if (btn) { btn.click(); return true; }
          return false;
        }
        const btn = document.querySelector(`${panel} .ss-chat-new-btn`);
        if (btn) { btn.click(); return true; }
        return false;
      }, PANEL, PROFILE);
      if (!cleared) {
        await openPanel();
      }
      await wait(400);

      const beforeCount = await page.evaluate(
        panel => document.querySelectorAll(`${panel} .ss-chat-msg--assistant`).length,
        PANEL
      );

      // 写入问题（CJK 需要走原生 setter，page.type 打不出中文）
      await page.evaluate((panel, question) => {
        const el = document.querySelector(`${panel} textarea.ss-chat-input`);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, question);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
      }, PANEL, testCase.input);
      await wait(200);
      await page.keyboard.press('Enter');

      let got;
      try {
        await page.waitForFunction((panel, prev) => {
          const typing = document.querySelector(`${panel} .ss-chat-typing`);
          const assistants = document.querySelectorAll(`${panel} .ss-chat-msg--assistant`).length;
          return !typing && assistants > prev;
        }, { timeout: 180000, polling: 400 }, PANEL, beforeCount);

        // 回复是逐行渐显的，卡片在文字出现完之后才挂上：
        // 先等一会儿，再等到「文本长度 + 卡片数」连续两次不变，才认为这一轮结束。
        await wait(700);
        let lastSig = '';
        for (let i = 0; i < 30; i += 1) {
          const snap = await page.evaluate((panel) => {
            const msgs = [...document.querySelectorAll(`${panel} .ss-chat-msg--assistant`)];
            const last = msgs[msgs.length - 1];
            if (!last) return { len: 0, cards: 0 };
            return {
              len: String(last.innerText || '').length,
              cards: last.querySelectorAll('.ss-chat-action-card').length,
            };
          }, PANEL);
          const sig = `${snap.len}|${snap.cards}`;
          if (snap.len > 0 && sig === lastSig) break;
          lastSig = sig;
          await wait(200);
        }

        got = await page.evaluate((panel) => {
          const msgs = [...document.querySelectorAll(`${panel} .ss-chat-msg--assistant`)];
          const last = msgs[msgs.length - 1];
          if (!last) return null;
          return {
            reply: (last.querySelector('.ss-chat-bubble')?.innerText || '').trim(),
            cards: [...last.querySelectorAll('.ss-chat-action-card')].map(card => ({
              label: (card.querySelector('strong')?.innerText || '').trim(),
              meta: (card.querySelector('em')?.innerText || '').trim(),
              // route = 浏览/跳转卡；dataset = 具体数据集卡
              kind: ([...card.classList].find(c => c.startsWith('ss-chat-action-card--')) || '')
                .replace('ss-chat-action-card--', ''),
            })),
            warnings: [...last.querySelectorAll('.ss-chat-warning')].map(w => w.innerText.trim()),
          };
        }, PANEL);
      } catch (e) {
        got = { reply: '', cards: [], warnings: [`TIMEOUT: ${e.message}`] };
      }

      const problems = judge(testCase, got);
      // guide 不做取数，遇到数据问题给页面入口是合规的 → no_browse 只记录、不计分
      const informational = PROFILE === 'guide' && testCase.category === 'no_browse';
      const record = {
        id: testCase.id,
        input: testCase.input,
        category: testCase.category,
        profile: PROFILE,
        ok: problems.length === 0,
        informational,
        problems,
        got,
      };
      results.push(record);
      fs.appendFileSync(OUT, `${JSON.stringify(record)}\n`, 'utf8');

      const mark = record.ok ? '✓' : (informational ? '△' : '✗');
      console.log(`${mark} ${record.id}  ${testCase.input}`);
      if (!record.ok) {
        for (const problem of problems) console.log(`      - ${problem}`);
        console.log(`      回复：${(got.reply || '').slice(0, 80).replace(/\n/g, ' ')}`);
      }
    }
  } finally {
    await browser.close();
  }

  const scored = results.filter(item => !item.informational);
  const pass = scored.filter(item => item.ok).length;
  const observed = results.filter(item => item.informational);
  console.log(`\n本批（${PROFILE}）：${pass}/${scored.length} 通过`);
  if (observed.length) {
    console.log(`附带观察（${PROFILE} 下不计分）：no_browse ${observed.filter(i => i.ok).length}/${observed.length} 未给浏览卡`);
  }
})().catch(err => {
  console.error('UI_CHECK_FAILED:', err.message);
  process.exit(1);
});
