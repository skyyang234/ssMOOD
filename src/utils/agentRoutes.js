// AI 可导航的站点路由清单。
// 与 src/router/index.js 的路由表保持一致——这是「哪些链接真的能打开」的唯一数据源：
//   - 注入 Plan/Final 提示词，让模型从清单里选，而不是自己拼写路径；
//   - 编排层用它过滤掉模型仍拼错的 route，避免产生死链卡片；
//   - UI 层另有 router.resolve() 做最终精确校验（见 AiChatWidget.isSafeRoute）。
// 新增/下线页面时改这里即可，无需同步后端。

export const AGENT_ROUTE_CATALOG = [
  { path: '/', label: 'Home', note: 'Site homepage' },
  { path: '/browse', label: 'Browse hub', note: 'Entry page listing all omics types' },
  { path: '/about', label: 'About', note: 'About ssMOOD' },
  { path: '/about/download', label: 'Download', note: 'Data download instructions' },
  { path: '/about/doc/{name}', label: 'Documentation', note: 'Docs page; {name} must come from tool results' },
  { path: '/about/VisitLog', label: 'Visit log', note: 'Site visit statistics' },
  { path: '/about/ContactUs', label: 'Contact', note: 'Contact information' },
  { path: '/browse/SingleCell', label: 'Single-cell list', note: 'scRNA-seq / snRNA-seq dataset list; filterable in-page by species, sex and brain region' },
  { path: '/browse/SingleCell/{id}', label: 'Single-cell dataset', note: 'Detail page; {id} must come from tool results' },
  { path: '/browse/SpatialTranscriptome', label: 'Spatial list', note: 'Spatial transcriptome dataset list; filterable in-page by species, sex and brain region' },
  { path: '/browse/SpatialTranscriptome/{id}', label: 'Spatial dataset', note: 'Detail page; {id} must come from tool results' },
  { path: '/browse/atac', label: 'ATAC list', note: 'ATAC dataset list; filterable in-page by species, tissue and sex' },
  { path: '/browse/atac/{id}', label: 'ATAC dataset', note: 'Detail page; {id} must come from tool results' },
  { path: '/browse/gwas', label: 'GWAS list', note: 'GWAS trait list' },
  { path: '/browse/gwas/{id}', label: 'GWAS trait', note: 'Trait detail page; {id} must come from tool results' },
  { path: '/browse/singleCellStudy/{study}', label: 'Single-cell study', note: 'Study page; {study} must come from tool results' },
  { path: '/browse/stStudy/{study}', label: 'Spatial study', note: 'Study page; {study} must come from tool results' },
];

// 提示词里展示的路由清单：只给路径与用途，避免模型自由发挥。
export function renderRouteCatalogText() {
  return AGENT_ROUTE_CATALOG
    .map(item => `- ${item.path}  (${item.note})`)
    .join('\n');
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 把 /browse/SingleCell/{id} 编译成锚定正则，参数段捕获为分组。
// vue-router 默认大小写不敏感，这里同样忽略大小写。
const catalogEntries = AGENT_ROUTE_CATALOG.map(item => {
  const parts = item.path.split('/');
  const source = parts
    .map(segment => (/^\{.+\}$/.test(segment) ? '([^/]+)' : escapeRegExp(segment)))
    .join('/');
  return { pattern: new RegExp(`^${source}$`, 'i'), parts };
});

// 取出纯路径：去掉 query / hash 与结尾斜杠（根路径除外），便于比对。
export function normalizeRoutePath(route = '') {
  const raw = String(route || '').trim();
  if (!raw) return '';
  const withoutHash = raw.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (withoutQuery === '/' || withoutQuery === '') return '/';
  return withoutQuery.replace(/\/+$/, '');
}

// 纯字符串兜底校验（编排层用）：路径是否在站点路由清单里。
export function isKnownRoutePath(route = '') {
  const path = normalizeRoutePath(route);
  if (!path) return false;
  return catalogEntries.some(entry => entry.pattern.test(path));
}

// 取出路由里由模型填充的参数值（如 /browse/gwas/MDD 里的 "MDD"）。
// 路径形态合法不代表目标存在——这些 id 还必须在本次工具结果里溯源，
// 否则就是「能点开但内容为空」的假链接。
export function routeParamValues(route = '') {
  const path = normalizeRoutePath(route);
  if (!path) return [];
  for (const entry of catalogEntries) {
    const matched = path.match(entry.pattern);
    if (!matched) continue;
    const values = [];
    let group = 1;
    entry.parts.forEach(segment => {
      if (/^\{.+\}$/.test(segment)) values.push(matched[group++]);
    });
    return values.filter(Boolean);
  }
  return [];
}
