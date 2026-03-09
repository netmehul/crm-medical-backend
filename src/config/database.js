const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

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
