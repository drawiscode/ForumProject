const { pool } = require('../db')

async function loadAdmin(req, res) {
  const userId = Number(req.header('x-user-id'))
  if (!userId) {
    res.status(401).json({ ok: false, message: 'not logged in' })
    return null
  }

  const [rows] = await pool.query(
    `
    SELECT
      u.id AS user_id,
      u.username,
      u.role AS user_role,
      u.is_banned,
      u.banned_until,
      u.deleted_at,
      a.id AS admin_id,
      a.is_active,
      r.role_key,
      r.name AS role_name
    FROM users u
    LEFT JOIN admin_users a ON a.user_id = u.id
    LEFT JOIN admin_roles r ON r.id = a.role_id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  )

  if (rows.length === 0) {
    res.status(401).json({ ok: false, message: 'invalid user' })
    return null
  }

  const row = rows[0]
  if (row.deleted_at) {
    res.status(403).json({ ok: false, message: 'account deleted' })
    return null
  }

  const now = Date.now()
  if (Number(row.is_banned) === 1) {// 被封禁的账号禁止登录
    if (!row.banned_until || new Date(row.banned_until).getTime() > now) {
      res.status(403).json({ ok: false, message: '账号已被封禁' })
      return null
    }
  }

  if (row.user_role !== 'admin' || !row.admin_id || Number(row.is_active) !== 1) {
    res.status(403).json({ ok: false, message: 'admin only' })
    return null
  }

  return row
}

async function getAdminPermissions(adminId, roleKey) {
  if (roleKey === 'super') return { isSuper: true, perms: [] }

  const [userPerms] = await pool.query(
    `
    SELECT p.perm_key
    FROM admin_user_permissions up
    JOIN admin_permissions p ON p.id = up.permission_id
    WHERE up.admin_user_id = ?
    `,
    [adminId]
  )

  if (userPerms.length > 0) {
    return { isSuper: false, perms: userPerms.map((r) => r.perm_key) }
  }

  const [rolePerms] = await pool.query(
    `
    SELECT p.perm_key
    FROM admin_role_permissions rp
    JOIN admin_permissions p ON p.id = rp.permission_id
    JOIN admin_users au ON au.role_id = rp.role_id
    WHERE au.id = ?
    `,
    [adminId]
  )

  return { isSuper: false, perms: rolePerms.map((r) => r.perm_key) }
}

function requireAdmin() {
  return async (req, res, next) => {
    const row = await loadAdmin(req, res)
    if (!row) return

    req.user = {
      id: row.user_id,
      username: row.username,
      role: row.user_role
    }
    req.admin = {
      id: row.admin_id,
      roleKey: row.role_key,
      roleName: row.role_name
    }

    const permInfo = await getAdminPermissions(row.admin_id, row.role_key)
    req.admin.isSuper = permInfo.isSuper
    req.admin.permissions = permInfo.perms

    next()
  }
}

function requirePermission(permKey) {
  return (req, res, next) => {
    if (!req.admin) return res.status(403).json({ ok: false, message: 'admin only' })
    if (req.admin.isSuper) return next()

    if (!req.admin.permissions || !req.admin.permissions.includes(permKey)) {
      return res.status(403).json({ ok: false, message: 'permission denied' })
    }

    next()
  }
}

async function logAdminAction({ adminId, action, targetType, targetId, detail, ip }) {
  try {
    await pool.query(
      `
      INSERT INTO admin_action_logs (admin_user_id, action, target_type, target_id, detail, ip)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [adminId, action, targetType, targetId || null, detail || null, ip || null]
    )
  } catch (err) {
    // ignore logging errors
  }
}

module.exports = { requireAdmin, requirePermission, logAdminAction }
