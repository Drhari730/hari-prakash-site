// Real email sending for Vritta meeting invitations and minutes.
// Uses SMTP credentials from environment variables (never hard-coded):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (required)
//   SMTP_FROM   (optional "Name <email>" — defaults to SMTP_USER)
//   SMTP_SECURE (optional "true"/"false" — defaults to true when port 465)
// For a Gmail account: SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=<your gmail>,
// SMTP_PASS=<16-char Google App Password> (not the normal password).
const nodemailer = require('nodemailer');

// Host defaults to Gmail, so the user only needs to set SMTP_USER + SMTP_PASS.
function smtpHost() { return process.env.SMTP_HOST || 'smtp.gmail.com'; }

function isConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  return nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Build a UTC timestamp for ICS from a date (YYYY-MM-DD) and a free-text time.
function icsStamp(dateStr, timeStr) {
  let hour = 10, min = 0;
  const m = String(timeStr || '').match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (m) {
    hour = parseInt(m[1], 10); min = parseInt(m[2], 10);
    const mer = (m[3] || '').toLowerCase();
    if (mer === 'pm' && hour < 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
  } else {
    const m2 = String(timeStr || '').match(/(\d{1,2})\s*(am|pm)/i);
    if (m2) { hour = parseInt(m2[1], 10); const mer = m2[2].toLowerCase(); if (mer === 'pm' && hour < 12) hour += 12; if (mer === 'am' && hour === 12) hour = 0; }
  }
  const [y, mo, d] = String(dateStr || '').split('-').map(Number);
  if (!y || !mo || !d) return null;
  // Treat entered time as IST (UTC+5:30) and convert to UTC for the calendar.
  const dt = new Date(Date.UTC(y, mo - 1, d, hour, min) - (5.5 * 3600 * 1000));
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}

function buildIcs({ title, date, time, venue, description, organizer, attendees }) {
  const start = icsStamp(date, time);
  if (!start) return null;
  const startNum = start.replace(/[TZ]/g, '');
  // default 1-hour meeting
  const sd = new Date(Date.UTC(
    +startNum.slice(0, 4), +startNum.slice(4, 6) - 1, +startNum.slice(6, 8),
    +startNum.slice(8, 10), +startNum.slice(10, 12)
  ));
  const ed = new Date(sd.getTime() + 60 * 60 * 1000);
  const end = `${ed.getUTCFullYear()}${pad(ed.getUTCMonth() + 1)}${pad(ed.getUTCDate())}T${pad(ed.getUTCHours())}${pad(ed.getUTCMinutes())}00Z`;
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vritta//RUAS//EN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${stamp}-${Math.random().toString(36).slice(2)}@vritta`,
    `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${esc(title)}`,
    venue ? `LOCATION:${esc(venue)}` : '',
    description ? `DESCRIPTION:${esc(description)}` : '',
    organizer ? `ORGANIZER;CN=${esc(organizer)}:mailto:${fromAddress().replace(/.*<|>.*/g, '')}` : '',
    ...(attendees || []).map(a => `ATTENDEE;CN=${esc(a.name || a.email)};RSVP=TRUE:mailto:${a.email}`),
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

async function send({ to, subject, html, ics, attachments }) {
  if (!isConfigured()) {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !process.env[k]);
    const err = new Error('Email is not configured on the server. Missing: ' + missing.join(', '));
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  const mailAttachments = attachments ? attachments.slice() : [];
  if (ics) {
    mailAttachments.push({
      filename: 'invite.ics',
      content: ics,
      contentType: 'text/calendar; method=REQUEST; charset=UTF-8'
    });
  }
  const info = await transporter().sendMail({
    from: fromAddress(),
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    attachments: mailAttachments
  });
  return { messageId: info.messageId, accepted: info.accepted || [], rejected: info.rejected || [] };
}

module.exports = { isConfigured, send, buildIcs, fromAddress };
