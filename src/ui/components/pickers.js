/** Sélecteurs réutilisables : classe et mois scolaire. */
import { h } from '../../utils/dom.js';
import { app, setClass, setMois } from '../app.js';
import { MOIS_SCOLAIRES } from '../../data/calendar-2026-2027.js';
import { moisLabel } from '../../core/schoolCalendar.js';

export function classSelect(onChange) {
  const sel = h('select', {
    onchange: e => { setClass(e.target.value); onChange?.(e.target.value); },
  }, app.classes.map(c => h('option', {
    value: c.id, selected: c.id === app.classId,
  }, `${c.nom}${c.fawj ? ' — ' + c.fawj : ''}`)));
  if (!app.classes.length) { sel.append(h('option', { value: '' }, 'لا يوجد قسم')); sel.disabled = true; }
  return h('div.field', {}, h('label', {}, 'القسم'), sel);
}

export function moisSelect(onChange) {
  return h('div.field', {}, h('label', {}, 'الشهر'),
    h('select', {
      onchange: e => { setMois(e.target.value); onChange?.(e.target.value); },
    }, MOIS_SCOLAIRES.map(m => h('option', { value: m, selected: m === app.mois }, moisLabel(m)))));
}

export function emptyState(icon, titre, texte, action) {
  return h('div.card', {}, h('div.empty', {},
    h('div.big', {}, icon), h('h2', {}, titre), h('p.muted', {}, texte), action || null));
}
