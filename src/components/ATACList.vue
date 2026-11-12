<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section">
        <div class="page-hero">
          <div class="eyebrow">{{ $t('atac_list_eyebrow') }}</div>
          <h1 class="page-hero-title">{{ $t('atac_list_title') }}</h1>
          <p class="page-hero-sub">{{ $t('atac_list_intro') }}</p>
        </div>

        <div class="atac-overview">
          <div class="overview-card"><span>{{ $t('atac_datasets') }}</span><strong>{{ datasets.length }}</strong></div>
          <div class="overview-card"><span>{{ $t('atac_total_nuclei') }}</span><strong>{{ totalNucleiFmt }}</strong></div>
          <div class="overview-card"><span>{{ $t('atac_species') }}</span><strong>{{ speciesCount }}</strong></div>
          <div class="overview-card"><span>{{ $t('atac_technology') }}</span><strong>snATAC-seq</strong></div>
        </div>

        <div class="atac-note">
          <strong>{{ $t('atac_explore_label') }}</strong>
          {{ $t('atac_explore_desc') }}
        </div>

        <div class="sec-hd" style="margin-top: 24px;">
          <div>
            <h3 class="sec-hd-title">{{ $t('bst2-2') }}</h3>
            <div class="sec-hd-sub">{{ filteredDatasets.length }} of {{ datasets.length }} datasets</div>
          </div>
          <button class="btn-reset" @click="resetFilters">Reset filters</button>
        </div>


        <div class="filter-bar">
          <div class="filter-group">
            <span class="filter-label">{{ $t('atac_species') }}</span>
            <div class="chip-row">
              <button class="chip" :class="{ active: !speciesFilter }" @click="speciesFilter = ''">All</button>
              <button v-for="item in speciesOptions" :key="item" class="chip" :class="{ active: speciesFilter === item }" @click="speciesFilter = item">
                {{ item }}
              </button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">{{ $t('atac_tissue') }}</span>
            <div class="chip-row">
              <button class="chip" :class="{ active: !tissueFilter }" @click="tissueFilter = ''">All</button>
              <button v-for="item in tissueOptions" :key="item" class="chip" :class="{ active: tissueFilter === item }" @click="tissueFilter = item">
                {{ item }}
              </button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">{{ $t('atac_sex') }}</span>
            <div class="chip-row">
              <button class="chip" :class="{ active: !sexFilter }" @click="sexFilter = ''">All</button>
              <button v-for="item in sexOptions" :key="item" class="chip" :class="{ active: sexFilter === item }" @click="sexFilter = item">
                {{ item }}
              </button>
            </div>
          </div>
        </div>

        <el-table v-loading="loading" :data="filteredDatasets" stripe style="width: 100%;" :empty-text="$t('atac_empty_datasets')">
          <el-table-column prop="name" :label="$t('atac_dataset')" min-width="190">
            <template #default="{ row }">
              <span class="ds-id" @click="goToDataset(row.id)">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="species" :label="$t('atac_species')" width="110" />
          <el-table-column prop="condition" :label="$t('atac_condition')" width="130" />
          <el-table-column prop="tissue" :label="$t('atac_tissue')" width="130" />
          <el-table-column prop="sex" :label="$t('atac_sex')" width="90" />
          <el-table-column prop="age" :label="$t('atac_age')" width="100" />
          <el-table-column :label="$t('atac_technology')" min-width="140">
            <template #default="{ row }">{{ row.technology || 'snATAC-seq' }}</template>
          </el-table-column>
          <el-table-column prop="cells" :label="$t('atac_nuclei')" width="140" sortable>
            <template #default="{ row }"><span class="num">{{ Number(row.cells || 0).toLocaleString() }}</span></template>
          </el-table-column>
        </el-table>
      </section>
    </main>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavigationBar from './general/NavigationBar.vue';
import BackToTop from './general/BackToTop.vue';

import { formatCount, getJson } from '@/utils/api';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';

const router = useRouter();
const route = useRoute();

// ── URL 筛选参数（AI 指引气泡生成的链接会带上）──
// 例：/browse/atac?species=mouse&sex=male
// ATAC 的选项来自数据本身，所以先原样接收，数据加载后再剔除数据里不存在的值。
function readQueryString(query, key) {
  const value = query?.[key];
  return typeof value === 'string' ? value : '';
}

const loading = ref(false);
const datasets = ref([]);
const speciesFilter = ref(readQueryString(route.query, 'species'));
const tissueFilter = ref(readQueryString(route.query, 'tissue'));
const sexFilter = ref(readQueryString(route.query, 'sex'));

const uniqueOptions = (field) => computed(() => [...new Set(datasets.value.map(row => row[field]).filter(Boolean))].sort());
const speciesOptions = uniqueOptions('species');
const tissueOptions = uniqueOptions('tissue');
const sexOptions = uniqueOptions('sex');

// 已在列表页时再点一条筛选条件不同的链接：只改 query、不重建组件，这里同步勾选
watch(() => route.query, (query) => {
  speciesFilter.value = readQueryString(query, 'species');
  tissueFilter.value = readQueryString(query, 'tissue');
  sexFilter.value = readQueryString(query, 'sex');
}, { deep: true });

// 参数值在数据里并不存在（拼写不符）时自动清空，避免出现空列表
watch(datasets, () => {
  const prune = (state, options) => {
    if (state.value && options.value.length && !options.value.includes(state.value)) state.value = '';
  };
  prune(speciesFilter, speciesOptions);
  prune(tissueFilter, tissueOptions);
  prune(sexFilter, sexOptions);
});
const speciesCount = computed(() => speciesOptions.value.length || '—');
const totalNucleiFmt = computed(() => formatCount(datasets.value.reduce((sum, row) => sum + Number(row.cells || 0), 0)));

const filteredDatasets = computed(() => datasets.value.filter(row =>
  (!speciesFilter.value || row.species === speciesFilter.value)
    && (!tissueFilter.value || row.tissue === tissueFilter.value)
    && (!sexFilter.value || row.sex === sexFilter.value)
));

function resetFilters() {
  speciesFilter.value = '';
  tissueFilter.value = '';
  sexFilter.value = '';
}

async function loadDatasets() {
  loading.value = true;
  try {
    const data = await getJson('atc_getDatasetList.php');
    datasets.value = data.datasets || [];
  } catch (e) {
    console.error('Failed to load ATAC datasets:', e);
  } finally {
    loading.value = false;
  }
}

function goToDataset(id) {
  router.push({ name: 'ATACPage', params: { id } });
}

function syncListAgentContext() {
  updateAgentContext({
    // 页面自描述：ATAC 列表真实只有 物种 / 组织 / 性别 三个筛选条（没有脑区、没有条件）
    capabilities: ['browse_list', 'filter_species', 'filter_tissue', 'filter_sex'],
    pageSchema: {
      filters: [
        { key: 'species', labels: ['物种', 'Species'], values: speciesOptions.value },
        { key: 'tissue', labels: ['组织', 'Tissue'], values: tissueOptions.value },
        { key: 'sex', labels: ['性别', 'Sex'], values: sexOptions.value },
      ],
      columns: [
        { key: 'name', labels: ['数据集', 'Dataset'] },
        { key: 'species', labels: ['物种', 'Species'] },
        { key: 'condition', labels: ['条件', 'Condition'] },
        { key: 'tissue', labels: ['组织', 'Tissue'] },
        { key: 'sex', labels: ['性别', 'Sex'] },
        { key: 'cells', labels: ['细胞核数', 'Nuclei'] },
      ],
      charts: [],
    },
    businessState: {
      omicsType: 'ATAC',
      activeTab: 'atac_dataset_list',
      species: speciesFilter.value,
      brainRegion: tissueFilter.value,
      sex: sexFilter.value,
      technology: 'snATAC-seq',
      userPrimaryAction: 'browsing_dataset_list',
    },
    pageSummary: {
      datasetCount: datasets.value.length,
      filteredDatasetCount: filteredDatasets.value.length,
      speciesCount: speciesOptions.value.length,
      totalNuclei: totalNucleiFmt.value,
      datasetPreview: filteredDatasets.value.slice(0, 6).map(row => row.name || row.id).join(', '),
    },
  });
}

watch([speciesFilter, tissueFilter, sexFilter, datasets], syncListAgentContext, { deep: true });

onMounted(async () => {
  await loadDatasets();
  syncListAgentContext();
});

onUnmounted(() => {
  clearAgentContext();
});
</script>

<style scoped>
@import 'css/MainStyles.css';
.page-hero { margin-bottom: 24px; max-width: 800px; }
.page-hero-title { font-size: 30px; font-weight: 600; margin: 4px 0 8px; color: var(--ss-text); }
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); line-height: 1.6; }
.atac-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.overview-card { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 12px; padding: 14px 16px; }
.overview-card span { display: block; font-size: 11px; color: var(--ss-text-3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
.overview-card strong { font-size: 18px; color: var(--ss-text); font-family: var(--ss-mono); }
.atac-note { padding: 12px 14px; border: 1px solid rgba(102, 82, 168, .18); background: rgba(102, 82, 168, .06); border-radius: 12px; color: var(--ss-text-2); font-size: 13px; line-height: 1.6; margin-bottom: 16px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 24px; padding: 16px 0; border-top: 1px solid var(--ss-border-soft); border-bottom: 1px solid var(--ss-border-soft); margin-bottom: 16px; }
.filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-label { font-size: 11px; font-weight: 500; color: var(--ss-text-3); letter-spacing: 0.06em; text-transform: uppercase; }
.chip-row { display: flex; gap: 4px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 500; background: white; border: 1px solid var(--ss-border); color: var(--ss-text-2); cursor: pointer; transition: var(--ss-tr-fast); font-family: var(--ss-font); }
.chip:hover { background: var(--ss-primary-10); border-color: var(--ss-primary-50); }
.chip.active { background: var(--ss-primary); color: white; border-color: var(--ss-primary); }
.btn-reset { background: none; border: 1px solid var(--ss-border); color: var(--ss-text-2); font-size: 12px; padding: 5px 12px; border-radius: var(--ss-r-md); cursor: pointer; transition: var(--ss-tr-fast); font-family: var(--ss-font); }
.btn-reset:hover { color: var(--ss-primary); border-color: var(--ss-primary); }
.ds-id { color: var(--ss-primary); cursor: pointer; font-weight: 600; }
.ds-id:hover { text-decoration: underline; }
.num { font-family: var(--ss-mono); }
@media (max-width: 900px) { .atac-overview { grid-template-columns: 1fr; } }
</style>
