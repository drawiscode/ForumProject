function getEnv(name, fallback) {
  const v = process.env[name]
  return v ? v : fallback
}

function normalizeTexts(texts) {
  if (!Array.isArray(texts)) return []
  return texts.map((t) => String(t || '').trim()).filter(Boolean)
}

async function createEmbeddings(texts) {
  const apiKey = getEnv('ALIYUN_API_KEY', '')
  const model = getEnv('ALIYUN_EMBEDDING_MODEL', 'text-embedding-v3')
  const url = getEnv(
    'ALIYUN_EMBEDDING_URL',
    'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding'
  )

  if (!apiKey) {
    const err = new Error('ALIYUN_API_KEY is missing')
    err.code = 'NO_API_KEY'
    throw err
  }

  const inputs = normalizeTexts(texts)
  if (inputs.length === 0) return []

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: { texts: inputs }
    })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  const embeddings = data?.output?.embeddings || []
  return embeddings.map((item) => item.embedding || [])
}

module.exports = { createEmbeddings }
