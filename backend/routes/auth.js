const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Username, email, and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'User with that email or username already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, password_hash]
    );
    const user = { id: result.rows[0].id, username, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const tokenUser = { id: user.id, username: user.username, email: user.email };
    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: tokenUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/settings — update username and/or password
router.put('/settings', authenticateToken, async (req, res) => {
  const { username, current_password, new_password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If changing password, verify current password first
    if (new_password) {
      if (!current_password)
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      if (new_password.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid)
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new username is taken
    if (username && username !== user.username) {
      const taken = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (taken.rows.length > 0)
        return res.status(409).json({ error: 'That username is already taken' });
    }

    const newUsername = username || user.username;
    const newHash = new_password ? await bcrypt.hash(new_password, 10) : user.password_hash;

    const updated = await pool.query(
      'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, email',
      [newUsername, newHash, req.user.id]
    );

    // Issue a new token with updated username
    const tokenUser = { id: updated.rows[0].id, username: updated.rows[0].username, email: updated.rows[0].email };
    const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user: tokenUser, token });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
