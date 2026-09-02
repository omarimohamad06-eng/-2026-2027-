/**
 * Moteur de synchronisation — volontairement ignorant de Firebase.
 *
 * Il ne connaît que deux interfaces :
 *   local   : { snapshot(), appliquer(plan) }
 *   distant : { pull(), push(plan) }
 *
 * Cette séparation permet de vérifier toute la logique de fusion contre un
 * serveur factice (`remote-memory.js`), sans réseau ni compte.
 *
 * Règle de fusion : dernière écriture gagnante, horodatage ISO.
 *   - un document porte `updatedAt`, une suppression porte `deletedAt` ;
 *   - la plus récente des deux l'emporte ;
 *   - à égalité stricte, le document l'emporte sur la suppression : entre
 *     perdre et garder une donnée, on garde.
 */

export const STORES_SYNC = ['settings', 'classes', 'students', 'registers', 'calendar'];

const cle = (store, id) => `${store}/${id}`;
const dateDoc = doc => doc?.updatedAt || '';
const dateTombe = t => t?.deletedAt || '';

/** Indexe { store: [docs] } en Map cle -> doc. */
function indexer(donnees) {
  const m = new Map();
  for (const store of STORES_SYNC) {
    for (const doc of donnees?.[store] || []) m.set(cle(store, doc.id), { store, doc });
  }
  return m;
}

const indexerTombes = suppressions => {
  const m = new Map();
  for (const t of suppressions || []) m.set(t.cle ?? cle(t.store, t.id), t);
  return m;
};

/**
 * Compare l'état local et l'état distant et produit les deux plans à appliquer.
 * Fonction pure : aucun effet de bord, entièrement testable.
 */
export function fusionner(local, distant) {
  const docsL = indexer(local.donnees), docsD = indexer(distant.donnees);
  const tombesL = indexerTombes(local.suppressions), tombesD = indexerTombes(distant.suppressions);

  const localAEcrire = { donnees: {}, aSupprimer: [], suppressions: [] };
  const distantAPousser = { donnees: {}, suppressions: [] };
  const stats = { recus: 0, envoyes: 0, supprimesLocalement: 0, supprimesADistance: 0, conflits: 0 };

  const ajouter = (plan, store, doc) => (plan.donnees[store] ||= []).push(doc);

  const toutesLesCles = new Set([...docsL.keys(), ...docsD.keys(), ...tombesL.keys(), ...tombesD.keys()]);

  for (const k of toutesLesCles) {
    const [store, id] = [k.slice(0, k.indexOf('/')), k.slice(k.indexOf('/') + 1)];
    const l = docsL.get(k)?.doc, d = docsD.get(k)?.doc;
    const tl = tombesL.get(k), td = tombesD.get(k);

    // Le candidat le plus récent de chaque côté (document ou suppression).
    const meilleur = (doc, tombe) => {
      if (doc && tombe) return dateTombe(tombe) > dateDoc(doc) ? { tombe } : { doc };
      return doc ? { doc } : tombe ? { tombe } : null;
    };
    const cL = meilleur(l, tl), cD = meilleur(d, td);

    if (!cL && !cD) continue;

    let gagnant, cote;
    if (cL && cD) {
      const dL = cL.doc ? dateDoc(cL.doc) : dateTombe(cL.tombe);
      const dD = cD.doc ? dateDoc(cD.doc) : dateTombe(cD.tombe);
      if (dL === dD) { gagnant = cL.doc ? cL : cD; cote = cL.doc ? 'local' : 'distant'; }
      else if (dL > dD) { gagnant = cL; cote = 'local'; }
      else { gagnant = cD; cote = 'distant'; }
      if (cL.doc && cD.doc && JSON.stringify(cL.doc) !== JSON.stringify(cD.doc)) stats.conflits++;
    } else if (cL) { gagnant = cL; cote = 'local'; }
    else { gagnant = cD; cote = 'distant'; }

    if (gagnant.doc) {
      if (cote === 'local') {
        // À pousser seulement si le distant ne l'a pas déjà à l'identique.
        if (!d || dateDoc(d) !== dateDoc(gagnant.doc)) { ajouter(distantAPousser, store, gagnant.doc); stats.envoyes++; }
      } else {
        if (!l || dateDoc(l) !== dateDoc(gagnant.doc)) { ajouter(localAEcrire, store, gagnant.doc); stats.recus++; }
        if (tl) localAEcrire.suppressions.push({ ...tl, annulee: true });  // la tombe locale est périmée
      }
    } else {
      const t = { cle: k, store, id, deletedAt: dateTombe(gagnant.tombe) };
      if (cote === 'distant') {
        if (l) { localAEcrire.aSupprimer.push({ store, id }); stats.supprimesLocalement++; }
        if (!tl) localAEcrire.suppressions.push(t);
      } else if (!td) {
        distantAPousser.suppressions.push(t);
        if (d) stats.supprimesADistance++;
      }
    }
  }

  return { localAEcrire, distantAPousser, stats };
}

/**
 * Cycle complet : lire les deux côtés, fusionner, appliquer de part et d'autre.
 * L'écriture distante précède l'écriture locale : si le réseau lâche en cours
 * de route, la prochaine synchronisation repart d'un état local intact.
 */
export async function synchroniser(local, distant) {
  const etatLocal = await local.snapshot();
  const etatDistant = await distant.pull();
  const { localAEcrire, distantAPousser, stats } = fusionner(etatLocal, etatDistant);

  const riena = plan => !Object.keys(plan.donnees).length && !plan.suppressions.length
    && !(plan.aSupprimer || []).length;

  if (!riena(distantAPousser)) await distant.push(distantAPousser);
  if (!riena(localAEcrire)) await local.appliquer(localAEcrire);

  return { ...stats, horodatage: new Date().toISOString() };
}
