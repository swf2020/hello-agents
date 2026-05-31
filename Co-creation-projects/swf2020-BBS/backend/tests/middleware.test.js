const jwt = require('jsonwebtoken');
const { authenticate, requireAdmin, JWT_SECRET } = require('../src/middleware/auth');

// Mock Express req/res objects
function mockReq(headers = {}, params = {}) {
  return { headers, params, user: null };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  test('calls next() with valid token', () => {
    const token = jwt.sign({ id: 1, username: 'test', role: 'user' }, JWT_SECRET);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
    expect(req.user.username).toBe('test');
  });

  test('returns 401 with no auth header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
  });

  test('returns 401 with invalid token', () => {
    const req = mockReq({ authorization: 'Bearer invalidtoken' });
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 with malformed header', () => {
    const req = mockReq({ authorization: 'NotBearer token' });
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireAdmin middleware', () => {
  test('calls next() for admin user', () => {
    const req = { user: { id: 1, username: 'admin', role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('returns 403 for regular user', () => {
    const req = { user: { id: 2, username: 'user', role: 'user' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 401 when no user on request', () => {
    const req = { user: null };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
