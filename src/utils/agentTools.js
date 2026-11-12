// AI 模块工具层：把「后端技能」和「前端虚拟技能」统一成一张表。
//  · 后端技能：拉后端 _manifest 自动获得，后端新增技能后前端无需改代码。
//  · 前端虚拟技能：纯 JS 实现，可组合多个既有接口，新增能力零后端改动。
// 在这里加一个新能力 = 往 VIRTUAL_TOOLS 里加一项。
import config from '@/config';
import {
  AGENT_ENDPOINTS,
  AGENT_MOCK_MODE,
  AGENT_MOCK_TOOLS,
  AGENT_HIDDEN_TOOLS,
  AGENT_HIDDEN_VIRTUAL_TOOLS,
  AGENT_TOOL_CATALOG_LOG,
  AGENT_TOOL_CATALOG_CACHE_MS,
} from './agentConfig';
import { mockToolResult } from './agentMock';
import { summarizeAgentContext } from './agentContext';
import { searchGlossary } from './agentGlossary';
import { searchKnowledge } from './agentKnowledge';
import { displayLabelFor } from './agentSampleCatalog';
import { buildUmapPlotAction } from './agentUmapPlot';
import { buildSpatialPlotAction } from './agentSpatialPlot';
import { buildPlotAction, buildMultiSamplePlotAction } from './agentPlots';
import { hiddenToolNamesFor, DEFAULT_AGENT_PROFILE } from './agentProfiles';

// externalSignal：用户点「停止生成」时由调用方传入。
// 与超时共用一个内部 controller，任一触发都真的中断请求（不是只在界面上假装停）。
export async function postJson(url, body, timeoutMs = 60000, externalSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  let onExternalAbort = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      onExternalAbort = () => controller.abort();
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let parseError = false;
    const data = await response.json().catch(() => {
      parseError = true;
      return {};
    });
    // 带上 status / parseError：只返回 httpOk 时，
    // "429 限流"、"504 超时"、"200 但响应体不是 JSON" 三者在调用方看起来一模一样，
    // 排查时只能靠猜；诊断日志和重试策略都需要区分。
    return { httpOk: response.ok, status: response.status, parseError, data };
  } catch (error) {
    // 网络层失败以前会抛出去，让每个调用方各写一个 catch；
    // 这里统一收敛成带原因的结果，顺便把 abort（超时 / 用户停止）和断网区分开。
    const aborted = error?.name === 'AbortError';
    const stopped = Boolean(externalSignal?.aborted);
    return {
      httpOk: false,
      status: 0,
      error: stopped ? 'aborted' : (aborted ? 'timeout' : String(error?.message || error || 'network_error')),
      data: {},
    };
  } finally {
    window.clearTimeout(timer);
    if (onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

function normalize(name, ok, result, warnings = [], truncated = false) {
  return { ok: Boolean(ok), skill: name, result, warnings: warnings.filter(Boolean), truncated: Boolean(truncated) };
}

// ── 工具可见性：唯一过滤规则，集中维护 ──
// 1) 后端 _manifest 标记 capability=unavailable 的空壳技能自动隐藏；
// 2) agentConfig.js 的隐藏名单兜底（后端未标记 / 临时下线）；
// 3) 虚拟技能默认全部可见，除非被 AGENT_HIDDEN_VIRTUAL_TOOLS 显式排除。
export function isToolAvailable(tool = {}) {
  const name = tool?.name;
  if (!name) return false;
  if ((AGENT_HIDDEN_TOOLS || []).includes(name)) return false;
  if (tool.virtual && (AGENT_HIDDEN_VIRTUAL_TOOLS || []).includes(name)) return false;
  if (tool.capability === 'unavailable') return false;
  return true;
}

// ── 后端技能：清单来自 _manifest（每项带 capability）──
const unavailableBackendTools = new Set();

export async function fetchBackendTools(locale) {
  const { httpOk, data } = await postJson(AGENT_ENDPOINTS.skill, { skill: '_manifest', locale });
  if (!httpOk || !data?.ok || !Array.isArray(data?.data?.skills)) return [];
  // 后端未返回 capability 时视为可用，避免误伤；同时记录不可用项，供执行期拦截。
  return data.data.skills.map(skill => {
    const capability = skill?.capability || 'available';
    if (capability === 'unavailable') unavailableBackendTools.add(skill?.name);
    return { ...skill, capability };
  });
}

async function runBackendTool(name, params, ctx) {
  const { httpOk, data, error } = await postJson(AGENT_ENDPOINTS.skill, {
    skill: name,
    params: params || {},
    context: ctx?.context || {},
    locale: ctx?.locale || 'zh',
  }, 60000, ctx?.signal);
  // 用户主动停止：不要把「被中止」当成工具失败记账，否则诊断日志会满是假故障
  if (error === 'aborted') return normalize(name, false, null, ['turn_aborted']);
  if (!httpOk) return normalize(name, false, null, ['skill_http_failed']);
  if (data?.error === 'capability_unavailable') {
    return normalize(name, false, null, ['tool_unavailable', data?.meta?.reason]);
  }
  if (data?.error) return normalize(name, false, null, [data.error, data?.meta?.reason]);
  return normalize(name, data?.ok, data?.data ?? null, data?.meta?.warnings || [], data?.meta?.truncated);
}

// ── 前端虚拟技能：纯前端实现，新增不用动后端 ──
const GENE_SETS = {
  KEGG: species => (String(species || '').toLowerCase().includes('mouse') ? 'KEGG_2019_Mouse.gmt' : 'KEGG_2019_Human.gmt'),
  GO_BP: () => 'GO_BP_2018.gmt',
};

// ── 基因符号归一化 ──
// 后端 feature 表用 feature_name 精确匹配，而同一个基因在人与小鼠里写法不同
// （人类 MALAT1 / 小鼠 Malat1）。用户按人类写法问小鼠基因会直接 gene_not_found，
// 表现就是「这个基因查不到」。这里先原样试，查不到再用 search_genes 的 LIKE 找回真实写法。
async function resolveGeneSymbol(rawGene, sampleId, ctx) {
  const raw = String(rawGene || '').trim();
  if (!raw || !sampleId) return { symbol: '', resolvedFrom: '', variants: [] };

  const direct = await runBackendTool('get_gene_expression_summary', { datasetId: sampleId, gene: raw }, ctx);
  if (direct?.ok) return { symbol: raw, resolvedFrom: 'exact', variants: [] };

  const found = await runBackendTool('search_genes', { query: raw, datasetId: sampleId, limit: 20 }, ctx);
  const items = (Array.isArray(found?.result?.items) ? found.result.items : []).map(String);
  const exact = items.find(name => name.toLowerCase() === raw.toLowerCase());
  const picked = exact || items[0] || '';
  return {
    symbol: picked,
    resolvedFrom: picked ? (exact ? 'case-insensitive' : 'fuzzy') : '',
    variants: items.slice(0, 10),
  };
}

// ── 整合研究分组目录 ──
// 后端 get_gene_expression_summary 只认 sample（数字 id 或 sample_name），
// 不认 study1.area.I 这类整合研究 id，所以先在前端把 study 展开成样本 id 再逐个查。
// 物种维度是硬边界：小鼠只有皮层分层 I-V，没有 mPFC 等多脑区分组。
const MOUSE_LAYERS = ['I', 'II', 'III', 'IV', 'V'];
const MOUSE_LAYER_CN = { I: '一', II: '二', III: '三', IV: '四', V: '五' };
const HUMAN_REGIONS = ['BA9', 'BA11', 'BA12', 'BA46'];
const HUMAN_ST_REGIONS = ['BA12', 'BA46'];

const STUDY_GROUPS = {
  mouse: {
    SC: { study: 'study1', omics: 'snRNA-seq' },
    ST: { study: 'study2', omics: 'stereo-seq' },
  },
  human: {
    SC: { study: 'study3', omics: 'snRNA-seq' },
    ST: { study: 'study4', omics: 'stereo-seq' },
  },
};

// 绘图工具共用的小助手：复用勾选样本 / 当前打开实体，自动解析目标数据集。
function isZhLocale(ctx) {
  return String(ctx?.locale || '').toLowerCase().startsWith('zh');
}
function resolveTraitId(params, ctx) {
  return (params?.traitId || ctx?.context?.businessState?.traitId || '').trim();
}

// ── 多样本取数口径 ──
// 勾选多个样本时，绘图工具默认使用「全部」勾选样本，而不是只取第一个。
// 优先级：显式 datasetIds > 显式 datasetId > referencedSamples（全部）> 页面打开的数据集。
// allowedOmics 非空时按模态过滤：不支持的模态进 skipped，由调用方以 warning 如实告知用户，
// 绝不静默丢弃，也绝不因为混选模态就整体拒绝绘图。
function resolveDatasetIds(params, ctx, allowedOmics = null) {
  const referenced = Array.isArray(ctx?.context?.referencedSamples) ? ctx.context.referencedSamples : [];
  // 勾选样本同时带 datasetId（真 id）与 label（展示名）。空转样本这两者不同——
  // datasetId 是 sample_name，label 是 display_name（如 M_II_Sus_rep1）——而模型常把用户
  // 消息里看到的展示名当 datasetId 传回来。两种键都能命中并统一归一到真 datasetId，
  // 否则 std_getCoordinate.php 收到 display_name 会 404（取不到空间坐标）。
  const refByKey = new Map();
  referenced.forEach(r => {
    const id = String(r?.datasetId || '').trim();
    if (!id) return;
    const entry = {
      datasetId: id,
      label: String(r?.label || id),
      omicsType: String(r?.omicsType || '').toUpperCase(),
    };
    refByKey.set(id, entry);
    const label = String(r?.label || '').trim();
    if (label) refByKey.set(label, entry);
  });
  // 归一化一个 id：命中勾选样本则用其真 id + label + 模态；否则原样透传（模态未知）。
  const resolveOne = rawId => {
    const key = String(rawId || '').trim();
    const hit = refByKey.get(key);
    if (hit) return { ...hit };
    return { datasetId: key, label: key, omicsType: '' };
  };
  const openOmics = String(ctx?.context?.businessState?.omicsType || '').toUpperCase();
  let list = [];
  if (Array.isArray(params?.datasetIds) && params.datasetIds.length) {
    list = params.datasetIds
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .map(id => resolveOne(id));
  } else if (params?.datasetId) {
    const id = String(params.datasetId || '').trim();
    if (id) list = [resolveOne(id)];
  } else if (referenced.length) {
    list = referenced
      .map(r => ({
        datasetId: String(r?.datasetId || '').trim(),
        label: String(r?.label || r?.datasetId || ''),
        omicsType: String(r?.omicsType || '').toUpperCase(),
      }))
      .filter(item => item.datasetId);
  } else {
    const open = String(ctx?.context?.businessState?.datasetId || '').trim();
    // 页面上下文自带 omicsType（例如空转详情页会上报 'ST'），没有勾选样本时也据此判定模态。
    if (open) {
      const hit = refByKey.get(open);
      list = [{ datasetId: open, label: open, omicsType: (hit && hit.omicsType) || openOmics }];
    }
  }
  if (!allowedOmics) return { ids: list, skipped: [] };
  const ids = list.filter(item => !item.omicsType || allowedOmics.includes(item.omicsType));
  const skipped = list.filter(item => item.omicsType && !allowedOmics.includes(item.omicsType));
  return { ids, skipped };
}

// 混选模态时的统一提示文案：说清哪些样本被跳过、为什么。
function skippedWarning(skipped, isZh, reasonZh, reasonEn) {
  if (!skipped.length) return null;
  const names = skipped.map(s => s.label).join('、');
  return isZh ? `${reasonZh}，已跳过：${names}` : `${reasonEn}; skipped: ${skipped.map(s => s.label).join(', ')}`;
}

const MAX_GROUPS = 8;
const MAX_SAMPLES_PER_GROUP = 8;

// ── 单基因 × 多数据集（跨数据集并列汇总）──
// 后端 search_datasets 的 limit 上限是 10，这里跟着封顶。
const MAX_CROSS_DATASETS = 10;
// expression_gene 只有单细胞 / 空转样本有，GWAS 是性状、ATAC 是 peak，取不到的直接跳过不编造。
const EXPRESSION_OMICS = new Set(['SC', 'ST']);

// 把「物种 + 模态 + 分组维度」翻译成一组整合研究 id。
// 不支持的组合（例如小鼠按脑区分组）直接返回 warning，让模型如实说明而不是编数据。
function buildGroupPlan({ species = '', omicsType = 'SC', groupBy = '', brainRegion = '' } = {}) {
  const config = STUDY_GROUPS[species];
  if (!config) {
    return { warning: 'unsupported_species', hint: '仅支持 human 与 mouse' };
  }
  const study = config[omicsType] || config.SC;
  const base = study.study;
  const by = String(groupBy || '').toLowerCase();

  if (species === 'mouse') {
    if (by === 'layer' || by === 'region') {
      return {
        items: MOUSE_LAYERS.map(layer => ({
          id: layer,
          label: `第${MOUSE_LAYER_CN[layer]}层 (${layer})`,
          studyId: `${base}.area.${layer}`,
        })),
        // 小鼠没有 mPFC 等多脑区分组，唯一的解剖维度就是皮层分层。
        // 用户按「脑区」发问时也返回分层数据，并附说明，让模型如实解释而不是编脑区。
        note: by === 'region'
          ? '小鼠整合数据没有 mPFC 等多脑区分组，唯一解剖维度是皮层分层 I-V，这里按分层给出。'
          : '小鼠整合数据按皮层分层 I-V 组织。',
      };
    }
    if (by === 'condition') {
      return {
        items: [
          { id: 'Sus', label: 'Sus（易感 · 抑郁造模）', studyId: `${base}.conditions.S` },
          { id: 'Res', label: 'Res（耐受 · 对照）', studyId: `${base}.conditions.R` },
        ],
        note: '小鼠造模为 CSDS：Sus=易感、Res=耐受。',
      };
    }
    if (by === 'dataset') return { items: [{ id: base, label: `${base}（全部）`, studyId: base }] };
    return { warning: 'unsupported_group_by', hint: '小鼠支持 layer / condition / dataset' };
  }

  // human
  const regions = omicsType === 'ST' ? HUMAN_ST_REGIONS : HUMAN_REGIONS;
  if (by === 'region' || by === 'layer') {
    return { items: regions.map(region => ({ id: region, label: region, studyId: `${base}.${region}` })) };
  }
  if (by === 'condition') {
    const target = regions.includes(brainRegion) ? brainRegion : 'BA11';
    return {
      items: [
        { id: `${target}.Control`, label: `${target} · Control（对照）`, studyId: `${base}.${target}.Control` },
        { id: `${target}.MDD`, label: `${target} · MDD（抑郁）`, studyId: `${base}.${target}.MDD` },
      ],
      note: `人类条件对比限定在 ${target}；未指定 brainRegion 时默认 BA11。可用 brainRegion 指定 ${regions.join('/')}。`,
    };
  }
  if (by === 'dataset') return { items: [{ id: base, label: `${base}（全部）`, studyId: base }] };
  return { warning: 'unsupported_group_by', hint: '人类支持 region / condition / dataset' };
}

// study id → 样本 id 列表。走既有的 study_getDatasetDetail.php，零后端改动。
async function fetchStudySampleIds(studyId) {
  try {
    const response = await fetch(`${config.apiUrl}study_getDatasetDetail.php?id=${encodeURIComponent(studyId)}`);
    const data = await response.json().catch(() => []);
    const first = Array.isArray(data) ? data[0] : null;
    const ids = Array.isArray(first?.sample_ids) ? first.sample_ids : [];
    return ids.map(Number).filter(value => Number.isFinite(value));
  } catch (e) {
    return [];
  }
}

// 数值安全转换：避免把 null / undefined / 非数字塞进表格卡。
function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// 在单个数据集里取某基因的表达摘要，取不到就如实失败（禁止估算、禁止用别的数据集顶替）。
// 不同 project 的 feature 表可能用不同写法（MALAT1 / Malat1），
// 因此直接查不到时，按该数据集自身的 feature 表兜底解析一次。
async function fetchGeneExpression(datasetId, gene, ctx) {
  const direct = await runBackendTool('get_gene_expression_summary', { datasetId, gene }, ctx);
  if (direct?.ok && direct.result) return { ok: true, symbol: gene, summary: direct.result };

  const found = await runBackendTool('search_genes', { query: gene, datasetId, limit: 10 }, ctx);
  const candidates = (Array.isArray(found?.result?.items) ? found.result.items : []).map(String);
  const exact = candidates.find(name => name.toLowerCase() === String(gene).toLowerCase());
  const picked = exact || candidates[0] || '';
  if (!picked || picked === gene) return { ok: false, symbol: '', summary: null };

  const retry = await runBackendTool('get_gene_expression_summary', { datasetId, gene: picked }, ctx);
  return retry?.ok && retry.result
    ? { ok: true, symbol: picked, summary: retry.result }
    : { ok: false, symbol: '', summary: null };
}

export const VIRTUAL_TOOLS = {
  // 读取当前页面状态，供模型回答「我在看什么」类问题。
  // 返回完整的页面快照五段：路由 / 实体 / 选择 / 可见数据 / 能力。
  describe_current_page: {
    name: 'describe_current_page',
    description: 'Return the current page snapshot: route, entity (dataset/trait metadata), current selection, visible data summary, page modules and page capabilities. Call it whenever the user asks about the current page or how to read the data on it.',
    arguments: {},
    async run(params, ctx) {
      const context = ctx?.context || {};
      return normalize('describe_current_page', true, {
        pageType: context.pageType || '',
        summary: summarizeAgentContext(context),
        route: context.route || {},
        entity: context.entity || {},
        selection: context.selection || {},
        visibleData: Array.isArray(context.visibleData) ? context.visibleData : [],
        capabilities: Array.isArray(context.capabilities) ? context.capabilities : [],
        // ── 模块层：本页有哪些模块、各自选中了什么；activeModule 是用户此刻所在模块 ──
        modules: Array.isArray(context.modules) ? context.modules : [],
        activeModule: context.activeModule || context?.selection?.activeModule || '',
        businessState: context.businessState || {},
      });
    },
  },

  // 后端 get_enrichment_summary 是空壳，但服务器上的 enrichment.php 能算真富集，
  // 前端直接调它，把富集能力补回来（零后端改动）。
  run_enrichment: {
    name: 'run_enrichment',
    description: 'Run a real gene-set enrichment on a list of genes for one dataset. geneSet: KEGG | GO_BP.',
    arguments: { datasetId: 'string required', genes: 'string[] required', geneSet: 'KEGG|GO_BP optional', species: 'string optional' },
    async run(params, ctx) {
      const datasetId = params?.datasetId || ctx?.context?.businessState?.datasetId || '';
      const genes = Array.isArray(params?.genes) ? params.genes : [];
      if (!datasetId || !genes.length) return normalize('run_enrichment', false, null, ['invalid_arguments']);
      const species = params?.species || ctx?.context?.businessState?.species || '';
      const key = String(params?.geneSet || 'KEGG').toUpperCase();
      const resolver = GENE_SETS[key] || GENE_SETS.KEGG;

      const form = new FormData();
      form.append('genes', JSON.stringify(genes));
      form.append('id', datasetId);
      form.append('gene_sets', resolver(species));

      const response = await fetch(`${config.apiUrl}enrichment.php`, { method: 'POST', body: form });
      const text = await response.text();
      let rows = [];
      try {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return normalize('run_enrichment', false, null, ['enrichment_parse_failed']);
      }
      return normalize('run_enrichment', true, {
        datasetId,
        geneSet: key,
        items: rows.slice(0, 20),
        resultCount: rows.length,
      }, rows.length ? [] : ['enrichment_empty']);
    },
  },

  // 单基因 × 多分组表达比较：回答「某基因在小鼠哪些层/哪些条件、在人类哪些脑区表达更高」。
  // 后端只有一个「单数据集」的表达摘要技能，且 DEG 技能不过滤基因（SELECT * LIMIT n），
  // 无法回答单基因的跨分组问题。这里在前端把整合研究展开成样本、逐个取摘要再汇总，
  // 零后端改动补上这个能力。
  compare_gene_across_groups: {
    name: 'compare_gene_across_groups',
    description: 'Compare ONE gene across groups of an ssMOOD integrated study: mouse cortical layers I-V, mouse CSDS conditions (Sus=susceptible / Res=resilient), or human dlPFC regions (BA9/BA11/BA12/BA46) and human Control vs MDD. Reports detection rate (non-zero cells / cells) and expression max per group. NO significance test: use it to say "detected in a higher/lower proportion of cells", never to claim significant up/down regulation.',
    arguments: {
      gene: 'string required (gene symbol, e.g. MALAT1)',
      species: 'human|mouse optional (defaults to the current page species)',
      omicsType: 'SC|ST optional, default SC',
      groupBy: 'region|layer|condition|dataset optional (mouse: layers; human: regions)',
      brainRegion: 'string optional, only for human condition grouping (BA9|BA11|BA12|BA46, default BA11)',
    },
    async run(params, ctx) {
      const requested = String(params?.gene || ctx?.context?.selection?.selectedGene || '').trim();
      if (!requested) return normalize('compare_gene_across_groups', false, null, ['invalid_arguments']);

      const rawSpecies = String(params?.species || ctx?.context?.entity?.species || ctx?.context?.businessState?.species || '').toLowerCase();
      const species = rawSpecies.includes('mouse') || rawSpecies.includes('鼠') ? 'mouse'
        : (rawSpecies.includes('human') || rawSpecies.includes('人') ? 'human' : '');
      if (!species) return normalize('compare_gene_across_groups', false, null, ['missing_species', '需要指定 human 或 mouse']);

      const omicsType = String(params?.omicsType || 'SC').toUpperCase() === 'ST' ? 'ST' : 'SC';
      const groupBy = String(params?.groupBy || (species === 'mouse' ? 'layer' : 'region')).toLowerCase();
      const plan = buildGroupPlan({ species, omicsType, groupBy, brainRegion: String(params?.brainRegion || '') });
      if (plan.warning) return normalize('compare_gene_across_groups', false, null, [plan.warning, plan.hint]);

      const groups = (plan.items || []).slice(0, MAX_GROUPS);
      const items = [];

      // 先拿到第一个有样本的分组，用它解析基因符号（同一 study 内 project 固定，解析一次即可）。
      let symbol = requested;
      let symbolSource = 'as-is';
      let symbolVariants = [];
      let symbolResolved = false;

      for (const group of groups) {
        const sampleIds = await fetchStudySampleIds(group.studyId);
        if (!sampleIds.length) {
          items.push({ group: group.label, groupId: group.id, studyId: group.studyId, samplesUsed: 0, note: '无可用样本' });
          continue;
        }

        if (!symbolResolved) {
          const resolved = await resolveGeneSymbol(requested, sampleIds[0], ctx);
          symbolResolved = true;
          if (resolved.symbol) {
            symbol = resolved.symbol;
            symbolSource = resolved.resolvedFrom;
            symbolVariants = resolved.variants;
          } else {
            symbolVariants = resolved.variants;
          }
        }
        if (!symbol) continue;

        const used = sampleIds.slice(0, MAX_SAMPLES_PER_GROUP);
        const summaries = await Promise.all(
          used.map(id => runBackendTool('get_gene_expression_summary', { datasetId: id, gene: symbol }, ctx))
        );
        const usable = summaries.filter(item => item?.ok && item?.result);

        const cellCount = usable.reduce((sum, item) => sum + (Number(item.result?.cellCount) || 0), 0);
        const nonzeroCount = usable.reduce((sum, item) => sum + (Number(item.result?.nonzeroCount) || 0), 0);
        const maxValue = usable.reduce((max, item) => Math.max(max, Number(item.result?.summaryStats?.max) || 0), 0);

        // 列顺序按「用户最想看的」排：表格卡取前 8 列，
        // studyId / groupId / truncated 这些内部字段放最后，避免挤掉关键列。
        items.push({
          group: group.label,
          detectionRate: cellCount ? Number((nonzeroCount / cellCount).toFixed(4)) : null,
          nonzeroCount,
          cellCount,
          maxValue: maxValue || null,
          samplesUsed: usable.length,
          sampleCount: sampleIds.length,
          studyId: group.studyId,
          groupId: group.id,
          truncated: usable.length < sampleIds.length,
        });
      }

      const withData = items.filter(item => item.cellCount > 0);
      const warnings = [];
      if (!withData.length) warnings.push('gene_not_in_any_group');
      if (symbolSource !== 'exact' && symbol) warnings.push('gene_symbol_normalized');
      if (items.some(item => item.truncated)) warnings.push('payload_truncated');

      return normalize('compare_gene_across_groups', withData.length > 0, {
        gene: symbol,
        requestedGene: requested,
        symbolSource,
        symbolVariants,
        species,
        omicsType,
        groupBy,
        scopeNote: plan.note || '',
        items,
        resultCount: items.length,
        // 明确边界：只有检出比例与表达上限，没有统计检验。
        caveat: '仅提供每组检出细胞比例与表达上限（log1p 归一化后的 max），无统计检验、无 log2FC 与 padj，不能据此判定显著上调或下调。',
      }, warnings);
    },
  },

  // 单基因 × 多数据集表达并列汇总：回答「某基因在小鼠各脑区 / 多个样本里表达如何」。
  // 后端 get_gene_expression_summary 只能查「单个数据集」，且 expression_gene 只有
  // non_zero_count / min_val / max_val（没有均值），也没有任何跨数据集汇总接口。
  // 前端「先检索 → 逐个查 → 并列成表」，零后端改动补上这个能力。
  // 边界：只做并列汇总，绝不做跨样本合并统计，也绝不做跨数据集归一化。
  summarize_gene_across_datasets: {
    name: 'summarize_gene_across_datasets',
    description: 'Summarize ONE gene independently across MULTIPLE ssMOOD datasets: call it when the user asks how a gene is expressed across several brain regions / multiple samples / datasets (e.g. "MALAT1 在小鼠各脑区的表达"). Returns a side-by-side per-dataset table of detection rate, non-zero cell count, total cells, min and max. It performs NO cross-sample merged statistics and NO cross-dataset normalization — each dataset is measured on its own, so the numbers are NOT comparable as one merged cohort.',
    arguments: {
      gene: 'string required (gene symbol, e.g. MALAT1)',
      species: 'human|mouse optional (defaults to the current page species)',
      omicsType: 'SC|ST optional, default both SC and ST',
      brainRegion: 'string optional (filter datasets by brain region, e.g. BA11)',
      condition: 'string optional (filter datasets by condition, e.g. Control | Sus)',
      datasets: 'string[] optional (explicit dataset ids to summarize; skips the search step)',
      cellType: 'string optional (also report this cell type composition per dataset)',
      limit: 'integer optional 1-10, default 8',
    },
    async run(params, ctx) {
      const requested = String(params?.gene || ctx?.context?.selection?.selectedGene || '').trim();
      if (!requested) return normalize('summarize_gene_across_datasets', false, null, ['invalid_arguments']);

      const rawSpecies = String(params?.species || ctx?.context?.entity?.species || ctx?.context?.businessState?.species || '').toLowerCase();
      const species = rawSpecies.includes('mouse') || rawSpecies.includes('鼠') ? 'mouse'
        : (rawSpecies.includes('human') || rawSpecies.includes('人') ? 'human' : '');

      const rawOmics = String(params?.omicsType || '').toUpperCase();
      const omicsFilter = rawOmics === 'SC' ? ['SC'] : (rawOmics === 'ST' ? ['ST'] : ['SC', 'ST']);
      const limit = Math.max(1, Math.min(Number(params?.limit) || 8, MAX_CROSS_DATASETS));
      const brainRegion = String(params?.brainRegion || '').trim();
      const condition = String(params?.condition || '').trim();
      const cellType = String(params?.cellType || '').trim();

      // ① 定位数据集。
      // 优先用用户在输入框上方勾选的样本（pageContext.referencedSamples）——那是明确表达的
      // 「就看这几个样本」，比按条件再检索一次更精确；其次用显式传入的 datasets 列表；
      // 两者都没有时才走既有检索技能。
      const referenced = Array.isArray(ctx?.context?.referencedSamples) ? ctx.context.referencedSamples : [];
      const refIndex = new Map();
      referenced.forEach(item => {
        const id = String(item?.datasetId || '').trim();
        if (id) refIndex.set(id, item);
      });
      const explicit = (Array.isArray(params?.datasets) && params.datasets.length
        ? params.datasets
        : [...refIndex.keys()]
      ).map(String).map(value => value.trim()).filter(Boolean);
      let targets = [];
      if (explicit.length) {
        targets = explicit.slice(0, limit).map(id => {
          const hit = refIndex.get(id);
          return {
            datasetId: id,
            label: String(hit?.label || id),
            brainRegion: String(hit?.brainRegion || ''),
            condition: String(hit?.condition || ''),
            omicsType: String(hit?.omicsType || '').toUpperCase(),
            route: '',
          };
        });
      } else {
        const searchParams = { omicsType: omicsFilter, limit };
        if (species) searchParams.species = species;
        if (brainRegion) searchParams.brainRegion = brainRegion;
        if (condition) searchParams.condition = condition;
        const search = await runBackendTool('search_datasets', searchParams, ctx);
        const found = Array.isArray(search?.result?.items) ? search.result.items : [];
        // GWAS 是性状不是样本，没有表达表；只保留真正有表达数据的模态。
        targets = found
          .filter(row => EXPRESSION_OMICS.has(String(row?.omicsType || '').toUpperCase()))
          .slice(0, limit)
          .map(row => ({
            datasetId: String(row?.datasetId || ''),
            label: String(row?.label || row?.name || row?.datasetId || ''),
            brainRegion: String(row?.brainRegion || ''),
            condition: String(row?.condition || ''),
            omicsType: String(row?.omicsType || '').toUpperCase(),
            route: String(row?.route || ''),
          }))
          .filter(item => item.datasetId);
      }

      if (!targets.length) {
        return normalize('summarize_gene_across_datasets', false, null, ['no_dataset_matched', '未检索到可用于表达查询的数据集']);
      }

      // ATAC 走 expression_peak、GWAS 是性状，两者都不在 expression_gene 里。
      // 先分流再查询：既省掉注定失败的调用，也让工具能直接说出「ATAC 没有表达统计」，
      // 而不是丢给用户一整表含糊的「查不到」。
      const unsupported = targets.filter(target => target.omicsType && !EXPRESSION_OMICS.has(target.omicsType));
      const supported = targets.filter(target => !target.omicsType || EXPRESSION_OMICS.has(target.omicsType));

      if (!supported.length) {
        return normalize('summarize_gene_across_datasets', false, null, [
          'omics_unsupported',
          '本工具只做基因表达统计，expression_gene 仅覆盖单细胞(SC)与空转(ST)样本；所选样本为 ATAC（只有 peak 可及性数据），不支持按基因统计表达。',
        ]);
      }

      // ② 基因符号只解析一次（同一物种内写法一致），用第一个支持表达的样本来解析。
      const resolved = await resolveGeneSymbol(requested, supported[0].datasetId, ctx);
      const symbol = resolved.symbol || requested;
      const symbolSource = resolved.resolvedFrom || 'as-is';
      const symbolVariants = resolved.variants || [];

      // ③ 逐个数据集取表达摘要；Promise.all 保序，表格顺序与引用顺序一致。
      const settled = await Promise.all(supported.map(async target => {
        const expr = await fetchGeneExpression(target.datasetId, symbol, ctx);
        if (!expr.ok || !expr.summary) {
          return { skip: { datasetId: target.datasetId, dataset: target.label, reason: 'expression_unavailable' } };
        }

        const cellCount = Number(expr.summary.cellCount) || 0;
        const nonzeroCount = Number(expr.summary.nonzeroCount) || 0;
        const minValue = toNumberOrNull(expr.summary.summaryStats?.min);
        const maxValue = toNumberOrNull(expr.summary.summaryStats?.max);
        // 表格卡只渲染前 8 列，把 min/max 合成一列，用户才能同时看到上下限。
        const range = minValue === null && maxValue === null
          ? ''
          : `${minValue === null ? '—' : minValue.toFixed(3)} ~ ${maxValue === null ? '—' : maxValue.toFixed(3)}`;

        // 可选：顺带给出指定细胞类型在该数据集里的占比。
        // 注意后端没有「按细胞类型拆分的基因表达」，所以这里只能给真实的细胞组成，
        // 不能给出该基因在这一细胞类型里的表达量。
        let composition = null;
        if (cellType) {
          const lowered = cellType.toLowerCase();
          const comp = await runBackendTool('get_celltype_composition', { datasetId: target.datasetId }, ctx);
          const buckets = Array.isArray(comp?.result?.items) ? comp.result.items : [];
          const hit = buckets.find(bucket => String(bucket?.cellType || '').toLowerCase() === lowered)
            || buckets.find(bucket => String(bucket?.cellType || '').toLowerCase().includes(lowered));
          const total = buckets.reduce((sum, bucket) => sum + (Number(bucket?.count) || 0), 0);
          const count = hit ? Number(hit.count) || 0 : 0;
          if (hit) {
            composition = {
              datasetId: target.datasetId,
              dataset: target.label,
              cellType: String(hit.cellType || ''),
              count,
              share: total ? Number((count / total).toFixed(4)) : null,
            };
          }
        }

        // 回答里的样本名统一成前端列表页口径（display_name），
        // 否则同一个样本会出现「引用面板一个名字、结果表格另一个名字」的割裂。
        const summaryName = String(expr.summary.dataset || target.datasetId || '').trim();
        const listedLabel = await displayLabelFor(summaryName);

        return {
          row: {
            dataset: listedLabel || target.label || summaryName,
            brainRegion: target.brainRegion,
            condition: target.condition,
            omicsType: target.omicsType,
            expressionRange: range,
            detectionRate: cellCount ? Number((nonzeroCount / cellCount).toFixed(4)) : null,
            nonzeroCount,
            cellCount,
            // ── 以下字段排在第 9 列之后：表格卡取前 8 列，这里只给模型引用用 ──
            minValue,
            maxValue,
            expressionType: String(expr.summary.expressionType || ''),
            // 后端 expression_gene 只有 non_zero_count / min_val / max_val，
            // 没有均值列、也没有可反推均值的字段，因此如实置空，绝不估算。
            mean: null,
            geneAsMatched: String(expr.symbol || symbol),
            datasetId: target.datasetId,
            route: target.route,
          },
          composition,
        };
      }));

      const rows = [];
      const skipped = [];
      const cellTypeComposition = [];
      settled.forEach(entry => {
        if (!entry) return;
        if (entry.row) rows.push(entry.row);
        if (entry.skip) skipped.push(entry.skip);
        if (entry.composition) cellTypeComposition.push(entry.composition);
      });
      // 不支持表达的样本如实落到 skipped，标注具体模态，不用「查不到」含糊带过。
      unsupported.forEach(target => {
        skipped.push({
          datasetId: target.datasetId,
          dataset: target.label,
          omicsType: target.omicsType,
          reason: 'omics_unsupported',
        });
      });

      const warnings = [];
      if (!species) warnings.push('species_unspecified');
      if (!rows.length) warnings.push('gene_not_found_in_any_dataset');
      if (symbolSource !== 'exact') warnings.push('gene_symbol_normalized');
      if (skipped.length) warnings.push('some_datasets_skipped');
      if (unsupported.length) warnings.push('omics_unsupported');

      return normalize('summarize_gene_across_datasets', rows.length > 0, {
        gene: symbol,
        requestedGene: requested,
        symbolSource,
        symbolVariants,
        species,
        omicsType: omicsFilter.join('+'),
        filters: { brainRegion, condition, cellType },
        items: rows,
        resultCount: rows.length,
        // 查不到 / 查询失败的数据集如实列出，不补数据、不用别的数据集顶替。
        skipped,
        skippedCount: skipped.length,
        cellTypeComposition,
        // ── 口径标记：这是各数据集独立统计，不是合并统计 ──
        independentPerDataset: true,
        aggregationNote: '以下为每个数据集各自独立统计后的并列汇总：各数据集的表达指标取自该数据集自身的表达表，未做跨数据集合并、批次校正或归一化，也未做任何跨样本合并统计；各数据集本就已独立归一化，数值不可当作同一批细胞横向比较。',
        caveat: '仅并列展示各数据集自身的检出细胞比例与表达上下限（expression_gene 的 non_zero_count / min_val / max_val）。后端该表没有均值列，因此不提供平均表达量，也不做估算；没有 log2FC、没有 padj、没有任何跨数据集统计检验，不能据此判定显著上调或下调。若 cellTypeComposition 有值，那只是该细胞类型在各数据集中的细胞占比，不代表该基因在该细胞类型里的表达量。',
      }, warnings);
    },
  },

  // 前端原生 UMAP 聚类图：纯前端拉取单细胞 UMAP 坐标并构造散点 payload，
  // 不经过 LLM 拼 Plotly、也不走后端 build_plot_action（该技能不支持 umap 坐标）。
  // 模型只需给出数据集（或直接复用已勾选 / 已打开的样本），具体绘图由前端确定性完成。
  plot_umap: {
    name: 'plot_umap',
    description: 'Render the single-cell UMAP clustering plot for one OR MORE datasets. Use it when the user asks to draw / show the UMAP, clustering, or cell-cluster scatter of single-cell dataset(s). Pass datasetIds (array) when several single-cell samples are ticked; pass datasetId for a single one; if omitted, the tool uses ALL ticked single-cell samples (referencedSamples) or the currently open dataset (businessState.datasetId). ONE dataset → that sample\'s single-sample coordinates; TWO OR MORE → integrated coordinates, by DEFAULT overlaid in ONE shared coordinate system (colour = cluster, marker shape = sample). Pass layout="panels" only when the user explicitly wants the samples shown as separate plots (分别 / 各自 / 单独 / 分开). The tool falls back to panels automatically when the samples are not in a shared integrated space. Spatial (ST) and ATAC samples have no UMAP and are skipped with a warning. Returns a ready-to-render plot action — do NOT build Plotly payloads yourself, and do NOT call build_plot_action for UMAP (it does not support UMAP coordinates).',
    arguments: {
      datasetId: 'string optional (single dataset id, e.g. F_BA9_C_rep4)',
      datasetIds: 'string[] optional (several single-cell dataset ids; preferred when the user ticked multiple samples)',
      layout: '"overlay"|"panels" optional — "overlay" (default) puts all selected samples in ONE shared integrated coordinate system; "panels" shows each sample as its own sub-plot; use "panels" only when the user explicitly asks to see them separately',
    },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      // UMAP 只支持单细胞样本：空转是空间坐标（无 UMAP）、ATAC 是 peak 空间。
      // 混选时画可画的部分（单细胞子集），被跳过的样本以 warning 如实说明，不整体拒绝。
      // 但目录对模态的标注未必可靠（单细胞 sample_name 与空转 display_name 形式高度重叠），
      // 因此「按模态筛完一个都不剩」时不再直接判死：退回全部候选去试 UMAP 接口，
      // scd_getSingleUmapdata.php 自身按 is_spatial = 0 过滤，取得到就是单细胞。
      const scOnly = resolveDatasetIds(params, ctx, ['SC']);
      let { ids, skipped } = scOnly;
      if (!ids.length) {
        const all = resolveDatasetIds(params, ctx);
        if (all.ids.length) { ids = all.ids; skipped = []; }
      }
      if (!ids.length) {
        return normalize('plot_umap', false, null, ['invalid_arguments', isZh
          ? '缺少可绘制的单细胞数据集：UMAP 仅支持单细胞样本（空转 / ATAC 无法绘制 UMAP）'
          : 'No single-cell dataset available: UMAP supports single-cell samples only (spatial/ATAC have no UMAP)']);
      }
      const wantedLayout = params?.layout === 'panels' || params?.layout === 'overlay' ? params.layout : undefined;
      const action = await buildUmapPlotAction({
        datasetIds: ids.map(item => item.datasetId),
        isZh,
        layout: wantedLayout,
      });
      if (!action) {
        return normalize('plot_umap', false, null, ['umap_data_unavailable', isZh
          ? `未能获取 UMAP 坐标：${ids.map(item => item.label).join('、')}（该接口仅对单细胞样本返回数据）`
          : `Could not fetch UMAP coordinates for ${ids.map(item => item.label).join(', ')} (returned for single-cell samples only)`]);
      }
      const warning = skippedWarning(skipped, isZh, 'UMAP 仅支持单细胞样本', 'UMAP supports single-cell samples only');
      return normalize('plot_umap', true, { actions: [action] }, warning ? [warning] : []);
    },
  },
  plot_spatial: {
    name: 'plot_spatial',
    description: 'Render the spatial transcriptomics map (spots positioned by their spatial x/y) for one or more spatial (ST) samples. Use it when the user asks to draw / show the spatial map, spot map, tissue map, or a gene\'s spatial expression for a spatial sample. Pass datasetIds (array) using each ticked sample\'s datasetId field from referencedSamples — NOT its display label (e.g. M_II_Sus_rep1) — when several are ticked; pass datasetId for a single one; if omitted, the tool uses ALL ticked spatial samples (referencedSamples) or the open spatial dataset (businessState.datasetId). Pass gene to pre-colour the spots by that gene\'s expression. Single-cell (SC) and ATAC samples have NO spatial coordinates and are skipped with a warning — for single-cell use plot_umap instead. Returns a ready-to-render plot action — do NOT build Plotly payloads yourself.',
    arguments: {
      datasetId: 'string optional (single spatial sample id)',
      datasetIds: 'string[] optional (several spatial sample ids; preferred when the user ticked multiple)',
      gene: 'string optional (gene symbol; pre-colour spots by its expression)',
    },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      const gene = String(params?.gene || '').trim();
      // 空间图只支持空转样本：单细胞是 UMAP 坐标、ATAC 是 peak 空间，都没有 spatial_x/y。
      // 但目录对模态的标注未必可靠——单细胞的 sample_name 与空转的 display_name 都是
      // M_<脑区>_<条件>_rep<N> 这种形式，空转样本可能被误标成单细胞而在这一步被全部剔除。
      // 因此「按模态筛完一个都不剩」时退回用全部候选去试空间坐标接口：
      // std_getCoordinate.php 自身按 is_spatial = 1 过滤，取得到就画，取不到再如实报错并列出样本名。
      const stOnly = resolveDatasetIds(params, ctx, ['ST']);
      let { ids, skipped } = stOnly;
      if (!ids.length) {
        const all = resolveDatasetIds(params, ctx);
        if (all.ids.length) { ids = all.ids; skipped = []; }
      }
      if (!ids.length) {
        return normalize('plot_spatial', false, null, ['invalid_arguments', isZh
          ? '缺少可绘制的空转样本：请先勾选或打开一个空转样本（单细胞请用 plot_umap）'
          : 'No spatial sample available: tick or open a spatial sample first (use plot_umap for single-cell)']);
      }
      const action = await buildSpatialPlotAction({
        datasetIds: ids.map(item => item.datasetId),
        labels: ids.map(item => item.label),
        gene,
        isZh,
      });
      if (!action) {
        return normalize('plot_spatial', false, null, ['spatial_data_unavailable', isZh
          ? `未能获取空间坐标：${ids.map(item => item.label).join('、')}。空间图仅对空转样本有效——若这些其实是单细胞样本，请改用 plot_umap。`
          : `Could not fetch spatial coordinates for ${ids.map(item => item.label).join(', ')}. Spatial maps work for spatial (ST) samples only; use plot_umap for single-cell.`]);
      }
      const warning = skippedWarning(skipped, isZh, '空间图仅支持空转样本', 'Spatial maps support spatial (ST) samples only');
      return normalize('plot_spatial', true, { actions: [action] }, warning ? [warning] : []);
    },
  },

  // ── 前端统一绘图：细胞类型组成 / 单基因表达 / DEG / ATAC / GWAS 富集 / 富集 ──
  // 与 plot_umap 同范式：模型只触发工具并提供 datasetId（或自动复用勾选/打开的样本），
  // 取数（get_plot_data 技能）与 Plotly 拼图完全由前端完成，不再走后端 build_plot_action。
  plot_cell_composition: {
    name: 'plot_cell_composition',
    description: 'Render the cell-type / cluster composition for ONE dataset (bar AND/OR pie) or for SEVERAL ticked datasets (grouped bar comparing within-sample share). Use when the user asks for composition / proportion / cell-type make-up. Pass datasetIds (array) when several samples are ticked; pass datasetId for a single one; if omitted, the tool uses ALL ticked samples (referencedSamples) or the open dataset (businessState.datasetId). Single dataset: by DEFAULT returns BOTH a bar chart and a pie chart; only pass plotTypes: ["bar"] or ["pie"] (or a single plotType) when the user explicitly wants just one. Several datasets: ONE grouped bar per modality — samples of different modalities (single-cell / spatial / ATAC) are NEVER mixed into a single chart because cells, spots and peaks are not comparable; each modality gets its own chart. Returns ready-to-render plot action(s) — do NOT build Plotly payloads yourself.',
    arguments: {
      datasetId: 'string optional (single dataset id)',
      datasetIds: 'string[] optional (several dataset ids; preferred when the user ticked multiple samples)',
      plotType: 'bar|pie optional — single dataset: omit to get BOTH by default; pass a single value only when one chart is explicitly wanted',
      plotTypes: 'array of bar|pie optional — pass ["bar"] or ["pie"] to force exactly one chart',
    },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      // 组成数据对模态无要求（单细胞 / 空转 / ATAC 都有聚类注释），混选时全部绘制。
      const { ids } = resolveDatasetIds(params, ctx);
      if (!ids.length) {
        return normalize('plot_cell_composition', false, null, ['invalid_arguments', isZh
          ? '缺少数据集：请先勾选或打开一个数据集'
          : 'No dataset: tick or open one first']);
      }

      // ── 多样本：一张分组柱状图（各样本内占比）；显式要饼图时每个样本各出一张 ──
      if (ids.length > 1) {
        const wantPie = (params?.plotType && String(params.plotType).toLowerCase() === 'pie')
          || (Array.isArray(params?.plotTypes) && params.plotTypes.map(t => String(t).toLowerCase()).includes('pie'));
        if (wantPie) {
          const actions = [];
          const warnings = [];
          for (const item of ids) {
            const action = await buildPlotAction({ dataType: 'cell_composition', plotType: 'pie', datasetId: item.datasetId, locale: ctx?.locale, datasetMeta: item });
            if (action) actions.push(action);
            else warnings.push(isZh ? `未能获取样本 ${item.label} 的组成数据` : `No composition data for ${item.label}`);
          }
          if (!actions.length) {
            return normalize('plot_cell_composition', false, null, ['plot_data_unavailable', isZh ? '未能获取所选样本的组成数据' : 'No composition data for the selected samples']);
          }
          return normalize('plot_cell_composition', true, { actions }, warnings);
        }
        const { actions: multiActions, warnings } = await buildMultiSamplePlotAction({
          dataType: 'cell_composition',
          datasets: ids.map(item => ({ datasetId: item.datasetId, label: item.label, omicsType: item.omicsType })),
          locale: ctx?.locale,
        });
        if (!multiActions.length) {
          return normalize('plot_cell_composition', false, null, ['plot_data_unavailable', isZh ? '未能获取所选样本的组成数据' : 'No composition data for the selected samples']);
        }
        return normalize('plot_cell_composition', true, { actions: multiActions }, warnings);
      }

      // ── 单样本：柱状图 + 饼图双视图（原有行为） ──
      const datasetId = ids[0].datasetId;
      // 细胞类型组成天然是「柱状图 + 饼图」双视图：未显式指定单图时默认两张都出，
      // 彻底避免"只要到柱状图"。仅当显式 plotType:'pie' / plotTypes:['pie'] 时才只给饼图；
      // 显式 plotType:'bar' 时只给柱状图（不要硬带一张画不出的饼图）。
      const explicit = Boolean(params?.plotType) || (Array.isArray(params?.plotTypes) && params.plotTypes.length);
      let requested;
      if (Array.isArray(params?.plotTypes) && params.plotTypes.length) {
        requested = params.plotTypes.map(t => String(t).toLowerCase()).filter(t => t === 'bar' || t === 'pie');
      } else if (params?.plotType && String(params.plotType).toLowerCase() === 'bar') {
        requested = ['bar'];
      } else if (params?.plotType && String(params.plotType).toLowerCase() === 'pie') {
        requested = ['pie'];
      } else {
        requested = ['bar', 'pie'];
      }
      const actions = [];
      const warnings = [];
      for (const t of requested) {
        const action = await buildPlotAction({ dataType: 'cell_composition', plotType: t, datasetId, locale: ctx?.locale, datasetMeta: ids[0] });
        if (action) {
          actions.push(action);
        } else if (explicit) {
          // 仅当用户显式点名某图类型却画不出时才提示；默认附带的饼图若缺失则静默跳过。
          warnings.push(`plot_${t}_unavailable`);
        }
      }
      if (!actions.length) return normalize('plot_cell_composition', false, null, ['plot_data_unavailable', `未能获取数据集 ${datasetId} 的组成数据`]);
      return normalize('plot_cell_composition', true, { actions }, warnings);
    },
  },
  plot_gene_expression: {
    name: 'plot_gene_expression',
    description: "Render a single-gene expression bar for ONE dataset (nonzero vs total cells) or for SEVERAL ticked datasets of the SAME modality (grouped bar of within-sample detection rate). Use when the user asks to plot a gene's expression / detection rate, especially across several ticked samples. Requires gene (gene symbol). datasetId / datasetIds optional (fall back to ALL ticked samples, then the open dataset). Works for single-cell / spatial ONLY (ATAC has peaks, not gene expression; such samples are skipped with a warning). Single-cell and spatial samples are NEVER mixed into one chart — each modality gets its own grouped bar. Returns a ready-to-render plot action.",
    arguments: {
      datasetId: 'string optional',
      datasetIds: 'string[] optional (several dataset ids; preferred when the user ticked multiple samples)',
      gene: 'string required (gene symbol, e.g. MALAT1)',
    },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      const gene = String(params?.gene || '').trim();
      // 表达数据只有单细胞 / 空转样本有（ATAC 是 peak、GWAS 是性状），混选时跳过并说明。
      const { ids, skipped } = resolveDatasetIds(params, ctx, ['SC', 'ST']);
      if (!ids.length || !gene) {
        return normalize('plot_gene_expression', false, null, ['invalid_arguments', isZh
          ? (ids.length
              ? '需要基因名（gene）才能绘制表达图'
              : '缺少可取表达数据的样本：基因表达仅支持单细胞 / 空转样本')
          : (ids.length
              ? 'A gene symbol is required to plot expression'
              : 'No dataset with expression data: gene expression supports single-cell / spatial samples only')]);
      }
      const skipWarning = skippedWarning(skipped, isZh, '基因表达仅支持单细胞 / 空转样本', 'Gene expression supports single-cell / spatial samples only');

      // ── 多样本：一张检出率对比柱状图 ──
      if (ids.length > 1) {
        const { actions: multiActions, warnings } = await buildMultiSamplePlotAction({
          dataType: 'gene_expression',
          datasets: ids.map(item => ({ datasetId: item.datasetId, label: item.label, omicsType: item.omicsType })),
          gene,
          locale: ctx?.locale,
        });
        if (!multiActions.length) {
          return normalize('plot_gene_expression', false, null, ['plot_data_unavailable', isZh
            ? `未能获取 ${gene} 在所选样本中的表达数据`
            : `No expression data for ${gene} in the selected samples`]);
        }
        return normalize('plot_gene_expression', true, { actions: multiActions }, skipWarning ? [skipWarning, ...warnings] : warnings);
      }

      // ── 单样本：非零细胞数 vs 总细胞数（原有行为） ──
      const datasetId = ids[0].datasetId;
      const action = await buildPlotAction({ dataType: 'gene_expression', datasetId, gene, locale: ctx?.locale, datasetMeta: ids[0] });
      if (!action) return normalize('plot_gene_expression', false, null, ['plot_data_unavailable', `未能获取 ${gene} 在 ${datasetId} 的表达数据`]);
      // 样本清单（含组学类型）由 buildPlotAction 附带，绘图弹窗据此切换基因、跳回数据集。
      return normalize('plot_gene_expression', true, { actions: [action] }, skipWarning ? [skipWarning] : []);
    },
  },
  plot_deg: {
    name: 'plot_deg',
    description: 'Render a DEG (differential expression) bar for ONE dataset. Use when the user asks for DEG / differential gene plot. Optional cellType / contrast to scope the DEG. datasetId optional (falls back to the FIRST ticked dataset, then the open dataset). When several samples are ticked, only the first is used and a notice says which one. Returns a ready-to-render plot action.',
    arguments: { datasetId: 'string optional', cellType: 'string optional', contrast: 'string optional' },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      const { ids } = resolveDatasetIds(params, ctx);
      const datasetId = ids[0]?.datasetId || '';
      if (!datasetId) return normalize('plot_deg', false, null, ['invalid_arguments', isZh ? '缺少数据集：请先勾选或打开一个数据集' : 'No dataset: tick or open one first']);
      const action = await buildPlotAction({ dataType: 'deg', datasetId, cellType: params?.cellType, contrast: params?.contrast, locale: ctx?.locale, datasetMeta: ids[0] });
      if (!action) return normalize('plot_deg', false, null, ['plot_data_unavailable', `未能获取数据集 ${datasetId} 的 DEG 数据`]);
      // DEG 按单个数据集绘制：多样本勾选时如实说明用了哪个，不静默忽略其余样本。
      const notice = ids.length > 1
        ? (isZh
            ? `DEG 图按单个数据集绘制，本次使用 ${ids[0].label}；其余勾选样本未绘制。`
            : `DEG is plotted per dataset; this chart uses ${ids[0].label}; other ticked samples were not plotted.`)
        : null;
      return normalize('plot_deg', true, { actions: [action] }, notice ? [notice] : []);
    },
  },
  plot_atac: {
    name: 'plot_atac',
    description: 'Render an ATAC differential-peak plot for ONE dataset. Use when the user asks for ATAC differential peaks / accessibility volcano. plotType: volcano|bar (default volcano). To draw several chart types at once, pass plotTypes: ["volcano","bar"]. datasetId optional (falls back to the FIRST ticked dataset, then the open dataset). When several samples are ticked, only the first is used and a notice says which one. Returns ready-to-render plot action(s).',
    arguments: {
      datasetId: 'string optional',
      plotType: 'volcano|bar optional (default volcano)',
      plotTypes: 'array of volcano|bar optional — pass several to render multiple charts in one call',
    },
    async run(params, ctx) {
      const isZh = isZhLocale(ctx);
      const { ids } = resolveDatasetIds(params, ctx);
      const datasetId = ids[0]?.datasetId || '';
      if (!datasetId) return normalize('plot_atac', false, null, ['invalid_arguments', isZh ? '缺少数据集：请先勾选或打开一个 ATAC 数据集' : 'No dataset: tick or open an ATAC dataset first']);
      const requested = (Array.isArray(params?.plotTypes) && params.plotTypes.length)
        ? params.plotTypes.map(t => String(t).toLowerCase()).filter(t => t === 'volcano' || t === 'bar')
        : [String(params?.plotType || 'volcano').toLowerCase() === 'bar' ? 'bar' : 'volcano'];
      const actions = [];
      const warnings = [];
      for (const t of requested) {
        const action = await buildPlotAction({ dataType: 'atac', plotType: t, datasetId, locale: ctx?.locale, datasetMeta: ids[0] });
        if (action) actions.push(action);
        else warnings.push(`plot_${t}_unavailable`);
      }
      if (!actions.length) return normalize('plot_atac', false, null, ['plot_data_unavailable', `未能获取数据集 ${datasetId} 的 ATAC 差异峰数据`]);
      // 与 plot_deg 同口径：多样本勾选时如实说明用了哪个样本。
      if (ids.length > 1) {
        warnings.push(isZh
          ? `ATAC 图按单个数据集绘制，本次使用 ${ids[0].label}；其余勾选样本未绘制。`
          : `ATAC is plotted per dataset; this chart uses ${ids[0].label}; other ticked samples were not plotted.`);
      }
      return normalize('plot_atac', true, { actions }, warnings);
    },
  },
  plot_gwas: {
    name: 'plot_gwas',
    description: 'Render a GWAS scDRS enrichment bar for a trait. Use when the user asks for GWAS enrichment / trait association plot. Requires traitId (from search_traits) or the currently open GWAS trait. Returns a ready-to-render plot action.',
    arguments: { traitId: 'string optional (GWAS trait id; falls back to open GWAS trait)' },
    async run(params, ctx) {
      const traitId = resolveTraitId(params, ctx);
      if (!traitId) return normalize('plot_gwas', false, null, ['invalid_arguments', '缺少 traitId：请先指定或打开一个 GWAS 性状']);
      const action = await buildPlotAction({ dataType: 'gwas', traitId, locale: ctx?.locale });
      if (!action) return normalize('plot_gwas', false, null, ['plot_data_unavailable', `未能获取性状 ${traitId} 的富集数据`]);
      return normalize('plot_gwas', true, { actions: [action] });
    },
  },
  plot_enrichment: {
    name: 'plot_enrichment',
    description: 'Run a real gene-set enrichment (KEGG|GO_BP) for a gene list on one dataset and render the top enriched terms as a bar chart (-log10 adjusted p-value). Use when the user asks for an enrichment plot. Requires genes (gene list) and datasetId; geneSet optional. Returns a ready-to-render plot action.',
    arguments: { datasetId: 'string required', genes: 'string[] required', geneSet: 'KEGG|GO_BP optional', species: 'string optional' },
    async run(params, ctx) {
      const datasetId = params?.datasetId || ctx?.context?.businessState?.datasetId || '';
      const genes = Array.isArray(params?.genes) ? params.genes : [];
      if (!datasetId || !genes.length) return normalize('plot_enrichment', false, null, ['invalid_arguments', '富集图需要 datasetId 与 genes 列表']);
      const species = params?.species || ctx?.context?.businessState?.species || '';
      const key = String(params?.geneSet || 'KEGG').toUpperCase();
      const resolver = GENE_SETS[key] || GENE_SETS.KEGG;
      const form = new FormData();
      form.append('genes', JSON.stringify(genes));
      form.append('id', datasetId);
      form.append('gene_sets', resolver(species));
      const response = await fetch(`${config.apiUrl}enrichment.php`, { method: 'POST', body: form });
      const text = await response.text();
      let rows = [];
      try { const parsed = JSON.parse(text); rows = Array.isArray(parsed) ? parsed : []; } catch (e) { return normalize('plot_enrichment', false, null, ['enrichment_parse_failed']); }
      if (!rows.length) return normalize('plot_enrichment', false, null, ['enrichment_empty', '富集结果为空']);
      const isZh = isZhLocale(ctx);
      const x = rows.slice(0, 20).map(r => String(r.t || r.Term || 'term'));
      const y = rows.slice(0, 20).map(r => -Math.log10(Math.max(parseFloat(r.p) || 1e-300, 1e-300)));
      const payload = {
        data: [{ type: 'bar', x, y }],
        layout: { title: isZh ? '基因集富集（Top 20, -log10 校正 p）' : 'Gene-set enrichment (Top 20, -log10 adj p)', yaxis: { title: '-log10(adj p)' } },
        config: { responsive: true },
      };
      const action = {
        type: 'plot',
        plotType: 'enrichment',
        title: (isZh ? '富集分析 · ' : 'Enrichment · ') + datasetId + (genes.length ? ` · ${genes.length} genes` : ''),
        subtitle: isZh ? '由 ssMOOD 数据库实时计算' : 'Computed from ssMOOD database',
        payload,
      };
      return normalize('plot_enrichment', true, { actions: [action] });
    },
  },

  // 术语/缩写解释：当用户问某个缩写或术语是什么意思时调用。
  // 命中不到就返回空数组，不编造；命中结果由前端组装成术语卡片。
  explain_terminology: {
    name: 'explain_terminology',
    description: 'Explain an ssMOOD abbreviation or term (cell type, condition, brain region, statistic, model or method). Call it whenever the user asks what an abbreviation or term means.',
    arguments: { query: 'string required (the abbreviation or term)', limit: 'integer optional' },
    async run(params) {
      const query = String(params?.query || '').trim();
      if (!query) return normalize('explain_terminology', false, null, ['invalid_arguments']);
      const limit = Math.max(1, Math.min(Number(params?.limit) || 5, 10));
      const matches = searchGlossary(query, limit);
      return normalize('explain_terminology', true, {
        query,
        matches: matches.map(item => ({
          term: item.term,
          fullName: item.fullName,
          chineseName: item.chineseName,
          explanation: item.explanation,
          source: item.source || '',
          route: item.route || '',
        })),
        resultCount: matches.length,
      }, matches.length ? [] : ['glossary_no_match']);
    },
  },

  // 领域知识查询：术语缩写 / 字段含义 / 数值判定阈值三类一次覆盖。
  // 命中不到返回空数组，不编造；命中结果由前端组装成知识卡片。
  explain_domain_knowledge: {
    name: 'explain_domain_knowledge',
    description: 'Look up ssMOOD domain knowledge: what an abbreviation or a table field means (term/field), or whether a numeric value counts as significant (threshold). Call it whenever the user asks what an abbreviation or field means, or asks whether a value such as a padj is significant.',
    arguments: {
      query: 'string required (abbreviation, field name, or statistic name)',
      type: 'term|field|threshold optional',
      pageType: 'string optional (current page type, prioritises fields relevant to this page)',
      limit: 'integer optional',
    },
    async run(params, ctx) {
      const query = String(params?.query || '').trim();
      if (!query) return normalize('explain_domain_knowledge', false, null, ['invalid_arguments']);
      const limit = Math.max(1, Math.min(Number(params?.limit) || 5, 10));
      const pageType = params?.pageType || ctx?.context?.pageType || '';
      const matches = searchKnowledge({ query, type: params?.type || '', pageType, limit });
      return normalize('explain_domain_knowledge', true, {
        query,
        type: String(params?.type || ''),
        pageType: String(pageType || ''),
        matches: matches.map(item => ({
          key: item.key,
          type: item.type,
          fullName: item.fullName || '',
          chineseName: item.chineseName || '',
          explanation: item.explanation || '',
          longExplanation: item.longExplanation || '',
          howToRead: item.howToRead || '',
          appliesTo: item.appliesTo || '',
          thresholds: Array.isArray(item.thresholds) ? item.thresholds : [],
          aliases: Array.isArray(item.aliases) ? item.aliases : [],
          source: item.source || '',
        })),
        resultCount: matches.length,
      }, matches.length ? [] : ['knowledge_no_match']);
    },
  },
};

// 术语解释结果 → 术语卡片动作。
// 在前端本地组装：后端 sanitize_actions 只允许既有动作类型，glossary_card 走前端更稳妥。
export function glossaryActionsFromResults(results = []) {
  const actions = [];
  (results || []).forEach(result => {
    const matches = result?.result?.matches;
    if (!Array.isArray(matches)) return;
    matches.forEach(item => {
      if (!item?.term) return;
      if (!item.fullName && !item.chineseName && !item.explanation) return;
      // 后端 search_datasets 返回的术语可能不含 route；用 term 反查本地术语表兜底，
      // 这样无论术语来自前端 explain_terminology 还是后端技能，带 route 的卡片都能跳转。
      const localMatch = !item.route ? searchGlossary(String(item.term), 1)[0] : null;
      const route = item.route || (localMatch && localMatch.route) || '';
      actions.push({
        type: 'glossary_card',
        label: String(item.term),
        term: String(item.term),
        fullName: String(item.fullName || ''),
        chineseName: String(item.chineseName || ''),
        description: String(item.explanation || ''),
        source: String(item.source || ''),
        route,
      });
    });
  });
  return actions;
}

// 领域知识结果 → 知识卡片动作。
// 与 glossary_card 一样在前端本地组装：后端 sanitize_actions 只放行既有动作类型，
// knowledge_card 不经过后端，直接在结果里合并。
export function knowledgeActionsFromResults(results = []) {
  const actions = [];
  (results || []).forEach(result => {
    const matches = result?.result?.matches;
    if (!Array.isArray(matches)) return;
    matches.forEach(item => {
      if (!item?.key) return;
      if (!item.fullName && !item.chineseName && !item.explanation) return;
      const hasThresholds = Array.isArray(item.thresholds) && item.thresholds.length > 0;
      actions.push({
        type: 'knowledge_card',
        label: String(item.chineseName || item.fullName || item.key),
        key: String(item.key),
        knowledgeType: String(item.type || 'term'),
        fullName: String(item.fullName || ''),
        chineseName: String(item.chineseName || ''),
        description: String(item.explanation || ''),
        howToRead: String(item.howToRead || ''),
        appliesTo: String(item.appliesTo || ''),
        thresholds: hasThresholds ? item.thresholds : [],
        source: String(item.source || ''),
      });
    });
  });
  return actions;
}

export function virtualToolList() {
  return Object.values(VIRTUAL_TOOLS).map(tool => ({
    name: tool.name,
    description: tool.description,
    arguments: tool.arguments,
    capability: 'available',
    virtual: true,
  }));
}

// 按名字判断是否被隐藏（执行期兜底拦截用）。
function isToolNameBlocked(name) {
  if (!name) return true;
  if ((AGENT_HIDDEN_TOOLS || []).includes(name)) return true;
  if (VIRTUAL_TOOLS[name] && (AGENT_HIDDEN_VIRTUAL_TOOLS || []).includes(name)) return true;
  return unavailableBackendTools.has(name);
}

// 统一执行入口：可用性拦截 → mock → 虚拟技能 → 后端技能。
export async function runTool(name, params = {}, ctx = {}) {
  // 极小概率：模型仍点了被隐藏的工具。拦截并明确回报「能力暂未开放」，不静默失败。
  if (isToolNameBlocked(name)) {
    console.warn('[agent] blocked call to hidden/unavailable tool', { name });
    return normalize(name, false, null, ['tool_unavailable', 'tool_not_in_plan_catalog']);
  }
  const mocked = AGENT_MOCK_MODE || (Array.isArray(AGENT_MOCK_TOOLS) && AGENT_MOCK_TOOLS.includes(name));
  if (mocked) return mockToolResult(name, params);
  const virtual = VIRTUAL_TOOLS[name];
  if (virtual) {
    try {
      return await virtual.run(params, ctx);
    } catch (e) {
      return normalize(name, false, null, ['virtual_tool_exception']);
    }
  }
  return runBackendTool(name, params, ctx);
}

const catalogLogged = new Set();
let catalogCache = { locale: '', at: 0, tools: [] };

// 供 Plan 阶段使用的工具表：只含真正可用的工具，
// 空壳技能（capability=unavailable）不会出现在 Plan 提示词里，避免模型据此做出承诺。
// 结果按 locale 缓存一段时间，避免每轮对话都去拉一次 _manifest（省一次网络往返）。
//
// profile 裁剪在这一层做：只影响「注入给模型的清单」，工具实现一个都不删。
// 因此关掉某个能力 = 从 profile 的 hidden 名单里加名字，随时可以恢复。
export async function buildToolCatalog(locale, profile = DEFAULT_AGENT_PROFILE) {
  const cacheMs = Number(AGENT_TOOL_CATALOG_CACHE_MS) || 0;
  let available = catalogCache.tools;
  const cacheHit = cacheMs > 0 && available.length && catalogCache.locale === locale
    && (Date.now() - catalogCache.at) < cacheMs;

  if (!cacheHit) {
    const backend = await fetchBackendTools(locale).catch(() => []);
    const all = [...virtualToolList(), ...backend];
    available = all.filter(isToolAvailable);
    catalogCache = { locale, at: Date.now(), tools: available };
  }

  const hiddenByProfile = hiddenToolNamesFor(profile, AGENT_HIDDEN_TOOLS, AGENT_HIDDEN_VIRTUAL_TOOLS);
  const forThisProfile = available.filter(tool => !hiddenByProfile.has(tool.name));

  if (AGENT_TOOL_CATALOG_LOG && !catalogLogged.has(profile)) {
    catalogLogged.add(profile);
    const droppedByProfile = available.filter(tool => hiddenByProfile.has(tool.name)).map(tool => tool.name);
    console.info(`[agent] tools injected into Plan prompt (${profile})`, forThisProfile.map(tool => tool.name));
    if (droppedByProfile.length) console.info(`[agent] tools hidden by profile (${profile})`, droppedByProfile);
  }
  return forThisProfile;
}
