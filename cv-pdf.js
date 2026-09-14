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

function noEmDash(str) {
  if (!str) return '';
  return String(str)
    .replace(/\s*—\s*/g, ' - ')
    .replace(/—/g, ' - ')
    .replace(/\s*–\s*/g, ' - ')
    .replace(/–/g, '-');
}

function citationTail(p) {
  let s = `. ${p.title}. ${p.journal}. ${p.year}`;
  if (p.vol) s += `;${p.vol}`;
  s += '.';
  if (p.doi) s += ` doi:${p.doi}`;
  return noEmDash(s);
}

function generateCvPdf(content, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 52, bottom: 54, left: 54, right: 54 },
    bufferPages: true
  });
  doc.pipe(res);

  const { profile, about, education, positions, grants, patent, inventions, publications, conferences, teaching, affiliations } = content;

  const navyColor = '#0f2340';
  const tealColor = '#1a6b6b';
  const goldColor = '#c47c3e';
  const textColor = '#1c1c1c';
  const mutedColor = '#555e6d';
  const bannerBg = '#edf4f9';
  const BODY = 9.7;      // base body font size
  const GAP = 2.6;       // line gap within wrapped text blocks

  function heading(text) {
    if (doc.y > doc.page.height - 75) {
      doc.addPage();
    } else {
      doc.moveDown(0.9);
    }
    const startY = doc.y;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    
    // Soft tinted background banner
    doc.roundedRect(doc.page.margins.left, startY, contentWidth, 22, 3)
       .fillColor(bannerBg).fill();
       
    // Left decorative navy color bar
    doc.roundedRect(doc.page.margins.left, startY, 4.5, 22, 1.5)
       .fillColor(navyColor).fill();
       
    // Bold navy heading title
    doc.font('Times-Bold').fontSize(11.5).fillColor(navyColor)
       .text(text.toUpperCase(), doc.page.margins.left + 12, startY + 5.5, { characterSpacing: 0.8 });
       
    doc.y = startY + 28;
    doc.fillColor(textColor);
  }

  // A bulleted entry with a hanging indent, so wrapped lines align under the text (not the bullet).
  function bullet(str, gap = 0.32) {
    doc.font('Times-Roman').fontSize(BODY).fillColor(textColor)
      .text(noEmDash(str), { indent: 12, align: 'justify', lineGap: GAP, paragraphGap: 0 });
    doc.moveDown(gap);
  }

  // Header (Page 1)
  doc.font('Times-Bold').fontSize(24).fillColor(navyColor).text(profile.name.toUpperCase(), { align: 'center', characterSpacing: 0.6 });
  doc.moveDown(0.35);
  doc.font('Times-Bold').fontSize(10.8).fillColor(tealColor).text(noEmDash(profile.credentials), { align: 'center' });
  doc.moveDown(0.35);
  doc.fontSize(9.3).font('Times-Roman').fillColor(mutedColor).text(
    `www.drhari.co.in    |    ${profile.email}    |    ${profile.phone}    |    ORCID: ${profile.orcid}`,
    { align: 'center' }
  );
  doc.moveDown(0.55);
  
  // Dual-tone accent rule below header
  const hy = doc.y;
  doc.moveTo(doc.page.margins.left, hy).lineTo(doc.page.width - doc.page.margins.right, hy).strokeColor(navyColor).lineWidth(1.8).stroke();
  doc.moveTo(doc.page.margins.left, hy + 3).lineTo(doc.page.width - doc.page.margins.right, hy + 3).strokeColor(tealColor).lineWidth(0.8).stroke();
  doc.y = hy + 8;
  doc.fillColor(textColor);

  // Research profile
  heading('Research Profile');
  doc.font('Times-Roman').fontSize(BODY).fillColor(textColor);
  about.paragraphs.forEach(p => {
    let t = p.replace(/\*\*/g, '');
    const pubCount = (publications && publications.length) ? publications.length : 45;
    t = t.replace(/Author of \d+ peer-reviewed publications/gi, `Author of ${pubCount} peer-reviewed publications`);
    doc.text(noEmDash(t), { align: 'justify', lineGap: GAP });
    doc.moveDown(0.5);
  });

  // Education
  heading('Education');
  education.forEach(e => {
    doc.font('Times-Bold').fontSize(10.5).fillColor(navyColor).text(noEmDash(e.degree), { continued: true, lineGap: 1 });
    doc.font('Times-Roman').fillColor(tealColor).text(noEmDash(` - ${e.institution}`), { lineGap: 1 });
    doc.font('Times-Roman').fontSize(9.3).fillColor(mutedColor).text(noEmDash(e.years));
    if (e.thesis) doc.font('Times-Italic').fontSize(9.3).fillColor(mutedColor).text(noEmDash(`Thesis: ${e.thesis}`), { lineGap: 1 });
    doc.fillColor(textColor);
    doc.moveDown(0.55);
  });

  // Positions
  heading('Academic & Professional Positions');
  positions.forEach(p => {
    doc.font('Times-Bold').fontSize(10.5).fillColor(navyColor).text(noEmDash(p.role), { lineGap: 1 });
    doc.font('Times-Italic').fontSize(9.5).fillColor(tealColor).text(noEmDash(p.org), { continued: true, lineGap: 1 });
    doc.font('Times-Roman').fillColor(mutedColor).text(noEmDash(`  ·  ${p.years}`), { lineGap: 1 });
    doc.moveDown(0.2);
    doc.fillColor(textColor);
    (p.bullets || []).forEach(b => bullet(b, 0.18));
    doc.moveDown(0.45);
  });

  // Grants
  heading('Grants & Fellowships');
  grants.forEach(g => {
    doc.font('Times-Bold').fontSize(10).fillColor(navyColor).text(noEmDash(g.name), { continued: true, lineGap: 1 });
    doc.font('Times-Bold').fillColor(goldColor).text(` (${g.amount})`, { lineGap: 1 });
    doc.font('Times-Roman').fontSize(9.3).fillColor(mutedColor).text(noEmDash(`${g.desc}  ·  ${g.years}`), { lineGap: GAP });
    doc.fillColor(textColor);
    doc.moveDown(0.45);
  });

  // Digital health inventions
  heading('Digital Health Inventions & Tools');
  inventions.forEach(inv => {
    doc.font('Times-Bold').fontSize(BODY).fillColor(navyColor).text(noEmDash(inv.name) + ': ', { continued: true, align: 'justify' });
    doc.font('Times-Roman').fillColor(textColor).text(noEmDash(inv.desc), { align: 'justify', lineGap: GAP });
    doc.moveDown(0.32);
  });
  if (patent && patent.text) {
    doc.moveDown(0.15);
    doc.font('Times-Bold').fontSize(BODY).fillColor(goldColor).text('Patent: ', { continued: true });
    doc.font('Times-Roman').fillColor(textColor).text(noEmDash(patent.text), { lineGap: GAP });
  }

  // Publications
  heading(`Publications (${publications.length} peer-reviewed)`);
  const byCat = {};
  publications.forEach(p => { (byCat[p.cat] = byCat[p.cat] || []).push(p); });
  let n = 1;
  Object.keys(CAT_LABELS).forEach(cat => {
    if (!byCat[cat]) return;
    doc.moveDown(0.25);
    doc.font('Times-Bold').fontSize(10.5).fillColor(tealColor).text(CAT_LABELS[cat], { lineGap: 1 });
    doc.moveDown(0.3);
    doc.fillColor(textColor).font('Times-Roman').fontSize(9.4);
    byCat[cat].forEach(p => {
      doc.font('Times-Roman').fontSize(9.4).fillColor(textColor);
      OWN_NAME_RE.lastIndex = 0;
      const m = OWN_NAME_RE.exec(p.authors);
      const tail = citationTail(p);
      if (!m) {
        doc.text(noEmDash(`${n}. ${p.authors}${tail}`), { align: 'justify', lineGap: GAP });
      } else {
        const before = `${n}. ` + p.authors.slice(0, m.index);
        const after = p.authors.slice(m.index + m[0].length) + tail;
        doc.text(noEmDash(before), { continued: true, align: 'justify', lineGap: GAP });
        doc.font('Times-Bold').fillColor(navyColor).text(noEmDash(m[0]), { continued: true });
        doc.font('Times-Roman').fillColor(textColor).text(noEmDash(after), { continued: false, align: 'justify', lineGap: GAP });
      }
      doc.moveDown(0.42);
      n += 1;
    });
  });

  // Conferences
  heading('Conference Presentations');
  conferences.forEach(c => {
    let line = `${c.title} - ${c.event}`;
    if (c.award) line += ` (${c.award})`;
    bullet(line, 0.3);
  });

  // Teaching
  heading('Teaching, Workshops & Consultations');
  doc.font('Times-Bold').fontSize(BODY).fillColor(navyColor).text('Courses taught: ', { continued: true, align: 'justify' });
  doc.font('Times-Roman').fillColor(textColor).text(noEmDash(teaching.courses.join(', ')), { align: 'justify', lineGap: GAP });
  doc.moveDown(0.4);
  doc.font('Times-Roman').fontSize(BODY).text(noEmDash(teaching.thesisSupervision), { align: 'justify', lineGap: GAP });
  doc.moveDown(0.4);
  doc.text(noEmDash(teaching.resourcePerson), { align: 'justify', lineGap: GAP });

  // Certifications
  heading('Certifications & Training');
  teaching.certifications.forEach(c => bullet(c, 0.28));

  // Affiliations
  if (affiliations && affiliations.length) {
    heading('Professional Affiliations & Service');
    affiliations.forEach(a => bullet(a, 0.28));
  }

  // References
  heading('References');
  const refs = [
    {
      name: 'Dr Sunil Kumar D',
      title: 'Professor and Head, Department of Community Medicine, JSS Medical College, JSS AHER, Mysuru, India',
      contact: 'Email: sunilkumard@jssuni.edu.in | Mobile: +91 6366366663'
    },
    {
      name: 'Dr Praveen Kulkarni',
      title: 'Scientist E, ICMR National Institute of Child Health Research, New Delhi, India',
      contact: 'Email: prakulfi@gmail.com | Mobile: +91 9008926878'
    }
  ];
  
  refs.forEach(r => {
    doc.font('Times-Bold').fontSize(10.5).fillColor(navyColor).text(r.name, { lineGap: 1 });
    doc.font('Times-Roman').fontSize(9.5).fillColor(mutedColor).text(r.title, { lineGap: 1 });
    doc.font('Times-Roman').fillColor(tealColor).text(r.contact, { lineGap: GAP });
    doc.moveDown(0.35);
  });

  // Post-processing: Decorative Navy borders & running footers on EVERY page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const w = doc.page.width;
    const h = doc.page.height;
    
    // Outer navy border
    doc.rect(20, 20, w - 40, h - 40).strokeColor(navyColor).lineWidth(1.2).stroke();
    
    // Top decorative bar: Navy + Teal stripe
    doc.rect(20, 20, w - 40, 5).fillColor(navyColor).fill();
    doc.rect(20, 25, w - 40, 2).fillColor(tealColor).fill();
    
    // Bottom thin divider & page footer
    doc.moveTo(34, h - 36).lineTo(w - 34, h - 36).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
    const savedMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Times-Roman').fontSize(8.5).fillColor(mutedColor)
       .text('Dr G. Hari Prakash  |  Curriculum Vitae', 34, h - 29, { align: 'left', width: 250, lineBreak: false });
    doc.font('Times-Roman').fontSize(8.5).fillColor(mutedColor)
       .text(`Page ${i + 1} of ${range.count}`, w - 234, h - 29, { align: 'right', width: 200, lineBreak: false });
    doc.page.margins.bottom = savedMargin;
  }

  doc.end();
}

module.exports = { generateCvPdf };
