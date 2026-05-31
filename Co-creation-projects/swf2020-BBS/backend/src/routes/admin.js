const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Get system stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;

  res.json({ userCount, postCount, commentCount });
});

// List all users
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, email, role, banned, createdAt FROM users ORDER BY id ASC'
  ).all();
  res.json(users);
});

// Ban / unban user
router.put('/users/:id/ban', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { banned } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent banning self
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot ban yourself' });
  }

  const banValue = banned ? 1 : 0;
  db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(banValue, id);

  const updated = db.prepare(
    'SELECT id, username, email, role, banned, createdAt FROM users WHERE id = ?'
  ).get(id);
  res.json(updated);
});

// List all posts (admin view)
router.get('/posts', (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM posts').get();
  const posts = db.prepare(`
    SELECT p.*, u.username as authorName
    FROM posts p
    JOIN users u ON p.authorId = u.id
    ORDER BY p.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    posts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Delete post (admin)
router.delete('/posts/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.status(204).send();
});

// Pin / unpin post
router.put('/posts/:id/pin', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { pinned } = req.body;

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const pinValue = pinned ? 1 : 0;
  db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(pinValue, id);

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  res.json(updated);
});

// Delete comment (admin)
router.delete('/comments/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const comment = db.prepare('SELECT id FROM comments WHERE id = ?').get(id);
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  res.status(204).send();
});

// List all comments (admin view)
router.get('/comments', (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM comments').get();
  const comments = db.prepare(`
    SELECT c.*, u.username as authorName
    FROM comments c
    JOIN users u ON c.authorId = u.id
    ORDER BY c.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    comments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

module.exports = router;
