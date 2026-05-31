const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all posts (paginated, with optional category filter)
router.get('/', (req, res) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { category } = req.query;

  let countSql = 'SELECT COUNT(*) as total FROM posts';
  let sql = `
    SELECT p.*, u.username as authorName
    FROM posts p
    JOIN users u ON p.authorId = u.id
  `;
  const params = [];

  if (category) {
    const where = ' WHERE category = ?';
    countSql += where;
    sql += ' WHERE p.category = ?';
    params.push(category);
  }

  sql += ' ORDER BY p.pinned DESC, p.createdAt DESC LIMIT ? OFFSET ?';

  const { total } = db.prepare(countSql).get(...params);
  const posts = db.prepare(sql).all(...params, limit, offset);

  res.json({
    posts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Get post by ID with comments
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const post = db.prepare(`
    SELECT p.*, u.username as authorName
    FROM posts p
    JOIN users u ON p.authorId = u.id
    WHERE p.id = ?
  `).get(id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const comments = db.prepare(`
    SELECT c.*, u.username as authorName
    FROM comments c
    JOIN users u ON c.authorId = u.id
    WHERE c.postId = ?
    ORDER BY c.createdAt ASC
  `).all(id);

  const formattedComments = comments.map(c => ({
    id: c.id,
    content: c.content,
    postId: c.postId,
    authorId: c.authorId,
    createdAt: c.createdAt,
    author: { id: c.authorId, username: c.authorName },
  }));

  res.json({
    ...post,
    author: { id: post.authorId, username: post.authorName },
    comments: formattedComments,
  });
});

// Create post (auth required)
router.post('/', authenticate, (req, res) => {
  const db = getDb();
  const { title, content, category } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be 200 characters or less' });
  }
  if (content.length > 10000) {
    return res.status(400).json({ error: 'Content must be 10000 characters or less' });
  }

  const result = db.prepare(
    'INSERT INTO posts (title, content, authorId, category) VALUES (?, ?, ?, ?)'
  ).run(title, content, req.user.id, category || 'general');

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(post);
});

// Update post (author or admin)
router.put('/:id', authenticate, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { title, content, category } = req.body;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this post' });
  }

  db.prepare(`
    UPDATE posts SET title = ?, content = ?, category = ? WHERE id = ?
  `).run(
    title || post.title,
    content || post.content,
    category || post.category,
    id
  );

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  res.json(updated);
});

// Delete post (author or admin)
router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.status(204).send();
});

// Add comment to post (auth required)
router.post('/:id/comments', authenticate, (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ error: 'Comment must be 5000 characters or less' });
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const result = db.prepare(
    'INSERT INTO comments (content, postId, authorId) VALUES (?, ?, ?)'
  ).run(content, id, req.user.id);

  const comment = db.prepare(`
    SELECT c.*, u.username as authorName
    FROM comments c
    JOIN users u ON c.authorId = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({
    ...comment,
    author: { id: comment.authorId, username: comment.authorName },
  });
});

module.exports = router;
