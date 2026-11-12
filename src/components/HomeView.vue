<template>
  <div>
    <NavigationBar />

    <main>
      <!-- ════════════════════════════════════════════════
           HERO — full-area animated canvas cell cluster
           Matches ssMOOD Homepage.html design ═════════ -->
      <section class="hero" ref="heroEl">
        <canvas ref="heroCanvas" class="hero-canvas"></canvas>
        <div class="hero-fade"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-pulse"></span>
            {{ $t('home_badge', { n: counts.datasetsFmt }) }}
          </div>
          <h1 class="hero-title">
            ss<strong>MOOD</strong>
          </h1>
          <p class="hero-sub" v-html="$t('home_hero_sub')"></p>
          <div class="hero-tagline">{{ $t('home_hero_tagline') }}</div>
          <div class="hero-actions">
            <router-link to="/browse" class="btn btn-primary">{{ $t('home_btn_browse') }} &rarr;</router-link>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════
           STATS BAR — design: icons + numbers ═══════ -->
      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-icon si-b">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="14" width="3" height="4" rx="1" fill="currentColor"/><rect x="6" y="10" width="3" height="8" rx="1" fill="currentColor" opacity=".7"/><rect x="10" y="7" width="3" height="11" rx="1" fill="currentColor"/><rect x="14" y="4" width="3" height="14" rx="1" fill="currentColor" opacity=".6"/></svg>
          </div>
          <div><div class="stat-num">{{ counts.datasetsFmt }}</div><div class="stat-label">{{ $t('home_stat_datasets') }}</div></div>
        </div>
        <div class="stat-item">
          <div class="stat-icon si-c">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="10" r="2" fill="currentColor"/><circle cx="10" cy="6" r="1.5" fill="currentColor" opacity=".7"/><circle cx="15" cy="12" r="2.5" fill="currentColor" opacity=".5"/><circle cx="8" cy="15" r="1.5" fill="currentColor" opacity=".8"/><circle cx="13" cy="4" r="1" fill="currentColor" opacity=".6"/></svg>
          </div>
          <div><div class="stat-num">{{ counts.cellsFmt }}</div><div class="stat-label">{{ $t('home_stat_cells') }}</div></div>
        </div>
        <div class="stat-item">
          <div class="stat-icon si-b">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" opacity=".5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" opacity=".5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5" opacity=".8"/></svg>
          </div>
          <div><div class="stat-num">{{ counts.spotsFmt }}</div><div class="stat-label">{{ $t('home_stat_spots') }}</div></div>
        </div>
        <div class="stat-item">
          <div class="stat-icon si-t">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 2 C10 5,14 5,14 8 C14 11,6 11,6 14 C6 17,10 17,14 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2 C10 5,6 5,6 8 C6 11,14 11,14 14 C14 17,10 17,6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/><line x1="8" y1="5.5" x2="12" y2="5.5" stroke="currentColor" stroke-width="1" opacity=".6"/><line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" stroke-width="1" opacity=".6"/><line x1="8" y1="14.5" x2="12" y2="14.5" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>
          </div>
          <div><div class="stat-num">{{ counts.genesFmt }}</div><div class="stat-label">{{ $t('home_stat_genes') }}</div></div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════
           DATA REPOSITORY CARDS ═══════════════════════ -->
      <section class="page-section" id="browse">
        <div class="sec-hd">
          <div>
            <h2 class="sec-hd-title">{{ $t('home_repo_title') }}</h2>
            <div class="sec-hd-sub">{{ $t('home_repo_sub') }}</div>
          </div>
        </div>
        <div class="sec-divider"></div>

        <div class="dtype-grid">
          <router-link :to="{ path: '/browse/singlecell', query: { species: 'human' } }" class="dtype-card">
            <div class="dtype-bar" style="background:#4a7fc1"></div>
            <div class="dtype-tag">{{ $t('home_repo_tag_sc') }}</div>
            <div class="dtype-name">{{ $t('home_repo_sc_human') }}</div>
            <div class="dtype-num" v-text="counts.scCellsHumanFmt"></div>
            <div class="dtype-sub">{{ $t('home_repo_cells') }}</div>
            <div class="dtype-arr">&rarr;</div>
          </router-link>
          <router-link :to="{ path: '/browse/singlecell', query: { species: 'mouse' } }" class="dtype-card">
            <div class="dtype-bar" style="background:#7ea8d8"></div>
            <div class="dtype-tag">{{ $t('home_repo_tag_sc') }}</div>
            <div class="dtype-name">{{ $t('home_repo_sc_mouse') }}</div>
            <div class="dtype-num" v-text="counts.scCellsMouseFmt"></div>
            <div class="dtype-sub">{{ $t('home_repo_cells') }}</div>
            <div class="dtype-arr">&rarr;</div>
          </router-link>
          <router-link :to="{ path: '/browse/spatialtranscriptome', query: { species: 'human' } }" class="dtype-card">
            <div class="dtype-bar" style="background:#5aab8a"></div>
            <div class="dtype-tag">{{ $t('home_repo_tag_st') }}</div>
            <div class="dtype-name">{{ $t('home_repo_st_human') }}</div>
            <div class="dtype-num" v-text="counts.stSpotsHumanFmt"></div>
            <div class="dtype-sub">{{ $t('home_repo_spots') }}</div>
            <div class="dtype-arr">&rarr;</div>
          </router-link>
          <router-link :to="{ path: '/browse/spatialtranscriptome', query: { species: 'mouse' } }" class="dtype-card">
            <div class="dtype-bar" style="background:#9ecbb8"></div>
            <div class="dtype-tag">{{ $t('home_repo_tag_st') }}</div>
            <div class="dtype-name">{{ $t('home_repo_st_mouse') }}</div>
            <div class="dtype-num" v-text="counts.stSpotsMouseFmt"></div>
            <div class="dtype-sub">{{ $t('home_repo_spots') }}</div>
            <div class="dtype-arr">&rarr;</div>
          </router-link>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════
           01 OVERVIEW — db intro + datasets bar chart ═ -->
      <section class="hv-section">
        <div class="hv-shell hv-grid">
          <div class="hv-copy hv-reveal">
            <span class="hv-eyebrow">01 · Overview</span>
            <h2>{{ $t('hv5') }}</h2>
            <p>{{ $t('hv6') }}</p>
          </div>
          <div class="hv-chart-card hv-reveal">
            <div class="hv-tabs">
              <button v-for="i in [3, 2, 1, 0]" :key="'bar-' + i" class="hv-tab"
                :class="{ active: currentChart === i }" @click="switchChart(i)">
                {{ $t('hv6-' + (i + 1)) }}
              </button>
            </div>
            <div id="myClusterChart" class="hv-bar-chart"></div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════
           01 COMPOSITION — species / data type donuts ═ -->
      <section class="hv-section hv-tint">
        <div class="hv-shell hv-grid-donut">
          <div class="hv-chart-card hv-reveal">
            <div id="genderChart" class="hv-donut"></div>
          </div>
          <div class="hv-chart-card hv-reveal">
            <div id="genderChart2" class="hv-donut"></div>
          </div>
          <div class="hv-copy hv-reveal">
            <span class="hv-eyebrow">02 · Composition</span>
            <h2>{{ $t('hv7') }}</h2>
            <p>{{ $t('hv8') }}</p>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════
           02 INTERACTIVE CHARTS — UMAP explorer ════════ -->
      <section class="hv-section">
        <div class="hv-shell hv-grid">
          <div class="hv-copy hv-reveal">
            <span class="hv-eyebrow">03 · Interactive Charts</span>
            <h2>{{ $t('hv9') }}</h2>
            <ul class="hv-list">
              <li>{{ $t('hv10-1') }}</li>
              <li>{{ $t('hv10-2') }}</li>
              <li>{{ $t('hv10-3') }}</li>
            </ul>
          </div>
          <div class="hv-chart-card hv-reveal">
            <div class="hv-tabs">
              <button v-for="i in [3, 2, 1, 0]" :key="'umap-' + i" class="hv-tab"
                :class="{ active: currentUmapChart === i }" @click="switchUmapChart(i)">
                {{ $t('hv6-' + (i + 1)) }}
              </button>
            </div>
            <div class="hv-umap-wrap">
              <img v-if="umapLoading" src="/loading.gif" alt="Loading" class="hv-umap-loading" />
              <div id="hv-umap-plot" class="hv-umap-plot"
                :style="{ visibility: umapLoading ? 'hidden' : 'visible' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════
           03 INTEGRATION — integrated datasets ═════════ -->
      <section class="hv-section hv-tint">
        <div class="hv-shell hv-grid">
          <div class="hv-image-card hv-reveal">
            <img src="@/assets/demo1.png" alt="Integrated datasets" />
          </div>
          <div class="hv-copy hv-reveal">
            <span class="hv-eyebrow">04 · Integration</span>
            <h2>{{ $t('hv11') }}</h2>
            <p>{{ $t('hv12') }}</p>
          </div>
        </div>
      </section>

    </main>

    <BackToTop />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import NavigationBar from './general/NavigationBar.vue'
import BackToTop from './general/BackToTop.vue'
import Plotly from 'plotly.js-dist-min'
import { getCachedHomeStats, loadHomeStats, getJson, getGzipJson } from '@/utils/api'
import colorMap from './color_map.js'

// ── Stats from backend ──────────────────────────────────
const counts = ref(getCachedHomeStats())

onMounted(async () => {
  counts.value = await loadHomeStats()
})

/* ═══════════════════════════════════════════════════════════
   01 OVERVIEW — datasets bar chart (4 groups, gzip) ═══════ */
const currentChart = ref(3)
const chartDataCache = ref([])
const renderChart_title = ['snRNA-seq Datasets(Mouse)', 'ST Datasets(Mouse)', 'snRNA-seq Datasets(Human)', 'ST Datasets(Human)']

const renderChart = (index) => {
  const data = chartDataCache.value[index]
  if (!data) return

  Plotly.newPlot('myClusterChart', [{
    x: Object.keys(data),
    y: Object.values(data),
    type: 'bar',
    marker: {
      color: 'rgba(93, 116, 162, 0.6)',
      line: { color: 'rgba(93, 116, 162, 1)', width: 1 }
    }
  }], {
    title: { text: renderChart_title[index], font: { size: 15, color: '#1a2438' } },
    margin: { l: 60, r: 20, b: 90, t: 50 },
    xaxis: { title: '', tickangle: -45, tickmode: 'linear', tickfont: { size: 8 } },
    yaxis: { title: '', showgrid: true, zeroline: true, gridcolor: 'rgba(221, 227, 238, 0.7)' },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  })
}

const switchChart = (index) => {
  currentChart.value = index
  renderChart(index)
}

onMounted(async () => {
  try {
    const data = await getGzipJson('hv_datasets.php')
    chartDataCache.value = data
    renderChart(3)
  } catch (error) {
    console.error('Error fetching datasets data:', error)
  }
})

/* ═══════════════════════════════════════════════════════════
   02 COMPOSITION — species / cells-type donut charts ══════ */
onMounted(async () => {
  try {
    const gender = await getJson('hv_gender_data.php')
    Plotly.newPlot('genderChart', [{
      labels: ['Human', 'Mouse'],
      values: [gender.human, gender.mouse],
      type: 'pie',
      marker: {
        colors: ['rgba(119, 181, 106 ,0.8)', 'rgba(232, 136, 084 ,0.8)'],
        line: { color: 'white', width: 2 }
      },
      textinfo: 'label+percent',
      hoverinfo: 'label+percent',
      hole: 0.4,
      pull: [0.05, 0]
    }], {
      title: { text: 'Species Ratio', font: { family: 'Arial, sans-serif', size: 17, color: '#1a2438' } },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 50, r: 50, b: 100, t: 60 },
      showlegend: true,
      legend: { x: 0.3, y: -0.5, orientation: 'w', bgcolor: 'rgba(0,0,0,0)', bordercolor: '#dde3ee', borderwidth: 1 }
    })
  } catch (error) {
    console.error('Error fetching gender data:', error)
  }
})

onMounted(async () => {
  try {
    const ratio = await getJson('hv_scandstRaio.php')
    Plotly.newPlot('genderChart2', [{
      labels: ['Single Cell', 'Spatial Transcriptome'],
      values: [ratio.sc_cells_sum, ratio.st_cells_sum],
      type: 'pie',
      marker: {
        colors: ['rgba(93, 116, 162 ,0.8)', 'rgba(142, 45, 48 ,0.8)'],
        line: { color: 'white', width: 2 }
      },
      textinfo: 'label+percent',
      hoverinfo: 'label+percent',
      hole: 0.4,
      pull: [0.05, 0]
    }], {
      title: { text: 'Cells Ratio', font: { family: 'Arial, sans-serif', size: 17, color: '#1a2438' } },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 50, r: 50, b: 100, t: 60 },
      showlegend: true,
      legend: { x: 0.2, y: -0.5, orientation: 'w', bgcolor: 'rgba(0,0,0,0)', bordercolor: '#dde3ee', borderwidth: 1 }
    })
  } catch (error) {
    console.error('Error fetching sc/st ratio data:', error)
  }
})

/* ═══════════════════════════════════════════════════════════
   03 INTERACTIVE CHARTS — UMAP (4 datasets, gzip) ═════════ */
const currentUmapChart = ref(3)
const umapData = ref({})
const umapLoading = ref(true)
const title_x = ['UMAP1', 'coordinate_X', 'UMAP1', 'coordinate_X']
const title_y = ['UMAP2', 'coordinate_Y', 'UMAP2', 'coordinate_Y']
const pointSize = [5, 2.5, 5, 2]

const switchUmapChart = (index) => {
  currentUmapChart.value = index
  renderUmapChart(index)
}

const renderUmapChart = (index) => {
  const data = umapData.value[index]
  if (!data) return

  const oneUmapData = data.umap
  const clusterLabels = data.cluster

  const sortedClusterLabels = [...clusterLabels].sort((a, b) => {
    const partsA = a.match(/\d+/)
    const partsB = b.match(/\d+/)
    if (partsA && partsB) {
      return parseInt(partsA[0], 10) - parseInt(partsB[0], 10)
    } else if (partsA) {
      return -1
    } else if (partsB) {
      return 1
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  })

  const colors = sortedClusterLabels.reduce((acc, label) => {
    acc[label] = colorMap[label] || '#000'
    return acc
  }, {})

  const umap1 = oneUmapData.map(d => parseFloat(d.u1))
  const umap2 = oneUmapData.map(d => parseFloat(d.u2))
  const cellIds = oneUmapData.map(d => d.i)
  const clusterLabelsData = oneUmapData.map(d => d.c)

  const traces = sortedClusterLabels.map((label) => {
    const x = umap1.filter((_, i) => clusterLabelsData[i] === label)
    const y = umap2.filter((_, i) => clusterLabelsData[i] === label)
    const text = cellIds.filter((_, i) => clusterLabelsData[i] === label)

    return {
      x,
      y,
      mode: 'markers',
      type: 'scattergl',
      name: label,
      text,
      marker: {
        size: pointSize[index],
        color: colors[label]
      }
    }
  })

  Plotly.newPlot('hv-umap-plot', traces, {
    title: '',
    showlegend: false,
    xaxis: { title: title_x[index] },
    yaxis: { title: title_y[index] },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  })
}

onMounted(async () => {
  umapLoading.value = true
  try {
    const data = await getGzipJson('hv_umap.php')
    umapData.value = {
      0: data[0], // 单细胞(鼠)
      1: data[1], // 空转(鼠)
      2: data[2], // 单细胞(人)
      3: data[3]  // 空转(人)
    }
    renderUmapChart(3)
  } catch (error) {
    console.error('Error fetching UMAP data:', error)
  } finally {
    umapLoading.value = false
  }
})

/* ═══════════════════════════════════════════════════════════
   04 SHARED — Plotly resize & scroll reveal ═══════════════ */
const resizePlots = () => {
  ['myClusterChart', 'genderChart', 'genderChart2', 'hv-umap-plot'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) Plotly.Plots.resize(el)
  })
}

let revealObserver = null
onMounted(() => {
  window.addEventListener('resize', resizePlots)
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })
  document.querySelectorAll('.hv-reveal').forEach((el) => revealObserver.observe(el))
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizePlots)
  revealObserver?.disconnect()
})

/* ═══════════════════════════════════════════════════════════
   HERO CANVAS — animated cell cluster dot plot
   Mirrors the design from ssMOOD Homepage.html ═══════════ */
const heroCanvas = ref(null)
const heroEl = ref(null)
let animId = null

/* Cell type palette (matches design) */
const CT = [
  { name: 'ExN',   color: '#4a7fc1', category: 'neuron' },
  { name: 'InN',   color: '#7ea8d8', category: 'neuron' },
  { name: 'Astro', color: '#e8825a', category: 'non-neuron' },
  { name: 'Micro', color: '#b85c5c', category: 'non-neuron' },
  { name: 'Oligo', color: '#5aab8a', category: 'non-neuron' },
  { name: 'OPC',   color: '#3a7a62', category: 'non-neuron' },
  { name: 'Endo',  color: '#a06ec2', category: 'non-neuron' },
]

const clusters = [
  { cx: .63, cy: .28, r: .11, ct: 0, n: 80 },
  { cx: .78, cy: .55, r: .09, ct: 1, n: 60 },
  { cx: .58, cy: .62, r: .10, ct: 2, n: 70 },
  { cx: .74, cy: .80, r: .08, ct: 3, n: 45 },
  { cx: .66, cy: .45, r: .08, ct: 4, n: 65 },
  { cx: .84, cy: .38, r: .07, ct: 5, n: 38 },
  { cx: .72, cy: .68, r: .06, ct: 6, n: 30 },
]

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [100, 100, 100]
}

function buildDots(W, H) {
  const dots = []
  clusters.forEach(cl => {
    const rgb = hexToRgb(CT[cl.ct].color)
    for (let i = 0; i < cl.n; i++) {
      const ang = Math.random() * Math.PI * 2
      const dist = Math.abs(Math.random() + Math.random() - 1) * cl.r
      dots.push({
        x: (cl.cx + Math.cos(ang) * dist) * W,
        y: (cl.cy + Math.sin(ang) * dist) * H,
        vx: (Math.random() - .5) * .035,
        vy: (Math.random() - .5) * .035,
        r: 1.2 + Math.random() * 2.2,
        op: .35 + Math.random() * .6,
        ph: Math.random() * Math.PI * 2,
        sp: .4 + Math.random() * .9,
        rgb,
        label: CT[cl.ct].name,
      })
    }
  })
  return dots
}

onMounted(() => {
  if (!heroCanvas.value || !heroEl.value) return
  const canvas = heroCanvas.value
  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, dots = [], t0 = null

  function resize() {
    W = canvas.width = heroEl.value.offsetWidth
    H = canvas.height = heroEl.value.offsetHeight
    dots = buildDots(W, H)
  }

  function frame(ts) {
    if (!t0) t0 = ts
    const t = (ts - t0) / 1000
    ctx.clearRect(0, 0, W, H)

    /* Grid */
    ctx.strokeStyle = 'rgba(74,100,160,0.042)'; ctx.lineWidth = 1
    for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    /* Brain outline ellipses */
    ctx.strokeStyle = 'rgba(74,100,160,0.048)'; ctx.lineWidth = 1.2
    const ox = W * .82, oy = H * .50, s = Math.min(W, H) * .36;
    [[0, 0, .40, .28, 0], [-.06, -.09, .22, .14, .3], [.08, .12, .18, .10, -.2]]
      .forEach(([x, y, rx, ry, rot]) => {
        ctx.beginPath()
        ctx.ellipse(ox + x * s, oy + y * s, rx * s, ry * s, rot, 0, Math.PI * 2)
        ctx.stroke()
      })

    /* Axis labels */
    ctx.fillStyle = 'rgba(74,100,160,0.20)'; ctx.font = '10px IBM Plex Mono, monospace'; ctx.textAlign = 'center'
    ctx.fillText('UMAP_1', W * .88, H * .95)
    ctx.save(); ctx.translate(W * .52, H * .88); ctx.rotate(-Math.PI / 2); ctx.fillText('UMAP_2', 0, 0); ctx.restore()

    /* Connection lines (within same cluster) */
    ctx.lineWidth = .5
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        if (dots[i].label !== dots[j].label) continue
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
        const dd = Math.sqrt(dx * dx + dy * dy)
        if (dd > 45) continue
        const [r, g, b] = dots[i].rgb
        ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y)
        ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - dd / 45) * .10})`
        ctx.stroke()
      }
    }

    /* Dots with glow + pulse */
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy
      if (d.x < 50) d.x = W + 50; if (d.x > W + 50) d.x = 50
      if (d.y < 30) d.y = H + 30; if (d.y > H + 30) d.y = 30

      const pulse = .8 + .2 * Math.sin(t * d.sp + d.ph)
      const [r, g, b] = d.rgb

      /* Glow */
      const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 7)
      grd.addColorStop(0, `rgba(${r},${g},${b},${d.op * .17 * pulse})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 7, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()

      /* Core dot */
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},${d.op})`
      ctx.fill()
    })

    animId = requestAnimationFrame(frame)
  }

  resize()
  window.addEventListener('resize', resize)
  animId = requestAnimationFrame(frame)

  onBeforeUnmount(() => {
    if (animId) cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  })
})
</script>

<style scoped>
@import 'css/MainStyles.css';

/* ═══════════════════════════════════════════════════════════
   HERO — full-area canvas with overlay ═══════════════════ */
.hero {
  position: relative;
  overflow: hidden;
  height: 560px;
  background: #edf1f8;
  display: flex;
  align-items: center;
  margin: 0;
}
.hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.hero-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    rgba(237, 241, 248, .98) 0%,
    rgba(237, 241, 248, .94) 35%,
    rgba(237, 241, 248, .72) 50%,
    rgba(237, 241, 248, .14) 68%,
    transparent 80%
  );
}
.hero-content {
  position: relative;
  z-index: 2;
  padding: 0 72px;
  max-width: 600px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #dde3ee;
  color: var(--ss-primary, #2563a8);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .13em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .07);
}
.badge-pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #5aab8a;
  animation: pulse 2.2s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: .6; transform: scale(1) } 50% { opacity: 1; transform: scale(1.6) } }

.hero-title {
  font-size: 60px;
  font-weight: 200;
  line-height: 1.0;
  letter-spacing: -2px;
  color: var(--ss-text, #1a2438);
  margin: 0 0 8px;
}
.hero-title strong {
  font-weight: 700;
  color: #162844;
}
.hero-title::before { display: none; }
.hero-sub {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ss-text-2, #4a6080);
  margin: 0 0 12px;
  max-width: 440px;
}
.hero-tagline {
  font-size: 12px;
  font-family: var(--ss-mono, 'IBM Plex Mono', monospace);
  color: #5aab8a;
  letter-spacing: .08em;
  margin-bottom: 30px;
  padding-left: 12px;
  border-left: 2px solid #5aab8a;
}
.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--ss-font, system-ui, sans-serif);
  font-size: 13px;
  font-weight: 500;
  padding: 10px 22px;
  border-radius: var(--ss-r-md, 8px);
  border: none;
  cursor: pointer;
  text-decoration: none;
  letter-spacing: .02em;
  transition: all .16s;
  white-space: nowrap;
}
.btn-primary { background: #2563a8; color: #fff; }
.btn-primary:hover { background: #1e5290; transform: translateY(-1px); box-shadow: 0 4px 18px rgba(37, 99, 168, .28); text-decoration: none; }
.btn-outline { background: transparent; color: #162844; border: 1.5px solid rgba(30, 48, 88, .28); }
.btn-outline:hover { background: rgba(30, 48, 88, .06); text-decoration: none; }
.btn-ghost { background: transparent; color: var(--ss-primary, #2563a8); border: none; padding: 8px 14px; }
.btn-ghost:hover { background: #eef4fb; text-decoration: none; }
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* ═══════════════════════════════════════════════════════════
   STATS BAR — matching design ════════════════════════════ */
.stats-bar {
  background: #fff;
  border-bottom: 1px solid #dde3ee;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 48px;
  border-right: 1px solid #edf0f7;
}
.stat-item:last-child { border-right: none; }
.stat-icon {
  width: 40px; height: 40px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.si-b { background: #dce8f5; color: #4a7fc1; }
.si-c { background: #faeae4; color: #e8825a; }
.si-t { background: #d8f0e8; color: #5aab8a; }
.stat-num {
  font-family: var(--ss-mono, 'IBM Plex Mono', monospace);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -.5px;
  line-height: 1.1;
}
.stat-label {
  font-size: 11px;
  color: #8496b0;
  max-width: 110px;
  line-height: 1.35;
  margin-top: 2px;
}

/* ═══════════════════════════════════════════════════════════
   DATA TYPE CARDS — 4 column grid ════════════════════════ */
.dtype-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 20px;
}
.dtype-card {
  background: #fff;
  border: 1.5px solid #dde3ee;
  border-radius: 12px;
  padding: 20px 20px 16px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
  transition: box-shadow .2s, border-color .2s;
}
.dtype-card:hover {
  border-color: #4a7fc1;
  box-shadow: 0 6px 24px rgba(37, 99, 168, .10);
  text-decoration: none;
}
.dtype-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.dtype-tag {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: #8496b0;
  margin: 6px 0 7px;
}
.dtype-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #1a2438;
  margin-bottom: 14px;
}
.dtype-num {
  font-family: var(--ss-mono, 'IBM Plex Mono', monospace);
  font-size: 22px;
  font-weight: 500;
  color: #1a2438;
  line-height: 1;
}
.dtype-sub {
  font-size: 10.5px;
  color: #8496b0;
  margin-top: 3px;
}
.dtype-arr {
  position: absolute;
  bottom: 14px; right: 16px;
  font-size: 14px;
  color: #8496b0;
  transition: color .2s, transform .2s;
}
.dtype-card:hover .dtype-arr {
  color: #2563a8;
  transform: translateX(3px);
}


/* ═══════════════════════════════════════════════════════════
   01-04 FEATURE SECTIONS — ported from ssmood01 ═══════════ */
.hv-section {
  padding: 84px 24px;
}
.hv-section.hv-tint {
  background: linear-gradient(180deg, var(--ss-bg) 0%, #eef2f9 100%);
  border-top: 1px solid var(--ss-border-soft, #dde3ee);
  border-bottom: 1px solid var(--ss-border-soft, #dde3ee);
}
.hv-shell {
  max-width: 1180px;
  margin: 0 auto;
}

/* 两栏（文 + 图） */
.hv-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 56px;
  align-items: center;
}
/* 三栏（图 + 图 + 文） */
.hv-grid-donut {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr);
  gap: 28px;
  align-items: center;
}

/* 文案块 */
.hv-eyebrow {
  display: inline-block;
  font-family: var(--ss-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ss-primary);
  background: var(--ss-primary-10);
  border: 1px solid var(--ss-primary-25);
  border-radius: 999px;
  padding: 4px 12px;
  margin-bottom: 16px;
}
.hv-copy h2 {
  font-size: 26px;
  font-weight: 700;
  color: var(--ss-text);
  letter-spacing: -0.01em;
  margin: 0 0 14px;
}
.hv-copy p {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ss-text-2);
  margin: 0;
}
.hv-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.hv-list li {
  position: relative;
  padding-left: 22px;
  margin-bottom: 14px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--ss-text-2);
}
.hv-list li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 11px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ss-primary);
  box-shadow: 0 0 0 3px var(--ss-primary-25);
}

/* 图表卡片 */
.hv-chart-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-xl);
  padding: 20px;
  box-shadow: var(--ss-shadow-md);
}
.hv-image-card {
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-xl);
  padding: 18px;
  box-shadow: var(--ss-shadow-md);
}
.hv-image-card img {
  width: 100%;
  height: auto;
  border-radius: var(--ss-r-lg);
  display: block;
}

/* 图表切换 pills */
.hv-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.hv-tab {
  appearance: none;
  border: 1px solid var(--ss-border);
  background: var(--ss-surface);
  color: var(--ss-text-2);
  font-family: var(--ss-font);
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: var(--ss-tr-fast);
  line-height: 1.5;
}
.hv-tab:hover {
  color: var(--ss-primary);
  border-color: var(--ss-primary-50);
  background: var(--ss-primary-10);
}
.hv-tab.active {
  background: var(--ss-primary);
  border-color: var(--ss-primary);
  color: #ffffff;
  box-shadow: var(--ss-shadow-primary);
}

/* 图表容器高度 */
.hv-bar-chart {
  width: 100%;
  height: 400px;
}
.hv-donut {
  width: 100%;
  height: 320px;
}

/* UMAP */
.hv-umap-wrap {
  position: relative;
  width: 100%;
}
.hv-umap-plot {
  width: 100%;
  aspect-ratio: 1 / 1;
}
.hv-umap-loading {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 60%;
  height: 60%;
  object-fit: contain;
  z-index: 1;
}

/* 浮现动画 */
.hv-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.hv-reveal.is-visible {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .hv-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* 区块响应式 */
@media (max-width: 1024px) {
  .hv-section { padding: 56px 16px; }
  .hv-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .hv-grid-donut {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .hv-grid-donut .hv-copy { order: -1; }
  .hv-copy h2 { font-size: 22px; }
}
@media (max-width: 640px) {
  .hv-grid-donut { grid-template-columns: 1fr; }
  .hv-section { padding: 44px 14px; }
  .hv-donut { height: 280px; }
}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE ══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .hero { height: auto; min-height: 420px; }
  .hero-content { padding: 32px 24px; max-width: 100%; }
  .hero-title { font-size: 36px; }
  .stat-item { padding: 16px 24px; }
  .dtype-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .dtype-grid { grid-template-columns: 1fr; }
  .stats-bar { flex-direction: column; }
  .stat-item { border-right: none; border-bottom: 1px solid #edf0f7; }
  .stat-item:last-child { border-bottom: none; }
}
</style>
