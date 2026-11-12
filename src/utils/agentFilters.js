// 筛选条件解析的**唯一实现**（P4）。
//
// 背景：同一个「物种 / 性别 / 脑区」的识别，之前写了两遍——
//   · agentSlots.normalizeSlots  处理模型给的结构化 slots
//   · agentStudyLinks.detect*    处理用户原话的关键词兜底
// 两份实现各自维护别名表，改一个说法要改两处，还容易不一致
// （例如「母老鼠」文本层认，slots 层只认 female）。
//
// 现在统一到这里：
//   输入 = 模型 slots 和/或 用户原话
//   输出 = 同一份 { modality, species, sex, area }
// 拼 URL、写文案也各只保留一份（buildListQuery / describeFilters）。
//
// 本文件是纯函数，不依赖 Vue / 网络，可直接被 eval 引用做回归。

// ── 取值白名单 ──
export const ALLOWED_SPECIES = ['mouse', 'human'];
export const ALLOWED_SEX = ['male', 'female'];

// 脑区取值与物种绑定（与数据库一致：小鼠只有皮层分层，人类只有 Brodmann 分区）
export const AREA_BY_SPECIES = {
  mouse: ['I', 'II', 'III', 'IV', 'V'],
  human: ['BA9', 'BA11', 'BA12', 'BA46'],
};

export const ALL_AREAS = [...AREA_BY_SPECIES.mouse, ...AREA_BY_SPECIES.human];

// 各列表页真正支持哪些脑区（空转没有 BA9/BA11；ATAC 用 tissue 而非 area）
export const AREA_BY_PAGE = {
  '/browse/SingleCell': ['I', 'II', 'III', 'IV', 'V', 'BA9', 'BA11', 'BA12', 'BA46'],
  '/browse/SpatialTranscriptome': ['I', 'II', 'III', 'IV', 'V', 'BA12', 'BA46'],
  '/browse/atac': null,
};

// 模态 → 列表页
export const NAV_PAGE_BY_MODALITY = {
  SC: '/browse/SingleCell',
  ST: '/browse/SpatialTranscriptome',
  ATAC: '/browse/atac',
};

const MOUSE_LAYERS = ['I', 'II', 'III', 'IV', 'V'];
const LAYER_MAP = {
  一: 'I', 二: 'II', 三: 'III', 四: 'IV', 五: 'V',
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
  one: 'I', two: 'II', three: 'III', four: 'IV', five: 'V',
};

function text(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

// ── 物种 / 脑区冲突校验 ──
// 小鼠没有 BA 分区、人类没有皮层分层：冲突时丢掉脑区，保住物种
// （宁可少筛一个条件，也不要拼出一个必然空结果的链接）。
export function reconcileSpeciesArea(species, area) {
  if (!area) return { species: species || null, area: null };
  const areaSpecies = AREA_BY_SPECIES.mouse.includes(area) ? 'mouse' : 'human';
  if (species && species !== areaSpecies) return { species, area: null };
  return { species: species || areaSpecies, area };
}

// ── 入口 1：模型给的 slots ──
// 模型可能写成 "Mouse" / "MALE" / "snRNA"，统一归一化再校验。
export function normalizeSlotValues(raw = {}) {
  const rawModality = text(raw.modality || raw.omicsType || raw.type || raw.tech).toUpperCase();
  let modality = NAV_PAGE_BY_MODALITY[rawModality] ? rawModality : null;
  if (!modality && /^(SCRNA|SNRNA|SC|SINGLE)/.test(rawModality)) modality = 'SC';
  if (!modality && /^(ST|SPATIAL|STEREO|VISIUM)/.test(rawModality)) modality = 'ST';

  const speciesRaw = text(raw.species || raw.speciesKey).toLowerCase();
  const species = ALLOWED_SPECIES.includes(speciesRaw) ? speciesRaw : null;

  const sexRaw = text(raw.sex || raw.gender).toLowerCase();
  const sex = ALLOWED_SEX.includes(sexRaw) ? sexRaw : null;

  const areaRaw = text(raw.area || raw.brainRegion || raw.region || raw.tissue_raw).toUpperCase();
  const area = ALL_AREAS.includes(areaRaw) ? areaRaw : null;

  const reconciled = reconcileSpeciesArea(species, area);
  return { modality, species: reconciled.species, sex, area: reconciled.area };
}

// ── 入口 2：用户原话 ──
export function detectModality(msg) {
  // 注意：不要写 \b空转\b —— JS 的 \b 只认 ASCII 词边界，
  // "人类空转" 里两个字之间没有边界，会导致识别不到模态。
  const isST = /空转|空间转录组|空间组学|\bspatial\b|visium|stereo-?seq|空间整合|空间数据/i.test(msg);
  const isSC = /单细胞|单核|scrna|scRNA-?seq|single[-\s]?cell|snRNA|单细胞测序|单细胞整合|单细胞数据/i.test(msg);
  if (isST && isSC) return 'BOTH';
  if (isST) return 'ST';
  if (isSC) return 'SC';
  return null; // 不明确（如只说"BA12 数据"）→ 交给 LLM / 术语卡
}

export function detectBrainRegion(msg) {
  let m = msg.match(/\bBA(9|11|12|46)\b/i);
  if (m) return { species: 'human', region: 'BA' + m[1].toUpperCase() };

  m = msg.match(/Brodmann\s*(?:area\s*)?(\d+)/i);
  if (m && AREA_BY_SPECIES.human.includes('BA' + m[1])) return { species: 'human', region: 'BA' + m[1] };

  // 小鼠皮层分层：第 II 层 / 第 2 层 / layer II
  m = msg.match(/第?\s*([一二三四五]|[1-5]|[IVX]+|one|two|three|four|five)\s*层/i);
  if (!m) m = msg.match(/\blayer\s*([IVX]+|[1-5]|one|two|three|four|five)\b/i);
  if (m) {
    const key = m[1].toLowerCase();
    const layer = LAYER_MAP[key] || (MOUSE_LAYERS.includes(m[1].toUpperCase()) ? m[1].toUpperCase() : null);
    if (layer) return { species: 'mouse', region: layer };
  }
  return null;
}

// 只认消息里明确出现的词，宁可少给一个筛选，也不把用户没说的条件加上去。
// 中文没有词边界：「人」既有「人类」也有「个人/人工」这类误伤，所以先剔除明显不是物种的用法，
// 再要求「人」与单细胞/空转/数据/样本这类数据词同时出现才算数。
export function detectSpecies(msg) {
  const cleaned = msg.replace(/人工|个人|别人|他人|每人|人数/g, '');
  const hasMouse = /母鼠|公鼠|小鼠|大鼠|鼠|mouse|mice/i.test(cleaned);
  const hasHuman = /人类|人源|人的|病人|健康人|human|patient/i.test(cleaned)
    || (cleaned.includes('人') && /单细胞|空转|空间|数据|样本|组织|脑区|atac/i.test(cleaned));
  if (hasMouse && hasHuman) return null; // 两种都提到，不猜
  if (hasMouse) return 'mouse';
  if (hasHuman) return 'human';
  return null;
}

// 性别说法很多：母鼠/母老鼠/雌鼠/雌性/女性；公鼠/公老鼠/雄鼠/雄性/男性。
// 两种都提到时（「公老鼠和母老鼠」）不筛性别，否则会漏掉一半样本。
export function detectSex(msg) {
  const femaleHit = /母(?:老)?鼠|雌鼠|雌性|女性|female/i.test(msg);
  const maleHit = /公(?:老)?鼠|雄鼠|雄性|男性|\bmale\b/i.test(msg);
  if (femaleHit && !maleHit) return 'female';
  if (maleHit && !femaleHit) return 'male';
  return null;
}

export function detectFromText(msg = '') {
  const message = String(msg);
  const region = detectBrainRegion(message);
  const species = region?.species || detectSpecies(message);
  const sex = detectSex(message);
  const area = region?.region || null;
  const reconciled = reconcileSpeciesArea(species, area);
  return {
    modality: detectModality(message),
    species: reconciled.species,
    sex,
    area: reconciled.area,
    hasRegion: Boolean(region),
  };
}

// ── 统一入口 ──
// slots 优先（模型理解的结果），缺失项用原话补齐（原话只认明确出现过的说法）。
export function resolveFilters({ slots = null, text: rawText = '' } = {}) {
  const fromSlots = slots && typeof slots === 'object' ? normalizeSlotValues(slots) : null;
  const fromText = rawText ? detectFromText(rawText) : null;

  const pick = key => (fromSlots && fromSlots[key]) || (fromText && fromText[key]) || null;
  const reconciled = reconcileSpeciesArea(pick('species'), pick('area'));

  return {
    modality: pick('modality'),
    species: reconciled.species,
    sex: pick('sex'),
    area: reconciled.area,
    hasRegion: Boolean(fromText?.hasRegion),
  };
}

export function hasFilters(filters = {}) {
  return Boolean(filters && (filters.species || filters.sex || filters.area));
}

// ── 拼 URL / 写文案：各只保留一份 ──
export function buildListQuery(filters = {}, page = '') {
  const params = [];
  if (filters.species) params.push(`species=${filters.species}`);
  if (filters.sex) params.push(`sex=${filters.sex}`);
  const allowed = page ? AREA_BY_PAGE[page] : undefined;
  const areaAllowed = allowed === undefined ? true : Boolean(allowed && allowed.includes(filters.area));
  if (filters.area && areaAllowed) params.push(`area=${encodeURIComponent(filters.area)}`);
  return params.length ? `?${params.join('&')}` : '';
}

export function describeFilters(filters = {}, isZh = true) {
  const parts = [];
  if (filters.species === 'mouse') parts.push(isZh ? '小鼠' : 'Mouse');
  if (filters.species === 'human') parts.push(isZh ? '人' : 'Human');
  if (filters.sex === 'male') parts.push(isZh ? '雄性' : 'Male');
  if (filters.sex === 'female') parts.push(isZh ? '雌性' : 'Female');
  if (filters.area) parts.push(filters.area);
  return parts.join(' · ');
}
