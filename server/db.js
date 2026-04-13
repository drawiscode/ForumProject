const mysql = require('mysql2/promise')
require('dotenv').config()

// 连接池模板：读取 .env；后续写接口时按需调用 pool.query(...)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'anime_forum',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = { pool }