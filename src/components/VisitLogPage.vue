<template>
  <div>
    <NavigationBar></NavigationBar>
    <main>
      <!-- 📌 隐私声明 -->
      <section class="page-section" style="margin-bottom: 20px;">
        <el-alert
          :title="$t('privacyTitle')"
          :description="$t('privacyText')"
          type="info"
          show-icon
          closable
        >
        </el-alert>
      </section>

      <section class="page-section">
        <el-header>
          <h2>📊 {{ $t('vl1') }}</h2>
        </el-header>

        <el-row :gutter="20" class="stat-row">
          <el-col :span="4" v-for="item in stats" :key="item.label">
            <el-card shadow="hover">
              <div>
                <div style="font-size: 16px; color: #666">{{ item.label }}</div>
                <div style="font-size: 28px; font-weight: bold">{{ item.value }}</div>
                <div v-if="item.change !== undefined" style="color: item.change >= 0 ? 'green' : 'red'">
                  {{ item.changeText }}
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-divider content-position="left">🌍 {{ $t('vl2') }}</el-divider>

        <div class="map-wrap">
          <div id="map"></div>
          <div ref="labelLayer" class="label-layer"></div>
          <div ref="hoverLabel" class="hover-label"></div>
          <div class="map-disclaimer">{{ $t('vl_disclaimer') }}</div>
        </div>

        <el-divider content-position="left">🧑‍💻 {{ $t('vl3') }}</el-divider>

        <el-table :data="visitors" stripe style="width: 100%">
          <el-table-column prop="country" :label="$t('vl4')"></el-table-column>
          <el-table-column prop="region" :label="$t('vl5')"></el-table-column>
          <el-table-column prop="browser" :label="$t('vl6')"></el-table-column>
          <el-table-column prop="os" :label="$t('vl7')"></el-table-column>
          <el-table-column prop="time" :label="$t('vl8')"></el-table-column>
        </el-table>

        <BackToTop></BackToTop>
      </section>
    </main>
  </div>
</template>



<script setup>
import BackToTop from './general/BackToTop.vue'
import NavigationBar from './general/NavigationBar.vue'
import config from '@/config'
import { useI18n } from 'vue-i18n'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { feature } from 'topojson-client'
import worldAtlas from 'world-atlas/countries-110m.json'

// Leaflet 1.9.x 已知边界问题：弹层被关闭/移除后 _map 会置为 null，
// 若此时缩放动画（zoomanim）仍回调到它，_animateZoom 读取
// this._map._latLngToNewLayerPoint 会抛出 TypeError。
// 国名标签已改为自建 DOM 层（不再使用 Tooltip），这里为仍在使用 Leaflet
// 弹层机制的访问点弹窗（Popup）保留幂等保护：无地图时安全跳过。
if (!L.Popup.prototype._ssZoomGuard) {
  const original = L.Popup.prototype._animateZoom
  L.Popup.prototype._animateZoom = function (e) {
    if (!this._map) return
    original.call(this, e)
  }
  L.Popup.prototype._ssZoomGuard = true
}

// —— 跨 180° 经线切割 ——
// 跨线多边形在平面地图上会把两端的点直线相连，填充出横贯全图的白色条带，
// 这里把这类环在 ±180° 边界切开，并让切口沿经线闭合
function hasCrossing(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    if (Math.abs(ring[i + 1][0] - ring[i][0]) > 180) return true
  }
  return false
}

function splitRing(ring) {
  if (!hasCrossing(ring)) return [ring]
  const pts = ring.slice(0, -1)
  const n = pts.length
  const segments = []
  let seg = null
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const d = b[0] - a[0]
    if (Math.abs(d) > 180) {
      // 跨线边：求与 ±180° 的交点，把环在此断开
      const bAdj = d > 180 ? b[0] - 360 : b[0] + 360
      const cross = d > 180 ? -180 : 180
      const denom = bAdj - a[0]
      // denom 为 0 时端点本身就在 ±180 边界上，交点即端点（避免 0/0 产生 NaN）
      const t = denom === 0 ? 0 : (cross - a[0]) / denom
      const lat = a[1] + t * (b[1] - a[1])
      if (!seg) seg = []
      seg.push([cross, lat])
      segments.push(seg)
      seg = [[-cross, lat]]
    } else {
      if (!seg) seg = []
      seg.push(a)
    }
  }
  if (seg && seg.length) {
    if (segments.length) segments[0] = seg.concat(segments[0])
    else segments.push(seg)
  }
  // 每段统一到同一侧经度后闭合，使切口沿 ±180° 经线而不是横贯地图
  return segments.filter(s => s.length >= 3).map(s => {
    const avgLon = s.reduce((sum, p) => sum + p[0], 0) / s.length
    const fixed = s.map(p => [
      avgLon < 0 ? (p[0] > 0 ? p[0] - 360 : p[0]) : (p[0] < 0 ? p[0] + 360 : p[0]),
      p[1]
    ])
    fixed.push(fixed[0].slice())
    return fixed
  })
}

function fixGeometry(geom) {
  if (!geom) return geom
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
  const out = []
  polys.forEach(poly => {
    const parts = splitRing(poly[0])
    const holes = poly.slice(1).filter(r => !hasCrossing(r))
    parts.forEach((ring, i) => out.push(i === 0 ? [ring, ...holes] : [ring]))
  })
  return out.length === 1
    ? { type: 'Polygon', coordinates: out[0] }
    : { type: 'MultiPolygon', coordinates: out }
}

// 单个外环的鞋带面积（单位：平方度）与质心
function ringAreaCentroid(ring) {
  let area = 0, cx = 0, cy = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    area += f
    cx += (ring[j][0] + ring[i][0]) * f
    cy += (ring[j][1] + ring[i][1]) * f
  }
  area *= 0.5
  return Math.abs(area) > 0
    ? { area: Math.abs(area), lon: cx / (6 * area), lat: cy / (6 * area) }
    : null
}

// 取国家所有多边形中面积最大的主体环（面积 + 质心）。
// 不能只看第一个多边形：Natural Earth 数据里 MultiPolygon 的第一个
// 可能是很小的岛（中国的第一个是海南岛、俄罗斯的第一个是北冰洋小岛）
function featureMain(f) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  let best = null
  polys.forEach(poly => {
    const rc = ringAreaCentroid(poly[0])
    if (rc && (!best || rc.area > best.area)) best = rc
  })
  return best
}

const { t, locale } = useI18n()

const stats = ref([])
const visitors = ref([])
const map = ref(null)
const labelLayer = ref(null)   // 常驻国名标签容器
const hoverLabel = ref(null)   // 悬停国名气泡
const labelItems = []          // 常驻标签条目：{ el, lat, lon }
let visitData = null   // 缓存原始数据

// ── 自建 DOM 标签层 ──
// 不使用 Leaflet Tooltip：其内部 _animateZoom 在「缩放动画 + 弹层关闭」时序交错时
// 会访问已被置为 null 的 _map 而崩溃（1.9.x 已知问题），自建层完全规避该路径。
const updateLabels = () => {
  const m = map.value
  if (!m || !labelLayer.value) return
  const size = m.getSize()
  labelItems.forEach(item => {
    const pt = m.latLngToContainerPoint([item.lat, item.lon])
    // 视野外（含缓冲）隐藏，避免标签贴边截断
    const visible = pt.x > -60 && pt.y > -12 && pt.x < size.x + 60 && pt.y < size.y + 12
    item.el.style.display = visible ? '' : 'none'
    if (visible) {
      item.el.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`
    }
  })
}

const placeHover = pt => {
  if (hoverLabel.value) {
    hoverLabel.value.style.transform = `translate(${pt.x}px, ${pt.y - 12}px) translate(-50%, -100%)`
  }
}

const showHover = (name, e) => {
  if (!hoverLabel.value) return
  hoverLabel.value.textContent = name
  hoverLabel.value.style.display = 'block'
  placeHover(e.containerPoint)
}

const hideHover = () => {
  if (hoverLabel.value) hoverLabel.value.style.display = 'none'
}

// 更新 stats 的函数
function updateStats(data) {
  stats.value = [
    {
      label: t('vl9'),
      value: data.stats.today,
      change: data.stats.today - data.stats.yesterday,
      changeText: `${data.stats.today - data.stats.yesterday} (${(
        (data.stats.today - data.stats.yesterday) /
        Math.max(1, data.stats.yesterday) *
        100
      ).toFixed(2)}%)`,
    },
    { label: t('vl10'), value: data.stats.yesterday },
    { label: t('vl11'), value: data.stats.last7 },
    { label: t('vl12'), value: data.stats.prev7 },
    { label: t('vl13'), value: data.stats.last30 },
    { label: t('vl14'), value: data.stats.total },
  ]
}

// 拉取数据
const fetchData = async () => {
  const res = await fetch(config.apiUrl + 'visit_dashboard.php')
  const data = await res.json()
  visitData = data   // 保存一份原始数据，方便切换语言时用

  updateStats(data)
  visitors.value = data.visitors

  data.mapPoints.forEach(p => {
    L.circleMarker([p.lat, p.lon], { radius: 3, color: 'red' })
      .bindPopup(p.label)
      .addTo(map.value)
  })
}

// ✅ 监听语言切换
watch(locale, () => {
  if (visitData) {
    updateStats(visitData)
  }
})

onMounted(async () => {
  // 矢量底图：单世界硬锁（±180°），永不露白边、永不出现重复副本
  const bounds = L.latLngBounds([-85, -180], [85, 180])

  map.value = L.map('map', {
    scrollWheelZoom: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 2,
    maxZoom: 6,
    attributionControl: false
  }).setView([20, 0], 2)

  // 国家边界矢量层（Natural Earth 110m 数据随构建打包，零外部请求，无瓦片缝隙）
  // 过滤南极洲：南极点坐标在墨卡托投影下为无穷大，会在画布上留下贯穿地图的异常横线
  const land = {
    ...worldAtlas.objects.countries,
    geometries: worldAtlas.objects.countries.geometries.filter(
      g => g.properties && g.properties.name !== 'Antarctica'
    )
  }
  const countries = feature(worldAtlas, land)
  // Natural Earth 将台湾列为独立条目，并回中国的多边形，
  // 使悬停高亮与标签整体联动
  const china = countries.features.find(f => f.properties.name === 'China')
  const twIdx = countries.features.findIndex(f => f.properties.name === 'Taiwan')
  if (china && twIdx >= 0) {
    const tw = countries.features[twIdx].geometry
    if (china.geometry.type === 'MultiPolygon' && tw) {
      if (tw.type === 'MultiPolygon') china.geometry.coordinates.push(...tw.coordinates)
      else if (tw.type === 'Polygon') china.geometry.coordinates.push(tw.coordinates)
    }
    countries.features.splice(twIdx, 1)
  }
  // 切割跨 180° 经线的多边形（俄罗斯、斐济等），避免填充出横贯地图的白色条带
  countries.features.forEach(f => {
    f.geometry = fixGeometry(f.geometry)
  })
  L.geoJSON(countries, {
    renderer: L.canvas({ padding: 0.5 }),
    style: () => ({
      color: '#ffffff',       // 白色国界线（贴近原版 CARTO light 的干净观感）
      weight: 0.8,
      fillColor: '#f5f8fb',   // 陆地（近白）
      fillOpacity: 1
    }),
    onEachFeature: (f, layer) => {
      const name = f.properties.name
      layer.on('mouseover', e => {
        layer.setStyle({ fillColor: '#dce9f7' })
        showHover(name, e)
      })
      layer.on('mousemove', e => placeHover(e.containerPoint))
      layer.on('mouseout', () => {
        layer.setStyle({ fillColor: '#f5f8fb' })
        hideHover()
      })
      // 国名标签：大国常驻显示，小国家悬停时显示（避免欧洲等密集区域标签重叠）；
      // 位置取面积最大的主体环质心（首个多边形可能是小岛，如中国是海南岛）
      const main = featureMain(f)
      if (main && main.area >= 170) {
        const el = document.createElement('span')
        el.className = 'country-label'
        el.textContent = name
        labelLayer.value.appendChild(el)
        labelItems.push({ el, lat: main.lat, lon: main.lon })
      }
    }
  }).addTo(map.value)

  // 标签层跟随地图移动/缩放重算位置；缩放动画期间先隐藏，避免过程中的错位抖动
  map.value.on('move zoom viewreset resize moveend zoomend', updateLabels)
  map.value.on('zoomanim', () => {
    if (labelLayer.value) labelLayer.value.style.opacity = '0'
  })
  map.value.on('zoomend', () => {
    if (labelLayer.value) labelLayer.value.style.opacity = '1'
  })
  updateLabels()

  await fetchData()
})

onUnmounted(() => {
  labelItems.length = 0
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>


<style scoped>
.stat-row {
  margin-bottom: 24px;
}

/* ── 世界访问地图 ── */
.map-wrap {
  position: relative;
  /* 1024px = zoom 2 的世界图幅宽度（256 × 2²），锁住后静止时恰好显示一个完整世界，不再露出循环副本 */
  width: min(80%, 1024px);
  margin: 0 auto;
  border: 1px solid var(--ss-border, #ccc);
  border-radius: 8px;
  overflow: hidden;
}
#map {
  width: 100%;
  height: 500px;
  /* 海洋色：比陆地深一档，水陆分明 */
  background: #d8e2ee;
}

/* ── 自建标签层（不依赖 Leaflet Tooltip） ── */
.label-layer {
  position: absolute;
  inset: 1px; /* 对齐 #map 内容区（抵消 wrapper 的 1px 边框） */
  overflow: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 500;
}
.label-layer :deep(.country-label) {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 10px;
  font-weight: 600;
  color: #8d99ab;
  letter-spacing: 0.4px;
  white-space: nowrap;
  will-change: transform;
  /* 白色描边保证压在陆地/海洋上都清晰可读 */
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.9), 0 0 3px rgba(255, 255, 255, 0.9);
}
/* 悬停国名气泡：跟随鼠标 */
.hover-label {
  position: absolute;
  left: 0;
  top: 0;
  display: none;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #c9cfda;
  border-radius: 4px;
  font-size: 12px;
  color: #33383f;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 1px 5px rgba(30, 40, 60, 0.15);
  z-index: 600;
}
.map-disclaimer {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(255, 255, 255, 0.85);
  padding: 4px 8px;
  font-size: 11px;
  color: #666;
  border-radius: 4px;
  pointer-events: none;
  z-index: 700;
}
</style>
