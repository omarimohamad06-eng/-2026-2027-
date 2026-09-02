/**
 * Serveur factice, en mémoire, respectant la même interface que l'adaptateur
 * Firebase. Il sert à vérifier le moteur de fusion sans réseau ni compte, et
 * documente exactement ce que l'adaptateur réel doit faire.
 */
import { STORES_SYNC } from './engine.js';

export function remoteMemoire(etatInitial = {}) {
  const donnees = {};
  for (const store of STORES_SYNC) {
    donnees[store] = new Map((etatInitial.donnees?.[store] || []).map(d => [String(d.id), d]));
  }
  const suppressions = new Map((etatInitial.suppressions || []).map(t => [t.cle, t]));

  return {
    async pull() {
      return {
        donnees: Object.fromEntries(STORES_SYNC.map(s => [s, [...donnees[s].values()]])),
        suppressions: [...suppressions.values()],
      };
    },

    async push(plan) {
      for (const [store, docs] of Object.entries(plan.donnees || {})) {
        for (const doc of docs) donnees[store].set(String(doc.id), doc);
      }
      for (const t of plan.suppressions || []) {
        suppressions.set(t.cle, t);
        donnees[t.store]?.delete(String(t.id));
      }
    },

    /** Pour les tests : lecture directe de l'état du « serveur ». */
    contenu: () => Object.fromEntries(STORES_SYNC.map(s => [s, [...donnees[s].values()]])),
    tombes: () => [...suppressions.values()],
  };
}

/** Dépôt local factice, même interface que `local-idb.js`. */
export function localMemoire(etatInitial = {}) {
  const donnees = {};
  for (const store of STORES_SYNC) {
    donnees[store] = new Map((etatInitial.donnees?.[store] || []).map(d => [String(d.id), d]));
  }
  const suppressions = new Map((etatInitial.suppressions || []).map(t => [t.cle, t]));

  return {
    async snapshot() {
      return {
        donnees: Object.fromEntries(STORES_SYNC.map(s => [s, [...donnees[s].values()]])),
        suppressions: [...suppressions.values()],
      };
    },

    async appliquer(plan) {
      for (const [store, docs] of Object.entries(plan.donnees || {})) {
        for (const doc of docs) donnees[store].set(String(doc.id), doc);
      }
      for (const { store, id } of plan.aSupprimer || []) donnees[store].delete(String(id));
      for (const t of plan.suppressions || []) {
        if (t.annulee) suppressions.delete(t.cle);
        else suppressions.set(t.cle, t);
      }
    },

    contenu: () => Object.fromEntries(STORES_SYNC.map(s => [s, [...donnees[s].values()]])),
    tombes: () => [...suppressions.values()],
  };
}
