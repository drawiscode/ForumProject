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
  onMounted(() => {
    const canvas = document.getElementById('sakuraCanvas')
    const ctx = canvas.getContext('2d')
    let particles = []
    let mouse = { x: null, y: null }

    function resizeCanvas() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    })

    class Sakura {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 8 + 3
        this.sx = Math.random() * 1 - 0.5
        this.sy = Math.random() * 2 + 1
        this.opacity = Math.random() * 0.5 + 0.3
        this.angle = Math.random() * 360
        this.rs = Math.random() * 2 - 1
      }
      update() {
        if (mouse.x && mouse.y) {
          const dx = mouse.x - this.x
          const dy = mouse.y - this.y
          const dis = Math.hypot(dx, dy)
          if (dis < 150) {
            this.x += dx / dis * 2
            this.y += dy / dis * 2
          }
        }
        this.x += this.sx
        this.y += this.sy
        this.angle += this.rs
        if (this.y > canvas.height) {
          this.y = -10
          this.x = Math.random() * canvas.width
        }
      }
      draw() {
        ctx.save()
        ctx.globalAlpha = this.opacity
        ctx.translate(this.x, this.y)
        ctx.rotate(this.angle * Math.PI / 180)
        ctx.fillStyle = '#ffb7c5'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(this.size/2, -this.size, this.size, 0)
        ctx.quadraticCurveTo(this.size/2, this.size, 0, 0)
        ctx.fill()
        ctx.restore()
      }
    }

    for(let i=0;i<80;i++) particles.push(new Sakura())

    function animate() {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      particles.forEach(p=>{p.update();p.draw()})
      animationId = requestAnimationFrame(animate)
    }
    animate()
  })

  onUnmounted(() => {
    cancelAnimationFrame(animationId)
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

  .content > .content{
    flex: 1;
    display: flex;
    box-sizing: border-box;
    position: relative;
    z-index: 1;
  }

  /* 背景流动动画 */
  @keyframes gradientBg {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
</style>
