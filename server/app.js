const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const userRouter = require('./routes/user')
const postRouter = require('./routes/post')
const commentRouter = require('./routes/comment')
const boardRouter = require('./routes/board')
const dmRouter = require('./routes/dm')
const { pool }  = require('./db')


const app = express()

// 允许前端开发地址访问（开发环境：Vite 默认 5173）
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/uploads',express.static(path.join(__dirname, 'uploads')))

// 健康检查：用来验证后端是否正常、以及前端代理是否联通
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// DB 连通性测试（开发用）：GET /api/db/ping
app.get('/api/db/ping', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT 1 AS ok')
      res.json({ ok: true, rows })
    } catch (err) {
      res.status(500).json({ ok: false, message: err.message })
    }
})

// 挂载路由
app.use('/api/user', userRouter)
app.use('/api/post', postRouter)
app.use('/api/comment', commentRouter)
app.use('/api/board', boardRouter)
app.use('/api/dm', dmRouter)

// 404 兜底（避免接口找不到时前端拿到一堆默认 HTML）
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => 
{
  console.log(`API server running: http://localhost:${PORT}`)
})