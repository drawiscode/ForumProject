const express = require('express')
const bcrypt = require('bcryptjs')
const { pool } = require('../db')
const { requireAdmin, requirePermission, logAdminAction } = require('../middleware/admin')

const router = express.Router()

function pickLimit(v, max = 50) {
  return Math.min(Number(v) || 20, max)
}

function isSuper(req) {
  return Boolean(req.admin && req.admin.isSuper)
}

const DEFAULT_BAN_REASON = '账号因违反社区规范已被禁用，如有疑问可提交解除禁用申请。'

async function ensureBanAppealsTable() {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS user_unban_appeals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      message VARCHAR(500) NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      handled_by BIGINT UNSIGNED NULL,
      handled_note VARCHAR(300) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      handled_at DATETIME NULL,
      CONSTRAINT fk_unban_appeals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_unban_appeals_admin FOREIGN KEY (handled_by) REFERENCES admin_users(id) ON DELETE SET NULL,
      INDEX idx_unban_appeals_user (user_id),
      INDEX idx_unban_appeals_status (status)
    ) ENGINE=InnoDB
    `
  )
}

async function getAdminRecordByUserId(userId) {
  const [rows] = await pool.query(
    `
    SELECT a.id AS admin_id, a.user_id, a.is_active, r.role_key
    FROM admin_users a
    JOIN admin_roles r ON r.id = a.role_id
    WHERE a.user_id = ?
    LIMIT 1
    `,
    [userId]
  )
  return rows[0]
}

async function ensureNotSuperTarget(req, res, targetUserId) {
  const admin = await getAdminRecordByUserId(targetUserId)
  if (admin && admin.role_key === 'super') {
    res.status(403).json({ ok: false, message: 'cannot operate super admin' })
    return false
  }
  return true
}

// ============ Init Super Admin ============
// POST /api/admin/init
// headers: x-init-secret
router.post('/init', async (req, res) => {
  try {
    const secret = String(req.header('x-init-secret') || '')
    if (!secret || secret !== String(process.env.INIT_ADMIN_SECRET || '')) {// 初始化密钥错误
      return res.status(403).json({ ok: false, message: 'invalid secret' })
    }

    const [exists] = await pool.query(
      `
      SELECT a.id
      FROM admin_users a
      JOIN admin_roles r ON r.id = a.role_id
      WHERE r.role_key = 'super'
      LIMIT 1
      `
    )
    if (exists.length > 0) {// 已存在超级管理员
      return res.status(409).json({ ok: false, message: 'super admin already exists' })
    }

    const { user_id, username, email, password } = req.body || {}

    let userId = Number(user_id) || 0
    if (!userId) {
      const u = String(username || '').trim()
      const e = String(email || '').trim().toLowerCase()
      const p = String(password || '')
      if (!u || !e || p.length < 6) {
        return res.status(400).json({ ok: false, message: 'username/email/password required' })
      }

      const [existsUser] = await pool.query(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [u, e]
      )
      if (existsUser.length > 0) {// 用户名或邮箱已存在
        return res.status(409).json({ ok: false, message: 'user already exists' })
      }

      const hash = await bcrypt.hash(p, 10)
      const [ins] = await pool.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [u, e, hash, 'admin']
      )
      userId = ins.insertId
    }

    const [roleRows] = await pool.query(
      'SELECT id FROM admin_roles WHERE role_key = ? LIMIT 1',
      ['super']
    )
    if (roleRows.length === 0) {
      return res.status(500).json({ ok: false, message: 'admin role not initialized' })
    }

    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      ['admin', userId]
    )

    await pool.query(
      'INSERT INTO admin_users (user_id, role_id, is_active) VALUES (?, ?, 1)',
      [userId, roleRows[0].id]
    )

    return res.json({ ok: true, user_id: userId })
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Admin Profile ============
router.get('/me', requireAdmin(), async (req, res) => {
  res.json({
    ok: true,
    admin: {
      id: req.admin.id,
      role_key: req.admin.roleKey,
      role_name: req.admin.roleName,
      permissions: req.admin.permissions,
      is_super: req.admin.isSuper
    },
    user: req.user
  })
})

router.post('/me/password', requireAdmin(), async (req, res) => {
  try {
    const oldPassword = String(req.body?.old_password || '')
    const newPassword = String(req.body?.new_password || '')
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: 'old/new password required' })
    }

    const [rows] = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ ok: false, message: 'user not found' })

    const match = await bcrypt.compare(oldPassword, rows[0].password_hash)
    if (!match) return res.status(400).json({ ok: false, message: 'old password incorrect' })

    const newHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'admin.password.change',
      targetType: 'admin_user',
      targetId: req.admin.id,
      detail: 'change own password',
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/me/logs', requireAdmin(), async (req, res) => {
  try {
    const limit = pickLimit(req.query.limit, 200)
    const [rows] = await pool.query(
      'SELECT id, action, target_type, target_id, detail, ip, created_at FROM admin_action_logs WHERE admin_user_id = ? ORDER BY id DESC LIMIT ?',
      [req.admin.id, limit]
    )
    res.json({ ok: true, logs: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Users ============
router.get('/users', requireAdmin(), requirePermission('user.view'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const limit = pickLimit(req.query.limit)

    const [rows] = await pool.query(
      `
      SELECT id, username, email, role, is_banned, banned_until, banned_reason, deleted_at, created_at
      FROM users
      WHERE (username LIKE ? OR email LIKE ?)
      ORDER BY id DESC
      LIMIT ?
      `,
      [`%${q}%`, `%${q}%`, limit]
    )
    res.json({ ok: true, users: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/users/:id/ban', requireAdmin(), requirePermission('user.ban'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const reason = String(req.body?.reason || '').trim()
    const days = Number(req.body?.days || 0)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid user id' })

    if (isSuper(req) && id === Number(req.user.id)) {
      return res.status(403).json({ ok: false, message: 'super admin cannot ban self' })
    }

    if (!isSuper(req)) {
      const ok = await ensureNotSuperTarget(req, res, id)
      if (!ok) return

      const adminTarget = await getAdminRecordByUserId(id)
      if (adminTarget) {
        return res.status(403).json({ ok: false, message: 'cannot operate admin account' })
      }
    }

    const finalReason = reason || DEFAULT_BAN_REASON
    const bannedUntil = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null
    await pool.query(
      'UPDATE users SET is_banned = 1, banned_until = ?, banned_reason = ? WHERE id = ?',
      [bannedUntil, finalReason, id]
    )

    await pool.query(
      'INSERT INTO user_violation_logs (user_id, admin_user_id, action, reason) VALUES (?, ?, ?, ?)',
      [id, req.admin.id, 'ban', finalReason]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'user.ban',
      targetType: 'user',
      targetId: id,
      detail: finalReason,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/users/:id/unban', requireAdmin(), requirePermission('user.ban'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid user id' })

    if (isSuper(req) && id === Number(req.user.id)) {
      return res.status(403).json({ ok: false, message: 'super admin cannot unban self' })
    }

    await ensureBanAppealsTable()

    await pool.query(
      'UPDATE users SET is_banned = 0, banned_until = NULL, banned_reason = NULL WHERE id = ?',
      [id]
    )

    await pool.query(
      `
      UPDATE user_unban_appeals
      SET status = 'approved', handled_by = ?, handled_note = ?, handled_at = NOW()
      WHERE user_id = ? AND status = 'pending'
      `,
      [req.admin.id, '管理员已解除禁用', id]
    )

    await pool.query(
      'INSERT INTO user_violation_logs (user_id, admin_user_id, action, reason) VALUES (?, ?, ?, ?)',
      [id, req.admin.id, 'unban', null]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'user.unban',
      targetType: 'user',
      targetId: id,
      detail: null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/users/:id/role', requireAdmin(), requirePermission('user.role'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const role = String(req.body?.role || '').trim()
    if (!id || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'invalid role' })
    }

    if (isSuper(req) && id === Number(req.user.id)) {
      return res.status(403).json({ ok: false, message: 'super admin cannot change own role' })
    }

    if (!isSuper(req)) {
      const ok = await ensureNotSuperTarget(req, res, id)
      if (!ok) return

      const adminTarget = await getAdminRecordByUserId(id)
      if (adminTarget) {
        return res.status(403).json({ ok: false, message: 'cannot operate admin account' })
      }
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'user.role.update',
      targetType: 'user',
      targetId: id,
      detail: role,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.delete('/users/:id', requireAdmin(), requirePermission('user.delete'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid user id' })

    if (!isSuper(req)) {
      const ok = await ensureNotSuperTarget(req, res, id)
      if (!ok) return

      const adminTarget = await getAdminRecordByUserId(id)
      if (adminTarget) {
        return res.status(403).json({ ok: false, message: 'cannot operate admin account' })
      }
    }

    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [id])

    await pool.query(
      'INSERT INTO user_violation_logs (user_id, admin_user_id, action, reason) VALUES (?, ?, ?, ?)',
      [id, req.admin.id, 'delete', String(req.body?.reason || '').trim() || null]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'user.delete',
      targetType: 'user',
      targetId: id,
      detail: String(req.body?.reason || '').trim() || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Posts ============
router.get('/posts', requireAdmin(), requirePermission('post.view'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const limit = pickLimit(req.query.limit)

    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.category, p.user_id, p.is_pinned, p.is_featured, p.is_hidden,
             p.audit_status, p.audit_reason, p.created_at, p.deleted_at,
             u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE (p.title LIKE ? OR p.category LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT ?
      `,
      [`%${q}%`, `%${q}%`, limit]
    )

    res.json({ ok: true, posts: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/posts/:id/pin', requireAdmin(), requirePermission('post.pin'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const isPinned = Number(req.body?.is_pinned || 0) === 1 ? 1 : 0
    if (!id) return res.status(400).json({ ok: false, message: 'invalid post id' })

    await pool.query('UPDATE posts SET is_pinned = ? WHERE id = ?', [isPinned, id])

    await logAdminAction({
      adminId: req.admin.id,
      action: isPinned ? 'post.pin' : 'post.unpin',
      targetType: 'post',
      targetId: id,
      detail: null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/posts/:id/feature', requireAdmin(), requirePermission('post.feature'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const isFeatured = Number(req.body?.is_featured || 0) === 1 ? 1 : 0
    if (!id) return res.status(400).json({ ok: false, message: 'invalid post id' })

    await pool.query('UPDATE posts SET is_featured = ? WHERE id = ?', [isFeatured, id])

    await logAdminAction({
      adminId: req.admin.id,
      action: isFeatured ? 'post.feature' : 'post.unfeature',
      targetType: 'post',
      targetId: id,
      detail: null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/posts/:id/hide', requireAdmin(), requirePermission('post.hide'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const hide = Number(req.body?.is_hidden || 0) === 1 ? 1 : 0
    const reason = String(req.body?.reason || '').trim()
    if (!id) return res.status(400).json({ ok: false, message: 'invalid post id' })

    await pool.query('UPDATE posts SET is_hidden = ?, hidden_reason = ? WHERE id = ?', [hide, reason || null, id])

    await logAdminAction({
      adminId: req.admin.id,
      action: hide ? 'post.hide' : 'post.unhide',
      targetType: 'post',
      targetId: id,
      detail: reason || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/posts/:id/audit', requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const status = String(req.body?.status || '').trim()
    const reason = String(req.body?.reason || '').trim()
    if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'invalid audit status' })
    }

    if (status === 'approved') {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.approve')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    } else if (status === 'rejected') {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.reject')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    } else {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.view')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    }

    await pool.query(
      'UPDATE posts SET audit_status = ?, audit_reason = ?, audited_by = ?, audited_at = NOW() WHERE id = ?',
      [status, reason || null, req.user.id, id]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: `post.audit.${status}`,
      targetType: 'post',
      targetId: id,
      detail: reason || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.delete('/posts/:id', requireAdmin(), requirePermission('post.delete'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid post id' })

    await pool.query('UPDATE posts SET deleted_at = NOW() WHERE id = ?', [id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'post.delete',
      targetType: 'post',
      targetId: id,
      detail: String(req.body?.reason || '').trim() || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Comments ============
router.get('/comments', requireAdmin(), requirePermission('comment.view'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const limit = pickLimit(req.query.limit)

    const [rows] = await pool.query(
      `
      SELECT c.id, c.post_id, c.user_id, c.content, c.is_hidden, c.audit_status, c.created_at, c.deleted_at,
             u.username AS author
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.content LIKE ?
      ORDER BY c.created_at DESC
      LIMIT ?
      `,
      [`%${q}%`, limit]
    )

    res.json({ ok: true, comments: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/comments/:id/hide', requireAdmin(), requirePermission('comment.hide'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const hide = Number(req.body?.is_hidden || 0) === 1 ? 1 : 0
    const reason = String(req.body?.reason || '').trim()
    if (!id) return res.status(400).json({ ok: false, message: 'invalid comment id' })

    await pool.query('UPDATE comments SET is_hidden = ?, hidden_reason = ? WHERE id = ?', [hide, reason || null, id])

    await logAdminAction({
      adminId: req.admin.id,
      action: hide ? 'comment.hide' : 'comment.unhide',
      targetType: 'comment',
      targetId: id,
      detail: reason || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/comments/:id/audit', requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const status = String(req.body?.status || '').trim()
    const reason = String(req.body?.reason || '').trim()
    if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ ok: false, message: 'invalid audit status' })
    }

    if (status === 'approved') {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.approve')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    } else if (status === 'rejected') {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.reject')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    } else {
      if (!req.admin.isSuper && !req.admin.permissions.includes('review.view')) {
        return res.status(403).json({ ok: false, message: 'permission denied' })
      }
    }

    await pool.query(
      'UPDATE comments SET audit_status = ?, audit_reason = ?, audited_by = ?, audited_at = NOW() WHERE id = ?',
      [status, reason || null, req.user.id, id]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: `comment.audit.${status}`,
      targetType: 'comment',
      targetId: id,
      detail: reason || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.delete('/comments/:id', requireAdmin(), requirePermission('comment.delete'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid comment id' })

    await pool.query('UPDATE comments SET deleted_at = NOW() WHERE id = ?', [id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'comment.delete',
      targetType: 'comment',
      targetId: id,
      detail: String(req.body?.reason || '').trim() || null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Boards ============
router.get('/boards', requireAdmin(), requirePermission('board.manage'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, sort_order, is_hidden, allow_post, allow_reply, min_role FROM boards ORDER BY sort_order ASC, id ASC'
    )
    res.json({ ok: true, boards: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/boards', requireAdmin(), requirePermission('board.manage'), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const description = String(req.body?.description || '').trim()
    if (!name) return res.status(400).json({ ok: false, message: 'name required' })

    const [ins] = await pool.query(
      'INSERT INTO boards (name, description, sort_order, is_hidden, allow_post, allow_reply, min_role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        description || null,
        Number(req.body?.sort_order || 0),
        Number(req.body?.is_hidden || 0) === 1 ? 1 : 0,
        Number(req.body?.allow_post || 1) === 1 ? 1 : 0,
        Number(req.body?.allow_reply || 1) === 1 ? 1 : 0,
        ['user', 'admin'].includes(req.body?.min_role) ? req.body.min_role : 'user'
      ]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'board.create',
      targetType: 'board',
      targetId: ins.insertId,
      detail: name,
      ip: req.ip
    })

    res.json({ ok: true, id: ins.insertId })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.put('/boards/:id', requireAdmin(), requirePermission('board.manage'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid board id' })

    const name = String(req.body?.name || '').trim()
    const description = String(req.body?.description || '').trim()

    await pool.query(
      `
      UPDATE boards
      SET name = ?, description = ?, sort_order = ?, is_hidden = ?, allow_post = ?, allow_reply = ?, min_role = ?
      WHERE id = ?
      `,
      [
        name,
        description || null,
        Number(req.body?.sort_order || 0),
        Number(req.body?.is_hidden || 0) === 1 ? 1 : 0,
        Number(req.body?.allow_post || 1) === 1 ? 1 : 0,
        Number(req.body?.allow_reply || 1) === 1 ? 1 : 0,
        ['user', 'admin'].includes(req.body?.min_role) ? req.body.min_role : 'user',
        id
      ]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'board.update',
      targetType: 'board',
      targetId: id,
      detail: name,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/boards/reorder', requireAdmin(), requirePermission('board.manage'), async (req, res) => {
  try {
    const list = Array.isArray(req.body?.items) ? req.body.items : []
    if (list.length === 0) return res.status(400).json({ ok: false, message: 'items required' })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const item of list) {
        const id = Number(item.id)
        const order = Number(item.sort_order)
        if (id) {
          await conn.query('UPDATE boards SET sort_order = ? WHERE id = ?', [order, id])
        }
      }
      await conn.commit()
    } catch (err) {
      try { await conn.rollback() } catch {}
      throw err
    } finally {
      conn.release()
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'board.reorder',
      targetType: 'board',
      targetId: null,
      detail: 'reorder',
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.delete('/boards/:id', requireAdmin(), requirePermission('board.manage'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid board id' })

    await pool.query('DELETE FROM boards WHERE id = ?', [id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'board.delete',
      targetType: 'board',
      targetId: id,
      detail: null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Review ============
router.get('/review', requireAdmin(), requirePermission('review.view'), async (req, res) => {
  try {
    const type = String(req.query.type || 'post')
    const limit = pickLimit(req.query.limit)
    if (type === 'comment') {
      const [rows] = await pool.query(
        `
        SELECT c.id, c.post_id, c.user_id, c.content, c.audit_status, c.created_at,
               u.username AS author
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.audit_status = 'pending'
        ORDER BY c.created_at ASC
        LIMIT ?
        `,
        [limit]
      )
      return res.json({ ok: true, type, items: rows })
    }

    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.category, p.user_id, p.audit_status, p.created_at,
             u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.audit_status = 'pending'
      ORDER BY p.created_at ASC
      LIMIT ?
      `,
      [limit]
    )

    res.json({ ok: true, type: 'post', items: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Admins (super only) ============
router.get('/admins', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })
    const [rows] = await pool.query(
      `
      SELECT a.id, a.user_id, a.is_active, a.created_at,
             u.username, u.email, r.role_key, r.name AS role_name
      FROM admin_users a
      JOIN users u ON u.id = a.user_id
      JOIN admin_roles r ON r.id = a.role_id
      ORDER BY a.id DESC
      `
    )

    res.json({ ok: true, admins: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/admins', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })

    const roleKey = String(req.body?.role_key || 'normal')
    const userId = Number(req.body?.user_id || 0)

    let targetUserId = userId
    if (!targetUserId) {
      const username = String(req.body?.username || '').trim()
      const email = String(req.body?.email || '').trim().toLowerCase()
      const password = String(req.body?.password || '')
      if (!username || !email || password.length < 6) {
        return res.status(400).json({ ok: false, message: 'username/email/password required' })
      }

      const [exists] = await pool.query(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, email]
      )
      if (exists.length > 0) return res.status(409).json({ ok: false, message: 'user already exists' })

      const hash = await bcrypt.hash(password, 10)
      const [ins] = await pool.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hash, 'admin']
      )
      targetUserId = ins.insertId
    }

    const [roleRows] = await pool.query(
      'SELECT id FROM admin_roles WHERE role_key = ? LIMIT 1',
      [roleKey === 'super' ? 'super' : 'normal']
    )
    if (roleRows.length === 0) return res.status(500).json({ ok: false, message: 'admin role not initialized' })

    await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', targetUserId])
    const [insAdmin] = await pool.query(
      'INSERT INTO admin_users (user_id, role_id, is_active, created_by) VALUES (?, ?, 1, ?)',
      [targetUserId, roleRows[0].id, req.user.id]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'admin.create',
      targetType: 'admin_user',
      targetId: insAdmin.insertId,
      detail: roleKey,
      ip: req.ip
    })

    res.json({ ok: true, admin_id: insAdmin.insertId })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.put('/admins/:id', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid admin id' })

    const [target] = await pool.query(
      'SELECT a.id, r.role_key FROM admin_users a JOIN admin_roles r ON r.id = a.role_id WHERE a.id = ? LIMIT 1',
      [id]
    )
    if (target.length === 0) return res.status(404).json({ ok: false, message: 'admin not found' })

    if (target[0].role_key === 'super' && id !== req.admin.id) {
      return res.status(403).json({ ok: false, message: 'cannot modify super admin' })
    }

    const roleKey = String(req.body?.role_key || target[0].role_key)
    const isActive = Number(req.body?.is_active)

    let roleId = null
    if (roleKey) {
      const [roleRows] = await pool.query('SELECT id FROM admin_roles WHERE role_key = ? LIMIT 1', [roleKey])
      roleId = roleRows.length ? roleRows[0].id : null
    }

    await pool.query(
      'UPDATE admin_users SET role_id = COALESCE(?, role_id), is_active = COALESCE(?, is_active) WHERE id = ?',
      [roleId, Number.isNaN(isActive) ? null : isActive, id]
    )

    await logAdminAction({
      adminId: req.admin.id,
      action: 'admin.update',
      targetType: 'admin_user',
      targetId: id,
      detail: roleKey,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.delete('/admins/:id', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid admin id' })

    const [target] = await pool.query(
      'SELECT a.id, r.role_key FROM admin_users a JOIN admin_roles r ON r.id = a.role_id WHERE a.id = ? LIMIT 1',
      [id]
    )
    if (target.length === 0) return res.status(404).json({ ok: false, message: 'admin not found' })

    if (target[0].role_key === 'super') {
      return res.status(403).json({ ok: false, message: 'cannot delete super admin' })
    }

    await pool.query('UPDATE admin_users SET is_active = 0 WHERE id = ?', [id])

    await logAdminAction({
      adminId: req.admin.id,
      action: 'admin.disable',
      targetType: 'admin_user',
      targetId: id,
      detail: null,
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/permissions', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })
    const [rows] = await pool.query('SELECT id, perm_key, label FROM admin_permissions ORDER BY perm_key ASC')
    res.json({ ok: true, permissions: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/admins/:id/permissions', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })

    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, message: 'invalid admin id' })

    const [userPerms] = await pool.query(
      `
      SELECT p.perm_key
      FROM admin_user_permissions up
      JOIN admin_permissions p ON p.id = up.permission_id
      WHERE up.admin_user_id = ?
      `,
      [id]
    )

    if (userPerms.length > 0) {
      return res.json({ ok: true, perm_keys: userPerms.map((r) => r.perm_key) })
    }

    const [rolePerms] = await pool.query(
      `
      SELECT p.perm_key
      FROM admin_role_permissions rp
      JOIN admin_permissions p ON p.id = rp.permission_id
      JOIN admin_users au ON au.role_id = rp.role_id
      WHERE au.id = ?
      `,
      [id]
    )

    res.json({ ok: true, perm_keys: rolePerms.map((r) => r.perm_key) })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.post('/admins/:id/permissions', requireAdmin(), requirePermission('admin.manage'), async (req, res) => {
  try {
    if (!req.admin.isSuper) return res.status(403).json({ ok: false, message: 'super admin only' })

    const id = Number(req.params.id)
    const permKeys = Array.isArray(req.body?.perm_keys) ? req.body.perm_keys : []
    if (!id) return res.status(400).json({ ok: false, message: 'invalid admin id' })

    const [target] = await pool.query(
      'SELECT a.id, r.role_key FROM admin_users a JOIN admin_roles r ON r.id = a.role_id WHERE a.id = ? LIMIT 1',
      [id]
    )
    if (target.length === 0) return res.status(404).json({ ok: false, message: 'admin not found' })
    if (target[0].role_key === 'super') {
      return res.status(403).json({ ok: false, message: 'cannot change super admin permissions' })
    }

    const [permRows] = await pool.query(
      'SELECT id, perm_key FROM admin_permissions WHERE perm_key IN (?)',
      [permKeys]
    )

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('DELETE FROM admin_user_permissions WHERE admin_user_id = ?', [id])
      for (const p of permRows) {
        await conn.query(
          'INSERT INTO admin_user_permissions (admin_user_id, permission_id) VALUES (?, ?)',
          [id, p.id]
        )
      }
      await conn.commit()
    } catch (err) {
      try { await conn.rollback() } catch {}
      throw err
    } finally {
      conn.release()
    }

    await logAdminAction({
      adminId: req.admin.id,
      action: 'admin.permissions.update',
      targetType: 'admin_user',
      targetId: id,
      detail: permKeys.join(','),
      ip: req.ip
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// ============ Logs ============
router.get('/logs/actions', requireAdmin(), requirePermission('logs.view'), async (req, res) => {
  try {
    const limit = pickLimit(req.query.limit, 200)
    const [rows] = await pool.query(
      `
      SELECT l.id, l.action, l.target_type, l.target_id, l.detail, l.ip, l.created_at,
             a.user_id, u.username
      FROM admin_action_logs l
      JOIN admin_users a ON a.id = l.admin_user_id
      JOIN users u ON u.id = a.user_id
      ORDER BY l.id DESC
      LIMIT ?
      `,
      [limit]
    )
    res.json({ ok: true, logs: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/logs/violations', requireAdmin(), requirePermission('logs.view'), async (req, res) => {
  try {
    const limit = pickLimit(req.query.limit, 200)
    const [rows] = await pool.query(
      `
      SELECT v.id, v.action, v.reason, v.created_at,
             u.username AS user_name, au.username AS admin_name
      FROM user_violation_logs v
      JOIN users u ON u.id = v.user_id
      JOIN admin_users a ON a.id = v.admin_user_id
      JOIN users au ON au.id = a.user_id
      ORDER BY v.id DESC
      LIMIT ?
      `,
      [limit]
    )
    res.json({ ok: true, logs: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/unban-appeals', requireAdmin(), requirePermission('user.view'), async (req, res) => {
  try {
    await ensureBanAppealsTable()
    const limit = pickLimit(req.query.limit, 200)
    const status = String(req.query.status || 'pending')
    const statusCond = ['pending', 'approved', 'rejected', 'all'].includes(status) ? status : 'pending'

    const [rows] = await pool.query(
      `
      SELECT a.id, a.user_id, a.message, a.status, a.created_at, a.handled_at,
             u.username AS user_name,
             hu.username AS handled_by_name,
             a.handled_note
      FROM user_unban_appeals a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN admin_users au ON au.id = a.handled_by
      LEFT JOIN users hu ON hu.id = au.user_id
      WHERE (? = 'all' OR a.status = ?)
      ORDER BY a.id DESC
      LIMIT ?
      `,
      [statusCond, statusCond, limit]
    )

    res.json({ ok: true, appeals: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/logs/logins', requireAdmin(), requirePermission('logs.view'), async (req, res) => {
  try {
    const limit = pickLimit(req.query.limit, 200)
    const [rows] = await pool.query(
      `
      SELECT l.id, l.user_id, l.ip, l.user_agent, l.success, l.created_at,
             u.username
      FROM login_logs l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.id DESC
      LIMIT ?
      `,
      [limit]
    )
    res.json({ ok: true, logs: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

module.exports = router
