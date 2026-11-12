/* ============================================================
   src/components/plotlyLayouts.js
   ============================================================
   Reusable Plotly.js layout presets matching the ssMOOD design
   system. Spread these into your existing Plotly.newPlot() calls
   — your trace data is unchanged.

   USAGE:
     import { BAR_LAYOUT, BAR_TRACE_STYLE, UMAP_LAYOUT } from './plotlyLayouts.js'

     Plotly.newPlot('myChart', traces, {
       ...BAR_LAYOUT,
       title: 'My Chart',
       xaxis: { ...BAR_LAYOUT.xaxis, title: 'Genes' },
     });
   ============================================================ */

const FONT_SANS = "'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

// ── Color palette (mirrors element-theme.css) ────────────────
export const SS_COLORS = {
  primary:    'rgb(93, 116, 162)',
  primary50:  'rgba(93, 116, 162, 0.5)',
  primary25:  'rgba(93, 116, 162, 0.25)',
  primary10:  'rgba(93, 116, 162, 0.10)',
  teal:       '#3a8a72',
  coral:      '#c0614a',
  violet:     '#6652a8',
  text:       '#1a2438',
  text2:      '#4a6080',
  text3:      '#8496b0',
  border:     '#dde3ee',
  borderSoft: '#edf0f7',
  navy:       '#162844',
  navyDeep:   '#08121e',
};

// ── Base config — used in every chart ────────────────────────
export const PLOT_BASE = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  'rgba(0,0,0,0)',
  font: {
    family: FONT_SANS,
    size: 12,
    color: SS_COLORS.text2,
  },
  margin: { l: 56, r: 24, t: 48, b: 56 },
  hoverlabel: {
    bgcolor: SS_COLORS.navy,
    bordercolor: SS_COLORS.primary,
    font: { color: '#fff', family: FONT_MONO, size: 11 },
  },
  modebar: {
    bgcolor: 'rgba(0,0,0,0)',
    color: SS_COLORS.text3,
    activecolor: SS_COLORS.primary,
  },
};

// ── Bar chart (light bg) — for cell-type / cluster bars ──────
export const BAR_LAYOUT = {
  ...PLOT_BASE,
  xaxis: {
    tickangle: -40,
    tickfont: { size: 10, family: FONT_MONO, color: SS_COLORS.text2 },
    gridcolor: SS_COLORS.borderSoft,
    linecolor: SS_COLORS.border,
    zeroline: false,
    automargin: true,
  },
  yaxis: {
    gridcolor: SS_COLORS.borderSoft,
    linecolor: SS_COLORS.border,
    zeroline: false,
    tickfont: { size: 10, family: FONT_MONO, color: SS_COLORS.text2 },
  },
  bargap: 0.3,
};

export const BAR_TRACE_STYLE = {
  marker: {
    color: SS_COLORS.primary50,
    line: { color: SS_COLORS.primary, width: 1 },
  },
};

// ── Pie / donut chart — for cell composition pies ────────────
export const PIE_LAYOUT = {
  ...PLOT_BASE,
  showlegend: true,
  legend: {
    orientation: 'h',
    y: -0.18,
    x: 0.5,
    xanchor: 'center',
    bgcolor: 'rgba(0,0,0,0)',
    font: { size: 10, family: FONT_MONO, color: SS_COLORS.text2 },
  },
  margin: { l: 24, r: 24, t: 24, b: 64 },
};

export const PIE_TRACE_DEFAULTS = {
  hole: 0.55, // donut style
  textinfo: 'percent',
  textfont: { size: 10, family: FONT_MONO },
  marker: { line: { color: '#fff', width: 2 } },
};

// ── UMAP scattergl (DARK background) ─────────────────────────
export const UMAP_LAYOUT = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor:  SS_COLORS.navyDeep,
  font: {
    family: FONT_MONO,
    size: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  showlegend: false,
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.10)',
    zeroline: false,
    showticklabels: true,
    tickfont: { size: 9, color: 'rgba(255,255,255,0.30)' },
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.05)',
    linecolor: 'rgba(255,255,255,0.10)',
    zeroline: false,
    showticklabels: true,
    tickfont: { size: 9, color: 'rgba(255,255,255,0.30)' },
  },
  margin: { l: 40, r: 12, t: 12, b: 40 },
  hoverlabel: {
    bgcolor: '#fff',
    bordercolor: SS_COLORS.primary,
    font: { color: SS_COLORS.text, family: FONT_MONO, size: 11 },
  },
};

export const UMAP_TRACE_STYLE = {
  type: 'scattergl',
  mode: 'markers',
  marker: {
    size: 4,
    opacity: 0.75,
    line: { width: 0 },
  },
};

// ── Heatmap — for DEG / gene expression matrices ─────────────
export const HEATMAP_LAYOUT = {
  ...PLOT_BASE,
  xaxis: {
    tickangle: -40,
    tickfont: { size: 9, family: FONT_MONO, color: SS_COLORS.text2 },
    automargin: true,
  },
  yaxis: {
    tickfont: { size: 9, family: FONT_MONO, color: SS_COLORS.text2 },
    automargin: true,
  },
};

// Diverging colorscale (down → mid → up) using brand colors
export const HEATMAP_COLORSCALE_DIVERGING = [
  [0.00, SS_COLORS.coral],     // down-regulated
  [0.50, '#f3f5fb'],            // neutral
  [1.00, SS_COLORS.primary],    // up-regulated
];

export const HEATMAP_COLORSCALE_SEQUENTIAL = [
  [0.00, '#f3f5fb'],
  [0.50, SS_COLORS.primary50],
  [1.00, SS_COLORS.navy],
];

// ── Volcano plot — for DEG significance scatter ──────────────
export const VOLCANO_LAYOUT = {
  ...PLOT_BASE,
  xaxis: {
    title: { text: 'log₂ Fold Change', font: { size: 11, family: FONT_MONO } },
    gridcolor: SS_COLORS.borderSoft,
    zerolinecolor: SS_COLORS.text3,
    zerolinewidth: 1,
  },
  yaxis: {
    title: { text: '−log₁₀(p-value)', font: { size: 11, family: FONT_MONO } },
    gridcolor: SS_COLORS.borderSoft,
    zeroline: false,
  },
  shapes: [
    // p < 0.05 threshold line
    { type: 'line', x0: -10, x1: 10, y0: 1.301, y1: 1.301, xref: 'x', yref: 'y',
      line: { color: SS_COLORS.text3, width: 1, dash: 'dash' } },
  ],
};

// ── Box / violin plot ────────────────────────────────────────
export const BOX_LAYOUT = {
  ...PLOT_BASE,
  xaxis: {
    tickfont: { size: 10, family: FONT_MONO, color: SS_COLORS.text2 },
    linecolor: SS_COLORS.border,
  },
  yaxis: {
    gridcolor: SS_COLORS.borderSoft,
    zeroline: false,
    tickfont: { size: 10, family: FONT_MONO, color: SS_COLORS.text2 },
  },
  boxgap: 0.3,
};

// ── Sequential colorscales (for use in trace.marker.colorscale) ──
export const SEQ_PRIMARY = [
  [0, '#f3f5fb'], [0.3, '#c8d2e8'], [0.6, SS_COLORS.primary], [1, SS_COLORS.navy]
];
export const SEQ_CORAL = [
  [0, '#fff5f1'], [0.5, '#e09080'], [1, SS_COLORS.coral]
];
export const SEQ_TEAL = [
  [0, '#f0faf5'], [0.5, '#7ac5a8'], [1, SS_COLORS.teal]
];

// ── Modebar config — disable noisy buttons ───────────────────
export const PLOT_CONFIG = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'ssmood_chart',
    scale: 2,
  },
  responsive: true,
};

// ── Convenience wrapper — Plotly.newPlot with sensible defaults ──
export function plotlyRender(elementId, traces, layoutPreset = PLOT_BASE, layoutOverrides = {}) {
  if (typeof window === 'undefined' || !window.Plotly) {
    console.warn('[plotlyLayouts] Plotly not loaded');
    return;
  }
  return window.Plotly.newPlot(
    elementId,
    traces,
    { ...layoutPreset, ...layoutOverrides },
    PLOT_CONFIG
  );
}

export default {
  SS_COLORS,
  PLOT_BASE,
  BAR_LAYOUT,
  BAR_TRACE_STYLE,
  PIE_LAYOUT,
  PIE_TRACE_DEFAULTS,
  UMAP_LAYOUT,
  UMAP_TRACE_STYLE,
  HEATMAP_LAYOUT,
  HEATMAP_COLORSCALE_DIVERGING,
  HEATMAP_COLORSCALE_SEQUENTIAL,
  VOLCANO_LAYOUT,
  BOX_LAYOUT,
  SEQ_PRIMARY,
  SEQ_CORAL,
  SEQ_TEAL,
  PLOT_CONFIG,
  plotlyRender,
};
