const express = require('express');
const pool = require('../config/database');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requirePasswordReset } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

const SUBMISSION_TYPES = ['depo', 'vendor', 'dealer', 'stall', 'reader', 'ooh'];

const getTableName = (type) => `submissions_${type}`;

// Create submission
router.post('/', authenticate, requirePasswordReset, async (req, res) => {
  try {
    const { type, area, accompaniedBy, ...otherFields } = req.body;
    const tableName = getTableName(type);

    if (!['depo', 'vendor', 'dealer', 'stall', 'reader', 'ooh'].includes(type)) {
      return res.status(400).json({ error: 'Invalid submission type' });
    }

    const columns = ['user_id', 'area'];
    const values = [req.user.id, area];

    // Only add accompanied_by for types that have it
    if (['depo', 'vendor', 'dealer', 'stall'].includes(type)) {
      columns.push('accompanied_by');
      values.push(accompaniedBy || null);
    }

    // Type-specific field mapping
    if (type === 'depo') {
      columns.push('person_met', 'competition_activity', 'discussion', 'outcome');
      values.push(otherFields.personMet, otherFields.competitionActivity, otherFields.discussion, otherFields.outcome);
    } else if (type === 'vendor') {
      columns.push('vendor_name', 'phone', 'outcome');
      values.push(otherFields.vendorName, otherFields.phone, otherFields.outcome);
    } else if (type === 'dealer') {
      columns.push('dealer_name', 'dues_amount', 'collection_mode', 'collection_amount', 'competition_newspapers', 'discussion', 'outcome');
      values.push(otherFields.dealerName, otherFields.duesAmount || null, otherFields.collectionMode || null, otherFields.collectionAmount || null, JSON.stringify(otherFields.competitionNewspapers || []), otherFields.discussion, otherFields.outcome);
    } else if (type === 'stall') {
      columns.push('stall_owner', 'dues_amount', 'collection_mode', 'collection_amount', 'competition_newspapers', 'discussion', 'outcome');
      values.push(otherFields.stallOwner, otherFields.duesAmount || null, otherFields.collectionMode || null, otherFields.collectionAmount || null, JSON.stringify(otherFields.competitionNewspapers || []), otherFields.discussion, otherFields.outcome);
    } else if (type === 'reader') {
      columns.push('reader_name', 'contact_details', 'present_reading', 'readers_feedback');
      values.push(otherFields.readerName, otherFields.contactDetails, JSON.stringify(otherFields.presentReading || []), otherFields.readersFeedback);
    } else if (type === 'ooh') {
      columns.push('segment', 'contact_person', 'existing_newspaper', 'feedback_suggestion');
      values.push(otherFields.segment, otherFields.contactPerson, JSON.stringify(otherFields.existingNewspaper || []), otherFields.feedbackSuggestion);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}, submitted_at) VALUES (${placeholders}, NOW())`;
    
    const [result] = await pool.execute(query, values);

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

// Get all submissions (admin/ceo)
router.get('/', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { type, area, user, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    let allSubmissions = [];

    // If type is specified, fetch from that table only
    if (type && SUBMISSION_TYPES.includes(type)) {
      const tableName = getTableName(type);
      const whereConditions = [];
      const params = [];

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

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `SELECT s.id, s.user_id, s.area, s.submitted_at, '${type}' as type, u.email as userEmail
         FROM ${tableName} s
         LEFT JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.submitted_at DESC
         LIMIT ${pageLimit} OFFSET ${offset}`;

      const [subs] = await pool.execute(query, params);
      allSubmissions = subs;
    } else {
      // Fetch from all submission tables with filters
      const whereConditions = [];
      const baseParams = [];

      if (area) {
        whereConditions.push('area LIKE ?');
        baseParams.push(`%${area}%`);
      }
      if (user) {
        whereConditions.push('user_id = ?');
        baseParams.push(parseInt(user));
      }
      if (from) {
        whereConditions.push('submitted_at >= ?');
        baseParams.push(from);
      }
      if (to) {
        whereConditions.push('submitted_at <= ?');
        baseParams.push(to + ' 23:59:59');
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const queries = SUBMISSION_TYPES.map(submissionType => 
        `SELECT s.id, s.user_id, s.area, s.submitted_at, '${submissionType}' as type, u.email as userEmail
         FROM ${getTableName(submissionType)} s
         LEFT JOIN users u ON s.user_id = u.id
         ${whereClause}`
      );

      // Replicate baseParams for each query
      const allParams = Array(SUBMISSION_TYPES.length).fill(null).flatMap(() => baseParams);

      const query = `SELECT * FROM (${queries.join(' UNION ALL ')}) as all_subs
         ORDER BY submitted_at DESC
         LIMIT ${pageLimit} OFFSET ${offset}`;

      const [subs] = await pool.execute(query, allParams);
      allSubmissions = subs;
    }

    res.json({
      data: allSubmissions,
      pagination: { page: parseInt(page), limit: pageLimit, total: allSubmissions.length }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get single submission by type and id
router.get('/:type/:id', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!SUBMISSION_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid submission type' });
    }

    const tableName = getTableName(type);
    const [results] = await pool.execute(
      `SELECT s.*, u.email as userEmail, '${type}' as type FROM ${tableName} s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [parseInt(id)]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(results[0]);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to get submission' });
  }
});

// Get areas by submission type
router.get('/areas', authenticate, async (req, res) => {
  try {
    const { type } = req.query;

    let query;
    if (type && SUBMISSION_TYPES.includes(type)) {
      const tableName = getTableName(type);
      query = `SELECT DISTINCT area FROM ${tableName} ORDER BY area`;
      const [results] = await pool.execute(query);
      return res.json(results.map(r => r.area));
    }

    // Get all areas from all tables
    const queries = SUBMISSION_TYPES.map(submissionType => 
      `(SELECT DISTINCT area FROM ${getTableName(submissionType)})`
    );

    const [results] = await pool.execute(
      `SELECT DISTINCT area FROM (${queries.join(' UNION ')}) as all_areas
       ORDER BY area`
    );

    res.json(results.map(r => r.area));
  } catch (error) {
    console.error('Failed to fetch areas:', error);
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
});

module.exports = router;
