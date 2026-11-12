<template>
  <div>
    <NavigationBar />
    <main>
      <section class="page-section">
        <!-- Page header -->
        <div class="page-hero">
          <div class="eyebrow">Database · {{ $t('browse-SingleCell') }}</div>
          <h1 class="page-hero-title">{{ $t('bsc1') }}</h1>
          <p class="page-hero-sub">{{ $t('bsc2') }}</p>
        </div>

        <div class="dataset-table">
          <!-- Featured studies -->
          <div class="sec-hd">
            <h3 class="sec-hd-title">{{ $t('bst2-1') }}</h3>
          </div>
          <div class="studys">
            <ssmoodStudy1 />
            <ssmoodStudy3 />
          </div>

          <!-- Filter bar — chip pattern instead of bordered card -->
          <div class="sec-hd" style="margin-top: 32px;">
            <div>
              <h3 class="sec-hd-title">{{ $t('bst2-2') }}</h3>
              <div class="sec-hd-sub">{{ filteredDatasets.length }} of {{ datasets.length }} datasets</div>
            </div>
            <button class="btn-reset" @click="resetFilters">Reset filters</button>
          </div>

          <div class="filter-bar">
            <!-- Species -->
            <div class="filter-group">
              <span class="filter-label">{{ $t('bsc3') }}</span>
              <div class="chip-row">
                <button v-for="opt in speciesOpts" :key="opt.v"
                        class="chip" :class="{ active: filters.species === opt.v }"
                        @click="filters.species = opt.v">
                  <span v-if="opt.dot" class="chip-dot" :style="{ background: opt.dot }"></span>
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Area — depends on species -->
            <div class="filter-group">
              <span class="filter-label">{{ $t('bsc4') }}</span>
              <div class="chip-row">
                <button class="chip" :class="{ active: filters.area === 'all' }" @click="filters.area = 'all'">All</button>
                <button v-for="a in areaOpts" :key="a"
                        class="chip" :class="{ active: filters.area === a }"
                        @click="filters.area = a">
                  {{ a }}
                </button>
              </div>
            </div>

            <!-- Sex -->
            <div class="filter-group">
              <span class="filter-label">{{ $t('bsc5') }}</span>
              <div class="chip-row">
                <button v-for="opt in sexOpts" :key="opt.v"
                        class="chip" :class="{ active: filters.sex === opt.v }"
                        @click="filters.sex = opt.v">
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Dataset table -->
          <el-table :data="filteredDatasets" stripe style="width: 100%; margin-top: 16px;">
            <el-table-column prop="dataset_id" :label="$t('bsc6.1')" width="180">
              <template #default="{ row }">
                <span class="ds-id" @click="goToDatasetDetails(row.dataset_id)">
                  {{ row.dataset_id }}
                  <svg viewBox="0 0 12 12" width="11" height="11" class="ds-arrow"><path d="M3 6 L9 6 M7 4 L9 6 L7 8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="species" :label="$t('bsc6.2')">
              <template #default="{ row }">
                <span class="tag-species" :class="`tag-${row.species}`">{{ row.species }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sex" :label="$t('bsc6.3')" width="80" />
            <el-table-column prop="conditions" :label="$t('bsc6.4')" />
            <el-table-column prop="area" :label="$t('bsc6.5')" width="100" />
            <el-table-column prop="age" :label="$t('bsc6.6')" width="90" />
            <el-table-column prop="cells" :label="$t('bsc6.7')">
              <template #default="{ row }">
                <span class="num">{{ row.cells }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="way" :label="$t('bsc6.8')" />
          </el-table>

          <!-- Empty state -->
          <div v-if="!loading && filteredDatasets.length === 0" class="empty-state">
            <div class="empty-icon">⊘</div>
            <div class="empty-title">No datasets match these filters</div>
            <button class="btn-reset" @click="resetFilters">Reset filters</button>
          </div>

          <back-to-top />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ssmoodStudy1 from './study/ssmoodStudy1.vue';
import ssmoodStudy3 from './study/ssmoodStudy3.vue';
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';
import config from '@/config';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';

const route = useRoute();

// ── URL 筛选参数 ──
// AI 指引气泡会生成带参数的链接，落地时必须把对应筛选勾上，例如：
//   /browse/SingleCell?species=human&area=BA11&sex=female
// 只认白名单里的值，非法/缺失一律退回 all，避免拼错的参数导致列表空白。
const SPECIES_VALUES = ['mouse', 'human'];
const SEX_VALUES = ['male', 'female'];
// 脑区取值与物种绑定：小鼠只有皮层分层 I-V，人只有 dlPFC 的 BA9/BA11/BA12/BA46
const AREA_BY_SPECIES = {
  mouse: ['I', 'II', 'III', 'IV', 'V'],
  human: ['BA9', 'BA11', 'BA12', 'BA46'],
};
const AREA_VALUES = [...AREA_BY_SPECIES.mouse, ...AREA_BY_SPECIES.human];

function readFiltersFromQuery(query = {}) {
  // URL 里大小写不一定规范（Female / ba11 / Human），先归一化再和选项比对。
  // 脑区同时接受 area（前端约定）与 brainRegion（后端 build_navigation_action 的输出）。
  const read = (key, allowed) => {
    const source = key === 'area' ? (query.area ?? query.brainRegion) : query[key];
    const raw = String(source || '').trim();
    if (!raw) return 'all';
    const normalized = key === 'area' ? raw.toUpperCase() : raw.toLowerCase();
    const hit = allowed.find(item => item.toLowerCase() === normalized.toLowerCase());
    return hit || 'all';
  };
  const species = read('species', SPECIES_VALUES);
  // 脑区必须与物种匹配，否则（如 mouse + BA11）会筛出空列表
  const allowedAreas = AREA_BY_SPECIES[species] || AREA_VALUES;
  return {
    species,
    area: read('area', allowedAreas),
    sex: read('sex', SEX_VALUES),
  };
}

const datasets = ref([]);
const loading = ref(true);
const filters = ref(readFiltersFromQuery(route.query));

// 已在列表页时，AI 再给一条筛选条件不同的链接只会改 query、不会重建组件，
// 靠这个 watch 把勾选状态同步过去。
watch(() => route.query, (query) => {
  filters.value = readFiltersFromQuery(query);
}, { deep: true });

// Filter chip options
const speciesOpts = [
  { v: 'all',   label: 'All', dot: null },
  { v: 'mouse', label: 'Mouse', dot: '#3a8a72' },
  { v: 'human', label: 'Human', dot: 'rgb(93,116,162)' },
];
const sexOpts = [
  { v: 'all',    label: 'All' },
  { v: 'male',   label: 'Male' },
  { v: 'female', label: 'Female' },
];
const areaOpts = computed(() => {
  if (filters.value.species === 'mouse') return ['I', 'II', 'III', 'IV', 'V'];
  if (filters.value.species === 'human') return ['BA9', 'BA11', 'BA12', 'BA46'];
  return ['I', 'II', 'III', 'IV', 'V', 'BA9', 'BA11', 'BA12', 'BA46'];
});

const filteredDatasets = computed(() =>
  datasets.value.filter(d =>
    (filters.value.species === 'all' || d.species === filters.value.species) &&
    (filters.value.area    === 'all' || d.area    === filters.value.area) &&
    (filters.value.sex     === 'all' || d.sex     === filters.value.sex)
  )
);

function resetFilters() { filters.value = { species: 'all', area: 'all', sex: 'all' }; }

const fetchDatasets = async () => {
  try {
    const r = await fetch(config.apiUrl + 'bsc_getSCDatasetList.php');
    datasets.value = await r.json();
  } catch (e) { console.error('Error fetching datasets:', e); }
  finally { loading.value = false; }
};

const router = useRouter();
const goToDatasetDetails = (id) => router.push({ name: 'SingleCellPage', params: { id } });

// ── 页面自描述（P4）──
// 列表页自己声明「我能按什么筛、表格里有哪些列」，AI 的页面快照会自动带上。
// 以后新增一个筛选维度：这里加一项 + 页面加一个 chip，不需要改 agentContext 或提示词。
function registerPageSchema() {
  updateAgentContext({
    capabilities: ['browse_list', 'filter_species', 'filter_brain_region', 'filter_sex'],
    pageSchema: {
      filters: [
        { key: 'species', labels: ['物种', 'Species'], values: SPECIES_VALUES },
        { key: 'area', labels: ['脑区', 'Brain region'], values: [...AREA_BY_SPECIES.mouse, ...AREA_BY_SPECIES.human] },
        { key: 'sex', labels: ['性别', 'Sex'], values: SEX_VALUES },
      ],
      columns: [
        { key: 'dataset_id', labels: ['数据集 ID', 'Dataset ID'] },
        { key: 'species', labels: ['物种', 'Species'] },
        { key: 'sex', labels: ['性别', 'Sex'] },
        { key: 'conditions', labels: ['条件', 'Condition'] },
        { key: 'area', labels: ['脑区', 'Brain area'] },
        { key: 'cells', labels: ['细胞数', 'Cells'] },
      ],
      // 列表页没有图表模块：这里填了值，模型就会说"本页可切换 UMAP"，
      // 而用户在当前页面根本找不到入口。charts 只声明"本页真实存在的图"。
      charts: [],
    },
  });
}

function syncListAgentContext() {
  updateAgentContext({
    businessState: {
      omicsType: 'SC',
      activeTab: 'single_cell_dataset_list',
      species: filters.value.species === 'all' ? '' : filters.value.species,
      brainRegion: filters.value.area === 'all' ? '' : filters.value.area,
      sex: filters.value.sex === 'all' ? '' : filters.value.sex,
      userPrimaryAction: 'browsing_dataset_list',
    },
    pageSummary: {
      datasetCount: datasets.value.length,
      filteredDatasetCount: filteredDatasets.value.length,
      availableRegions: areaOpts.value.join(', '),
      datasetPreview: filteredDatasets.value.slice(0, 6).map(row => row.dataset_id || row.sample_id || row.id).join(', '),
    },
  });
}

watch([filters, datasets], syncListAgentContext, { deep: true });

onMounted(async () => {
  registerPageSchema();
  await fetchDatasets();
  syncListAgentContext();
});

onUnmounted(() => {
  clearAgentContext();
});
</script>

<style scoped>
@import 'css/MainStyles.css';

/* Page header */
.page-hero { margin-bottom: 24px; max-width: 800px; }
.page-hero-title {
  font-size: 30px;
  font-weight: 600;
  margin: 4px 0 8px;
  color: var(--ss-text);
}
.page-hero-title::before { display: none; }
.page-hero-sub { font-size: 14px; color: var(--ss-text-2); line-height: 1.6; }

/* Filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px 0;
  border-top: 1px solid var(--ss-border-soft);
  border-bottom: 1px solid var(--ss-border-soft);
  margin-bottom: 0;
}
.filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--ss-text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.chip-row { display: flex; gap: 4px; flex-wrap: wrap; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  background: white;
  border: 1px solid var(--ss-border);
  color: var(--ss-text-2);
  cursor: pointer;
  transition: var(--ss-tr-fast);
  font-family: var(--ss-font);
}
.chip:hover {
  background: var(--ss-primary-10);
  border-color: var(--ss-primary-50);
}
.chip.active {
  background: var(--ss-primary);
  color: white;
  border-color: var(--ss-primary);
}
.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.4);
}

.btn-reset {
  background: none;
  border: 1px solid var(--ss-border);
  color: var(--ss-text-2);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: var(--ss-r-md);
  cursor: pointer;
  transition: var(--ss-tr-fast);
  font-family: var(--ss-font);
}
.btn-reset:hover { color: var(--ss-primary); border-color: var(--ss-primary); }

/* Dataset ID cell */
.ds-id {
  cursor: pointer;
  color: var(--ss-primary);
  font-family: var(--ss-mono);
  font-size: 12.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: var(--ss-tr-fast);
}
.ds-id:hover { color: var(--ss-primary-dark); }
.ds-arrow { opacity: 0; transition: var(--ss-tr-fast); }
.ds-id:hover .ds-arrow { opacity: 1; transform: translateX(2px); }

/* Species tags */
.tag-species {
  font-family: var(--ss-mono);
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 100px;
  font-weight: 500;
  text-transform: capitalize;
}
.tag-mouse { background: var(--ss-teal-pale); color: var(--ss-teal); }
.tag-human { background: var(--ss-primary-10); color: var(--ss-primary); }

.num { font-family: var(--ss-mono); font-size: 12.5px; color: var(--ss-text); }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 56px 20px;
  color: var(--ss-text-3);
}
.empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.4; }
.empty-title { font-size: 14px; margin-bottom: 16px; }

@media (max-width: 800px) {
  .filter-bar { gap: 16px; }
  .filter-group { flex-direction: column; align-items: flex-start; gap: 8px; width: 100%; }
}
</style>
