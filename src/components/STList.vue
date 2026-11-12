<template>
    <div>
        <NavigationBar></NavigationBar>
        <main>
            <section class="page-section">
                <div class="dataset-table">
                    <h2>{{ $t('bst1') }}</h2>
                    <p>{{ $t('bst2') }}</p>
                    <h3>{{ $t('bst2-1') }}</h3>
                    <div class="studys">
                        <ssmoodStudy2 />
                        <ssmoodStudy4 />
                    </div>
                    <div class="sec-hd" style="margin-top: 32px;">
                        <div>
                            <h3 class="sec-hd-title">{{ $t('bst2-2') }}</h3>
                            <div class="sec-hd-sub">{{ filteredDatasets.length }} of {{ datasets.length }} datasets</div>
                        </div>
                        <button class="btn-reset" @click="resetFilters">Reset filters</button>
                    </div>
                    <div class="filter-bar">
                        <div class="filter-group">
                            <span class="filter-label">{{ $t('bsc3') }}</span>
                            <div class="chip-row">
                                <button v-for="opt in speciesOpts" :key="opt.v" class="chip" :class="{ active: filters.species === opt.v }" @click="filters.species = opt.v">
                                    <span v-if="opt.dot" class="chip-dot" :style="{ background: opt.dot }"></span>
                                    {{ opt.label }}
                                </button>
                            </div>
                        </div>
                        <div class="filter-group">
                            <span class="filter-label">{{ $t('bsc4') }}</span>
                            <div class="chip-row">
                                <button class="chip" :class="{ active: filters.area === 'all' }" @click="filters.area = 'all'">All</button>
                                <button v-for="area in areaOpts" :key="area" class="chip" :class="{ active: filters.area === area }" @click="filters.area = area">
                                    {{ area }}
                                </button>
                            </div>
                        </div>
                        <div class="filter-group">
                            <span class="filter-label">{{ $t('bsc5') }}</span>
                            <div class="chip-row">
                                <button v-for="opt in sexOpts" :key="opt.v" class="chip" :class="{ active: filters.sex === opt.v }" @click="filters.sex = opt.v">
                                    {{ opt.label }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 数据集列表 -->

                    <el-table :data="filteredDatasets" stripe style="width: 100%;">
                        <!-- 数据集编号（可点击跳转） -->
                        <el-table-column prop="display_name" :label="$t('bsc6.1')" width="180">
                            <template #default="{ row }">
                                <span class="clickable" @click="goToDatasetDetails(row.dataset_id)">
                                    {{ row.display_name || row.dataset_id }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="species" :label="$t('bsc6.2')" />
                        <el-table-column prop="sex" :label="$t('bsc6.3')" />
                        <el-table-column prop="conditions" :label="$t('bsc6.4')" />
                        <el-table-column prop="area" :label="$t('bsc6.5')" />
                        <el-table-column prop="age" :label="$t('bsc6.6')" />
                        <el-table-column prop="cells" :label="$t('bsc6.7')" />
                        <el-table-column prop="way" :label="$t('bsc6.8')" />
                    </el-table>
                    <BackToTop />
                </div>
            </section>
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ssmoodStudy2 from './study/ssmoodStudy2.vue';
import ssmoodStudy4 from './study/ssmoodStudy4.vue';
//----------以下为一个ssmood页面需要的最基础的东西--------------
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';
import config from '@/config';
import { updateAgentContext, clearAgentContext } from '@/utils/agentContext';
//----------以上为一个ssmood页面需要的最基础的东西--------------

const route = useRoute();

// ── URL 筛选参数 ──
// AI 指引气泡会生成带参数的链接，落地时必须把对应筛选勾上，例如：
//   /browse/SpatialTranscriptome?species=mouse&sex=female&area=I
// 只认白名单里的值，非法/缺失一律退回 all，避免拼错的参数导致列表空白。
const SPECIES_VALUES = ['mouse', 'human'];
const SEX_VALUES = ['male', 'female'];
// 脑区取值与物种绑定：小鼠只有皮层分层 I-V，人只有 BA12/BA46
const AREA_BY_SPECIES = {
    mouse: ['I', 'II', 'III', 'IV', 'V'],
    human: ['BA12', 'BA46'],
};
const AREA_VALUES = [...AREA_BY_SPECIES.mouse, ...AREA_BY_SPECIES.human];

function readFiltersFromQuery(query = {}) {
    // URL 里大小写不一定规范（Female / ba12 / Mouse），先归一化再和选项比对。
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
    // 脑区必须与物种匹配，否则（如 mouse + BA12）会筛出空列表
    const allowedAreas = AREA_BY_SPECIES[species] || AREA_VALUES;
    return {
        species,
        area: read('area', allowedAreas),
        sex: read('sex', SEX_VALUES),
    };
}

const datasets = ref([]);
const filters = ref(readFiltersFromQuery(route.query));

// 已在列表页时，AI 再给一条筛选条件不同的链接只会改 query、不会重建组件，
// 靠这个 watch 把勾选状态同步过去。
watch(() => route.query, (query) => {
    filters.value = readFiltersFromQuery(query);
}, { deep: true });

const speciesOpts = [
    { v: 'all', label: 'All', dot: null },
    { v: 'mouse', label: 'Mouse', dot: '#3a8a72' },
    { v: 'human', label: 'Human', dot: 'rgb(93,116,162)' },
];

const sexOpts = [
    { v: 'all', label: 'All' },
    { v: 'male', label: 'Male' },
    { v: 'female', label: 'Female' },
];

const areaOpts = computed(() => {
    if (filters.value.species === 'mouse') return ['I', 'II', 'III', 'IV', 'V'];
    if (filters.value.species === 'human') return ['BA12', 'BA46'];
    return ['I', 'II', 'III', 'IV', 'V', 'BA12', 'BA46'];
});

const filteredDatasets = computed(() => {
    return datasets.value.filter(dataset => {
        return (
            (filters.value.species === 'all' || dataset.species === filters.value.species) &&
            (filters.value.area === 'all' || dataset.area === filters.value.area) &&
            (filters.value.sex === 'all' || dataset.sex === filters.value.sex)
        );
    });
});

const router = useRouter();

function resetFilters() {
    filters.value = { species: 'all', area: 'all', sex: 'all' };
}

const fetchDatasets = async () => {
    try {
        const response = await fetch(config.apiUrl + 'bst_getSTDatasetList.php');
        const data = await response.json();
        datasets.value = data;
    } catch (error) {
        console.error('Error fetching datasets:', error);
    }
};

// ── 页面自描述（P4）：本页可筛什么、表里有哪些列，由页面自己声明 ──
function registerPageSchema() {
    updateAgentContext({
        capabilities: ['browse_list', 'filter_species', 'filter_brain_region', 'filter_sex'],
        pageSchema: {
            filters: [
                { key: 'species', labels: ['物种', 'Species'], values: ['mouse', 'human'] },
                { key: 'area', labels: ['脑区', 'Brain region'], values: ['I', 'II', 'III', 'IV', 'V', 'BA12', 'BA46'] },
                { key: 'sex', labels: ['性别', 'Sex'], values: ['male', 'female'] },
            ],
            columns: [
                { key: 'dataset_id', labels: ['数据集 ID', 'Dataset ID'] },
                { key: 'species', labels: ['物种', 'Species'] },
                { key: 'sex', labels: ['性别', 'Sex'] },
                { key: 'area', labels: ['脑区', 'Brain area'] },
                { key: 'cells', labels: ['细胞数', 'Cells'] },
            ],
            // 列表页没有图表模块（同 SingleCellList：声明了就会变成"本页可切换 X"的错误说法）
            charts: [],
        },
    });
}

function syncListAgentContext() {
    updateAgentContext({
        businessState: {
            omicsType: 'ST',
            activeTab: 'spatial_dataset_list',
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

const goToDatasetDetails = (datasetId) => {
    router.push({ name: 'STPage', params: { id: datasetId } });
};
</script>

<style scoped>
@import 'css/MainStyles.css';

.has-submenu {
    background: rgba(255, 255, 255, 0.3);
}

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    padding: 16px 0;
    border-top: 1px solid var(--ss-border-soft);
    border-bottom: 1px solid var(--ss-border-soft);
    margin-bottom: 16px;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.filter-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--ss-text-3);
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.chip-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

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

.btn-reset:hover {
    color: var(--ss-primary);
    border-color: var(--ss-primary);
}




table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--ss-bg);
    box-shadow: var(--ss-shadow-sm);
}

th,
td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--ss-border);
}

th {
    background-color: var(--ss-primary-pale);
    font-weight: bold;
}

tr:hover {
    background-color: var(--ss-primary-10);
}




.clickable {
    cursor: pointer;
    text-decoration: underline;
    color: var(--ss-primary);
}

.clickable:hover {
    text-decoration: none;
    color: var(--ss-primary-80);
}
</style>
