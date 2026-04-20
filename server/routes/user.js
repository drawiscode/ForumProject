const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool } = require('../db')
const path =require('path')
const fs = require('fs')
const multer = require('multer')


const router = express.Router()

async function requireAuth(req, res, next) {
  try {
    const userId = Number(req.header('x-user-id'))
    if (!userId) return res.status(401).json({ ok: false, message: 'not logged in' })

    const [rows] = await pool.query(
      'SELECT id, username, avatar_url  FROM users WHERE id = ? LIMIT 1',
      [userId]
    )
    if (rows.length === 0) return res.status(401).json({ ok: false, message: 'invalid user' })

    req.user = rows[0]
    next()
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || '').trim())
}


function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex')
}
function makeToken() {
  return crypto.randomBytes(24).toString('hex')
}


const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars')
fs.mkdirSync(AVATAR_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png'
    cb(null, `u${req.user.id}_${Date.now()}${safeExt}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('only image allowed'))
    cb(null, true)
  }
})



// POST /api/user/password/forgot
router.post('/password/forgot', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email || !isEmail(email)) return res.status(400).json({ ok: false, message: 'invalid email' })

    const [uRows] = await pool.query('SELECT id, email FROM users WHERE email = ? LIMIT 1', [email])

    // 安全：不暴露邮箱是否存在
    if (uRows.length === 0) return res.json({ ok: true })

    const user = uRows[0]
    const token = makeToken()
    const tokenHash = sha256(token)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分钟

    await pool.query(
      'INSERT INTO password_resets (user_id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, email, tokenHash, expiresAt]
    )

    // TODO: 接入邮件服务：发送重置链接
    // 课程/开发期：先把 token 返回（上线前务必移除）
    res.json({ ok: true, dev_token: token })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/password/reset
router.post('/password/reset', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const token = String(req.body?.token || '').trim()
    const newPassword = String(req.body?.new_password || '')

    if (!email || !isEmail(email)) return res.status(400).json({ ok: false, message: 'invalid email' })
    if (!token) return res.status(400).json({ ok: false, message: 'token required' })
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ ok: false, message: 'password length must be >= 6' })
    }

    const tokenHash = sha256(token)

    const [rows] = await pool.query(
      `
      SELECT id, user_id, expires_at, used_at
      FROM password_resets
      WHERE email = ? AND token_hash = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [email, tokenHash]
    )

    if (rows.length === 0) return res.status(400).json({ ok: false, message: 'invalid token' })

    const r = rows[0]
    if (r.used_at) return res.status(400).json({ ok: false, message: 'token already used' })
    if (new Date(r.expires_at).getTime() < Date.now()) return res.status(400).json({ ok: false, message: 'token expired' })

    const newHash = await bcrypt.hash(newPassword, 10)

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, r.user_id])
      await conn.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [r.id])
      await conn.commit()
    } catch (e) {
      try { await conn.rollback() } catch {}
      throw e
    } finally {
      conn.release()
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})


// GET /api/user/me/following
router.get('/me/following', requireAuth, async (req, res) => {
  try {
    const myId = req.user.id
    const [rows] = await pool.query(
      `
      SELECT u.id, u.username, u.avatar_url, u.fans_count, u.follow_count
      FROM user_follows f
      JOIN users u ON u.id = f.followee_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT 200
      `,
      [myId]
    )
    res.json({ ok: true, users: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// GET /api/user/me/fans
router.get('/me/fans', requireAuth, async (req, res) => {
  try {
    const myId = req.user.id
    const [rows] = await pool.query(
      `
      SELECT u.id, u.username, u.avatar_url, u.fans_count, u.follow_count
      FROM user_follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.followee_id = ?
      ORDER BY f.created_at DESC
      LIMIT 200
      `,
      [myId]
    )
    res.json({ ok: true, users: rows })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

router.get('/:id/public', async (req, res) => {
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ ok: false, message: 'invalid user id' })

    const viewerId = Number(req.header('x-user-id')) || 0

    const [rows] = await pool.query(
      `
      SELECT id, username, avatar_url, gender, bio, created_at,
             fans_count, follow_count, allow_dm
      FROM users
      WHERE id = ? AND (public_profile = 1 OR public_profile IS NULL)
      LIMIT 1
      `,
      [id]
    )
    if(rows.length === 0) return res.status(404).json({ ok: false, message: 'user not found or profile is private' })

    const [cnt] =await pool.query(
      'SELECT COUNT(*) AS posts_count FROM posts WHERE user_id = ? AND deleted_at IS NULL',
      [id]
    );

    let is_following = false;
    if(viewerId && viewerId !== id){
      const [f] = await pool.query(
        'SELECT id FROM user_follows WHERE follower_id = ? AND followee_id = ? LIMIT 1',
        [viewerId, id]
      )
      is_following = f.length > 0
    }
    res.json({ ok: true, user: {...rows[0], posts_count: cnt[0]?.posts_count || 0 , is_following} })
  }catch(err){
    res.status(500).json({ ok: false, message: err.message })
  }
})

// GET /api/user/active?limit=5
router.get('/active', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20)

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.avatar_url,
        COUNT(p.id) AS posts_count
      FROM users u
      LEFT JOIN posts p
        ON p.user_id = u.id AND p.deleted_at IS NULL
      WHERE u.public_profile = 1 OR u.public_profile IS NULL
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY posts_count DESC, u.id DESC
      LIMIT ?
      `,
      [limit]
    )

    res.json({ ok: true, users: rows, limit })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// GET /api/user/me 需要返回 avatar_url
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, role, created_at, avatar_url, gender, bio, public_profile, 
      allow_dm, follow_count, fans_count 
      FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ ok: false, message: 'user not found' })
    res.json({ ok: true, user: rows[0] })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/me/password（修改密码）
router.post('/me/password', requireAuth, async (req, res) => {
    const conn =await pool.getConnection()
    try{
      const oldPassword = String(req.body?.old_password || '')
      const newPassword = String(req.body?.new_password || '')
    
      if(!oldPassword || !newPassword) return res.status(400).json({ ok: false, message: 'old/new password required' })    
      
      await conn.beginTransaction()
        /*查找用户名是否存在，只有存在的时候才修改密码*/
      const [rows] = await conn.query(
        'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
        [req.user.id]
      )
      if(rows.length === 0) {
        await conn.rollback()
        return res.status(404).json({ ok: false, message: 'user not found' })
      }

      /*确认旧密码和原密码确实相同，否则返回旧密码不一致 */
      const user = rows[0]
      const match = await bcrypt.compare(oldPassword, user.password_hash)
      if(!match) {
        await conn.rollback()
        return res.status(400).json({ ok: false, message: 'old password incorrect' })
      }
      /*对新密码进行哈希加密后更新到数据库*/
      const newHash = await bcrypt.hash(newPassword, 10)
      const [result] = await conn.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, req.user.id]
      )
      await conn.commit()
      return res.status(200).json({ ok: true, message: 'password updated' })
    }catch(err){
      try{
        await conn.rollback()
      }catch{}
      return res.status(500).json({ ok: false, message: err.message })
    }finally{
      conn.release()
    }
})

// POST /api/user/me/profile（保存 username / gender / bio）
router.post('/me/profile', requireAuth, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim()
    const gender = String(req.body?.gender || '').trim() // '', 'male','female','other'
    const bio = String(req.body?.bio || '').trim()

    if (!username) return res.status(400).json({ ok: false, message: 'username required' })
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ ok: false, message: 'username length must be 3-50' })
    }

    const okGender = ['', 'male', 'female', 'other']
    if (!okGender.includes(gender)) {
      return res.status(400).json({ ok: false, message: 'invalid gender' })
    }
    if (bio.length > 200) {
      return res.status(400).json({ ok: false, message: 'bio length must be <= 200' })
    }

    // 用户名如果要允许修改：需要查重（排除自己）
    const [exists] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
      [username, req.user.id]
    )
    if (exists.length > 0) {
      return res.status(409).json({ ok: false, message: 'username already exists' })
    }

    await pool.query(
      'UPDATE users SET username = ?, gender = ?, bio = ? WHERE id = ?',
      [username, gender || null, bio || null, req.user.id]
    )

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/me/avatar  (multipart/form-data, field name: avatar)
router.post('/me/avatar', requireAuth, upload.single('avatar') ,async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, message: 'avatar file required' })

    // 返回给前端可访问的 URL（结合 app.use('/uploads', express.static(...))）
    const avatar_url = `/uploads/avatars/${req.file.filename}`

    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatar_url, req.user.id])
    res.json({ ok: true, avatar_url })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/register
// body: { email,username, password }
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body || {}

    const e = String(email || '').trim().toLowerCase()
    const u = String(username || '').trim()
    const p = String(password || '')

    if (!e || !u || !p) {
      return res.status(400).json({ ok: false, message: 'email/username/password required' })
    }
    if (!isEmail(e)) {
      return res.status(400).json({ ok: false, message: 'invalid email' })
    }
    if (u.length < 3 || u.length > 50) {
      return res.status(400).json({ ok: false, message: 'username length must be 3-50' })
    }
    if (p.length < 6) {
      return res.status(400).json({ ok: false, message: 'password length must be >= 6' })
    }

    // 查重：用户名或邮箱任一存在都不允许
    const [exists] = await pool.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [u, e]
    )
    if (exists.length > 0) {
      const hit = exists[0]
      if (hit.username === u) return res.status(409).json({ ok: false, message: 'username already exists' })
      if (hit.email === e) return res.status(409).json({ ok: false, message: 'email already exists' })
      return res.status(409).json({ ok: false, message: 'account already exists' })
    } 
                                                 
    const passwordHash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [u, e, passwordHash, 'user']
    )

    return res.status(201).json({
      ok: true,
      user: { id: result.insertId, username: u, email: e, role: 'user' }
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/login
// body: { username, password }
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body || {}
    const a = String(account || '').trim()
    const p = String(password || '')
    if (!a || !p) {
      return res.status(400).json({ ok: false, message: 'account/password required' })
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ? LIMIT 1',
      [a, a.toLowerCase()]
    )
    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'invalid credentials' })
    }

    const user = rows[0]
    const match = await bcrypt.compare(p, user.password_hash)
    if (!match) {
      return res.status(401).json({ ok: false, message: 'invalid credentials' })
    }

    return res.json({
      ok: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    })
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message })
  }
})

// POST /api/user/me/privacy（保存隐私设置）
router.post('/me/privacy', requireAuth, async (req, res) => {
  try {
    // 允许传 boolean/0/1/'0'/'1'
    const public_profile = req.body?.public_profile
    const allow_dm = req.body?.allow_dm

    const toBit = (v) => (v === true || v === 1 || v === '1' ? 1 : 0)

    await pool.query(
      'UPDATE users SET public_profile = ?, allow_dm = ? WHERE id = ?',
      [toBit(public_profile), toBit(allow_dm), req.user.id]
    )

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

/*POST /api/user/:id/follow 关注 */ 
router.post('/:id/follow',requireAuth, async (req, res) => {
  const conn =await pool.getConnection()
  try{
    const targetId = Number(req.params.id)
    const meId = Number(req.user.id)
    if(!targetId) return res.status(400).json({ ok: false, message: 'invalid target user id' })
    if(targetId === meId) return res.status(400).json({ ok: false, message: 'cannot follow yourself' })
      
    await conn.beginTransaction()

    //插入关注关系(存在则忽略)
    const [r] = await conn.query(
      'INSERT IGNORE INTO user_follows (follower_id, followee_id) VALUES (?, ?)',
      [meId, targetId]
    )
    
    if(r.affectedRows === 0){//已经关注
      await conn.rollback()
      return res.json({ok:true,followed: true, message: 'already following'})
    }

    await conn.query('UPDATE users SET follow_count = follow_count + 1 WHERE id = ?', [meId])
    await conn.query('UPDATE users SET fans_count = fans_count + 1 WHERE id = ?', [targetId])
    
    await conn.commit()
    res.json({ok: true, followed: true, message: 'followed successfully' })
  }catch(err){
    try{await conn.rollback()}catch{}
    res.status(500).json({ ok: false, message: err.message })
  } finally{
    conn.release()
  }
})  


/*DELETE /api/user/:id/follow 取关 */
router.delete('/:id/follow',requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try{
    const targetId = Number(req.params.id);
    const meId = Number(req.user.id);
    if(!targetId) return res.status(400).json({ ok: false, message:'invalid target user id' });
    if(targetId === meId) return res.status(400).json({ ok: false, message:'cannot unfollow yourself' });
    
    await conn.beginTransaction();
    const [r]=await conn.query(
      'DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?',
      [meId, targetId]
    )
    if(r.affectedRows === 0){
      await conn.rollback();
      return res.json({ ok: true, followed: false, message:'not following' });
    }
    await conn.query('UPDATE users SET follow_count = follow_count - 1 WHERE id = ?', [meId]);
    await conn.query('UPDATE users SET fans_count = fans_count - 1 WHERE id = ?', [targetId]);
    
    await conn.commit();
    res.json({ok: true, followed: true, message:'unfollowed successfully' });
  }catch(err){
    try{ await conn.rollback() }catch{}
    res.status(500).json({ ok: false, message: err.message })
  }finally{
    conn.release()
  }
})  
module.exports = router