// AI 助手「引用样本」候选目录。
//
// 为什么不走后端技能 search_datasets：
//   1) 展示名不一致 —— 它返回的是 sample_name，而前端 ST 列表页渲染的是 SQL 里拼出来的
//      display_name（形如 F_BA11_C_rep6）；三条模态线的展示口径各不相同，照它显示用户会
//      觉得「AI 说的样本我在页面上没见过」。
//   2) 数量被截断 —— agent_skills.php 里 limit 被夹到 min(max(int,1),10)，最多返回 10 条，
//      而前端列表页本来就是全部展示。
// 这里逐个模态复用列表页自己的接口与展示口径，两边同源，且零后端改动。
//
// 三个接口的字段差异（照抄各自页面的渲染方式）：
//   SC   bsc_getSCDatasetList.php  展示 dataset_id(＝sample_name)   路由主键 sample_name
//   ST   bst_getSTDatasetList.php  展示 display_name || dataset_id  路由主键 sample_name
//   ATAC atc_getDatasetList.php    展示 name(＝sample_name)         路由主键 数字 sample_id
import config from '@/config';

const SC_LIST = 'bsc_getSCDatasetList.php';
const ST_LIST = 'bst_getSTDatasetList.php';
const ATAC_LIST = 'atc_getDatasetList.php';
const ROUTE_BASE = {
  SC: '/browse/SingleCell/',
  ST: '/browse/SpatialTranscriptome/',
  ATAC: '/browse/atac/',
};
const FIELD_LABEL = { SC: '单细胞', ST: '空转', ATAC: 'ATAC' };

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

// 页面上报的物种可能是 Human / human / 人类 / 小鼠，统一成 key 再比对。
function normalizeSpecies(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('mouse') || text.includes('鼠')) return 'mouse';
  if (text.includes('human') || text.includes('人')) return 'human';
  return text;
}

function normalizeRow(row, omicsType) {
  let id = '';
  let sampleName = '';
  let label = '';

  if (omicsType === 'ATAC') {
    // ATAC 列表页按数字 sample_id 跳转详情，详情接口也认数字 id，所以用 sample_id 当主键。
    id = pick(row, 'id', 'sample_id');
    sampleName = pick(row, 'name', 'sample_name');
  } else {
    // dataset_id 就是 sample_name：详情页路由与后端表达查询都认这个名字。
    id = pick(row, 'dataset_id', 'sample_id', 'id');
    sampleName = id;
  }
  if (!id) return null;

  const displayName = pick(row, 'display_name');
  if (omicsType === 'ST') label = displayName || id;
  else label = sampleName || id;

  const species = pick(row, 'species');
  const brainRegion = pick(row, 'area', 'tissue');
  const condition = pick(row, 'conditions', 'condition');
  const sex = pick(row, 'sex');
  const age = pick(row, 'age');
  const technology = pick(row, 'way', 'technology');

  return {
    id,
    // 数字主键也保留：不同接口认的键不同（有的认 sample_name，有的认 sample_id），
    // 取数时逐个兜底可避免"某个样本被静默丢弃"。
    sampleId: pick(row, 'sample_id', 'id'),
    rawName: sampleName,
    displayName,
    label,
    species,
    speciesKey: normalizeSpecies(species),
    brainRegion,
    condition,
    sex,
    age,
    technology,
    omicsType,
    cells: Number(row?.cells) || 0,
    route: `${ROUTE_BASE[omicsType] || ''}${encodeURIComponent(id)}`,
    meta: [FIELD_LABEL[omicsType] || omicsType, species, brainRegion, condition, sex].filter(Boolean).join(' · '),
    // 检索用的一串小写索引：样本名 / 展示名 / 物种 / 脑区 / 条件都进来。
    searchIndex: [
      label, displayName, sampleName, id, species, brainRegion, condition, sex,
      FIELD_LABEL[omicsType] || '', omicsType,
    ].join(' ').toLowerCase(),
  };
}

async function fetchList(file, omicsType) {
  try {
    const response = await fetch(`${config.apiUrl}${file}`);
    const payload = await response.json();
    // ATAC 接口把数组包在 { datasets: [...] } 里，另外两个直接返回数组。
    const rows = Array.isArray(payload) ? payload : payload?.datasets;
    if (!Array.isArray(rows)) return [];
    return rows.map(row => normalizeRow(row, omicsType)).filter(Boolean);
  } catch (e) {
    // 单个模态取不到就退化为空列表，不编造候选。
    return [];
  }
}

// 数据集清单变动极少，进程内缓存一次；用户可手动刷新。
let cache = null;

export async function loadSampleCatalog({ force = false } = {}) {
  if (cache && !force) return cache;
  const [singleCell, spatial, atac] = await Promise.all([
    fetchList(SC_LIST, 'SC'),
    fetchList(ST_LIST, 'ST'),
    fetchList(ATAC_LIST, 'ATAC'),
  ]);
  cache = [...singleCell, ...spatial, ...atac];
  return cache;
}

// 把后端返回的 sample_name 翻译成前端列表页的展示名（display_name）。
// 用于统一 AI 回答表格里的样本名，避免「引用面板叫 A、回答表格叫 B」。
export async function displayLabelFor(sampleName) {
  const key = String(sampleName || '').trim();
  if (!key) return '';
  const catalog = await loadSampleCatalog();
  const lowered = key.toLowerCase();
  const hit = catalog.find(item => (
    item.id.toLowerCase() === lowered || item.rawName.toLowerCase() === lowered
  ));
  return hit ? hit.label : key;
}

export function normalizeSpeciesKey(value) {
  return normalizeSpecies(value);
}

// 取数用的 id 候选（去重、按优先级）：目录 id（sample_name）→ 数字 sample_id → 原样键。
// 单细胞 sample_name 与空转 display_name 形式高度重叠，且各接口认的键不一定相同；
// 逐个候选去试，能最大程度避免"因 id 形态不符而丢掉某个样本"。
export async function candidateIdsFor(key) {
  const k = String(key || '').trim();
  const out = [];
  if (k) {
    try {
      const catalog = await loadSampleCatalog();
      catalog.forEach(it => {
        if (it.id === k || it.label === k || String(it.sampleId || '') === k) {
          if (it.id) out.push(it.id);
          if (it.sampleId) out.push(String(it.sampleId));
        }
      });
    } catch (e) {
      // 目录取不到就只用原键，绝不因为目录异常而丢样本。
    }
    out.push(k);
  }
  return [...new Set(out)].filter(Boolean);
}
