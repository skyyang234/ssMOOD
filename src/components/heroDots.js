/* HERO 点云动画 — 借鉴 ssMOOD 1.0 首页 canvas 效果。
   initHeroDots(canvas, host) 返回清理函数。 */

const CT = [
  { name: 'ExN', color: '#4a7fc1' }, { name: 'InN', color: '#7ea8d8' },
  { name: 'Astro', color: '#e8825a' }, { name: 'Micro', color: '#b85c5c' },
  { name: 'Oligo', color: '#5aab8a' }, { name: 'OPC', color: '#3a7a62' },
  { name: 'Endo', color: '#a06ec2' }
]

const CLUSTERS = [
  { cx: .63, cy: .28, r: .11, ct: 0, n: 80 }, { cx: .78, cy: .55, r: .09, ct: 1, n: 60 },
  { cx: .58, cy: .62, r: .10, ct: 2, n: 70 }, { cx: .74, cy: .80, r: .08, ct: 3, n: 45 },
  { cx: .66, cy: .45, r: .08, ct: 4, n: 65 }, { cx: .84, cy: .38, r: .07, ct: 5, n: 38 },
  { cx: .72, cy: .68, r: .06, ct: 6, n: 30 }
]

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [100, 100, 100]
}

function buildDots(W, H) {
  const dots = []
  CLUSTERS.forEach((cl) => {
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
        rgb, label: CT[cl.ct].name,
      })
    }
  })
  return dots
}

export function initHeroDots(canvas, host) {
  const ctx = canvas.getContext('2d')
  let W = 0, H = 0, dots = [], t0 = null, animId = 0

  function resize() {
    W = canvas.width = host.offsetWidth
    H = canvas.height = host.offsetHeight
    dots = buildDots(W, H)
  }

  function frame(ts) {
    if (!t0) t0 = ts
    const t = (ts - t0) / 1000
    ctx.clearRect(0, 0, W, H)

    /* 网格 */
    ctx.strokeStyle = 'rgba(74,100,160,0.042)'; ctx.lineWidth = 1
    for (let x = 0; x < W; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 55) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    /* 坐标轴标注 */
    ctx.fillStyle = 'rgba(74,100,160,0.20)'; ctx.font = '10px IBM Plex Mono, monospace'; ctx.textAlign = 'center'
    ctx.fillText('UMAP_1', W * .88, H * .95)
    ctx.save(); ctx.translate(W * .52, H * .88); ctx.rotate(-Math.PI / 2); ctx.fillText('UMAP_2', 0, 0); ctx.restore()

    /* 同簇连线 */
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

    /* 发光点 + 脉冲 */
    dots.forEach((d) => {
      d.x += d.vx; d.y += d.vy
      if (d.x < 50) d.x = W + 50; if (d.x > W + 50) d.x = 50
      if (d.y < 30) d.y = H + 30; if (d.y > H + 30) d.y = 30
      const pulse = .8 + .2 * Math.sin(t * d.sp + d.ph)
      const [r, g, b] = d.rgb
      const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 7)
      grd.addColorStop(0, `rgba(${r},${g},${b},${d.op * .17 * pulse})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 7, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},${d.op})`
      ctx.fill()
    })

    animId = requestAnimationFrame(frame)
  }

  resize()
  window.addEventListener('resize', resize)
  animId = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  }
}

