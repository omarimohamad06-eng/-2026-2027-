/** Calculs : anssaf ayam, نسبة المواظبة mensuelle et annuelle, alertes. */
import { monthDays } from './schoolCalendar.js';
import { poidsAbsence, estJustifie } from './attendance.js';
import { MOIS_SCOLAIRES } from '../data/calendar-2026-2027.js';

export const pct = (num, den) => (den > 0 ? Math.round((num / den) * 10000) / 100 : 0);

/**
 * Statistiques d'un mois pour une classe.
 * Rien n'est stocké : tout est recalculé à partir du calendrier courant,
 * ce qui garde les taux justes même si une date de vacances est corrigée après coup.
 */
export function statsMois(cal, mois, students, register, settings = {}) {
  const days = monthDays(cal, mois);
  const cells = register?.cells || {};
  const notes = register?.notes || {};
  const seuilAbs = settings.seuilAlerteAbsence ?? 8;
  const seuilTaux = settings.seuilTauxFaible ?? 90;

  const rows = students.map(st => {
    let etude = 0, absence = 0, justifiee = 0, retards = 0;
    const cs = cells[st.id] || {};
    for (const d of days) {
      if (d.capacite <= 0) continue;
      if (st.dateInscription && d.date < st.dateInscription) continue;
      if (st.dateRadiation && d.date > st.dateRadiation) continue;
      etude += d.capacite;
      const code = cs[String(d.jour)];
      if (!code) continue;
      if (code === 'r') { retards++; continue; }
      const p = poidsAbsence(code, d.capacite);
      absence += p;
      if (estJustifie(code)) justifiee += p;
    }
    const presence = Math.max(0, etude - absence);
    const taux = pct(presence, etude);
    return {
      student: st, etude, absence, justifiee,
      nonJustifiee: absence - justifiee, retards, presence, taux,
      note: notes[st.id] || '',
      alerte: etude > 0 && (absence >= seuilAbs || taux < seuilTaux),
    };
  });

  const totalEtude = rows.reduce((s, r) => s + r.etude, 0);
  const totalPresence = rows.reduce((s, r) => s + r.presence, 0);
  const totalAbsence = rows.reduce((s, r) => s + r.absence, 0);

  return {
    mois, days, rows,
    totals: {
      etude: totalEtude, presence: totalPresence, absence: totalAbsence,
      taux: pct(totalPresence, totalEtude),
      joursOuvres: days.filter(d => d.capacite > 0).length,
    },
  };
}

/** Synthèse annuelle d'une classe : cumul de septembre à juin. */
export function statsAnnee(cal, students, registersByMois, settings = {}) {
  const parMois = [];
  const cumul = new Map(students.map(s => [s.id, {
    student: s, etude: 0, absence: 0, justifiee: 0, retards: 0, presence: 0, taux: 0, moisAlerte: 0,
  }]));

  for (const mois of MOIS_SCOLAIRES) {
    const s = statsMois(cal, mois, students, registersByMois[mois], settings);
    parMois.push({ mois, taux: s.totals.taux, etude: s.totals.etude, absence: s.totals.absence });
    for (const r of s.rows) {
      const c = cumul.get(r.student.id);
      c.etude += r.etude; c.absence += r.absence; c.justifiee += r.justifiee;
      c.retards += r.retards; c.presence += r.presence;
      if (r.alerte) c.moisAlerte++;
    }
  }

  const eleves = [...cumul.values()].map(c => ({
    ...c, nonJustifiee: c.absence - c.justifiee, taux: pct(c.presence, c.etude),
  })).sort((a, b) => a.taux - b.taux);

  const etude = eleves.reduce((s, e) => s + e.etude, 0);
  const presence = eleves.reduce((s, e) => s + e.presence, 0);

  return {
    parMois, eleves,
    global: {
      etude, presence, absence: etude - presence, taux: pct(presence, etude),
      enAlerte: eleves.filter(e => e.etude > 0 && e.taux < (settings.seuilTauxFaible ?? 90)).length,
    },
  };
}
