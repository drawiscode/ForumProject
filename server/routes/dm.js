const express = require('express')
const { pool } = require('../db')

const router = express.Router()

async function requireAuth(req, res, next) {
  try {
    const userId = Number(req.header('x-user-id'))
    if (!userId) return res.status(401).json({ ok: false, message: 'not logged in' })

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ? LIMIT 1', [userId])
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'invalid user' })
    req.user = rows[0]
    next()
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}

// GET /api/dm/inbox?limit=50  (我的历史私信：发给我 or 我发出的)
router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const myId = req.user.id

    const [rows] = await pool.query(
      `
      SELECT
        dm.id,
        dm.sender_id,
        dm.receiver_id,
        dm.content,
        dm.created_at,
        su.username AS sender_name,
        ru.username AS receiver_name
      FROM direct_messages dm
      JOIN users su ON su.id = dm.sender_id
      JOIN users ru ON ru.id = dm.receiver_id
      WHERE dm.sender_id = ? OR dm.receiver_id = ?
      ORDER BY dm.created_at DESC
      LIMIT ?
      `,
      [myId, myId, limit]
    )

    res.json({ ok: true, messages: rows, limit })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/dm/send { to_user_id, content }
router.post('/send', requireAuth, async (req, res) => {
  try {
    const fromId = req.user.id
    const toId = Number(req.body?.to_user_id)
    const content = String(req.body?.content || '').trim()

    if (!toId) return res.status(400).json({ ok: false, message: 'to_user_id required' })
    if (toId === fromId) return res.status(400).json({ ok: false, message: 'cannot dm yourself' })
    if (!content) return res.status(400).json({ ok: false, message: 'content required' })
    if (content.length > 1000) return res.status(400).json({ ok: false, message: 'content too long' })

    // 对方是否允许私信
    const [u] = await pool.query('SELECT id, allow_dm FROM users WHERE id = ? LIMIT 1', [toId])
    if (u.length === 0) return res.status(404).json({ ok: false, message: 'user not found' })
    if (u[0].allow_dm === 0) return res.status(403).json({ ok: false, message: 'user does not allow dm' })

    const [r] = await pool.query(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [fromId, toId, content]
    )

    res.status(201).json({ ok: true, id: r.insertId })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

module.exports = router