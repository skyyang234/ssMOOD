<template>
  <!-- embedded：图直接嵌在对话里（AI 页面），不走遮罩、不 teleport -->
  <teleport to="body" :disabled="embedded">
    <transition :name="embedded ? 'agent-plot-none' : 'agent-plot-fade'">
      <div
        v-if="visible || embedded"
        :class="embedded ? 'agent-plot-inline' : 'agent-plot-backdrop'"
        @click.self="embedded ? null : $emit('close')"
      >
        <section
          class="agent-plot-modal"
          :class="{
            'is-positioned': !embedded && (Boolean(modalPos) || maximized),
            'is-maximized': !embedded && maximized,
            'is-embedded': embedded,
          }"
          :style="embedded ? null : modalStyle"
          :role="embedded ? 'figure' : 'dialog'"
          :aria-modal="embedded ? null : 'true'"
          :aria-label="titleText"
        >
          <!-- 标题栏即拖动手柄；按钮区域不触发拖动（内嵌时不可拖） -->
          <header class="agent-plot-head" @mousedown="embedded ? null : startDrag">
            <div>
              <h3>{{ titleText }}</h3>
              <p v-if="subtitleText">{{ subtitleText }}</p>
            </div>
            <div class="agent-plot-tools">
              <!-- 内嵌模式：只留「展开」，没有最大化/关闭（对话里不需要关掉它） -->
              <button
                v-if="embedded"
                class="agent-plot-expand"
                type="button"
                :title="isZh ? '在新窗口中打开（可看基因着色、点簇查 DEG）' : 'Open in a window (gene colouring, click a cluster for DEGs)'"
                :aria-label="isZh ? '在新窗口中打开这张图' : 'Open this plot in a window'"
                @click.stop="$emit('expand')"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.5 2.5h4v4M13.5 2.5 8 8M6.5 3.5h-4v9h9v-4"/>
                </svg>
                <span>{{ isZh ? '展开' : 'Expand' }}</span>
              </button>
              <template v-else>
                <button
                  class="agent-plot-iconbtn"
                  type="button"
                  :title="maximized ? (isZh ? '还原' : 'Restore') : (isZh ? '最大化' : 'Maximize')"
                  :aria-label="maximized ? (isZh ? '还原窗口' : 'Restore window') : (isZh ? '最大化窗口' : 'Maximize window')"
                  @click.stop="toggleMaximize"
                >
                  <svg v-if="!maximized" viewBox="0 0 16 16" width="13" height="13"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
                  <svg v-else viewBox="0 0 16 16" width="13" height="13"><path d="M3 9v4h4M13 7V3H9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
                <button class="agent-plot-close" type="button" :aria-label="closeLabel" @click.stop="$emit('close')">
                  <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 3 L13 13 M13 3 L3 13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
                </button>
              </template>
            </div>
          </header>

          <!-- 基因选择：UMAP 按表达量重新着色；表达对比图切换基因 -->
          <div v-if="genePanelVisible" class="agent-plot-toolbar">
            <div class="agent-gene-picker">
              <input
                class="agent-gene-input"
                v-model="geneQuery"
                :placeholder="isZh ? '搜索基因…' : 'Search gene…'"
                :disabled="geneBusy"
                @focus="openGeneMenu($event)"
                @input="geneActiveIndex = 0"
                @keydown.down.prevent="moveGeneActive(1)"
                @keydown.up.prevent="moveGeneActive(-1)"
                @keydown.enter.prevent="pickGene(filteredGenes[geneActiveIndex])"
                @keydown.esc.prevent="geneMenuOpen = false"
              />
              <!-- 清除按钮：清空输入并恢复最初请求的图 -->
              <button
                v-if="geneQuery || selectedGene"
                class="agent-gene-clear"
                type="button"
                :disabled="geneBusy"
                :title="isZh ? '清除并恢复原图' : 'Clear and restore'"
                :aria-label="isZh ? '清除并恢复原图' : 'Clear and restore'"
                @click.stop="restoreOriginal"
              >
                <svg viewBox="0 0 16 16" width="11" height="11"><path d="M3 3 L13 13 M13 3 L3 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
              <ul v-if="geneMenuOpen" class="agent-gene-menu">
                <li v-if="geneLoading" class="agent-gene-empty">{{ isZh ? '基因加载中…' : 'Loading genes…' }}</li>
                <template v-else>
                  <li
                    v-for="(gene, index) in filteredGenes"
                    :key="gene"
                    :class="{ active: index === geneActiveIndex }"
                    @mousedown.prevent="pickGene(gene)"
                  >{{ gene }}</li>
                  <li v-if="!filteredGenes.length" class="agent-gene-empty">{{ isZh ? '无匹配基因' : 'No matching gene' }}</li>
                </template>
              </ul>
            </div>
            <span class="agent-gene-hint">{{ geneBusy ? (isZh ? '处理中…' : 'Working…') : geneHint }}</span>
          </div>

          <div v-if="plotError" class="agent-plot-error">{{ plotError }}</div>
          <div v-if="plotWarnings.length" class="agent-plot-warnings">
            <div v-for="(warning, index) in plotWarnings" :key="index">{{ warning }}</div>
          </div>
          <div ref="plotEl" class="agent-plot-canvas"></div>
          <p v-if="embedded" class="agent-plot-inline-hint">
            {{ isZh
              ? '悬停可看细胞类型；点「展开」看完整图例、按基因着色、点聚类查差异基因。'
              : 'Hover to see cell types; open the window for the legend, gene colouring and per-cluster DEGs.' }}
          </p>
          <!-- 图 → 数据（P4）：说清这张图用的是哪些样本，并提供回到数据集页面的入口 -->
          <div v-if="sourceDatasets.length" class="agent-plot-source">
            <span class="agent-plot-source-label">
              {{ isZh ? '数据来源' : 'Data source' }}：{{ sourceDatasets.map(item => item.label || item.datasetId).join('、') }}
              <em v-if="plotClickHint" class="agent-plot-source-hint">{{ plotClickHint }}</em>
            </span>
            <button type="button" class="agent-plot-source-btn" @click.stop="openSourceData">
              {{ sourceDatasets.length === 1 ? (isZh ? '打开该数据集' : 'Open dataset') : (isZh ? '打开数据集列表' : 'Open list') }}
            </button>
          </div>
          <!-- 右下角拖动缩放（内嵌模式没有窗口，自然也不需要手柄） -->
          <div v-if="!embedded" class="agent-plot-resize" :title="isZh ? '拖动调整窗口大小' : 'Drag to resize'" @mousedown="startResize"></div>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Plotly from 'plotly.js-dist-min';
import config from '@/config';
import { parseMaybeGzipJson } from '@/utils/api';
import { buildPlotAction, buildMultiSamplePlotAction } from '@/utils/agentPlots';
import { fetchFullSpatialPoints, clearFullSpatialPointsCache } from '@/utils/agentSpatialPlot';
import { fetchFullUmapPoints, clearFullUmapPointsCache } from '@/utils/agentUmapPlot';

const props = defineProps({
  visible: { type: Boolean, default: false },
  action: { type: Object, default: null },
  // 内嵌模式：直接画在对话流里（AI 页面），不需要遮罩、拖动、关闭
  embedded: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'expand']);

// 「现在该不该有图」：弹窗看 visible，内嵌看 embedded
const active = computed(() => props.visible || props.embedded);

const { locale } = useI18n();
const router = useRouter();
const plotEl = ref(null);
const plotError = ref('');
const plotWarnings = ref([]);
const isZh = computed(() => (locale.value || '').startsWith('zh'));
const closeLabel = computed(() => (isZh.value ? '关闭绘图' : 'Close plot'));

// 当前绘制的 action：切换基因时用新 action 整体替换（props 只读，不能直接改）。
const currentAction = ref(null);
const titleText = computed(() => currentAction.value?.title || props.action?.title || props.action?.label || props.action?.plotType || (isZh.value ? '智能绘图' : 'Agent plot'));
const subtitleText = computed(() => currentAction.value?.subtitle || props.action?.subtitle || '');

// ── 图 → 数据（P4）──
// 绘图动作自带 datasets（样本 id / label / 组学类型），据此给出「回到数据集」的入口，
// 让用户看完图能落到真实数据上，而不是停在图片本身。
const DETAIL_ROUTE_BY_OMICS = {
  SC: '/browse/SingleCell',
  ST: '/browse/SpatialTranscriptome',
  ATAC: '/browse/atac',
  GWAS: '/browse/gwas',
};

const sourceDatasets = computed(() => {
  const list = currentAction.value?.datasets || props.action?.datasets || [];
  return Array.isArray(list) ? list.filter(item => item && item.datasetId) : [];
});

function openSourceData() {
  const list = sourceDatasets.value;
  const first = list[0];
  if (!first) return;
  const base = DETAIL_ROUTE_BY_OMICS[String(first.omicsType || '').toUpperCase()];
  if (!base) return;
  const target = list.length === 1 ? `${base}/${encodeURIComponent(first.datasetId)}` : base;
  emit('close');
  router.push(target);
}

// ── 图 → 数据：点组成图的柱子/扇区，直接看这个细胞类型的差异基因 ──
// 只在「单样本组成图」上生效：多样本对比图里同一类别有多组柱子，点击语义不唯一。
const cellTypeClickable = computed(() => {
  if (String(currentAction.value?.plotType || '') !== 'cell_composition') return false;
  const list = sourceDatasets.value;
  if (list.length !== 1) return false;
  return Boolean(DETAIL_ROUTE_BY_OMICS[String(list[0]?.omicsType || '').toUpperCase()]);
});

// ── UMAP 点击联动 ──
// 点任意一个点 → 打开该点所属细胞类型的 DEG，和组成图点柱子是同一个落点。
// 单样本图的 trace 名就是聚类名；多样本叠加/并排时是「样本 · 聚类」，
// 因此还能据此定位到具体数据集（同一聚类名在不同样本里是不同数据集）。
const umapClickable = computed(() => {
  if (String(currentAction.value?.plotType || '') !== 'umap') return false;
  return sourceDatasets.value.some(item => DETAIL_ROUTE_BY_OMICS[String(item.omicsType || '').toUpperCase()]);
});

// 聚类被合并成「其他」时没有对应细胞类型，点了不能去查 DEG
const MERGED_LABELS = new Set(['其他', 'Other']);

function resolveUmapClick(point) {
  const traceName = String(point?.data?.name || '').trim();
  if (!traceName) return null;
  const list = sourceDatasets.value;

  if (list.length > 1) {
    const hit = list.find(item => item?.label && traceName.startsWith(`${item.label} · `));
    if (!hit) return null;
    const cluster = traceName.slice(hit.label.length + 3).trim();
    return cluster && !MERGED_LABELS.has(cluster) ? { dataset: hit, cluster } : null;
  }

  const dataset = list[0];
  if (!dataset || MERGED_LABELS.has(traceName)) return null;
  return { dataset, cluster: traceName };
}

const plotClickHint = computed(() => {
  const zh = String(locale.value || '').toLowerCase().startsWith('zh');
  if (cellTypeClickable.value) return zh ? '· 点击柱子查看该细胞类型的差异基因' : '· click a bar to open its DEGs';
  if (umapClickable.value) return zh ? '· 点击任意点查看该细胞类型的差异基因' : '· click any point to open its DEGs';
  return '';
});

let plotClickBound = false;
function bindPlotClick() {
  if (!plotEl.value || plotClickBound) return;
  plotEl.value.on('plotly_click', handlePlotClick);
  plotClickBound = true;
}

function handlePlotClick(event) {
  const point = event?.points?.[0];

  // UMAP：点的 trace 就是细胞类型（多样本时还带样本名），直接落到该数据集 + 该细胞类型
  if (umapClickable.value) {
    const target = resolveUmapClick(point);
    if (!target) return;
    const base = DETAIL_ROUTE_BY_OMICS[String(target.dataset.omicsType || '').toUpperCase()];
    if (!base) return;
    emit('close');
    router.push(`${base}/${encodeURIComponent(target.dataset.datasetId)}?cluster=${encodeURIComponent(target.cluster)}`);
    return;
  }

  if (!cellTypeClickable.value) return;
  const raw = point?.x ?? point?.label;
  const cellType = typeof raw === 'string' ? raw.trim() : '';
  if (!cellType) return;
  const first = sourceDatasets.value[0];
  const base = DETAIL_ROUTE_BY_OMICS[String(first.omicsType || '').toUpperCase()];
  if (!base) return;
  emit('close');
  router.push(`${base}/${encodeURIComponent(first.datasetId)}?cluster=${encodeURIComponent(cellType)}`);
}

// ── 弹窗拖动 / 缩放 / 最大化 ──
const modalPos = ref(null);  // { x, y }，null = 默认居中
const modalSize = ref(null); // { w, h }，null = 默认尺寸
const maximized = ref(false);

const modalStyle = computed(() => {
  if (maximized.value) {
    return { left: '16px', top: '16px', width: 'calc(100vw - 32px)', height: 'calc(100vh - 32px)' };
  }
  const style = {};
  if (modalPos.value) {
    style.left = `${modalPos.value.x}px`;
    style.top = `${modalPos.value.y}px`;
  }
  if (modalSize.value) {
    style.width = `${modalSize.value.w}px`;
    style.height = `${modalSize.value.h}px`;
  }
  return style;
});

// 标题栏按下即拖动：首次拖动时用当前定位替换默认居中，避免跳变。
function startDrag(event) {
  if (event.button !== 0 || maximized.value) return;
  if (event.target.closest('button, input, .agent-gene-picker, .agent-plot-resize')) return;
  const modal = event.currentTarget.closest('.agent-plot-modal');
  const rect = modal.getBoundingClientRect();
  if (!modalPos.value) modalPos.value = { x: rect.left, y: rect.top };
  const origin = { ...modalPos.value };
  const startX = event.clientX;
  const startY = event.clientY;
  const move = ev => {
    modalPos.value = {
      x: Math.min(Math.max(8, origin.x + ev.clientX - startX), Math.max(8, window.innerWidth - rect.width - 8)),
      y: Math.min(Math.max(8, origin.y + ev.clientY - startY), Math.max(8, window.innerHeight - 56)),
    };
  };
  const up = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.body.classList.remove('is-plot-dragging');
  };
  document.body.classList.add('is-plot-dragging');
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

// 右下角手柄缩放：同步重排 Plotly 画布。
function startResize(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const modal = event.currentTarget.closest('.agent-plot-modal');
  const rect = modal.getBoundingClientRect();
  if (!modalSize.value) modalSize.value = { w: rect.width, h: rect.height };
  if (!modalPos.value) modalPos.value = { x: rect.left, y: rect.top };
  const origin = { ...modalSize.value };
  const startX = event.clientX;
  const startY = event.clientY;
  // 拖动过程中就用 rAF 节流重排：图会实时跟着窗口变（否则只在松手时生效，
  // 用户会以为"不能缩放"）。rAF 保证每帧最多重排一次，不会卡。
  let raf = 0;
  const scheduleResize = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (plotEl.value) Plotly.Plots.resize(plotEl.value);
    });
  };
  const move = ev => {
    modalSize.value = {
      w: Math.max(380, Math.min(origin.w + ev.clientX - startX, window.innerWidth - 16)),
      h: Math.max(300, Math.min(origin.h + ev.clientY - startY, window.innerHeight - 16)),
    };
    scheduleResize();
  };
  const up = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.body.classList.remove('is-plot-resizing');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    nextTick(() => { if (plotEl.value) Plotly.Plots.resize(plotEl.value); });
  };
  document.body.classList.add('is-plot-resizing');
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

function toggleMaximize() {
  maximized.value = !maximized.value;
  nextTick(() => { if (plotEl.value) Plotly.Plots.resize(plotEl.value); });
}

// ── 基因选择 ──
// 表达着色只做两档（按需求从简）：红色 = 检出该基因，灰色 = 不表达/无数据。
const EXPR_ON_COLOR = '#e15759';
const EXPR_OFF_COLOR = 'rgb(222,222,222)';

const isUmapPlot = computed(() => String(currentAction.value?.plotType || '').toLowerCase() === 'umap');
const isSpatialPlot = computed(() => String(currentAction.value?.plotType || '').toLowerCase() === 'spatial');
// 散点图（UMAP / 空转空间图）都按基因表达量「重新着色」，而不是切换成另一张图。
const isGeneColorablePlot = computed(() => isUmapPlot.value || isSpatialPlot.value);

// 散点图（按表达量着色）和基因表达图（切换基因）需要基因面板。
const genePanelVisible = computed(() => {
  const type = String(currentAction.value?.plotType || '').toLowerCase();
  if (!['umap', 'spatial', 'gene_expression'].includes(type)) return false;
  return Array.isArray(currentAction.value?.datasets) && currentAction.value.datasets.length > 0;
});
const geneHint = computed(() => {
  if (isGeneColorablePlot.value) {
    return isZh.value ? '选择基因后按表达量重新着色（红色 = 表达，灰色 = 不表达）' : 'Pick a gene to recolour by expression (red = expressed, grey = not)';
  }
  return isZh.value ? '选择基因后切换为该基因的表达对比图' : 'Pick a gene to switch the expression comparison';
});

const geneOptions = ref([]);
const geneMenuOpen = ref(false);
const geneQuery = ref('');
const selectedGene = ref('');
const geneActiveIndex = ref(0);
const geneLoading = ref(false);
const geneBusy = ref(false);

// 基因表可能上万条：本地过滤后只渲染前 100 条，保证下拉流畅。
const filteredGenes = computed(() => {
  const q = geneQuery.value.trim().toUpperCase();
  const list = q ? geneOptions.value.filter(g => g.toUpperCase().includes(q)) : geneOptions.value;
  return list.slice(0, 100);
});

async function loadGeneOptions() {
  if (geneOptions.value.length || geneLoading.value) return;
  const first = currentAction.value?.datasets?.[0]?.datasetId;
  if (!first) return;
  geneLoading.value = true;
  try {
    const response = await fetch(`${config.apiUrl}general_getgene.php?id=${encodeURIComponent(first)}`);
    if (!response.ok) throw new Error('gene list unavailable');
    const payload = parseMaybeGzipJson(await response.arrayBuffer());
    geneOptions.value = Array.isArray(payload?.genes) ? payload.genes : [];
  } catch (e) {
    geneOptions.value = [];
  } finally {
    geneLoading.value = false;
  }
}

function openGeneMenu(event) {
  if (geneBusy.value) return;
  geneMenuOpen.value = true;
  geneActiveIndex.value = 0;
  loadGeneOptions();
  // 聚焦时全选现有文本：直接输入即可替换，不用先手动删除或点 ×。
  if (event?.target?.select) event.target.select();
}

function pickGene(gene) {
  if (!gene || geneBusy.value) return;
  geneMenuOpen.value = false;
  geneQuery.value = gene;
  if (gene === selectedGene.value) return;
  selectedGene.value = gene;
  applyGene(gene);
}

function moveGeneActive(step) {
  const total = filteredGenes.value.length;
  if (!total) return;
  geneActiveIndex.value = (geneActiveIndex.value + step + total) % total;
}

async function applyGene(gene) {
  geneBusy.value = true;
  try {
    if (isGeneColorablePlot.value) {
      await overlayGeneOnMap(gene);
    } else {
      await replotGeneExpression(gene);
    }
  } finally {
    geneBusy.value = false;
  }
}

// 清除基因选择并回到最初请求的图（输入框 × 按钮）。
// 关键点：不能走 renderPlot 对「已被 Plotly 渲染过的 payload」二次序列化——
// 之前的实现正是因此在还原时卡死/变空白。UMAP 直接用首次渲染前保存的聚类配色快照，
// 深拷贝一份交给 Plotly（快照本身不被污染，可反复还原）。
async function restoreOriginal() {
  geneMenuOpen.value = false;
  selectedGene.value = '';
  geneQuery.value = '';
  if (!props.action || !plotEl.value) return;
  currentAction.value = props.action;
  try {
    if (isGeneColorablePlot.value && pristinePayload) {
      const clone = JSON.parse(JSON.stringify(pristinePayload));
      await Plotly.react(plotEl.value, clone.data, clone.layout, { responsive: true, displaylogo: false });
      plotWarnings.value = normalizeWarnings(props.action?.warnings || []);
    } else {
      // 表达图：用原 action 重新取数渲染（回到最初请求的基因）。
      await renderPlot();
    }
  } catch (e) {
    plotError.value = e?.message || (isZh.value ? '恢复原图失败。' : 'Failed to restore the original plot.');
  }
}

// trace 名形如「样本 · 聚类」，据此把 trace 归到对应样本取表达数据；
// 单样本图的 trace 名只有聚类名，直接归到唯一样本。
function matchDatasetByTraceName(name, datasets) {
  const text = String(name || '');
  for (const d of datasets) {
    if (text.startsWith(`${d.label} · `)) return d.datasetId;
  }
  return datasets[0]?.datasetId || '';
}

// 等间隔抽样（与绘图模块同一口径）：仅在「某基因阳的点过多」时作为兜底补齐用。
function strideSample(items, cap) {
  if (items.length <= cap) return items;
  const out = [];
  const step = items.length / cap;
  for (let i = 0; i < cap; i += 1) out.push(items[Math.floor(i * step)]);
  return out;
}

// 表达点过多时的补齐上限：阳性点通常会远少于全部点，这个值只是防止个别"全图阳"的基因把图拖死。
const MAX_SUPPLEMENT_PER_DATASET = 40000;

// 散点图基因着色（UMAP / 空转空间图）：逐样本取逐点表达（只含非零点），按 cell id 关联后重着色。
// 单细胞用 scd_getGeneExpression_bin.php；空转用 std_getGeneExpression_bin.php（两者 cell id 口径一致）。
// 两档配色：检出该基因 = 红色，未检出/无数据 = 灰色。
//
// 关于抽样（重要）：底图为了控制 payload 体积做了等间隔抽样，如果只给抽样点着色，
// 「表达该基因但落在被抽样丢弃的点上」的那部分表达会整体消失 —— 图上看不到完整表达模式。
// 因此这里分两步：
//   ① 抽样点按表达与否着色（灰/红）；
//   ② 把「表达但未被画出来」的点从全量坐标补齐，追加为纯红 trace（不抽样）。
// 于是灰色 = 抽样背景、红色 = 完整阳性集合，两者密度口径不同，会在提示里写明。
async function overlayGeneOnMap(gene) {
  const action = currentAction.value;
  const datasets = Array.isArray(action?.datasets) ? action.datasets : [];
  const payload = pristinePayload;
  if (!payload || !plotEl.value || !datasets.length) return;

  const isSpatial = isSpatialPlot.value;
  // 空转样本的逐 spot 表达在另一张接口（std_ 前缀）里。
  const endpoint = isSpatial ? 'std_getGeneExpression_bin.php' : 'scd_getGeneExpression_bin.php';
  const maps = await Promise.all(datasets.map(async d => {
    try {
      const response = await fetch(`${config.apiUrl}${endpoint}?id=${encodeURIComponent(d.datasetId)}&gene=${encodeURIComponent(gene)}`);
      if (!response.ok) return new Set();
      const rows = parseMaybeGzipJson(await response.arrayBuffer());
      // 着色只需要「该细胞是否表达」的二分信息，因此用 Set 存已表达细胞的 id。
      // 必须是 Set：Set 才有 .add()。此前误写成 Map，map.add(...) 抛 TypeError
      // 又被下面的 catch 静默吞掉并返回空集合，导致任何基因都被判成「无表达数据」。
      const set = new Set();
      (Array.isArray(rows) ? rows : []).forEach(r => {
        if (r?.i != null) set.add(String(r.i));
      });
      return set;
    } catch (e) {
      // 不再静默吞异常：取数失败时留痕，便于定位「整图无高亮」类问题。
      console.error('[AgentPlotModal] gene expression fetch failed:', d.datasetId, gene, e);
      return new Set();
    }
  }));
  const totalExpressed = maps.reduce((sum, m) => sum + m.size, 0);
  if (!totalExpressed) {
    // 整个基因在所选样本里都没有表达数据：保留聚类配色，如实说明，不给一张全灰的图。
    plotWarnings.value = [isZh.value
      ? `基因 ${gene} 在所选样本中没有表达数据，仍按聚类配色显示。`
      : `No expression data for ${gene} in the selected samples; cluster colours are kept.`];
    return;
  }

  const single = datasets.length === 1 ? datasets[0].datasetId : null;
  const setOf = datasetId => maps[datasets.findIndex(d => d.datasetId === datasetId)] || new Set();
  // 记录每条 trace 归属的样本、它用的子图轴（多面板时可能是 x2/y2）和点样式：
  // 补点时必须沿用同一套轴，否则会画到别的面板上去。
  const axisByDataset = new Map();
  const drawnByDataset = new Map();
  const data = (payload.data || []).map(trace => {
    const datasetId = single || matchDatasetByTraceName(trace.name, datasets);
    if (!axisByDataset.has(datasetId)) {
      axisByDataset.set(datasetId, { x: trace.xaxis || 'x', y: trace.yaxis || 'y', marker: trace.marker || {} });
    }
    if (!drawnByDataset.has(datasetId)) drawnByDataset.set(datasetId, new Set());
    const drawn = drawnByDataset.get(datasetId);
    const set = setOf(datasetId);
    const cellIds = Array.isArray(trace.text) ? trace.text : [];
    const color = cellIds.map(id => {
      const key = String(id);
      drawn.add(key);
      return set.has(key) ? EXPR_ON_COLOR : EXPR_OFF_COLOR;
    });
    return { ...trace, marker: { ...(trace.marker || {}), color } };
  });

  // ② 补齐被抽样丢掉的表达点
  let supplemented = 0;
  let supplementCapped = 0;
  let fullPointsFailed = false;
  for (const d of datasets) {
    const set = setOf(d.datasetId);
    if (!set.size) continue;
    const drawn = drawnByDataset.get(d.datasetId) || new Set();
    const missing = [];
    set.forEach(id => { if (!drawn.has(id)) missing.push(id); });
    if (!missing.length) continue; // 抽样点已覆盖全部表达点，不必补

    const scope = d.scope || (datasets.length === 1 ? 'single' : 'integrated');
    const points = isSpatial
      ? await fetchFullSpatialPoints(d.datasetId)
      : await fetchFullUmapPoints(d.datasetId, scope);
    if (!points) { fullPointsFailed = true; continue; }

    const missSet = new Set(missing);
    const picked = points.filter(p => p && p.i != null && missSet.has(String(p.i)));
    if (!picked.length) continue;

    let used = picked;
    if (picked.length > MAX_SUPPLEMENT_PER_DATASET) {
      supplementCapped += picked.length - MAX_SUPPLEMENT_PER_DATASET;
      used = strideSample(picked, MAX_SUPPLEMENT_PER_DATASET);
    }

    const axis = axisByDataset.get(d.datasetId) || { x: 'x', y: 'y', marker: {} };
    const marker = axis.marker || {};
    supplemented += used.length;
    data.push({
      x: used.map(p => parseFloat(isSpatial ? p.x : p.u1)),
      y: used.map(p => parseFloat(isSpatial ? p.y : p.u2)),
      mode: 'markers',
      type: 'scattergl',
      name: `${d.label || d.datasetId} · ${gene}`,
      text: used.map(p => String(p.i)),
      // 沿用底图同一样本的点样式（大小/透明度/符号），保证补上的红点与灰色点视觉一致。
      marker: {
        size: marker.size || 4,
        opacity: marker.opacity == null ? 0.9 : marker.opacity,
        symbol: marker.symbol || 'circle',
        color: EXPR_ON_COLOR,
      },
      showlegend: false,
      xaxis: axis.x,
      yaxis: axis.y,
    });
  }

  const warnings = [isZh.value
    ? `红色 = 表达 ${gene}，灰色 = 未检出/无数据。`
    : `Red = expresses ${gene}; grey = not expressed / no data.`];
  if (supplemented > 0) {
    warnings.push(isZh.value
      ? `表达该基因的 ${totalExpressed} 个细胞/spot 已全部绘制，其中 ${supplemented} 个落在抽样点之外、已补齐（补点不抽样）；灰色背景为等间隔抽样的点，故红灰密度口径不同。`
      : `All ${totalExpressed} cells/spots expressing this gene are drawn: ${supplemented} were outside the subsampled background and have been added (not subsampled). Grey points are the evenly subsampled background, so red and grey densities are not comparable.`);
  } else {
    warnings.push(isZh.value
      ? `表达该基因的 ${totalExpressed} 个细胞/spot 均落在已绘制的抽样点内。`
      : `All ${totalExpressed} cells/spots expressing this gene were already within the drawn subsample.`);
  }
  if (supplementCapped > 0) {
    warnings.push(isZh.value
      ? `该基因表达过广，另有 ${supplementCapped} 个表达点未绘制（已等间隔抽样补齐）。`
      : `This gene is expressed too widely: ${supplementCapped} expressing points were left out (supplement was subsampled).`);
  }
  if (fullPointsFailed) {
    warnings.push(isZh.value
      ? '部分样本未能获取完整坐标，其红色仅覆盖抽样点，可能不完整。'
      : 'Full coordinates were unavailable for some samples, so their red points may be incomplete.');
  }

  try {
    await Plotly.react(plotEl.value, data, payload.layout, { responsive: true, displaylogo: false });
    plotWarnings.value = warnings;
  } catch (e) {
    plotError.value = e?.message || (isZh.value ? '基因着色失败。' : 'Failed to recolour by gene.');
  }
}

// 表达对比图切换基因：用同一批样本重新取数并整图替换。
async function replotGeneExpression(gene) {
  const datasets = Array.isArray(currentAction.value?.datasets) ? currentAction.value.datasets : [];
  if (!datasets.length) return;
  let next = null;
  if (datasets.length === 1) {
    next = await buildPlotAction({ dataType: 'gene_expression', datasetId: datasets[0].datasetId, gene, locale: locale.value });
    if (next) next.datasets = datasets;
  } else {
    const { actions } = await buildMultiSamplePlotAction({
      dataType: 'gene_expression',
      datasets: datasets.map(d => ({ datasetId: d.datasetId, label: d.label, omicsType: d.omicsType })),
      gene,
      locale: locale.value,
    });
    next = actions[0] || null;
  }
  if (!next) {
    plotWarnings.value = [isZh.value
      ? `未能获取 ${gene} 在所选样本中的表达数据。`
      : `No expression data for ${gene} in the selected samples.`];
    return;
  }
  currentAction.value = next;
  await renderPlot();
}

// ── 渲染 ──
// 原始（聚类配色）payload 的快照：基因着色可反复切换、可一键还原。
let pristinePayload = null;

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
const MAX_TRACES = 200;
const MAX_POINTS = 200000;

function validatePayloadSize(payload) {
  try {
    const bytes = new Blob([JSON.stringify(payload)]).size;
    if (bytes > MAX_PAYLOAD_BYTES) {
      throw new Error(isZh.value ? '绘图 payload 超过前端安全限制。' : 'The plot payload exceeds the frontend safety limit.');
    }
  } catch (e) {
    if (e?.message) throw e;
  }
}

function countPlotPoints(data) {
  return data.reduce((sum, trace) => {
    const x = Array.isArray(trace?.x) ? trace.x.length : 0;
    const y = Array.isArray(trace?.y) ? trace.y.length : 0;
    const z = Array.isArray(trace?.z) ? trace.z.length : 0;
    return sum + Math.max(x, y, z);
  }, 0);
}

function normalizePlotAction(action) {
  const payload = action?.payload || action || {};
  const data = payload.data || payload.traces || [];
  const layout = payload.layout || {};
  const config = payload.config || {};
  plotWarnings.value = normalizeWarnings(action?.warnings || payload.warnings || []);
  validatePayloadSize(payload);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(isZh.value ? '绘图 action 缺少 data/traces。' : 'Plot action is missing data/traces.');
  }
  if (data.length > MAX_TRACES) {
    throw new Error(isZh.value ? '绘图 trace 数量超过前端限制。' : 'The plot has too many traces to render safely.');
  }
  const pointCount = countPlotPoints(data);
  if (pointCount > MAX_POINTS) {
    plotWarnings.value.push(isZh.value ? '当前图表点数较多，浏览器渲染可能变慢。' : 'This plot has many points and may render slowly.');
  }
  if (payload.truncated || action?.truncated) {
    plotWarnings.value.push(isZh.value ? '当前仅展示后端返回的部分结果。' : 'Only part of the backend result is shown.');
  }
  return {
    data,
    layout: {
      autosize: true,
      margin: { t: 36, r: 24, b: 48, l: 56, ...(layout.margin || {}) },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#27364a', ...(layout.font || {}) },
      ...layout,
    },
    config: { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['toImage'], ...config },
  };
}

function normalizeWarnings(warnings) {
  const list = Array.isArray(warnings) ? warnings : [warnings].filter(Boolean);
  return list.map(item => {
    if (typeof item === 'string') return item;
    return item?.message || item?.description || item?.code || item?.type || '';
  }).filter(Boolean);
}

// 内嵌时画布只有对话列那么宽（约 600px），而这个样本有 43 个聚类类型：
// 纵向图例吃掉右半边，横向图例又会溢出画布。折中做法是不画图例——
// 悬停仍能看到细胞类型，完整图例 / 基因着色 / 点簇查 DEG 都在「展开」里。
function applyCompactLayout(normalized) {
  const layout = normalized.layout || {};
  normalized.layout = {
    ...layout,
    showlegend: false,
    margin: { ...(layout.margin || {}), t: 12, r: 16, b: 44, l: 52 },
  };
}

async function renderPlot() {
  if (!active.value || !plotEl.value || !currentAction.value) return;
  plotError.value = '';
  try {
    const normalized = normalizePlotAction(currentAction.value);
    if (props.embedded) applyCompactLayout(normalized);
    // 快照用于「基因着色 / 还原」：必须在 Plotly.react 之前拷贝（ Plotly 会改写传入对象）。
    // 极端情况下 payload 含不可序列化内容时保留上一次快照，不影响本次渲染。
    let renderPayload = null;
    try {
      renderPayload = JSON.parse(JSON.stringify({ data: normalized.data, layout: normalized.layout }));
    } catch (e) {
      renderPayload = null;
    }
    if (renderPayload) {
      // 一律用副本渲染：normalized.data / normalized.layout 就是 props.action 里的引用，
      // 直接把引用交给 Plotly 会把它的内部字段（含循环引用）写回父组件的 action。
      // 副本渲染后，Plotly 的任何写回都只落在副本上，互不干扰。
      pristinePayload = renderPayload;
      await Plotly.react(plotEl.value, renderPayload.data, renderPayload.layout, normalized.config);
    } else {
      // 含不可序列化内容时退回原行为（直接传引用），保证仍能出图。
      if (!pristinePayload) pristinePayload = { data: normalized.data, layout: normalized.layout };
      await Plotly.react(plotEl.value, normalized.data, normalized.layout, normalized.config);
    }
    await Plotly.Plots.resize(plotEl.value);
    bindPlotClick();
  } catch (e) {
    plotError.value = e?.message || (isZh.value ? '绘图失败。' : 'Failed to render plot.');
    Plotly.purge(plotEl.value);
  }
}

// 新图打开：重置交互状态与窗口位置，避免上一张图的基因/位移残留。
//
// 注意：这里必须用「身份变化」监听，不能加 { deep: true }。
// 历史上加了 deep 就出过问题：Plotly.react / Plotly.Plots.resize 会就地改写传入的
// data / layout 对象（当时是把 action 里的引用直接传进去的，renderPlot 的快照注释也
// 印证了"Plotly 会改写传入对象"），写回落在 props.action 内部 → 被深度 watcher 捕获 →
// 回调里的 modalPos / modalSize / maximized 被重置，表现为「拖大弹窗或点最大化后自动
// 弹回标准尺寸」，也就是用户报的"缩放没用"。
// renderPlot 现已改为用副本渲染，但这个 watcher 仍然只做身份监听：
// 窗口几何只应该在「换了新图」时重置，绝不该被数据层的写入牵动。
// immediate: 内嵌模式没有"打开"这个动作，图表要在挂载时就画出来。
watch([() => props.visible, () => props.embedded, () => props.action], async () => {
  await nextTick();
  currentAction.value = props.action;
  // 工具可预置一个基因（例如用户直接说「画 MALAT1 的空间表达」）：输入框先显示它，
  // 渲染完聚类底图后再套上表达着色。
  const presetGene = String(props.action?.selectedGene || '');
  selectedGene.value = '';
  geneQuery.value = presetGene;
  geneMenuOpen.value = false;
  geneOptions.value = [];
  modalPos.value = null;
  modalSize.value = null;
  maximized.value = false;
  await renderPlot();
  if (presetGene && isGeneColorablePlot.value) {
    selectedGene.value = presetGene;
    await applyGene(presetGene);
  }
}, { immediate: true });

watch(() => props.visible, visible => {
  if (!visible && plotEl.value) {
    Plotly.purge(plotEl.value);
    // 关闭时释放「全量坐标」缓存：整合数据集可达几十万点，留着会白占内存。
    clearFullSpatialPointsCache();
    clearFullUmapPointsCache();
  }
});

// 警告/错误区在画布上方且参与 flex 布局，文案行数一变就会挤压画布高度。
// 而 Plotly 的 responsive 只监听「窗口」resize，容器自身高度变了它并不知道，
// 内部几何（把鼠标位移映射成缩放框的那套坐标）就会与真实尺寸不符——
// 表现为拖动缩放时框跟不住鼠标。这里在文案变化后补一次重排。
watch(() => [plotWarnings.value.join('\n'), plotError.value], async () => {
  await nextTick();
  const el = plotEl.value;
  // el.data 存在才说明 Plotly 已经渲染过，避免对未渲染节点调用 resize 而抛错。
  if (el && el.data) Plotly.Plots.resize(el);
});

// 点击下拉外部时收起基因菜单。
let geneMenuDocHandler = null;
watch(geneMenuOpen, open => {
  if (geneMenuDocHandler) {
    document.removeEventListener('click', geneMenuDocHandler);
    geneMenuDocHandler = null;
  }
  if (open) {
    geneMenuDocHandler = e => {
      if (!e.target.closest('.agent-gene-picker')) geneMenuOpen.value = false;
    };
    // 延迟到下一个宏任务再监听，避免打开菜单的那次点击立刻把它关掉。
    setTimeout(() => document.addEventListener('click', geneMenuDocHandler), 0);
  }
});

onBeforeUnmount(() => {
  if (geneMenuDocHandler) document.removeEventListener('click', geneMenuDocHandler);
  if (plotEl.value) Plotly.purge(plotEl.value);
});
</script>

<style scoped>
.agent-plot-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(8, 16, 28, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.agent-plot-modal {
  position: relative;
  width: min(920px, calc(100vw - 48px));
  height: min(640px, calc(100vh - 48px));
  background: #fff;
  border: 1px solid rgba(39, 54, 74, 0.12);
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 拖动/缩放后改用固定定位，left/top 才会生效 */
/* ── 内嵌模式：图直接画在对话里（AI 页面）── */
.agent-plot-inline { width: 100%; margin-top: 10px; }
.agent-plot-modal.is-embedded {
  position: static;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(24, 38, 60, 0.08);
  cursor: default;
}
.agent-plot-modal.is-embedded .agent-plot-head {
  min-height: 0;
  padding: 10px 12px 9px;
  cursor: default;
}
.agent-plot-modal.is-embedded .agent-plot-head:active { cursor: default; }
.agent-plot-modal.is-embedded .agent-plot-head h3 { font-size: 14px; }
.agent-plot-modal.is-embedded .agent-plot-head p { margin-top: 2px; font-size: 11.5px; }
.agent-plot-modal.is-embedded .agent-plot-toolbar { padding: 7px 12px; }
.agent-plot-modal.is-embedded .agent-plot-canvas { flex: none; height: 340px; min-height: 0; }
.agent-plot-modal.is-embedded .agent-plot-source { padding: 6px 12px 8px; font-size: 11px; }
.agent-plot-inline-hint {
  margin: 0;
  padding: 6px 12px 0;
  font-size: 11px;
  line-height: 1.5;
  color: #8b96a8;
}
.agent-plot-expand {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(39, 54, 74, 0.16);
  background: #fff;
  color: #4a5a73;
  font-size: 11.5px;
  font-family: inherit;
  line-height: 1;
  cursor: pointer;
}
.agent-plot-expand:hover { border-color: rgba(74, 127, 193, 0.5); color: #2f5f96; background: #f4f8ff; }

@media (max-width: 720px) {
  .agent-plot-modal.is-embedded .agent-plot-canvas { height: 260px; }
}

.agent-plot-modal.is-positioned { position: fixed; }
.agent-plot-modal.is-maximized { max-width: none; max-height: none; }
.agent-plot-head {
  min-height: 64px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(39, 54, 74, 0.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: grab;
  flex-shrink: 0;
}
.agent-plot-head:active { cursor: grabbing; }
.agent-plot-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  color: #182235;
}
.agent-plot-head p {
  margin: 3px 0 0;
  font-size: 12px;
  color: #667085;
}
.agent-plot-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.agent-plot-close,
.agent-plot-iconbtn {
  height: 30px;
  width: 30px;
  border: 1px solid rgba(39, 54, 74, 0.12);
  border-radius: 6px;
  background: #fff;
  color: #526070;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.agent-plot-close:hover,
.agent-plot-iconbtn:hover { background: #f5f7fa; color: #1f2937; }

/* 基因选择工具条 */
.agent-plot-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 18px;
  border-bottom: 1px solid rgba(39, 54, 74, 0.08);
  flex-wrap: wrap;
  flex-shrink: 0;
}
.agent-gene-picker { position: relative; }
.agent-gene-input {
  height: 30px;
  width: 220px;
  padding: 0 28px 0 10px;
  border: 1px solid rgba(39, 54, 74, 0.18);
  border-radius: 6px;
  font-size: 12.5px;
  color: #182235;
  background: #fff;
}
.agent-gene-input:focus { outline: none; border-color: rgba(74, 127, 193, 0.6); }
.agent-gene-input:disabled { background: #f5f7fa; color: #98a2b3; }
.agent-gene-clear {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(39, 54, 74, 0.10);
  color: #526070;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.agent-gene-clear:hover { background: rgba(39, 54, 74, 0.20); color: #1f2937; }
.agent-gene-clear:disabled { opacity: 0.5; cursor: default; }
.agent-gene-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 260px;
  max-height: 260px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #fff;
  border: 1px solid rgba(39, 54, 74, 0.14);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  z-index: 10;
}
.agent-gene-menu li {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: #27364a;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.agent-gene-menu li:hover,
.agent-gene-menu li.active { background: rgba(74, 127, 193, 0.10); }
.agent-gene-menu li.agent-gene-empty,
.agent-gene-menu li.agent-gene-empty:hover { color: #98a2b3; cursor: default; background: none; }
.agent-gene-hint { font-size: 11.5px; color: #667085; }

.agent-plot-canvas {
  flex: 1;
  min-height: 320px;
}

/* 图 → 数据：图下方的来源栏 */
.agent-plot-source {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 8px 18px 10px;
  border-top: 1px solid rgba(39, 54, 74, 0.08);
  background: #fafbfd;
}
.agent-plot-source-label {
  min-width: 0;
  font-size: 11.5px; color: #667085;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agent-plot-source-hint {
  font-style: normal;
  color: #4a7fc1;
}
.agent-plot-source-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(74, 127, 193, 0.35);
  background: #fff; color: #2f5f96;
  font-size: 11.5px; font-family: inherit; line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.agent-plot-source-btn:hover {
  border-color: rgba(74, 127, 193, 0.7);
  background: #f2f7ff;
}
.agent-plot-error,
.agent-plot-warnings {
  margin: 14px 18px 0;
  padding: 9px 11px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
}
.agent-plot-error {
  border: 1px solid rgba(192, 97, 74, 0.25);
  background: rgba(192, 97, 74, 0.08);
  color: #9f3d28;
}
.agent-plot-warnings {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(176, 138, 48, 0.25);
  background: rgba(176, 138, 48, 0.08);
  color: #7a5a1d;
}
/* 右下角缩放手柄：做得更显眼一些，否则用户注意不到弹窗可以拖大拖小 */
.agent-plot-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 22px;
  height: 22px;
  cursor: nwse-resize;
  z-index: 5;
}
.agent-plot-resize::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 11px;
  height: 11px;
  border-right: 3px solid rgba(39, 54, 74, 0.5);
  border-bottom: 3px solid rgba(39, 54, 74, 0.5);
  border-radius: 0 0 3px 0;
}
.agent-plot-resize:hover::after { border-color: rgba(74, 127, 193, 0.9); }

.agent-plot-fade-enter-active,
.agent-plot-fade-leave-active { transition: opacity 0.18s ease; }
.agent-plot-fade-enter-from,
.agent-plot-fade-leave-to { opacity: 0; }

/* 拖动/缩放期间全局禁选文字、统一指针 */
:global(body.is-plot-dragging),
:global(body.is-plot-dragging *) { user-select: none !important; cursor: grabbing !important; }
:global(body.is-plot-resizing),
:global(body.is-plot-resizing *) { user-select: none !important; cursor: nwse-resize !important; }

@media (max-width: 720px) {
  .agent-plot-backdrop { padding: 0; }
  .agent-plot-modal {
    width: 100vw !important;
    height: 100vh !important;
    left: 0 !important;
    top: 0 !important;
    border-radius: 0;
  }
  .agent-plot-resize { display: none; }
}
</style>
