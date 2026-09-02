/**
 * Adaptateur Firebase — la seule partie du code qui connaît Firestore.
 *
 * Le SDK est chargé **à la demande**, par import dynamique depuis gstatic :
 * tant que la synchronisation n'est pas activée, l'application reste sans
 * aucune dépendance externe et fonctionne hors connexion comme avant.
 *
 * Arborescence Firestore (un utilisateur = un enseignant) :
 *
 *   users/{uid}                       → { device: { id, label, claimedAt }, email }
 *   users/{uid}/settings/{id}
 *   users/{uid}/classes/{id}
 *   users/{uid}/students/{id}
 *   users/{uid}/registers/{id}
 *   users/{uid}/calendar/{id}
 *   users/{uid}/deletions/{cle}       → pierres tombales (la clé « store/id »
 *                                       devient « store~id », « / » étant
 *                                       interdit dans un identifiant de document)
 *
 * Les règles de sécurité correspondantes sont dans `firestore.rules`, à la
 * racine du dépôt : elles limitent chaque utilisateur à ses propres données
 * et imposent l'enregistrement d'un seul appareil par compte.
 */
import { STORES_SYNC } from './engine.js';

const VERSION_SDK = '10.14.1';
const base = m => `https://www.gstatic.com/firebasejs/${VERSION_SDK}/firebase-${m}.js`;

let sdk = null;

/** Charge le SDK une seule fois. Nécessite une connexion internet. */
async function chargerSdk() {
  if (sdk) return sdk;
  try {
    const [app, auth, store] = await Promise.all([
      import(/* @vite-ignore */ base('app')),
      import(/* @vite-ignore */ base('auth')),
      import(/* @vite-ignore */ base('firestore')),
    ]);
    sdk = { app, auth, store };
    return sdk;
  } catch (e) {
    throw new Error('CHARGEMENT_SDK: ' + (e?.message || e));
  }
}

const idDoc = valeur => String(valeur);
const cleTombe = cle => cle.replace(/\//g, '~');

/** Firestore refuse les valeurs `undefined` : on nettoie par un aller-retour JSON. */
const nettoyer = obj => JSON.parse(JSON.stringify(obj));

/**
 * Ouvre une session : initialise Firebase, authentifie, revendique l'appareil.
 * mode : 'connexion' | 'creation'
 * reprendreAppareil : force la reprise du créneau si un autre appareil l'occupe.
 */
export async function ouvrirSession({ config, email, motDePasse, mode = 'connexion',
                                      deviceId, deviceLabel, reprendreAppareil = false }) {
  const { app, auth: A, store: F } = await chargerSdk();

  const application = app.getApps().length ? app.getApp() : app.initializeApp(config);
  const authentification = A.getAuth(application);
  const bdd = F.getFirestore(application);

  const identifiants = mode === 'creation'
    ? await A.createUserWithEmailAndPassword(authentification, email, motDePasse)
    : await A.signInWithEmailAndPassword(authentification, email, motDePasse);

  const uid = identifiants.user.uid;
  const refUtilisateur = F.doc(bdd, 'users', uid);
  const instantane = await F.getDoc(refUtilisateur);
  const appareilEnregistre = instantane.exists() ? instantane.data()?.device : null;

  if (appareilEnregistre && appareilEnregistre.id !== deviceId && !reprendreAppareil) {
    await A.signOut(authentification);
    const e = new Error('APPAREIL_DEJA_ENREGISTRE');
    e.appareil = appareilEnregistre;
    throw e;
  }

  await F.setDoc(refUtilisateur, {
    email,
    device: { id: deviceId, label: deviceLabel || '', claimedAt: new Date().toISOString() },
  }, { merge: true });

  return { uid, remote: remoteFirestore({ F, bdd, uid, deviceId, A, authentification }) };
}

/**
 * Reprend une session déjà ouverte : Firebase conserve l'authentification d'une
 * visite à l'autre, ce qui évite de redemander le mot de passe à chaque
 * ouverture de l'application.  Renvoie null si personne n'est connecté.
 */
export async function reprendreSession({ config, deviceId }) {
  const { app, auth: A, store: F } = await chargerSdk();
  const application = app.getApps().length ? app.getApp() : app.initializeApp(config);
  const authentification = A.getAuth(application);

  const utilisateur = await new Promise(resolve => {
    const stop = A.onAuthStateChanged(authentification, u => { stop(); resolve(u); });
  });
  if (!utilisateur) return null;

  const bdd = F.getFirestore(application);
  return {
    uid: utilisateur.uid,
    remote: remoteFirestore({ F, bdd, uid: utilisateur.uid, deviceId, A, authentification }),
  };
}

/** Ferme la session Firebase (les données locales, elles, restent intactes). */
export async function fermerSession() {
  if (!sdk) return;
  const { app, auth: A } = sdk;
  if (!app.getApps().length) return;
  await A.signOut(A.getAuth(app.getApp()));
}

/** Implémente l'interface `distant` attendue par le moteur de synchronisation. */
function remoteFirestore({ F, bdd, uid, deviceId }) {
  const collection = nom => F.collection(bdd, 'users', uid, nom);

  return {
    async pull() {
      // `_device` est une marque de contrôle ajoutée à l'écriture : elle sert
      // aux règles de sécurité et n'a rien à faire dans les données locales.
      const sansMarque = d => { const o = { ...d.data() }; delete o._device; return o; };
      const donnees = {};
      for (const store of STORES_SYNC) {
        const lot = await F.getDocs(collection(store));
        donnees[store] = lot.docs.map(sansMarque);
      }
      const tombes = await F.getDocs(collection('deletions'));
      return { donnees, suppressions: tombes.docs.map(sansMarque) };
    },

    async push(plan) {
      // Firestore limite un lot à 500 opérations : on écrit par tranches.
      // Chaque écriture porte l'identifiant de l'appareil : les règles de
      // sécurité s'en servent pour n'accepter que l'appareil enregistré.
      const marque = doc => ({ ...nettoyer(doc), _device: deviceId });
      const operations = [];
      for (const [store, docs] of Object.entries(plan.donnees || {})) {
        for (const doc of docs) {
          operations.push(() => [F.doc(bdd, 'users', uid, store, idDoc(doc.id)), marque(doc)]);
        }
      }
      for (const t of plan.suppressions || []) {
        operations.push(() => [F.doc(bdd, 'users', uid, 'deletions', cleTombe(t.cle)), marque(t)]);
        operations.push(() => [F.doc(bdd, 'users', uid, t.store, idDoc(t.id)), null]);
      }

      for (let i = 0; i < operations.length; i += 400) {
        const lot = F.writeBatch(bdd);
        for (const op of operations.slice(i, i + 400)) {
          const [ref, donnee] = op();
          if (donnee === null) lot.delete(ref); else lot.set(ref, donnee);
        }
        await lot.commit();
      }
    },

    /** Libère le créneau d'appareil pour permettre une bascule vers un autre poste. */
    async libererAppareil() {
      await F.setDoc(F.doc(bdd, 'users', uid), { device: null }, { merge: true });
    },

    uid, deviceId,
  };
}

/** Traduit les codes d'erreur Firebase en messages compréhensibles. */
export function messageErreur(e) {
  const code = e?.code || String(e?.message || e);
  if (code.includes('APPAREIL_DEJA_ENREGISTRE')) return 'APPAREIL_DEJA_ENREGISTRE';
  if (code.includes('CHARGEMENT_SDK')) return 'CHARGEMENT_SDK';
  const table = {
    'auth/invalid-email': 'EMAIL_INVALIDE',
    'auth/user-not-found': 'COMPTE_INTROUVABLE',
    'auth/wrong-password': 'MOT_DE_PASSE_INCORRECT',
    'auth/invalid-credential': 'MOT_DE_PASSE_INCORRECT',
    'auth/email-already-in-use': 'EMAIL_DEJA_UTILISE',
    'auth/weak-password': 'MOT_DE_PASSE_FAIBLE',
    'auth/network-request-failed': 'RESEAU',
    'permission-denied': 'PERMISSION_REFUSEE',
    'unavailable': 'RESEAU',
  };
  for (const [k, v] of Object.entries(table)) if (code.includes(k)) return v;
  return code;
}
