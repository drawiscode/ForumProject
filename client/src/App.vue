<template>
  <div class="app-shell">
    <!-- 樱花全屏画布，全局常驻 -->
    <canvas id="sakuraCanvas"></canvas>
    
    <Navbar />
    <main class="main">
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>


<script setup>
  import Navbar from './components/Navbar.vue'
  import { onMounted, onUnmounted } from 'vue'

  let animationId
  let cleanupFns = []

  onMounted(() => {
    const canvas = document.getElementById('sakuraCanvas')
    const ctx = canvas.getContext('2d', { alpha: true })

    let particles = []
    let mouse = { x: null, y: null }

    const onResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    cleanupFns.push(() => window.removeEventListener('resize', onResize))
    onResize()

    const onMouseMoveForSakura = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    window.addEventListener('mousemove', onMouseMoveForSakura)
    cleanupFns.push(() => window.removeEventListener('mousemove', onMouseMoveForSakura))

    // ========= 1) 樱花：更像花瓣/花朵 5瓣 =========
    function drawPetalFlower(ctx, size) {
      // 画一个“花朵”轮廓 5瓣 ,用二次贝塞尔做圆润花瓣
      ctx.beginPath()
      const petals = 5
      const r1 = 0.55 * size
      const r2 = 1.05 * size

      for (let i = 0; i < petals; i++) {
        const a = (i * 2 * Math.PI) / petals
        const ax = Math.cos(a) * r1
        const ay = Math.sin(a) * r1

        const bx = Math.cos(a + Math.PI / petals) * r2
        const by = Math.sin(a + Math.PI / petals) * r2

        const cx = Math.cos(a + (2 * Math.PI) / petals) * r1
        const cy = Math.sin(a + (2 * Math.PI) / petals) * r1

        if (i === 0) ctx.moveTo(ax, ay)
        ctx.quadraticCurveTo(bx, by, cx, cy)
      }
      ctx.closePath()
    }

    class Sakura {
      constructor() {
        this.reset(true)
      }
      reset(initial = false) {
        this.x = Math.random() * canvas.width
        this.y = initial ? Math.random() * canvas.height : -20
        this.size = Math.random() * 6 + 6 // 更大一点像花
        this.vx = Math.random() * 0.8 - 0.4
        this.vy = Math.random() * 1.2 + 0.8
        this.opacity = Math.random() * 0.35 + 0.35
        this.rot = Math.random() * Math.PI * 2
        this.rotSpeed = (Math.random() * 2 - 1) * 0.015
        this.wobble = Math.random() * 2 * Math.PI
        this.wobbleSpeed = Math.random() * 0.02 + 0.006
        this.tint = Math.random() // 0..1 颜色微差
      }
      update() {
        // 鼠标轻微“推开”效果（更柔和）
        if (mouse.x != null && mouse.y != null) {
          const dx = this.x - mouse.x
          const dy = this.y - mouse.y
          const dis = Math.hypot(dx, dy)
          if (dis < 140 && dis > 0.001) {
            const push = (140 - dis) / 140
            this.vx += (dx / dis) * 0.06 * push
            this.vy += (dy / dis) * 0.02 * push
          }
        }

        this.wobble += this.wobbleSpeed
        const drift = Math.sin(this.wobble) * 0.55

        // 阻尼，让速度别越推越快
        this.vx *= 0.985
        this.vy = Math.min(this.vy * 0.999 + 0.0008, 2.2)

        this.x += this.vx + drift
        this.y += this.vy
        this.rot += this.rotSpeed

        // 边界重置
        if (this.y > canvas.height + 30 || this.x < -60 || this.x > canvas.width + 60) {
          this.reset(false)
        }
      }
      draw() {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rot)
        ctx.globalAlpha = this.opacity

        // 花瓣渐变（浅粉 -> 深粉）
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.size * 1.2)
        const c1 = `rgba(255, 214, 229, ${0.95})`
        const c2 = `rgba(255, 156, 186, ${0.92})`
        const c3 = `rgba(255, 183, 197, ${0.92})`
        g.addColorStop(0, c1)
        g.addColorStop(0.55, this.tint > 0.5 ? c3 : c2)
        g.addColorStop(1, 'rgba(255, 140, 170, 0.85)')

        ctx.fillStyle = g
        drawPetalFlower(ctx, this.size)
        ctx.fill()

        // 花心
        ctx.globalAlpha = this.opacity * 0.85
        ctx.fillStyle = 'rgba(255, 240, 248, 0.9)'
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(1.2, this.size * 0.14), 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }
    }

    particles = []
    for (let i = 0; i < 80; i++) particles.push(new Sakura())

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.update()
        p.draw()
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()

    // ========= 2) 点击文字：随机短句，四面八方飞散 =========
    const phrases = [
      '今天也要加油',
      '你超棒',
      '慢慢来比较快',
      '愿你被温柔以待',
      '好运正在路上',
      '别焦虑，会好的',
      '保持热爱',
      '万事顺意',
      '一切都会有答案',
      '有空喝杯奶茶',
      '要开心呀',
      '别熬夜啦',
      '冲鸭',
      '爱与自由'
    ]

    const onClick = (e) => {
      const x = e.clientX
      const y = e.clientY
      const text = phrases[Math.floor(Math.random() * phrases.length)]

      // 随机方向和距离（四面八方）
      const angle = Math.random() * Math.PI * 2
      const dist = 90 + Math.random() * 140
      const dx = Math.round(Math.cos(angle) * dist)
      const dy = Math.round(Math.sin(angle) * dist * 0.9)

      const span = document.createElement('div')
      span.className = 'burstText'
      span.innerText = text
      span.style.left = `${x}px`
      span.style.top = `${y}px`
      span.style.setProperty('--dx', `${dx}px`)
      span.style.setProperty('--dy', `${dy}px`)
      span.style.setProperty('--rot', `${Math.round((Math.random() * 2 - 1) * 260)}deg`)
      document.body.appendChild(span)
      setTimeout(() => span.remove(), 2200)
    }
    document.addEventListener('click', onClick)
    cleanupFns.push(() => document.removeEventListener('click', onClick))

    // ========= 3) 鼠标拖尾：更稀疏（节流 + 距离阈值） =========
    let lastTrailT = 0
    let lastX = 0
    let lastY = 0

    const onMoveTrail = (e) => {
      const now = performance.now()
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      const dist = Math.hypot(dx, dy)

      // ✅ 限制频率 + 必须移动够远才生成
      if (now - lastTrailT < 55) return
      if (dist < 18) return

      lastTrailT = now
      lastX = e.clientX
      lastY = e.clientY

      const dot = document.createElement('div')
      dot.className = 'trail'
      dot.style.left = `${e.clientX}px`
      dot.style.top = `${e.clientY}px`
      document.body.appendChild(dot)
      setTimeout(() => dot.remove(), 900)
    }

    document.addEventListener('mousemove', onMoveTrail)
    cleanupFns.push(() => document.removeEventListener('mousemove', onMoveTrail))
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationId)
    for (const fn of cleanupFns) fn()
    cleanupFns = []
  })
</script>

<style>
  /* 全局样式 不加 scoped所有页面继承 */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .app-shell{ 
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    /* 全局渐变星空背景 所有页面通用 */
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    background-size: 400% 400%;
    animation: gradientBg 15s ease infinite;
    position: relative;
  }

  /* 樱花画布 全局置顶底层 */
  #sakuraCanvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none;
  }

  .main{
    display: flex;
    flex:1;
    padding: 18px 14px 40px;
    position: relative;
    z-index: 1; /* 内容在樱花上面 */
  }

  .content{
    flex: 1;
    display: flex;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    width: 100%;
  }

  /* 背景流动动画 */
  @keyframes gradientBg {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

    /* 点击文字飘动、模糊、消失 */
  .burstText{
    position: fixed;
    left: 0;
    top: 0;
    transform: translate(-50%,-50%);
    font-size: 20px;
    font-weight: 800;
    color: rgba(255, 196, 214, 0.95);
    text-shadow: 0 0 10px rgba(255, 102, 153, 0.45);
    pointer-events: none;
    z-index: 9999;
    
    will-change: transform, opacity, filter;
    filter: blur(0px);
    animation: burstFloat 2.2s cubic-bezier(.2,.8,.2,1) forwards;
    white-space: nowrap;
  }

  /* 鼠标拖尾：更柔和的位移 + 逐渐模糊和透明 */
  .trail{
    position: fixed;
    left: 0;
    top: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(224,179,255,0.7) 60%, rgba(255,154,158,0.25));
    transform: translate(-50%,-50%);
    pointer-events: none;
    z-index: 9998;
    will-change: transform, opacity, filter;
    filter: blur(0px);
    animation: tailFade 0.9s ease-out forwards;
  }

  /* ✅ 用 CSS 变量控制随机位移/旋转 */
  @keyframes burstFloat {
    0% {
      transform: translate(-50%,-50%) scale(1) rotate(0deg);
      opacity: 1;
      filter: blur(0px);
    }
    45% {
      transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.08) rotate(var(--rot));
      opacity: 0.92;
      filter: blur(1.3px);
    }
    100% {
      transform: translate(calc(-50% + var(--dx) * 1.18), calc(-50% + var(--dy) * 1.18)) scale(0.72) rotate(calc(var(--rot) * 1.35));
      opacity: 0;
      filter: blur(6px);
    }
  }

  /* 拖尾关键帧：轻微上移、缩小并模糊消失 */
  @keyframes tailFade {
    0%{
      opacity: 1;
      transform: translate(-50%,-50%) scale(1) translateY(0);
      filter: blur(0px);
    }
    50%{
      opacity: 0.6;
      transform: translate(-50%,-50%) scale(0.8) translateY(-8px);
      filter: blur(2px);
    }
    100%{
      opacity: 0;
      transform: translate(-50%,-50%) scale(0.2) translateY(-20px);
      filter: blur(6px);
    }
  }
</style>




