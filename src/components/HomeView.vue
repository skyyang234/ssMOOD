<template>
  <div>
    <NavigationBar></NavigationBar>
    <main>
      <!-- ═══ ① Hero：全幅点云画布 + 标题文案 + 关键指标 ═══ -->
      <section class="hv-hero" ref="heroEl">
        <canvas ref="heroCanvas" class="hv-hero-canvas"></canvas>
        <div class="hv-hero-fade"></div>
        <div class="hv-hero-inner">
          <div class="hv-hero-content hv-reveal">
            <div class="hv-hero-badge"><span class="hv-badge-pulse"></span>{{ $t('home_badge', { n: formatNum(clusterNum) }) }}</div>
            <h1 class="hv-hero-title">ss<strong>MOOD</strong></h1>
            <p class="hv-hero-sub" v-html="$t('home_hero_sub')"></p>
            <div class="hv-hero-tagline">{{ $t('home_hero_tagline') }}</div>
            <div class="hv-hero-actions">
              <router-link to="/browse" class="hv-btn-primary">{{ $t('home_btn_browse') }} &rarr;</router-link>
            </div>
          </div>

          <div class="hv-stats">
            <div v-for="(item, index) in items" :key="index" class="hv-stat hv-reveal">
              <div class="hv-stat-icon">
                <img :src="item.image" :alt="item.alt">
              </div>
              <div class="hv-stat-info">
                <div class="hv-stat-value">{{ formatNum(item.value) }}</div>
                <div class="hv-stat-label">{{ $t(item.textKey) }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ ② 数据库介绍 + 数据集柱状图 ═══ -->
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

      <!-- ═══ ③ 数据组成 + 物种/细胞占比环形图 ═══ -->
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

      <!-- ═══ ④ 可交互式图表 + UMAP ═══ -->
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

      <!-- ═══ ⑤ 整合数据集 ═══ -->
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

      <BackToTop></BackToTop>
    </main>
  </div>
</template>

<script setup>
import Plotly from 'plotly.js-dist-min';
import pako from 'pako';
import { ref, onMounted } from 'vue';

//----------以下为一个ssmood页面需要的最基础的东西--------------
import BackToTop from './general/BackToTop.vue';
import NavigationBar from './general/NavigationBar.vue';
import config from '@/config';
//----------以上为一个ssmood页面需要的最基础的东西--------------

import colorMap from './color_map.js';
import { initHeroDots } from './heroDots.js';
/* HERO CANVAS — 动画点云（借鉴 ssMOOD 1.0 首页） */
const heroCanvas = ref(null)
const heroEl = ref(null)
//-------------------
//数字格式化（千分位）
//-------------------
const formatNum = (v) => {
  if (v === null || v === undefined || v === '') return '--'
  const n = Number(v)
  return Number.isNaN(n) ? v : n.toLocaleString('en-US')
}

//-------------------
//获取数据库基础信息
//-------------------
// 初始化数据
onMounted(async () => {
  try {
    const response = await fetch(config.apiUrl + 'hv_dbInfo.php'); // 示例 API
    const data = await response.json();
    cellNum.value = data.cellNum;
    geneNum.value = data.geneNum;
    clusterNum.value = data.clusterNum;
    spatialNum.value = data.spatialNum;
  } catch (error) {
    console.error('Error loading data:', error);
  }
});

const currentChart = ref(3); // 当前显示的图表索引
const cellNum = ref(0);
const geneNum = ref(0);
const clusterNum = ref(0);
const spatialNum = ref(0);
const items = [
  { image: require('@/assets/image1.png'), alt: 'Image 1', textKey: 'hv3', value: clusterNum },
  { image: require('@/assets/image3.png'), alt: 'Image 3', textKey: 'hv1', value: cellNum },
  { image: require('@/assets/image4.png'), alt: 'Image 4', textKey: 'hv4', value: spatialNum },
  { image: require('@/assets/image2.png'), alt: 'Image 2', textKey: 'hv2', value: geneNum }
];
// 缓存图表数据
const chartDataCache = ref([]);

const renderChart_title = ['snRNA-seq Datasets(Mouse)', 'ST Datasets(Mouse)', 'snRNA-seq Datasets(Human)', 'ST Datasets(Human)']

// 绘制图表
const renderChart = (index) => {
  const data = chartDataCache.value[index];
  if (!data) return; // 如果没有数据，直接返回

  // 提取标签和细胞数量
  const labels = Object.keys(data);
  const cellCounts = Object.values(data);

  // 创建条形图数据
  const trace = {
    x: labels,
    y: cellCounts,
    type: 'bar',
    marker: {
      color: 'rgba(93, 116, 162, 0.6)',
      line: {
        color: 'rgba(93, 116, 162, 1)',
        width: 1
      }
    }
  };

  // 创建布局
  const layout = {
    title: {
      text: renderChart_title[index],
      font: { size: 15, color: '#1a2438' }
    },
    margin: { l: 60, r: 20, b: 90, t: 50 },
    xaxis: {
      title: '',
      tickangle: -45, // 将标签旋转45度
      tickmode: 'linear', // 确保标签均匀分布
      tickfont: { size: 8 } // 调整字体大小
    },
    yaxis: {
      title: '',
      showgrid: true,
      zeroline: true,
      gridcolor: 'rgba(221, 227, 238, 0.7)'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };

  // 绘制图表
  Plotly.newPlot('myClusterChart', [trace], layout);
};

// 切换图表
const switchChart = (index) => {
  currentChart.value = index;
  renderChart(index);
};

// 加载数据
onMounted(async () => {
  try {
    const response = await fetch(config.apiUrl + 'hv_datasets.php');
    const arrayBuffer = await response.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(compressed);
    const jsonString = new TextDecoder('utf-8').decode(decompressed);
    const data = JSON.parse(jsonString);
    chartDataCache.value = data;
    renderChart(3); // 默认渲染第0张表
  } catch (error) {
    console.error('Error fetching and decompressing UMAP data:', error);
  }
});

//-------------------
//获取物种比例
//-------------------
onMounted(async () => {
  fetch(config.apiUrl + 'hv_gender_data.php')
    .then(response => response.json())
    .then(data => {
      const genderData = [{
        labels: ['Human', 'Mouse'],
        values: [data.human, data.mouse],
        type: 'pie',
        marker: {
          colors: ['rgba(119, 181, 106 ,0.8)', 'rgba(232, 136, 084 ,0.8)'],
          line: {
            color: 'white',
            width: 2
          }
        },
        textinfo: 'label+percent',
        hoverinfo: 'label+percent',
        hole: 0.4,
        pull: [0.05, 0],
      }
      ];

      const layout = {
        title: {
          text: 'Species Ratio',
          font: {
            family: 'Arial, sans-serif',
            size: 17,
            color: '#1a2438'
          }
        },
        paper_bgcolor: 'rgba(0,0,0,0)', // 设置图表背景透明
        plot_bgcolor: 'rgba(0,0,0,0)', // 设置绘图区域背景透明
        margin: {
          l: 50,
          r: 50,
          b: 100,
          t: 60
        },
        showlegend: true,
        legend: {
          x: 0.3,
          y: -0.5, // 将图例放在下方中间
          orientation: 'w', // 图例水平排列
          bgcolor: 'rgba(0,0,0,0)',
          bordercolor: '#dde3ee',
          borderwidth: 1
        }
      };

      Plotly.newPlot('genderChart', genderData, layout);
    })
    .catch(error => console.error('Error fetching gender data:', error));
});
//-------------------
//获取单细胞和空转比例
//-------------------
onMounted(async () => {
  fetch(config.apiUrl + 'hv_scandstRaio.php')
    .then(response => response.json())
    .then(data => {
      const genderData = [{
        labels: ['Single Cell', 'Spatial Transcriptome'],
        values: [data.sc_cells_sum, data.st_cells_sum],
        type: 'pie',
        marker: {
          colors: ['rgba(93, 116, 162 ,0.8)', 'rgba(142, 45, 48 ,0.8)'],
          line: {
            color: 'white',
            width: 2
          }
        },
        textinfo: 'label+percent',
        hoverinfo: 'label+percent',
        hole: 0.4,
        pull: [0.05, 0],
      }
      ];

      const layout = {
        title: {
          text: 'Cells Ratio',
          font: {
            family: 'Arial, sans-serif',
            size: 17,
            color: '#1a2438'
          }
        },
        paper_bgcolor: 'rgba(0,0,0,0)', // 设置图表背景透明
        plot_bgcolor: 'rgba(0,0,0,0)', // 设置绘图区域背景透明
        margin: {
          l: 50,
          r: 50,
          b: 100,
          t: 60
        },
        showlegend: true,
        legend: {
          x: 0.2,
          y: -0.5, // 将图例放在下方中间
          orientation: 'w', // 图例水平排列
          bgcolor: 'rgba(0,0,0,0)',
          bordercolor: '#dde3ee',
          borderwidth: 1
        }
      };

      Plotly.newPlot('genderChart2', genderData, layout);
    })
    .catch(error => console.error('Error fetching gender data:', error));
});
//------------------------
//获取单细胞和空转的umap
//------------------------

const currentUmapChart = ref(3); // 默认显示第0张表
const umapData = ref({}); // 存储4张表的数据
const title_x = ["UMAP1", "coordinate_X", "UMAP1", "coordinate_X"];
const title_y = ["UMAP2", "coordinate_Y", "UMAP2", "coordinate_Y"];

const pointSize = [5, 2.5, 5, 2]

// 切换UMAP图表
const switchUmapChart = (index) => {
  currentUmapChart.value = index;
  renderUmapChart(index);
};

// 渲染UMAP图表
const renderUmapChart = (index) => {
  const data = umapData.value[index];
  if (!data) return;

  const oneUmapData = data.umap;
  const clusterLabels = data.cluster;

  const sortedClusterLabels = [...clusterLabels].sort((a, b) => {
    const partsA = a.match(/\d+/);
    const partsB = b.match(/\d+/);
    if (partsA && partsB) {
      // 如果两个字符串都包含数字，则按数字排序
      return parseInt(partsA[0], 10) - parseInt(partsB[0], 10);
    } else if (partsA) {
      // 如果只有 a 包含数字，则 a 排在 b 前面
      return -1;
    } else if (partsB) {
      // 如果只有 b 包含数字，则 b 排在 a 前面
      return 1;
    } else {
      // 如果两个字符串都不包含数字，则按字母顺序排序
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }
  });

  const colors = sortedClusterLabels.reduce((acc, label) => {
    acc[label] = colorMap[label] || '#000'; // 如果没有找到对应的颜色，则使用默认颜色 #000
    return acc;
  }, {});

  const umap1 = oneUmapData.map(d => parseFloat(d.u1));
  const umap2 = oneUmapData.map(d => parseFloat(d.u2));
  const cellIds = oneUmapData.map(d => d.i);
  const clusterLabelsData = oneUmapData.map(d => d.c);

  const traces = sortedClusterLabels.map((label) => {
    const x = umap1.filter((_, i) => clusterLabelsData[i] === label);
    const y = umap2.filter((_, i) => clusterLabelsData[i] === label);
    const text = cellIds.filter((_, i) => clusterLabelsData[i] === label);

    return {
      x: x,
      y: y,
      mode: 'markers',
      type: 'scattergl',
      name: label,
      text: text,
      marker: {
        size: pointSize[index],
        color: colors[label]
      }
    };
  });

  const layout = {
    title: '',
    showlegend: false,
    xaxis: {
      title: title_x[index]
    },
    yaxis: {
      title: title_y[index]
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };

  Plotly.newPlot('hv-umap-plot', traces, layout);
};
const umapLoading = ref(true)
// 加载数据
onMounted(async () => {
  umapLoading.value = true
  try {
    const response = await fetch(config.apiUrl + 'hv_umap.php');
    const arrayBuffer = await response.arrayBuffer();
    const compressed = new Uint8Array(arrayBuffer);
    const decompressed = pako.ungzip(compressed);
    const jsonString = new TextDecoder('utf-8').decode(decompressed);
    const data = JSON.parse(jsonString);

    umapData.value = {
      0: data[0], // 单细胞(鼠)
      1: data[1], // 空转(鼠)
      2: data[2], // 单细胞(人)
      3: data[3]  // 空转(人)
    };

    renderUmapChart(3); // 默认渲染第0张表
    umapLoading.value = false
  } catch (error) {
    console.error('Error fetching and decompressing UMAP data:', error);
  }
});

//------
//窗口缩放时重绘图表
//------
onMounted(() => {
  window.addEventListener('resize', resizeMyChart);
});

/* 启动 HERO 点云动画 */
let stopHeroDots = null;
onMounted(() => {
  if (heroCanvas.value && heroEl.value) {
    stopHeroDots = initHeroDots(heroCanvas.value, heroEl.value);
  }
});
const resizeMyChart = () => {
  ['myClusterChart', 'genderChart', 'genderChart2', 'hv-umap-plot'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) Plotly.Plots.resize(el);
  });
};

//------------------------
//滚动进入视口时的浮现动画
//------------------------
let revealObserver = null;
onMounted(() => {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.hv-reveal').forEach((el) => revealObserver.observe(el));
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
  stopHeroDots?.();
  window.removeEventListener('resize', resizeMyChart);
  revealObserver?.disconnect();
});
</script>

<style scoped>
@import 'css/MainStyles.css';

/* ============================================================
   首页 2.0 样式 — 基于设计令牌 (src/styles/element-theme.css)
   ============================================================ */

/* ── ① Hero ── */
.hv-hero {
  position: relative;
  overflow: hidden;
  height: 560px;
  background: #edf1f8;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--ss-border-soft);
}
.hv-hero-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  padding: 0 72px;
  max-width: 1240px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 30px;
}
.hv-hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.hv-hero-fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg,
    rgba(237, 241, 248, .98) 0%,
    rgba(237, 241, 248, .94) 35%,
    rgba(237, 241, 248, .72) 50%,
    rgba(237, 241, 248, .14) 68%,
    transparent 80%);
}
.hv-hero-content {
  max-width: 600px;
  padding: 24px 0;
}
.hv-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #dde3ee;
  color: var(--ss-primary);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .13em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .07);
}
.hv-badge-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5aab8a;
  animation: hvPulse 2.2s ease-in-out infinite;
}
@keyframes hvPulse {
  0%, 100% { opacity: .6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.6); }
}
.hv-hero-title {
  font-size: 60px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -2px;
  color: var(--ss-text);
  margin: 0 0 10px;
}
.hv-hero-title strong {
  font-weight: 700;
  color: #162844;
}
.hv-hero-sub {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ss-text-2);
  margin: 0 0 12px;
  max-width: 460px;
}
.hv-hero-tagline {
  font-size: 12px;
  font-family: var(--ss-mono);
  color: #3f8f70;
  letter-spacing: .06em;
  margin-bottom: 28px;
  padding-left: 12px;
  border-left: 2px solid #5aab8a;
}
.hv-hero-actions {
  display: flex;
  gap: 12px;
}
.hv-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--ss-primary);
  padding: 11px 24px;
  border-radius: var(--ss-r-md);
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(37, 99, 168, .22);
  transition: transform .18s ease, box-shadow .18s ease;
}
.hv-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(37, 99, 168, .28);
}

/* 关键指标条 */
.hv-stats {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.hv-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--ss-surface);
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-r-lg);
  padding: 16px 18px;
  box-shadow: var(--ss-shadow-sm);
  transition: var(--ss-tr-md);
}
.hv-stat:hover {
  box-shadow: var(--ss-shadow-md);
  transform: translateY(-2px);
  border-color: var(--ss-primary-50);
}
.hv-stat-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ss-primary-10);
  border-radius: var(--ss-r-md);
}
.hv-stat-icon img {
  max-width: 30px;
  max-height: 30px;
}
.hv-stat-value {
  font-family: var(--ss-mono);
  font-size: 21px;
  font-weight: 600;
  color: var(--ss-text);
  line-height: 1.2;
  white-space: nowrap;
}
.hv-stat-label {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ss-text-2);
  line-height: 1.4;
}

/* ── 通用 section ── */
.hv-section {
  padding: 84px 24px;
}
.hv-section.hv-tint {
  background: linear-gradient(180deg, var(--ss-bg) 0%, #eef2f9 100%);
  border-top: 1px solid var(--ss-border-soft);
  border-bottom: 1px solid var(--ss-border-soft);
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

/* ── 文案块 ── */
.hv-copy .hv-eyebrow {
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

/* ── 图表卡片 ── */
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

/* ── 图表切换 pills ── */
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

/* 图表容器高度（Plotly 需要确定高度） */
.hv-bar-chart {
  width: 100%;
  height: 400px;
}
.hv-donut {
  width: 100%;
  height: 320px;
}

/* ── UMAP ── */
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

/* ── 浮现动画 ── */
.hv-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.hv-reveal.is-visible {
  opacity: 1;
  transform: none;
}
/* 尊重系统"减少动态效果"设置 */
@media (prefers-reduced-motion: reduce) {
  .hv-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 1024px) {
  .hv-section { padding: 56px 16px; }
  .hv-hero { height: auto; min-height: 480px; }
  .hv-hero-inner { padding: 40px 24px; }
  .hv-hero-title { font-size: 44px; }
  .hv-hero-content { max-width: 100%; }
  .hv-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .hv-grid-donut {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  /* 数据组成：文案在窄屏时排到最前，先读文字再看图 */
  .hv-grid-donut .hv-copy { order: -1; }
  .hv-copy h2 { font-size: 22px; }
}
@media (max-width: 640px) {
  .hv-stats {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .hv-stat { padding: 12px 14px; }
  .hv-stat-value { font-size: 17px; }
  .hv-stat-label { font-size: 11px; }
  .hv-grid-donut { grid-template-columns: 1fr; }
  .hv-section { padding: 44px 14px; }
  .hv-bar-chart { height: 320px; }
  .hv-donut { height: 280px; }
  .hv-hero { min-height: 0; }
  .hv-hero-inner { padding: 32px 18px; gap: 22px; }
  .hv-hero-title { font-size: 34px; letter-spacing: -1px; }
  .hv-hero-sub { font-size: 13px; }
  .hv-hero-fade {
    background: linear-gradient(180deg,
      rgba(237, 241, 248, .96) 0%,
      rgba(237, 241, 248, .9) 55%,
      rgba(237, 241, 248, .75) 100%);
  }
}
</style>
