// 把「模型对用户话的理解」翻译成站内可执行的导航动作。
//
// P1 的核心：**模型只负责填 slots，URL 一律由这里拼**。
//   —— 模型不再自己写路径，模型写死链的问题从根上消失；
//   —— 新增说法（"公的""老老鼠""single cell"）不需要改任何正则。
//
// P4：筛选的归一化、拼 URL、写文案已全部下沉到 agentFilters.js，
// 本文件只保留「slots → 一个列表页导航动作」这一层胶水。
//
// 本文件是纯函数，不依赖 Vue / 网络，可直接被 eval 引用做回归测试。
import {
  NAV_PAGE_BY_MODALITY,
  ALLOWED_SPECIES,
  ALLOWED_SEX,
  AREA_BY_SPECIES,
  AREA_BY_PAGE,
  normalizeSlotValues,
  buildListQuery,
  describeFilters,
  hasFilters,
} from './agentFilters';

export { NAV_PAGE_BY_MODALITY, ALLOWED_SPECIES, ALLOWED_SEX, AREA_BY_SPECIES, AREA_BY_PAGE };

export const PAGE_LABEL = {
  SC: { zh: '单细胞样本列表', en: 'single-cell sample list' },
  ST: { zh: '空转样本列表', en: 'spatial sample list' },
  ATAC: { zh: 'ATAC 样本列表', en: 'ATAC sample list' },
};

function text(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

// 兼容旧调用名：归一化逻辑在 agentFilters 里
export function normalizeSlots(raw = {}) {
  return normalizeSlotValues(raw);
}

export function hasSlotFilters(slots) {
  return hasFilters(slots);
}

/**
 * slots → 导航动作
 * @param {object} rawSlots 模型给出的原始 slots
 * @param {{ isZh?: boolean, modality?: string }} options 语言 + 兜底模态（页面上下文可提供）
 */
export function buildNavActionsFromSlots(rawSlots, options = {}) {
  const isZh = options.isZh !== false;
  const slots = normalizeSlotValues(rawSlots || {});

  // 模态优先取 slots，其次取传入的兜底（例如当前页面就是空转列表）
  const fallbackModality = text(options.modality).toUpperCase();
  const modality = slots.modality || (NAV_PAGE_BY_MODALITY[fallbackModality] ? fallbackModality : null);

  if (!modality) return [];
  if (!hasFilters(slots)) return []; // 没有任何筛选条件就不给列表链接，避免无意义的跳转

  const page = NAV_PAGE_BY_MODALITY[modality];
  const label = PAGE_LABEL[modality] || { zh: '样本列表', en: 'sample list' };
  const extra = describeFilters(slots, isZh);

  return [{
    type: 'navigate',
    route: page + buildListQuery(slots, page),
    label: extra
      ? (isZh ? `浏览${label.zh}（${extra}）` : `Browse ${label.en} (${extra})`)
      : (isZh ? `浏览${label.zh}` : `Browse ${label.en}`),
  }];
}

// Plan 返回体里 slots 可能叫不同名字，做一层兼容
export function slotsFromPlan(plan = {}) {
  if (!plan || typeof plan !== 'object') return null;
  const raw = plan.slots || plan.slot || plan.filters || plan.entities;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw;
}
