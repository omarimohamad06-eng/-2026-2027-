/** État partagé de l'application (chargé une fois, rafraîchi à la demande). */
import * as repo from '../db/repo.js';
import { MOIS_SCOLAIRES } from '../data/calendar-2026-2027.js';
import { todayISO } from '../core/schoolCalendar.js';

const LS_CLASS = 'sijil.classId';
const LS_MOIS  = 'sijil.mois';

export const app = {
  settings: null,
  calendar: null,
  classes: [],
  classId: localStorage.getItem(LS_CLASS) || null,
  mois: localStorage.getItem(LS_MOIS) || moisParDefaut(),
};

function moisParDefaut() {
  const m = todayISO().slice(0, 7);
  return MOIS_SCOLAIRES.includes(m) ? m : MOIS_SCOLAIRES[0];
}

export async function refresh() {
  app.settings = await repo.getSettings();
  app.calendar = await repo.getCalendar();
  app.classes = await repo.listClasses();
  if (!app.classes.some(c => c.id === app.classId)) app.classId = app.classes[0]?.id || null;
  if (!MOIS_SCOLAIRES.includes(app.mois)) app.mois = moisParDefaut();
  return app;
}

export function setClass(id) { app.classId = id; localStorage.setItem(LS_CLASS, id ?? ''); }
export function setMois(m)   { app.mois = m;    localStorage.setItem(LS_MOIS, m); }
export const currentClass = () => app.classes.find(c => c.id === app.classId) || null;
