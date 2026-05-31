const jwt = require('jsonwebtoken');

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const fallback = crypto.randomBytes(32).toString('hex');
  console.warn('[WARNING] JWT_SECRET not set. Using random secret:', fallback);
  console.warn('[WARNING] Tokens will be invalidated on server restart. Set JWT_SECRET in .env for production.');
  return fallback;
})();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticate, requireAdmin, generateToken, JWT_SECRET };
