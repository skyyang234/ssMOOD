// 前端统一绘图（除 UMAP 外）：各类图的「取数 + 拼 Plotly payload」都在前端确定性完成，
// 与 agentUmapPlot.js 完全同范式。取数复用后端 get_plot_data 技能（返回原始数据，不拼图），
// 后端 build_plot_action 已隐藏，所有画图统一走前端。
import config from '@/config';
import { candidateIdsFor } from './agentSampleCatalog';

function isZhOf(locale) {
  return String(locale || '').toLowerCase().startsWith('zh');
}

// 逐个候选 id 试一个取数函数，返回第一个成功的结果。
// 样本的 id 形态（展示名 / sample_name / 数字 sample_id）各接口认的不一定相同，
// 这样能避免"某个样本因 id 形态不符而被静默丢弃"。
async function firstOk(candidates, fn) {
  for (const cand of candidates) {
    const out = await fn(cand);
    if (out) return out;
  }
  return null;
}

// 通过后端 get_plot_data 技能拿原始数据（不做 Plotly 拼图）。
// 后端 agent_skill_exec.php 约定请求体为 { skill, params }（参数在 params 下），
// 响应信封为 { ok, data:<技能 result>, error, meta }，其中 ok 即技能是否成功、data 即结果负载。
// 后端不可用时返回 null，绝不编造。
export async function fetchPlotRaw(args) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${config.apiUrl}agent_skill_exec.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'get_plot_data', params: args }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    if (!body || !body.ok) return null;
    return body.data ?? null;
  } catch (e) {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function num(v, d = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
}

function safeNegLog10(v) {
  return -Math.log10(Math.max(parseFloat(v) || 1e-300, 1e-300));
}

function buildCellCompositionPayload(result, plotType, isZh) {
  const items = Array.isArray(result?.items) ? result.items : [];
  if (!items.length) return null;
  const labels = items.map(r => String(r.cellType));
  const values = items.map(r => parseInt(r.count, 10) || 0);
  const data = plotType === 'pie'
    ? [{ type: 'pie', labels, values }]
    : [{ type: 'bar', x: labels, y: values }];
  return { data, layout: { title: isZh ? '细胞类型组成' : 'Cell type composition' } };
}

function buildGeneExpressionPayload(result, isZh) {
  if (!result || result.nonzeroCount == null) return null;
  const gene = result.gene || 'gene';
  const x = isZh ? ['非零细胞数', '总细胞数'] : ['nonzero', 'total'];
  return {
    data: [{ type: 'bar', x, y: [num(result.nonzeroCount), num(result.cellCount)], name: gene }],
    layout: { title: isZh ? `基因表达概览 · ${gene}` : `Gene expression summary · ${gene}` },
  };
}

function buildDegPayload(result, isZh) {
  const items = Array.isArray(result?.items) ? result.items : [];
  if (!items.length) return null;
  const x = items.map(r => r.gene_name || r.peak_name || r.cell_type || 'item');
  const y = items.map(r => (r.log2fc != null ? num(r.log2fc) : 1));
  return { data: [{ type: 'bar', x, y }], layout: { title: isZh ? '差异表达基因' : 'Differential expression' } };
}

function buildAtacPayload(result, plotType, isZh) {
  const peaks = Array.isArray(result?.differentialPeaks) ? result.differentialPeaks : [];
  if (plotType === 'volcano' && peaks.length) {
    return {
      data: [{
        type: 'scatter', mode: 'markers',
        x: peaks.map(r => num(r.log2fc)),
        y: peaks.map(r => safeNegLog10(r.padj)),
        text: peaks.map(r => r.peak_name),
      }],
      layout: {
        title: isZh ? 'ATAC 差异峰火山图' : 'ATAC differential peak volcano',
        xaxis: { title: 'log2FC' },
        yaxis: { title: '-log10(padj)' },
      },
    };
  }
  const src = Array.isArray(result?.items) ? result.items : peaks;
  if (!src.length) return null;
  const x = src.map(r => r.peak_name || r.cell_type || 'peak');
  const y = src.map(r => (r.log2fc != null ? num(r.log2fc) : 1));
  return { data: [{ type: 'bar', x, y }], layout: { title: isZh ? 'ATAC 差异峰' : 'ATAC differential peaks' } };
}

function buildGwasPayload(result, isZh) {
  const items = Array.isArray(result?.topEnrichment) ? result.topEnrichment : [];
  if (!items.length) return null;
  const x = items.map(r => r.cell_group);
  const y = items.map(r => safeNegLog10(r.assoc_mcp));
  return {
    data: [{ type: 'bar', x, y }],
    layout: { title: isZh ? 'GWAS scDRS 富集' : 'GWAS scDRS enrichment', yaxis: { title: '-log10(assoc_mcp)' } },
  };
}

const TITLE_MAP = {
  cell_composition: { zh: '细胞类型组成', en: 'Cell type composition' },
  gene_expression: { zh: '单基因表达', en: 'Single-gene expression' },
  deg: { zh: '差异表达基因', en: 'Differential expression' },
  atac: { zh: 'ATAC 差异峰', en: 'ATAC differential peaks' },
  gwas: { zh: 'GWAS 富集', en: 'GWAS enrichment' },
};

// 同一数据集的「柱状图」与「饼图」标题必须可区分，否则会被去重合并成一张。
function chartSuffix(dt, plotType, isZh) {
  const t = String(plotType || '').toLowerCase();
  if (dt === 'cell_composition') return t === 'pie' ? (isZh ? '（饼图）' : ' (pie)') : (isZh ? '（柱状图）' : ' (bar)');
  if (dt === 'atac') return t === 'bar' ? (isZh ? '（柱状图）' : ' (bar)') : (isZh ? '（火山图）' : ' (volcano)');
  return '';
}

// 统一入口：取数（get_plot_data 技能）+ 前端拼 Plotly payload。
// 返回 { type:'plot', plotType, title, subtitle, payload } 或 null（无数据，调用方如实报错）。
export async function buildPlotAction({ dataType, plotType, datasetId, gene, cellType, traitId, contrast, limit, locale, datasetMeta = null } = {}) {
  const dt = String(dataType || '').toLowerCase();
  const isZh = isZhOf(locale);
  // 细胞类型组成的原始计数与图表类型无关：直接把 'pie' 传给后端 get_plot_data 取数时，
  // 部分数据集没有对应接口会返回空，导致饼图取不到数据（柱状图却正常）。
  // 因此取数统一用后端支持的 'bar' 拉原始计数，再在前端按真实 plotType 拼成饼图/柱状图。
  const fetchPlotType = (dt === 'cell_composition') ? 'bar' : (plotType || 'bar');
  const args = { dataType: dt, plotType: fetchPlotType };
  if (datasetId) args.datasetId = datasetId;
  if (gene) args.gene = gene;
  if (cellType) args.cellType = cellType;
  if (traitId) args.traitId = traitId;
  if (contrast) args.contrast = contrast;
  if (limit) args.limit = limit;

  const result = await fetchPlotRaw(args);
  if (!result) return null;

  let payload = null;
  if (dt === 'cell_composition') payload = buildCellCompositionPayload(result, plotType || 'bar', isZh);
  else if (dt === 'gene_expression') payload = buildGeneExpressionPayload(result, isZh);
  else if (dt === 'deg') payload = buildDegPayload(result, isZh);
  else if (dt === 'atac') payload = buildAtacPayload(result, plotType || 'volcano', isZh);
  else if (dt === 'gwas') payload = buildGwasPayload(result, isZh);
  if (!payload) return null;

  payload.config = { responsive: true };
  const titleBase = (TITLE_MAP[dt]?.[isZh ? 'zh' : 'en']) || dt;
  // subject 必须带 gene / cellType：同一数据集画不同基因或不同 cellType 的图时，
  // 标题才能区分，否则会被 dedupePlotActions 误并成一张（「画一个失败一个」）。
  const subject = [datasetId, gene, cellType, traitId].filter(Boolean).join(' · ');
  const title = [titleBase + chartSuffix(dt, plotType, isZh), subject].filter(Boolean).join(' · ');
  return {
    type: 'plot',
    plotType: dt,
    title,
    subtitle: isZh ? '由 ssMOOD 数据库实时计算' : 'Computed from ssMOOD database',
    payload,
    // 单样本图也带上来源：绘图弹窗靠它显示「数据来源」并跳回数据集页（图 → 数据）。
    // omicsType 决定跳到哪个详情页，缺了按钮就会没反应。
    ...(datasetMeta && datasetMeta.datasetId
      ? {
        datasets: [{
          datasetId: String(datasetMeta.datasetId),
          label: String(datasetMeta.label || datasetMeta.datasetId),
          omicsType: String(datasetMeta.omicsType || '').toUpperCase(),
        }],
      }
      : {}),
  };
}

// ── 多样本对比图：一次勾选多个样本时，逐样本取数后拼成「一张对比图」 ──
// 样本配色（分组柱状图用）：与 UMAP 配色同源的前 10 色，超出循环复用。
const MULTI_PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
];
// 细胞类型并集可能很大，柱状图只保留总数最多的前 N 类，其余截断并提示。
const MAX_COMPOSITION_CELLTYPES = 25;

// 多样本细胞类型组成对比：按「占该样本比例（%）」分组柱状图。
// 用占比而非绝对细胞数：不同样本细胞量差几十倍，绝对值会让小样本被压成一条线。
export function buildMultiCompositionPayload(samples, isZh) {
  const totals = new Map();
  samples.forEach(s => (s.items || []).forEach(it => {
    const key = String(it.cellType);
    totals.set(key, (totals.get(key) || 0) + (parseInt(it.count, 10) || 0));
  }));
  let cellTypes = [...totals.keys()].sort((a, b) => totals.get(b) - totals.get(a));
  const truncated = cellTypes.length > MAX_COMPOSITION_CELLTYPES;
  if (truncated) cellTypes = cellTypes.slice(0, MAX_COMPOSITION_CELLTYPES);
  const data = samples.map((s, i) => {
    const sampleTotal = (s.items || []).reduce((sum, it) => sum + (parseInt(it.count, 10) || 0), 0) || 1;
    const map = new Map((s.items || []).map(it => [String(it.cellType), parseInt(it.count, 10) || 0]));
    return {
      type: 'bar',
      name: s.label,
      x: cellTypes,
      y: cellTypes.map(ct => Number(((map.get(ct) || 0) / sampleTotal * 100).toFixed(2))),
      marker: { color: MULTI_PALETTE[i % MULTI_PALETTE.length] },
    };
  });
  return {
    payload: {
      data,
      layout: {
        barmode: 'group',
        title: isZh ? '细胞类型组成对比（占比 %）' : 'Cell type composition comparison (%)',
        xaxis: { title: isZh ? '细胞类型 / 聚类' : 'Cell type / cluster', tickangle: -45 },
        yaxis: { title: isZh ? '占该样本比例（%）' : 'Share of sample (%)' },
        legend: { title: { text: isZh ? '样本' : 'Sample' } },
      },
    },
    truncated,
  };
}

// 多样本基因表达对比：柱高为该基因在每个样本内的检出率（%）。
// 与 summarize_gene_across_datasets 同口径：只有检出率与表达范围，没有统计检验，
// 因此只画检出率，绝不声称「显著上调/下调」。
export function buildMultiGeneExpressionPayload(samples, gene, isZh) {
  const rate = s => (s.cellCount ? Number(((s.nonzeroCount / s.cellCount) * 100).toFixed(2)) : 0);
  const data = [{
    type: 'bar',
    name: gene,
    x: samples.map(s => s.label),
    y: samples.map(rate),
    text: samples.map(s => (s.cellCount ? `${rate(s).toFixed(2)}%` : '—')),
    textposition: 'auto',
    marker: { color: '#4e79a7' },
  }];
  return {
    payload: {
      data,
      layout: {
        title: isZh ? `基因表达对比 · ${gene}（检出率）` : `Gene expression comparison · ${gene} (detection rate)`,
        xaxis: { title: isZh ? '样本' : 'Sample', tickangle: -45 },
        yaxis: { title: isZh ? '检出率（%）' : 'Detection rate (%)' },
      },
    },
  };
}

// 模态展示名（用于混选时给每张图的标题加后缀，让用户知道这张图是哪个模态的）。
const OMICS_LABEL = { SC: { zh: '单细胞', en: 'single-cell' }, ST: { zh: '空转', en: 'spatial' }, ATAC: { zh: 'ATAC', en: 'ATAC' } };
function omicsTag(omicsType, isZh) {
  const entry = OMICS_LABEL[String(omicsType || '').toUpperCase()];
  return entry ? (isZh ? entry.zh : entry.en) : '';
}

// 多样本统一入口：逐样本取数（get_plot_data 技能）→ 前端拼对比图。
// 模态隔离：不同模态（单细胞 / 空转 / ATAC）的样本不放进同一张对比图——细胞、spot、
// peak 三种口径不可比——按模态分组各自出图；某模态只有 1 个样本时走该数据集原本的
// 单数据集视图（组成仍是柱状图 + 饼图，表达仍是非零 / 总细胞），不降级成对比图。
// 入参 datasets: [{ datasetId, label, omicsType }]；返回 { actions, warnings, failed }。
export async function buildMultiSamplePlotAction({ dataType, datasets = [], gene, locale } = {}) {
  const dt = String(dataType || '').toLowerCase();
  const isZh = isZhOf(locale);
  const list = (Array.isArray(datasets) ? datasets : [])
    .map(d => ({
      datasetId: String(d?.datasetId || '').trim(),
      label: String(d?.label || d?.datasetId || ''),
      omicsType: String(d?.omicsType || '').toUpperCase(),
    }))
    .filter(d => d.datasetId);
  if (!list.length) return { actions: [], warnings: [], failed: [] };

  const groups = new Map();
  list.forEach(d => {
    const key = d.omicsType || 'UNKNOWN';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  });
  const mixed = groups.size > 1;

  const actions = [];
  const warnings = [];
  const failed = [];

  for (const [omicsKey, group] of groups) {
    const tag = omicsTag(omicsKey, isZh);
    const titleSuffix = mixed && tag ? ` · ${tag}` : '';

    // 单样本组：走该数据集原本的视图，不降级成"分组柱状图"。
    if (group.length === 1) {
      const only = group[0];
      const before = actions.length;
      // 逐个候选 id 试，避免单个样本因 id 形态不符而画不出。
      const candidates = await candidateIdsFor(only.datasetId);
      if (dt === 'cell_composition') {
        for (const t of ['bar', 'pie']) {
          const action = await firstOk(candidates, cand => buildPlotAction({ dataType: 'cell_composition', plotType: t, datasetId: cand, locale }));
          if (action) actions.push(action);
        }
      } else if (dt === 'gene_expression') {
        if (gene) {
          const action = await firstOk(candidates, cand => buildPlotAction({ dataType: 'gene_expression', datasetId: cand, gene, locale }));
          if (action) actions.push(action);
        }
      }
      if (actions.length === before) failed.push(only.datasetId);
      continue;
    }

    const settled = await Promise.all(group.map(async d => {
      const args = { dataType: dt, plotType: 'bar' };
      if (gene) args.gene = gene;
      // 逐个候选 id 试取数，避免因 id 形态不符而丢样本。
      const candidates = await candidateIdsFor(d.datasetId);
      const result = await firstOk(candidates, cand => fetchPlotRaw({ ...args, datasetId: cand }));
      return { ...d, result };
    }));
    const groupFailed = settled.filter(s => !s.result).map(s => s.label || s.datasetId);
    if (groupFailed.length) {
      failed.push(...groupFailed);
      warnings.push(isZh
        ? `以下样本未能取到数据，已跳过：${groupFailed.join('、')}`
        : `No data for ${groupFailed.join(', ')}; skipped.`);
    }

    if (dt === 'cell_composition') {
      const usable = settled.filter(s => Array.isArray(s.result?.items) && s.result.items.length);
      if (!usable.length) continue;
      const { payload, truncated } = buildMultiCompositionPayload(
        usable.map(s => ({ datasetId: s.datasetId, label: s.label, items: s.result.items })),
        isZh,
      );
      if (truncated) {
        warnings.push(isZh
          ? `细胞类型较多，图中仅展示总数最多的前 ${MAX_COMPOSITION_CELLTYPES} 类。`
          : `Only the top ${MAX_COMPOSITION_CELLTYPES} cell types are shown.`);
      }
      actions.push({
        type: 'plot',
        plotType: 'cell_composition',
        title: `${isZh ? '细胞类型组成对比' : 'Cell type composition comparison'} · ${usable.length} ${isZh ? '个样本' : 'samples'}${titleSuffix}`,
        subtitle: isZh ? '由 ssMOOD 数据库实时计算，按各样本内占比展示' : 'Computed from ssMOOD; shown as within-sample share',
        payload,
        datasets: group.map(d => ({ datasetId: d.datasetId, label: d.label, omicsType: d.omicsType })),
      });
    } else if (dt === 'gene_expression') {
      const usable = settled.filter(s => s.result && s.result.nonzeroCount != null);
      if (!usable.length) continue;
      const geneName = gene || usable[0].result.gene || 'gene';
      const { payload } = buildMultiGeneExpressionPayload(
        usable.map(s => ({
          datasetId: s.datasetId,
          label: s.label,
          nonzeroCount: s.result.nonzeroCount,
          cellCount: s.result.cellCount,
        })),
        geneName,
        isZh,
      );
      actions.push({
        type: 'plot',
        plotType: 'gene_expression',
        title: `${isZh ? '基因表达对比' : 'Gene expression comparison'} · ${geneName} · ${usable.length} ${isZh ? '个样本' : 'samples'}${titleSuffix}`,
        subtitle: isZh ? '由 ssMOOD 数据库实时计算，柱高为该基因在样本内的检出率' : 'Computed from ssMOOD; bar height is the within-sample detection rate',
        payload,
        datasets: group.map(d => ({ datasetId: d.datasetId, label: d.label, omicsType: d.omicsType })),
      });
    }
  }

  if (!actions.length) return { actions: [], warnings, failed };
  return { actions, warnings, failed };
}
