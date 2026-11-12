<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section gwas-page">
        <div class="page-hero">
          <div class="eyebrow">{{ $t('gwas_page_eyebrow') }}</div>
          <h1 class="page-hero-title">{{ $t('gwas_page_title') }}</h1>
          <p class="page-hero-sub">{{ $t('gwas_page_sub') }}</p>
        </div>

        <div class="gwas-summary">
          <div class="summary-card">
            <span>{{ $t('gwas_summary_traits') }}</span>
            <strong>{{ traits.length }}</strong>
          </div>
          <div class="summary-card">
            <span>{{ $t('gwas_summary_categories') }}</span>
            <strong>{{ categories.length }}</strong>
          </div>
          <div class="summary-card">
            <span>{{ $t('gwas_summary_top_signal') }}</span>
            <strong>{{ topTraits[0]?.abbr || '-' }}</strong>
          </div>
          <div class="summary-card">
            <span>{{ $t('gwas_summary_selected') }}</span>
            <strong>{{ selectedTrait?.abbreviation || selectedTrait?.abbr || '-' }}</strong>
          </div>
        </div>

        <div class="gwas-layout">
          <section class="panel trait-panel">
            <div class="panel-head">
              <div>
                <h2>{{ $t('gwas_traits_title') }}</h2>
                <p>{{ $t('gwas_traits_intro') }}</p>
              </div>
            </div>

            <div class="toolbar">
              <el-input v-model="query" :placeholder="$t('gwas_search_placeholder')" clearable @keyup.enter="loadTraits" />
              <el-select v-model="category" :placeholder="$t('gwas_category')" clearable>
                <el-option v-for="c in categories" :key="c.category" :label="`${c.category} (${c.count})`" :value="c.category" />
              </el-select>
              <el-button type="primary" :loading="loading" @click="loadTraits">{{ $t('search') }}</el-button>
            </div>

            <el-table v-loading="loading" :data="pagedTraits" stripe class="trait-table" @row-click="openTrait">
              <el-table-column prop="abbr" :label="$t('gwas_col_trait')" width="105" />
              <el-table-column :label="$t('gwas_col_name')" min-width="260">
                <template #default="{ row }">{{ traitName(row) }}</template>
              </el-table-column>
              <el-table-column prop="category" :label="$t('gwas_category')" width="130" />
              <el-table-column prop="sample_size" :label="$t('gwas_sample_size')" width="130">
                <template #default="{ row }">{{ formatCount(row.sample_size) }}</template>
              </el-table-column>
              <el-table-column :label="$t('gwas_col_flags')" width="190">
                <template #default="{ row }">
                  <div class="flag-row">
                    <el-tag v-if="Number(row.is_depression_related)" size="small" type="danger">MDD</el-tag>
                    <el-tag v-if="Number(row.has_full_stats)" size="small" type="success">{{ $t('gwas_flag_full_stats') }}</el-tag>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            <div class="trait-pagination">
              <span>{{ $t('gwas_trait_count', { n: traits.length }) }}</span>
              <el-pagination
                :current-page="traitCurrentPage"
                :page-size="traitPageSize"
                :total="traits.length"
                background
                layout="prev, pager, next"
                @current-change="handleTraitPageChange"
              />
            </div>
          </section>

          <aside class="panel top-panel">
            <div class="panel-head compact">
              <div>
                <h2>{{ $t('gwas_top_title') }}</h2>
                <p>{{ $t('gwas_top_intro') }}</p>
              </div>
            </div>
            <div class="top-controls">
              <el-select v-model="topSex" size="small" @change="loadTopTraits">
                <el-option :label="$t('scd23_male')" value="male" />
                <el-option :label="$t('scd23_female')" value="female" />
              </el-select>
              <el-select v-model="topDimension" size="small" @change="loadTopTraits">
                <el-option :label="$t('gwas_dimension_cell_type')" value="cell_type" />
                <el-option :label="$t('gwas_dimension_condition')" value="condition" />
                <el-option :label="$t('gwas_dimension_section')" value="section" />
              </el-select>
            </div>
            <div v-loading="topLoading" class="top-list">
              <button v-for="item in topTraits" :key="`${item.trait_id}-${item.group}`" class="top-item" @click="goTrait(item.trait_id)">
                <span><strong>{{ item.abbr }}</strong>{{ item.group }}</span>
                <em>{{ formatNum(item.assoc_mcp) }}</em>
              </button>
              <el-empty v-if="!topLoading && !topTraits.length" :description="$t('gwas_empty_top')" />
            </div>
          </aside>
        </div>

        <section v-if="selectedTrait" class="panel detail-panel">
          <div class="panel-head detail-head">
            <div>
              <h2>{{ selectedTrait.abbreviation || selectedTrait.abbr }} · {{ traitName(selectedTrait) }}</h2>
              <p>{{ selectedTrait.full_name }}</p>
            </div>
            <router-link to="/browse/gwas" class="detail-link">{{ $t('gwas_back_all_traits') }}</router-link>
          </div>

          <div class="metadata-grid">
            <div v-for="item in metadataRows" :key="item.label" class="meta-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>

          <div class="detail-controls">
            <el-select v-model="sex" style="width: 120px" @change="reloadTraitData">
              <el-option :label="$t('scd23_male')" value="male" />
              <el-option :label="$t('scd23_female')" value="female" />
            </el-select>
            <el-select v-model="dimension" style="width: 180px" clearable :placeholder="$t('gwas_dimension')" @change="loadEnrichment">
              <el-option v-for="d in dimensions" :key="d" :label="d" :value="d" />
            </el-select>
          </div>

          <div class="detail-grid">
            <section class="subpanel enrichment-panel">
              <div class="subpanel-head">
                <div>
                  <h3>{{ $t('gwas_enrichment_title') }}</h3>
                  <p>{{ $t('gwas_enrichment_intro', { dimension: dimension || $t('gwas_all_dimensions') }) }}</p>
                </div>
              </div>
              <div ref="enrichmentPlot" class="plot-box"></div>
              <el-table v-loading="enrichLoading" :data="enrichment" size="small" stripe class="enrich-table">
                <el-table-column prop="dimension" :label="$t('gwas_dimension')" width="120" />
                <el-table-column prop="group" :label="$t('gwas_group')" min-width="150" />
                <el-table-column prop="n_cell" label="n_cell" width="95" />
                <el-table-column prop="n_ctrl" label="n_ctrl" width="95" />
                <el-table-column prop="assoc_mcp" label="assoc_mcp" width="120">
                  <template #default="{ row }">{{ formatNum(row.assoc_mcp) }}</template>
                </el-table-column>
                <el-table-column prop="assoc_mcz" label="assoc_mcz" width="110">
                  <template #default="{ row }">{{ formatFixed(row.assoc_mcz) }}</template>
                </el-table-column>
                <el-table-column prop="hetero_mcp" label="hetero_mcp" width="120">
                  <template #default="{ row }">{{ formatNum(row.hetero_mcp) }}</template>
                </el-table-column>
                <el-table-column prop="n_fdr_005" label="FDR<0.05" width="100" />
                <el-table-column prop="n_fdr_01" label="FDR<0.1" width="95" />
                <el-table-column prop="n_fdr_02" label="FDR<0.2" width="95" />
              </el-table>
              <el-empty v-if="!enrichLoading && !enrichment.length" :description="$t('gwas_empty_enrichment')" />
            </section>

            <aside class="subpanel side-data-panel">
              <div class="subpanel-head">
                <div>
                  <h3>{{ $t('gwas_cell_score_title') }}</h3>
                  <p>{{ $t('gwas_cell_score_intro') }}</p>
                </div>
              </div>
              <div v-loading="scoreLoading">
                <div v-if="cellScores" class="score-stats">
                  <div><span>{{ $t('gwas_cells') }}</span><strong>{{ formatCount(cellScores.n_cells) }}</strong></div>
                  <div><span>{{ $t('gwas_min') }}</span><strong>{{ formatFixed(cellScores.min_score) }}</strong></div>
                  <div><span>{{ $t('gwas_max') }}</span><strong>{{ formatFixed(cellScores.max_score) }}</strong></div>
                </div>
                <el-table v-if="cellScores?.scores?.length" :data="cellScores.scores.slice(0, 8)" size="small" class="mini-table">
                  <el-table-column prop="i" :label="$t('gwas_cell')" min-width="160" show-overflow-tooltip />
                  <el-table-column prop="score" :label="$t('gwas_score')" width="90">
                    <template #default="{ row }">{{ formatFixed(row.score) }}</template>
                  </el-table-column>
                </el-table>
                <el-empty v-if="!scoreLoading && (!cellScores || !cellScores.scores?.length)" :description="$t('gwas_empty_cell_score')" />
              </div>

              <div class="subpanel-head signals-head">
                <div>
                  <h3>{{ $t('gwas_signals_title') }}</h3>
                  <p>{{ $t('gwas_signals_intro') }}</p>
                </div>
              </div>
              <el-table v-loading="signalLoading" :data="signals" size="small" class="mini-table">
                <el-table-column prop="snp_id" label="SNP" min-width="110" />
                <el-table-column prop="chrom" :label="$t('gwas_chr')" width="60" />
                <el-table-column prop="p_value" label="P" width="90">
                  <template #default="{ row }">{{ formatNum(row.p_value) }}</template>
                </el-table-column>
                <el-table-column prop="mapped_gene" :label="$t('gwas_gene')" min-width="100" />
              </el-table>
              <el-empty v-if="!signalLoading && !signals.length" :description="$t('gwas_empty_signals')" />
            </aside>
          </div>
        </section>
      </section>
    </main>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Plotly from 'plotly.js-dist-min';
import NavigationBar from './general/NavigationBar.vue';
import BackToTop from './general/BackToTop.vue';
import { getGzipJson, getJson } from '@/utils/api';
import { clearAgentContext, updateAgentContext } from '@/utils/agentContext';

const route = useRoute();
const router = useRouter();
const { locale, t } = useI18n();

const loading = ref(false);
const topLoading = ref(false);
const enrichLoading = ref(false);
const scoreLoading = ref(false);
const signalLoading = ref(false);

const traits = ref([]);
const topTraits = ref([]);
const categories = ref([]);
const query = ref('');
const category = ref('');
const selectedTrait = ref(null);
const enrichment = ref([]);
const dimensions = ref([]);
const cellScores = ref(null);
const signals = ref([]);
const sex = ref('male');
const dimension = ref('cell_type');
const topSex = ref('male');
const topDimension = ref('cell_type');
const enrichmentPlot = ref(null);
const traitCurrentPage = ref(1);
const traitPageSize = 10;

const pagedTraits = computed(() => {
  const start = (traitCurrentPage.value - 1) * traitPageSize;
  return traits.value.slice(start, start + traitPageSize);
});

const metadataRows = computed(() => {
  const trait = selectedTrait.value || {};
  return [
    [t('gwas_category'), trait.category],
    [t('gwas_sample_size'), formatCount(trait.sample_size)],
    [t('gwas_ancestry'), trait.ancestry],
    [t('gwas_study'), trait.study],
    [t('gwas_publication_year'), trait.pub_year],
    [t('gwas_genome_build'), trait.genome_build],
    [t('gwas_lambda_gc'), formatFixed(trait.lambda_gc)],
    [t('gwas_full_statistics'), Number(trait.has_full_stats) ? t('gwas_available') : t('gwas_not_available')],
    [t('gwas_data_files'), Number(trait.has_data_files) ? t('gwas_available') : t('gwas_not_available')],
    [t('gwas_depression_related'), Number(trait.is_depression_related) ? t('gwas_yes') : t('gwas_no')],
  ].map(([label, value]) => ({ label, value: value || '-' }));
});

function gwasPrimaryAction(activeTab) {
  const tab = String(activeTab || '').toLowerCase();
  if (tab.includes('trait_detail')) return 'viewing_trait_detail';
  if (tab.includes('manhattan')) return 'viewing_manhattan_plot';
  if (tab.includes('enrichment')) return 'viewing_enrichment_result';
  return 'browsing_dataset_list';
}

function syncGWASAgentContext(extra = {}) {
  const trait = selectedTrait.value || {};
  const topEnrichment = enrichment.value[0] || {};
  const topSignal = signals.value[0] || {};
  const activeTab = extra.activeTab || (route.params.id ? 'gwas_trait_detail' : 'gwas_trait_list');
  updateAgentContext({
    businessState: {
      datasetId: trait.trait_id || trait.id || route.params.id || '',
      traitId: trait.trait_id || trait.id || route.params.id || '',
      omicsType: 'GWAS',
      selectedTrait: trait.abbreviation || trait.abbr || '',
      traitName: traitName(trait),
      category: category.value || trait.category || '',
      searchQuery: query.value || '',
      sex: sex.value || topSex.value || '',
      dimension: dimension.value || topDimension.value || '',
      activeTab,
      userPrimaryAction: extra.userPrimaryAction || gwasPrimaryAction(activeTab),
      ...extra,
    },
    pageSummary: {
      traitCount: traits.value.length || '',
      categoryCount: categories.value.length || '',
      topTrait: topTraits.value[0]?.abbr || '',
      enrichmentRows: enrichment.value.length || '',
      topEnrichmentGroup: topEnrichment.group || '',
      topEnrichmentP: topEnrichment.assoc_mcp || '',
      cellScoreCount: cellScores.value?.n_cells || cellScores.value?.scores?.length || '',
      signalCount: signals.value.length || '',
      topSignal: topSignal.snp_id || '',
      topSignalGene: topSignal.mapped_gene || '',
    },
    plotState: {
      plotType: selectedTrait.value ? 'gwas_enrichment_bar' : '',
      colorBy: dimension.value || topDimension.value || '',
    },
    // 页面自描述：列表页只有"关键词搜索 + 类别下拉"，没有物种/性别筛选条；
    // 详情页是单个 trait 的关联结果，没有页面级筛选。
    pageSchema: activeTab === 'gwas_trait_list'
      ? {
        filters: [
          // 这个下拉本身就是"疾病/表型类别"，把别名列全，避免模型换个说法就被判成虚报
          { key: 'category', labels: ['类别', 'Category', '疾病', '疾病类别', '表型类别'], values: categories.value.map(item => item.category).slice(0, 20) },
        ],
        columns: [
          { key: 'abbr', labels: ['性状缩写', 'Trait'] },
          { key: 'category', labels: ['类别', 'Category'] },
          { key: 'sample_size', labels: ['样本量', 'Sample size'] },
        ],
        charts: [],
      }
      : { filters: [], columns: [], charts: [] },
  });
}

function traitName(row) {
  if (!row) return '-';
  return locale.value.startsWith('zh') ? (row.chinese_name || row.name || row.full_name || '-') : (row.full_name || row.name || row.chinese_name || '-');
}

function formatCount(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString();
}

function formatNum(value) {
  return value === null || value === undefined || value === '' ? '-' : Number(value).toExponential(2);
}

function formatFixed(value) {
  return value === null || value === undefined || value === '' ? '-' : Number(value).toFixed(3);
}

function openTrait(row) {
  goTrait(row.id || row.trait_id);
}

function goTrait(id) {
  if (!id) return;
  router.push(`/browse/gwas/${id}`);
}

function handleTraitPageChange(page) {
  traitCurrentPage.value = page;
}

async function loadCategories() {
  try {
    const data = await getJson('gwas_getTraitCategories.php');
    categories.value = data.categories || [];
    syncGWASAgentContext();
  } catch (e) {
    console.error('Failed to load GWAS categories:', e);
  }
}

async function loadTraits() {
  loading.value = true;
  try {
    const params = {};
    if (query.value) params.q = query.value;
    if (category.value) params.category = category.value;
    const data = await getJson('gwas_getTraitList.php', params);
    traits.value = data.traits || [];
    traitCurrentPage.value = 1;
    syncGWASAgentContext();
  } catch (e) {
    console.error('Failed to load GWAS traits:', e);
  } finally {
    loading.value = false;
  }
}

async function loadTopTraits() {
  topLoading.value = true;
  try {
    const data = await getJson('gwas_getTopTraits.php', { sex: topSex.value, dimension: topDimension.value, limit: 12 });
    topTraits.value = data.results || [];
  } catch (e) {
    console.error('Failed to load top GWAS traits:', e);
    topTraits.value = [];
  } finally {
    topLoading.value = false;
  }
}

async function loadTraitDetail(id) {
  if (!id) {
    selectedTrait.value = null;
    enrichment.value = [];
    cellScores.value = null;
    signals.value = [];
    syncGWASAgentContext();
    return;
  }

  try {
    const data = await getJson('gwas_getTraitDetail.php', { id });
    selectedTrait.value = data.trait || null;
    syncGWASAgentContext();
    await reloadTraitData();
  } catch (e) {
    console.error('Failed to load GWAS trait detail:', e);
    selectedTrait.value = null;
    syncGWASAgentContext();
  }
}

async function reloadTraitData() {
  await loadDimensions();
  await Promise.all([loadEnrichment(), loadCellScores(), loadSignals()]);
}

async function loadDimensions() {
  if (!selectedTrait.value) return;
  try {
    const data = await getJson('gwas_getDimensions.php', { trait_id: selectedTrait.value.trait_id, sex: sex.value });
    dimensions.value = data.dimensions || [];
    if (dimensions.value.length && !dimensions.value.includes(dimension.value)) {
      dimension.value = dimensions.value[0];
    }
  } catch (e) {
    console.error('Failed to load GWAS dimensions:', e);
    dimensions.value = [];
  }
}

async function loadEnrichment() {
  if (!selectedTrait.value) return;
  enrichLoading.value = true;
  try {
    const data = await getJson('gwas_getEnrichment.php', {
      trait_id: selectedTrait.value.trait_id,
      sex: sex.value,
      dimension: dimension.value || '',
    });
    enrichment.value = data.results || [];
    await drawEnrichmentPlot();
  } catch (e) {
    console.error('Failed to load GWAS enrichment:', e);
    enrichment.value = [];
    await drawEnrichmentPlot();
  } finally {
    enrichLoading.value = false;
  }
}

async function loadCellScores() {
  if (!selectedTrait.value) return;
  scoreLoading.value = true;
  try {
    cellScores.value = await getGzipJson('gwas_getCellScores.php', {
      trait_id: selectedTrait.value.trait_id,
      sex: sex.value,
      limit: 2000,
    });
  } catch (e) {
    console.error('Failed to load GWAS cell scores:', e);
    cellScores.value = null;
  } finally {
    scoreLoading.value = false;
  }
}

async function loadSignals() {
  if (!selectedTrait.value) return;
  signalLoading.value = true;
  try {
    const data = await getJson('gwas_getSignal.php', {
      trait_abbr: selectedTrait.value.abbreviation,
      limit: 200,
    });
    signals.value = data.signals || [];
    syncGWASAgentContext();
  } catch (e) {
    console.error('Failed to load GWAS signals:', e);
    signals.value = [];
  } finally {
    signalLoading.value = false;
  }
}

async function drawEnrichmentPlot() {
  await nextTick();
  if (!enrichmentPlot.value) return;
  const rows = enrichment.value.slice(0, 15).reverse();
  if (!rows.length) {
    Plotly.purge(enrichmentPlot.value);
    return;
  }
  Plotly.newPlot(enrichmentPlot.value, [{
    type: 'bar',
    orientation: 'h',
    x: rows.map(item => -Math.log10(Math.max(Number(item.assoc_mcp || 1), 1e-300))),
    y: rows.map(item => item.group),
    marker: {
      color: rows.map(item => Number(item.n_fdr_005 || 0) > 0 ? '#c0614a' : '#5d74a2'),
    },
    hovertemplate: `%{y}<br>${t('gwas_plot_assoc_mcp')}=%{x:.2f}<extra></extra>`,
  }], {
    margin: { t: 12, r: 20, b: 42, l: 120 },
    height: 330,
    xaxis: { title: t('gwas_plot_assoc_mcp'), zeroline: false },
    yaxis: { automargin: true },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  }, { responsive: true, displayModeBar: false });
}

watch(() => route.params.id, id => loadTraitDetail(id), { immediate: true });
watch([query, category, sex, dimension, topSex, topDimension], () => syncGWASAgentContext());

onMounted(async () => {
  await Promise.all([loadCategories(), loadTraits(), loadTopTraits()]);
  syncGWASAgentContext();
});

onUnmounted(() => {
  clearAgentContext();
});

</script>


<style scoped>
@import 'css/MainStyles.css';
.gwas-page { max-width: 1320px; }
.page-hero { margin-bottom: 24px; max-width: 900px; }
.page-hero-title { font-size: 30px; font-weight: 600; margin: 4px 0 8px; color: var(--ss-text); }
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); line-height: 1.6; }
.gwas-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.summary-card, .panel, .subpanel { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 12px; box-shadow: var(--ss-shadow-sm); }
.summary-card { padding: 14px 16px; }
.summary-card span { display: block; font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
.summary-card strong { display: block; font-size: 20px; color: var(--ss-text); font-family: var(--ss-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gwas-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.panel { padding: 18px; }
.panel-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
.panel-head h2, .subpanel-head h3 { margin: 0; color: var(--ss-text); font-size: 18px; font-weight: 600; }
.panel-head p, .subpanel-head p { margin: 4px 0 0; color: var(--ss-text-2); font-size: 13px; line-height: 1.5; }
.panel-head.compact h2 { font-size: 15px; }
.toolbar { display: grid; grid-template-columns: 1fr 220px auto; gap: 10px; margin-bottom: 14px; }
.trait-table :deep(.el-table__row) { cursor: pointer; }
.trait-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; }
.trait-pagination span { color: var(--ss-text-2); font-size: 12px; }
.flag-row { display: flex; flex-wrap: wrap; gap: 5px; }
.detail-link { color: var(--ss-primary); font-weight: 600; text-decoration: none; }
.detail-link:hover { text-decoration: underline; }
.top-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.top-list { min-height: 220px; display: flex; flex-direction: column; gap: 7px; }
.top-item { width: 100%; border: 1px solid var(--ss-border-soft); background: var(--ss-bg); border-radius: 8px; padding: 9px 10px; display: flex; justify-content: space-between; gap: 10px; text-align: left; cursor: pointer; color: var(--ss-text); }
.top-item:hover { border-color: var(--ss-primary-50); background: var(--ss-primary-10); }
.top-item span { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 12px; color: var(--ss-text-2); }
.top-item strong { color: var(--ss-text); font-size: 13px; }
.top-item em { color: var(--ss-primary); font-family: var(--ss-mono); font-size: 11px; font-style: normal; }
.detail-panel { margin-top: 16px; }
.detail-head { align-items: center; }
.metadata-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
.meta-item { background: var(--ss-bg); border: 1px solid var(--ss-border-soft); border-radius: 8px; padding: 10px; min-width: 0; }
.meta-item span { display: block; font-size: 10.5px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 5px; }
.meta-item strong { display: block; color: var(--ss-text); font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-controls { display: flex; gap: 10px; margin-bottom: 14px; }
.detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
.subpanel { padding: 16px; }
.subpanel-head { margin-bottom: 12px; }
.plot-box { height: 330px; width: 100%; margin-bottom: 12px; }
.enrich-table { width: 100%; }
.side-data-panel { display: flex; flex-direction: column; gap: 12px; }
.score-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.score-stats div { background: var(--ss-bg); border: 1px solid var(--ss-border-soft); border-radius: 8px; padding: 9px; }
.score-stats span { display: block; font-size: 10px; color: var(--ss-text-3); text-transform: uppercase; margin-bottom: 4px; }
.score-stats strong { font-size: 13px; color: var(--ss-text); font-family: var(--ss-mono); }
.signals-head { margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--ss-border-soft); }
.mini-table { width: 100%; }
@media (max-width: 1100px) { .gwas-layout, .detail-grid { grid-template-columns: 1fr; } .metadata-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 800px) { .gwas-summary, .toolbar, .metadata-grid { grid-template-columns: 1fr; } .detail-head { align-items: flex-start; flex-direction: column; } }
</style>
