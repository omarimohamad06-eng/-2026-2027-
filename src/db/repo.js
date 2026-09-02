/** Accès aux données métier (au-dessus d'IndexedDB). */
import * as idb from './idb.js';
import { DEFAULT_SETTINGS } from '../data/defaults.js';
import { CALENDAR_2026_2027 } from '../data/calendar-2026-2027.js';
import { emptyRegister, registerId } from '../core/attendance.js';
import { uid } from '../utils/dom.js';

const now = () => new Date().toISOString();

/**
 * Signale une écriture locale. La synchronisation s'y abonne ; la couche de
 * données, elle, ignore jusqu'à l'existence de Firebase.
 */
const signaler = () => {
  if (typeof dispatchEvent === 'function') dispatchEvent(new Event('donnees-modifiees'));
};

/** Marque un enregistrement comme modifié maintenant (base de la fusion par date). */
const marquer = obj => { signaler(); return { ...obj, updatedAt: now() }; };

/**
 * Pierre tombale : une suppression doit voyager comme une modification,
 * sinon la synchronisation ferait réapparaître l'enregistrement supprimé.
 */
const tombale = (store, id) => {
  signaler();
  return idb.put('deletions', { cle: `${store}/${id}`, store, id, deletedAt: now() });
};

/** Premier démarrage : injecte les valeurs par défaut et le calendrier scolaire. */
export async function init() {
  if (!(await idb.get('settings', 1))) {
    await idb.put('settings', { ...DEFAULT_SETTINGS, updatedAt: now() });
  }
  if (!(await idb.get('calendar', CALENDAR_2026_2027.id))) {
    await idb.put('calendar', { ...structuredClone(CALENDAR_2026_2027), updatedAt: now() });
  }
  await horodaterAncienneteManquante();
}

/**
 * Les enregistrements créés avant l'arrivée de la synchronisation n'ont pas de
 * date de modification. Sans elle, la fusion les considérerait comme
 * infiniment anciens : on les horodate une bonne fois, au premier démarrage
 * suivant la mise à jour.
 */
async function horodaterAncienneteManquante() {
  const date = now();
  for (const store of idb.STORES_DONNEES) {
    const sansDate = (await idb.getAll(store)).filter(d => !d.updatedAt);
    if (sansDate.length) await idb.bulkPut(store, sansDate.map(d => ({ ...d, updatedAt: date })));
  }
}

/* ---------------- Établissement ---------------- */
export const getSettings = async () => (await idb.get('settings', 1)) || { ...DEFAULT_SETTINGS };
export const saveSettings = s => idb.put('settings', marquer({ ...s, id: 1 }));

/* ---------------- Calendrier ---------------- */
export const getCalendar = async () =>
  (await idb.get('calendar', CALENDAR_2026_2027.id)) || structuredClone(CALENDAR_2026_2027);
export const saveCalendar = c => idb.put('calendar', marquer(c));
export const resetCalendar = () => idb.put('calendar', marquer(structuredClone(CALENDAR_2026_2027)));

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
  const enregistre = marquer(c);
  await idb.put('classes', enregistre);
  return enregistre;
}

/** Supprime une classe ainsi que ses élèves et ses registres mensuels. */
export async function deleteClass(id) {
  for (const s of await idb.byIndex('students', 'classId', id)) {
    await idb.del('students', s.id);
    await tombale('students', s.id);
  }
  for (const r of await idb.byIndex('registers', 'classId', id)) {
    await idb.del('registers', r.id);
    await tombale('registers', r.id);
  }
  await idb.del('classes', id);
  await tombale('classes', id);
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
  const enregistre = marquer(s);
  await idb.put('students', enregistre);
  return enregistre;
}

/** Ajout en lot (saisie multiligne, import CSV, collage Excel). */
export async function addStudents(classId, list) {
  let rt = (await prochainRt(classId)) - 1;
  const rows = list.map(x => marquer({
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
      await idb.put('registers', marquer(r));
    }
  }
  await idb.del('students', student.id);
  await tombale('students', student.id);
}

/** Renumérote ر.ت de 1..n dans l'ordre fourni. */
export async function renumber(students) {
  const rows = students.map((s, i) => marquer({ ...s, rt: i + 1 }));
  await idb.bulkPut('students', rows);
  return rows;
}

/* ---------------- Registres mensuels ---------------- */
export async function getRegister(classId, mois) {
  return (await idb.get('registers', registerId(classId, mois))) || emptyRegister(classId, mois);
}
export const saveRegister = reg => idb.put('registers', marquer(reg));

export async function registersByMois(classId) {
  const rows = await idb.byIndex('registers', 'classId', classId);
  return Object.fromEntries(rows.map(r => [r.mois, r]));
}

/* ---------------- Divers ---------------- */
export const dumpAll = async () => Object.fromEntries(
  await Promise.all(idb.STORES_DONNEES.map(async s => [s, await idb.getAll(s)]))
);

/** Instantané complet destiné à la synchronisation : données + pierres tombales. */
export async function snapshot() {
  const donnees = await dumpAll();
  return { donnees, suppressions: await idb.getAll('deletions') };
}
