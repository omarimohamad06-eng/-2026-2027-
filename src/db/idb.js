/**
 * Mini-couche IndexedDB (remplace Dexie) — aucune dépendance externe,
 * pour un fonctionnement 100 % hors-ligne.
 */
const DB_NAME = 'sijil_hodour_2026_2027';
const DB_VERSION = 1;

/** store -> { keyPath, indexes: [[nom, chemin]] } */
const SCHEMA = {
  settings : { keyPath: 'id', indexes: [] },
  classes  : { keyPath: 'id', indexes: [['ordre', 'ordre']] },
  students : { keyPath: 'id', indexes: [['classId', 'classId']] },
  registers: { keyPath: 'id', indexes: [['classId', 'classId'], ['mois', 'mois']] },
  calendar : { keyPath: 'id', indexes: [] },
};

export const STORES = Object.keys(SCHEMA);

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(SCHEMA)) {
        const store = db.objectStoreNames.contains(name)
          ? req.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: def.keyPath });
        for (const [idxName, path] of def.indexes) {
          if (!store.indexNames.contains(idxName)) store.createIndex(idxName, path);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('قاعدة البيانات مفتوحة في تبويب آخر. أغلق التبويبات الأخرى.'));
  });
  return dbPromise;
}

/**
 * Une lecture se résout dès que la requête aboutit ; une écriture attend la
 * validation de la transaction, pour ne jamais annoncer un enregistrement
 * qu'un abandon ultérieur (quota dépassé, onglet fermé) aurait annulé.
 */
function run(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    let valeur;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transaction annulée'));
    if (req) {
      req.onerror = () => reject(req.error);
      if (mode === 'readonly') req.onsuccess = () => resolve(req.result);
      else req.onsuccess = () => { valeur = req.result; };
    }
    if (mode !== 'readonly' || !req) tx.oncomplete = () => resolve(valeur);
  }));
}

export const get    = (store, key)    => run(store, 'readonly',  s => s.get(key));
export const getAll = (store)         => run(store, 'readonly',  s => s.getAll());
export const put    = (store, value)  => run(store, 'readwrite', s => s.put(value));
export const del    = (store, key)    => run(store, 'readwrite', s => s.delete(key));
export const clear  = (store)         => run(store, 'readwrite', s => s.clear());

export const byIndex = (store, index, value) =>
  run(store, 'readonly', s => s.index(index).getAll(value));

export function bulkPut(store, values) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function deleteWhere(store, predicate) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    let n = 0;
    os.openCursor().onsuccess = e => {
      const cur = e.target.result;
      if (!cur) return;
      if (predicate(cur.value)) { cur.delete(); n++; }
      cur.continue();
    };
    tx.oncomplete = () => resolve(n);
    tx.onerror = () => reject(tx.error);
  }));
}
