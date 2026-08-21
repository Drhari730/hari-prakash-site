require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const store = require('./lib/store');
const auth = require('./lib/auth');
const meetings = require('./lib/meetings');
const mailer = require('./lib/mailer');
const { generateCvPdf } = require('./cv-pdf');
const { buildFromCrossref } = require('./lib/citation');

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

// Look up a publication by DOI (or free-text) via the free CrossRef API and return
// auto-filled structured fields + Vancouver/APA/Harvard formatted citations.
const DOI_RE = /10\.\d{4,9}\/[^\s"'<>]+/i;
app.get('/api/admin/lookup', auth.requireAdmin, async (req, res) => {
  const raw = (req.query.q || '').trim();
  if (!raw) return res.status(400).json({ error: 'Provide a DOI or title.' });
  try {
    const mailto = process.env.ADMIN_EMAIL || 'admin@example.com';
    const headers = { 'User-Agent': `HariPrakashSite/1.0 (mailto:${mailto})` };
    const doiMatch = raw.match(DOI_RE);
    let message;
    if (doiMatch) {
      const doi = doiMatch[0].replace(/[).,;]+$/, '');
      const r = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers });
      if (!r.ok) return res.status(404).json({ error: 'DOI not found on CrossRef.' });
      message = (await r.json()).message;
    } else {
      const r = await fetch(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(raw)}&rows=1`, { headers });
      if (!r.ok) return res.status(404).json({ error: 'No match found.' });
      const items = ((await r.json()).message || {}).items || [];
      if (!items.length) return res.status(404).json({ error: 'No match found for that query.' });
      message = items[0];
    }
    res.json(buildFromCrossref(message));
  } catch (err) {
    res.status(502).json({ error: 'Lookup service unavailable. Check your connection and try again.' });
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

// ---- Vritta: meeting recorder, minutes, account journal & email invites ----
app.get(['/vritta', '/vritta/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vritta', 'index.html'));
});

// Whether server-side email is configured (so the UI can show/hide the feature).
app.get('/api/vritta/config', (req, res) => {
  res.json({ emailConfigured: mailer.isConfigured() });
});

// Meeting journal — persisted under the admin account (requires login).
app.get('/api/vritta/meetings', auth.requireAdmin, (req, res) => {
  res.json(meetings.list());
});

app.get('/api/vritta/meetings/:id', auth.requireAdmin, (req, res) => {
  const m = meetings.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  res.json(m);
});

app.post('/api/vritta/meetings', auth.requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    if (!body.id) return res.status(400).json({ error: 'Meeting id is required' });
    if (!body.title || !String(body.title).trim()) return res.status(400).json({ error: 'Meeting title is required' });
    const saved = meetings.upsert(body);
    res.json({ ok: true, id: saved.id, savedAt: saved.savedAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/vritta/meetings/:id', auth.requireAdmin, (req, res) => {
  const removed = meetings.remove(req.params.id);
  res.json({ ok: removed });
});

// Send a meeting invitation and/or minutes by email (real SMTP).
app.post('/api/vritta/invite', auth.requireAdmin, async (req, res) => {
  try {
    const { recipients, subject, html, meeting, withInvite } = req.body || {};
    const to = (recipients || []).map(r => String(r).trim()).filter(Boolean);
    if (!to.length) return res.status(400).json({ error: 'Add at least one recipient email address.' });
    if (!subject || !html) return res.status(400).json({ error: 'Subject and message body are required.' });
    if (!mailer.isConfigured()) {
      return res.status(503).json({
        code: 'NOT_CONFIGURED',
        error: 'Email is not configured on the server. Set SMTP_USER and SMTP_PASS in the Railway project variables.'
      });
    }

    let ics = null;
    if (withInvite && meeting && meeting.date) {
      ics = mailer.buildIcs({
        title: meeting.title || 'Meeting',
        date: meeting.date,
        time: meeting.time,
        venue: meeting.venue,
        description: meeting.summary || '',
        organizer: meeting.chair || req.admin.email,
        attendees: to.map(email => ({ email }))
      });
    }

    const result = await mailer.send({ to, subject, html, ics });
    res.json({
      ok: true,
      accepted: result.accepted,
      rejected: result.rejected,
      messageId: result.messageId
    });
  } catch (err) {
    const status = err.code === 'NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({ error: err.message, code: err.code || null });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Persistence sanity check: this MUST point at the mounted volume in production
  // (e.g. /data) or admin edits are written to ephemeral disk and lost on redeploy.
  console.log(`[persistence] DATA_DIR=${store.DATA_DIR} -> content file at ${store.CONTENT_PATH}`);
});
