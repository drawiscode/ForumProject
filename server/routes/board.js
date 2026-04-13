const express = require('express')
const { pool } = require('../db')

const router = express.Router()

// GET /api/board/:name/posts
router.get('/:name/posts', async (req, res) => {
  try {
    const name = decodeURIComponent(String(req.params.name || '')).trim()
    if (!name) return res.status(400).json({ ok: false, message: 'board name required' })

    // 约定：全部 = 不筛选
    const isAll = name === '全部'

    const sql = `
      SELECT
        p.id,
        p.title,
        p.content,
        SUBSTRING(p.content, 1, 120) AS excerpt,
        p.category,
        p.created_at,
        p.likes_count,
        p.replies_count,
        p.views_count,
        p.favorites_count,
        u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL
        ${isAll ? '' : 'AND p.category = ?'}
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    const params = isAll ? [] : [name]
    const [rows] = await pool.query(sql, params)

    res.json({ ok: true, board: name, posts: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

module.exports = router