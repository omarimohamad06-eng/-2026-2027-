/** Calendrier scolaire : jours ouvrés, week-ends, congés, anssaf ayam. */
import { NOMS_MOIS } from '../data/calendar-2026-2027.js';

export const DAY_AB   = ['أ','ث','ث','ر','خ','ج','س'];                 // comme sur le registre papier
export const DAY_NAME = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

/** '2026-10-05' -> Date (midi local, insensible aux fuseaux/heure d'été) */
export const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d, 12); };
export const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const daysInMonth = mois => { const [y,m] = mois.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const moisLabel = mois => `${NOMS_MOIS[mois.split('-')[1]]} ${mois.split('-')[0]}`;
export const todayISO = () => iso(new Date());

/** Période (congé/férié/examen) couvrant une date ; la plus courte l'emporte (la plus spécifique). */
export function periodeAt(cal, dateISO) {
  let best = null, bestLen = Infinity;
  for (const p of cal.periodes || []) {
    if (dateISO < p.du || dateISO > (p.au || p.du)) continue;
    const len = (parseISO(p.au || p.du) - parseISO(p.du)) / 86400000;
    if (len < bestLen) { best = p; bestLen = len; }
  }
  return best;
}

/**
 * Décrit un jour du calendrier scolaire.
 * kind : 'ecole' | 'weekend' | 'conge' | 'hors'
 * capacite : nombre d'anssaf ayam d'étude que porte ce jour (0, 1 ou 2)
 */
export function dayInfo(cal, dateISO) {
  const d = parseISO(dateISO);
  const dow = d.getDay();
  const info = { date: dateISO, dow, ab: DAY_AB[dow], nom: DAY_NAME[dow], jour: d.getDate(), periode: null, kind: 'ecole', capacite: 2 };

  if (dateISO < cal.debutAnnee || dateISO > cal.finAnnee) { info.kind = 'hors'; info.capacite = 0; return info; }

  // La période l'emporte sur le week-end : le libellé de la vacance couvre
  // ainsi toute la plage grisée, comme sur le registre papier.
  const p = periodeAt(cal, dateISO);
  if (p) { info.kind = 'conge'; info.periode = p; info.capacite = 0; return info; }

  if ((cal.joursWeekend || []).includes(dow)) { info.kind = 'weekend'; info.capacite = 0; return info; }

  if ((cal.joursDemiJournee || []).includes(dow)) info.capacite = 1;
  return info;
}

export const estOuvre = (cal, dateISO) => dayInfo(cal, dateISO).capacite > 0;

/** Tous les jours d'un mois '2026-10', décrits. */
export function monthDays(cal, mois) {
  const n = daysInMonth(mois);
  const out = [];
  for (let j = 1; j <= n; j++) out.push(dayInfo(cal, `${mois}-${String(j).padStart(2,'0')}`));
  return out;
}

/**
 * Anssaf ayam d'étude d'un mois, éventuellement bornés par les dates
 * d'inscription / de radiation d'un élève.
 */
export function anssafEtudeMois(cal, mois, { from = null, to = null } = {}) {
  let total = 0;
  for (const d of monthDays(cal, mois)) {
    if (from && d.date < from) continue;
    if (to && d.date > to) continue;
    total += d.capacite;
  }
  return total;
}

/** Regroupe les jours consécutifs partageant la même période (pour l'affichage vertical du libellé). */
export function spansConges(days) {
  const spans = [];
  let cur = null;
  for (const d of days) {
    const key = d.periode ? d.periode.id : (d.kind === 'ecole' ? null : d.kind);
    if (cur && cur.key === key && key !== null) { cur.len++; continue; }
    cur = { key, len: 1, day: d, start: d.jour };
    spans.push(cur);
  }
  return spans;
}
