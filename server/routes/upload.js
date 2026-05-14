const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { pool } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const IMAGE_DIR = path.join(__dirname, '..', 'uploads', 'posts')
fs.mkdirSync(IMAGE_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) ? ext : '.png'
    cb(null, `p${req.user.id}_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('only image allowed'))
    cb(null, true)
  }
})

router.post('/images', requireAuth, upload.array('images', 9), async (req, res) => {
  try {
    const files = req.files || []
    const urls = files.map((f) => `/uploads/posts/${f.filename}`)
    res.json({ ok: true, urls })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
})

module.exports = router
