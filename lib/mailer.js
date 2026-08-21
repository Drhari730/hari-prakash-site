// Real email sending for Vritta — uses Resend, the same service ScholarDesk uses.
// Configure with the same environment variables as ScholarDesk:
//   RESEND_API_KEY   (required)   — your Resend API key
//   EMAIL_FROM       (optional)   — e.g. "Vritta <notify@yourdomain>"; defaults to
//                                   Resend's shared onboarding sender.
const { Resend } = require('resend');

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress() {
  return process.env.EMAIL_FROM || 'Vritta <onboarding@resend.dev>';
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

function fromEmailOnly() {
  const m = fromAddress().match(/<([^>]+)>/);
  return m ? m[1] : fromAddress();
}

function buildIcs({ title, date, time, venue, description, organizer, attendees }) {
  const start = icsStamp(date, time);
  if (!start) return null;
  const startNum = start.replace(/[TZ]/g, '');
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
    organizer ? `ORGANIZER;CN=${esc(organizer)}:mailto:${fromEmailOnly()}` : '',
    ...(attendees || []).map(a => `ATTENDEE;CN=${esc(a.name || a.email)};RSVP=TRUE:mailto:${a.email}`),
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

async function send({ to, subject, html, ics }) {
  if (!isConfigured()) {
    const err = new Error('Email is not configured on the server. Set RESEND_API_KEY (and optionally EMAIL_FROM).');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const recipients = Array.isArray(to) ? to : [to];
  const attachments = ics
    ? [{ filename: 'invite.ics', content: Buffer.from(ics, 'utf-8').toString('base64') }]
    : undefined;

  const accepted = [];
  const rejected = [];
  let lastId = null;
  let lastError = null;

  // Send individually so recipients don't see each other's addresses.
  for (const r of recipients) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress(),
        to: [r],
        subject,
        html,
        attachments
      });
      if (error) { rejected.push(r); lastError = error; }
      else { accepted.push(r); lastId = data && data.id; }
    } catch (e) {
      rejected.push(r); lastError = e;
    }
  }

  if (!accepted.length) {
    const err = new Error((lastError && (lastError.message || lastError.name)) || 'Resend rejected all recipients.');
    err.code = 'SEND_FAILED';
    throw err;
  }
  return { messageId: lastId, accepted, rejected };
}

module.exports = { isConfigured, send, buildIcs, fromAddress };
