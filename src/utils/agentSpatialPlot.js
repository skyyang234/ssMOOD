// 前端原生空转（空间转录组）图绘制：拉取 spot 空间坐标构造 Plotly 散点，
// 与 agentUmapPlot.js 同范式——模型只需触发 plot_spatial 并提供数据集，
// 散点构造完全由本模块确定性完成（不经 LLM 拼 payload，也不走后端 build_plot_action）。
//
// 数据来源（与空转详情页同源）：
//   - 空间坐标：std_getCoordinate.php?id=<样本>  → { coordinate_data:[{i,x,y,c}], cluster_labels }
//   - 基因表达：std_getGeneExpression_bin.php     → [{i,nc}]（只含非零 spot）
// 表达着色由弹窗按 cell id 关联（坐标与表达都用 legacy_cell_id ?: cell_id，两边一致）。
//
// 布局：单个样本 = 一个坐标轴（隐藏轴、等比例）；多个样本 = 每个样本一个独立面板——
// 空间坐标是各样本自己的棋盘，跨样本不可比，不能叠在同一坐标系里。
import config from '@/config';
import { parseMaybeGzipJson } from '@/utils/api';
import { displayLabelFor, candidateIdsFor } from './agentSampleCatalog';

// 与 UMAP/详情页一致的散点配色（前 20 个固定，超出循环复用）。
const PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  '#86bcb6', '#d37295', '#a0cbe8', '#ffbe7d', '#8cd17d',
  '#b6992d', '#499894', '#7b848f', '#cfcfcf', '#e8c1a0',
];
const OTHER_COLOR = 'rgba(150,150,150,0.5)';

const MAX_SAMPLES_PER_PLOT = 8;      // 一张图最多并排的空转样本数
const MAX_CLUSTERS_PER_SAMPLE = 24;  // 每个样本独立上色的聚类数，其余合并为「其他」
// 全图 spot 点数预算：弹窗硬性校验 payload < 2MB（每个点要带 x/y/text 三个数组），
// 而空转样本 spot 数可达十几万，必须按预算抽样，否则直接报「绘图 payload 超过前端安全限制」。
const MAX_TOTAL_POINTS = 20000;

// 按「点数预算 ÷ 分组数」算每组的抽样上限，保证总点数落在预算内（+1 给「其他」组）。
function perGroupCap(budget, groupCount) {
  return Math.max(1, Math.ceil(budget / (groupCount + 1)));
}

function colorForLabel(index) {
  return PALETTE[index % PALETTE.length];
}

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

// 确定性步长抽样：spot 数超上限时等间隔取点，保证每次绘制结果一致。
function strideSample(indices, cap) {
  if (indices.length <= cap) return indices;
  const out = [];
  const step = indices.length / cap;
  for (let i = 0; i < cap; i += 1) out.push(indices[Math.floor(i * step)]);
  return out;
}

// 按聚类分组（坐标项用 .c 表示聚类）；聚类数超过 maxClusters 时按 spot 数保留前 N 个，其余归入「其他」。
function groupByCluster(coords, maxClusters) {
  const counts = new Map();
  coords.forEach(d => counts.set(d.c, (counts.get(d.c) || 0) + 1));
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
  coords.forEach((d, i) => {
    if (keptSet.has(d.c)) {
      if (!byLabel.has(d.c)) byLabel.set(d.c, []);
      byLabel.get(d.c).push(i);
    } else {
      otherIdxs.push(i);
    }
  });
  return { kept, byLabel, otherIdxs, merged };
}

// 稳健坐标范围：取 0.5%–99.5% 分位数并留 3% 边距，避免个别离群 spot 把空间图压成一个小角。
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

// std_getCoordinate.php 只认 sample_name（或数字 sample_id），而调用方可能传展示名。
// 这里逐个候选试：目录 id（sample_name）→ 数字 sample_id → 原键，任一成功即用；
// 避免因 id 形态与接口不符而把样本静默丢掉（表现为"选了 4 个只画出 2 个"）。
async function fetchSpatialCoordsWithFallback(id) {
  const candidates = await candidateIdsFor(id);
  for (const cand of candidates) {
    const payload = await fetchSpatialCoordsForDataset(cand);
    if (payload) return { payload, usedId: cand };
  }
  return { payload: null, usedId: candidates[0] || String(id || '') };
}

// ── 基因着色用的「全量 spot」按需获取 ──
// 图上的点是等间隔抽样的（防 payload 超限），但按基因着色时必须把「所有表达该基因的 spot」
// 都画出来，否则落在被抽样丢弃的点上的表达会整体消失 —— 表现为表达模式不完整
// （例如某组织区域该基因全阳，抽样后只剩零星红点）。
const fullPointsCache = new Map();

export function clearFullSpatialPointsCache() {
  fullPointsCache.clear();
}

// 返回该样本的全量 spot 坐标 [{i,x,y,c}]；取不到返回 null（调用方如实降级，不编造）。
export async function fetchFullSpatialPoints(datasetId) {
  const key = String(datasetId || '').trim();
  if (!key) return null;
  if (fullPointsCache.has(key)) return fullPointsCache.get(key);
  const { payload } = await fetchSpatialCoordsWithFallback(key);
  const points = payload && Array.isArray(payload.coordinate_data) && payload.coordinate_data.length
    ? payload.coordinate_data
    : null;
  fullPointsCache.set(key, points);
  return points;
}

// 取一个空转样本的空间坐标；取不到返回 null（调用方如实报错，绝不编造散点）。
async function fetchSpatialCoordsForDataset(datasetId) {
  const params = new URLSearchParams({ id: String(datasetId) }).toString();
  try {
    const response = await fetch(`${config.apiUrl}std_getCoordinate.php?${params}`);
    if (!response.ok) return null;
    const data = parseMaybeGzipJson(await response.arrayBuffer());
    if (data && Array.isArray(data.coordinate_data) && data.coordinate_data.length) return data;
    return null;
  } catch (e) {
    return null;
  }
}

function axisRanges(coords) {
  const xs = [];
  const ys = [];
  coords.forEach(d => {
    const x = parseFloat(d.x);
    const y = parseFloat(d.y);
    if (Number.isFinite(x)) xs.push(x);
    if (Number.isFinite(y)) ys.push(y);
  });
  return { x: robustRange(xs), y: robustRange(ys) };
}

function baseLayout(isZh) {
  return {
    showlegend: true,
    legend: { title: { text: isZh ? '细胞类型 / 聚类' : 'Cell type / cluster' } },
    hovermode: 'closest',
    margin: { t: 16, r: 16, b: 16, l: 16 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };
}

function makeTrace(idxs, coords, name, color, xaxis, yaxis) {
  return {
    x: idxs.map(i => parseFloat(coords[i].x)),
    y: idxs.map(i => parseFloat(coords[i].y)),
    mode: 'markers',
    type: 'scattergl',
    name,
    text: idxs.map(i => coords[i].i),
    marker: { size: 4, color, opacity: 0.9 },
    xaxis,
    yaxis,
  };
}

// 单样本：一个坐标系（隐藏轴 + 等比例），聚类上图例。
function buildSingleSamplePayload(sample, { isZh } = {}) {
  const { coords } = sample;
  const { kept, byLabel, otherIdxs, merged } = groupByCluster(coords, 180);
  // 单样本同样按预算抽样：空转 spot 数可达十几万，全量输出会让 payload 超过 2MB 前端上限。
  const cap = perGroupCap(MAX_TOTAL_POINTS, kept.length);
  const data = kept.map((label, idx) => {
    const idxs = strideSample(byLabel.get(label) || [], cap);
    return makeTrace(idxs, coords, String(label), colorForLabel(idx), 'x', 'y');
  });
  if (merged && otherIdxs.length) {
    data.push(makeTrace(strideSample(otherIdxs, cap), coords, isZh ? '其他' : 'Other', OTHER_COLOR, 'x', 'y'));
  }
  const r = axisRanges(coords);
  const layout = Object.assign(baseLayout(isZh), {
    xaxis: { visible: false, showgrid: false, zeroline: false, range: r.x || undefined },
    // scaleanchor 保证空间图长宽比不变形（与详情页一致）。
    yaxis: { visible: false, showgrid: false, zeroline: false, scaleanchor: 'x', range: r.y || undefined },
  });
  const warnings = [];
  if (merged) {
    warnings.push(isZh
      ? `聚类数量较多，仅展示 spot 数最多的 180 个聚类，其余合并为「其他」。`
      : 'Too many clusters: only the 180 largest are shown separately; the rest are merged into "Other".');
  }
  if (coords.length > MAX_TOTAL_POINTS) {
    warnings.push(isZh
      ? 'spot 数较多，已等间隔抽样绘制，hover 仍可查看真实 spot ID。'
      : 'Many spots: points were evenly subsampled for rendering; hover still shows real spot ids.');
  }
  return { data, layout, warnings };
}

// 多样本：每样本一个独立面板（各自按自己的空间范围自动缩放），面板顶部标注样本名。
function buildPanelsPayload(samples, { isZh } = {}) {
  const grouped = samples.map(sample => ({
    sample,
    ...groupByCluster(sample.coords, MAX_CLUSTERS_PER_SAMPLE),
  }));
  const globalKept = sortLabels([...new Set(grouped.flatMap(g => g.kept))]);
  const colorMap = new Map(globalKept.map((label, i) => [label, colorForLabel(i)]));

  const total = samples.length;
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  // 全图预算均摊到各样本，保证多样本时总点数仍不超上限。
  const sampleBudget = Math.floor(MAX_TOTAL_POINTS / total);
  const data = [];
  const layout = Object.assign(baseLayout(isZh), { showlegend: false, annotations: [] });

  grouped.forEach((g, index) => {
    const gx = index % cols;
    const gy = Math.floor(index / cols);
    // Plotly 多面板：布局键是 xaxis / xaxis2…，但 trace 引用坐标轴必须用标准写法 x / x2。
    // 写成 'xaxis2' 不被识别时会回退到第 1 根轴——右侧样本的点被画到左面板上、
    // 又落在左面板轴范围之外，于是彻底看不见（表现为"右侧空白"）。
    const xAxisKey = index === 0 ? 'xaxis' : `xaxis${index + 1}`;
    const yAxisKey = index === 0 ? 'yaxis' : `yaxis${index + 1}`;
    const xRef = index === 0 ? 'x' : `x${index + 1}`;
    const yRef = index === 0 ? 'y' : `y${index + 1}`;
    const r = axisRanges(g.sample.coords);
    layout[xAxisKey] = {
      domain: [gx / cols, (gx + 1) / cols],
      // 显式配对主/次坐标轴：多面板下各 y 轴 domain 相同，不指定 anchor 时 Plotly
      // 按 domain 就近锚定，可能把 xaxis2 挂到 yaxis 上。
      anchor: yAxisKey,
      visible: false,
      showgrid: false,
      zeroline: false,
      range: r.x || undefined,
    };
    layout[yAxisKey] = {
      domain: [1 - (gy + 1) / rows, 1 - gy / rows],
      anchor: xAxisKey,
      // 每个面板各自锁定 x:y 等比例，否则组织切片会被面板域拉伸变形（"比例奇怪"）。
      scaleanchor: xRef,
      visible: false,
      showgrid: false,
      zeroline: false,
      range: r.y || undefined,
    };
    layout.annotations.push({
      xref: 'paper',
      yref: 'paper',
      x: (gx + 0.5) / cols,
      y: 1 - gy / rows - 0.008,
      text: g.sample.label,
      showarrow: false,
      font: { size: 11, color: '#27364a' },
    });

    const cap = perGroupCap(sampleBudget, g.kept.length);
    g.kept.forEach(label => {
      const idxs = strideSample(g.byLabel.get(label) || [], cap);
      if (idxs.length) {
        data.push(makeTrace(idxs, g.sample.coords, `${g.sample.label} · ${label}`, colorMap.get(label), xRef, yRef));
      }
    });
    if (g.merged && g.otherIdxs.length) {
      const idxs = strideSample(g.otherIdxs, cap);
      if (idxs.length) {
        data.push(makeTrace(idxs, g.sample.coords, `${g.sample.label} · ${isZh ? '其他' : 'Other'}`, OTHER_COLOR, xRef, yRef));
      }
    }
  });

  const warnings = [];
  if (grouped.some(g => g.merged)) {
    warnings.push(isZh
      ? `部分样本聚类较多，每个样本仅展示 spot 数最多的 ${MAX_CLUSTERS_PER_SAMPLE} 个聚类，其余合并为「其他」。`
      : `Some samples have many clusters: only the ${MAX_CLUSTERS_PER_SAMPLE} largest per sample are shown; the rest are merged into "Other".`);
  }
  if (samples.some(s => s.coords.length > sampleBudget)) {
    warnings.push(isZh
      ? '部分样本 spot 数较多，已等间隔抽样绘制，hover 仍可查看真实 spot ID。'
      : 'Some samples have many spots and were evenly subsampled for rendering; hover still shows real spot ids.');
  }
  return { data, layout, warnings };
}

// 构造空转空间图 action。gene 非空时只作为「初始预置基因」传给弹窗（由弹窗完成着色），
// payload 始终是聚类配色，保证「清除基因」能回到聚类视图。
export async function buildSpatialPlotAction({ datasetIds = [], labels = [], gene = '', isZh = true } = {}) {
  const ids = (Array.isArray(datasetIds) ? datasetIds : [])
    .map(v => String(v || '').trim())
    .filter(Boolean);
  if (!ids.length) return null;

  const settled = await Promise.all(ids.map(async (id, i) => {
    // 容忍调用方传展示名 / 数字 id：逐个候选试取坐标，避免样本被静默丢弃。
    const { payload, usedId } = await fetchSpatialCoordsWithFallback(id);
    const label = await displayLabelFor(usedId).catch(() => '');
    return {
      datasetId: usedId,
      label: labels[i] || label || id,
      coords: payload && Array.isArray(payload.coordinate_data) ? payload.coordinate_data : [],
    };
  }));

  const loaded = settled.filter(s => s.coords.length);
  if (!loaded.length) return null;

  const warnings = [];
  const missing = settled.filter(s => !s.coords.length).map(s => s.label || s.datasetId);
  if (missing.length) {
    warnings.push(isZh
      ? `未能获取以下样本的空间坐标，已跳过：${missing.join('、')}`
      : `No spatial coordinates for ${missing.join(', ')}; skipped.`);
  }
  let samples = loaded;
  if (samples.length > MAX_SAMPLES_PER_PLOT) {
    warnings.push(isZh
      ? `一次最多绘制 ${MAX_SAMPLES_PER_PLOT} 个样本，已绘制前 ${MAX_SAMPLES_PER_PLOT} 个。`
      : `At most ${MAX_SAMPLES_PER_PLOT} samples per plot; showing the first ${MAX_SAMPLES_PER_PLOT}.`);
    samples = samples.slice(0, MAX_SAMPLES_PER_PLOT);
  }

  const built = samples.length === 1
    ? buildSingleSamplePayload(samples[0], { isZh })
    : buildPanelsPayload(samples, { isZh });

  const title = samples.length === 1
    ? (isZh ? `空转空间图 · ${samples[0].label}` : `Spatial map · ${samples[0].label}`)
    : (isZh ? `空转空间图对比 · ${samples.length} 个样本` : `Spatial map comparison · ${samples.length} samples`);
  const subtitle = samples.length === 1
    ? (isZh
        ? `数据集 ${samples[0].datasetId} 的 spot 空间分布与聚类；可用基因下拉框按表达量着色`
        : `Spot spatial layout and clusters for ${samples[0].datasetId}; use the gene box to colour by expression`)
    : (isZh
        ? `按样本并排展示各空转样本的空间 spot 分布：${samples.map(s => s.label).join('、')}`
        : `Spatial spot layout per sample (grid): ${samples.map(s => s.label).join(', ')}`);

  return {
    type: 'plot',
    plotType: 'spatial',
    title,
    subtitle,
    payload: { data: built.data, layout: built.layout, config: { responsive: true } },
    datasets: samples.map(s => ({ datasetId: s.datasetId, label: s.label, omicsType: 'ST' })),
    selectedGene: gene || '',
    warnings: [...warnings, ...built.warnings],
  };
}
