let CONTENT = null;

const SECTION_CONFIGS = {
  publications: {
    label: 'Publications', kind: 'list',
    fields: [
      { key: 'title', label: 'Title', type: 'textarea' },
      { key: 'authors', label: 'Authors', type: 'text' },
      { key: 'journal', label: 'Journal', type: 'text' },
      { key: 'year', label: 'Year', type: 'text' },
      { key: 'vol', label: 'Volume/pages (optional)', type: 'text' },
      { key: 'doi', label: 'DOI (optional, no prefix)', type: 'text' },
      { key: 'cat', label: 'Category', type: 'select', options: ['oncology', 'digital', 'ncd', 'dental', 'mededu'] }
    ],
    blank: { title: '', authors: '', journal: '', year: '', vol: '', doi: '', cat: 'oncology' }
  },
  inventions: {
    label: 'Inventions & Tools', kind: 'list',
    fields: [
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['live', 'development', 'planned', 'prototype'] },
      { key: 'badge', label: 'Badge text (e.g. "Web-based")', type: 'text' },
      { key: 'link', label: 'Link (optional)', type: 'text' }
    ],
    blank: { icon: '🔧', name: '', desc: '', status: 'development', badge: '', link: '' }
  },
  ncdSuite: {
    label: 'NCD Suite', kind: 'list',
    fields: [
      { key: 'condition', label: 'Condition', type: 'text' },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
      { key: 'name', label: 'App name', type: 'text' },
      { key: 'desc', label: 'Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: ['live', 'development', 'planned'] },
      { key: 'link', label: 'Link (optional)', type: 'text' }
    ],
    blank: { condition: '', icon: '🩺', name: '', desc: '', status: 'development', link: '' }
  },
  education: {
    label: 'Education / Qualifications', kind: 'list',
    fields: [
      { key: 'degree', label: 'Degree', type: 'text' },
      { key: 'institution', label: 'Institution', type: 'text' },
      { key: 'years', label: 'Years', type: 'text' },
      { key: 'thesis', label: 'Thesis (optional)', type: 'text' }
    ],
    blank: { degree: '', institution: '', years: '', thesis: '' }
  },
  positions: {
    label: 'Positions', kind: 'list',
    fields: [
      { key: 'years', label: 'Years', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'org', label: 'Organisation', type: 'text' },
      { key: 'bullets', label: 'Bullet points (one per line)', type: 'lines' }
    ],
    blank: { years: '', role: '', org: '', bullets: [] }
  },
  grants: {
    label: 'Grants & Fellowships', kind: 'list',
    fields: [
      { key: 'amount', label: 'Amount', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'desc', label: 'Description', type: 'text' },
      { key: 'years', label: 'Years', type: 'text' }
    ],
    blank: { amount: '', name: '', desc: '', years: '' }
  },
  conferences: {
    label: 'Conference Presentations', kind: 'list',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['oral', 'poster', 'prototype', 'paper'] },
      { key: 'title', label: 'Title', type: 'textarea' },
      { key: 'event', label: 'Event', type: 'text' },
      { key: 'award', label: 'Award (optional)', type: 'text' }
    ],
    blank: { type: 'oral', title: '', event: '', award: '' }
  }
};

function fieldInput(section, idx, field, value) {
  const id = `${section}-${idx}-${field.key}`;
  if (field.type === 'textarea') {
    return `<label for="${id}">${field.label}</label><textarea id="${id}" data-key="${field.key}">${esc(value)}</textarea>`;
  }
  if (field.type === 'lines') {
    return `<label for="${id}">${field.label}</label><textarea id="${id}" data-key="${field.key}">${esc((value || []).join('\n'))}</textarea>`;
  }
  if (field.type === 'select') {
    return `<label for="${id}">${field.label}</label><select id="${id}" data-key="${field.key}">${field.options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  }
  return `<label for="${id}">${field.label}</label><input id="${id}" data-key="${field.key}" value="${esc(value)}">`;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderListSection(section) {
  const cfg = SECTION_CONFIGS[section];
  const items = CONTENT[section];
  return `
    <div class="section-block" data-section="${section}">
      <h3>${cfg.label}</h3>
      <div class="hint">${items.length} item(s). Edit fields below, add new entries, or delete. Click "Save section" when done.</div>
      <div class="items-wrap">
        ${items.map((item, idx) => `
          <div class="item-card" data-idx="${idx}">
            <button class="del-btn" data-action="delete" data-idx="${idx}">×</button>
            ${cfg.fields.map(f => fieldInput(section, idx, f, item[f.key])).join('')}
          </div>
        `).join('')}
      </div>
      <div class="btn-row">
        <button class="add-btn" data-action="add">+ Add new</button>
        <button class="save-btn" data-action="save">Save section</button>
        <span class="save-msg"></span>
      </div>
    </div>
  `;
}

function collectListSection(section) {
  const cfg = SECTION_CONFIGS[section];
  const block = document.querySelector(`.section-block[data-section="${section}"]`);
  const cards = block.querySelectorAll('.item-card');
  const items = [];
  cards.forEach(card => {
    const item = {};
    cfg.fields.forEach(f => {
      const el = card.querySelector(`[data-key="${f.key}"]`);
      if (f.type === 'lines') {
        item[f.key] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
      } else {
        item[f.key] = el.value;
      }
    });
    items.push(item);
  });
  return items;
}

async function saveSection(section, value) {
  const res = await fetch(`/api/admin/content/${section}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error('Save failed');
  return res.json();
}

function wireListSection(section) {
  const block = document.querySelector(`.section-block[data-section="${section}"]`);
  block.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    if (action === 'add') {
      CONTENT[section].push({ ...SECTION_CONFIGS[section].blank });
      renderPanel(section);
    } else if (action === 'delete') {
      const idx = Number(e.target.dataset.idx);
      CONTENT[section] = collectListSection(section);
      CONTENT[section].splice(idx, 1);
      renderPanel(section);
    } else if (action === 'save') {
      CONTENT[section] = collectListSection(section);
      const msg = block.querySelector('.save-msg');
      try {
        await saveSection(section, CONTENT[section]);
        msg.textContent = 'Saved ✓';
        setTimeout(() => { msg.textContent = ''; }, 2500);
      } catch {
        msg.textContent = 'Error saving';
      }
    }
  });
}

// Simpler editors for irregular objects: teaching, about, profile (string-list + text fields)
function renderTeachingPanel() {
  const t = CONTENT.teaching;
  return `
    <div class="section-block" data-section="teaching">
      <h3>Teaching & Certifications</h3>
      <div class="hint">Courses and certifications are one per line.</div>
      <div class="item-card">
        <label>MPH Courses Taught (one per line)</label>
        <textarea id="teaching-courses">${esc(t.courses.join('\n'))}</textarea>
        <label>Thesis Supervision</label>
        <textarea id="teaching-thesis">${esc(t.thesisSupervision)}</textarea>
        <label>Invited Resource Person</label>
        <textarea id="teaching-resource">${esc(t.resourcePerson)}</textarea>
        <label>Certifications (one per line) — add new qualifications/certifications here</label>
        <textarea id="teaching-certs">${esc(t.certifications.join('\n'))}</textarea>
      </div>
      <div class="btn-row">
        <button class="save-btn" data-action="save-teaching">Save section</button>
        <span class="save-msg"></span>
      </div>
    </div>
  `;
}
function wireTeachingPanel() {
  const block = document.querySelector('.section-block[data-section="teaching"]');
  block.addEventListener('click', async (e) => {
    if (e.target.dataset.action !== 'save-teaching') return;
    const value = {
      courses: block.querySelector('#teaching-courses').value.split('\n').map(s => s.trim()).filter(Boolean),
      thesisSupervision: block.querySelector('#teaching-thesis').value,
      resourcePerson: block.querySelector('#teaching-resource').value,
      certifications: block.querySelector('#teaching-certs').value.split('\n').map(s => s.trim()).filter(Boolean)
    };
    CONTENT.teaching = value;
    const msg = block.querySelector('.save-msg');
    try {
      await saveSection('teaching', value);
      msg.textContent = 'Saved ✓';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch {
      msg.textContent = 'Error saving';
    }
  });
}

function renderProfilePanel() {
  const p = CONTENT.profile;
  const a = CONTENT.about;
  return `
    <div class="section-block" data-section="profile">
      <h3>Profile, Bio & Contact</h3>
      <div class="item-card">
        <label>Name</label><input id="p-name" value="${esc(p.name)}">
        <label>Credentials</label><input id="p-credentials" value="${esc(p.credentials)}">
        <label>Hero eyebrow</label><input id="p-eyebrow" value="${esc(p.eyebrow)}">
        <label>Hero tagline</label><textarea id="p-tagline">${esc(p.tagline)}</textarea>
        <label>Hero tags (one per line)</label><textarea id="p-tags">${esc(p.tags.join('\n'))}</textarea>
        <label>Email</label><input id="p-email" value="${esc(p.email)}">
        <label>Phone</label><input id="p-phone" value="${esc(p.phone)}">
        <label>ORCID</label><input id="p-orcid" value="${esc(p.orcid)}">
        <label>Google Scholar URL (optional)</label><input id="p-scholar" value="${esc(p.scholarUrl)}">
        <label>Scopus URL (optional)</label><input id="p-scopus" value="${esc(p.scopusUrl)}">
        <label>Bio paragraphs (one per line, use **word** for bold)</label>
        <textarea id="a-paragraphs" style="min-height:120px">${esc(a.paragraphs.join('\n'))}</textarea>
        <label>Research interest chips (one per line)</label>
        <textarea id="a-interests">${esc(a.interests.join('\n'))}</textarea>
      </div>
      <div class="btn-row">
        <button class="save-btn" data-action="save-profile">Save section</button>
        <span class="save-msg"></span>
      </div>
    </div>
  `;
}
function wireProfilePanel() {
  const block = document.querySelector('.section-block[data-section="profile"]');
  block.addEventListener('click', async (e) => {
    if (e.target.dataset.action !== 'save-profile') return;
    const profile = {
      ...CONTENT.profile,
      name: block.querySelector('#p-name').value,
      credentials: block.querySelector('#p-credentials').value,
      eyebrow: block.querySelector('#p-eyebrow').value,
      tagline: block.querySelector('#p-tagline').value,
      tags: block.querySelector('#p-tags').value.split('\n').map(s => s.trim()).filter(Boolean),
      email: block.querySelector('#p-email').value,
      phone: block.querySelector('#p-phone').value,
      orcid: block.querySelector('#p-orcid').value,
      scholarUrl: block.querySelector('#p-scholar').value,
      scopusUrl: block.querySelector('#p-scopus').value
    };
    const about = {
      paragraphs: block.querySelector('#a-paragraphs').value.split('\n').map(s => s.trim()).filter(Boolean),
      interests: block.querySelector('#a-interests').value.split('\n').map(s => s.trim()).filter(Boolean)
    };
    const msg = block.querySelector('.save-msg');
    try {
      await saveSection('profile', profile);
      await saveSection('about', about);
      CONTENT.profile = profile;
      CONTENT.about = about;
      msg.textContent = 'Saved ✓';
      setTimeout(() => { msg.textContent = ''; }, 2500);
    } catch {
      msg.textContent = 'Error saving';
    }
  });
}

const TABS = [
  { key: 'profile', label: 'Profile & Bio' },
  { key: 'education', label: 'Education' },
  { key: 'positions', label: 'Positions' },
  { key: 'grants', label: 'Grants' },
  { key: 'inventions', label: 'Inventions & Tools' },
  { key: 'ncdSuite', label: 'NCD Suite' },
  { key: 'publications', label: 'Publications' },
  { key: 'conferences', label: 'Conferences' },
  { key: 'teaching', label: 'Teaching & Certifications' }
];

function renderPanel(activeKey) {
  const panels = document.getElementById('panels');
  panels.innerHTML = TABS.map(t => {
    let inner;
    if (t.key === 'profile') inner = renderProfilePanel();
    else if (t.key === 'teaching') inner = renderTeachingPanel();
    else inner = renderListSection(t.key);
    return `<div class="tab-panel ${t.key === activeKey ? 'active' : ''}" data-panel="${t.key}">${inner}</div>`;
  }).join('');

  TABS.forEach(t => {
    if (t.key === 'profile') wireProfilePanel();
    else if (t.key === 'teaching') wireTeachingPanel();
    else wireListSection(t.key);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeKey);
  });
}

function renderDashboard() {
  document.getElementById('tabs').innerHTML = TABS.map(t =>
    `<button class="tab-btn" data-tab="${t.key}">${t.label}</button>`
  ).join('');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === btn.dataset.tab));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  renderPanel('profile');
}

async function loadContentAndShowDashboard() {
  const res = await fetch('/api/content');
  CONTENT = await res.json();
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  renderDashboard();
}

async function checkAuth() {
  const res = await fetch('/api/admin/me');
  if (res.ok) {
    loadContentAndShowDashboard();
  }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errEl.textContent = body.error || 'Login failed';
      return;
    }
    loadContentAndShowDashboard();
  } catch {
    errEl.textContent = 'Network error';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.reload();
});

checkAuth();
