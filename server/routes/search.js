const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { createEmbeddings } = require('../services/embedding')

function normalizeQuery(q) {
  return String(q || '').trim()
}

function toVector(v) {
  if (!v) return []
  if (Array.isArray(v)) return v
  try {
    return JSON.parse(v)
  } catch {
    return []
  }
}

function cosineSim(a, b) {
  const len = Math.min(a.length, b.length)
  if (len === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < len; i += 1) {
    const x = Number(a[i]) || 0
    const y = Number(b[i]) || 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

router.get('/', async (req, res) => {
  try {
    const q = normalizeQuery(req.query.q || req.query.query)
    if (!q) return res.status(400).json({ ok: false, message: 'query required' })

    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const mode = String(req.query.mode || 'hybrid').toLowerCase()
    const candidate = Math.min(Number(req.query.candidate) || 500, 2000)

    if (mode === 'semantic') {
      const [emb] = await createEmbeddings([q])
      if (!emb || emb.length === 0) {
        return res.json({ ok: true, mode: 'semantic', query: q, posts: [], limit })
      }

      const [rows] = await pool.query(
        `
        SELECT p.id, p.title, p.content, p.category, p.created_at,
               p.likes_count, p.replies_count, p.views_count, p.favorites_count,
               u.username AS author,
               e.embedding
        FROM post_embeddings e
        JOIN posts p ON p.id = e.post_id
        JOIN users u ON u.id = p.user_id
        WHERE p.deleted_at IS NULL AND p.audit_status = 'approved' AND p.is_hidden = 0
        ORDER BY e.updated_at DESC
        LIMIT ?
        `,
        [candidate]
      )

      const scored = rows
        .map((row) => {
          const vec = toVector(row.embedding)
          const score = cosineSim(emb, vec)
          return { ...row, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ embedding, ...rest }) => rest)

      return res.json({ ok: true, mode: 'semantic', query: q, posts: scored, limit, candidate })
    }

    const like = `%${q}%`
    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.content, p.category, p.created_at,
             p.likes_count, p.replies_count, p.views_count, p.favorites_count,
             u.username AS author
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL AND p.audit_status = 'approved' AND p.is_hidden = 0
        AND (p.title LIKE ? OR p.content LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [like, like, limit, offset]
    )

    if (mode === 'keyword') {
      return res.json({ ok: true, mode: 'keyword', query: q, posts: rows, limit, offset })
    }

    const [emb] = await createEmbeddings([q])
    if (!emb || emb.length === 0) {
      return res.json({ ok: true, mode: 'hybrid', query: q, posts: rows, limit, offset })
    }

    const [semRows] = await pool.query(
      `
      SELECT p.id, p.title, p.content, p.category, p.created_at,
             p.likes_count, p.replies_count, p.views_count, p.favorites_count,
             u.username AS author,
             e.embedding
      FROM post_embeddings e
      JOIN posts p ON p.id = e.post_id
      JOIN users u ON u.id = p.user_id
      WHERE p.deleted_at IS NULL AND p.audit_status = 'approved' AND p.is_hidden = 0
      ORDER BY e.updated_at DESC
      LIMIT ?
      `,
      [candidate]
    )

    const scored = semRows
      .map((row) => {
        const vec = toVector(row.embedding)
        const score = cosineSim(emb, vec)
        return { ...row, score }
      })
      .sort((a, b) => b.score - a.score)

    const hitIds = new Set(rows.map((r) => r.id))
    const merged = rows.concat(
      scored
        .filter((r) => !hitIds.has(r.id))
        .slice(0, Math.max(0, limit - rows.length))
        .map(({ embedding, ...rest }) => rest)
    )

    res.json({ ok: true, mode: 'hybrid', query: q, posts: merged, limit, offset, candidate })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

module.exports = router
