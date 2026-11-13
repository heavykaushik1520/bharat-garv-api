import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 3306;
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'quiz_db';

console.log('Connecting with:', { host, port, user, database, connectTimeout: 10000 });

let connection;

try {
  connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 10000,
  });

  console.log('Connection: OK');

  const [selectRows] = await connection.query('SELECT 1 AS ok');
  console.log('SELECT 1 result:', selectRows);

  const [tables] = await connection.query('SHOW TABLES');
  console.log('SHOW TABLES result:', tables);
  console.log(`Table count: ${tables.length}`);
} catch (error) {
  console.error('Connection failed');
  console.error('code:', error.code || '(none)');
  console.error('errno:', error.errno ?? '(none)');
  console.error('sqlState:', error.sqlState || '(none)');
  console.error('message:', error.message);

  switch (error.code) {
    case 'ECONNREFUSED':
      console.error(
        'Meaning: Nothing is accepting TCP connections on that host:port (MySQL down, wrong host/port, or firewall).'
      );
      break;
    case 'ETIMEDOUT':
      console.error(
        'Meaning: Host unreachable or port filtered (network/firewall/security group; check remote MySQL allows your IP on 3306).'
      );
      break;
    case 'ER_ACCESS_DENIED_ERROR':
      console.error(
        'Meaning: Username/password rejected. Fix DB_USER / DB_PASSWORD, or grant the user access from your client host.'
      );
      break;
    case 'ER_DBACCESS_DENIED_ERROR':
      console.error(
        'Meaning: Login worked but this user cannot use DB_NAME. Grant privileges on that database, or fix DB_NAME.'
      );
      break;
    default:
      console.error('Meaning: See code/message above; also check DNS, SSL requirements, and that the DB exists.');
  }

  process.exitCode = 1;
} finally {
  if (connection) {
    await connection.end();
  }
}
