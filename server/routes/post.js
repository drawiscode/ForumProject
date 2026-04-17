const express = require('express')
const router = express.Router()
const { pool } = require('../db')

async function requireAuth(req, res, next) {
  try {
    const userId = Number(req.header('x-user-id'))
    if (!userId) return res.status(401).json({ ok: false, message: 'not logged in' })

    const [rows] = await pool.query(
      'SELECT id, username, role, avatar_url FROM users WHERE id = ? LIMIT 1',
      [userId]
    )
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'invalid user' })

    req.user = rows[0]
    next()
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}


// ✅ 放在 router.get('/:id') 之前
router.get('/me', requireAuth, async (req, res) => {
  try {
    const myId = req.user.id
    const [rows] = await pool.query(
      `
      SELECT id, title, category, created_at
      FROM posts
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [myId]
    )
    res.json({ ok: true, posts: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})


// GET /api/post/:id/related?limit=6
router.get('/:id/related', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid id' })

    const limit = Math.min(Number(req.query.limit) || 6, 20)

    // 先拿当前帖子的 category
    const [curRows] = await pool.query(
      'SELECT id, category FROM posts WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id]
    )
    if (curRows.length === 0) return res.status(404).json({ ok: false, message: 'post not found' })

    const category = curRows[0].category

    // 同分类最新帖子，排除自己
    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.created_at, p.likes_count, p.replies_count,
             u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        AND p.category = ?
        AND p.id <> ?
      ORDER BY p.created_at DESC
      LIMIT ?
      `,
      [category, id, limit]
    )

    res.json({ ok: true, category, posts: rows, limit })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// GET /api/post/hot?limit=5
router.get('/hot', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20)

    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.category, p.created_at, p.user_id,
             p.likes_count, p.replies_count, p.views_count, p.favorites_count,
             u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
      ORDER BY (p.likes_count * 2 + p.replies_count) DESC, p.created_at DESC
      LIMIT ?
      `,
      [limit]
    )

    res.json({ ok: true, posts: rows, limit })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})
/* GET 记得排除软删除*/ 
// GET /api/post
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.category, p.created_at, p.user_id,
              p.likes_count, p.replies_count, p.views_count, p.favorites_count,
              u.username AS author
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    res.json({ ok: true, posts: rows, limit, offset })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// GET /api/post/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid id' })

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.content, p.category, p.created_at, p.user_id,
              p.likes_count, p.replies_count, p.views_count, p.favorites_count,
              u.username AS author
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    if (rows.length === 0) return res.status(404).json({ ok: false, message: 'post not found' })
    res.json({ ok: true, post: rows[0] })//rows[0]是个对象,包括p.id,p.title等内容
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/post
router.post('/', requireAuth, async (req, res) => {
    try{
      const { title, content, category } = req.body || {}
      const t = String(title || '').trim()
      const c = String(content || '').trim()
      const cat = String(category || '').trim()

      if(!t || !c || !cat){
        return res.status(400).json({ ok: false, message: 'title/content/category required' })
      }

      const [result]  = await pool.query(
        'INSERT INTO posts (user_id, title, content, category) VALUES (?, ?, ?, ?)',
        [req.user.id, t, c, cat]
      )

      res.status(201).json({ ok: true, id: result.insertId })

    }catch(err){
      res.status(500).json({ ok: false, message: err.message })
    }

})

// DELETE /api/post/:id
router.delete('/:id', async (req, res) => {
  try{
      const id = Number(req.params.id)
      if(!id) return res.status(400).json({ ok: false, message: 'invalid id' })

      const [rows] = await pool.query(
        'SELECT id, user_id deleted_at FROM posts WHERE id = ? LIMIT 1',
        [id]
      )
      if(rows.length === 0) return res.status(404).json({ ok: false, message: 'post not found' })
      
      const post = rows[0]
      const isOwner = req.user && req.user.id === post.user_id

      if(!isOwner){
        return res.status(403).json({ ok: false, message: 'forbidden' })
      }

      await pool.query(
        'UPDATE posts SET deleted_at = NOW() WHERE id = ?',
        [id]
      )
      res.json({ ok: true, message: 'post deleted' })
  }catch(err){
      res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/like/:id',requireAuth, async(req,res)=>{
  const conn =await pool.getConnection()
  try{
    const id =Number(req.params.id)
    if(!id) return res.status(400).json({ok:false, message:'invalid id'})

    await conn.beginTransaction()

    //插入点赞关系
    try{
      await conn.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
        [id, req.user.id]
      )
    }catch(e){
      await conn.rollback()
      return res.status(409).json({ ok:false ,message:'already liked' })
    }

    await conn.query(
      'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?',
      [id]
    )

    await conn.commit()
    res.json({ok:true})
  }catch(err){
    try{ await conn.rollback() }catch{}
    res.status(500).json({ ok: false, message: err.message })
  }finally{
    conn.release()
  }
})

module.exports = router