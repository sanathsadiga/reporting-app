const express = require('express');
const { query } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const SUBMISSION_TYPES = ['depo', 'vendor', 'dealer', 'stall', 'reader', 'ooh'];
const getTableName = (type) => `submissions_${type}`;

// Helper to build WHERE clause for date range
const buildDateClause = (from, to) => {
  const conditions = [];
  const params = [];
  
  if (from) {
    conditions.push('submitted_at >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('submitted_at <= ?');
    params.push(to + ' 23:59:59');
  }
  
  return {
    clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
};

// Analytics by type with filters
router.get('/by-type', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { from, to, area, user } = req.query;
    
    const dateClause = buildDateClause(from, to);
    let params = [...dateClause.params];

    const queries = SUBMISSION_TYPES.map(submissionType => {
      const tableName = getTableName(submissionType);
      let conditions = [];
      let whereIndex = dateClause.params.length;

      if (dateClause.clause) {
        conditions.push(dateClause.clause);
      }

      if (area) {
        conditions.push(conditions.length > 0 ? `AND area LIKE ?` : 'WHERE area LIKE ?');
        params.push(`%${area}%`);
      }

      if (user) {
        conditions.push(conditions.length > 0 ? `AND user_id = ?` : 'WHERE user_id = ?');
        params.push(parseInt(user));
      }

      const whereClause = conditions.join(' ');
      return `(SELECT '${submissionType}' as type, COUNT(*) as count FROM ${tableName} ${whereClause})`;
    });

    // Rebuild params for each query
    const allParams = [];
    SUBMISSION_TYPES.forEach(() => {
      allParams.push(...params);
    });

    const [results] = await pool.execute(
      `SELECT type, count FROM (${queries.join(' UNION ALL ')}) as data
       WHERE count > 0
       ORDER BY count DESC`,
      allParams
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

// Analytics by area with filters
router.get('/by-area', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { from, to, type, user, limit = 10 } = req.query;
    
    const dateClause = buildDateClause(from, to);
    const params = [...dateClause.params];
    
    let queries;
    if (type && SUBMISSION_TYPES.includes(type)) {
      // Single type
      const tableName = getTableName(type);
      let whereConditions = [];
      
      if (dateClause.clause) whereConditions.push(dateClause.clause);
      if (user) {
        whereConditions.push(whereConditions.length > 0 ? `AND user_id = ?` : 'WHERE user_id = ?');
        params.push(parseInt(user));
      }
      
      const whereClause = whereConditions.join(' ');
      queries = [
        `(SELECT area, COUNT(*) as count FROM ${tableName} ${whereClause} GROUP BY area)`
      ];
    } else {
      // All types
      queries = SUBMISSION_TYPES.map(submissionType => {
        const tableName = getTableName(submissionType);
        let whereConditions = [];
        
        if (dateClause.clause) whereConditions.push(dateClause.clause);
        if (user) {
          whereConditions.push(whereConditions.length > 0 ? `AND user_id = ?` : 'WHERE user_id = ?');
        }
        
        const whereClause = whereConditions.join(' ');
        return `(SELECT area, COUNT(*) as count FROM ${tableName} ${whereClause} GROUP BY area)`;
      });
    }

    const allParams = type ? params : Array(SUBMISSION_TYPES.length).fill(null).flatMap(() => params);

    const [results] = await pool.execute(
      `SELECT area, SUM(count) as count FROM (${queries.join(' UNION ALL ')}) as data
       GROUP BY area
       ORDER BY count DESC
       LIMIT ${parseInt(limit)}`,
      allParams
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

// Analytics by user with filters
router.get('/by-user', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { from, to, type, area, limit = 10 } = req.query;
    
    const dateClause = buildDateClause(from, to);
    const params = [...dateClause.params];

    let queries;
    if (type && SUBMISSION_TYPES.includes(type)) {
      const tableName = getTableName(type);
      let whereConditions = [];
      
      if (dateClause.clause) whereConditions.push(dateClause.clause);
      if (area) {
        whereConditions.push(whereConditions.length > 0 ? `AND s.area LIKE ?` : 'WHERE s.area LIKE ?');
        params.push(`%${area}%`);
      }
      
      const whereClause = whereConditions.join(' ');
      queries = [
        `(SELECT s.user_id, u.email, COUNT(*) as count FROM ${tableName} s
          LEFT JOIN users u ON s.user_id = u.id
          ${whereClause}
          GROUP BY s.user_id, u.email)`
      ];
    } else {
      queries = SUBMISSION_TYPES.map(submissionType => {
        const tableName = getTableName(submissionType);
        let whereConditions = [];
        
        if (dateClause.clause) whereConditions.push(dateClause.clause);
        if (area) {
          whereConditions.push(whereConditions.length > 0 ? `AND s.area LIKE ?` : 'WHERE s.area LIKE ?');
        }
        
        const whereClause = whereConditions.join(' ');
        return `(SELECT s.user_id, u.email, COUNT(*) as count FROM ${tableName} s
                 LEFT JOIN users u ON s.user_id = u.id
                 ${whereClause}
                 GROUP BY s.user_id, u.email)`;
      });
    }

    const allParams = type ? params : Array(SUBMISSION_TYPES.length).fill(null).flatMap(() => params);

    const [results] = await pool.execute(
      `SELECT email, SUM(count) as count FROM (${queries.join(' UNION ALL ')}) as data
       GROUP BY email
       ORDER BY count DESC
       LIMIT ${parseInt(limit)}`,
      allParams
    );

    res.json({
      labels: results.map(r => r.email || 'Unknown'),
      data: results.map(r => r.count)
    });
  } catch (error) {
    console.error('Analytics by user error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Analytics by month with filters
router.get('/by-month', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { year, type, area, user } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    let queries;
    let params = [selectedYear];

    if (type && SUBMISSION_TYPES.includes(type)) {
      const tableName = getTableName(type);
      let whereConditions = ['YEAR(submitted_at) = ?'];
      
      if (area) {
        whereConditions.push('area LIKE ?');
        params.push(`%${area}%`);
      }
      if (user) {
        whereConditions.push('user_id = ?');
        params.push(parseInt(user));
      }
      
      const whereClause = whereConditions.join(' AND ');
      queries = [
        `(SELECT MONTH(submitted_at) as month, COUNT(*) as count FROM ${tableName}
          WHERE ${whereClause}
          GROUP BY MONTH(submitted_at))`
      ];
    } else {
      queries = SUBMISSION_TYPES.map(submissionType => {
        const tableName = getTableName(submissionType);
        let whereConditions = ['YEAR(submitted_at) = ?'];
        
        if (area) whereConditions.push('area LIKE ?');
        if (user) whereConditions.push('user_id = ?');
        
        const whereClause = whereConditions.join(' AND ');
        return `(SELECT MONTH(submitted_at) as month, COUNT(*) as count FROM ${tableName}
                 WHERE ${whereClause}
                 GROUP BY MONTH(submitted_at))`;
      });
    }

    const allParams = type 
      ? params 
      : SUBMISSION_TYPES.map(() => selectedYear).concat(
          Array(SUBMISSION_TYPES.length).fill(null).flatMap(() => 
            params.slice(1)
          )
        );

    const [results] = await pool.execute(
      `SELECT month, SUM(count) as count FROM (${queries.join(' UNION ALL ')}) as data
       GROUP BY month
       ORDER BY month`,
      allParams
    );

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
      year: selectedYear
    });
  } catch (error) {
    console.error('Analytics by month error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Summary stats with filters
router.get('/summary', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { from, to, type, area } = req.query;
    
    const dateClause = buildDateClause(from, to);
    const params = [...dateClause.params];

    let submissionQueries;
    let whereCondition = dateClause.clause;

    if (type && SUBMISSION_TYPES.includes(type)) {
      const tableName = getTableName(type);
      if (area) {
        whereCondition = whereCondition 
          ? `${whereCondition} AND area LIKE ?`
          : 'WHERE area LIKE ?';
        params.push(`%${area}%`);
      }
      submissionQueries = [
        `(SELECT COUNT(*) as count FROM ${tableName} ${whereCondition})`
      ];
    } else {
      submissionQueries = SUBMISSION_TYPES.map(submissionType => {
        const tableName = getTableName(submissionType);
        let condition = whereCondition;
        if (area) {
          condition = condition
            ? `${condition} AND area LIKE ?`
            : 'WHERE area LIKE ?';
        }
        return `(SELECT COUNT(*) as count FROM ${tableName} ${condition})`;
      });
    }

    const allParams = type
      ? params
      : SUBMISSION_TYPES.map(() => 1).flatMap(() => params);

    const [totalResults] = await pool.execute(
      `SELECT SUM(count) as total FROM (${submissionQueries.join(' UNION ALL ')}) as subs`,
      allParams
    );

    const [totalUsers] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "user"'
    );

    res.json({
      totalSubmissions: totalResults[0].total || 0,
      totalUsers: totalUsers[0].count,
      activeTypes: SUBMISSION_TYPES.length
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;
