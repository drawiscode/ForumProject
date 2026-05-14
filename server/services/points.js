const POINTS = {
  post: 10,
  comment: 3,
  checkin: 2
}

function calcLevel(points) {
  const p = Math.max(Number(points) || 0, 0)
  if (p >= 300) return 4
  if (p >= 150) return 3
  if (p >= 50) return 2
  return 1
}

async function addPoints(conn, userId, delta) {
  if (!conn || typeof conn.query !== 'function') {
    throw new Error('invalid db connection')
  }

  const [rows] = await conn.query(
    'SELECT points FROM users WHERE id = ? FOR UPDATE',
    [userId]
  )

  if (rows.length === 0) return null
  const current = Number(rows[0].points) || 0
  const nextPoints = current + (Number(delta) || 0)
  const nextLevel = calcLevel(nextPoints)

  await conn.query(
    'UPDATE users SET points = ?, level = ? WHERE id = ?',
    [nextPoints, nextLevel, userId]
  )

  return { points: nextPoints, level: nextLevel }
}

module.exports = { POINTS, calcLevel, addPoints }
