/**
 * Export PDF téléchargeable, sans aucune librairie externe.
 *
 * La page du registre est dessinée sur un <canvas> (le navigateur assure
 * la liaison des lettres arabes et le rendu RTL), puis encapsulée dans un
 * PDF construit octet par octet (image JPEG /DCTDecode, une page A4 paysage
 * par mois). Le rendu vectoriel de meilleure qualité reste le bouton « طباعة ».
 */
import { download } from '../utils/dom.js';
import { STATES } from '../core/attendance.js';
import { statsMois } from '../core/stats.js';
import { moisLabel, spansConges } from '../core/schoolCalendar.js';

const PT_W = 842, PT_H = 595;            // A4 paysage en points
const SCALE = 2.6;                        // ≈ 190 dpi
const POLICE = '"Amiri","Cairo","Noto Naskh Arabic","Tahoma",serif';
const VERT = '#0d3b2e', DORE = '#c9a227', GRIS = '#cfc8b6', TRAIT = '#4a5b55';
const LIGNES_PAR_PAGE = 40;

const font = (px, bold = false) => `${bold ? '700 ' : ''}${px}px ${POLICE}`;

function texte(ctx, str, x, y, { align = 'center', size = 6, bold = false, color = '#101a17', maxW = 0 } = {}) {
  ctx.font = font(size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  let s = String(str ?? '');
  if (maxW) {
    while (s.length > 1 && ctx.measureText(s).width > maxW) s = s.slice(0, -1);
  }
  ctx.fillText(s, x, y);
}

/** Texte pivoté à 90° : il s'élève depuis le point d'ancrage (bas) vers le haut. */
function texteVertical(ctx, str, x, y, { size = 5, color = '#101a17', maxH = 60 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  texte(ctx, str, 0, 0, { align: 'left', size, color, maxW: maxH });
  ctx.restore();
}

/** Dessine une page du registre. Retourne le canvas. */
export function dessinerPage({ settings, cls, cal, mois, stats, reg, rows, pageIndex, pageTotal }) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(PT_W * SCALE);
  cv.height = Math.round(PT_H * SCALE);
  const ctx = cv.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.direction = 'rtl';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PT_W, PT_H);

  /* --- cadre décoratif --- */
  ctx.strokeStyle = VERT; ctx.lineWidth = 2.2;
  ctx.strokeRect(10, 10, PT_W - 20, PT_H - 20);
  ctx.strokeStyle = DORE; ctx.lineWidth = 0.8;
  ctx.strokeRect(14, 14, PT_W - 28, PT_H - 28);

  const cx = PT_W / 2;
  texte(ctx, 'المملكة المغربية', cx, 30, { size: 10, bold: true, color: VERT });
  texte(ctx, 'وزارة التربية الوطنية والتعليم الأولي والرياضة', cx, 43, { size: 8.5 });
  texte(ctx, `${settings.academie} — ${settings.direction}`, cx, 55, { size: 8 });

  texte(ctx, 'سجل الحضور والغياب', cx, 73, { size: 15, bold: true, color: VERT });
  ctx.strokeStyle = DORE; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 90, 82); ctx.lineTo(cx + 90, 82); ctx.stroke();

  /* --- bandeau d'informations --- */
  const infos = [
    `المؤسسة: ${settings.etablissement}`,
    `الأستاذ(ة): ${settings.enseignant}`,
    `القسم: ${cls.niveau ? cls.niveau + ' — ' : ''}${cls.nom}${cls.fawj ? ' / ' + cls.fawj : ''}`,
    `الشهر: ${moisLabel(mois)}`,
    `السنة الدراسية: ${settings.anneeScolaire}`,
  ];
  let ix = PT_W - 24;
  for (const info of infos) {
    ctx.font = font(7.4);
    const w = ctx.measureText(info).width;
    texte(ctx, info, ix, 95, { align: 'right', size: 7.4, color: VERT });
    ix -= w + 16;
  }

  /* --- géométrie du tableau --- */
  const marge = 24;
  const droite = PT_W - marge, gauche = marge;
  const largeurTotale = droite - gauche;
  const wRt = 18, wNom = 112, wSum = 21, wNote = 66;
  const days = stats.days;
  const wJour = (largeurTotale - wRt - wNom - wSum * 4 - wNote) / days.length;

  const top = 104, bottom = PT_H - 40;
  const hEntete = 70, hPied = 11;
  const hLigne = Math.min(11, (bottom - top - hEntete - hPied) / Math.max(rows.length, 1));
  const tableBas = top + hEntete + hLigne * rows.length + hPied;

  // positions x (de droite à gauche)
  const colonnes = [];
  let x = droite;
  const pousser = (w, kind, data) => { colonnes.push({ x: x - w, w, kind, data }); x -= w; };
  pousser(wRt, 'rt');
  pousser(wNom, 'nom');
  for (const d of days) pousser(wJour, 'jour', d);
  pousser(wSum, 'etude'); pousser(wSum, 'absence'); pousser(wSum, 'presence'); pousser(wSum, 'taux');
  pousser(wNote, 'note');

  const libelleSum = { etude: 'أنصاف أيام الدراسة', absence: 'أنصاف أيام الغياب', presence: 'أنصاف أيام الحضور', taux: 'النسبة %' };

  /* --- fonds des colonnes de congé --- */
  for (const c of colonnes) {
    if (c.kind === 'jour' && c.data.capacite <= 0) {
      ctx.fillStyle = GRIS;
      ctx.fillRect(c.x, top, c.w, tableBas - top - hPied);
    }
    if (['etude', 'absence', 'presence', 'taux'].includes(c.kind)) {
      ctx.fillStyle = '#f5f2e7';
      ctx.fillRect(c.x, top + hEntete, c.w, hLigne * rows.length);
    }
  }
  ctx.fillStyle = '#e6efea';
  ctx.fillRect(gauche, top, largeurTotale, hEntete);
  ctx.fillRect(gauche, tableBas - hPied, largeurTotale, hPied);

  /* --- en-tête --- */
  const labelParJour = {};
  for (const sp of spansConges(days)) if (sp.day.periode) labelParJour[sp.day.jour] = sp.day.periode.libelle;

  for (const c of colonnes) {
    const mid = c.x + c.w / 2;
    if (c.kind === 'rt') texte(ctx, 'ر.ت', mid, top + hEntete - 8, { size: 6, bold: true });
    else if (c.kind === 'nom') texte(ctx, 'الاسم والنسب', mid, top + hEntete - 8, { size: 7.5, bold: true });
    else if (c.kind === 'note') texte(ctx, 'ملاحظات', mid, top + hEntete - 8, { size: 7, bold: true });
    else if (c.kind === 'jour') {
      texte(ctx, String(c.data.jour), mid, top + hEntete - 14, { size: 6, bold: true });
      texte(ctx, c.data.ab, mid, top + hEntete - 6, { size: 5.2 });
      if (labelParJour[c.data.jour]) {
        texteVertical(ctx, labelParJour[c.data.jour], mid + 2, top + hEntete - 19, { size: 4.5, maxH: hEntete - 22 });
      }
    } else {
      texteVertical(ctx, libelleSum[c.kind], mid + 2.2, top + hEntete - 3, { size: 5, maxH: hEntete - 6 });
    }
  }

  /* --- lignes --- */
  rows.forEach((r, i) => {
    const y = top + hEntete + hLigne * i + hLigne / 2;
    for (const c of colonnes) {
      const mid = c.x + c.w / 2;
      if (c.kind === 'rt') texte(ctx, String(r.student.rt), mid, y, { size: 5.6 });
      else if (c.kind === 'nom') texte(ctx, r.student.nom, c.x + c.w - 2, y, { align: 'right', size: 7, maxW: c.w - 4 });
      else if (c.kind === 'note') texte(ctx, r.note, c.x + c.w - 2, y, { align: 'right', size: 5.4, maxW: c.w - 4 });
      else if (c.kind === 'jour') {
        if (c.data.capacite <= 0) continue;
        const hors = (r.student.dateInscription && c.data.date < r.student.dateInscription) ||
                     (r.student.dateRadiation && c.data.date > r.student.dateRadiation);
        if (hors) continue;
        const code = reg?.cells?.[r.student.id]?.[String(c.data.jour)] || '';
        if (!code) continue;
        texte(ctx, STATES[code].court, mid, y, {
          size: 6, bold: true, color: code === 'aj' || code === 'r' ? '#8a6508' : '#b3261e',
        });
      } else {
        const v = c.kind === 'taux' ? (r.etude ? r.taux.toFixed(1) : '—')
          : c.kind === 'etude' ? r.etude : c.kind === 'absence' ? r.absence : r.presence;
        texte(ctx, v, mid, y, { size: 5.6, bold: true, color: VERT });
      }
    }
  });

  /* --- pied du tableau : نسبة المواظبة الشهرية --- */
  const yPied = tableBas - hPied / 2;
  texte(ctx, 'نسبة المواظبة الشهرية بـ %', droite - 8, yPied, { align: 'right', size: 6.4, bold: true, color: VERT });
  const colTaux = colonnes.find(c => c.kind === 'taux');
  texte(ctx, stats.totals.taux.toFixed(2) + ' %', colTaux.x + colTaux.w / 2, yPied, { size: 6.4, bold: true, color: VERT });

  /* --- grille --- */
  ctx.strokeStyle = TRAIT; ctx.lineWidth = 0.28;
  ctx.beginPath();
  for (const c of colonnes) { ctx.moveTo(c.x, top); ctx.lineTo(c.x, tableBas); }
  ctx.moveTo(droite, top); ctx.lineTo(droite, tableBas);
  for (let i = 0; i <= rows.length; i++) {
    const y = top + hEntete + hLigne * i;
    ctx.moveTo(gauche, y); ctx.lineTo(droite, y);
  }
  ctx.moveTo(gauche, top); ctx.lineTo(droite, top);
  ctx.moveTo(gauche, tableBas - hPied); ctx.lineTo(droite, tableBas - hPied);
  ctx.moveTo(gauche, tableBas); ctx.lineTo(droite, tableBas);
  ctx.stroke();

  /* --- pied de page --- */
  texte(ctx, `${settings.enseignantFr || settings.enseignant} — ${settings.anneeScolaire}`,
    droite, PT_H - 24, { align: 'right', size: 6.6, color: '#31413b' });
  texte(ctx, 'إمضاء الأستاذ(ة)', cx, PT_H - 24, { size: 6.6, color: '#31413b' });
  texte(ctx, pageTotal > 1 ? `${pageIndex + 1}/${pageTotal}` : '',
    gauche, PT_H - 24, { align: 'left', size: 6.2, color: '#31413b' });

  return cv;
}

const canvasEnJpeg = (cv, q = 0.85) => new Promise((resolve, reject) =>
  cv.toBlob(b => b ? b.arrayBuffer().then(a => resolve(new Uint8Array(a))) : reject(new Error('toBlob')), 'image/jpeg', q));

/** Construit un PDF multi-pages (une image JPEG par page). */
function construirePdf(pages) {
  const enc = new TextEncoder();
  const morceaux = [];
  let taille = 0;
  const push = v => { const u = typeof v === 'string' ? enc.encode(v) : v; morceaux.push(u); taille += u.length; };
  const offsets = [];

  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  offsets[1] = taille; push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  offsets[2] = taille; push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((p, i) => {
    const pid = 3 + i * 3, cid = pid + 1, iid = pid + 2;
    const flux = `q ${PT_W} 0 0 ${PT_H} 0 0 cm /Im0 Do Q\n`;
    offsets[pid] = taille;
    push(`${pid} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W} ${PT_H}] ` +
         `/Resources << /XObject << /Im0 ${iid} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${cid} 0 R >>\nendobj\n`);
    offsets[cid] = taille;
    push(`${cid} 0 obj\n<< /Length ${flux.length} >>\nstream\n${flux}endstream\nendobj\n`);
    offsets[iid] = taille;
    push(`${iid} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} ` +
         `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
    push(p.jpeg);
    push('\nendstream\nendobj\n');
  });

  const maxId = 2 + pages.length * 3;
  const debutXref = taille;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) xref += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  push(xref);
  push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`);

  return new Blob(morceaux, { type: 'application/pdf' });
}

/** Télécharge le PDF d'un ou plusieurs mois. */
export async function telechargerPdfMois({ settings, cls, cal, mois, students, regs, nomFichier }) {
  const moisListe = Array.isArray(mois) ? mois : [mois];
  const pages = [];

  for (const m of moisListe) {
    const reg = regs?.[m];
    const stats = statsMois(cal, m, students, reg, settings);
    const tranches = [];
    for (let i = 0; i < stats.rows.length; i += LIGNES_PAR_PAGE) {
      tranches.push(stats.rows.slice(i, i + LIGNES_PAR_PAGE));
    }
    if (!tranches.length) tranches.push([]);
    tranches.forEach((rows, idx) => pages.push({
      settings, cls, cal, mois: m, stats, reg, rows, pageIndex: idx, pageTotal: tranches.length,
    }));
  }

  const images = [];
  for (const p of pages) {
    const cv = dessinerPage(p);
    images.push({ jpeg: await canvasEnJpeg(cv), w: cv.width, h: cv.height });
  }

  const nom = nomFichier ||
    `سجل-${cls.nom}-${moisListe.length === 1 ? moisListe[0] : settings.anneeScolaire.replace('/', '-')}.pdf`;
  download(nom, construirePdf(images), 'application/pdf');
}
