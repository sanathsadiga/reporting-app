const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const pool = require('../config/database');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// Get all users (admin/ceo only)
router.get('/', authenticate, requireRole('admin', 'ceo'), async (req, res) => {
  try {
    let query = `
      SELECT u.id, u.email, u.role, u.force_password_reset, u.last_login, u.created_at,
             c.email as created_by_email
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
    `;
    const params = [];

    // Admin can only see users they created + their own profile
    if (req.user.role === 'admin') {
      query += ' WHERE u.role = ? OR u.id = ? OR u.created_by = ?';
      params.push('user', req.user.id, req.user.id);
    }

    query += ' ORDER BY u.created_at DESC';

    const [users] = await pool.execute(query, params);

    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      forcePasswordReset: u.force_password_reset === 1,
      lastLogin: u.last_login,
      createdAt: u.created_at,
      createdBy: u.created_by_email
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user (admin/ceo only)
router.post('/', authenticate, requireRole('admin', 'ceo'), [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['user', 'admin']),
  body('tempPassword').isLength({ min: 6 })
], validate, async (req, res) => {
  try {
    const { email, role, tempPassword } = req.body;

    // Only CEO can create admins
    if (role === 'admin' && req.user.role !== 'ceo') {
      return res.status(403).json({ error: 'Only CEO can create admin users' });
    }

    // Check if email already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create user
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, role, force_password_reset, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, NOW(), NOW())`,
      [email, passwordHash, role, req.user.id]
    );

    await logAudit('USER_CREATED', req.user.id, { newUserId: result.insertId, email, role });

    res.status(201).json({
      id: result.insertId,
      email,
      role,
      forcePasswordReset: true,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Reset user password (admin/ceo only)
router.patch('/:id/reset-password', authenticate, requireRole('admin', 'ceo'), [
  param('id').isInt(),
  body('tempPassword').isLength({ min: 6 })
], validate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { tempPassword } = req.body;

    // Get target user
    const [users] = await pool.execute(
      'SELECT id, email, role, created_by FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = users[0];

    // Permission checks
    if (req.user.role === 'admin') {
      // Admin can reset:
      // - Their own password
      // - Any user they created
      // - Any user with role 'user'
      const canReset = 
        targetUser.id === req.user.id ||
        targetUser.created_by === req.user.id ||
        targetUser.role === 'user';

      if (!canReset) {
        return res.status(403).json({ error: 'Cannot reset this user\'s password' });
      }

      // Admin cannot reset another admin's password
      if (targetUser.role === 'admin' && targetUser.id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot reset another admin\'s password' });
      }
    }

    // CEO can reset anyone's password (except changing their own role)
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await pool.execute(
      'UPDATE users SET password_hash = ?, force_password_reset = 1 WHERE id = ?',
      [passwordHash, userId]
    );

    await logAudit('PASSWORD_RESET_BY_ADMIN', req.user.id, { targetUserId: userId });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Update user role (CEO only)
router.patch('/:id/role', authenticate, requireRole('ceo'), [
  param('id').isInt(),
  body('role').isIn(['user', 'admin'])
], validate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    // Cannot change CEO role
    const [users] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role === 'ceo') {
      return res.status(403).json({ error: 'Cannot change CEO role' });
    }

    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    await logAudit('ROLE_CHANGED', req.user.id, { targetUserId: userId, newRole: role });

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete user (CEO only)
router.delete('/:id', authenticate, requireRole('ceo'), [
  param('id').isInt()
], validate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot delete CEO
    const [users] = await pool.execute(
      'SELECT id, role, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role === 'ceo') {
      return res.status(403).json({ error: 'Cannot delete CEO account' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    await logAudit('USER_DELETED', req.user.id, { deletedUserId: userId, email: users[0].email });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
