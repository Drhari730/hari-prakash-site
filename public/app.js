const DATA = JSON.parse(document.getElementById('site-data').textContent);

const CAT_LABELS = {
  oncology: 'Oncology', digital: 'Digital Health', ncd: 'Public Health & NCDs',
  dental: 'Oral Health', mededu: 'Medical Education'
};
const STATUS_LABELS = { live: 'Live', development: 'In Development', planned: 'Planned', prototype: 'Prototype' };
const CONF_TYPE_LABELS = { oral: 'Oral', poster: 'Poster', prototype: 'Prototype', paper: 'Paper' };

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function md(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Author-name variants used across his publications (ordered longest/most-specific first
// so e.g. "Hari Prakash G" matches as one unit rather than leaving the "G" unbolded).
const OWN_NAME_VARIANTS = [
  'Prakash G Hari', 'Hari Prakash G', 'G Hari Prakash', 'Gunisetty HP',
  'Prakash GH', 'Hari PG', 'Hari Prakash', 'Prakash H'
];
const OWN_NAME_RE = new RegExp(`\\b(${OWN_NAME_VARIANTS.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
function highlightAuthors(s) {
  return esc(s).replace(OWN_NAME_RE, '<strong>$1</strong>');
}

function renderHero() {
  const p = DATA.profile;
  document.getElementById('heroEyebrow').textContent = p.eyebrow;
  document.getElementById('heroName').textContent = p.name;
  document.getElementById('heroSub').innerHTML = `${esc(p.credentials)}<br>${esc(p.tagline)}`;
  document.getElementById('heroTags').innerHTML = p.tags.map(t => `<span class="hero-tag">${esc(t)}</span>`).join('');
  document.getElementById('heroStats').innerHTML = p.stats.map((s, i) => `
    ${i > 0 ? '<div class="stat-divider"></div>' : ''}
    <div class="stat-row"><div class="stat-num">${esc(s.num)}</div><div class="stat-label">${esc(s.label)}</div></div>
  `).join('');
  const contactLinks = [
    { ico: '✉', label: p.email, href: 'mailto:' + p.email },
    { ico: '☎', label: p.phone, href: 'tel:' + p.phone.replace(/\s+/g, '') },
    { ico: '⊙', label: 'ORCID: ' + p.orcid, href: p.orcid ? `https://orcid.org/${p.orcid}` : '#' }
  ];
  document.getElementById('heroContact').innerHTML = contactLinks.map(c =>
    `<a href="${esc(c.href)}"><span class="ico">${c.ico}</span> ${esc(c.label)}</a>`
  ).join('');
}

function renderAbout() {
  document.getElementById('aboutText').innerHTML = DATA.about.paragraphs.map(p => `<p>${md(p)}</p>`).join('');
  document.getElementById('interestsGrid').innerHTML = DATA.about.interests.map(i => `<span class="interest-chip">${esc(i)}</span>`).join('');
  document.getElementById('educationList').innerHTML = DATA.education.map(e => `
    <div class="edu-item">
      <div class="edu-deg">${esc(e.degree)}</div>
      <div class="edu-inst">${esc(e.institution)}</div>
      <div class="edu-year">${esc(e.years)}</div>
      ${e.thesis ? `<div class="edu-thesis">Thesis: ${esc(e.thesis)}</div>` : ''}
    </div>
  `).join('');
  document.getElementById('skillsList').innerHTML = DATA.skills.map(s => `
    <li class="skill-item">
      <div class="skill-name">${esc(s.name)} <span>${esc(s.level)}</span></div>
      <div class="skill-track"><div class="skill-fill" style="width:${s.pct}%"></div></div>
    </li>
  `).join('');
  document.getElementById('affiliationsList').innerHTML = DATA.affiliations.map(a =>
    `<li style="font-size:.8rem;color:var(--muted);padding-left:12px;position:relative;"><span style="position:absolute;left:0;color:var(--teal);font-weight:700;">·</span>${esc(a)}</li>`
  ).join('');
  renderHighlights();
}

function renderHighlights() {
  const el = document.getElementById('highlightsRow');
  if (!el) return;
  const editorialCount = (DATA.affiliations || []).filter(a => /editor/i.test(a)).length;
  const items = [
    { num: DATA.publications.length, label: 'Peer-reviewed publications' },
    { num: DATA.inventions.length, label: 'Digital health tools built' },
    { num: DATA.patent && DATA.patent.text ? 1 : 0, label: 'Published patent' },
    { num: editorialCount, label: 'Journal editorial roles' }
  ];
  el.innerHTML = items.map(i => `
    <div class="highlight-item">
      <div class="highlight-num">${i.num}</div>
      <div class="highlight-label">${esc(i.label)}</div>
    </div>
  `).join('');
}

function renderPositions() {
  document.getElementById('positionsList').innerHTML = DATA.positions.map(p => `
    <div class="pos-item fade-up">
      <div class="pos-year">${esc(p.years)}<div class="pos-dot"></div></div>
      <div>
        <div class="pos-role">${esc(p.role)}</div>
        <div class="pos-org">${esc(p.org)}</div>
        <ul class="pos-bullets">${(p.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>
    </div>
  `).join('');
}

function renderGrants() {
  document.getElementById('grantsGrid').innerHTML = DATA.grants.map(g => `
    <div class="grant-card fade-up">
      <div class="grant-amt">${esc(g.amount)}</div>
      <div class="grant-name">${esc(g.name)}</div>
      <div class="grant-desc">${esc(g.desc)}</div>
      <div class="grant-year">${esc(g.years)}</div>
    </div>
  `).join('');
}

function renderInventions() {
  document.getElementById('inventionsGrid').innerHTML = DATA.inventions.map(inv => `
    <div class="inv-card fade-up">
      <div class="inv-icon">${inv.icon || '🔧'}</div>
      <div class="inv-name">${esc(inv.name)}</div>
      <div class="inv-desc">${esc(inv.desc)}</div>
      <div class="inv-footer">
        ${inv.badge ? `<span class="inv-badge status-${inv.status}">${esc(inv.badge)}</span>` : ''}
        ${inv.link ? `<a class="inv-link" href="${esc(inv.link)}" target="_blank" rel="noopener">Visit →</a>` : ''}
      </div>
    </div>
  `).join('');
  if (DATA.patent && DATA.patent.text) {
    document.getElementById('patentStrip').innerHTML = `<strong>Published Indian Patent —</strong> ${esc(DATA.patent.text)}`;
  }
}

function renderNcdSuite() {
  document.getElementById('ncdGrid').innerHTML = DATA.ncdSuite.map(n => `
    <div class="ncd-card fade-up">
      <div class="ncd-icon">${n.icon || '🩺'}</div>
      <div class="ncd-condition">${esc(n.condition)}</div>
      <div class="ncd-name">${esc(n.name)}</div>
      <div class="ncd-desc">${esc(n.desc)}</div>
      <span class="ncd-status ${n.status}">${STATUS_LABELS[n.status] || n.status}</span>
      ${n.link ? `<div style="margin-top:8px"><a class="inv-link" style="color:var(--maroon)" href="${esc(n.link)}" target="_blank" rel="noopener">View →</a></div>` : ''}
    </div>
  `).join('');
}

let activePubFilter = 'all';
function renderPublications() {
  const pubs = DATA.publications;
  document.getElementById('pubCountLabel').textContent = `(${pubs.length} peer-reviewed)`;
  const counts = {};
  pubs.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
  const cats = Object.keys(CAT_LABELS).filter(c => counts[c]);

  document.getElementById('pubFilters').innerHTML = [
    `<button class="pub-filter active" data-filter="all">All (${pubs.length})</button>`,
    ...cats.map(c => `<button class="pub-filter" data-filter="${c}">${CAT_LABELS[c]} (${counts[c]})</button>`)
  ].join('');

  document.getElementById('pubList').innerHTML = pubs.map((p, i) => `
    <div class="pub-card" data-cat="${p.cat}">
      <div class="pub-num">${i + 1}.</div>
      <div>
        <div class="pub-title">${esc(p.title)}</div>
        <div class="pub-authors">${highlightAuthors(p.authors)}</div>
        <div class="pub-journal">${esc(p.journal)}</div>
        <div class="pub-meta">
          <span class="pub-year">${esc(p.year)}</span>
          <span class="pub-cat-badge cat-${p.cat}">${CAT_LABELS[p.cat] || p.cat}</span>
          ${p.doi ? `<a class="pub-doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.pub-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pub-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.pub-card').forEach(card => {
        card.dataset.hidden = (filter !== 'all' && card.dataset.cat !== filter) ? 'true' : 'false';
      });
    });
  });
}

function renderConferences() {
  document.getElementById('confGrid').innerHTML = DATA.conferences.map(c => `
    <div class="conf-card fade-up">
      <div class="conf-type type-${c.type}">${CONF_TYPE_LABELS[c.type] || c.type}</div>
      <div class="conf-body">
        <div class="conf-title">${esc(c.title)}</div>
        <div class="conf-event">${esc(c.event)}</div>
        ${c.award ? `<div class="conf-award">${esc(c.award)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderTeaching() {
  document.getElementById('coursesList').innerHTML = DATA.teaching.courses.map(c => `<li>${esc(c)}</li>`).join('');
  document.getElementById('thesisSupervisionText').textContent = DATA.teaching.thesisSupervision;
  document.getElementById('resourcePersonText').textContent = DATA.teaching.resourcePerson;
  document.getElementById('certsList').innerHTML = DATA.teaching.certifications.map(c => `<li>${esc(c)}</li>`).join('');
}

function renderContact() {
  const p = DATA.profile;
  const chips = [
    { ico: '✉', label: p.email, href: 'mailto:' + p.email },
    { ico: '☎', label: p.phone, href: 'tel:' + p.phone.replace(/\s+/g, '') },
    { ico: '⊙', label: 'ORCID: ' + p.orcid, href: p.orcid ? `https://orcid.org/${p.orcid}` : '#' }
  ];
  if (p.scholarUrl) chips.push({ ico: '↗', label: 'Google Scholar', href: p.scholarUrl });
  if (p.scopusUrl) chips.push({ ico: '↗', label: 'Scopus Profile', href: p.scopusUrl });
  document.getElementById('contactGrid').innerHTML = chips.map(c =>
    `<a class="contact-chip" href="${esc(c.href)}"><span class="ico">${c.ico}</span> ${esc(c.label)}</a>`
  ).join('');
  document.getElementById('footerText').textContent = `© ${new Date().getFullYear()} ${p.name} · ${p.credentials}`;
}

function initScrollEffects() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 80) current = s.id; });
    navLinks.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === '#' + current) a.classList.add('active');
    });
  }, { passive: true });
}

renderHero();
renderAbout();
renderPositions();
renderGrants();
renderInventions();
renderNcdSuite();
renderPublications();
renderConferences();
renderTeaching();
renderContact();
initScrollEffects();
