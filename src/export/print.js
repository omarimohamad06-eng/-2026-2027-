/**
 * Impression fidèle au registre officiel (A4 paysage).
 * Construit une zone #print-area puis appelle window.print()
 * → « Enregistrer au format PDF » donne un PDF vectoriel, arabe parfaitement lié.
 */
import { h, qs } from '../utils/dom.js';
import { STATES } from '../core/attendance.js';
import { statsMois } from '../core/stats.js';
import { moisLabel, spansConges } from '../core/schoolCalendar.js';

const MINISTERE = 'وزارة التربية الوطنية والتعليم الأولي والرياضة';

/** Une page A4 paysage pour un mois donné. */
export function feuilleMois({ settings, cls, cal, mois, students, reg }) {
  const s = statsMois(cal, mois, students, reg, settings);
  const days = s.days;

  const labelParJour = {};
  for (const sp of spansConges(days)) if (sp.day.periode) labelParJour[sp.day.jour] = sp.day.periode.libelle;

  const thead = h('thead', {},
    h('tr', { class: 'vac' },
      h('th.rt', {}, 'ر.ت'),
      h('th.nom', {}, 'الاسم والنسب'),
      days.map(d => h('th', { class: d.capacite <= 0 ? 'off' : '' },
        labelParJour[d.jour] ? h('span.vlabel', {}, labelParJour[d.jour]) : null,
        h('div', {}, String(d.jour)),
        h('div', {}, d.ab))),
      h('th.sum', {}, 'أنصاف أيام الدراسة'),
      h('th.sum', {}, 'أنصاف أيام الغياب'),
      h('th.sum', {}, 'أنصاف أيام الحضور'),
      h('th.sum', {}, 'النسبة %'),
      h('th.note', {}, 'ملاحظات')));

  const tbody = h('tbody', {}, s.rows.map(r => h('tr', {},
    h('td.rt', {}, String(r.student.rt)),
    h('td.nom', {}, r.student.nom),
    days.map(d => {
      const code = reg?.cells?.[r.student.id]?.[String(d.jour)] || '';
      const hors = (r.student.dateInscription && d.date < r.student.dateInscription) ||
                   (r.student.dateRadiation && d.date > r.student.dateRadiation);
      return h('td', {
        class: d.capacite <= 0 ? 'off' : code === 'aj' ? 'aj' : code ? 'a' : '',
      }, d.capacite <= 0 || hors ? '' : (STATES[code]?.court || ''));
    }),
    h('td.sum', {}, String(r.etude)),
    h('td.sum', {}, String(r.absence)),
    h('td.sum', {}, String(r.presence)),
    h('td.sum', {}, r.etude ? r.taux.toFixed(2) : '—'),
    h('td.note', {}, r.note || ''))));

  // Le registre officiel comporte 40 lignes : on complète avec des lignes vierges.
  const LIGNES_REGISTRE = 40;
  for (let i = s.rows.length; i < LIGNES_REGISTRE; i++) {
    tbody.append(h('tr', {},
      h('td.rt', {}, String(i + 1)),
      h('td.nom', {}, ''),
      days.map(d => h('td', { class: d.capacite <= 0 ? 'off' : '' }, '')),
      h('td.sum', {}, ''), h('td.sum', {}, ''), h('td.sum', {}, ''), h('td.sum', {}, ''),
      h('td.note', {}, '')));
  }

  const tfoot = h('tfoot', {}, h('tr', {},
    h('td', { colSpan: 2 + days.length }, 'نسبة المواظبة الشهرية بـ %'),
    h('td', {}, String(s.totals.etude)),
    h('td', {}, String(s.totals.absence)),
    h('td', { colSpan: 2 }, s.totals.taux.toFixed(2) + ' %'),
    h('td', {}, '')));

  return h('section.sheet', {},
    h('div.sheet-head', {},
      h('div.kingdom', {}, 'المملكة المغربية'),
      h('div.ministry', {}, MINISTERE),
      h('div.ministry', {}, `${settings.academie} — ${settings.direction}`),
      h('div.title', {}, 'سجل الحضور والغياب'),
    ),
    h('div.sheet-meta', {},
      h('span', {}, h('b', {}, 'المؤسسة: '), settings.etablissement),
      h('span', {}, h('b', {}, 'الأستاذ(ة): '), settings.enseignant),
      h('span', {}, h('b', {}, 'المستوى: '), `${cls.niveau || ''} ${cls.nom}`),
      cls.fawj ? h('span', {}, h('b', {}, 'الفوج: '), cls.fawj) : null,
      cls.matiere ? h('span', {}, h('b', {}, 'المادة: '), cls.matiere) : null,
      h('span', {}, h('b', {}, 'الشهر: '), moisLabel(mois)),
      h('span', {}, h('b', {}, 'السنة الدراسية: '), settings.anneeScolaire),
    ),
    h('table.sheet-grid', {}, thead, tbody, tfoot),
    h('div.sheet-foot', {},
      h('span', {}, `${settings.enseignantFr || ''} — ${settings.anneeScolaire}`),
      h('span.sig', {}, 'إمضاء الأستاذ(ة)'),
      h('span.sig', {}, 'إمضاء السيد(ة) المدير(ة)')));
}

function zone() {
  let z = qs('#print-area');
  if (!z) { z = h('div', { id: 'print-area' }); document.body.append(z); }
  z.innerHTML = '';
  return z;
}

/** Imprime un ou plusieurs mois. */
export function imprimerMois(ctx) {
  const z = zone();
  z.append(feuilleMois(ctx));
  lancerImpression();
}

export function imprimerPlusieursMois({ settings, cls, cal, moisListe, students, regs }) {
  const z = zone();
  for (const mois of moisListe) z.append(feuilleMois({ settings, cls, cal, mois, students, reg: regs[mois] }));
  lancerImpression();
}

function lancerImpression() {
  const nettoyer = () => { const z = qs('#print-area'); if (z) z.innerHTML = ''; };
  addEventListener('afterprint', nettoyer, { once: true });
  setTimeout(() => window.print(), 60);
}
