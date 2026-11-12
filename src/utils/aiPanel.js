// AI 面板的共享开关状态。
//
// 为什么需要它：面板原本只能由页面右下角的悬浮按钮自己打开（组件内部 ref）。
// 现在「使用助手」要从顶部导航栏打开，而导航栏与 AiChatWidget 是兄弟组件
// （都在 App.vue 下），所以用一个模块级 reactive 状态做通信。
//
// 只允许同时打开一个面板：openProfile 记录当前打开的是哪一份 profile。
// 以后同时挂载 guide + data 两个实例时，两边各自判断 openProfile === 自己的 profile，
// 天然不会出现两个面板互相叠着。

import { reactive } from 'vue';
import { getAgentProfile, DEFAULT_AGENT_PROFILE } from './agentProfiles';

export const aiPanelState = reactive({
  openProfile: '', // '' = 全部关闭
});

export function isPanelOpen(profileId) {
  return aiPanelState.openProfile === String(profileId || '');
}

export function openPanel(profileId = DEFAULT_AGENT_PROFILE) {
  aiPanelState.openProfile = String(profileId || DEFAULT_AGENT_PROFILE);
}

export function closePanel(profileId) {
  // 不传 profileId 时无条件关闭；传了就只关闭自己那一个。
  if (profileId == null || aiPanelState.openProfile === String(profileId)) {
    aiPanelState.openProfile = '';
  }
}

export function togglePanel(profileId = DEFAULT_AGENT_PROFILE) {
  if (isPanelOpen(profileId)) closePanel(profileId);
  else openPanel(profileId);
}

/**
 * 预留接口：两个助手之间的互相转交。
 *
 * 数据助手上线前，guide.handoff.enabled === false，这里是**安全空操作**并返回 false，
 * 调用方据此决定要不要渲染「转交」按钮，因此现在就可以在提示词/UI 里布局，
 * 不会出现「指向不存在入口」的死按钮。
 *
 * 上线步骤：agentProfiles.js 里把对应 profile 的 handoff.enabled 改为 true，
 * 并把数据助手实例挂到 App.vue，其余代码不用动。
 */
export function requestAgentHandoff(fromProfileId, targetProfileId) {
  const from = getAgentProfile(fromProfileId);
  const targetId = targetProfileId || from?.handoff?.target;
  if (!from?.handoff?.enabled || !targetId) return false;
  openPanel(targetId);
  return true;
}

// 当前 profile 是否提供可用的转交（用于决定是否渲染按钮）。
export function handoffAvailable(profileId) {
  const profile = getAgentProfile(profileId);
  return Boolean(profile?.handoff?.enabled && profile?.handoff?.target);
}

// ── 会话交接：气泡（使用助手）→ 导航栏「AI」（数据助手）──
//
// 默认两边历史完全独立（各自一个组件实例，各自一个 messages）。
// 只有这两种时机才把气泡的对话带过去：
//   ① 用户在气泡里显式点「转到数据助手」；
//   ② 气泡判断当前问题需要数据/画图能力，提示后由用户一键转交。
// 交接后由目标面板 consumeHandoff() 取走并清空，避免重复注入。
export const handoffState = reactive({ to: '', messages: null, at: 0 });

export function handoffConversation({ from, to, messages } = {}) {
  const target = to || getAgentProfile(from)?.handoff?.target;
  if (!target) return false;
  handoffState.to = String(target);
  handoffState.messages = Array.isArray(messages) ? messages.slice() : [];
  handoffState.at = Date.now();
  openPanel(target);
  return true;
}

// 目标面板在挂载/打开时调用：取了就清空，保证只注入一次。
export function consumeHandoff(profileId) {
  if (handoffState.to !== String(profileId || '')) return null;
  const payload = { messages: handoffState.messages || [], at: handoffState.at };
  handoffState.to = '';
  handoffState.messages = null;
  return payload;
}
