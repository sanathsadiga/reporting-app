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

  // Create submissions_depo table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_depo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      person_met TEXT NOT NULL,
      accompanied_by TEXT,
      competition_activity TEXT,
      discussion TEXT,
      outcome TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions Depo table created');

  // Create submissions_vendor table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_vendor (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      accompanied_by TEXT,
      outcome TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions Vendor table created');

  // Create submissions_dealer table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_dealer (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      dealer_name TEXT NOT NULL,
      accompanied_by TEXT,
      dues_amount DECIMAL(10, 2),
      collection_mode VARCHAR(50),
      collection_amount DECIMAL(10, 2),
      outstanding DECIMAL(10, 2) GENERATED ALWAYS AS (IFNULL(dues_amount, 0) - IFNULL(collection_amount, 0)) STORED,
      competition_newspapers JSON,
      discussion TEXT,
      outcome TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions Dealer table created');

  // Create submissions_stall table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_stall (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      stall_owner TEXT NOT NULL,
      accompanied_by TEXT,
      dues_amount DECIMAL(10, 2),
      collection_mode VARCHAR(50),
      collection_amount DECIMAL(10, 2),
      outstanding DECIMAL(10, 2) GENERATED ALWAYS AS (IFNULL(dues_amount, 0) - IFNULL(collection_amount, 0)) STORED,
      competition_newspapers JSON,
      discussion TEXT,
      outcome TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions Stall table created');

  // Create submissions_reader table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_reader (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      reader_name TEXT NOT NULL,
      contact_details TEXT NOT NULL,
      present_reading JSON,
      readers_feedback TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions Reader table created');

  // Create submissions_ooh table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS submissions_ooh (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      area TEXT NOT NULL,
      segment VARCHAR(100) NOT NULL,
      contact_person TEXT NOT NULL,
      existing_newspaper JSON,
      feedback_suggestion TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Submissions OOH table created');

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
