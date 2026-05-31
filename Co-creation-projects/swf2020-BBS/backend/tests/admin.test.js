const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb, initDb } = require('../src/db/database');
const path = require('path');

let app;
let userToken;
let adminToken;
let regularUserId;

beforeEach(async () => {
  const dbPath = path.join(__dirname, '..', 'test.db');
  try { require('fs').unlinkSync(dbPath); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-wal'); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-shm'); } catch (e) { /* ignore */ }
  initDb(dbPath);
  app = createApp(dbPath);

  // Create regular user
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'normaluser', password: 'password123', email: 'normal@test.com' });
  userToken = userRes.body.token;
  regularUserId = userRes.body.user.id;

  // Create admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'theadmin', password: 'password123', email: 'admin@test.com' });
  const db = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', adminRes.body.user.id);
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'theadmin', password: 'password123' });
  adminToken = adminLogin.body.token;

  // Create some posts and comments for stats
  await request(app)
    .post('/api/posts')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ title: 'Post 1', content: 'Content 1', category: 'general' });
});

afterEach(() => {
  const db = getDb();
  if (db) db.close();
});

describe('GET /api/admin/stats', () => {
  test('admin can view stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userCount');
    expect(res.body).toHaveProperty('postCount');
    expect(res.body).toHaveProperty('commentCount');
    expect(res.body.userCount).toBe(2);
    expect(res.body.postCount).toBe(1);
  });

  test('rejects non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/users', () => {
  test('admin can list all users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('password');
    expect(res.body[0]).toHaveProperty('username');
    expect(res.body[0]).toHaveProperty('role');
  });

  test('rejects non-admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/admin/users/:id/ban', () => {
  test('admin can ban a user', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${regularUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ banned: true });

    expect(res.status).toBe(200);
    expect(res.body.banned).toBe(1);

    // Banned user cannot login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'normaluser', password: 'password123' });
    expect(loginRes.status).toBe(403);
  });

  test('admin can unban a user', async () => {
    // First ban
    await request(app)
      .put(`/api/admin/users/${regularUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ banned: true });

    // Then unban
    const res = await request(app)
      .put(`/api/admin/users/${regularUserId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ banned: false });

    expect(res.status).toBe(200);
    expect(res.body.banned).toBe(0);
  });

  test('rejects non-admin', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${regularUserId}/ban`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ banned: true });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/posts', () => {
  test('admin can list all posts', async () => {
    const res = await request(app)
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
    expect(res.body.posts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('PUT /api/admin/posts/:id/pin', () => {
  test('admin can pin a post', async () => {
    const postsRes = await request(app)
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${adminToken}`);
    const postId = postsRes.body.posts[0].id;

    const res = await request(app)
      .put(`/api/admin/posts/${postId}/pin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pinned: true });

    expect(res.status).toBe(200);
    expect(res.body.pinned).toBe(1);
  });
});

describe('DELETE /api/admin/comments/:id', () => {
  test('admin can delete any comment', async () => {
    // Create a comment first
    const postsRes = await request(app)
      .get('/api/posts');
    const postId = postsRes.body.posts[0].id;

    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Comment to delete' });

    const res = await request(app)
      .delete(`/api/admin/comments/${commentRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});
