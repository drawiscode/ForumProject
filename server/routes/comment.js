/*-- 评论表设计：新增 parent_comment_id（父评论）+ root_comment_id（A类根评论）+ dialog_comment_id（对话根：B类评论）+ reply_count（A下回复数）+ dialog_reply_count（B下C回复数）。
数据模型：在 comments 表新增 parent_comment_id（父评论）+ root_comment_id（A类根评论）+ dialog_comment_id（对话根：B类评论）+ reply_count（A下回复数）+ dialog_reply_count（B下C回复数）。
A：parent=NULL, root=NULL, dialog=NULL
B：parent=A, root=A, dialog=B(自身)
C：parent in (B/C), root=A, dialog=B（保证所有 C 都归同一个 B 对话）
后端接口：
POST /api/comment/:postId 兼容创建 A/B/C（body: {content, parent_comment_id?}），后端自动算 root_comment_id/dialog_comment_id，并更新计数。
GET /api/comment/:postId 只返回 A 列表，带 reply_count。
GET /api/comment/thread/:aId 返回 A 详情 + B/C 列表（按时间）。
GET /api/comment/dialog/:bId 返回 B 详情 + 所有 C（按时间）。
前端：
PostDetail.vue：A 下面加“回复”+“查看回复(n)”按钮；回复时传 parent_comment_id=A.id。
新增 CommentThread.vue：展示 A 与其所有回复(B/C)；每条 B/C 有回复按钮；C 类显示“查看对话”→ 跳 CommentDialog.vue。
新增 CommentDialog.vue：展示 B 与其所有 C。
路由加 /comment/thread/:id 与 /comment/dialog/:id。
*/


const express = require('express')
const router = express.Router()
const {pool} = require('../db')

async function requireAuth(req,res,next){
  try{
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


// GET /api/comment/:postId
router.get('/:postId', async (req, res) => {
  try{
    const postId = Number(req.params.postId)
    if(!postId) return res.status(400).json({ok:false, message:'invalid postId'})

      const [rows] = await pool.query(
        `
        SELECT
          c.id, c.post_id, c.user_id, c.content, c.likes_count, c.reply_count, c.created_at,
          u.username AS author, u.avatar_url AS author_avatar_url
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.post_id = ? AND c.deleted_at IS NULL AND c.parent_comment_id IS NULL
        ORDER BY c.created_at ASC
        `,
        [postId]
      )
    res.json({ok:true, comments: rows})
  }catch(err){
    res.status(500).json({ ok: false, message: err.message })
  }
})

/*
 * GET /api/comment/thread/:aId
 * A 评论详情：返回 A + 其所有回复（B/C）按时间
 */
router.get('/thread/:aId', async (req, res) => {
  try {
    const aId = Number(req.params.aId)
    if (!aId) return res.status(400).json({ ok: false, message: 'invalid comment id' })

    const [aRows] = await pool.query(
      `
      SELECT
        c.id, c.post_id, c.user_id, c.content, c.likes_count, c.reply_count, c.created_at,
        u.username AS author, u.avatar_url AS author_avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ? AND c.deleted_at IS NULL AND c.parent_comment_id IS NULL
      LIMIT 1
      `,
      [aId]
    )
    if (aRows.length === 0) return res.status(404).json({ ok: false, message: 'comment not found' })

    const [replies] = await pool.query(
      `
      SELECT
        c.id, c.post_id, c.user_id, c.parent_comment_id, c.root_comment_id, c.dialog_comment_id,
        c.content, c.likes_count, c.dialog_reply_count, c.created_at,
        u.username AS author, u.avatar_url AS author_avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.deleted_at IS NULL AND c.root_comment_id = ?
      ORDER BY c.created_at ASC
      `,
      [aId]
    )

    res.json({ ok: true, comment: aRows[0], replies })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})


/**
 * GET /api/comment/dialog/:bId
 * B 对话详情：返回 B + 其所有 C（按时间）
 */
router.get('/dialog/:bId', async (req, res) => {
  try {
    const bId = Number(req.params.bId)
    if (!bId) return res.status(400).json({ ok: false, message: 'invalid comment id' })

    const [bRows] = await pool.query(
      `
      SELECT
        c.id, c.post_id, c.user_id, c.parent_comment_id, c.root_comment_id, c.dialog_comment_id,
        c.content, c.likes_count, c.dialog_reply_count, c.created_at,
        u.username AS author, u.avatar_url AS author_avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ? AND c.deleted_at IS NULL AND c.dialog_comment_id = c.id
      LIMIT 1
      `,
      [bId]
    )
    if (bRows.length === 0) return res.status(404).json({ ok: false, message: 'dialog not found' })

    const b = bRows[0]

    const [cs] = await pool.query(
      `
      SELECT
        c.id, c.post_id, c.user_id, c.parent_comment_id, c.root_comment_id, c.dialog_comment_id,
        c.content, c.likes_count, c.created_at,
        u.username AS author, u.avatar_url AS author_avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.deleted_at IS NULL AND c.dialog_comment_id = ? AND c.id <> ?
      ORDER BY c.created_at ASC
      `,
      [bId, bId]
    )

    res.json({ ok: true, comment: b, replies: cs })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})




/*
 * POST /api/comment/:postId
 * body: { content, parent_comment_id? }
 * - parent_comment_id 为空：创建 A
 * - parent_comment_id 指向 A：创建 B（dialog_comment_id=自身）
 * - parent_comment_id 指向 B/C：创建 C（dialog_comment_id=所属B）
 */
// POST /api/comment/:postId 发布评论需要登录，调用 requireAuth
router.post('/:postId', requireAuth,async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const postId = Number(req.params.postId)
    if(!postId) return res.status(400).json({ok:false, message:'invalid postId'})
    
    const content = String(req.body.content || '').trim()
    if(!content) return res.status(400).json({ok:false, message:'content required'})
    
    const parentCommentId = req.body.parent_comment_id ? Number(req.body.parent_comment_id) : null

    await conn.beginTransaction()

    let parent = null
    let root_comment_id = null
    let dialog_comment_id = null

    if(parentCommentId) {
      const [pRows] = await conn.query(
        'SELECT id, post_id, parent_comment_id, root_comment_id, dialog_comment_id FROM comments WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [parentCommentId]
      )
      if (pRows.length === 0) {
        await conn.rollback()
        return res.status(404).json({ ok: false, message: 'parent comment not found' })
      }
      parent = pRows[0]
      if (Number(parent.post_id) !== postId) {
        await conn.rollback()
        return res.status(400).json({ ok: false, message: 'parent comment not in this post' })
      }

      // parent 是 A（B 类）
      if (!parent.parent_comment_id) {
        root_comment_id = parent.id
        // dialog_comment_id 先留空，插入后再把自身id写回（B 的 dialog 是自己）
        dialog_comment_id = null
      } else {
        // parent 是 B 或 C（C 类），必须有 root/dialog
        root_comment_id = parent.root_comment_id
        dialog_comment_id = parent.dialog_comment_id
        if (!root_comment_id || !dialog_comment_id) {
          await conn.rollback()
          return res.status(400).json({ ok: false, message: 'invalid parent hierarchy' })
        }
      }
    }

    const [ins] = await conn.query(
      `
      INSERT INTO comments (post_id, user_id, parent_comment_id, root_comment_id, dialog_comment_id, content)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [postId, req.user.id, parentCommentId, root_comment_id, dialog_comment_id, content]
    )

    const newId = ins.insertId

    // 如果这是 B 类：把 dialog_comment_id 更新为自身
    if (parentCommentId && parent && !parent.parent_comment_id) {
      await conn.query('UPDATE comments SET dialog_comment_id = ? WHERE id = ?', [newId, newId])
      dialog_comment_id = newId

      // A 的 reply_count +1
      await conn.query('UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?', [root_comment_id])
      // B 的 dialog_reply_count 初始为 0（默认）
    }

    // 如果这是 C 类：A.reply_count +1 且 B.dialog_reply_count +1
    if (parentCommentId && parent && parent.parent_comment_id) {
      await conn.query('UPDATE comments SET reply_count = reply_count + 1 WHERE id = ?', [root_comment_id])
      await conn.query('UPDATE comments SET dialog_reply_count = dialog_reply_count + 1 WHERE id = ?', [dialog_comment_id])
    }

    await conn.commit()
    res.status(201).json({ ok: true, id: newId })
  }catch(err){
    try{ await conn.rollback() }catch{}
    return res.status(500).json({ ok: false, message: err.message })
  }finally{
    conn.release()
  }
})

// POST /api/comment/like/:commentId
router.post('/like/:commentId',requireAuth, async (req, res) => {
  const conn = await pool.getConnection()
  try{
    const commentId = Number(req.params.commentId)
    if(!commentId) return res.status(400).json({ok:false, message:'invalid commentId'})
    await conn.beginTransaction()

    //确保每人只能点赞一次：查询 comment_likes 是否已有记录
    try{
      await conn.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)',
        [commentId, req.user.id]
      )
    }catch(e){
      await conn.rollback()
      return res.status(409).json({ ok:false ,message:'already liked' })
    }

    await conn.query(
      'UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?',
      [commentId]
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