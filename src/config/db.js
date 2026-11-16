import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quiz_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  namedPlaceholders: true,
  charset: 'utf8mb4',
  // Interpret MySQL DATETIME/TIMESTAMP as UTC in Node.
  timezone: 'Z',
});

// Keep MySQL session in UTC so CURRENT_TIMESTAMP / TIMESTAMP reads match
// timezone: 'Z' (SYSTEM is often IST and was shifting displayed times by +5:30).
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export default pool;
