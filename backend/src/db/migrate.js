require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const dbName = process.env.DB_NAME || 'reporting_app';
  
  // First, connect without database to create it if needed
  const rootConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('Creating database if not exists...');
  await rootConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await rootConnection.end();

  // Now connect to the database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    multipleStatements: true
  });

  console.log('Running migrations...');

  // Create users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin', 'ceo') NOT NULL DEFAULT 'user',
      force_password_reset TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      last_login DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ Users table created');

  // Create submissions table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('depo', 'vendor', 'dealer', 'stall', 'reader', 'ooh') NOT NULL,
      area TEXT NOT NULL,
      person_met TEXT NOT NULL,
      accompanied_by TEXT,
      insights TEXT,
      campaign TEXT,
      discussion TEXT,
      outcome TEXT,
      phone VARCHAR(20) NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions table created');

  // Create audit_logs table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(255) NOT NULL,
      user_id INT,
      meta JSON,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ Audit logs table created');

  // Create refresh_tokens table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(500) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Refresh tokens table created');

  await connection.end();
  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
