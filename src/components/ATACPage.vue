<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section">


        <div class="information-container">
          <div class="title-bar">
            <div class="title-bar-header">
              <h1>{{ $t('atac_detail_title') }}</h1>
            </div>
          </div>
          <div class="information-content">
            <div class="information-left">
              <h1>{{ dataset.dataset_id || route.params.id }}</h1>
              <h2>{{ $t('atac_sample_information') }}</h2>
              <p><span class="bold-black">{{ $t('atac_sample_name') }}</span>: {{ dataset.dataset_id || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_sample_id') }}</span>: {{ dataset.sample_id || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_species') }}</span>: {{ dataset.species || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_tissue_region') }}</span>: {{ dataset.area || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_condition') }}</span>: {{ dataset.conditions || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_sex') }}</span>: {{ dataset.sex || '—' }}</p>
              <p><span class="bold-black">{{ $t('atac_age') }}</span>: {{ dataset.age || '—' }}</p>
              <h2>{{ $t('atac_summary') }}</h2>
              <p><span class="bold-black">{{ $t('atac_technology') }}</span>: {{ dataset.technology || 'snATAC-seq' }}</p>
              <p><span class="bold-black">{{ $t('atac_nuclei') }}</span>: {{ formatCount(dataset.cells) }}</p>
              <p><span class="bold-black">{{ $t('atac_clusters') }}</span>: {{ dataset.clusters || '—' }}</p>
            </div>
            <div class="information-right">
              <h2>{{ $t('atac_project_sample_metadata') }}</h2>
              <p v-for="item in sourceRows" :key="item.labelKey"><span class="bold-black">{{ $t(item.labelKey) }}</span>: {{ item.value }}</p>
              <p v-if="!sourceRows.length">{{ $t('atac_no_source_metadata') }}</p>
            </div>
          </div>
        </div>


        <div class="plot-comparison-grid">
          <div class="information-left plot-panel">
            <div class="plot-panel-header">
              <h1>{{ $t('atac_umap_by_cell_type') }}</h1>
              <div class="marker-size-control plot-toolbar">
                <span class="label">{{ $t('scd22') }}:</span>
                <el-input-number v-model="markerSize1" :min="1" :max="100" :step="1" size="small" controls-position="" @change="updateUmap1" />
              </div>
            </div>
            <div class="plot-square-card">
              <img v-if="umapLoading" src="/loading.gif" alt="Loading" class="plot-loading" />
              <div id="atac-umap" class="plot-square" :style="{ visibility: umapLoading ? 'hidden' : 'visible' }"></div>
            </div>
          </div>

          <div class="information-right plot-panel">
            <div class="plot-panel-header">
              <h1>{{ $t('atac_peak_accessibility') }}</h1>
              <div class="gene-search-con plot-toolbar">
                <el-select
                  v-model="selectedPeakId"
                  filterable
                  remote
                  clearable
                  :remote-method="searchPeaks"
                  :loading="peakLoading"
                  :placeholder="$t('atac_peak_select_placeholder')"
                  @visible-change="handlePeakDropdownVisible"
                  @change="handlePeakSelect"
                  class="search-gene-input"
                >
                  <el-option
                    v-for="peak in peaks"
                    :key="peak.id"
                    :label="peak.name"
                    :value="peak.id"
                  >
                    <div class="peak-option">
                      <span>{{ peak.name }}</span>
                      <small>{{ formatPeakLocation(peak) }}</small>
                    </div>
                  </el-option>
                </el-select>
                <div class="marker-size-control">
                  <span class="label">{{ $t('scd22') }}:</span>
                  <el-input-number v-model="markerSize2" :min="1" :max="100" :step="1" size="small" controls-position="" @change="updatePeakUmap" />
                </div>
              </div>
            </div>
            <div class="plot-square-card">
              <img v-if="peakLoading" src="/loading.gif" alt="Loading" class="plot-loading" />
              <div v-if="!selectedPeak && !peakLoading" class="peak-empty-placeholder">
                <el-empty :description="$t('atac_peak_select_placeholder')" />
              </div>
              <div id="atac-peak-umap" class="plot-square" :style="{ visibility: (peakLoading || !selectedPeak) ? 'hidden' : 'visible' }"></div>
            </div>
          </div>
        </div>

        <section class="plot-card cluster-panel">
          <div class="section-head"><h3>{{ $t('atac_cluster_composition') }}</h3></div>
          <div id="atac-cluster" class="plot-box cluster-box"></div>
        </section>

        <section class="plot-card diff-panel">
          <div class="section-head">
            <div>
              <h3>{{ $t('atac_diff_peaks') }}</h3>
              <p>{{ $t('atac_diff_peaks_desc') }}</p>
            </div>
            <el-button size="small" :loading="diffLoading" @click="loadDifferentialPeaks">{{ $t('atac_load_peaks') }}</el-button>
          </div>
          <div class="diff-controls">
            <label v-if="showContrastFilter" class="diff-field">
              <span class="diff-field-label">{{ $t('atac_contrast') }}</span>
              <el-select v-model="diffContrast" :placeholder="$t('atac_contrast')" clearable filterable allow-create default-first-option class="diff-select">
                <el-option v-for="item in diffContrastOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </label>
            <label class="diff-field">
              <span class="diff-field-label">{{ $t('atac_direction') }}</span>
              <el-select v-model="diffDirection" :placeholder="$t('atac_direction')" class="diff-select">
                <el-option :label="$t('atac_direction_all')" value="all" />
                <el-option :label="$t('atac_direction_up')" value="up" />
                <el-option :label="$t('atac_direction_down')" value="down" />
              </el-select>
            </label>
            <label class="diff-field">
              <span class="diff-field-label">adj. P &lt;</span>
              <el-input-number v-model="diffPadj" :min="0.0001" :max="1" :step="0.01" controls-position="right" />
            </label>
            <label class="diff-field">
              <span class="diff-field-label">|log2FC| ≥</span>
              <el-input-number v-model="diffLog2fc" :min="0" :max="10" :step="0.1" controls-position="right" />
            </label>
            <label class="diff-field">
              <span class="diff-field-label">{{ $t('atac_max_rows') }}</span>
              <el-input-number v-model="diffLimit" :min="20" :max="5000" :step="20" controls-position="right" />
            </label>
          </div>
          <div v-if="diffAvailable" class="diff-summary">
            <div>
              <span>{{ $t('atac_total_peaks') }}</span>
              <strong>{{ diffTotal }}</strong>
              <small v-if="diffTruncated" class="diff-truncated">{{ $t('atac_result_truncated') }}</small>
            </div>
            <div><span>{{ $t('atac_showing_peaks') }}</span><strong>{{ filteredDifferentialPeaks.length }}</strong></div>
            <div><span>{{ $t('atac_selected_contrast') }}</span><strong>{{ currentContrastLabel }}</strong></div>
            <div><span>{{ $t('atac_analysis_scope') }}</span><strong>{{ formatScope(diffScope) }}</strong></div>
            <div><span>{{ $t('atac_analysis_method') }}</span><strong>{{ formatMethod(diffMethod) }}</strong></div>
          </div>
          <div class="diff-visuals">
            <div id="atac-diff-volcano" class="diff-volcano"></div>
            <div class="diff-table-card">
              <el-input v-model="diffSearch" clearable :placeholder="$t('atac_diff_search_placeholder')" class="diff-search" />
              <el-table :data="paginatedDifferentialPeaks" v-loading="diffLoading" size="small" stripe :empty-text="diffMessage || $t('atac_diff_empty')" class="diff-table">
                <el-table-column prop="peak" :label="$t('atac_peak')" min-width="240" />
                <el-table-column prop="contrast" :label="$t('atac_contrast')" width="130" />
                <el-table-column prop="log2fc" label="log2FC" width="90" sortable>
                  <template #default="{ row }">{{ formatNum(row.log2fc) }}</template>
                </el-table-column>
                <el-table-column prop="padj" :label="$t('atac_adjusted_p')" width="105" sortable>
                  <template #default="{ row }">{{ formatNum(row.padj) }}</template>
                </el-table-column>
                <el-table-column :label="$t('atac_accessibility_change')" width="165">
                  <template #default="{ row }">{{ formatNum(row.avg_acc_group1) }} / {{ formatNum(row.avg_acc_group2) }}</template>
                </el-table-column>
                <el-table-column :label="$t('atac_group_cells')" width="130">
                  <template #default="{ row }">{{ row.n_samples_group1 ?? '—' }} / {{ row.n_samples_group2 ?? '—' }}</template>
                </el-table-column>
              </el-table>
              <el-pagination
                :current-page="diffPage"
                :page-size="diffPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="filteredDifferentialPeaks.length"
                layout="total, sizes, prev, pager, next"
                small
                background
                class="diff-pagination"
                @update:current-page="diffPage = $event"
                @update:page-size="diffPageSize = $event"
              />
            </div>
          </div>
        </section>
      </section>
    </main>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Plotly from 'plotly.js-dist-min';
import NavigationBar from './general/NavigationBar.vue';
import BackToTop from './general/BackToTop.vue';

import { getJson, getGzipJson, formatCount } from '@/utils/api';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';

const route = useRoute();
const { t } = useI18n();
const dataset = ref({});
const umapData = ref([]);
const clusterLabels = ref([]);
const umapLoading = ref(false);
const peaks = ref([]);
const peakLoading = ref(false);
const selectedPeak = ref(null);
const selectedPeakId = ref(null);


const diffLoading = ref(false);
const diffContrast = ref('');
const diffContrastOptions = ref([]);
const diffDirection = ref('all');
const diffPadj = ref(0.05);
const diffLog2fc = ref(0);
const diffLimit = ref(500);
const diffSearch = ref('');
const diffPage = ref(1);
const diffPageSize = ref(10);
const differentialPeaks = ref([]);
const diffVolcanoPoints = ref([]);
const diffTotal = ref(0);
const diffTruncated = ref(false);
const diffScope = ref('');
const diffMethod = ref('');
const diffAvailable = ref(false);
const diffMessage = ref('');

const palette = ['#4a7fc1', '#3a8a72', '#c0614a', '#6652a8', '#b08a30', '#c8528c', '#5aab8a', '#7ea8d8', '#b85c5c', '#a06ec2'];
// 峰可及性色阶：从“近背景浅灰（0 = 未检出）”依次经过蓝 / 青 / 绿 / 黄 / 橙到红，
// 色相与明度同时变化，低-中-高可及性能够明显分层。
const PEAK_COLORSCALE = [
  [0.00, '#e4e7ec'],
  [0.10, '#bcd3ef'],
  [0.28, '#3b82d6'],
  [0.46, '#26a69a'],
  [0.62, '#8bc34a'],
  [0.78, '#f2c33d'],
  [0.90, '#ef7d34'],
  [1.00, '#c0392b'],
];
// 后端 atc_getPeakExpression_bin.php 返回的是 expression_peak 表中 expression_type="tfidf"
// 的非零条目（{i, nc}），未检出的细胞前端补 0。
// 实测 tfidf 分布：非零细胞占比仅 0.4% ~ 16%，取值约 5e-4 ~ 7e-2，且强右偏
// （中位数往往只有最大值的 1/10）。若按 0 ~ max 线性上色，九成以上非零细胞
// 都会挤在色阶最底部，看起来就是“一片同色”。
// 因此按 log10 压缩动态范围后再上色，色阶两端也取自本次返回值的分位点。
const PEAK_LOG_FLOOR = -5; // 无有效值时的兜底色阶下限（log10）
const PEAK_LOG_CEIL = -1;  // 无有效值时的兜底色阶上限（log10）
const PEAK_COLOR_TICKS = 6;

// tfidf 量级很小（1e-4 ~ 1e-1），用有效数字而不是小数位来显示
function formatTfidf(value) {
  if (!(value > 0)) return '0';
  return String(Number(value.toPrecision(3)));
}
const markerSize1 = ref(4);
const markerSize2 = ref(4);
const isSyncingZoom = ref(false);

function atacPrimaryAction(activeTab) {
  const tab = String(activeTab || '').toLowerCase();
  if (tab.includes('peak_accessibility')) return 'viewing_gene_expression';
  if (tab.includes('differential')) return 'viewing_deg_table';
  return 'viewing_dataset_overview';
}

function syncATACAgentContext(extra = {}) {
  const activeTab = extra.activeTab || 'atac_detail';
  updateAgentContext({
    businessState: {
      datasetId: dataset.value.dataset_id || route.params.id || '',
      omicsType: 'ATAC',
      species: dataset.value.species || '',
      brainRegion: dataset.value.area || '',
      condition: dataset.value.conditions || '',
      selectedPeak: selectedPeak.value?.name || '',
      selectedContrast: diffContrast.value || '',
      activeTab,
      userPrimaryAction: extra.userPrimaryAction || atacPrimaryAction(activeTab),
      ...extra,
    },
    pageSummary: {
      cells: dataset.value.cells || '',
      clusters: dataset.value.clusters || '',
      differentialPeakTotal: diffTotal.value || '',
      differentialPeakShown: filteredDifferentialPeaks.value.length || '',
    },
  });
}

function colorFor(index) {
  return palette[index % palette.length];
}

function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

const sourceInfo = computed(() => {
  const parsed = parseJsonObject(dataset.value.information || dataset.value.detail);
  return parsed?.DatasetSource1 || parsed || null;
});

// 当前库中仅有 1 个比较组时，选与不选返回结果完全相同，隐藏该筛选项以免误导；
// 若日后入库多个比较组，下拉会自动出现，无需改动代码
const showContrastFilter = computed(() => diffContrastOptions.value.length > 1);

const currentContrastLabel = computed(() => {
  if (diffContrast.value) return diffContrast.value;
  if (diffContrastOptions.value.length === 1) return diffContrastOptions.value[0];
  return t('atac_all_contrasts');
});

// 方向 / padj / log2FC 已由服务端筛选，这里只保留关键词搜索
const filteredDifferentialPeaks = computed(() => {
  const keyword = diffSearch.value.trim().toLowerCase();
  if (!keyword) return differentialPeaks.value;
  return differentialPeaks.value.filter(row =>
    [row.peak, row.contrast, row.chrom]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  );
});

const paginatedDifferentialPeaks = computed(() => {
  const start = (diffPage.value - 1) * diffPageSize.value;
  return filteredDifferentialPeaks.value.slice(start, start + diffPageSize.value);
});

const sourceRows = computed(() => {
  const rows = [
    ['atac_project', dataset.value.project],
    ['atac_project_id', dataset.value.project_id],
    ['atac_project_description', dataset.value.project_description],
    ['atac_has_integrated_umap', dataset.value.has_integrated_umap === 1 ? t('atac_yes') : dataset.value.has_integrated_umap === 0 ? t('atac_no') : ''],
    ['atac_original_sample_id', dataset.value.original_sample_id],
    ['atac_sample_description', dataset.value.sample_description],
  ];

  if (sourceInfo.value) {
    const source = sourceInfo.value;
    rows.push(
      ['atac_source_title', source.Title],
      ['atac_source_methodology', source.Methodology],
      ['atac_source_protocol', source.Protocol],
      ['atac_source_public_data_id', source.PublicDataID],
      ['atac_source_pubmed', source.Pubmed],
      ['atac_source_doi', source.DOI],
      ['atac_source_statement', source.Statement]
    );
  }

  return rows.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([labelKey, value]) => ({ labelKey, value }));
});

function formatNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(2);
  return n.toFixed(Math.abs(n) >= 10 ? 1 : 3);
}

function formatScope(scope) {
  if (!scope) return '—';
  return scope === 'condition_pseudobulk' ? t('atac_scope_condition_pseudobulk') : scope;
}

function formatMethod(method) {
  if (!method) return '—';
  return method === 'pseudobulk_welch_ttest' ? t('atac_method_pseudobulk_welch_ttest') : method;
}

async function loadDetail() {
  try {
    const data = await getJson('atc_getDatasetDetail.php', { id: route.params.id });
    dataset.value = data?.[0] || {};
    syncATACAgentContext();
  } catch (e) {
    console.error('Failed to load ATAC detail:', e);
  }
}

async function loadUmap() {
  umapLoading.value = true;
  try {
    const data = await getGzipJson('atc_getumapdata.php', { id: route.params.id });
    umapData.value = data.umap_data || [];
    clusterLabels.value = data.cluster_labels || [];
    await nextTick();
    drawUmap();
  } catch (e) {
    console.error('Failed to load ATAC UMAP:', e);
  } finally {
    umapLoading.value = false;
  }
}

async function loadCluster() {
  try {
    const data = await getJson('atc_getNumberOfCluster.php', { id: route.params.id });
    Plotly.newPlot('atac-cluster', [{ x: Object.keys(data), y: Object.values(data), type: 'bar', marker: { color: '#6652a8' } }], {
      margin: { t: 16, r: 12, b: 90, l: 50 },
      xaxis: { tickangle: 45, tickfont: { size: 9 } },
      yaxis: { title: t('atac_nuclei') },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    }, { responsive: true });
  } catch (e) {
    console.error('Failed to load ATAC cluster counts:', e);
  }
}

// Plotly 的 .on() 会累加监听器，重绘前先 purge 清除旧的，避免同步被重复触发
function renderPlot(id, traces, layout) {
  const existing = document.getElementById(id);
  if (existing) Plotly.purge(existing);
  Plotly.newPlot(id, traces, layout, { responsive: true });
}

// 左右两图的缩放 / 平移 / 双击重置保持同步
function bindZoomSync(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  if (!source || typeof source.on !== 'function') return;

  // 目标图可能尚未渲染（例如右侧还没选择峰）
  const targetReady = () => {
    const target = document.getElementById(targetId);
    return Boolean(target && target.data && target.data.length);
  };

  source.on('plotly_relayout', eventdata => {
    if (!eventdata || eventdata['xaxis.range[0]'] === undefined || isSyncingZoom.value) return;
    if (!targetReady()) return;
    isSyncingZoom.value = true;
    Plotly.relayout(targetId, {
      'xaxis.range[0]': eventdata['xaxis.range[0]'],
      'xaxis.range[1]': eventdata['xaxis.range[1]'],
      'yaxis.range[0]': eventdata['yaxis.range[0]'],
      'yaxis.range[1]': eventdata['yaxis.range[1]'],
    });
    setTimeout(() => { isSyncingZoom.value = false; }, 100);
  });

  source.on('plotly_doubleclick', () => {
    if (!targetReady()) return;
    Plotly.relayout(targetId, { 'xaxis.autorange': true, 'yaxis.autorange': true });
  });
}

// 目标图重新渲染后沿用源图当前视野，避免新图跳回全览
function syncRangeFrom(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  if (!source || !target || !source.layout) return;
  const xRange = source.layout.xaxis && source.layout.xaxis.range;
  const yRange = source.layout.yaxis && source.layout.yaxis.range;
  if (!xRange || !yRange) return;
  Plotly.relayout(target, {
    'xaxis.range[0]': xRange[0],
    'xaxis.range[1]': xRange[1],
    'yaxis.range[0]': yRange[0],
    'yaxis.range[1]': yRange[1],
  });
}

function drawUmap() {
  const traces = clusterLabels.value.map((label, idx) => {
    const points = umapData.value.filter(d => d.c === label);
    return {
      x: points.map(d => Number(d.u1)),
      y: points.map(d => Number(d.u2)),
      text: points.map(d => d.i),
      name: label,
      mode: 'markers',
      type: 'scattergl',
      marker: { size: markerSize1.value, color: colorFor(idx) },
    };
  });
  renderPlot('atac-umap', traces, baseLayout('UMAP1', 'UMAP2', { bare: true }));
  bindZoomSync('atac-umap', 'atac-peak-umap');
}

// 点大小只改样式，用 restyle 局部更新，避免整图重绘
function updateUmap1() {
  const gd = document.getElementById('atac-umap');
  if (!gd || !gd.data || !gd.data.length) return;
  Plotly.restyle('atac-umap', 'marker.size', markerSize1.value);
}

function updatePeakUmap() {
  const gd = document.getElementById('atac-peak-umap');
  if (!gd || !gd.data || !gd.data.length) return;
  Plotly.restyle('atac-peak-umap', 'marker.size', markerSize2.value);
}

function baseLayout(xTitle, yTitle, options = {}) {
  // bare: 隐藏坐标轴与网格，仅保留散点（UMAP 用）；火山图仍需坐标轴，故不带 bare。
  // r 始终预留色标宽度，使左右两图绘图区等宽
  const bare = Boolean(options.bare);
  return {
    margin: bare ? { t: 10, r: 72, b: 10, l: 10 } : { t: 16, r: 72, b: 48, l: 54 },
    xaxis: bare ? { visible: false, showgrid: false, zeroline: false } : { title: xTitle },
    yaxis: bare ? { visible: false, showgrid: false, zeroline: false } : { title: yTitle },
    showlegend: false,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };
}

async function searchPeaks(query = '') {
  peakLoading.value = true;
  try {
    const params = { limit: 50 };
    if (query) params.q = query;
    const data = await getJson('atc_getPeakList.php', params);
    peaks.value = data.peaks || [];
  } catch (e) {
    console.error('Failed to search ATAC peaks:', e);
    peaks.value = [];
  } finally {
    peakLoading.value = false;
  }
}

function handlePeakDropdownVisible(visible) {
  if (visible) searchPeaks();
}

function formatPeakLocation(peak) {
  if (!peak) return '';
  return [peak.chrom, peak.start, peak.end].every(value => value !== undefined && value !== null && value !== '')
    ? `${peak.chrom}:${peak.start}-${peak.end}`
    : '';
}

function resetPeakView() {
  peaks.value = [];
  selectedPeak.value = null;
  selectedPeakId.value = null;
  syncATACAgentContext({ selectedPeak: '', activeTab: 'atac_detail' });
  Plotly.purge('atac-peak-umap');
}

watch(() => route.params.id, resetPeakView);

function handlePeakSelect(peakId) {
  const peak = peaks.value.find(item => item.id === peakId);
  if (peak) {
    plotPeak(peak);
  } else if (!peakId) {
    resetPeakView();
  }
}


async function plotPeak(row) {
  selectedPeak.value = row;
  selectedPeakId.value = row.id;
  syncATACAgentContext({ selectedPeak: row.name || row.id || '', activeTab: 'peak_accessibility' });

  peakLoading.value = true;
  try {
    const payload = await getGzipJson('atc_getPeakExpression_bin.php', { id: route.params.id, peak_id: row.id });
    // 无数据时后端返回 200 + []；这里再做一次类型兜底，避免非数组导致渲染中断
    const expression = Array.isArray(payload) ? payload : [];
    const valueMap = expression.reduce((acc, item) => {
      acc[item.i] = Number(item.nc || 0);
      return acc;
    }, {});
    const values = umapData.value.map(d => valueMap[d.i] || 0);

    // 按本次返回值的真实分布确定色阶范围（log10 空间，2% ~ 98% 分位），
    // 未检出（0）的细胞压到色阶最底端，与“低可及性”区分开
    const quantile = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor((arr.length - 1) * p)))];
    const logValues = values.filter(v => v > 0).map(v => Math.log10(v)).sort((a, b) => a - b);
    let colorMin;
    let colorMax;
    if (logValues.length) {
      colorMin = quantile(logValues, 0.02);
      colorMax = quantile(logValues, 0.98);
      // 有效值太少导致色阶退化（min == max）时，围绕该值向两侧展开，避免整图同色
      if (colorMax - colorMin < 1e-6) {
        colorMin -= 0.5;
        colorMax += 0.5;
      }
    } else {
      colorMin = PEAK_LOG_FLOOR;
      colorMax = PEAK_LOG_CEIL;
    }
    const colorValues = values.map(v => (v > 0 ? Math.log10(v) : colorMin - 1));
    // 色标刻度回显真实 tfidf 值（内部是 log10 值）
    const tickvals = [];
    const ticktext = [];
    for (let i = 0; i < PEAK_COLOR_TICKS; i += 1) {
      const t = colorMin + (colorMax - colorMin) * (i / (PEAK_COLOR_TICKS - 1));
      tickvals.push(t);
      ticktext.push(formatTfidf(10 ** t));
    }

    renderPlot('atac-peak-umap', [{
      x: umapData.value.map(d => Number(d.u1)),
      y: umapData.value.map(d => Number(d.u2)),
      text: umapData.value.map((d, i) => `${d.i}<br>${formatTfidf(values[i])}`),
      mode: 'markers',
      type: 'scattergl',
      marker: {
        size: markerSize2.value,
        color: colorValues,
        colorscale: PEAK_COLORSCALE,
        cmin: colorMin,
        cmax: colorMax,
        showscale: true,
        colorbar: {
          thickness: 12,
          len: 0.92,
          x: 1,
          xanchor: 'left',
          y: 1,
          yanchor: 'top',
          outlinewidth: 0,
          tickfont: { size: 9 },
          tickmode: 'array',
          tickvals,
          ticktext,
        },
      },
    }], baseLayout('UMAP1', 'UMAP2', { bare: true }));
    bindZoomSync('atac-peak-umap', 'atac-umap');
    syncRangeFrom('atac-umap', 'atac-peak-umap');
  } catch (e) {
    console.error('Failed to load peak expression:', e);
  } finally {
    peakLoading.value = false;
  }
}



function diffParams(extra = {}) {
  const params = { ...extra };
  if (diffContrast.value) params.contrast = diffContrast.value;
  // DAP 接口原生支持这三项筛选，交给服务端，前端不再二次过滤
  if (diffDirection.value && diffDirection.value !== 'all') params.direction = diffDirection.value;
  if (diffPadj.value) params.padj_lt = diffPadj.value;
  if (diffLog2fc.value) params.log2fc_abs_gt = diffLog2fc.value;
  return params;
}

function toVolcanoPoint(row) {
  const p = Number(row.padj ?? row.pvalue ?? 1);
  return {
    ...row,
    log2fc: Number(row.log2fc || 0),
    padj: p,
    neg_log10_padj: p > 0 ? -Math.log10(p) : 0,
  };
}

function drawDiffVolcano() {
  const points = diffVolcanoPoints.value;
  const significant = points.map(item => item.padj <= diffPadj.value && Math.abs(item.log2fc) >= diffLog2fc.value ? 1 : 0);
  Plotly.newPlot('atac-diff-volcano', [{
    x: points.map(item => item.log2fc),
    y: points.map(item => item.neg_log10_padj),
    text: points.map(item => item.peak),
    mode: 'markers',
    type: 'scattergl',
    marker: {
      size: 5,
      color: significant,
      colorscale: [[0, '#cbd5e1'], [1, '#c0614a']],
      showscale: false,
      opacity: 0.78,
    },
  }], {
    ...baseLayout('log2FC', '-log10(adjusted P)'),
    margin: { t: 12, r: 12, b: 48, l: 64 },
  }, { responsive: true });
}

// DAP 专用接口：返回全部可用比较组（含每组峰数与上下调数量）
async function loadContrastOptions() {
  try {
    const data = await getJson('atc_getDAPContrasts.php');
    const list = Array.isArray(data.contrasts) ? data.contrasts : [];
    diffContrastOptions.value = Array.from(new Set(list.map(item => item.contrast).filter(Boolean))).sort();
  } catch (e) {
    console.error('Failed to load DAP contrasts:', e);
  }
}

async function loadDifferentialPeaks() {
  diffLoading.value = true;
  try {
    const peaksData = await getGzipJson('atc_getDAPeaks.php', diffParams({ limit: diffLimit.value }));
    const rows = (peaksData.peaks || []).map(toVolcanoPoint);
    differentialPeaks.value = rows;
    diffVolcanoPoints.value = rows;
    // DAP 接口返回真实总数（不受 limit 截断）；旧接口 atc_getDEGPeaks 无 total 字段
    const total = Number(peaksData.total ?? rows.length);
    diffTotal.value = total;
    diffTruncated.value = total > rows.length;
    diffScope.value = rows[0]?.scope || '';
    diffMethod.value = rows[0]?.method || '';
    diffAvailable.value = rows.length > 0;
    diffMessage.value = rows.length ? '' : t('atac_diff_empty');
    syncATACAgentContext({ selectedContrast: diffContrast.value || '', activeTab: 'differential_peaks' });
    await nextTick();
    if (diffVolcanoPoints.value.length) {
      drawDiffVolcano();
    } else {
      Plotly.purge('atac-diff-volcano');
    }
  } catch (e) {
    console.error('Failed to load differential peaks:', e);
    differentialPeaks.value = [];
    diffVolcanoPoints.value = [];
    diffTotal.value = 0;
    diffTruncated.value = false;
    diffScope.value = '';
    diffMethod.value = '';
    diffAvailable.value = false;
    diffMessage.value = t('atac_diff_empty');
    Plotly.purge('atac-diff-volcano');
  } finally {
    diffLoading.value = false;
  }
}

// 这些参数全部由服务端筛选，变化后都需重新请求；输入类控件防抖，避免逐次触发
let diffReloadTimer = null;
watch([diffContrast, diffDirection, diffPadj, diffLog2fc, diffLimit], () => {
  syncATACAgentContext({ selectedContrast: diffContrast.value || '', activeTab: 'differential_peaks' });
  diffPage.value = 1;
  clearTimeout(diffReloadTimer);
  diffReloadTimer = setTimeout(loadDifferentialPeaks, 300);
});

watch([diffSearch, diffPageSize], () => {
  diffPage.value = 1;
});

onMounted(async () => {
  await Promise.all([loadDetail(), loadUmap(), loadCluster(), loadDifferentialPeaks(), loadContrastOptions()]);
});

onUnmounted(() => {
  clearTimeout(diffReloadTimer);
  ['atac-umap', 'atac-peak-umap', 'atac-cluster', 'atac-diff-volcano'].forEach(id => {
    const gd = document.getElementById(id);
    if (gd) Plotly.purge(gd);
  });
  clearAgentContext();
});
</script>

<style scoped>
@import 'css/MainStyles.css';

.plot-comparison-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 24px;
  row-gap: 14px;
  align-items: stretch;
}

.plot-comparison-grid .information-left,
.plot-comparison-grid .information-right {
  width: auto;
  min-width: 0;
  margin: 0;
}

.plot-panel {
  display: grid;
  grid-row: span 2;
  grid-template-rows: auto auto;
  grid-template-rows: subgrid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff 0%, #f8fafd 100%);
}

.plot-panel-header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.plot-panel-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #0f172a;
}

.plot-toolbar {
  display: flex;
  align-items: center;
  width: auto;
  height: auto;
  min-height: 40px;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 10px 12px;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 10px;
  background: var(--ss-bg, #f8fafc);
}

.plot-square-card {
  position: relative;
  width: 100%;
  min-height: 400px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--ss-border-soft, #e5eaf2);
  border-radius: 10px;
  background: #fff;
}

.plot-square {
  width: 100%;
  height: 100%;
}

.plot-loading {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 48px;
  height: 48px;
}

.peak-empty-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.marker-size-control .label {
  font-size: 13px;
  color: var(--ss-text-2);
}

.search-gene-input {
  flex: 1 1 220px;
  max-width: none;
}

.peak-option {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.peak-option small {
  color: var(--ss-text-3);
}

.cluster-panel {
  margin-top: 16px;
}

.cluster-panel .cluster-box {
  height: 360px;
}

@media (max-width: 900px), (orientation: portrait) {
  .plot-comparison-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .plot-panel {
    grid-row: auto;
    grid-template-rows: auto auto;
  }
}
.page-hero { margin-bottom: 24px; max-width: 900px; }
.page-hero-title { font-size: 30px; font-weight: 600; margin: 4px 0 8px; color: var(--ss-text); }
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); line-height: 1.6; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.summary-card { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 12px; padding: 14px 16px; }
.summary-card span { display: block; font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
.summary-card strong { font-size: 15px; color: var(--ss-text); }
.plot-card { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 14px; padding: 16px; box-shadow: var(--ss-shadow-sm); }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-head h3 { margin: 0; font-size: 16px; color: var(--ss-text); }
.section-head p { margin: 4px 0 0; color: var(--ss-text-2); font-size: 13px; }
.plot-box { height: 480px; width: 100%; }
.source-card { margin-bottom: 16px; }
.source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.source-item { padding: 12px; border: 1px solid var(--ss-border); border-radius: 10px; background: var(--ss-bg); }
.source-item span { display: block; font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
.source-item strong { display: block; font-size: 13px; color: var(--ss-text); font-weight: 500; line-height: 1.5; word-break: break-word; }
.diff-panel { margin-top: 16px; }
.diff-controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-bottom: 14px; }
.diff-select { width: 190px; }
.diff-controls .el-input-number { width: 135px; }
.diff-field { display: flex; flex-direction: column; gap: 5px; }
.diff-field-label { padding-left: 2px; font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .06em; white-space: nowrap; }
.diff-truncated { display: block; margin-top: 4px; font-size: 11px; font-weight: 500; color: #b45309; }
.diff-summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.diff-summary div { min-width: 145px; padding: 10px 12px; border: 1px solid var(--ss-border); border-radius: 10px; background: var(--ss-bg); }
.diff-summary span { display: block; margin-bottom: 4px; color: var(--ss-text-3); font-size: 11px; }
.diff-summary strong { display: block; color: var(--ss-text); font-size: 14px; overflow-wrap: anywhere; }
.diff-visuals { display: grid; grid-template-columns: minmax(320px, 1.15fr) minmax(0, 1.55fr); gap: 16px; align-items: start; }
.diff-volcano { height: 450px; width: 100%; }
.diff-table-card { min-width: 0; }
.diff-search { margin-bottom: 10px; }
.diff-table { min-width: 0; }
.diff-pagination { justify-content: flex-end; margin-top: 12px; }
@media (max-width: 900px) { .summary-grid, .source-grid, .diff-visuals { grid-template-columns: 1fr; } .diff-controls { flex-direction: column; align-items: stretch; } .diff-select, .diff-controls .el-input-number { width: 100%; } .diff-pagination { justify-content: flex-start; } }
</style>
