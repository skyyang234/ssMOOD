// "编造数据缺失"守卫。
//
// 问题形态：工具没拿到数据（没调用 / 参数不匹配 / 调用失败），模型却写成
// 「该样本没有细胞类型注释」「没有差异基因」——把"我没拿到"说成"库里没有"。
// 这种回答伪装成诚实，用户不会重试，只会以为数据库缺数据。
//
// 做法：识别"否认句" → 自己按技能规格查一次 → 有数据就用真实结论替换/补全。
// 只在**否认句 + 没有对应成功结果**时触发，正常回答不受影响。
//
// 注意：每个技能的 payload 形状不同（有的没有 items 数组），
// 所以"有没有数据"必须逐个定义，不能用统一 items.length 判断。

const num = value => (Number.isFinite(Number(value)) ? Number(value) : 0);

// 注意：不能用裸「怎样」——"组成是怎样的"是在问值，不是问怎么操作
export const HOW_TO_ASK = /怎么(看|用|查|找|切换|打开|操作|设置)|如何(查看|使用|找到|操作)|哪里(能|可以)?(看|找)|在哪(里)?(看|找)|how\s+(to|do i|can i)\s+(view|see|find|switch|open)|where\s+(can|do)\s+i\s+(see|find)/i;
export const isHowToAsk = text => HOW_TO_ASK.test(String(text || ''));

function datasetIdOf(context = {}) {
  const fromState = String(context?.businessState?.datasetId || '').trim();
  if (fromState) return fromState;
  const referenced = Array.isArray(context?.referencedSamples) ? context.referencedSamples : [];
  return String(referenced[0]?.datasetId || '').trim();
}

function geneOf(context = {}, userMessage = '') {
  const fromState = String(context?.businessState?.selectedGene || '').trim();
  if (fromState) return fromState;
  // 正文里出现全大写基因符号时兜底取一个（MALAT1 / AQP4）
  const match = String(userMessage).match(/\b([A-Z][A-Z0-9-]{2,14})\b/);
  return match ? match[1] : '';
}

function cellTypeOf(context = {}) {
  return String(context?.businessState?.selectedCellType || '').trim();
}

// 每个技能一条规格：怎么问、怎么否认、怎么查、怎么判断有数据、怎么总结
export const DATA_CLAIMS = [
  {
    key: 'composition',
    skill: 'get_celltype_composition',
    ask: /细胞类型(的)?(组成|构成|占比)|有哪些细胞类型|各细胞类型|cell ?types?|composition/i,
    // 除了"没有注释"，还有一类是"我没有工具/拿不到"——同样是假声明（工具其实是有的）
    deny: /(没有|尚无|尚未|未能|未|无|不存在)[^。；\n]{0,12}(细胞类型)?注释|无法描述|no cell ?type annotation|cannot describe|no matching (catalog )?tool|(cannot|can't|unable to) (fetch|plot|access|retrieve)|无法(获取|绘制|查询|读取)/i,
    // 问的是"具体值"（而不是"怎么看"），回答却没列出真实类型 → 也算没答到
    valueAsk: /组成|构成|占比|比例|分布|多少|有哪些|composition|proportion|how many/i,
    names: payload => (payload?.items || []).map(item => String(item.cellType || item.cell_type || '')).filter(Boolean),
    params: context => ({ datasetId: datasetIdOf(context) }),
    // 只有这些参数缺一不可；其余（如 cellType）有就带、没有也能查
    required: ['datasetId'],
    hasData: payload => Array.isArray(payload?.items) && payload.items.length > 0,
    summarize(payload, { zh, datasetId }) {
      const items = payload.items || [];
      const total = items.reduce((sum, item) => sum + num(item.count), 0);
      const top = [...items].sort((a, b) => num(b.count) - num(a.count)).slice(0, 6);
      const head = zh
        ? `库里 ${datasetId} 实际有 ${items.length} 类细胞${total ? `、共 ${total} 个细胞` : ''}，占比最高的几类：`
        : `${datasetId} has ${items.length} cell types${total ? ` (${total} cells)` : ''}; the largest ones are:`;
      const lines = top.map(item => {
        const count = num(item.count);
        const share = total ? `${((count / total) * 100).toFixed(1)}%` : '';
        const name = item.cellType || item.cell_type || (zh ? '未命名' : 'unnamed');
        return zh
          ? `· ${name}：${count} 个细胞${share ? `（${share}）` : ''}`
          : `· ${name}: ${count} cells${share ? ` (${share})` : ''}`;
      });
      return [head, ...lines].join('\n');
    },
  },
  {
    key: 'deg',
    skill: 'get_deg_summary',
    ask: /差异(表达)?基因|DEG|differentially expressed|上调|下调/i,
    deny: /没有(找到)?(显著)?(的)?差异(表达)?基因|未(见|发现)(显著)?差异|no (significant )?(DEG|differentially expressed genes)/i,
    params: context => ({ datasetId: datasetIdOf(context), cellType: cellTypeOf(context) }),
    required: ['datasetId'],
    hasData: payload => Array.isArray(payload?.items) && payload.items.length > 0,
    summarize(payload, { zh }) {
      const items = payload.items || [];
      const contrast = String(items[0]?.contrast || items[0]?.cell_type || '').trim();
      const strongest = [...items].sort((a, b) => Math.abs(num(b.log2fc)) - Math.abs(num(a.log2fc)))[0] || {};
      const head = zh
        ? `库里实际有 ${items.length} 条差异表达记录${contrast ? `（对比：${contrast}）` : ''}。`
        : `The database returns ${items.length} DEG records${contrast ? ` (contrast: ${contrast})` : ''}.`;
      const tail = strongest.log2fc === undefined ? '' : (zh
        ? `差异倍数最大的一条：log2FC ${num(strongest.log2fc).toFixed(2)}${strongest.padj !== undefined ? `，padj ${Number(strongest.padj).toExponential(2)}` : ''}。`
        : `Largest change: log2FC ${num(strongest.log2fc).toFixed(2)}${strongest.padj !== undefined ? `, padj ${Number(strongest.padj).toExponential(2)}` : ''}.`);
      return [head, tail].filter(Boolean).join('\n');
    },
  },
  {
    key: 'expression',
    skill: 'get_gene_expression_summary',
    ask: /表达(量|水平|情况)?|expressed|expression/i,
    deny: /没有(该)?基因的表达数据|未检测到.*表达|无表达数据|not expressed|no expression data/i,
    params: (context, userMessage) => ({ datasetId: datasetIdOf(context), gene: geneOf(context, userMessage) }),
    required: ['datasetId', 'gene'],
    hasData: payload => num(payload?.nonzeroCount) > 0,
    summarize(payload, { zh }) {
      const gene = payload?.gene || '';
      const nonzero = num(payload?.nonzeroCount);
      const cells = num(payload?.cellCount);
      const stats = payload?.summaryStats || {};
      const range = stats.min !== undefined && stats.max !== undefined
        ? (zh ? `，表达范围 ${num(stats.min).toFixed(2)}–${num(stats.max).toFixed(2)}` : `, range ${num(stats.min).toFixed(2)}–${num(stats.max).toFixed(2)}`)
        : '';
      return zh
        ? `库里 ${gene} 在该样本 ${cells || '-'} 个细胞中有 ${nonzero} 个检出${range}。`
        : `${gene} is detected in ${nonzero} of ${cells || '-'} cells${range}.`;
    },
  },
  {
    key: 'atac',
    skill: 'get_atac_peak_summary',
    ask: /(差异)?(可及)?(性)?(峰|peak)|DAP|chromatin/i,
    deny: /没有.*(差异)?(可及)?峰|无差异峰|no (differential )?peaks/i,
    params: context => ({ datasetId: datasetIdOf(context) }),
    required: ['datasetId'],
    hasData: payload => num(payload?.datasetPeakRows) > 0
      || (Array.isArray(payload?.differentialPeaks) && payload.differentialPeaks.length > 0),
    summarize(payload, { zh, datasetId }) {
      const rows = num(payload?.datasetPeakRows);
      const diffs = Array.isArray(payload?.differentialPeaks) ? payload.differentialPeaks.length : 0;
      return zh
        ? `库里 ${datasetId} 有 ${rows} 条 peak 记录${diffs ? `、${diffs} 条差异可及峰` : '；差异可及峰这一项当前为空，但 peak 表本身有数据'}。`
        : `${datasetId} has ${rows} peak records${diffs ? ` and ${diffs} differential peaks` : '; the differential-peak table is empty but the peak table itself is not'}.`;
    },
  },
];

// 本轮的技能结果里是否已经有"该技能成功且确实有数据"
export function hasTurnData(toolResults = [], spec) {
  return (Array.isArray(toolResults) ? toolResults : []).some(result => (
    result?.skill === spec.skill && result?.ok && spec.hasData(result?.result)
  ));
}

// 回复里出现了哪些"数据缺失"的断言（只按问句命中的类型判断，避免误伤）
export function detectMissingClaims(reply = '', userMessage = '') {
  const text = String(reply || '');
  return DATA_CLAIMS.filter(spec => spec.ask.test(String(userMessage || '')) && spec.deny.test(text));
}

// 删掉"否认句"所在的句子：补了真实结论还留着否认句，会变成自相矛盾
export function stripDenialSentences(reply = '', specs = []) {
  const text = String(reply || '');
  if (!specs.length) return text;
  const parts = text.split(/(?<=[。！？.!?\n])/);
  const kept = parts.filter(part => !specs.some(spec => spec.deny.test(part)));
  return kept.join('').replace(/\n{3,}/g, '\n\n').trim();
}

// zh 由调用方决定（跟随正文语言，而不是站点 locale）
export function summarizeClaim(spec, payload, { zh = true, context = {} } = {}) {
  return spec.summarize(payload, { zh, datasetId: datasetIdOf(context) });
}
