/** Accès aux données métier (au-dessus d'IndexedDB). */
import * as idb from './idb.js';
import { DEFAULT_SETTINGS } from '../data/defaults.js';
import { CALENDAR_2026_2027 } from '../data/calendar-2026-2027.js';
import { emptyRegister, registerId } from '../core/attendance.js';
import { uid } from '../utils/dom.js';

const now = () => new Date().toISOString();

/** Premier démarrage : injecte les valeurs par défaut et le calendrier scolaire. */
export async function init() {
  if (!(await idb.get('settings', 1))) {
    await idb.put('settings', { ...DEFAULT_SETTINGS, updatedAt: now() });
  }
  if (!(await idb.get('calendar', CALENDAR_2026_2027.id))) {
    await idb.put('calendar', structuredClone(CALENDAR_2026_2027));
  }
}

/* ---------------- Établissement ---------------- */
export const getSettings = async () => (await idb.get('settings', 1)) || { ...DEFAULT_SETTINGS };
export const saveSettings = s => idb.put('settings', { ...s, id: 1, updatedAt: now() });

/* ---------------- Calendrier ---------------- */
export const getCalendar = async () =>
  (await idb.get('calendar', CALENDAR_2026_2027.id)) || structuredClone(CALENDAR_2026_2027);
export const saveCalendar = c => idb.put('calendar', c);
export const resetCalendar = () => idb.put('calendar', structuredClone(CALENDAR_2026_2027));

/* ---------------- Classes ---------------- */
export async function listClasses() {
  const rows = await idb.getAll('classes');
  return rows.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.nom.localeCompare(b.nom, 'ar'));
}
export const getClass = id => idb.get('classes', id);

export async function saveClass(cls) {
  const c = { ...cls };
  if (!c.id) { c.id = uid('cls'); c.createdAt = now(); }
  if (c.ordre === undefined || c.ordre === null || c.ordre === '') {
    c.ordre = (await idb.getAll('classes')).length + 1;
  }
  c.ordre = Number(c.ordre);
  await idb.put('classes', c);
  return c;
}

/** Supprime une classe ainsi que ses élèves et ses registres mensuels. */
export async function deleteClass(id) {
  await idb.deleteWhere('students', s => s.classId === id);
  await idb.deleteWhere('registers', r => r.classId === id);
  await idb.del('classes', id);
}

/* ---------------- Élèves ---------------- */
export async function listStudents(classId) {
  const rows = await idb.byIndex('students', 'classId', classId);
  return rows.sort((a, b) => (a.rt ?? 0) - (b.rt ?? 0));
}

/** Prochain رقم ترتيب libre : max + 1, pour éviter les doublons après suppression. */
async function prochainRt(classId) {
  const rows = await listStudents(classId);
  return rows.reduce((m, s) => Math.max(m, Number(s.rt) || 0), 0) + 1;
}

export async function saveStudent(st) {
  const s = { ...st };
  if (!s.id) s.id = uid('std');
  if (!s.rt) s.rt = await prochainRt(s.classId);
  s.rt = Number(s.rt);
  s.actif = s.actif !== false;
  await idb.put('students', s);
  return s;
}

/** Ajout en lot (saisie multiligne, import CSV, collage Excel). */
export async function addStudents(classId, list) {
  let rt = (await prochainRt(classId)) - 1;
  const rows = list.map(x => ({
    id: uid('std'), classId, rt: ++rt,
    nom: x.nom, codeMassar: x.codeMassar || '', sexe: x.sexe || '',
    actif: true, dateInscription: x.dateInscription || null, dateRadiation: null,
  }));
  await idb.bulkPut('students', rows);
  return rows;
}

/** Supprime l'élève et efface ses cellules dans tous les registres de sa classe. */
export async function deleteStudent(student) {
  const regs = await idb.byIndex('registers', 'classId', student.classId);
  for (const r of regs) {
    if (r.cells?.[student.id] || r.notes?.[student.id]) {
      delete r.cells[student.id]; delete r.notes[student.id];
      await idb.put('registers', r);
    }
  }
  await idb.del('students', student.id);
}

/** Renumérote ر.ت de 1..n dans l'ordre fourni. */
export async function renumber(students) {
  const rows = students.map((s, i) => ({ ...s, rt: i + 1 }));
  await idb.bulkPut('students', rows);
  return rows;
}

/* ---------------- Registres mensuels ---------------- */
export async function getRegister(classId, mois) {
  return (await idb.get('registers', registerId(classId, mois))) || emptyRegister(classId, mois);
}
export const saveRegister = reg => idb.put('registers', { ...reg, updatedAt: now() });

export async function registersByMois(classId) {
  const rows = await idb.byIndex('registers', 'classId', classId);
  return Object.fromEntries(rows.map(r => [r.mois, r]));
}

/* ---------------- Divers ---------------- */
export const dumpAll = async () => Object.fromEntries(
  await Promise.all(idb.STORES.map(async s => [s, await idb.getAll(s)]))
);
