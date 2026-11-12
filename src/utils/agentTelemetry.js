// 每轮对话的诊断记录（P6：可观测）。
//
// 目的：把"感觉经常答不上来"变成"知道错在哪一环"。
//   · 是 Plan 失败（模型输出不合法）？
//   · 还是工具没取到数据（能力/参数问题）？
//   · 还是数据本身没有该条件（应该改口径，不是改代码）？
//   · 还是只是慢？
//
// 设计约束：
//   · **不存用户原话**，只存长度/意图/工具名/耗时分段/警告码 —— 避免把科研问题写进浏览器存储；
//   · 环形缓冲，最多 200 轮，存在 localStorage，刷新不丢；
//   · 可一键导出 JSON，便于离线分析或贴给开发者。
//
// 纯前端，不发任何网络请求。

const STORAGE_KEY = 'ssmood.agent.turnlog.v1';
const MAX_RECORDS = 200;

function safeLoad() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_RECORDS) : [];
  } catch (e) {
    return [];
  }
}

let records = safeLoad();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    // 隐私模式 / 配额满：只保留内存记录，不影响对话
  }
}

function countBy(list, pick) {
  const out = {};
  list.forEach(item => {
    const key = String(pick(item) ?? 'unknown');
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function percentile(values, ratio) {
  const nums = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const index = Math.min(nums.length - 1, Math.max(0, Math.round((nums.length - 1) * ratio)));
  return nums[index];
}

/**
 * 记录一轮对话。
 * @param {object} record
 *   intent, planStatus, finalStatus, outcome, tools[], warningList[],
 *   planMs, toolMs, finalMs, totalMs, actionCount, questionChars, profile, locale
 */
export function recordTurn(record = {}) {
  const item = {
    at: new Date().toISOString(),
    profile: record.profile || '',
    locale: record.locale || '',
    intent: record.intent || '',
    planStatus: record.planStatus || '',
    finalStatus: record.finalStatus || '',
    outcome: record.outcome || 'unknown',
    tools: Array.isArray(record.tools) ? record.tools.slice(0, 4) : [],
    warnings: Array.isArray(record.warnings) ? [...new Set(record.warnings)].slice(0, 8) : [],
    planMs: Math.round(record.planMs || 0),
    toolMs: Math.round(record.toolMs || 0),
    finalMs: Math.round(record.finalMs || 0),
    totalMs: Math.round(record.totalMs || 0),
    actionCount: Number(record.actionCount) || 0,
    questionChars: Number(record.questionChars) || 0,
    // 失败细节：429（限流）/ 504（超时）/ timeout（前端中止）/ ok_false（后端明确失败）
    // 没有这一层时，"plan_call_failed" 只是一个笼统标签，无法判断该改限流还是改超时。
    planDetail: String(record.planDetail || ''),
    finalDetail: String(record.finalDetail || ''),
  };
  records.push(item);
  if (records.length > MAX_RECORDS) records = records.slice(-MAX_RECORDS);
  persist();
  if (process.env.NODE_ENV !== 'production') {
    // 控制台留一份，便于当场看
    console.info('[agent-turn]', item);
  }
  return item;
}

export function getTurnRecords() {
  return records.slice();
}

export function clearTurnRecords() {
  records = [];
  persist();
}

/**
 * 汇总：先看这几个数就能判断该往哪修
 *   · planFailRate / finalFailRate —— 高 → 后端稳定性问题
 *   · emptyActionRate          —— 高 → 工具取不到数或意图判错
 *   · slow (p95)               —— 高 → 取数慢，不是"笨"
 *   · warningTop               —— 具体卡在哪一类
 */
export function summarizeTurns(list = records) {
  const total = list.length;
  if (!total) {
    return { total: 0, planFailRate: 0, finalFailRate: 0, emptyActionRate: 0, latency: {}, planStatus: {}, finalStatus: {}, outcomes: {}, warningTop: [], toolsTop: [], intents: {} };
  }
  const planFail = list.filter(item => item.planStatus && item.planStatus !== 'ok').length;
  const finalFail = list.filter(item => item.finalStatus === 'failed').length;
  const emptyAction = list.filter(item => !item.actionCount).length;
  const warnings = countBy(list.flatMap(item => item.warnings || []), value => value);
  const tools = countBy(list.flatMap(item => item.tools || []), value => value);
  const totals = list.map(item => item.totalMs);
  // howto / smalltalk 本来就不需要卡片，把它们算进"零卡片"会虚高，掩盖真问题
  const TEXT_ONLY_INTENTS = new Set(['howto', 'smalltalk', 'out_of_scope', '']);
  const cardNeeded = list.filter(item => !TEXT_ONLY_INTENTS.has(item.intent || ''));
  const emptyAmongCardNeeded = cardNeeded.filter(item => !item.actionCount).length;
  const details = countBy(
    list.filter(item => item.planDetail || item.finalDetail),
    item => [item.planDetail && `plan:${item.planDetail}`, item.finalDetail && `final:${item.finalDetail}`].filter(Boolean).join(' | ')
  );

  return {
    total,
    planFailRate: +(planFail / total).toFixed(3),
    finalFailRate: +(finalFail / total).toFixed(3),
    emptyActionRate: +(emptyAction / total).toFixed(3),
    // 只在"这一轮本该有卡片"的样本里统计空手率，更能反映真实可用性
    emptyAmongCardNeededRate: +(cardNeeded.length ? emptyAmongCardNeeded / cardNeeded.length : 0).toFixed(3),
    planStatus: countBy(list, item => item.planStatus || '(none)'),
    finalStatus: countBy(list, item => item.finalStatus || '(none)'),
    outcomes: countBy(list, item => item.outcome),
    intents: countBy(list, item => item.intent || '(none)'),
    failureDetails: Object.entries(details).sort((a, b) => b[1] - a[1]).slice(0, 6),
    warningTop: Object.entries(warnings).sort((a, b) => b[1] - a[1]).slice(0, 8),
    toolsTop: Object.entries(tools).sort((a, b) => b[1] - a[1]).slice(0, 8),
    latency: {
      p50: percentile(totals, 0.5),
      p95: percentile(totals, 0.95),
      max: Math.max(...totals.filter(Number.isFinite), 0),
      planP50: percentile(list.map(item => item.planMs), 0.5),
      toolP50: percentile(list.map(item => item.toolMs), 0.5),
      finalP50: percentile(list.map(item => item.finalMs), 0.5),
    },
  };
}

export function downloadTurnLog(filename = '') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = filename || `ssmood-agent-turnlog-${stamp}.json`;
  const payload = { exportedAt: new Date().toISOString(), summary: summarizeTurns(), records };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return name;
  } catch (e) {
    return '';
  }
}

// 开发期快捷入口：控制台里 __ssAgent.summary() 直接看汇总
if (typeof window !== 'undefined') {
  window.__ssAgent = {
    summary: () => summarizeTurns(),
    records: () => getTurnRecords(),
    export: () => downloadTurnLog(),
    clear: () => clearTurnRecords(),
  };
}
