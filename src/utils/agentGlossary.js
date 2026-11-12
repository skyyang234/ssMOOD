// 全站术语 / 缩写表：供 AI 的「术语解释」虚拟技能使用。
// 纯前端静态数据，不接外部数据源。
// 编写原则：只写站内确实出现、且能确认含义的缩写；无法确认含义的一律不写。
// 结构：term(缩写) / aliases(别名) / fullName(全称) / chineseName(中文名) /
//       explanation(一句话解释) / source(出处)

export const GLOSSARY_TERMS = [
  // ── 细胞类型 ──
  { term: 'ExN', aliases: ['excitatory neuron'], fullName: 'Excitatory neuron', chineseName: '兴奋性神经元', explanation: '释放谷氨酸、驱动神经环路兴奋性投射的神经元，在脑单细胞数据中通常占比最大。', source: '首页 UMAP 图例' },
  { term: 'InN', aliases: ['inhibitory neuron'], fullName: 'Inhibitory neuron', chineseName: '抑制性神经元', explanation: '释放 GABA 的神经元，负责局部抑制与环路节律调控。', source: '首页 UMAP 图例' },
  { term: 'Astro', aliases: ['astrocyte'], fullName: 'Astrocyte', chineseName: '星形胶质细胞', explanation: '参与突触调控、代谢支持与血脑屏障稳态的胶质细胞。', source: '首页 UMAP 图例' },
  { term: 'Micro', aliases: ['microglia'], fullName: 'Microglia', chineseName: '小胶质细胞', explanation: '中枢神经系统的常驻免疫细胞，参与突触修剪与神经炎症反应。', source: '首页 UMAP 图例' },
  { term: 'Oligo', aliases: ['oligodendrocyte'], fullName: 'Oligodendrocyte', chineseName: '少突胶质细胞', explanation: '负责形成髓鞘、维持轴突传导效率的胶质细胞。', source: '首页 UMAP 图例' },
  { term: 'OPC', aliases: ['oligodendrocyte precursor cell'], fullName: 'Oligodendrocyte precursor cell', chineseName: '少突胶质前体细胞', explanation: '可增殖并分化为少突胶质细胞的前体细胞群。', source: '首页 UMAP 图例' },
  { term: 'Endo', aliases: ['endothelial cell'], fullName: 'Endothelial cell', chineseName: '内皮细胞', explanation: '构成脑血管壁的细胞，参与血脑屏障与物质转运。', source: '首页 UMAP 图例' },

  // ── 条件 / 模型 ──
  { term: 'MDD', aliases: ['major depressive disorder', '抑郁症'], fullName: 'Major depressive disorder', chineseName: '重度抑郁症', explanation: 'ssMOOD 面向的核心疾病，平台的人类与小鼠数据均围绕它组织。', source: '全站' },
  { term: 'CSDS', aliases: ['chronic social defeat stress', '社会失败应激'], fullName: 'Chronic social defeat stress', chineseName: '慢性社会失败应激', explanation: '通过反复社交挫败诱导抑郁样行为的小鼠模型，是 ssMOOD 小鼠数据的主要模型。', source: '整合研究卡 / Methods' },
  { term: 'Susceptible', aliases: ['sus', '易感'], fullName: 'Susceptible (stress-susceptible)', chineseName: '易感组', explanation: 'CSDS 后表现出社交回避、快感缺失等抑郁样行为的个体，通常按社交互动比值划分。', source: '整合研究卡条件筛选' },
  { term: 'Resilient', aliases: ['res', '抗压', '耐受'], fullName: 'Resilient (stress-resilient)', chineseName: '抗压组 / 耐受组', explanation: '经历同样应激但未出现明显社交回避的个体，用于与易感组对照以研究抗压机制。', source: '整合研究卡条件筛选' },
  { term: '0D', aliases: ['3D', '7D', 'day 0', 'day 3', 'day 7'], fullName: 'Day 0 / 3 / 7 sampling time point', chineseName: '应激后第 0/3/7 天取样', explanation: 'CSDS 流程中的取样时间点：0D 为应激前的对照基线，3D、7D 分别为应激结束后第 3、7 天。', source: '整合研究卡条件筛选' },

  // ── 脑区 ──
  { term: 'PFC', aliases: ['prefrontal cortex', '前额叶'], fullName: 'Prefrontal cortex', chineseName: '前额叶皮层', explanation: '参与情绪调控与执行功能的脑区，是抑郁症研究的核心区域。', source: '首页 Tagline' },
  { term: 'ACC', aliases: ['anterior cingulate cortex', '前扣带回'], fullName: 'Anterior cingulate cortex', chineseName: '前扣带回皮层', explanation: '参与情绪与疼痛调控的脑区，抑郁症影像与转录研究中常见。', source: '首页 Tagline' },
  { term: 'BA9', aliases: ['brodmann area 9', 'Brodmann9', 'Brodmann 9 区'], fullName: 'Brodmann area 9', chineseName: 'Brodmann 9 区', explanation: '位于背外侧前额叶皮层的 Brodmann 分区，是 ssMOOD 人类单细胞数据覆盖的脑区之一。', source: '人类单细胞整合研究卡', route: '/browse/singleCellStudy/study3.BA9' },
  { term: 'BA11', aliases: ['brodmann area 11', 'Brodmann11', 'Brodmann 11 区'], fullName: 'Brodmann area 11', chineseName: 'Brodmann 11 区', explanation: '位于眶额皮层区域的 Brodmann 分区，是 ssMOOD 人类单细胞数据覆盖的脑区之一。', source: '人类单细胞整合研究卡', route: '/browse/singleCellStudy/study3.BA11' },
  { term: 'BA12', aliases: ['brodmann area 12', 'Brodmann12', 'Brodmann 12 区'], fullName: 'Brodmann area 12', chineseName: 'Brodmann 12 区', explanation: '位于眶额皮层区域的 Brodmann 分区，ssMOOD 人类单细胞与空间数据均覆盖该脑区。', source: '人类整合研究卡', route: '/browse/singleCellStudy/study3.BA12' },
  { term: 'BA46', aliases: ['brodmann area 46', 'Brodmann46', 'DLPFC', 'Brodmann 46 区'], fullName: 'Brodmann area 46', chineseName: 'Brodmann 46 区', explanation: '背外侧前额叶皮层（DLPFC）对应的 Brodmann 分区，与工作记忆和情绪调控相关。', source: '人类整合研究卡', route: '/browse/singleCellStudy/study3.BA46' },

  // ── 统计量 ──
  { term: 'Pct.1', aliases: ['pct1', 'Pct1', 'pct.1'], fullName: 'Percentage of cells expressing the gene in group 1', chineseName: '第一组检出比例', explanation: 'DEG 表中该基因在第一组（所选细胞类型）细胞中被检出的细胞比例；数值越大表示在该细胞类型中表达越普遍。', source: '单细胞/空间详情页 DEG 表' },
  { term: 'Pct.2', aliases: ['pct2', 'Pct2', 'pct.2'], fullName: 'Percentage of cells expressing the gene in group 2', chineseName: '第二组检出比例', explanation: 'DEG 表中该基因在第二组（其余细胞类型）细胞中被检出的细胞比例，与 Pct.1 对比可判断细胞类型特异性。', source: '单细胞/空间详情页 DEG 表' },
  { term: 'LogFC', aliases: ['logfc', 'log2fc', 'fold change'], fullName: 'Log fold change', chineseName: '对数倍数变化', explanation: '两组表达量倍数的对数值，大于 0 表示第一组（所选细胞类型）更高，小于 0 表示更低。', source: 'DEG 表 LogFC 列' },
  { term: 'Adjusted p-value', aliases: ['adj.P', 'padj', 'adj p', 'adjusted p'], fullName: 'Adjusted p-value (FDR / BH)', chineseName: '校正后 p 值', explanation: '多重检验校正后的显著性指标；站内 DEG 与 ATAC 差异 peak 默认以 0.05 为阈值。', source: 'DEG 表 / ATAC 差异 peak 面板' },
  { term: 'assoc_mcp', aliases: ['mcp', 'assoc mcp'], fullName: 'Association Monte Carlo p-value (scDRS)', chineseName: 'scDRS 关联 p 值', explanation: 'scDRS 中该细胞类型或组别与 GWAS 性状关联的蒙特卡洛 p 值，越小表示关联越显著。', source: 'GWAS/scDRS 富集表' },
  { term: 'assoc_mcz', aliases: ['mcz', 'assoc mcz'], fullName: 'Association Monte Carlo z-score (scDRS)', chineseName: 'scDRS 关联 z 分数', explanation: 'scDRS 关联的标准化效应量，越大表示该细胞类型与性状的关联越强。', source: 'GWAS/scDRS 富集表' },
  { term: 'hetero_mcp', aliases: ['hetero mcp'], fullName: 'Heterogeneity Monte Carlo p-value (scDRS)', chineseName: 'scDRS 异质性 p 值', explanation: 'scDRS 中检验同一组内关联是否存在异质性的 p 值，用于判断关联是否由少数细胞驱动。', source: 'GWAS/scDRS 富集表' },
  { term: 'FDR', aliases: ['false discovery rate'], fullName: 'False discovery rate', chineseName: '错误发现率', explanation: '在所有被判定为显著的结果中假阳性的期望比例；GWAS 页用 FDR<0.05 / 0.1 / 0.2 统计显著条目数。', source: 'GWAS/scDRS 富集表' },
  { term: 'Odds Ratio', aliases: ['OR', 'odds ratio'], fullName: 'Odds ratio', chineseName: '比值比', explanation: '富集分析中命中基因的占比与背景基因占比之比，大于 1 表示该通路被富集。', source: '富集结果表' },
  { term: 'Combined Score', aliases: ['combined score'], fullName: 'Combined score', chineseName: '综合得分', explanation: '富集分析中同时考虑显著性与效应量的综合得分（通常由 p 值与 z 分数组合），数值越高越可信。', source: '富集结果表' },
  { term: 'Lambda GC', aliases: ['lambda gc', 'genomic control lambda'], fullName: 'Genomic control lambda', chineseName: '基因组膨胀因子', explanation: 'GWAS 中衡量检验统计量整体膨胀程度的指标，接近 1 表示无明显群体结构或技术偏倚。', source: 'GWAS 性状元数据' },
  { term: 'scDRS', aliases: ['single-cell disease relevance score'], fullName: 'single-cell Disease Relevance Score', chineseName: '单细胞疾病关联评分', explanation: '把 GWAS 遗传信号映射到单个细胞并给出疾病关联评分的方法，得分越高表示该细胞与性状关联越强。', source: 'GWAS/scDRS 页' },
  { term: 'GSMap', aliases: ['gsmap'], fullName: 'Genetically-informed spatial mapping', chineseName: '空间遗传信号映射', explanation: 'ssMOOD 空间数据中用于把 GWAS 信号投影到空间位点的计算，页面以 spot 级 z 分数展示。', source: '空间详情页 / 整合研究页' },
  { term: 'UMAP', aliases: ['uniform manifold approximation and projection'], fullName: 'Uniform Manifold Approximation and Projection', chineseName: '均匀流形近似与投影', explanation: '常用的降维可视化方法，把高维表达压缩为二维散点以展示细胞分群。', source: '单细胞/ATAC 详情页' },
  { term: 'TF-IDF', aliases: ['tfidf', 'tf-idf'], fullName: 'Term frequency–inverse document frequency', chineseName: '词频-逆文档频率', explanation: 'ATAC 中按细胞对 peak 可及性做归一化的数值，站内峰值图的颜色为 log10(tfidf)。', source: 'ATAC 详情页 peak 图' },

  // ── 技术与方法 ──
  { term: 'DEG', aliases: ['differentially expressed gene', '差异表达'], fullName: 'Differentially expressed gene', chineseName: '差异表达基因', explanation: '组间表达显著变化的基因；站内当前为「某细胞类型 vs 其余细胞类型」的比较（Wilcoxon）。', source: '单细胞/空间详情页' },
  { term: 'DAP', aliases: ['differential accessible peak', '差异可及性'], fullName: 'Differential accessible peak', chineseName: '差异可及性 peak', explanation: '组间开放程度显著不同的染色质区域，站内用 pseudobulk Welch t 检验计算并配火山图。', source: 'ATAC 详情页差异可及性面板' },
  { term: 'Pseudobulk Welch t-test', aliases: ['pseudobulk', 'welch t-test', '拟bulk'], fullName: 'Pseudobulk Welch t-test', chineseName: '拟bulk Welch t 检验', explanation: '先把每个样本的细胞聚合为 pseudobulk 再检验，且不假定两组方差相等，避免把细胞当作独立重复导致假阳性。', source: 'ATAC 差异 peak 摘要卡' },
  { term: 'snRNA-seq', aliases: ['snrna', 'single-nucleus rna sequencing', '单核测序'], fullName: 'single-nucleus RNA sequencing', chineseName: '单核 RNA 测序', explanation: '对细胞核而非完整细胞测序，适合冻存脑组织样本。', source: '首页技术徽章 / Methods' },
  { term: 'scRNA-seq', aliases: ['scrna', 'single-cell rna sequencing'], fullName: 'single-cell RNA sequencing', chineseName: '单细胞 RNA 测序', explanation: '在单个细胞水平测定转录本的技术；站内单细胞数据为 snRNA-seq，本词条仅供术语对照。', source: '术语对照' },
  { term: 'snATAC-seq', aliases: ['snatac', 'single-nucleus atac sequencing'], fullName: 'single-nucleus ATAC sequencing', chineseName: '单核染色质可及性测序', explanation: '在单核水平测定染色质开放区域的技术，站内 ATAC 数据集默认为此类。', source: 'ATAC 列表 / 详情页' },
  { term: 'ST', aliases: ['spatial transcriptomics', '空间转录组'], fullName: 'Spatial transcriptomics', chineseName: '空间转录组', explanation: '保留组织空间位置的转录组技术；站内空间数据来自 Stereo-seq。', source: 'BrowseHub / 空间页' },
  { term: 'Stereo-seq', aliases: ['stereoseq', '时空组学'], fullName: 'SpaTial Enhanced REsolution Omics-sequencing', chineseName: '时空组学测序', explanation: '华大开发的纳米级分辨率空间转录组技术，是站内空间数据的平台。', source: '首页技术徽章' },
  { term: 'Seurat', aliases: ['seurat v5'], fullName: 'Seurat', chineseName: '单细胞分析 R 包', explanation: '单细胞数据分析的主流 R 框架，站内分析流程使用 Seurat v5。', source: '首页技术徽章 / Methods' },
  { term: 'Scanpy', aliases: ['scanpy'], fullName: 'Scanpy', chineseName: '单细胞分析 Python 框架', explanation: '单细胞数据分析的主流 Python 框架，站内分析流程之一。', source: '首页技术徽章 / Methods' },
  { term: 'Harmony', aliases: ['harmony'], fullName: 'Harmony', chineseName: '批次校正与整合算法', explanation: '用于跨样本、跨批次的降维空间校正，使不同来源数据可整合比较。', source: '首页技术徽章 / Methods' },
  { term: 'SNP', aliases: ['single nucleotide polymorphism', 'snp_id'], fullName: 'Single nucleotide polymorphism', chineseName: '单核苷酸多态性', explanation: 'GWAS 信号表中的最小遗传变异单位，表内以 snp_id 标识并给出染色体位置与 p 值。', source: 'GWAS 信号表' },
  { term: 'YLD', aliases: ['years lived with disability'], fullName: 'Years lived with disability', chineseName: '伤残损失健康生命年', explanation: '衡量疾病导致的健康寿命损失的人年数，首页用它说明抑郁症的疾病负担。', source: '首页科学背景区' },

  // ── 数据与图表元素：这几个词用户问得最多，而模型最容易讲反 ──
  { term: 'spot', aliases: ['spots', '捕获点', 'bin'], fullName: 'Spatial capture spot', chineseName: '空间捕获点', explanation: '空间转录组切片上的最小捕获单元，一个 spot 通常包含多个细胞；因此空间数据的定位靠 spot 坐标，而不是单个细胞。', source: '空间详情页 / 空间表达图' },
  { term: 'cluster', aliases: ['聚类', '细胞亚群', 'clusters'], fullName: 'Cell cluster', chineseName: '细胞聚类', explanation: '把表达谱相近的细胞聚成的一组，通常对应一个细胞类型或状态；UMAP 图上每个颜色块就是一个 cluster，点进去可以看它的差异基因。', source: '单细胞 / ATAC 详情页 UMAP' },
  { term: 'volcano plot', aliases: ['volcano', '火山图'], fullName: 'Volcano plot', chineseName: '火山图', explanation: '横轴 LogFC、纵轴 -log10(校正 p 值) 的散点图：越靠两侧差异倍数越大，越靠上越显著。', source: 'DEG 绘图' },

  // ── 富集分析：用户问"这堆通路是什么意思"时的高频入口 ──
  { term: 'GO', aliases: ['gene ontology', '基因本体'], fullName: 'Gene Ontology', chineseName: '基因本体', explanation: '基因功能的标准分类体系，分生物过程（BP）、细胞组分（CC）、分子功能（MF）三支；站的富集结果以 GO_BP 为主。', source: '富集分析结果' },
  { term: 'KEGG', aliases: ['kegg pathway', 'kegg 通路', '通路富集'], fullName: 'Kyoto Encyclopedia of Genes and Genomes', chineseName: 'KEGG 通路', explanation: '通路数据库；富集分析用它判断一组差异基因是否集中在某条生物学通路上。', source: '富集分析结果' },
];

// 「查询里包含该术语」这条规则的生效长度：
// 拉丁缩写太短会误伤（"st" 出现在 almost / list 里），因此要求 ≥4；
// 中文按字算，2 个字就已经足够specific（"火山图""聚类"），要求 ≥4 会永远匹配不上。
const minContainLength = (value = '') => {
  for (const char of String(value)) {
    if (char.codePointAt(0) > 127) return 2;
  }
  return 4;
};

// 模糊匹配：精确 > 前缀 > 子串 > 查询包含术语 > 中文名/全称命中。
// 命中不到返回空数组，绝不编造。
export function searchGlossary(query, limit = 5) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const escapeRe = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 独立单词匹配：Sus 不该命中 "issue"，但必须命中"CSDS 里的 Sus 是什么"
  const wordHit = value => {
    const text = String(value || '').toLowerCase().trim();
    if (text.length < 3) return false;
    return new RegExp(`(^|[^a-z0-9])${escapeRe(text)}([^a-z0-9]|$)`).test(q);
  };

  const scored = [];
  GLOSSARY_TERMS.forEach(entry => {
    const term = String(entry.term || '').toLowerCase();
    const aliases = (entry.aliases || []).map(alias => String(alias).toLowerCase());
    let score = 0;
    if (term === q || aliases.includes(q)) score = 100;
    else if (term.startsWith(q) || aliases.some(alias => alias.startsWith(q))) score = 80;
    else if (q.length >= 3 && (term.includes(q) || aliases.some(alias => alias.length >= 3 && alias.includes(q)))) score = 60;
    // 查询里包含该术语：仅对长度 >= 4 的术语/别名生效，避免 "st" 之类短别名误命中
    // 3 个字母的缩写（Sus / Res / BA9）按"独立单词"匹配：
    // 既不会被 almost/list 误伤，也不会因为短于 4 个字符永远匹配不上。
    else if (wordHit(term) || aliases.some(wordHit)) score = 55;
    else if (
      (term.length >= minContainLength(term) && q.includes(term))
      || aliases.some(alias => alias.length >= minContainLength(alias) && q.includes(alias))
    ) score = 55;
    else {
      const chinese = String(entry.chineseName || '').toLowerCase();
      const full = String(entry.fullName || '').toLowerCase();
      if (q.length >= 2 && (chinese.includes(q) || full.includes(q))) score = 40;
    }
    if (score > 0) scored.push({ ...entry, score });
  });

  scored.sort((a, b) => (b.score - a.score) || String(a.term).localeCompare(String(b.term)));
  return scored.slice(0, Math.max(1, Math.min(Number(limit) || 5, 10)));
}
