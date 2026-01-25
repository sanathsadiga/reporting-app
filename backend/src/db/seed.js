require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'reporting_app'
  });

  console.log('Seeding database...');

  // Check if CEO already exists
  const [existing] = await connection.execute(
    'SELECT id FROM users WHERE email = ?',
    [process.env.CEO_EMAIL || 'ceo@timesgroup.com']
  );

  if (existing.length === 0) {
    // Create CEO user with default password
    const passwordHash = await bcrypt.hash('CEO@123', 12);
    await connection.execute(
      `INSERT INTO users (email, password_hash, role, force_password_reset, created_at, updated_at)
       VALUES (?, ?, 'ceo', 1, NOW(), NOW())`,
      [process.env.CEO_EMAIL || 'ceo@timesgroup.com', passwordHash]
    );
    console.log('✓ CEO user created');
    console.log('  Email: ceo@timesgroup.com');
    console.log('  Password: CEO@123 (will be forced to reset on first login)');
  } else {
    console.log('✓ CEO user already exists');
  }

  await connection.end();
  console.log('Seeding completed successfully!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
