// 确定性地把「脑区 + 模态」映射为整合研究导航动作，不依赖 LLM。
//
// 为什么需要它：AI 在给空转（空间）链接时反复出错——
//   (1) 术语直答短路：命中 BA12/ST 术语后直接返回术语卡并跳过 Final，
//       而术语卡默认的 route 指向单细胞 study3，空转链接根本没有机会产生；
//   (2) 路径拼错：真实空间研究路由是 /browse/stStudy/:study（不是 spaceStudy），
//       LLM 常拼成死链，且即使拼对也会被 filterRoutableActions 的溯源校验静默丢弃。
// 因此这里用代码直接在编排层注入正确的 study 页（链接2）+ 样本列表页（链接1）链接。
//
// 脑区/模态 id 全部来自真实的 study 配置（ssmoodStudy1~4.vue）：
//   人类单细胞 study3 覆盖 BA9/BA11/BA12/BA46；人类空间 study4 覆盖 BA12/BA46；
//   小鼠单细胞 study1 覆盖分层 I-V；小鼠空间 study2 覆盖分层 I-V。
//
// P4：物种/性别/脑区的识别已统一到 agentFilters.js，本文件只保留「脑区 → 哪个 study」的映射。
import {
  detectBrainRegion,
  resolveFilters,
  buildListQuery,
  describeFilters,
  hasFilters,
} from './agentFilters';

const HUMAN_ST_REGIONS = ['BA12', 'BA46']; // 同时拥有空转整合的脑区
const LAYER_CN = { I: '一', II: '二', III: '三', IV: '四', V: '五' };

// 只有「想看/浏览/筛选」这类诉求才注入列表链接；
// 纯数据问题（「MALAT1 在人的单细胞里表达多少」）不该被塞一张浏览卡。
const BROWSING_VERB = /查看|看看|看下|想看|想找|怎么看|如何看|怎么查|如何查|怎么找|如何找|怎么筛|如何筛|浏览|打开|进入|找一?下|找找|有哪些|哪些|列出|筛选|过滤|show|browse|find|list|open/i;
// 数据类问题的特征词：命中就不注入浏览卡（宁可少给一个链接，也不打断取数回答）
// 注意：不要用「细胞数」——它会误伤「单细胞数据」这个高频词，必须写全「细胞数量」。
const DATA_QUESTION = /表达|差异|上调|下调|富集|显著|padj|log2|p\s*值|细胞数量|细胞总数|占比|组成|多少|几个|是否|为什么|原因|分析|解读|怎么读/i;

export function looksLikeBrowsing(msg) {
  if (BROWSING_VERB.test(msg)) return true;
  // 没有明确动词时，只要不是在问数据，就当作「想浏览」——「公鼠的空转数据」这类短语很常见
  return !DATA_QUESTION.test(msg);
}

function studyNav(kind, study, label) {
  const base = kind === 'stStudy' ? '/browse/stStudy/' : '/browse/singleCellStudy/';
  return { type: 'navigate', route: base + study, label };
}

function listNav(kind, baseLabel, filters) {
  const route = kind === 'stStudy' ? '/browse/SpatialTranscriptome' : '/browse/SingleCell';
  const extra = describeFilters(filters, true);
  return {
    type: 'navigate',
    route: route + buildListQuery(filters, route),
    label: extra ? `${baseLabel}（${extra}）` : baseLabel,
  };
}

function atacListNav(filters) {
  const extra = describeFilters(filters, true);
  return {
    type: 'navigate',
    route: '/browse/atac' + buildListQuery(filters, '/browse/atac'),
    label: extra ? `浏览 ATAC 样本列表（${extra}）` : '浏览 ATAC 样本列表',
  };
}

// 返回该消息应确定性注入的导航动作数组（可能为空）。
export function detectStudyNavigation(message = '') {
  const msg = String(message);
  const region = detectBrainRegion(msg);
  const filters = resolveFilters({ text: msg });
  const modality = filters.modality;

  // 没有明确模态：只在用户点名 ATAC 且明确要浏览时给 ATAC 列表，其余交给 LLM。
  if (!modality) {
    return (/\batac\b|染色质可及性/i.test(msg) && hasFilters(filters) && looksLikeBrowsing(msg))
      ? [atacListNav(filters)]
      : [];
  }

  // 没有脑区、但有物种/性别（例如「我想看母鼠的空转数据」「公鼠的空转数据」）：
  // 直接构造带参数的列表链接，落地即勾选，不依赖模型是否照做。
  if (!region) {
    if (!hasFilters(filters) || !looksLikeBrowsing(msg)) return [];
    const actions = [];
    if (modality === 'ST' || modality === 'BOTH') actions.push(listNav('stStudy', '浏览空转样本列表', filters));
    if (modality === 'SC' || modality === 'BOTH') actions.push(listNav('singleCellStudy', '浏览单细胞样本列表', filters));
    return actions;
  }

  const actions = [];
  if (region.species === 'human') {
    // BA 术语卡自带单细胞整合页的 route，但用户直接说「BA9 单细胞」时没有术语卡，
    // 所以这里也补一条带 area 的单细胞列表链接（列表页 vs 研究页路径不同，不会撞车）。
    if (modality === 'ST' || modality === 'BOTH') {
      if (HUMAN_ST_REGIONS.includes(region.region)) {
        actions.push(studyNav('stStudy', 'study4.' + region.region, `查看 ${region.region} 空转整合数据集`));
        actions.push(listNav('stStudy', '浏览空转样本列表', filters));
      }
      // BA9/BA11 无空转整合：不注入空转链接，由 LLM 在正文说明「仅有单细胞整合」。
    }
    if (modality === 'SC' || modality === 'BOTH') {
      actions.push(listNav('singleCellStudy', '浏览单细胞样本列表', filters));
    }
  } else {
    // 小鼠分层没有术语卡 route，单/空转都在此确定性给出。
    const layer = region.region;
    const cn = LAYER_CN[layer] || layer;
    if (modality === 'ST' || modality === 'BOTH') {
      actions.push(studyNav('stStudy', 'study2.area.' + layer, `查看第${cn}层 空转整合数据集`));
      actions.push(listNav('stStudy', '浏览空转样本列表', filters));
    }
    if (modality === 'SC' || modality === 'BOTH') {
      actions.push(studyNav('singleCellStudy', 'study1.area.' + layer, `查看第${cn}层 单细胞整合数据集`));
      actions.push(listNav('singleCellStudy', '浏览单细胞样本列表', filters));
    }
  }
  return actions;
}
