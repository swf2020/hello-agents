const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb, initDb } = require('../src/db/database');
const path = require('path');

let app;
let userToken;
let adminToken;

beforeEach(async () => {
  const dbPath = path.join(__dirname, '..', 'test.db');
  // Clean up previous test data (WAL mode persists data across connections)
  try { require('fs').unlinkSync(dbPath); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-wal'); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-shm'); } catch (e) { /* ignore */ }
  initDb(dbPath);
  app = createApp(dbPath);

  // Create regular user
  const userRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'postuser', password: 'password123', email: 'post@test.com' });
  userToken = userRes.body.token;

  // Create admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'postadmin', password: 'password123', email: 'padmin@test.com' });
  // Manually set admin role
  const db = getDb();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', adminRes.body.user.id);
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'postadmin', password: 'password123' });
  adminToken = adminLogin.body.token;
});

afterEach(() => {
  const db = getDb();
  if (db) db.close();
});

describe('POST /api/posts', () => {
  test('creates post when authenticated', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Test Post', content: 'Hello world', category: 'general' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Post');
    expect(res.body.content).toBe('Hello world');
    expect(res.body.category).toBe('general');
    expect(res.body.authorId).toBeDefined();
  });

  test('rejects without auth', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ title: 'Test Post', content: 'Hello world', category: 'general' });

    expect(res.status).toBe(401);
  });

  test('rejects missing title or content', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Only Title' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/posts', () => {
  beforeEach(async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: `Post ${i}`, content: `Content ${i}`, category: i % 2 === 0 ? 'tech' : 'general' });
    }
  });

  test('returns paginated posts', async () => {
    const res = await request(app).get('/api/posts?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(3);
  });

  test('filters by category', async () => {
    const res = await request(app).get('/api/posts?category=tech');

    expect(res.status).toBe(200);
    expect(res.body.posts.every(p => p.category === 'tech')).toBe(true);
  });

  test('default pagination values', async () => {
    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeLessThanOrEqual(20);
  });
});

describe('GET /api/posts/:id', () => {
  let postId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Detail Post', content: 'Detail content', category: 'general' });
    postId = res.body.id;
  });

  test('returns post with author', async () => {
    const res = await request(app).get(`/api/posts/${postId}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Detail Post');
    expect(res.body.author).toBeDefined();
    expect(res.body.author.username).toBeDefined();
  });

  test('returns 404 for non-existent post', async () => {
    const res = await request(app).get('/api/posts/99999');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/posts/:id', () => {
  let postId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Edit Post', content: 'Original', category: 'general' });
    postId = res.body.id;
  });

  test('author can edit own post', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Edited Title', content: 'Edited content' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Edited Title');
  });

  test('admin can edit any post', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Admin Edit', content: 'Admin edited' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Admin Edit');
  });

  test('rejects edit without auth', async () => {
    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/posts/:id', () => {
  let postId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Delete Me', content: 'To be deleted', category: 'general' });
    postId = res.body.id;
  });

  test('author can delete own post', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(204);
  });

  test('admin can delete any post', async () => {
    // Create another user's post
    const otherRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'otheruser', password: 'password123', email: 'other@test.com' });
    const otherPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${otherRes.body.token}`)
      .send({ title: 'Other Post', content: 'Other content', category: 'general' });

    const res = await request(app)
      .delete(`/api/posts/${otherPost.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  test('rejects delete without auth', async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/posts/:id/comments', () => {
  let postId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Comment Post', content: 'For comments', category: 'general' });
    postId = res.body.id;
  });

  test('creates comment when authenticated', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Nice post!' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Nice post!');
    expect(res.body.postId).toBe(postId);
    expect(res.body.authorId).toBeDefined();
  });

  test('rejects empty comment', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  test('rejects without auth', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .send({ content: 'No auth comment' });

    expect(res.status).toBe(401);
  });

  test('returns comments with post detail', async () => {
    await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Comment 1' });

    await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Comment 2' });

    const res = await request(app).get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments[0]).toHaveProperty('author');
  });
});
