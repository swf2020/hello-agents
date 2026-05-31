const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb, initDb } = require('../src/db/database');
const path = require('path');

let app;
let token;

beforeEach(async () => {
  const dbPath = path.join(__dirname, '..', 'test.db');
  try { require('fs').unlinkSync(dbPath); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-wal'); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-shm'); } catch (e) { /* ignore */ }
  initDb(dbPath);
  app = createApp(dbPath);

  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'profileuser', password: 'password123', email: 'profile@test.com' });
  token = res.body.token;
});

afterEach(() => {
  const db = getDb();
  if (db) db.close();
});

describe('GET /api/user/profile', () => {
  test('returns user profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('profileuser');
    expect(res.body.email).toBe('profile@test.com');
    expect(res.body).not.toHaveProperty('password');
  });

  test('rejects without auth', async () => {
    const res = await request(app).get('/api/user/profile');

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/user/profile', () => {
  test('updates email', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newemail@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('newemail@test.com');
  });

  test('rejects without auth', async () => {
    const res = await request(app)
      .put('/api/user/profile')
      .send({ email: 'new@test.com' });

    expect(res.status).toBe(401);
  });
});
