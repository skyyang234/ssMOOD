// 概念层兜底：像「单细胞和空转分别是什么意思，这些数据有什么用啊」这类问题，
// 不指向任何具体数据集、基因或字段，模型有时会判成"无从下手"（没工具可调、reply 又是空的），
// 最后被自检拦下，用户看到的是"没判断出该走哪种处理"。
//
// 这类问题的答案是**站内既有的固定知识**，不需要模型自由发挥，也不需要查库。
// 因此这里用代码直接作答：宁可确定性地说清楚，也不要让模型即兴编一段。
//
// 边界：只有在"明确在问概念"（是什么/区别/有什么用）时才接管；
// 「查看单细胞数据」这种浏览请求仍然交给 Plan + slots，绝不抢。

const MODALITY_ALIASES = {
  SC: [/单细胞/, /单核/, /scrna/i, /snrna/i, /single[-\s]?cell/i, /sc-rna/i],
  ST: [/空转/, /空间转录组/, /空间组学/, /spatial/i, /stereo[-\s]?seq/i, /visium/i],
  ATAC: [/atac/i, /染色质/i, /chromatin/i],
  GWAS: [/gwas/i, /全基因组关联/i, /scdrs/i, /遗传关联/i],
};

// 「在问概念」的信号：没有这些词时一律不接管，避免把浏览请求截胡
const CONCEPT_CUES = [
  /是什么/, /什么意思/, /啥意思/, /指的是/, /定义/, /含义/,
  /区别/, /差别/, /不同/, /差异在哪/, /怎么区分/, /对比/,
  /有什么用/, /干什么用/, /能做什么/, /可以做什么/, /用来做什么/, /用途/, /能看什么/,
  /what\s+(is|are)/i, /difference/i, /mean(s|ing)?\b/i, /used\s+for/i,
];

const CONCEPTS = {
  zh: {
    SC: {
      name: '单细胞（snRNA-seq）',
      what: '把组织消化成单个细胞后分别测转录组，回答「有哪些细胞类型、每种细胞各自表达什么基因」。',
      detail: '分辨率到单个细胞，但细胞脱离组织后位置信息丢失。本站单细胞数据为 snRNA-seq（单核测序），人类样本覆盖 dlPFC 各分区，小鼠按皮层 I–V 层组织。',
      use: ['细胞类型组成：各类细胞占比是否随分组（Sus/Res、Control/MDD）变化', '差异表达（DEG）：某细胞类型 vs 其余细胞类型', '单基因表达：某基因在哪些细胞类型里高表达', 'UMAP 分群：看细胞类型划分是否合理'],
    },
    ST: {
      name: '空转（空间转录组，Stereo-seq）',
      what: '不打断组织，在切片上按位置测表达，回答「这个基因在哪一层、哪个脑区表达」。',
      detail: '保留空间位置，但一个 spot 通常含多个细胞，分辨率低于单细胞。本站空间数据来自 Stereo-seq，人类覆盖 BA12/BA46，小鼠覆盖皮层 I–V 层。',
      use: ['空间表达图：某基因在切片上的分布', '层 / 脑区之间的表达差异', 'GWAS 信号投影（GSMap）：遗传风险落在哪个位置'],
    },
    ATAC: {
      name: 'ATAC（染色质可及性）',
      what: '测染色质开放区域，回答「哪些调控区在这群细胞里是打开的」。',
      detail: '本站 ATAC 数据提供差异可及峰（differential peaks）与峰注释，用于解释表达变化的调控来源。',
      use: ['差异可及峰：组间开放程度变化的区域', '峰注释：开放区对应的基因与调控元件'],
    },
    GWAS: {
      name: 'GWAS（全基因组关联分析）',
      what: '在人群水平找与性状相关的遗传变异，回答「哪些位点与抑郁症等性状相关」。',
      detail: '本站提供关联信号表与 scDRS 细胞级关联评分，可与单细胞、空间数据联看。',
      use: ['关联信号：snp_id、位置与 p 值', 'scDRS：把遗传风险映射到单个细胞', '与空间数据结合看风险信号的空间分布'],
    },
  },
  en: {
    SC: {
      name: 'Single-cell (snRNA-seq)',
      what: 'Dissociates tissue into individual cells and profiles each transcriptome, answering which cell types exist and what each expresses.',
      detail: 'Cell-level resolution, but spatial position is lost. All single-cell data here is snRNA-seq (single-nucleus); mouse data is organized by cortical layers I–V.',
      use: ['Cell-type composition across groups (Sus/Res, Control/MDD)', 'DEG: one cell type vs the rest', 'Single-gene expression per cell type', 'UMAP clustering'],
    },
    ST: {
      name: 'Spatial transcriptomics (Stereo-seq)',
      what: 'Profiles expression in place on a tissue section, answering where a gene is expressed (which layer or brain region).',
      detail: 'Keeps spatial position, but one spot usually contains several cells, so resolution is lower than single-cell. Human data covers BA12/BA46; mouse covers cortical layers I–V.',
      use: ['Spatial expression map for a gene', 'Expression differences between layers / regions', 'GWAS signal projection (GSMap)'],
    },
    ATAC: {
      name: 'ATAC (chromatin accessibility)',
      what: 'Measures open chromatin regions, answering which regulatory elements are accessible in a cell population.',
      detail: 'Provides differential peaks and peak annotation, which explain where expression changes come from.',
      use: ['Differential peaks between groups', 'Peak annotation to genes'],
    },
    GWAS: {
      name: 'GWAS',
      what: 'Finds genetic variants associated with a trait at population scale.',
      detail: 'Provides association signals plus per-cell scDRS scores that can be combined with single-cell and spatial data.',
      use: ['Association signals (snp_id, position, p-value)', 'scDRS per-cell disease relevance', 'Spatial projection of risk signals'],
    },
  },
};

const NAV = {
  SC: { type: 'navigate', route: '/browse/SingleCell', label: { zh: '浏览单细胞数据集', en: 'Browse single-cell datasets' } },
  ST: { type: 'navigate', route: '/browse/SpatialTranscriptome', label: { zh: '浏览空间转录组数据集', en: 'Browse spatial datasets' } },
  ATAC: { type: 'navigate', route: '/browse/atac', label: { zh: '浏览 ATAC 数据集', en: 'Browse ATAC datasets' } },
  GWAS: { type: 'navigate', route: '/browse/gwas', label: { zh: '浏览 GWAS 结果', en: 'Browse GWAS results' } },
};

export function detectModalities(text = '') {
  const raw = String(text || '');
  if (!raw) return [];
  return Object.keys(MODALITY_ALIASES).filter(key => (
    MODALITY_ALIASES[key].some(pattern => pattern.test(raw))
  ));
}

export function asksAboutConcept(text = '') {
  const raw = String(text || '');
  if (!raw) return false;
  return CONCEPT_CUES.some(pattern => pattern.test(raw));
}

// 返回 null 表示"这不是我该管的"，调用方继续走原路径。
export function buildConceptAnswer({ text = '', locale = 'zh' } = {}) {
  if (!asksAboutConcept(text)) return null;
  const found = detectModalities(text);
  if (!found.length) return null;

  const zh = String(locale || '').toLowerCase().startsWith('zh');
  const dict = zh ? CONCEPTS.zh : CONCEPTS.en;
  const picked = found.filter(key => dict[key]);
  if (!picked.length) return null;

  const lines = [];
  if (picked.length >= 2) {
    // 两个及以上概念：先分别说清，再给一句区别（用户真正想知道的是"怎么分"）
    picked.forEach(key => {
      lines.push(`${dict[key].name}：${dict[key].what}`);
      lines.push(`  ${dict[key].detail}`);
    });
    if (picked.includes('SC') && picked.includes('ST')) {
      lines.push(zh
        ? '一句话区别：单细胞回答「是哪种细胞」，空转回答「在哪个位置」。前者分辨率到细胞但位置丢失，后者保留位置但一个 spot 含多个细胞。'
        : 'In one line: single-cell answers "which cell type", spatial answers "where". The former resolves cells but loses position; the latter keeps position but mixes cells per spot.');
    }
  } else {
    const key = picked[0];
    lines.push(`${dict[key].name}：${dict[key].what}`);
    lines.push(dict[key].detail);
  }

  lines.push(zh ? '在本站能拿它做什么：' : 'What you can do with it here:');
  picked.forEach(key => {
    dict[key].use.forEach(item => lines.push(`· ${item}`));
  });

  if (picked.includes('SC') && picked.includes('ST')) {
    lines.push(zh
      ? '两者可以配合看：人类 BA12 / BA46 同时有单细胞与空间数据，可以先在单细胞里确认「哪类细胞表达」，再到空间数据里确认「这类细胞在哪一层」。'
      : 'They work together: BA12/BA46 have both modalities, so confirm "which cell type expresses it" in single-cell, then "where that layer sits" in spatial.');
  }

  const actions = picked
    .filter(key => NAV[key])
    .map(key => ({
      type: NAV[key].type,
      route: NAV[key].route,
      label: zh ? NAV[key].label.zh : NAV[key].label.en,
    }));

  return { reply: lines.join('\n'), actions };
}
