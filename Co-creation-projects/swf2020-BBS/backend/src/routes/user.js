const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, role, createdAt FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

router.put('/profile', authenticate, (req, res) => {
  const db = getDb();
  const { email } = req.body;

  if (email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
  }

  const user = db.prepare(
    'SELECT id, username, email, role, createdAt FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(user);
});

module.exports = router;
