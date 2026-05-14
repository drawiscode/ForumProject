const { pool } = require('../db')
const { createEmbeddings } = require('../services/embedding')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (const item of args) {
    const [k, v] = item.split('=')
    if (k && v && k.startsWith('--')) {
      out[k.slice(2)] = v
    }
  }
  return out
}

async function main() {
  const args = parseArgs()
  const limit = Math.min(Number(args.limit) || 200, 1000)
  const offset = Math.max(Number(args.offset) || 0, 0)

  const [rows] = await pool.query(
    `
    SELECT id, title, content
    FROM posts
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset]
  )

  if (rows.length === 0) {
    console.log('No posts to embed.')
    return
  }

  const texts = rows.map((p) => `${p.title}\n${p.content}`)
  const embeddings = await createEmbeddings(texts)

  for (let i = 0; i < rows.length; i += 1) {
    const postId = rows[i].id
    const emb = embeddings[i] || []
    await pool.query(
      `
      INSERT INTO post_embeddings (post_id, model, embedding)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE model = VALUES(model), embedding = VALUES(embedding)
      `,
      [postId, process.env.ALIYUN_EMBEDDING_MODEL || 'text-embedding-v3', JSON.stringify(emb)]
    )
  }

  console.log(`Embedded ${rows.length} posts.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
