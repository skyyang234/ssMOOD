// 多轮会话的本地存储模型（纯函数，可在 node 里直接测）。
//
// 之前只有"当前这一条对话"：关掉标签页就没了，也没法回看上周那轮。
// 这里把存储升级成「会话列表 + 当前会话 id」，并保留旧格式的迁移路径。
//
// 存储形态（sessionStorage）：
//   { activeId: 's1', sessions: [ { id, title, at, messages: [...] } ] }
// sessions 按 at 倒序，最多 MAX_SESSIONS 条。

export const CHAT_STORE_PREFIX = 'ssmood.agent.sessions.v2';
export const LEGACY_STORE_PREFIX = 'ssmood.agent.chat.v1';
export const MAX_SESSIONS = 10;
export const TITLE_MAX = 18;

export function chatStoreKey(profile = 'data', mode = 'page') {
  return `${CHAT_STORE_PREFIX}.${profile}.${mode}`;
}

export function legacyStoreKey(profile = 'data', mode = 'page') {
  return `${LEGACY_STORE_PREFIX}.${profile}.${mode}`;
}

export function emptyStore() {
  return { activeId: '', sessions: [] };
}

export function createSessionId(now = Date.now(), rand = Math.random()) {
  return `s${now.toString(36)}${String(rand).slice(2, 6)}`;
}

// 标题取首个问题；太长截断，避免把整段话塞进下拉框
export function titleFromQuestion(text = '') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX)}…` : clean;
}

function normalizeMessages(list) {
  return (Array.isArray(list) ? list : [])
    .filter(item => item && (item.role === 'user' || item.role === 'assistant'))
    .map(item => ({ ...item }));
}

export function normalizeSession(session = {}, fallbackNow = Date.now()) {
  const messages = normalizeMessages(session.messages);
  return {
    id: String(session.id || createSessionId(fallbackNow)),
    // 标题为空时用第一条用户消息兜底：历史里不该出现一行空白
    title: String(session.title || '').trim() || titleFromQuestion(firstUserText(messages)),
    // 不能写 `Number(x) || now`：at=0 会被当成空值替换成当前时间，
    // 于是这条会话永远排最前、也永远不被上限淘汰。
    at: Number.isFinite(Number(session.at)) ? Number(session.at) : fallbackNow,
    messages,
  };
}

export function firstUserText(messages = []) {
  const hit = (Array.isArray(messages) ? messages : []).find(item => item?.role === 'user');
  return String(hit?.text || hit?.content || '');
}

// 兼容三种输入：新格式对象 / 旧格式消息数组 / 坏数据
export function parseStore(raw, now = Date.now()) {
  if (!raw) return emptyStore();
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return emptyStore();
  }

  // 旧格式：直接是一个消息数组
  if (Array.isArray(data)) {
    const messages = normalizeMessages(data);
    if (!messages.length) return emptyStore();
    const session = normalizeSession({ messages }, now);
    return { activeId: session.id, sessions: [session] };
  }

  if (!data || !Array.isArray(data.sessions)) return emptyStore();
  const sessions = data.sessions
    .map(item => normalizeSession(item, now))
    .filter(item => item.messages.length)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_SESSIONS);
  if (!sessions.length) return emptyStore();
  // activeId 显式为空 = "当前没有打开的会话"（点过「开启新对话」但还没提问），
  // 这种情况不要强行接回最近一条，否则刷新后又"自己跳回来"。
  if (data.activeId === '') return { activeId: '', sessions };
  const activeId = sessions.some(item => item.id === data.activeId) ? data.activeId : sessions[0].id;
  return { activeId, sessions };
}

export function serializeStore(store = {}) {
  return JSON.stringify({ activeId: store.activeId || '', sessions: store.sessions || [] });
}

// 写入一条会话：同 id 覆盖，并把它移到最前（最近使用优先）
export function upsertSession(store = {}, session = {}, { max = MAX_SESSIONS } = {}) {
  const current = Array.isArray(store.sessions) ? store.sessions : [];
  const normalized = normalizeSession(session);
  if (!normalized.messages.length) return { ...store, sessions: current };
  const rest = current.filter(item => item.id !== normalized.id);
  const sessions = [normalized, ...rest].sort((a, b) => b.at - a.at).slice(0, max);
  return { activeId: normalized.id, sessions };
}

export function removeSession(store = {}, id = '') {
  const sessions = (Array.isArray(store.sessions) ? store.sessions : []).filter(item => item.id !== id);
  if (!sessions.length) return emptyStore();
  const activeId = store.activeId === id ? sessions[0].id : store.activeId;
  return { activeId, sessions };
}

// 相对时间：下拉框里显示"3 分钟前"比时间戳好读
export function relativeTime(at, { now = Date.now(), locale = 'zh' } = {}) {
  const zh = String(locale || '').toLowerCase().startsWith('zh');
  const diff = Math.max(0, now - Number(at || 0));
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return zh ? '刚刚' : 'just now';
  if (diff < hour) return zh ? `${Math.floor(diff / minute)} 分钟前` : `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return zh ? `${Math.floor(diff / hour)} 小时前` : `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return zh ? `${Math.floor(diff / day)} 天前` : `${Math.floor(diff / day)}d ago`;
  const date = new Date(Number(at) || 0);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');
  return `${month}-${dayOfMonth}`;
}
