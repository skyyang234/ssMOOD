// 前端原生 UMAP 聚类图绘制：纯前端拉取单细胞 UMAP 坐标并构造 Plotly payload，
// 不经过 LLM 拼 payload，也不走后端 build_plot_action（该技能不支持 umap 坐标）。
// 这是「画图操作固定为前端代码」的落点：模型只需触发 plot_umap 并提供数据集，
// 具体散点构造完全由本模块确定性完成，保证每次都能画出正确的 UMAP 图。
//
// 坐标口径（按需求固定）：
//   - 勾选 1 个样本 → 用该样本的单样本坐标（umap_single_x/y，scd_getSingleUmapdata.php）；
//   - 勾选 2 个及以上样本 → 用整合坐标（umap_x/y，scd_getIntegratedUmapdata.php）。
//
// 多样本布局：
//   - 默认「叠加」：整合坐标的本质就是多个样本落在同一空间里可比，因此叠在同一个坐标系画，
//     颜色 = 聚类（全局统一配色），形状 = 样本（每样本一种 marker symbol）；
//   - 用户明确要求「分别 / 各自 / 单独 / 分开」时用「并排面板」：每样本一个子图域；
//   - 各样本整合坐标包围盒不相交（不在同一整合空间）时自动退回并排面板并说明。
//   - 两种布局都按分位数设定坐标范围：整合空间里少量偏离主 manifold 的细胞
//     （doublet / 低质细胞）若参与 min/max，会把轴拉到几万，主体数据被压成一个小角——
//     这正是"某个样本看不见"的根因。
import config from '@/config';
import { parseMaybeGzipJson } from '@/utils/api';
import { displayLabelFor, candidateIdsFor } from './agentSampleCatalog';

// 与详情页一致的散点配色（前 20 个固定，超出循环复用），保证不同聚类可区分。
const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  '#86bcb6', '#d37295', '#a0cbe8', '#ffbe7d', '#8cd17d',
  '#b6992d', '#499894', '#7b848f', '#cfcfcf', '#e8c1a0',
];

const OTHER_COLOR = 'rgba(150,150,150,0.5)';

// 每样本一种 marker 形状（scattergl 支持的标准符号），用于叠加图区分样本。
const SAMPLE_SYMBOLS = ['circle', 'square', 'diamond', 'cross', 'triangle-up', 'triangle-down', 'star', 'hexagram'];
const SAMPLE_SYMBOL_CHARS = ['●', '■', '◆', '✕', '▲', '▼', '★', '✶'];

function colorForLabel(index) {
  return PALETTE[index % PALETTE.length];
}

// ── 多样本布局与体积上限 ──
const MAX_SAMPLES_PER_PLOT = 8; // 一张图最多叠加/并排的样本数，超出取前 N 个并提示
const MAX_CLUSTERS_PER_SAMPLE = 20; // 每个样本独立上色的聚类数，其余合并为「其他」
const MAX_POINTS_PER_SAMPLE = 5000; // 每个样本的绘制点数上限，超出按步长抽样（防 payload 超限）
const PER_CLUSTER_POINT_CAP = Math.ceil(MAX_POINTS_PER_SAMPLE / (MAX_CLUSTERS_PER_SAMPLE + 1));

function sortLabels(labels) {
  return [...labels].sort((a, b) => {
    const na = String(a).match(/\d+/);
    const nb = String(b).match(/\d+/);
    if (na && nb) return parseInt(na[0], 10) - parseInt(nb[0], 10);
    if (na) return -1;
    if (nb) return 1;
    return String(a).localeCompare(String(b));
  });
}

// 按坐标口径取一个样本的 UMAP 数据；取不到返回 null（调用方如实报错，绝不编造散点）。
async function fetchUmapDataForDataset(datasetId, { scope = 'integrated' } = {}) {
  const params = new URLSearchParams({ id: String(datasetId) }).toString();
  const request = async (endpoint, extra = '') => {
    try {
      const response = await fetch(`${config.apiUrl}${endpoint}?${params}${extra}`);
      if (!response.ok) return null;
      const data = parseMaybeGzipJson(await response.arrayBuffer());
      if (data && Array.isArray(data.umap_data) && data.umap_data.length) return data;
      return null;
    } catch (e) {
      return null;
    }
  };
  if (scope === 'single') {
    // 单样本坐标优先；该样本没有单样本坐标时退回整合坐标，绝不因为取不到就空白。
    return (await request('scd_getSingleUmapdata.php'))
      || (await request('scd_getumapdata.php', '&scope=single'))
      || null;
  }
  // 多样本用整合坐标；无整合坐标时退回单样本坐标。
  return (await request('scd_getIntegratedUmapdata.php'))
    || (await request('scd_getumapdata.php'))
    || (await request('scd_getSingleUmapdata.php'))
    || null;
}

// 逐个候选 id 试取 UMAP 坐标：目录 id（sample_name）→ 数字 sample_id → 原键。
// 任一成功即用，避免因 id 形态与接口不符而把样本静默丢掉。
async function fetchUmapWithFallback(id, { scope } = {}) {
  const candidates = await candidateIdsFor(id);
  for (const cand of candidates) {
    const payload = await fetchUmapDataForDataset(cand, { scope });
    if (payload) return { payload, usedId: cand };
  }
  return { payload: null, usedId: candidates[0] || String(id || '') };
}

// ── 基因着色用的「全量点」按需获取 ──
// 图上的点是等间隔抽样的（防 payload 超限），但按基因着色时必须把「所有表达该基因的细胞」
// 都画出来，否则落在被抽样丢弃的点上的表达会整体消失 —— 表现为表达模式不完整
// （例如某亚群该基因全阳，抽样后只剩零星红点）。
// 缓存键带上 scope：single 与 integrated 是两套坐标系，混用会让补充点整体错位。
const fullPointsCache = new Map();

export function clearFullUmapPointsCache() {
  fullPointsCache.clear();
}

// 返回该样本的全量细胞坐标 [{i,u1,u2,c}]；取不到返回 null（调用方如实降级，不编造）。
export async function fetchFullUmapPoints(datasetId, scope = 'single') {
  const key = `${scope}:${String(datasetId || '').trim()}`;
  if (fullPointsCache.has(key)) return fullPointsCache.get(key);
  const { payload } = await fetchUmapWithFallback(datasetId, { scope });
  const points = payload && Array.isArray(payload.umap_data) && payload.umap_data.length
    ? payload.umap_data
    : null;
  fullPointsCache.set(key, points);
  return points;
}

// 确定性步长抽样：点数超上限时等间隔取点，保证每次绘制结果一致。
function strideSample(indices, cap) {
  if (indices.length <= cap) return indices;
  const out = [];
  const step = indices.length / cap;
  for (let i = 0; i < cap; i += 1) out.push(indices[Math.floor(i * step)]);
  return out;
}

// 按聚类分组；聚类数超过 maxClusters 时按细胞数保留前 N 个，其余归入「其他」。
function groupByCluster(umapData, maxClusters) {
  const counts = new Map();
  umapData.forEach(d => counts.set(d.c, (counts.get(d.c) || 0) + 1));
  const all = [...counts.keys()];
  let kept = sortLabels(all);
  const merged = kept.length > maxClusters;
  if (merged) {
    kept = [...all]
      .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
      .slice(0, maxClusters);
  }
  const keptSet = new Set(kept);
  const byLabel = new Map();
  const otherIdxs = [];
  umapData.forEach((d, i) => {
    if (keptSet.has(d.c)) {
      if (!byLabel.has(d.c)) byLabel.set(d.c, []);
      byLabel.get(d.c).push(i);
    } else {
      otherIdxs.push(i);
    }
  });
  return { kept, byLabel, otherIdxs, merged };
}

function makeTrace(idxs, umapData, name, color, xaxis, yaxis, symbol) {
  return {
    x: idxs.map(i => parseFloat(umapData[i].u1)),
    y: idxs.map(i => parseFloat(umapData[i].u2)),
    mode: 'markers',
    type: 'scattergl',
    name,
    text: idxs.map(i => umapData[i].i),
    marker: { size: 4, color, opacity: 0.8, symbol: symbol || 'circle' },
    xaxis,
    yaxis,
  };
}

// 稳健坐标范围：取 0.5%–99.5% 分位数并留 3% 边距。
// 用 min/max 会被极端离群点绑架（轴拉到几万、主体数据压成小角），分位数则只看主体分布。
function robustRange(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  const sorted = [...finite].sort((a, b) => a - b);
  const pick = q => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))];
  let lo = pick(0.005);
  let hi = pick(0.995);
  if (!(hi > lo)) {
    const pad = Math.max(Math.abs(lo) * 0.05, 1);
    return [lo - pad, hi + pad];
  }
  const pad = (hi - lo) * 0.03;
  return [lo - pad, hi + pad];
}

function countOutsideRange(values, range) {
  if (!range) return 0;
  return values.reduce((n, v) => (Number.isFinite(v) && (v < range[0] || v > range[1]) ? n + 1 : n), 0);
}

// 样本整合坐标的稳健包围盒，用于判断多个样本是否在同一整合空间。
function robustBox(umapData) {
  const xs = [];
  const ys = [];
  umapData.forEach(d => {
    const x = parseFloat(d.u1);
    const y = parseFloat(d.u2);
    if (Number.isFinite(x)) xs.push(x);
    if (Number.isFinite(y)) ys.push(y);
  });
  const xr = robustRange(xs);
  const yr = robustRange(ys);
  if (!xr || !yr) return null;
  return { minU1: xr[0], maxU1: xr[1], minU2: yr[0], maxU2: yr[1] };
}

function boxesIntersect(a, b) {
  if (!a || !b) return false;
  return !(a.maxU1 < b.minU1 || b.maxU1 < a.minU1 || a.maxU2 < b.minU2 || b.maxU2 < a.minU2);
}

// 多样本共用的提示：聚类合并、点数抽样。
function commonWarnings(grouped, samples, isZh) {
  const warnings = [];
  if (grouped.some(g => g.merged)) {
    warnings.push(isZh
      ? `部分样本聚类较多，每个样本仅展示细胞数最多的 ${MAX_CLUSTERS_PER_SAMPLE} 个聚类，其余合并为「其他」。`
      : `Some samples have many clusters: only the ${MAX_CLUSTERS_PER_SAMPLE} largest per sample are shown; the rest are merged into "Other".`);
  }
  if (samples.some(s => s.umapData.length > MAX_POINTS_PER_SAMPLE)) {
    warnings.push(isZh
      ? '部分样本点数较多，已等间隔抽样绘制，hover 仍可查看真实细胞 ID。'
      : 'Some samples have many points and were evenly subsampled for rendering; hover still shows real cell ids.');
  }
  return warnings;
}

// 单样本：单样本坐标、聚类上图例（保持原有行为，不做点数抽样）。
// 坐标范围同样按分位数设定，避免该样本自身的离群点把图压成小角。
function buildSingleSamplePayload(sample, { isZh } = {}) {
  const { umapData } = sample;
  const { kept, byLabel, otherIdxs, merged } = groupByCluster(umapData, 180);
  const data = kept.map((label, idx) => makeTrace(
    byLabel.get(label) || [], umapData, String(label), colorForLabel(idx), 'x', 'y', 'circle',
  ));
  if (merged && otherIdxs.length) {
    data.push(makeTrace(otherIdxs, umapData, isZh ? '其他' : 'Other', OTHER_COLOR, 'x', 'y', 'circle'));
  }
  const allX = [];
  const allY = [];
  umapData.forEach(d => { allX.push(parseFloat(d.u1)); allY.push(parseFloat(d.u2)); });
  const xRange = robustRange(allX);
  const yRange = robustRange(allY);
  const layout = {
    xaxis: { title: { text: 'UMAP 1' }, zeroline: false, range: xRange || undefined },
    // scaleanchor 保持两轴等比例，避免图被拉伸变形。
    yaxis: { title: { text: 'UMAP 2' }, zeroline: false, scaleanchor: 'x', range: yRange || undefined },
    legend: { title: { text: isZh ? '细胞类型 / 聚类' : 'Cell type / cluster' } },
    hovermode: 'closest',
  };
  const warnings = [];
  if (merged) {
    warnings.push(isZh
      ? `聚类数量较多，仅展示细胞数最多的 180 个聚类，其余合并为「其他」。`
      : 'Too many clusters: only the 180 largest are shown separately; the rest are merged into "Other".');
  }
  const clipped = countOutsideRange(allX, xRange) + countOutsideRange(allY, yRange);
  if (clipped > 0) {
    warnings.push(isZh
      ? `已按 99.5% 分位数设定显示范围，${clipped} 个极端离群点未在图中显示。`
      : `Display range set at the 99.5th percentile; ${clipped} extreme outlier points are not shown.`);
  }
  return { data, layout, warnings };
}

// 多样本默认布局：叠加到同一坐标系（整合坐标的本来用途）。
// 颜色 = 聚类（全局统一配色，同聚类在所有样本同色）；形状 = 样本（每样本一种 symbol）。
function buildOverlayPayload(samples, { isZh } = {}) {
  const grouped = samples.map(sample => ({
    sample,
    ...groupByCluster(sample.umapData, MAX_CLUSTERS_PER_SAMPLE),
  }));
  const globalKept = sortLabels([...new Set(grouped.flatMap(g => g.kept))]);
  const colorMap = new Map(globalKept.map((label, i) => [label, colorForLabel(i)]));

  // 先按 (样本 × 聚类) 组装点集，再统一计算稳健坐标范围。
  const traces = [];
  grouped.forEach((g, si) => {
    const symbol = SAMPLE_SYMBOLS[si % SAMPLE_SYMBOLS.length];
    const push = (label, idxs, mergedFlag) => {
      if (!idxs.length) return;
      traces.push({
        name: `${g.sample.label} · ${label}`,
        symbol,
        color: mergedFlag ? OTHER_COLOR : colorMap.get(label),
        idxs,
        umapData: g.sample.umapData,
      });
    };
    g.kept.forEach(label => push(label, strideSample(g.byLabel.get(label) || [], PER_CLUSTER_POINT_CAP), false));
    if (g.merged) push(isZh ? '其他' : 'Other', strideSample(g.otherIdxs, PER_CLUSTER_POINT_CAP), true);
  });

  const allX = [];
  const allY = [];
  traces.forEach(t => t.idxs.forEach(i => {
    allX.push(parseFloat(t.umapData[i].u1));
    allY.push(parseFloat(t.umapData[i].u2));
  }));
  const xRange = robustRange(allX);
  const yRange = robustRange(allY);

  const data = traces.map(t => makeTrace(t.idxs, t.umapData, t.name, t.color, 'x', 'y', t.symbol));
  const layout = {
    xaxis: { title: { text: 'UMAP 1' }, zeroline: false, range: xRange || undefined },
    // scaleanchor 保证 UMAP 两轴等比例：去掉它图会被拉伸变形（比例失调），必须保留。
    // 缩放框跟不住鼠标的真正原因不是它，而是警告区文案变化挤压画布后 Plotly 未重排
    // （见 AgentPlotModal 里的 plotWarnings resize watcher），那里修复不影响此处外观。
    yaxis: { title: { text: 'UMAP 2' }, zeroline: false, scaleanchor: 'x', range: yRange || undefined },
    // 样本 × 聚类的图例会上百条，隐藏；编码方式写在副标题里。
    showlegend: false,
    hovermode: 'closest',
    margin: { t: 16, r: 16, b: 44, l: 56 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  const warnings = commonWarnings(grouped, samples, isZh);
  const clipped = countOutsideRange(allX, xRange) + countOutsideRange(allY, yRange);
  if (clipped > 0) {
    warnings.push(isZh
      ? `已按 99.5% 分位数设定显示范围，${clipped} 个极端离群点未在图中显示。`
      : `Display range set at the 99.5th percentile; ${clipped} extreme outlier points are not shown.`);
  }
  return { data, layout, warnings };
}

// 多样本备选布局：并排面板（用户明确要求「分别 / 各自 / 单独 / 分开」时使用）。
// 每样本一个子图域（domain）+ 显式 anchor + 分位数范围，各自自动完整显示。
function buildPanelsPayload(samples, { isZh } = {}) {
  const grouped = samples.map(sample => ({
    sample,
    ...groupByCluster(sample.umapData, MAX_CLUSTERS_PER_SAMPLE),
  }));
  const globalKept = sortLabels([...new Set(grouped.flatMap(g => g.kept))]);
  const colorMap = new Map(globalKept.map((label, i) => [label, colorForLabel(i)]));

  const total = samples.length;
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const data = [];
  const layout = {
    showlegend: false,
    hovermode: 'closest',
    margin: { t: 30, r: 12, b: 12, l: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    annotations: [],
  };

  grouped.forEach((g, index) => {
    const gx = index % cols;
    const gy = Math.floor(index / cols);
    // 布局键是 xaxis / xaxis2…，但 trace 引用坐标轴要用标准写法 x / x2
    // （写成 'xaxis2' 不被识别会回退到第 1 根轴，第二块面板就画到左面板上、跑出范围而看不见）。
    const xAxisKey = index === 0 ? 'xaxis' : `xaxis${index + 1}`;
    const yAxisKey = index === 0 ? 'yaxis' : `yaxis${index + 1}`;
    const xRef = index === 0 ? 'x' : `x${index + 1}`;
    const yRef = index === 0 ? 'y' : `y${index + 1}`;

    // 先收集本面板的点，再按分位数设定范围（防该样本的离群点把面板压成小角）。
    const panelTraces = [];
    g.kept.forEach(label => {
      const idxs = strideSample(g.byLabel.get(label) || [], PER_CLUSTER_POINT_CAP);
      if (idxs.length) panelTraces.push({ label, idxs, mergedFlag: false });
    });
    if (g.merged && g.otherIdxs.length) {
      panelTraces.push({ label: isZh ? '其他' : 'Other', idxs: strideSample(g.otherIdxs, PER_CLUSTER_POINT_CAP), mergedFlag: true });
    }
    const xs = [];
    const ys = [];
    panelTraces.forEach(t => t.idxs.forEach(i => {
      xs.push(parseFloat(g.sample.umapData[i].u1));
      ys.push(parseFloat(g.sample.umapData[i].u2));
    }));
    const xr = robustRange(xs);
    const yr = robustRange(ys);

    layout[xAxisKey] = {
      domain: [gx / cols, (gx + 1) / cols],
      anchor: yAxisKey,
      range: xr || undefined,
      visible: false,
      showgrid: false,
      zeroline: false,
    };
    layout[yAxisKey] = {
      domain: [1 - (gy + 1) / rows, 1 - gy / rows],
      anchor: xAxisKey,
      // 每个面板各自锁定 x:y 等比例，避免面板被拉伸成变形（面板域宽高比与数据无关）。
      scaleanchor: xRef,
      range: yr || undefined,
      visible: false,
      showgrid: false,
      zeroline: false,
    };
    // 面板顶部标注样本名，弥补隐藏坐标轴后无法区分面板的问题。
    layout.annotations.push({
      xref: 'paper',
      yref: 'paper',
      x: (gx + 0.5) / cols,
      y: 1 - gy / rows - 0.008,
      text: g.sample.label,
      showarrow: false,
      font: { size: 11, color: '#27364a' },
    });
    panelTraces.forEach(t => data.push(makeTrace(
      t.idxs, g.sample.umapData, `${g.sample.label} · ${t.label}`,
      t.mergedFlag ? OTHER_COLOR : colorMap.get(t.label), xRef, yRef, 'circle',
    )));
  });

  const warnings = commonWarnings(grouped, samples, isZh);
  return { data, layout, warnings };
}

// 构造可直接交给 AgentPlotModal 渲染的 plot 动作。
// datasetIds 支持一个或多个；一个 → 单样本坐标；多个 → 整合坐标，默认叠加到同一坐标系，
// layout='panels' 或各样本不在同一整合空间时改为并排面板。
// 返回 null 表示一个样本都没取到坐标（调用方据此如实报错，绝不编造散点）。
export async function buildUmapPlotAction({ datasetId, datasetIds, isZh = true, layout } = {}) {
  const requested = (Array.isArray(datasetIds) && datasetIds.length
    ? datasetIds
    : (datasetId ? [datasetId] : []))
    .map(v => String(v || '').trim())
    .filter(Boolean);
  const ids = [...new Set(requested)];
  if (!ids.length) return null;
  const scope = ids.length >= 2 ? 'integrated' : 'single';

  const settled = await Promise.all(ids.map(async id => {
    // 容忍调用方传展示名 / 数字 id：逐个候选试取坐标，避免样本被静默丢弃。
    const { payload, usedId } = await fetchUmapWithFallback(id, { scope });
    const label = await displayLabelFor(usedId).catch(() => '');
    return {
      datasetId: usedId,
      label: label || id,
      umapData: payload && Array.isArray(payload.umap_data) ? payload.umap_data : [],
    };
  }));

  const loaded = settled.filter(s => s.umapData.length);
  if (!loaded.length) return null;

  const warnings = [];
  const missing = settled.filter(s => !s.umapData.length).map(s => s.label || s.datasetId);
  if (missing.length) {
    warnings.push(isZh
      ? `未能获取以下样本的 UMAP 坐标，已跳过：${missing.join('、')}`
      : `No UMAP coordinates for ${missing.join(', ')}; skipped.`);
  }
  let samples = loaded;
  if (samples.length > MAX_SAMPLES_PER_PLOT) {
    warnings.push(isZh
      ? `一次最多绘制 ${MAX_SAMPLES_PER_PLOT} 个样本，已绘制前 ${MAX_SAMPLES_PER_PLOT} 个。`
      : `At most ${MAX_SAMPLES_PER_PLOT} samples per plot; showing the first ${MAX_SAMPLES_PER_PLOT}.`);
    samples = samples.slice(0, MAX_SAMPLES_PER_PLOT);
  }

  // ── 布局决策 ──
  // 默认叠加（整合坐标同一空间才可比）；用户明确要分别看 → 面板；空间不相交 → 面板 + 说明。
  let mode = 'single';
  if (samples.length >= 2) {
    const boxes = samples.map(s => robustBox(s.umapData));
    const sameSpace = boxes.every((box, i) => i === 0 || boxesIntersect(boxes[0], box));
    if (layout === 'panels') {
      mode = 'panels';
    } else if (!sameSpace) {
      mode = 'panels';
      warnings.push(isZh
        ? '这些样本的整合坐标不在同一空间，无法叠加到同一坐标系，已改为并排展示。'
        : 'These samples are not in a shared integrated space; they are shown as separate panels instead of overlaid.');
    } else {
      mode = 'overlay';
    }
  }

  const built = mode === 'single'
    ? buildSingleSamplePayload(samples[0], { isZh })
    : (mode === 'overlay' ? buildOverlayPayload(samples, { isZh }) : buildPanelsPayload(samples, { isZh }));

  let title;
  let subtitle;
  if (mode === 'single') {
    title = isZh ? `单细胞 UMAP 聚类图 · ${samples[0].label}` : `Single-cell UMAP clustering · ${samples[0].label}`;
    subtitle = isZh
      ? `数据集 ${samples[0].datasetId} 的单样本 UMAP 坐标与细胞聚类分布`
      : `Single-sample UMAP coordinates and cluster distribution for ${samples[0].datasetId}`;
  } else if (mode === 'overlay') {
    title = isZh ? `多样本 UMAP 叠加对比 · ${samples.length} 个样本` : `Multi-sample UMAP overlay · ${samples.length} samples`;
    const legend = samples.map((s, i) => `${SAMPLE_SYMBOL_CHARS[i % SAMPLE_SYMBOL_CHARS.length]} ${s.label}`).join('，');
    subtitle = isZh
      ? `在同一整合坐标空间中叠加各样本（${legend}）；颜色 = 细胞聚类`
      : `All samples overlaid in one shared integrated space (${samples.map((s, i) => `${SAMPLE_SYMBOL_CHARS[i % SAMPLE_SYMBOL_CHARS.length]} ${s.label}`).join(', ')}); colour = cluster`;
  } else {
    title = isZh ? `多样本 UMAP 对比 · ${samples.length} 个样本` : `Multi-sample UMAP comparison · ${samples.length} samples`;
    subtitle = isZh
      ? `按网格并排展示各样本的整合 UMAP 坐标：${samples.map(s => s.label).join('、')}`
      : `Integrated UMAP coordinates per sample (grid layout): ${samples.map(s => s.label).join(', ')}`;
  }

  return {
    type: 'plot',
    plotType: 'umap',
    title,
    subtitle,
    payload: { data: built.data, layout: built.layout },
    // 供绘图弹窗做「基因着色」用：实际绘制的样本清单（含被跳过的）。
    // scope 必须带上：弹窗按基因着色时要用同一套坐标系补齐被抽样丢弃的表达点。
    datasets: samples.map(s => ({ datasetId: s.datasetId, label: s.label, scope, omicsType: 'SC' })),
    warnings: [...warnings, ...built.warnings],
  };
}
