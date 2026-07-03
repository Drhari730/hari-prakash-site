const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONTENT_PATH = path.join(DATA_DIR, 'content.json');
const SEED_PATH = path.join(__dirname, '..', 'data', 'content.seed.json');

const SECTIONS = [
  'profile', 'about', 'education', 'skills', 'affiliations',
  'positions', 'grants', 'patent', 'inventions', 'ncdSuite',
  'publications', 'conferences', 'teaching'
];

function ensureContentFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONTENT_PATH)) {
    fs.copyFileSync(SEED_PATH, CONTENT_PATH);
  }
}

function readContent() {
  ensureContentFile();
  return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf-8'));
}

function writeSection(section, value) {
  if (!SECTIONS.includes(section)) {
    throw new Error(`Unknown content section: ${section}`);
  }
  const content = readContent();
  content[section] = value;
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2));
  return content;
}

module.exports = { readContent, writeSection, SECTIONS, DATA_DIR, CONTENT_PATH };
