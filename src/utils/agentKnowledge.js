// 领域知识表：术语缩写 / 字段含义 / 数值判定阈值。
// 纯前端静态数据，供虚拟技能 explain_domain_knowledge 查询。
// 编写原则：只写站内确实出现、且能确认含义的条目；无法确认的一律不写。
//
// 结构：
//   key        唯一标识
//   type       term（术语缩写）| field（字段含义）| threshold（数值判定阈值）
//   fullName / chineseName / explanation（一句话解释）
//   longExplanation / howToRead    可选展开内容
//   thresholds [{ level, condition, meaning }]  仅 threshold 类使用
//   aliases [] 别名；source 出处；pages [] 相关页面类型（用于按当前页优先返回）
//   appliesTo 该字段所属的表/面板（field 类）

export const KNOWLEDGE_ENTRIES = [
  // ══════════════ 术语类 term ══════════════
  { key: 'term_exn', type: 'term', fullName: 'Excitatory neuron', chineseName: '兴奋性神经元', aliases: ['ExN', 'excitatory neuron'], explanation: '释放谷氨酸、驱动神经环路兴奋性投射的神经元，在脑单细胞数据中通常占比最大。', source: '首页 UMAP 图例', pages: ['single_cell_detail', 'spatial_detail'] },
  { key: 'term_inn', type: 'term', fullName: 'Inhibitory neuron', chineseName: '抑制性神经元', aliases: ['InN', 'inhibitory neuron'], explanation: '释放 GABA 的神经元，负责局部抑制与环路节律调控。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },
  { key: 'term_astro', type: 'term', fullName: 'Astrocyte', chineseName: '星形胶质细胞', aliases: ['Astro', 'astrocyte', 'ASTRO'], explanation: '参与突触调控、代谢支持与血脑屏障稳态的胶质细胞。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },
  { key: 'term_micro', type: 'term', fullName: 'Microglia', chineseName: '小胶质细胞', aliases: ['Micro', 'microglia'], explanation: '中枢神经系统的常驻免疫细胞，参与突触修剪与神经炎症反应。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },
  { key: 'term_oligo', type: 'term', fullName: 'Oligodendrocyte', chineseName: '少突胶质细胞', aliases: ['Oligo', 'oligodendrocyte'], explanation: '负责形成髓鞘、维持轴突传导效率的胶质细胞。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },
  { key: 'term_opc', type: 'term', fullName: 'Oligodendrocyte precursor cell', chineseName: '少突胶质前体细胞', aliases: ['OPC'], explanation: '可增殖并分化为少突胶质细胞的前体细胞群。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },
  { key: 'term_endo', type: 'term', fullName: 'Endothelial cell', chineseName: '内皮细胞', aliases: ['Endo'], explanation: '构成脑血管壁的细胞，参与血脑屏障与物质转运。', source: '首页 UMAP 图例', pages: ['single_cell_detail'] },

  { key: 'term_mdd', type: 'term', fullName: 'Major depressive disorder', chineseName: '重度抑郁症', aliases: ['MDD', '抑郁症'], explanation: 'ssMOOD 面向的核心疾病，平台的人类与小鼠数据均围绕它组织。', source: '全站', pages: [] },
  { key: 'term_csds', type: 'term', fullName: 'Chronic social defeat stress', chineseName: '慢性社会失败应激', aliases: ['CSDS', '社会失败应激'], explanation: '通过反复社交挫败诱导抑郁样行为的小鼠模型，是 ssMOOD 小鼠数据的主要模型。', source: '整合研究卡 / Methods', pages: [] },
  { key: 'term_susceptible', type: 'term', fullName: 'Susceptible (stress-susceptible)', chineseName: '易感组', aliases: ['Susceptible', 'sus', '易感'], explanation: 'CSDS 后表现出社交回避、快感缺失等抑郁样行为的个体，通常按社交互动比值划分。', source: '整合研究卡条件筛选', pages: [] },
  { key: 'term_resilient', type: 'term', fullName: 'Resilient (stress-resilient)', chineseName: '抗压组 / 耐受组', aliases: ['Resilient', 'res', '抗压', '耐受'], explanation: '经历同样应激但未出现明显社交回避的个体，用于与易感组对照以研究抗压机制。', source: '整合研究卡条件筛选', pages: [] },
  { key: 'term_pfc', type: 'term', fullName: 'Prefrontal cortex', chineseName: '前额叶皮层', aliases: ['PFC', '前额叶'], explanation: '参与情绪调控与执行功能的脑区，是抑郁症研究的核心区域。', source: '首页 Tagline', pages: [] },
  { key: 'term_acc', type: 'term', fullName: 'Anterior cingulate cortex', chineseName: '前扣带回皮层', aliases: ['ACC', '前扣带回'], explanation: '参与情绪与疼痛调控的脑区，抑郁症影像与转录研究中常见。', source: '首页 Tagline', pages: [] },

  { key: 'term_deg', type: 'term', fullName: 'Differentially expressed gene', chineseName: '差异表达基因', aliases: ['DEG', '差异表达'], explanation: '组间表达显著变化的基因；站内为「某细胞类型 vs 其余细胞类型」的比较（Wilcoxon）。', source: '单细胞/空间详情页', pages: ['single_cell_detail', 'spatial_detail'] },
  { key: 'term_dap', type: 'term', fullName: 'Differential accessible peak', chineseName: '差异可及性 peak', aliases: ['DAP', '差异可及性'], explanation: '组间开放程度显著不同的染色质区域，站内用 pseudobulk Welch t 检验计算并配火山图。', source: 'ATAC 详情页差异可及性面板', pages: ['atac_detail'] },
  { key: 'term_sdrs', type: 'term', fullName: 'single-cell Disease Relevance Score', chineseName: '单细胞疾病关联评分', aliases: ['scDRS'], explanation: '把 GWAS 遗传信号映射到单个细胞并给出疾病关联评分的方法，得分越高表示该细胞与性状关联越强。', source: 'GWAS/scDRS 页', pages: ['gwas'] },
  { key: 'term_gsmap', type: 'term', fullName: 'Genetically-informed spatial mapping', chineseName: '空间遗传信号映射', aliases: ['GSMap'], explanation: '把 GWAS 信号投影到空间位点的计算，页面以 spot 级 z 分数展示。', source: '空间详情页 / 整合研究页', pages: ['spatial_detail'] },
  { key: 'term_umap', type: 'term', fullName: 'Uniform Manifold Approximation and Projection', chineseName: '均匀流形近似与投影', aliases: ['UMAP'], explanation: '常用的降维可视化方法，把高维表达压缩为二维散点以展示细胞分群。', source: '单细胞/ATAC 详情页', pages: ['single_cell_detail', 'atac_detail'] },
  { key: 'term_tfidf', type: 'term', fullName: 'Term frequency–inverse document frequency', chineseName: '词频-逆文档频率', aliases: ['TF-IDF', 'tfidf'], explanation: 'ATAC 中按细胞对 peak 可及性做归一化的数值，站内峰值图的颜色为 log10(tfidf)。', source: 'ATAC 详情页 peak 图', pages: ['atac_detail'] },
  { key: 'term_snp', type: 'term', fullName: 'Single nucleotide polymorphism', chineseName: '单核苷酸多态性', aliases: ['SNP', 'snp_id'], explanation: 'GWAS 信号表中的最小遗传变异单位，表内以 snp_id 标识并给出染色体位置与 p 值。', source: 'GWAS 信号表', pages: ['gwas'] },

  // ══════════════ 字段类 field ══════════════
  { key: 'field_cells', type: 'field', appliesTo: '单细胞/空间详情页概览', fullName: 'Number of cells', chineseName: '细胞数', aliases: ['cells', 'n_cells', '细胞数'], explanation: '该数据集经过质控后纳入分析的细胞总数。', howToRead: '数值越大通常表示测序深度/样本量越充足，统计检验越稳；几百到几万不等，没有优劣之分。', source: '单细胞详情页元信息', pages: ['single_cell_detail'] },
  { key: 'field_clusters', type: 'field', appliesTo: '单细胞/空间详情页概览', fullName: 'Number of clusters', chineseName: '分群数', aliases: ['clusters', 'n_clusters', '分群数'], explanation: '该数据集注释得到的细胞类型/亚群数量。', howToRead: '分群越多说明分辨率越细，但也可能混入低质量亚群；需结合 marker 基因判断。', source: '单细胞详情页元信息', pages: ['single_cell_detail'] },
  { key: 'field_species', type: 'field', appliesTo: '列表页/详情页筛选', fullName: 'Species', chineseName: '物种', aliases: ['species', '物种'], explanation: '样本来源物种，站内为 human（人类）或 mouse（小鼠）。', howToRead: '人类数据按 Brodmann 分区（BA9/BA11/BA12/BA46）组织，小鼠数据按皮层分层 I-V 组织。', source: '列表页筛选', pages: ['single_cell_list', 'spatial_list', 'single_cell_detail'] },
  { key: 'field_area', type: 'field', appliesTo: '列表页/详情页筛选', fullName: 'Brain region / area', chineseName: '脑区 / 组织', aliases: ['area', 'brainRegion', 'tissue', '脑区'], explanation: '样本取自的脑区或组织部位。', source: '列表页筛选', pages: ['single_cell_list', 'single_cell_detail'] },
  { key: 'field_condition', type: 'field', appliesTo: '列表页/详情页筛选', fullName: 'Condition', chineseName: '条件 / 分组', aliases: ['condition', 'conditions', '条件'], explanation: '样本所属的实验条件或疾病分组，如 MDD、Control、CSDS 的 Susceptible/Resilient。', source: '列表页筛选', pages: ['single_cell_list', 'single_cell_detail'] },
  { key: 'field_technology', type: 'field', appliesTo: '列表页/详情页筛选', fullName: 'Technology', chineseName: '测序技术', aliases: ['technology', '技术'], explanation: '建库测序平台，如 snRNA-seq、Stereo-seq。', source: '列表页筛选', pages: ['single_cell_list', 'spatial_list'] },

  { key: 'field_logfc', type: 'field', appliesTo: 'DEG 表', fullName: 'Log fold change', chineseName: '对数倍数变化', aliases: ['LogFC', 'logfc', 'avg_log2FC', 'log2fc', 'log2FC'], explanation: '两组表达量倍数的对数值（站内为 log2）。', howToRead: '大于 0 表示第一组（所选细胞类型）更高，小于 0 表示更低；绝对值越大变化幅度越大。', source: 'DEG 表 LogFC 列', pages: ['single_cell_detail', 'spatial_detail'] },
  { key: 'field_pct1', type: 'field', appliesTo: 'DEG 表', fullName: 'Percentage in group 1', chineseName: '第一组检出比例', aliases: ['Pct.1', 'pct1', 'pct.1'], explanation: '该基因在第一组（所选细胞类型）细胞中被检出的细胞比例，取值 0–1。', howToRead: '越大表示在该细胞类型中表达越普遍；接近 1 说明几乎每个细胞都表达。', source: 'DEG 表', pages: ['single_cell_detail', 'spatial_detail'] },
  { key: 'field_pct2', type: 'field', appliesTo: 'DEG 表', fullName: 'Percentage in group 2', chineseName: '第二组检出比例', aliases: ['Pct.2', 'pct2', 'pct.2'], explanation: '该基因在第二组（其余细胞类型）细胞中被检出的细胞比例，取值 0–1。', howToRead: '与 Pct.1 相减可判断细胞类型特异性：差值越大越特异。', source: 'DEG 表', pages: ['single_cell_detail', 'spatial_detail'] },
  { key: 'field_padj', type: 'field', appliesTo: 'DEG 表 / ATAC 差异 peak', fullName: 'Adjusted p-value (FDR / BH)', chineseName: '校正后 p 值', aliases: ['padj', 'adj.P', 'p_val_adj', 'adjusted p', 'adj p'], explanation: '多重检验校正后的显著性指标（站内为 BH/FDR）。', howToRead: '越小越显著；站内 DEG 与 ATAC 差异 peak 默认以 0.05 为阈值。', source: 'DEG 表 / ATAC 差异 peak 面板', pages: ['single_cell_detail', 'spatial_detail', 'atac_detail'] },
  { key: 'field_pval', type: 'field', appliesTo: 'DEG 表', fullName: 'p-value', chineseName: '原始 p 值', aliases: ['p_val', 'pval', 'p'], explanation: '未经多重检验校正的显著性 p 值。', howToRead: '仅供了解，判断显著性请以校正后的 padj 为准。', source: 'DEG 表', pages: ['single_cell_detail', 'spatial_detail'] },

  { key: 'field_or', type: 'field', appliesTo: '富集结果表', fullName: 'Odds ratio', chineseName: '比值比', aliases: ['Odds Ratio', 'OR', 'o'], explanation: '富集分析中命中基因的占比与背景基因占比之比。', howToRead: '大于 1 表示该通路被富集，越大富集程度越高；小于 1 表示被 depleted。', source: '富集结果表', pages: ['single_cell_detail'] },
  { key: 'field_combined', type: 'field', appliesTo: '富集结果表', fullName: 'Combined score', chineseName: '综合得分', aliases: ['Combined Score', 'combined score', 'c'], explanation: '同时考虑显著性与效应量的综合得分（由 p 值与 z 分数组合）。', howToRead: '无统一阈值，站内按从大到小排序；请与 p 值一起看，不要单独据此下结论。', source: '富集结果表', pages: ['single_cell_detail'] },
  { key: 'field_term', type: 'field', appliesTo: '富集结果表', fullName: 'Term / Pathway', chineseName: '通路 / 条目名', aliases: ['Term', 'term', 't', 'Pathway'], explanation: '被富集到的通路或基因集名称（KEGG / GO_BP）。', source: '富集结果表', pages: ['single_cell_detail'] },
  { key: 'field_genes', type: 'field', appliesTo: '富集结果表', fullName: 'Genes', chineseName: '命中基因', aliases: ['Genes', 'genes', 'g'], explanation: '该通路中实际命中（差异基因集合内）的基因列表。', howToRead: '基因数太少时通路结论要谨慎，需结合 p 值判断。', source: '富集结果表', pages: ['single_cell_detail'] },

  { key: 'field_mcp', type: 'field', appliesTo: 'GWAS/scDRS 富集表', fullName: 'Association Monte Carlo p-value', chineseName: 'scDRS 关联 p 值', aliases: ['assoc_mcp', 'mcp'], explanation: '该细胞类型/组别与 GWAS 性状关联的蒙特卡洛 p 值。', howToRead: '越小表示关联越显著，站内通常按 <0.05 判断。', source: 'GWAS/scDRS 富集表', pages: ['gwas'] },
  { key: 'field_mcz', type: 'field', appliesTo: 'GWAS/scDRS 富集表', fullName: 'Association Monte Carlo z-score', chineseName: 'scDRS 关联 z 分数', aliases: ['assoc_mcz', 'mcz'], explanation: 'scDRS 关联的标准化效应量。', howToRead: '越大表示该细胞类型与性状的关联越强。', source: 'GWAS/scDRS 富集表', pages: ['gwas'] },
  { key: 'field_hetero', type: 'field', appliesTo: 'GWAS/scDRS 富集表', fullName: 'Heterogeneity Monte Carlo p-value', chineseName: 'scDRS 异质性 p 值', aliases: ['hetero_mcp'], explanation: '检验同一组内关联是否存在异质性的 p 值。', howToRead: '显著说明关联可能由少数细胞驱动，需谨慎解读。', source: 'GWAS/scDRS 富集表', pages: ['gwas'] },
  { key: 'field_fdr', type: 'field', appliesTo: 'GWAS/scDRS 富集表', fullName: 'False discovery rate', chineseName: '错误发现率', aliases: ['FDR'], explanation: '在所有被判定为显著的结果中假阳性的期望比例。', howToRead: '站内常用 0.05 / 0.1 / 0.2 三档统计显著条目数。', source: 'GWAS/scDRS 富集表', pages: ['gwas'] },
  { key: 'field_lambda', type: 'field', appliesTo: 'GWAS 性状元数据', fullName: 'Genomic control lambda', chineseName: '基因组膨胀因子', aliases: ['Lambda GC', 'lambda gc'], explanation: '衡量 GWAS 检验统计量整体膨胀程度的指标。', howToRead: '接近 1 表示无明显群体结构或技术偏倚，明显大于 1 提示存在膨胀。', source: 'GWAS 性状元数据', pages: ['gwas'] },
  { key: 'field_sample_size', type: 'field', appliesTo: 'GWAS 性状元数据', fullName: 'Sample size', chineseName: '样本量', aliases: ['sample_size', 'n'], explanation: '该 GWAS 性状纳入分析的个体数。', howToRead: '样本量越大，检出显著信号的能力越强。', source: 'GWAS 性状元数据', pages: ['gwas'] },
  { key: 'field_ancestry', type: 'field', appliesTo: 'GWAS 性状元数据', fullName: 'Ancestry', chineseName: '人群祖先', aliases: ['ancestry'], explanation: 'GWAS 样本的人群祖先构成，如 European。', howToRead: '跨人群外推结论需谨慎。', source: 'GWAS 性状元数据', pages: ['gwas'] },

  { key: 'field_atac_log2fc', type: 'field', appliesTo: 'ATAC 差异可及性表', fullName: 'log2 fold change (accessibility)', chineseName: '可及性对数倍数变化', aliases: ['log2FC', 'log2fc', 'logFC'], explanation: '两组染色质开放程度倍数的对数值。', howToRead: '大于 0 表示第一组更开放；需与 padj 联合判断。', source: 'ATAC 差异 peak 面板', pages: ['atac_detail'] },
  { key: 'field_tfidf', type: 'field', appliesTo: 'ATAC peak 图', fullName: 'TF-IDF (log10)', chineseName: '归一化可及性', aliases: ['tfidf', 'TF-IDF'], explanation: '按细胞归一化的 peak 可及性数值，站内 peak 图颜色取 log10(tfidf)。', howToRead: '颜色越亮表示该细胞中这个 peak 越开放。', source: 'ATAC 详情页 peak 图', pages: ['atac_detail'] },
  { key: 'field_motif', type: 'field', appliesTo: 'ATAC motif 面板', fullName: 'Motif', chineseName: '转录因子结合基序', aliases: ['motif'], explanation: 'peak 中富集到的转录因子结合序列模式。', source: 'ATAC 详情页', pages: ['atac_detail'] },

  { key: 'field_spot', type: 'field', appliesTo: '空间详情页', fullName: 'Spot', chineseName: '空间位点', aliases: ['spot', 'n_spots'], explanation: '空间转录组捕获单元（Stereo-seq 的 bin）。', howToRead: '每个 spot 含若干细胞，分辨率低于单细胞但保留位置信息。', source: '空间详情页', pages: ['spatial_detail'] },
  { key: 'field_gsmap_z', type: 'field', appliesTo: '空间 GSMap 面板', fullName: 'GSMap z-score', chineseName: 'GSMap 空间 z 分数', aliases: ['gsmap', 'z-score', 'zscore'], explanation: '空间位点上 GWAS 遗传信号强度的标准化分数。', howToRead: '越大表示该空间区域的遗传关联越强。', source: '空间详情页 GSMap 面板', pages: ['spatial_detail'] },

  // ══════════════ 阈值类 threshold ══════════════
  {
    key: 'thr_padj', type: 'threshold', appliesTo: 'DEG 表 / ATAC 差异 peak', fullName: 'Adjusted p-value threshold', chineseName: '校正后 p 值判定', aliases: ['padj', 'adj.P', 'p_val_adj', 'adjusted p', 'FDR'],
    explanation: '站内 DEG 与 ATAC 差异结果默认以 padj < 0.05 判定显著。',
    howToRead: '判断显著性看 padj，不要看未校正的 p 值。',
    thresholds: [
      { level: 'very_strong', condition: 'padj < 0.001', meaning: '极显著，假阳性风险很低' },
      { level: 'strong', condition: '0.001 <= padj < 0.01', meaning: '很显著' },
      { level: 'significant', condition: '0.01 <= padj < 0.05', meaning: '通常认为显著' },
      { level: 'not_significant', condition: 'padj >= 0.05', meaning: '按站内默认阈值不认为显著' },
    ],
    source: 'DEG 表默认阈值 0.05', pages: ['single_cell_detail', 'spatial_detail', 'atac_detail'],
  },
  {
    key: 'thr_logfc', type: 'threshold', appliesTo: 'DEG 表', fullName: 'Log fold change magnitude', chineseName: '差异幅度判定', aliases: ['LogFC', 'logFC', 'log2FC', 'avg_log2FC'],
    explanation: 'logFC 表示变化幅度，需与 padj 联合判断：显著但幅度小往往生物学意义有限。',
    howToRead: '站内常用 |logFC| > 0.25 作为筛选起点。',
    thresholds: [
      { level: 'large', condition: '|logFC| >= 1', meaning: '变化幅度大（2 倍以上）' },
      { level: 'moderate', condition: '0.25 <= |logFC| < 1', meaning: '中等幅度，常用的筛选区间' },
      { level: 'small', condition: '|logFC| < 0.25', meaning: '幅度很小，即使显著也需谨慎解读' },
    ],
    source: 'DEG 表常用筛选', pages: ['single_cell_detail', 'spatial_detail'],
  },
  {
    key: 'thr_pct_diff', type: 'threshold', appliesTo: 'DEG 表', fullName: 'Pct.1 - Pct.2 difference', chineseName: '细胞类型特异性判定', aliases: ['Pct.1', 'Pct.2', 'pct1', 'pct2', 'Pct 差'],
    explanation: 'Pct.1 与 Pct.2 的差值反映该基因在第一组中的表达普遍性优势。',
    howToRead: 'Pct.1 本身接近 1 说明在该细胞类型中普遍表达；差值越大越特异。',
    thresholds: [
      { level: 'specific', condition: 'Pct.1 - Pct.2 >= 0.3', meaning: '细胞类型特异性强' },
      { level: 'moderate', condition: '0.1 <= Pct.1 - Pct.2 < 0.3', meaning: '有一定偏好' },
      { level: 'weak', condition: 'Pct.1 - Pct.2 < 0.1', meaning: '两组检出比例接近，特异性弱' },
    ],
    source: 'DEG 表 Pct.1/Pct.2 列', pages: ['single_cell_detail', 'spatial_detail'],
  },
  {
    key: 'thr_mcp', type: 'threshold', appliesTo: 'GWAS/scDRS 富集表', fullName: 'assoc_mcp threshold', chineseName: 'scDRS 关联显著性判定', aliases: ['assoc_mcp', 'mcp', 'scDRS'],
    explanation: 'scDRS 关联 p 值，越小表示细胞类型与性状关联越显著。',
    thresholds: [
      { level: 'strong', condition: 'assoc_mcp < 0.01', meaning: '关联很显著' },
      { level: 'significant', condition: '0.01 <= assoc_mcp < 0.05', meaning: '通常认为关联显著' },
      { level: 'not_significant', condition: 'assoc_mcp >= 0.05', meaning: '按常用阈值不认为显著' },
    ],
    source: 'GWAS/scDRS 富集表', pages: ['gwas'],
  },
  {
    key: 'thr_mcz', type: 'threshold', appliesTo: 'GWAS/scDRS 富集表', fullName: 'assoc_mcz magnitude', chineseName: 'scDRS 效应量判定', aliases: ['assoc_mcz', 'mcz'],
    explanation: 'scDRS 关联的标准化效应量。',
    thresholds: [
      { level: 'strong', condition: 'assoc_mcz >= 3', meaning: '效应量很强' },
      { level: 'moderate', condition: '2 <= assoc_mcz < 3', meaning: '效应量中等偏强' },
      { level: 'weak', condition: 'assoc_mcz < 2', meaning: '效应量较弱，需结合 p 值判断' },
    ],
    source: 'GWAS/scDRS 富集表', pages: ['gwas'],
  },
  {
    key: 'thr_or', type: 'threshold', appliesTo: '富集结果表', fullName: 'Odds ratio threshold', chineseName: '富集程度判定', aliases: ['Odds Ratio', 'OR', 'o'],
    explanation: '命中基因占比与背景占比之比。',
    thresholds: [
      { level: 'notable', condition: 'OR >= 2', meaning: '富集程度较明显' },
      { level: 'enriched', condition: '1 < OR < 2', meaning: '有富集但程度一般' },
      { level: 'depleted', condition: 'OR <= 1', meaning: '未富集（甚至偏低）' },
    ],
    source: '富集结果表', pages: ['single_cell_detail'],
  },
  {
    key: 'thr_combined', type: 'threshold', appliesTo: '富集结果表', fullName: 'Combined score (relative)', chineseName: '综合得分（相对参考）', aliases: ['Combined Score', 'combined score', 'c'],
    explanation: '同时考虑显著性与效应量的排序指标，站内按降序排列；无统一显著阈值。',
    howToRead: '仅作相对参考，请勿单独据此判定显著性，务必结合 p 值。',
    thresholds: [
      { level: 'high', condition: 'Combined Score >= 10', meaning: '相对靠前，值得优先查看' },
      { level: 'moderate', condition: '3 <= Combined Score < 10', meaning: '中等' },
      { level: 'low', condition: 'Combined Score < 3', meaning: '相对靠后' },
    ],
    source: '富集结果表', pages: ['single_cell_detail'],
  },
  {
    key: 'thr_atac', type: 'threshold', appliesTo: 'ATAC 差异可及性表', fullName: 'log2FC + padj combined (ATAC)', chineseName: 'ATAC 差异 peak 联合判定', aliases: ['DAP', 'log2FC', 'padj', 'ATAC'],
    explanation: 'ATAC 差异 peak 需同时看 padj 与 |log2FC|，只看其一容易误判。',
    howToRead: '先筛 padj < 0.05，再看 |log2FC| 判断幅度。',
    thresholds: [
      { level: 'strong', condition: 'padj < 0.05 且 |log2FC| >= 1', meaning: '显著且开放程度变化大' },
      { level: 'moderate', condition: 'padj < 0.05 且 0.5 <= |log2FC| < 1', meaning: '显著且变化中等' },
      { level: 'weak', condition: 'padj < 0.05 且 |log2FC| < 0.5', meaning: '显著但变化很小' },
      { level: 'not_significant', condition: 'padj >= 0.05', meaning: '不认为显著' },
    ],
    source: 'ATAC 差异 peak 面板', pages: ['atac_detail'],
  },
  {
    key: 'thr_fdr', type: 'threshold', appliesTo: 'GWAS/scDRS 富集表', fullName: 'FDR tiers', chineseName: 'FDR 分档', aliases: ['FDR', 'false discovery rate'],
    explanation: '站内统计显著条目数时使用 0.05 / 0.1 / 0.2 三档。',
    thresholds: [
      { level: 'strict', condition: 'FDR < 0.05', meaning: '严格档' },
      { level: 'medium', condition: 'FDR < 0.1', meaning: '中等档' },
      { level: 'loose', condition: 'FDR < 0.2', meaning: '宽松档' },
    ],
    source: 'GWAS/scDRS 富集表', pages: ['gwas'],
  },
  {
    key: 'thr_lambda', type: 'threshold', appliesTo: 'GWAS 性状元数据', fullName: 'Lambda GC', chineseName: '基因组膨胀因子判定', aliases: ['Lambda GC', 'lambda gc'],
    explanation: '衡量 GWAS 统计量整体膨胀程度。',
    thresholds: [
      { level: 'normal', condition: 'Lambda GC <= 1.05', meaning: '接近 1，无明显膨胀' },
      { level: 'inflated', condition: 'Lambda GC > 1.05', meaning: '存在一定膨胀，结论需谨慎' },
    ],
    source: 'GWAS 性状元数据', pages: ['gwas'],
  },
];

// 匹配顺序：精确（key/term/别名）→ 别名精确 → 包含式模糊。
// 传入 pageType 时，该页相关的条目优先排在前面。命中不到返回空数组，绝不编造。
export function searchKnowledge({ query = '', type = '', pageType = '', limit = 5 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const wantType = String(type || '').trim().toLowerCase();
  const wantPage = String(pageType || '').trim().toLowerCase();

  const scored = [];
  KNOWLEDGE_ENTRIES.forEach(entry => {
    if (wantType && String(entry.type).toLowerCase() !== wantType) return;
    const names = [entry.key, entry.fullName, entry.chineseName, ...(entry.aliases || [])]
      .filter(Boolean)
      .map(item => String(item).toLowerCase());
    let score = 0;
    if (names.some(name => name === q)) score = 100;
    else if (names.some(name => name.startsWith(q))) score = 80;
    else if (q.length >= 3 && names.some(name => name.includes(q))) score = 60;
    else if (q.length >= 4 && names.some(name => name.length >= 4 && q.includes(name))) score = 55;
    if (!score) return;

    // 与当前页面相关的条目加权，让「本页字段」排在前面。
    const pageHit = wantPage && (entry.pages || []).some(page => String(page).toLowerCase() === wantPage);
    scored.push({ ...entry, score: score + (pageHit ? 15 : 0), pageHit: Boolean(pageHit) });
  });

  scored.sort((a, b) => (b.score - a.score) || String(a.key).localeCompare(String(b.key)));
  return scored.slice(0, Math.max(1, Math.min(Number(limit) || 5, 10)));
}
