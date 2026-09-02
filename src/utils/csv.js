/** Lecture / écriture CSV et collage depuis Excel (TSV). */

/** Détecte le séparateur le plus probable sur la première ligne. */
function guessSep(text) {
  const line = text.split(/\r?\n/).find(l => l.trim()) || '';
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ';';
}

/** Analyse un CSV/TSV (guillemets doubles gérés) -> tableau de tableaux. */
export function parseDelimited(text, sep = null) {
  const src = text.replace(/^﻿/, '');          // BOM Excel
  const d = sep || guessSep(src);
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === d) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ''));
}

const q = v => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/** Génère un CSV lisible par Excel arabe (BOM + séparateur ';'). */
export function toCSV(rows, sep = ';') {
  return '﻿' + rows.map(r => r.map(q).join(sep)).join('\r\n');
}
