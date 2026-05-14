const { pool } = require('../db')

async function requireAuth(req, res, next) {
  try {
    const userId = Number(req.header('x-user-id'))
    if (!userId) return res.status(401).json({ ok: false, message: 'not logged in' })

    const [rows] = await pool.query(
      `
      SELECT id, username, role, avatar_url, is_banned, banned_until, deleted_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    )
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'invalid user' })

    const user = rows[0]
    if (user.deleted_at) {// 已删除的账号禁止登录
      return res.status(403).json({ ok: false, message: 'account deleted' })
    }

    const now = Date.now()
    if (Number(user.is_banned) === 1) {// 被封禁的账号禁止登录
      if (!user.banned_until || new Date(user.banned_until).getTime() > now) {
        return res.status(403).json({ ok: false, message: '账号已经被封禁' })
      }
    }

    req.user = user
    next()
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}

module.exports = { requireAuth }
