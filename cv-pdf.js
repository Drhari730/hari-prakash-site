const PDFDocument = require('pdfkit');

const CAT_LABELS = {
  oncology: 'Oncology',
  digital: 'Digital Health & mHealth',
  ncd: 'Public Health & NCDs',
  dental: 'Oral Health & Dental',
  mededu: 'Medical Education'
};

// Author-name variants used across his publications (ordered longest/most-specific first
// so e.g. "Hari Prakash G" matches as one unit rather than leaving the "G" unbolded).
const OWN_NAME_VARIANTS = [
  'Prakash G Hari', 'Hari Prakash G', 'G Hari Prakash', 'Gunisetty HP',
  'Prakash GH', 'Hari PG', 'Hari Prakash', 'Prakash H'
];
const OWN_NAME_RE = new RegExp(`(${OWN_NAME_VARIANTS.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

function citationTail(p) {
  let s = `. ${p.title}. ${p.journal}. ${p.year}`;
  if (p.vol) s += `;${p.vol}`;
  s += '.';
  if (p.doi) s += ` doi:${p.doi}`;
  return s;
}

function generateCvPdf(content, res) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 54, bottom: 56, left: 60, right: 60 } });
  doc.pipe(res);

  const { profile, about, education, positions, grants, patent, inventions, publications, conferences, teaching, affiliations } = content;

  const ruleColor = '#0f2340';
  const accentColor = '#1a6b6b';
  const textColor = '#1c1c1c';
  const mutedColor = '#5a5a5a';
  const BODY = 9.7;      // base body font size
  const GAP = 2.6;       // line gap within wrapped text blocks

  function heading(text) {
    doc.moveDown(1.0);
    doc.font('Times-Bold').fontSize(12).fillColor(ruleColor)
      .text(text.toUpperCase(), { characterSpacing: 0.7, lineGap: 0 });
    const y = doc.y + 3;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y)
      .strokeColor(accentColor).lineWidth(0.9).stroke();
    doc.moveDown(0.7);
    doc.fillColor(textColor);
  }

  // A bulleted entry with a hanging indent, so wrapped lines align under the text (not the bullet).
  function bullet(str, gap = 0.32) {
    doc.font('Times-Roman').fontSize(BODY).fillColor(textColor)
      .text(str, { indent: 12, align: 'left', lineGap: GAP, paragraphGap: 0 });
    doc.moveDown(gap);
  }

  // Header
  doc.font('Times-Bold').fontSize(23).fillColor(textColor).text(profile.name.toUpperCase(), { align: 'center', characterSpacing: 0.5 });
  doc.moveDown(0.35);
  doc.font('Times-Roman').fontSize(11).fillColor(mutedColor).text(profile.credentials, { align: 'center' });
  doc.moveDown(0.35);
  doc.fontSize(9.5).fillColor(mutedColor).text(
    `${profile.email}    |    ${profile.phone}    |    ORCID: ${profile.orcid}`,
    { align: 'center' }
  );
  doc.moveDown(0.55);
  const hy = doc.y;
  doc.moveTo(doc.page.margins.left, hy).lineTo(doc.page.width - doc.page.margins.right, hy).strokeColor(ruleColor).lineWidth(1.4).stroke();
  doc.fillColor(textColor);

  // Research profile
  heading('Research Profile');
  doc.font('Times-Roman').fontSize(BODY).fillColor(textColor);
  about.paragraphs.forEach(p => {
    doc.text(p.replace(/\*\*/g, ''), { align: 'justify', lineGap: GAP });
    doc.moveDown(0.5);
  });

  // Education
  heading('Education');
  education.forEach(e => {
    doc.font('Times-Bold').fontSize(10.5).fillColor(textColor).text(`${e.degree} — ${e.institution}`, { lineGap: 1 });
    doc.font('Times-Roman').fontSize(9.3).fillColor(mutedColor).text(e.years);
    if (e.thesis) doc.font('Times-Italic').fontSize(9.3).fillColor(mutedColor).text(`Thesis: ${e.thesis}`, { lineGap: 1 });
    doc.fillColor(textColor);
    doc.moveDown(0.55);
  });

  // Positions
  heading('Academic & Professional Positions');
  positions.forEach(p => {
    doc.font('Times-Bold').fontSize(10.5).fillColor(textColor).text(`${p.role}`, { lineGap: 1 });
    doc.font('Times-Italic').fontSize(9.5).fillColor(mutedColor).text(`${p.org}  ·  ${p.years}`, { lineGap: 1 });
    doc.moveDown(0.2);
    doc.fillColor(textColor);
    (p.bullets || []).forEach(b => bullet(b, 0.18));
    doc.moveDown(0.45);
  });

  // Grants
  heading('Grants & Fellowships');
  grants.forEach(g => {
    doc.font('Times-Bold').fontSize(10).fillColor(textColor).text(`${g.name} (${g.amount})`, { lineGap: 1 });
    doc.font('Times-Roman').fontSize(9.3).fillColor(mutedColor).text(`${g.desc}  ·  ${g.years}`, { lineGap: GAP });
    doc.fillColor(textColor);
    doc.moveDown(0.45);
  });

  // Digital health inventions
  heading('Digital Health Inventions & Tools');
  inventions.forEach(inv => {
    doc.font('Times-Bold').fontSize(BODY).fillColor(textColor).text(inv.name + ': ', { continued: true });
    doc.font('Times-Roman').fillColor(textColor).text(inv.desc, { lineGap: GAP });
    doc.moveDown(0.32);
  });
  if (patent && patent.text) {
    doc.moveDown(0.15);
    doc.font('Times-Bold').fontSize(BODY).text('Patent: ', { continued: true });
    doc.font('Times-Roman').text(patent.text, { lineGap: GAP });
  }

  // Publications
  heading(`Publications (${publications.length} peer-reviewed)`);
  const byCat = {};
  publications.forEach(p => { (byCat[p.cat] = byCat[p.cat] || []).push(p); });
  let n = 1;
  Object.keys(CAT_LABELS).forEach(cat => {
    if (!byCat[cat]) return;
    doc.moveDown(0.25);
    doc.font('Times-Bold').fontSize(10.5).fillColor(accentColor).text(CAT_LABELS[cat], { lineGap: 1 });
    doc.moveDown(0.3);
    doc.fillColor(textColor).font('Times-Roman').fontSize(9.4);
    byCat[cat].forEach(p => {
      // Bold only the author's own name (first occurrence). The citation tail is merged
      // into the text run *after* the name so there is no `continued` boundary at the
      // period — which otherwise makes PDFKit insert a stray space ("Kulkarni P . Title").
      doc.font('Times-Roman').fontSize(9.4).fillColor(textColor);
      OWN_NAME_RE.lastIndex = 0;
      const m = OWN_NAME_RE.exec(p.authors);
      const tail = citationTail(p);
      if (!m) {
        doc.text(`${n}. ${p.authors}${tail}`, { align: 'left', lineGap: GAP });
      } else {
        const before = `${n}. ` + p.authors.slice(0, m.index);
        const after = p.authors.slice(m.index + m[0].length) + tail;
        doc.text(before, { continued: true, lineGap: GAP });
        doc.font('Times-Bold').text(m[0], { continued: true, lineGap: GAP });
        doc.font('Times-Roman').text(after, { continued: false, align: 'left', lineGap: GAP });
      }
      doc.moveDown(0.42);
      n += 1;
    });
  });

  // Conferences
  heading('Conference Presentations');
  conferences.forEach(c => {
    let line = `${c.title} — ${c.event}`;
    if (c.award) line += ` (${c.award})`;
    bullet(line, 0.3);
  });

  // Teaching
  heading('Teaching & Supervision');
  doc.font('Times-Bold').fontSize(BODY).fillColor(textColor).text('Courses taught: ', { continued: true });
  doc.font('Times-Roman').text(teaching.courses.join(', '), { lineGap: GAP });
  doc.moveDown(0.4);
  doc.font('Times-Roman').fontSize(BODY).text(teaching.thesisSupervision, { align: 'justify', lineGap: GAP });
  doc.moveDown(0.4);
  doc.text(teaching.resourcePerson, { align: 'justify', lineGap: GAP });

  // Certifications
  heading('Certifications & Training');
  teaching.certifications.forEach(c => bullet(c, 0.28));

  // Affiliations
  if (affiliations && affiliations.length) {
    heading('Professional Affiliations & Service');
    affiliations.forEach(a => bullet(a, 0.28));
  }

  doc.end();
}

module.exports = { generateCvPdf };
