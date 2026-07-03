require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const store = require('./lib/store');
const auth = require('./lib/auth');
const { generateCvPdf } = require('./cv-pdf');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ---- Public read API (no secrets in content.json) ----
app.get('/api/content', (req, res) => {
  res.json(store.readContent());
});

app.get('/cv.pdf', (req, res) => {
  const content = store.readContent();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${content.profile.name.replace(/\s+/g, '_')}_CV.pdf"`);
  generateCvPdf(content, res);
});

// ---- Admin auth ----
app.post('/api/admin/login', async (req, res) => {
  const ip = req.ip;
  const rl = auth.checkRateLimit(ip);
  if (rl.blocked) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  const { email, password } = req.body || {};
  const ok = email === process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD_HASH &&
    await auth.verifyPassword(password || '', process.env.ADMIN_PASSWORD_HASH);
  if (!ok) {
    auth.recordFailure(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  auth.clearFailures(ip);
  const token = auth.signToken(email);
  auth.setAuthCookie(res, token);
  res.json({ ok: true, email });
});

app.post('/api/admin/logout', (req, res) => {
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', auth.requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

app.put('/api/admin/content/:section', auth.requireAdmin, (req, res) => {
  try {
    const updated = store.writeSection(req.params.section, req.body);
    res.json(updated[req.params.section]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---- Static assets ----
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ---- Public site (server-injects current content as JSON) ----
app.get('/', (req, res) => {
  const content = store.readContent();
  const template = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  const html = template.replace(
    '"__SITE_DATA__"',
    JSON.stringify(content).replace(/</g, '\\u003c')
  );
  res.send(html);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
