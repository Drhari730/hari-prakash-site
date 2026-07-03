const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'hp_admin_token';
const JWT_SECRET = process.env.JWT_SECRET;

// Simple in-memory brute-force guard: 5 failed attempts per IP locks out for 15 minutes.
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    return { blocked: false };
  }
  return { blocked: rec.count >= MAX_ATTEMPTS, retryAfterMs: rec.first + WINDOW_MS - now };
}

function recordFailure(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
  } else {
    rec.count += 1;
  }
}

function clearFailures(ip) {
  attempts.delete(ip);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.admin = payload;
  next();
}

module.exports = {
  COOKIE_NAME, checkRateLimit, recordFailure, clearFailures,
  verifyPassword, signToken, verifyToken, setAuthCookie, clearAuthCookie, requireAdmin
};
