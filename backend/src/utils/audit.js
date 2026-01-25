const pool = require('../config/database');

async function logAudit(action, userId, meta = {}) {
  try {
    await pool.execute(
      'INSERT INTO audit_logs (action, user_id, meta, ts) VALUES (?, ?, ?, NOW())',
      [action, userId, JSON.stringify(meta)]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = { logAudit };
