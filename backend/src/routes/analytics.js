const express = require('express');
const { query } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Analytics by type
router.get('/by-type', authenticate, requireRole('admin', 'ceo'), [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const { from, to } = req.query;
    let whereConditions = [];
    let params = [];

    if (from) {
      whereConditions.push('submitted_at >= ?');
      params.push(from);
    }

    if (to) {
      whereConditions.push('submitted_at <= ?');
      params.push(to + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const [results] = await pool.execute(
      `SELECT type, COUNT(*) as count
       FROM submissions
       ${whereClause}
       GROUP BY type
       ORDER BY count DESC`,
      params
    );

    res.json({
      labels: results.map(r => r.type.charAt(0).toUpperCase() + r.type.slice(1)),
      data: results.map(r => r.count)
    });
  } catch (error) {
    console.error('Analytics by type error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Analytics by area
router.get('/by-area', authenticate, requireRole('admin', 'ceo'), [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 50 })
], validate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    let whereConditions = [];
    let params = [];

    if (from) {
      whereConditions.push('submitted_at >= ?');
      params.push(from);
    }

    if (to) {
      whereConditions.push('submitted_at <= ?');
      params.push(to + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const [results] = await pool.execute(
      `SELECT area, COUNT(*) as count
       FROM submissions
       ${whereClause}
       GROUP BY area
       ORDER BY count DESC
       LIMIT ?`,
      [...params, String(limit)]
    );

    res.json({
      labels: results.map(r => r.area),
      data: results.map(r => r.count)
    });
  } catch (error) {
    console.error('Analytics by area error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Analytics by user
router.get('/by-user', authenticate, requireRole('admin', 'ceo'), [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 50 })
], validate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    let whereConditions = [];
    let params = [];

    if (from) {
      whereConditions.push('s.submitted_at >= ?');
      params.push(from);
    }

    if (to) {
      whereConditions.push('s.submitted_at <= ?');
      params.push(to + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const [results] = await pool.execute(
      `SELECT u.email, COUNT(*) as count
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       GROUP BY s.user_id, u.email
       ORDER BY count DESC
       LIMIT ?`,
      [...params, String(limit)]
    );

    res.json({
      labels: results.map(r => r.email),
      data: results.map(r => r.count)
    });
  } catch (error) {
    console.error('Analytics by user error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Analytics by month
router.get('/by-month', authenticate, requireRole('admin', 'ceo'), [
  query('year').optional().isInt({ min: 2020, max: 2100 })
], validate, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [results] = await pool.execute(
      `SELECT 
         MONTH(submitted_at) as month,
         COUNT(*) as count
       FROM submissions
       WHERE YEAR(submitted_at) = ?
       GROUP BY MONTH(submitted_at)
       ORDER BY month`,
      [year]
    );

    // Fill in missing months with 0
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const data = new Array(12).fill(0);
    results.forEach(r => {
      data[r.month - 1] = r.count;
    });

    res.json({
      labels: monthNames,
      data,
      year
    });
  } catch (error) {
    console.error('Analytics by month error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Summary stats
router.get('/summary', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const [totalSubmissions] = await pool.execute(
      'SELECT COUNT(*) as count FROM submissions'
    );

    const [totalUsers] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "user"'
    );

    const [todaySubmissions] = await pool.execute(
      'SELECT COUNT(*) as count FROM submissions WHERE DATE(submitted_at) = CURDATE()'
    );

    const [thisMonthSubmissions] = await pool.execute(
      `SELECT COUNT(*) as count FROM submissions 
       WHERE MONTH(submitted_at) = MONTH(CURDATE()) 
       AND YEAR(submitted_at) = YEAR(CURDATE())`
    );

    res.json({
      totalSubmissions: totalSubmissions[0].count,
      totalUsers: totalUsers[0].count,
      todaySubmissions: todaySubmissions[0].count,
      thisMonthSubmissions: thisMonthSubmissions[0].count
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;
