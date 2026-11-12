// 「图已经画出来了，正文却说没有数据」的守卫。
//
// 根因：发给 Final 的工具结果被精简过（绘图 payload 的 data/layout 体积太大），
// 模型只看到 type=plot、payload 为空，就推断"没有 UMAP 数据"，
// 于是正文写"未在已选样本中检测到可用于绘图的 UMAP 数据"，
// 而同一轮里绘图卡是真实存在的（点开就是 43 条 trace）。
// 用户看到的就是"说没有图、但其实有图"，只会觉得助手变傻了。
//
// 这里做两件事：
//   1) 给 Final 一份可读的绘图摘要（点数 / 聚类数 / 样本），而不是空 payload；
//   2) 正文若仍在否认这笔数据，用确定性话术覆盖，并留痕。

// 「画不出来 / 拿不到」这一类否认。窗口不能太宽，否则
// 「该样本没有细胞类型注释，UMAP 图仅显示聚类编号」这种正确描述会被误判。
const DENIAL = /(未|没有|无|无法|未能|不能|不支持|未找到|未检测到)[^。；\n]{0,16}(绘制|画|获取|检测到|找到|取得|拿到)[^。；\n]{0,20}(UMAP|umap|图|坐标|数据)/;
// 没有动词的直白话："这个样本没有 UMAP 数据"
const DENIAL_DATA = /(没有|无|缺少|缺)[^。；\n]{0,10}(UMAP|umap|绘图|图|坐标)[^。；\n]{0,4}(数据|坐标|文件|结果)/;
// 另一种否认方式：既然工具已经画出来了，就不该再要求用户去勾选样本
const SELECTION_DENIAL = /(没有|未|请|需要|得)[^。；\n]{0,30}(选中|勾选|勾上)[^。；\n]{0,8}(样本|数据集)/;
const DENIAL_EN = /(no\s+(?:data|plot|coordinates)|cannot|can't|unable to|could not|not available)[^.\n]{0,40}(plot|chart|figure|data|coordinates|umap)/i;
// 已经承认"有图"的表述：命中就不再判为否认（"图中灰色点表示未检测到该基因"是正常描述）
const AFFIRM = /(已生成|已绘制|已为你生成|已为您生成|如下图|见下图|上图|图中|如下所示|点击下方卡片|generated|rendered|shown below|see the plot|see the chart|is ready)/i;

export function replyContradictsPlot(reply = '') {
  const text = String(reply || '');
  if (!text) return false;
  if (AFFIRM.test(text)) return false;
  return DENIAL.test(text) || DENIAL_DATA.test(text) || SELECTION_DENIAL.test(text) || DENIAL_EN.test(text);
}

function isPlotAction(action) {
  return action?.type === 'plot' || action?.type === 'plot_card';
}

// 从绘图动作里抽一份轻量摘要：Final 只需要这些就能写出正确的一句话
export function plotActionSummary(action = {}) {
  const data = Array.isArray(action?.payload?.data) ? action.payload.data : [];
  let pointCount = 0;
  data.forEach(trace => {
    if (Array.isArray(trace?.x)) pointCount += trace.x.length;
  });
  return {
    plotType: String(action?.plotType || ''),
    title: String(action?.title || ''),
    subtitle: String(action?.subtitle || ''),
    pointCount,
    clusterCount: data.length,
    samples: (Array.isArray(action?.datasets) ? action.datasets : [])
      .map(item => item?.label || item?.datasetId || '')
      .filter(Boolean),
  };
}

export function pickPlotActions(actions = []) {
  return (Array.isArray(actions) ? actions : []).filter(isPlotAction);
}

// 图确实生成时该说的话：带上点数/聚类数，比"已生成以下内容"具体
export function plotReadyReply(actions = [], locale = 'zh') {
  const zh = String(locale || '').toLowerCase().startsWith('zh');
  const summary = plotActionSummary(pickPlotActions(actions)[0] || {});
  const title = summary.title || (zh ? '图' : 'the plot');

  if (zh) {
    const detail = [
      summary.pointCount ? `${summary.pointCount} 个细胞点` : '',
      summary.clusterCount > 1 ? `${summary.clusterCount} 个细胞聚类` : '',
    ].filter(Boolean).join('、');
    // 不写"点击下方卡片"：AI 页面里图是直接内嵌的，气泡面板里才是卡片。
    // 两种形态用"下方图表"都能读通。
    return `已生成「${title}」${detail ? `（${detail}）` : ''}，见下方图表${summary.plotType === 'umap' ? '，图中每个点代表一个细胞' : ''}。`;
  }
  const detail = [
    summary.pointCount ? `${summary.pointCount} cells` : '',
    summary.clusterCount > 1 ? `${summary.clusterCount} clusters` : '',
  ].filter(Boolean).join(', ');
  return `I generated "${title}"${detail ? ` (${detail})` : ''} — see the chart below${summary.plotType === 'umap' ? '; each point is a cell' : ''}.`;
}

// 发给 Final 的绘图动作：去掉体积巨大的坐标数组，换成**非空**摘要。
// 关键是不能留下空 payload，也不能留一个自定义布尔值了事——
// 实测模型会把空 payload 读成"没有数据"，又会忽略 plotReady 这种它不认识的字段，
// 于是回一句"当前页面没有选中任何样本，无法绘制"。
// 给它一个能直接顺着念的结构：rendered / pointCount / clusterCount / samples。
export function slimPlotActionForFinal(action = {}) {
  const summary = plotActionSummary(action);
  return {
    type: action?.type || 'plot',
    plotType: summary.plotType,
    title: summary.title,
    subtitle: summary.subtitle,
    datasets: Array.isArray(action?.datasets) ? action.datasets : [],
    label: action?.label,
    payload: {
      rendered: true,
      plotType: summary.plotType,
      pointCount: summary.pointCount,
      clusterCount: summary.clusterCount,
      samples: summary.samples,
      note: 'Already rendered on the client (coordinates omitted to save tokens).',
    },
  };
}
