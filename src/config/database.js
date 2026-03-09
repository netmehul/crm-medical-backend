const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

const originalExecute = pool.execute.bind(pool)
pool.execute = async (sql, params) => {
  if (!Array.isArray(params)) {
    console.error('❌ BAD QUERY - params not an array:', {
      sql: sql.substring(0, 100),
      params,
      type: typeof params
    })
  }
  return originalExecute(sql, params)
}

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected')
    conn.release()
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message)
    process.exit(1)
  })

module.exports = pool
