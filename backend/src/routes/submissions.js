const express = require('express');
const { body, query } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requirePasswordReset } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

const SUBMISSION_TYPES = ['depo', 'vendor', 'dealer', 'stall', 'reader', 'ooh'];

// Create submission (any authenticated user)
router.post('/', authenticate, requirePasswordReset, [
  body('type').isIn(SUBMISSION_TYPES),
  body('area').notEmpty().trim(),
  body('personMet').notEmpty().trim(),
  body('accompaniedBy').optional().trim(),
  body('insights').optional().trim(),
  body('campaign').optional().trim(),
  body('discussion').optional().trim(),
  body('outcome').optional().trim(),
  body('phone').optional().trim()
], validate, async (req, res) => {
  try {
    const {
      type,
      area,
      personMet,
      accompaniedBy,
      insights,
      campaign,
      discussion,
      outcome,
      phone
    } = req.body;

    // Phone required for OOH type
    if (type === 'ooh' && !phone) {
      return res.status(400).json({ error: 'Phone number is required for OOH submissions' });
    }

    const [result] = await pool.execute(
      `INSERT INTO submissions 
       (user_id, type, area, person_met, accompanied_by, insights, campaign, discussion, outcome, phone, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        type,
        area,
        personMet,
        accompaniedBy || null,
        insights || null,
        campaign || null,
        discussion || null,
        outcome || null,
        type === 'ooh' ? phone : null
      ]
    );

    await logAudit('SUBMISSION_CREATED', req.user.id, { submissionId: result.insertId, type });

    res.status(201).json({
      id: result.insertId,
      message: 'Submitted successfully'
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Get submissions (admin/ceo with filters)
router.get('/', authenticate, requireRole('admin', 'ceo'), [
  query('type').optional().isIn(SUBMISSION_TYPES),
  query('area').optional().trim(),
  query('user').optional().isInt(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validate, async (req, res) => {
  try {
    const { type, area, user, from, to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('s.type = ?');
      params.push(type);
    }

    if (area) {
      whereConditions.push('s.area LIKE ?');
      params.push(`%${area}%`);
    }

    if (user) {
      whereConditions.push('s.user_id = ?');
      params.push(parseInt(user));
    }

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

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM submissions s ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get submissions with pagination - use String() for LIMIT/OFFSET with execute()
    const [submissions] = await pool.execute(
      `SELECT s.*, u.email as user_email
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    res.json({
      data: submissions.map(s => ({
        id: s.id,
        userId: s.user_id,
        userEmail: s.user_email,
        type: s.type,
        area: s.area,
        personMet: s.person_met,
        accompaniedBy: s.accompanied_by,
        insights: s.insights,
        campaign: s.campaign,
        discussion: s.discussion,
        outcome: s.outcome,
        phone: s.phone,
        submittedAt: s.submitted_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Export submissions as CSV (admin/ceo)
router.get('/export', authenticate, requireRole('admin', 'ceo'), [
  query('type').optional().isIn(SUBMISSION_TYPES),
  query('area').optional().trim(),
  query('user').optional().isInt(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], validate, async (req, res) => {
  try {
    const { type, area, user, from, to } = req.query;

    let whereConditions = [];
    let params = [];

    if (type) {
      whereConditions.push('s.type = ?');
      params.push(type);
    }

    if (area) {
      whereConditions.push('s.area LIKE ?');
      params.push(`%${area}%`);
    }

    if (user) {
      whereConditions.push('s.user_id = ?');
      params.push(parseInt(user));
    }

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

    const [submissions] = await pool.execute(
      `SELECT s.*, u.email as user_email
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.submitted_at DESC`,
      params
    );

    // Build CSV
    const headers = [
      'ID', 'User Email', 'Type', 'Area', 'Person Met', 'Accompanied By',
      'Insights', 'Campaign', 'Discussion', 'Outcome', 'Phone', 'Submitted At'
    ];

    const rows = submissions.map(s => [
      s.id,
      s.user_email,
      s.type,
      `"${(s.area || '').replace(/"/g, '""')}"`,
      `"${(s.person_met || '').replace(/"/g, '""')}"`,
      `"${(s.accompanied_by || '').replace(/"/g, '""')}"`,
      `"${(s.insights || '').replace(/"/g, '""')}"`,
      `"${(s.campaign || '').replace(/"/g, '""')}"`,
      `"${(s.discussion || '').replace(/"/g, '""')}"`,
      `"${(s.outcome || '').replace(/"/g, '""')}"`,
      s.phone || '',
      s.submitted_at
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=submissions-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export submissions' });
  }
});

// Get distinct areas for filter dropdown
router.get('/areas', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const [results] = await pool.execute(
      'SELECT DISTINCT area FROM submissions ORDER BY area'
    );
    res.json(results.map(r => r.area));
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ error: 'Failed to get areas' });
  }
});

module.exports = router;
