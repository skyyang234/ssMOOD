import pako from 'pako';
import config from '@/config';

export function apiUrl(endpoint, params) {
  const query = params instanceof URLSearchParams ? params.toString() : new URLSearchParams(params || {}).toString();
  return `${config.apiUrl}${endpoint}${query ? `?${query}` : ''}`;
}

export async function getJson(endpoint, params) {
  const response = await fetch(apiUrl(endpoint, params));
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

export function parseMaybeGzipJson(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let json;
  try {
    json = pako.ungzip(bytes, { to: 'string' });
  } catch (e) {
    json = new TextDecoder('utf-8').decode(bytes);
  }
  return JSON.parse(json);
}

export async function getGzipJson(endpoint, params) {
  const response = await fetch(apiUrl(endpoint, params));
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return parseMaybeGzipJson(await response.arrayBuffer());
}


// 后端布尔标记在不同接口里可能是 true/false，也可能是 1/0 或 "1"/"0"，统一归一化。
// 返回 null 表示该字段缺失（未知），便于与明确的 false 区分。
export function normalizeBoolFlag(value) {
  if (value === undefined || value === null || value === '') return null;
  return value === true || value === 1 || value === '1';
}

export function formatCount(value) {
  const n = Number(value || 0);
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n.toLocaleString();
}

const HOME_STATS_CACHE_KEY = 'ssmood_home_stats_v5';

const EMPTY_HOME_STATS = {
  datasets: 0,
  cells: 0,
  spots: 0,
  genes: 0,
  scDatasets: 0,
  stDatasets: 0,
  atacDatasets: 0,
  atacCells: 0,
  scHuman: 0,
  scMouse: 0,
  stHuman: 0,
  stMouse: 0,
};

function buildHomeStats(raw) {
  const stats = { ...EMPTY_HOME_STATS, ...raw };
  return {
    ...stats,
    datasetsFmt: formatCount(stats.datasets),
    cellsFmt: formatCount(stats.cells),
    spotsFmt: formatCount(stats.spots),
    genesFmt: formatCount(stats.genes),
    scCellsFmt: formatCount(stats.cells),
    stSpotsFmt: formatCount(stats.spots),
    atacCellsFmt: formatCount(stats.atacCells),
    scCellsHumanFmt: formatCount(stats.scHuman),
    scCellsMouseFmt: formatCount(stats.scMouse),
    stSpotsHumanFmt: formatCount(stats.stHuman),
    stSpotsMouseFmt: formatCount(stats.stMouse),
  };
}

export const HOME_STATS_FALLBACK = buildHomeStats(EMPTY_HOME_STATS);

export function getCachedHomeStats() {
  if (typeof window === 'undefined') return HOME_STATS_FALLBACK;
  try {
    const cached = JSON.parse(window.localStorage.getItem(HOME_STATS_CACHE_KEY) || 'null');
    return cached && typeof cached === 'object' ? buildHomeStats(cached) : HOME_STATS_FALLBACK;
  } catch (e) {
    return HOME_STATS_FALLBACK;
  }
}


function saveHomeStats(stats) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HOME_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch (e) {
    // Ignore localStorage write failures.
  }
}

function isHumanSample(row) {
  const text = `${row.dataset_id || row.name || ''} ${row.area || row.tissue || ''}`.toLowerCase();
  return row.species === 'human' || /ba\d+|human|pfc/.test(text);
}

function sumCells(rows) {
  return rows.reduce((sum, d) => sum + Number(d.cells || 0), 0);
}

function fulfilledArray(result) {
  return result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : null;
}

function fulfilledObject(result) {
  return result.status === 'fulfilled' && result.value && typeof result.value === 'object' ? result.value : null;
}

export async function loadHomeStats() {
  const fallback = getCachedHomeStats();
  try {
    const [summaryResult, scResult, stResult, atacResult] = await Promise.allSettled([
      getJson('hv_dbInfo.php'),
      getJson('bsc_getSCDatasetList.php'),
      getJson('bst_getSTDatasetList.php'),
      getJson('atc_getDatasetList.php'),
    ]);

    const summary = fulfilledObject(summaryResult);
    const scRows = fulfilledArray(scResult);
    const stRows = fulfilledArray(stResult);
    const atacData = fulfilledObject(atacResult);
    const atacRows = Array.isArray(atacData?.datasets) ? atacData.datasets : null;

    const hasSummary = summary && ['cells', 'spots', 'genes', 'datasets', 'cellNum', 'spatialNum', 'geneNum', 'clusterNum']
      .some(key => Number(summary[key] || 0) > 0);
    const hasFreshRows = Boolean(scRows?.length || stRows?.length || atacRows?.length);
    if (!hasSummary && !hasFreshRows) return fallback;

    const scDatasets = scRows ? scRows.length : fallback.scDatasets;
    const stDatasets = stRows ? stRows.length : fallback.stDatasets;
    const atacDatasets = atacRows ? atacRows.length : fallback.atacDatasets;

    const scCellsFromRows = scRows ? sumCells(scRows) : 0;
    const stSpotsFromRows = stRows ? sumCells(stRows) : 0;
    const atacCells = atacRows ? sumCells(atacRows) : fallback.atacCells;

    const scHuman = scRows ? sumCells(scRows.filter(isHumanSample)) : fallback.scHuman;
    const scMouse = scRows ? sumCells(scRows.filter(d => !isHumanSample(d))) : fallback.scMouse;
    const stHuman = stRows ? sumCells(stRows.filter(isHumanSample)) : fallback.stHuman;
    const stMouse = stRows ? sumCells(stRows.filter(d => !isHumanSample(d))) : fallback.stMouse;

    const stats = buildHomeStats({
      datasets: Number(summary?.clusterNum ?? summary?.datasets ?? (scDatasets + stDatasets + atacDatasets) ?? fallback.datasets),
      cells: Number(scCellsFromRows || summary?.cellNum || summary?.cells || fallback.cells),
      spots: Number(stSpotsFromRows || summary?.spatialNum || summary?.spots || fallback.spots),
      genes: Number(summary?.geneNum ?? summary?.genes ?? fallback.genes),
      scDatasets,
      stDatasets,
      atacDatasets,
      atacCells,
      scHuman,
      scMouse,
      stHuman,
      stMouse,
    });
    saveHomeStats(stats);
    return stats;
  } catch (e) {
    return fallback;
  }
}

