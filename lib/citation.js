// Builds structured publication fields and formatted citations (Vancouver / APA / Harvard)
// from a CrossRef `message` object (https://api.crossref.org/works/{doi}).

function initials(given) {
  if (!given) return '';
  return given.split(/[\s.\-]+/).filter(Boolean).map(x => x[0].toUpperCase()).join('');
}

function authorObjs(message) {
  return (message.author || []).map(a => ({
    family: (a.family || a.name || '').trim(),
    given: (a.given || '').trim()
  })).filter(a => a.family);
}

// "Prakash GH, Kumar DS, ..." (Vancouver / journal style, et al after 6)
function vancouverAuthors(authors) {
  const names = authors.map(a => `${a.family}${initials(a.given) ? ' ' + initials(a.given) : ''}`);
  if (names.length > 6) return names.slice(0, 6).join(', ') + ', et al';
  return names.join(', ');
}

// "Prakash, G. H., & Kumar, D. S."
function apaAuthors(authors) {
  const fmt = a => `${a.family}, ${initials(a.given).split('').map(i => i + '.').join(' ')}`.trim().replace(/,\s*$/, '');
  const list = authors.map(fmt);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ', & ' + list[list.length - 1];
}

// "Prakash, G.H. and Kumar, D.S."
function harvardAuthors(authors) {
  const fmt = a => `${a.family}, ${initials(a.given).split('').map(i => i + '.').join('')}`.trim().replace(/,\s*$/, '');
  const list = authors.map(fmt);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function getYear(message) {
  const dp = (message.issued && message.issued['date-parts']) ||
             (message.published && message.published['date-parts']) ||
             (message['published-print'] && message['published-print']['date-parts']) ||
             (message['published-online'] && message['published-online']['date-parts']);
  if (dp && dp[0] && dp[0][0]) return String(dp[0][0]);
  return '';
}

function volPage(message) {
  let s = '';
  if (message.volume) s += message.volume;
  if (message.issue) s += `(${message.issue})`;
  if (message.page) s += `${s ? ':' : ''}${message.page}`;
  return s;
}

function buildFromCrossref(message) {
  const authors = authorObjs(message);
  const title = (message.title && message.title[0]) ? message.title[0].replace(/\s+/g, ' ').trim() : '';
  const journal = (message['container-title'] && message['container-title'][0]) || message.publisher || '';
  const year = getYear(message);
  const vp = volPage(message);
  const doi = message.DOI || '';

  const fields = {
    title, authors: vancouverAuthors(authors), journal, year, vol: vp, doi, cat: 'oncology'
  };

  const vanTail = `${title}. ${journal}. ${year}${vp ? ';' + vp : ''}.${doi ? ` doi:${doi}` : ''}`;
  const citations = {
    vancouver: `${vancouverAuthors(authors)}. ${vanTail}`,
    apa: `${apaAuthors(authors)} (${year}). ${title}. ${journal}${vp ? ', ' + vp : ''}.${doi ? ` https://doi.org/${doi}` : ''}`,
    harvard: `${harvardAuthors(authors)} (${year}) '${title}', ${journal}${vp ? ', ' + vp : ''}.${doi ? ` doi: ${doi}` : ''}`
  };

  return { fields, citations };
}

module.exports = { buildFromCrossref };
