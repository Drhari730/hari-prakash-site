const PDFDocument = require('pdfkit');

const CAT_LABELS = {
  oncology: 'Oncology',
  digital: 'Digital Health & mHealth',
  ncd: 'Public Health & NCDs',
  dental: 'Oral Health & Dental',
  mededu: 'Medical Education'
};

function citation(p, n) {
  let s = `${n}. ${p.authors}. ${p.title}. ${p.journal}. ${p.year}`;
  if (p.vol) s += `;${p.vol}`;
  s += '.';
  if (p.doi) s += ` doi:${p.doi}`;
  return s;
}

function generateCvPdf(content, res) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 56, right: 56 } });
  doc.pipe(res);

  const { profile, about, education, positions, grants, patent, inventions, publications, conferences, teaching, affiliations } = content;

  const ruleColor = '#7a2e2e';
  const textColor = '#1c1c1c';
  const mutedColor = '#5a5a5a';

  function heading(text) {
    doc.moveDown(0.6);
    doc.font('Times-Bold').fontSize(12.5).fillColor(ruleColor).text(text.toUpperCase(), { characterSpacing: 0.6 });
    const y = doc.y + 2;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor(ruleColor).lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fillColor(textColor);
  }

  // Header
  doc.font('Times-Bold').fontSize(22).fillColor(textColor).text(profile.name.toUpperCase(), { align: 'center' });
  doc.font('Times-Roman').fontSize(11).fillColor(mutedColor).text(profile.credentials, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(9.5).text(
    `${profile.email}   |   ${profile.phone}   |   ORCID: ${profile.orcid}`,
    { align: 'center' }
  );
  doc.moveDown(0.3);
  const hy = doc.y;
  doc.moveTo(doc.page.margins.left, hy).lineTo(doc.page.width - doc.page.margins.right, hy).strokeColor(ruleColor).lineWidth(1.5).stroke();
  doc.fillColor(textColor);

  // Research profile
  heading('Research Profile');
  doc.font('Times-Roman').fontSize(10).fillColor(textColor);
  about.paragraphs.forEach(p => {
    doc.text(p.replace(/\*\*/g, ''), { align: 'justify' });
    doc.moveDown(0.35);
  });

  // Education
  heading('Education');
  education.forEach(e => {
    doc.font('Times-Bold').fontSize(10.5).text(`${e.degree} — ${e.institution}`, { continued: false });
    doc.font('Times-Roman').fontSize(9.5).fillColor(mutedColor).text(e.years);
    if (e.thesis) doc.font('Times-Italic').fontSize(9.5).text(`Thesis: ${e.thesis}`);
    doc.fillColor(textColor);
    doc.moveDown(0.3);
  });

  // Positions
  heading('Academic & Professional Positions');
  positions.forEach(p => {
    doc.font('Times-Bold').fontSize(10.5).text(`${p.role} — ${p.org}`);
    doc.font('Times-Roman').fontSize(9.5).fillColor(mutedColor).text(p.years);
    doc.fillColor(textColor).fontSize(9.5);
    (p.bullets || []).forEach(b => doc.text(`• ${b}`, { indent: 10 }));
    doc.moveDown(0.3);
  });

  // Grants
  heading('Grants & Fellowships');
  grants.forEach(g => {
    doc.font('Times-Bold').fontSize(10).text(`${g.name} (${g.amount})`);
    doc.font('Times-Roman').fontSize(9.5).fillColor(mutedColor).text(`${g.desc} · ${g.years}`);
    doc.fillColor(textColor);
    doc.moveDown(0.25);
  });

  // Digital health inventions
  heading('Digital Health Inventions & Tools');
  doc.font('Times-Roman').fontSize(9.5);
  inventions.forEach(inv => {
    doc.font('Times-Bold').text(inv.name + ': ', { continued: true });
    doc.font('Times-Roman').text(inv.desc);
  });
  if (patent && patent.text) {
    doc.moveDown(0.3);
    doc.font('Times-Bold').fontSize(9.5).text('Patent: ', { continued: true });
    doc.font('Times-Roman').text(patent.text);
  }

  // Publications
  heading(`Publications (${publications.length} peer-reviewed)`);
  const byCat = {};
  publications.forEach(p => { (byCat[p.cat] = byCat[p.cat] || []).push(p); });
  let n = 1;
  Object.keys(CAT_LABELS).forEach(cat => {
    if (!byCat[cat]) return;
    doc.font('Times-Bold').fontSize(10).fillColor(ruleColor).text(CAT_LABELS[cat]);
    doc.fillColor(textColor).font('Times-Roman').fontSize(9);
    byCat[cat].forEach(p => {
      doc.text(citation(p, n), { align: 'justify' });
      doc.moveDown(0.15);
      n += 1;
    });
    doc.moveDown(0.2);
  });

  // Conferences
  heading('Conference Presentations');
  doc.font('Times-Roman').fontSize(9.5);
  conferences.forEach(c => {
    let line = `${c.title} — ${c.event}`;
    if (c.award) line += ` (${c.award})`;
    doc.text(`• ${line}`);
  });

  // Teaching
  heading('Teaching & Supervision');
  doc.font('Times-Roman').fontSize(9.5);
  doc.text(`Courses taught: ${teaching.courses.join(', ')}`);
  doc.moveDown(0.2);
  doc.text(teaching.thesisSupervision);
  doc.moveDown(0.2);
  doc.text(teaching.resourcePerson);

  // Certifications
  heading('Certifications & Training');
  teaching.certifications.forEach(c => doc.font('Times-Roman').fontSize(9.5).text(`• ${c}`));

  // Affiliations
  if (affiliations && affiliations.length) {
    heading('Professional Affiliations & Service');
    affiliations.forEach(a => doc.font('Times-Roman').fontSize(9.5).text(`• ${a}`));
  }

  doc.end();
}

module.exports = { generateCvPdf };
