/** Sauvegarde / restauration complète au format JSON. */
import * as idb from './idb.js';
import { dumpAll } from './repo.js';

export const FORMAT = 'sijil-hodour-backup';
export const FORMAT_VERSION = 1;

export async function exportBackup() {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: await dumpAll(),
  };
}

/**
 * Restaure une sauvegarde.
 * mode 'replace' : vide la base avant restauration. mode 'merge' : écrase clé par clé.
 */
export async function importBackup(payload, mode = 'replace') {
  if (!payload || payload.format !== FORMAT) throw new Error('ملف النسخة الاحتياطية غير صالح.');
  if (Number(payload.version) > FORMAT_VERSION) throw new Error('النسخة الاحتياطية أحدث من هذا الإصدار من التطبيق.');
  const data = payload.data || {};
  let n = 0;
  for (const store of idb.STORES) {
    const rows = Array.isArray(data[store]) ? data[store] : [];
    if (mode === 'replace') await idb.clear(store);
    if (rows.length) { await idb.bulkPut(store, rows); n += rows.length; }
  }
  return n;
}
