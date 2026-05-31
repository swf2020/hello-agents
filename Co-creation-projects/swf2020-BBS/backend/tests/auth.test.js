const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb, initDb } = require('../src/db/database');
const path = require('path');

let app;

beforeEach(() => {
  const dbPath = path.join(__dirname, '..', 'test.db');
  try { require('fs').unlinkSync(dbPath); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-wal'); } catch (e) { /* ignore */ }
  try { require('fs').unlinkSync(dbPath + '-shm'); } catch (e) { /* ignore */ }
  initDb(dbPath);
  app = createApp(dbPath);
});

afterEach(() => {
  const db = getDb();
  if (db) db.close();
});

describe('POST /api/auth/register', () => {
  test('registers a new user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password123', email: 'test@test.com' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupe', password: 'password123', email: 'a@test.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupe', password: 'password123', email: 'b@test.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Username');
  });

  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test' });

    expect(res.status).toBe(400);
  });

  test('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: '12345', email: 'test@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.toLowerCase()).toContain('password');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'password123', email: 'login@test.com' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('loginuser');
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('rejects non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' });

    expect(res.status).toBe(401);
  });
});
