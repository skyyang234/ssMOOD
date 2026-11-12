// 卡片预算：一次回答里该出现几张卡、哪几张。
//
// 背景：后端工具会把检索到的每个数据集各生成一张 dataset_card。
// 用户问一个泛问题（比如"AD 的表达图"）时，可能一次弹出 5 张样本卡 + 1 张列表卡，
// 视觉上像"炸了一屏"，实际信息密度却不如一个可筛选的列表页。
//
// 规则（确定性，不依赖模型）：
//   1. 已经有同组学的列表导航卡，且样本卡 ≥3 张 → 样本卡全部收起，只留列表卡；
//   2. 没有列表卡时，样本卡最多 3 张，超出的换成一张"查看全部 N 个"的列表入口；
//   3. 非绘图卡总数上限 8 张。
// 绘图卡不参与预算：它们是用户明确要的图，多一张不该被砍。

const LIST_ROUTE_BY_OMICS = {
  SC: '/browse/SingleCell',
  ST: '/browse/SpatialTranscriptome',
  ATAC: '/browse/atac',
  GWAS: '/browse/gwas',
};

const LIST_ROUTES = new Set(Object.values(LIST_ROUTE_BY_OMICS));
const DATASET_CARD_CAP = 3;
const NON_PLOT_CARD_CAP = 8;

const isPlot = action => action?.type === 'plot' || action?.type === 'plot_card';
const basePath = route => String(route || '').split('?')[0];

function isListNav(action) {
  return action?.type === 'navigate' && LIST_ROUTES.has(basePath(action.route));
}

export function budgetActions(actions = [], { locale = 'zh' } = {}) {
  const list = Array.isArray(actions) ? actions.filter(Boolean) : [];
  if (!list.length) return list;

  const zh = String(locale || '').toLowerCase().startsWith('zh');
  const plots = list.filter(isPlot);
  const rest = list.filter(action => !isPlot(action));
  const datasets = rest.filter(action => action.type === 'dataset_card');
  const others = rest.filter(action => action.type !== 'dataset_card');

  // 1. 有列表入口时，样本卡只是"同一件事的碎片"，全部收起
  if (datasets.length >= DATASET_CARD_CAP && others.some(isListNav)) {
    return [...others.slice(0, NON_PLOT_CARD_CAP), ...plots];
  }

  // 2. 没有列表入口：留前 3 张，其余换成一张列表入口
  const keptDatasets = datasets.slice(0, DATASET_CARD_CAP);
  const overflowNav = [];
  if (datasets.length > DATASET_CARD_CAP) {
    const omics = String(datasets[0]?.omicsType || '').toUpperCase();
    const route = LIST_ROUTE_BY_OMICS[omics];
    if (route) {
      overflowNav.push({
        type: 'navigate',
        route,
        label: zh ? `查看全部样本（${datasets.length} 个）` : `View all ${datasets.length} samples`,
      });
    }
  }

  const merged = [...others, ...keptDatasets, ...overflowNav, ...plots];
  // 3. 非绘图卡兜底上限（正常情况下到不了这里）
  const nonPlot = merged.filter(action => !isPlot(action)).slice(0, NON_PLOT_CARD_CAP);
  return [...nonPlot, ...merged.filter(isPlot)];
}
