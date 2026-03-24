require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

app.use(cors());
app.use(express.json());

// ─── Auth middleware ───────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)'
    ).run(email.toLowerCase().trim(), username.trim(), hash);

    const user = { id: result.lastInsertRowid, email: email.toLowerCase().trim(), username: username.trim() };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const field = err.message.includes('email') ? 'Email' : 'Username';
      res.status(409).json({ error: `${field} already in use` });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!row) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const user = { id: row.id, email: row.email, username: row.username };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

// ─── Hunt / Stand routes ───────────────────────────────────────────────────────
app.get('/api/hunt', authRequired, (req, res) => {
  const hunt = db.prepare('SELECT * FROM hunts WHERE id = 1').get();
  const stand = db.prepare('SELECT * FROM stands WHERE hunt_id = 1').get();

  const occupants = db.prepare(`
    SELECT c.id as checkin_id, c.checked_in_at, c.gps_lat, c.gps_lng,
           u.username, u.id as user_id
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.stand_id = 1 AND c.checked_out_at IS NULL
    ORDER BY c.checked_in_at ASC
  `).all();

  // Check if current user is checked in
  const myCheckin = occupants.find(o => o.user_id === req.user.id) || null;

  // Recent check-in history (last 20)
  const history = db.prepare(`
    SELECT c.id, c.checked_in_at, c.checked_out_at,
           u.username
    FROM checkins c
    JOIN users u ON c.user_id = u.id
    WHERE c.stand_id = 1
    ORDER BY c.checked_in_at DESC
    LIMIT 20
  `).all();

  res.json({ hunt, stand, occupants, myCheckin, history });
});

app.post('/api/stand/checkin', authRequired, (req, res) => {
  const { gps_lat, gps_lng } = req.body;

  // Already checked in?
  const existing = db.prepare(`
    SELECT id FROM checkins
    WHERE user_id = ? AND stand_id = 1 AND checked_out_at IS NULL
  `).get(req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'You are already checked in' });
  }

  const result = db.prepare(`
    INSERT INTO checkins (user_id, stand_id, gps_lat, gps_lng)
    VALUES (?, 1, ?, ?)
  `).run(req.user.id, gps_lat || null, gps_lng || null);

  const checkin = db.prepare('SELECT * FROM checkins WHERE id = ?').get(result.lastInsertRowid);
  res.json({ checkin });
});

app.post('/api/stand/checkout', authRequired, (req, res) => {
  const row = db.prepare(`
    SELECT id FROM checkins
    WHERE user_id = ? AND stand_id = 1 AND checked_out_at IS NULL
  `).get(req.user.id);

  if (!row) {
    return res.status(404).json({ error: 'No active check-in found' });
  }

  db.prepare(`
    UPDATE checkins SET checked_out_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(row.id);

  const checkin = db.prepare('SELECT * FROM checkins WHERE id = ?').get(row.id);
  res.json({ checkin });
});

// ─── Weather proxy (Open-Meteo — no API key required) ─────────────────────────
app.get('/api/weather', authRequired, async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
      `wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,` +
      `precipitation,visibility` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
      `&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API error');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch weather data' });
  }
});

// ─── Serve React build in production ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🦌 Hunting app server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});
