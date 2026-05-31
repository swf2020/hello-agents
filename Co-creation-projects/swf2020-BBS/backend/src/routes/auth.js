const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/auth/github/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Username, password, and email are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)'
  ).run(username, hashedPassword, email);

  const user = db.prepare(
    'SELECT id, username, email, role, createdAt FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  const token = generateToken(user);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !user.password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.banned) {
    return res.status(403).json({ error: 'Account has been banned' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const { password: _, ...userWithoutPassword } = user;
  const token = generateToken(userWithoutPassword);
  res.json({ token, user: userWithoutPassword });
});

// GitHub OAuth — initiate
router.get('/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: 'user:email',
    state,
  });
  // Store state in a cookie for CSRF validation
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GitHub OAuth — callback
router.get('/github/callback', async (req, res) => {
  const { code, state, error: ghError } = req.query;

  if (ghError) {
    return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(ghError)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Missing authorization code')}`);
  }

  // Validate state to prevent CSRF
  const cookieState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state');
  if (!state || state !== cookieState) {
    return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Invalid state parameter')}`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(tokenData.error_description || 'OAuth token exchange failed')}`);
    }
    const accessToken = tokenData.access_token;

    // Fetch GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'bbs-app' },
    });
    const ghUser = await userRes.json();

    // Fetch emails
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'bbs-app' },
    });
    const emails = await emailRes.json();
    const primaryEmail = Array.isArray(emails)
      ? emails.find(e => e.primary)?.email || emails[0]?.email
      : null;
    const email = ghUser.email || primaryEmail;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('No verified email on GitHub account. Please add an email to your GitHub account.')}`);
    }

    const db = getDb();

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE github_id = ?').get(ghUser.id);
    let isNew = false;

    if (!user) {
      const emailUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (emailUser) {
        if (emailUser.github_id && emailUser.github_id !== ghUser.id) {
          return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Email already linked to a different GitHub account')}`);
        }
        // Link GitHub to existing account
        db.prepare('UPDATE users SET github_id = ?, avatar_url = ? WHERE id = ?')
          .run(ghUser.id, ghUser.avatar_url, emailUser.id);
        user = db.prepare('SELECT id, username, email, role, banned, github_id, avatar_url, createdAt FROM users WHERE id = ?')
          .get(emailUser.id);
      }
    } else {
      // Update avatar on each login
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(ghUser.avatar_url, user.id);
      user = db.prepare('SELECT id, username, email, role, banned, github_id, avatar_url, createdAt FROM users WHERE id = ?')
        .get(user.id);
    }

    if (!user) {
      // Create new user
      let username = ghUser.login;
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        username = `${ghUser.login}_gh`;
      }
      const result = db.prepare(
        'INSERT INTO users (username, password, email, github_id, avatar_url) VALUES (?, NULL, ?, ?, ?)'
      ).run(username, email, ghUser.id, ghUser.avatar_url);
      user = db.prepare('SELECT id, username, email, role, banned, github_id, avatar_url, createdAt FROM users WHERE id = ?')
        .get(result.lastInsertRowid);
      isNew = true;
    }

    if (user.banned) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Account has been banned')}`);
    }

    // Generate single-use code instead of putting JWT in URL
    const oauthCode = crypto.randomUUID();
    db.prepare('INSERT INTO oauth_codes (code, userId, expiresAt) VALUES (?, ?, ?)')
      .run(oauthCode, user.id, new Date(Date.now() + 5 * 60 * 1000).toISOString());

    res.redirect(`${FRONTEND_URL}/auth/callback?code=${oauthCode}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Internal server error')}`);
  }
});

// Exchange OAuth code for JWT
router.post('/github/exchange', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const db = getDb();
  const entry = db.prepare('SELECT * FROM oauth_codes WHERE code = ?').get(code);
  if (!entry) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }

  // Single-use: delete immediately
  db.prepare('DELETE FROM oauth_codes WHERE code = ?').run(code);

  if (new Date(entry.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'Code has expired' });
  }

  const user = db.prepare('SELECT id, username, email, role, banned, github_id, avatar_url, createdAt FROM users WHERE id = ?')
    .get(entry.userId);

  if (!user || user.banned) {
    return res.status(401).json({ error: 'Account not available' });
  }

  const token = generateToken(user);
  res.json({ token, user });
});

module.exports = router;
