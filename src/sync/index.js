/**
 * Orchestration de la synchronisation : configuration, session, cadence.
 *
 * Principe : IndexedDB reste la source de vérité. Firestore n'est qu'un miroir.
 * Si le nuage est injoignable, l'application continue exactement comme avant ;
 * les modifications partiront à la prochaine synchronisation réussie.
 */
import { synchroniser } from './engine.js';
import { localIdb, etatSync, majEtatSync, identifiantAppareil, descriptionAppareil } from './local-idb.js';
import { ouvrirSession, reprendreSession, fermerSession, messageErreur } from './remote-firebase.js';

const CLE_CONFIG = 'sijil.firebase.config';
const PERIODE_AUTO = 10 * 60 * 1000;   // 10 minutes
const DELAI_APRES_MODIF = 20 * 1000;   // 20 s après la dernière saisie

let distant = null;          // adaptateur actif, ou null si hors ligne / non connecté
let minuteur = null;
let differe = null;
let enCours = false;
const abonnes = new Set();

/* ---------------- Configuration Firebase (publique, propre à l'appareil) ---------------- */

export function configFirebase() {
  try { return JSON.parse(localStorage.getItem(CLE_CONFIG) || 'null'); } catch { return null; }
}

export function enregistrerConfig(config) {
  if (config) localStorage.setItem(CLE_CONFIG, JSON.stringify(config));
  else localStorage.removeItem(CLE_CONFIG);
}

const CHAMPS_REQUIS = ['apiKey', 'authDomain', 'projectId', 'appId'];

/** Accepte l'objet de configuration collé depuis la console Firebase. */
export function analyserConfig(texte) {
  const brut = String(texte || '').trim();
  if (!brut) throw new Error('CONFIG_VIDE');
  // Tolère aussi bien du JSON strict que le littéral JavaScript de la console.
  const objet = brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1)
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1');
  let config;
  try { config = JSON.parse(objet); } catch { throw new Error('CONFIG_ILLISIBLE'); }
  const manquants = CHAMPS_REQUIS.filter(c => !config[c]);
  if (manquants.length) { const e = new Error('CONFIG_INCOMPLETE'); e.manquants = manquants; throw e; }
  return config;
}

/* ---------------- État observable ---------------- */

export const surChangement = fn => { abonnes.add(fn); return () => abonnes.delete(fn); };
const prevenir = async () => { const e = await etat(); for (const fn of abonnes) fn(e); };

export async function etat() {
  return { ...(await etatSync()), connecte: !!distant, configuree: !!configFirebase(), enCours };
}

/* ---------------- Session ---------------- */

export async function connecter({ email, motDePasse, mode = 'connexion', reprendreAppareil = false }) {
  const config = configFirebase();
  if (!config) throw new Error('CONFIG_ABSENTE');
  const deviceId = await identifiantAppareil();
  const deviceLabel = (await etatSync()).deviceLabel || descriptionAppareil();

  const session = await ouvrirSession({ config, email, motDePasse, mode, deviceId, deviceLabel, reprendreAppareil });
  distant = session.remote;
  await majEtatSync({ actif: true, email, uid: session.uid, deviceLabel, derniereErreur: '' });
  await prevenir();
  return synchroniserMaintenant();
}

/** Au démarrage : reprend la session Firebase si elle existe encore. */
export async function reprendre() {
  const config = configFirebase();
  const e = await etatSync();
  if (!config || !e.actif) return null;
  try {
    const deviceId = await identifiantAppareil();
    const session = await reprendreSession({ config, deviceId });
    if (!session) return null;
    distant = session.remote;
    await prevenir();
    return session;
  } catch (err) {
    await majEtatSync({ derniereErreur: messageErreur(err) });
    return null;
  }
}

export async function deconnecter({ libererAppareil = false } = {}) {
  try {
    if (libererAppareil && distant) await distant.libererAppareil();
    await fermerSession();
  } finally {
    distant = null;
    arreterAuto();
    await majEtatSync({ actif: false, uid: '' });
    await prevenir();
  }
}

/* ---------------- Synchronisation ---------------- */

export async function synchroniserMaintenant() {
  if (!distant) throw new Error('NON_CONNECTE');
  if (enCours) return null;
  if (!navigator.onLine) throw new Error('HORS_LIGNE');
  enCours = true;
  await prevenir();
  try {
    const stats = await synchroniser(localIdb, distant);
    await majEtatSync({ derniereSync: stats.horodatage, derniereErreur: '' });
    return stats;
  } catch (err) {
    await majEtatSync({ derniereErreur: messageErreur(err) });
    throw err;
  } finally {
    enCours = false;
    await prevenir();
  }
}

/** Synchronisation silencieuse : ne dérange pas l'utilisateur en cas d'échec. */
async function synchroniserDiscretement() {
  try { await synchroniserMaintenant(); } catch { /* réessai à la prochaine occasion */ }
}

/**
 * Signalé par l'application après chaque modification locale : la
 * synchronisation part une fois la saisie terminée, pas à chaque clic.
 */
export function signalerModification() {
  if (!distant) return;
  clearTimeout(differe);
  differe = setTimeout(synchroniserDiscretement, DELAI_APRES_MODIF);
}

export async function demarrerAuto() {
  const e = await etatSync();
  if (!distant || !e.auto) return;
  arreterAuto();
  minuteur = setInterval(synchroniserDiscretement, PERIODE_AUTO);
  addEventListener('online', synchroniserDiscretement);
  synchroniserDiscretement();
}

export function arreterAuto() {
  clearInterval(minuteur);
  clearTimeout(differe);
  minuteur = differe = null;
  removeEventListener('online', synchroniserDiscretement);
}

export async function reglerAuto(auto) {
  await majEtatSync({ auto });
  if (auto) await demarrerAuto(); else arreterAuto();
  await prevenir();
}

export { messageErreur };
