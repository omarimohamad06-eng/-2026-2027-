/** Côté local de la synchronisation : lecture/écriture dans IndexedDB. */
import * as idb from '../db/idb.js';
import { STORES_SYNC } from './engine.js';

export const localIdb = {
  async snapshot() {
    const donnees = {};
    for (const store of STORES_SYNC) donnees[store] = await idb.getAll(store);
    return { donnees, suppressions: await idb.getAll('deletions') };
  },

  async appliquer(plan) {
    for (const [store, docs] of Object.entries(plan.donnees || {})) {
      if (docs.length) await idb.bulkPut(store, docs);
    }
    for (const { store, id } of plan.aSupprimer || []) await idb.del(store, id);
    for (const t of plan.suppressions || []) {
      if (t.annulee) await idb.del('deletions', t.cle);
      else await idb.put('deletions', t);
    }
  },
};

/* ---------------- État local de la synchronisation ---------------- */

const DEFAUT = {
  id: 1,
  actif: false,
  email: '',
  uid: '',
  deviceId: '',
  deviceLabel: '',
  derniereSync: null,
  auto: true,
  derniereErreur: '',
};

export const etatSync = async () => ({ ...DEFAUT, ...(await idb.get('sync', 1)) });

export async function majEtatSync(champs) {
  const etat = { ...(await etatSync()), ...champs, id: 1 };
  await idb.put('sync', etat);
  return etat;
}

/** Identifiant d'appareil, créé une seule fois et conservé localement. */
export async function identifiantAppareil() {
  const etat = await etatSync();
  if (etat.deviceId) return etat.deviceId;
  const deviceId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  await majEtatSync({ deviceId, deviceLabel: etat.deviceLabel || descriptionAppareil() });
  return deviceId;
}

/** Description lisible de l'appareil, pour que l'utilisateur s'y retrouve. */
export function descriptionAppareil() {
  const ua = navigator.userAgent || '';
  const systeme = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux' : 'appareil';
  const navigateur = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'navigateur';
  return `${navigateur} — ${systeme}`;
}
