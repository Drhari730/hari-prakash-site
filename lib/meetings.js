// Persistent store for Vritta meeting records.
// Saved as JSON on the same mounted volume (DATA_DIR, e.g. /data on Railway)
// used for site content, so records survive redeploys.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MEETINGS_PATH = path.join(DATA_DIR, 'vritta-meetings.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEETINGS_PATH)) fs.writeFileSync(MEETINGS_PATH, '[]');
}

function readAll() {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(MEETINGS_PATH, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  ensureFile();
  fs.writeFileSync(MEETINGS_PATH, JSON.stringify(list, null, 2));
}

function list() {
  // Newest first, without the (potentially large) transcript segments.
  return readAll()
    .map(({ segments, ...rest }) => ({
      ...rest,
      wordCount: (segments || []).reduce((n, s) => n + String(s.text || '').split(/\s+/).filter(Boolean).length, 0)
    }))
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

function get(id) {
  return readAll().find(m => m.id === id) || null;
}

function upsert(meeting) {
  if (!meeting || !meeting.id) throw new Error('Meeting id is required');
  const all = readAll();
  const idx = all.findIndex(m => m.id === meeting.id);
  meeting.savedAt = Date.now();
  if (idx >= 0) all[idx] = meeting; else all.unshift(meeting);
  writeAll(all);
  return meeting;
}

function remove(id) {
  const all = readAll();
  const next = all.filter(m => m.id !== id);
  writeAll(next);
  return next.length !== all.length;
}

module.exports = { list, get, upsert, remove, MEETINGS_PATH };
