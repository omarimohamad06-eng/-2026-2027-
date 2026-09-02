# سجل الحضور والغياب 2026/2027 — Structure & modèle de données

> Document de cadrage à valider **avant** l'implémentation complète.
> Auteur du registre : Pr. Omari Mohammed — Lycée Qualifiant Tilmi — Direction Provinciale de Tinghir — AREF Drâa-Tafilalet.

---

## 1. Choix techniques proposés

| Sujet | Proposition | Justification |
|---|---|---|
| Front | **HTML/CSS/JS vanilla, modules ES, sans build** | Ouverture par simple `index.html` ou GitHub Pages, aucun `npm install` chez l'utilisateur, mise à jour = remplacer des fichiers. |
| Stockage | **IndexedDB via Dexie.js** (vendorisé dans `/vendor`, pas de CDN) | Volume (6 classes × 10 mois × 40 élèves × 31 jours) + fonctionnement 100 % hors-ligne. |
| Hors-ligne | **Service Worker** (cache de l'app) + `manifest.webmanifest` (installable) | « Utilisable sans connexion une fois chargée ». |
| PDF | **Impression navigateur → Enregistrer en PDF**, avec CSS `@media print` A4 paysage dédié | jsPDF ne gère ni la liaison des lettres arabes ni le RTL sans shaping manuel : le rendu serait cassé. L'impression navigateur donne un arabe parfait et une pagination fidèle. |
| Graphiques | **SVG généré à la main** (pas de librairie) | Un seul graphe simple ; évite 300 Ko de dépendance. |
| Import Excel | **CSV (UTF-8, `,` ou `;`) + collage direct depuis Excel (TSV)** | Couvre Excel sans embarquer SheetJS (~800 Ko). |
| Polices | Amiri / Cairo embarquées dans `/assets/fonts` | Rendu arabe identique hors-ligne et à l'impression. |

---

## 2. Structure des dossiers

```
/
├── index.html                     # coquille unique (SPA, routage par hash)
├── manifest.webmanifest
├── sw.js                          # service worker (cache offline)
├── README.md                      # guide d'utilisation (FR)
├── assets/
│   ├── css/
│   │   ├── theme.css              # variables : vert #0d3b2e, doré #c9a227, ivoire #faf6ec
│   │   ├── app.css                # mise en page écran, RTL
│   │   └── print.css              # @page A4 paysage, cadre décoratif, en-tête ministériel
│   ├── fonts/                     # Amiri, Cairo (woff2)
│   └── img/                       # armoiries / logo MEN
├── src/
│   ├── main.js                    # bootstrap + routeur
│   ├── db/
│   │   ├── db.js                  # déclaration Dexie + versions/migrations
│   │   ├── repo.js                # CRUD (établissement, classes, élèves, registres)
│   │   └── backup.js              # export/import JSON complet
│   ├── data/
│   │   ├── calendar-2026-2027.js  # calendrier scolaire marocain préchargé (modifiable)
│   │   ├── levels.js              # TCS, TCL, 1BAC SE, 1BAC LSH, 2BAC PC, 2BAC SVT
│   │   └── defaults.js            # infos établissement préremplies
│   ├── core/
│   │   ├── schoolCalendar.js      # jours ouvrés, week-ends, fériés, anssaf ayam
│   │   ├── attendance.js          # règles des états de cellule + comptages
│   │   └── stats.js               # taux mensuels/annuels, alertes absentéisme
│   ├── ui/
│   │   ├── views/
│   │   │   ├── setup.js           # configuration établissement
│   │   │   ├── classes.js         # gestion des classes
│   │   │   ├── students.js        # liste élèves + import CSV/collage
│   │   │   ├── register.js        # ⭐ grille mensuelle (cœur)
│   │   │   ├── dashboard.js       # statistiques annuelles + graphe
│   │   │   ├── calendar.js        # édition des vacances/fériés
│   │   │   └── backup.js          # sauvegarde / restauration
│   │   └── components/            # topbar, modal, toast, table virtuelle
│   └── utils/                     # arabic.js (chiffres/abréviations jours), csv.js, dom.js
├── vendor/
│   └── dexie.min.js
└── docs/
    └── MODELE-DONNEES.md          # ce document
```

---

## 3. Modèle de données (schéma JSON)

### 3.1 `settings` — établissement (enregistrement unique, `id = 1`)

```json
{
  "id": 1,
  "academie": "الأكاديمية الجهوية للتربية والتكوين لجهة درعة تافيلالت",
  "direction": "المديرية الإقليمية تنغير",
  "etablissement": "الثانوية التأهيلية تيلمي",
  "enseignant": "الأستاذ عمري محمد",
  "anneeScolaire": "2026/2027",
  "langue": "ar",
  "seuilAlerteAbsence": 8,
  "updatedAt": "2026-09-02T10:00:00.000Z"
}
```

### 3.2 `classes`

```json
{
  "id": "cls_1bacse_a",
  "niveau": "1BAC SE",
  "nom": "الأولى باكالوريا علوم تجريبية",
  "fawj": "فوج 1",
  "matiere": "علوم الحياة والأرض",
  "ordre": 3,
  "joursSeance": [1, 2, 3, 4, 5, 6],
  "createdAt": "2026-09-02T10:00:00.000Z"
}
```
`joursSeance` : 0 = dimanche … 6 = samedi. Permet plus tard de n'ouvrir que les jours où la classe a cours (par défaut : tous les jours ouvrés).

### 3.3 `students`

```json
{
  "id": "std_0a1b2c",
  "classId": "cls_1bacse_a",
  "rt": 1,
  "nom": "أمزيل فاطمة الزهراء",
  "codeMassar": "R130012345",
  "sexe": "F",
  "actif": true,
  "dateInscription": null,
  "dateRadiation": null
}
```
`rt` = رقم الترتيب, renuméroté automatiquement sur tri alphabétique arabe ou ordre manuel.
`dateInscription` / `dateRadiation` : un élève inscrit en cours d'année n'est pas pénalisé (ses anssaf ayam d'étude démarrent à sa date d'inscription).

### 3.4 `registers` — **une ligne par (classe, mois)** ⭐

C'est la clé de la performance : 6 classes × 10 mois = 60 enregistrements, pas 24 000.

```json
{
  "id": "cls_1bacse_a__2026-10",
  "classId": "cls_1bacse_a",
  "mois": "2026-10",
  "cells": {
    "std_0a1b2c": { "3": "a", "4": "am", "12": "aj", "20": "pm" },
    "std_9f8e7d": { "7": "a" }
  },
  "notes": {
    "std_0a1b2c": "غياب مبرر بشهادة طبية (12 أكتوبر)"
  },
  "updatedAt": "2026-10-31T18:22:00.000Z"
}
```

**États d'une cellule** (clic = cycle, ou saisie clavier) :

| Code | Libellé | Anssaf ayam d'absence | Rendu |
|---|---|---|---|
| *(absent de l'objet)* | حاضر (présent par défaut) | 0 | cellule vide |
| `a` | غائب (journée entière) | 2 | ❌ rouge |
| `am` | غائب صباحا | 1 | ◤ rouge demi |
| `pm` | غائب مساء | 1 | ◢ rouge demi |
| `aj` | غياب مبرر (journée) | 2 (comptés à part) | ❌ ambre |
| `r` | تأخر | 0 (signalé seulement) | • doré |
| `p` | حاضر (marqué explicitement) | 0 | ✅ vert |
| — | عطلة / نهاية الأسبوع | hors calcul | grisé, non cliquable |

> Seuls les événements sont stockés → un mois « sans absence » pèse quelques octets.

### 3.5 `calendar` — calendrier scolaire (modifiable dans l'app)

```json
{
  "id": "cal_2026_2027",
  "anneeScolaire": "2026/2027",
  "debutAnnee": "2026-09-07",
  "finAnnee":   "2027-06-30",
  "joursWeekend": [0, 6],
  "periodes": [
    { "id": "h01", "type": "vacances", "libelle": "عطلة الفترة البينية الأولى",
      "du": "2026-10-18", "au": "2026-10-25", "source": "estimation", "confirme": false },
    { "id": "h02", "type": "ferie", "libelle": "ذكرى المسيرة الخضراء",
      "du": "2026-11-06", "au": "2026-11-06", "source": "officiel", "confirme": true },
    { "id": "h03", "type": "ferie", "libelle": "عيد الاستقلال",
      "du": "2026-11-18", "au": "2026-11-18", "source": "officiel", "confirme": true },
    { "id": "h09", "type": "examen", "libelle": "الامتحان الموحد الإقليمي",
      "du": "2027-06-07", "au": "2027-06-09", "source": "estimation", "confirme": false }
  ]
}
```

`type` ∈ `vacances` | `ferie` | `examen` | `autre` → détermine la couleur de la colonne grisée.
Le `libelle` s'affiche **verticalement** dans la colonne, comme sur le registre papier.
`confirme: false` = date estimée (fêtes religieuses mobiles, notes ministérielles non encore publiées) : l'app affiche un bandeau « à vérifier » et un bouton de correction en un clic.

### 3.6 Champs calculés (jamais stockés, recalculés à la volée)

Pour chaque élève et chaque mois :

```
anssafEtude   = 2 × (jours ouvrés du mois, hors week-ends/vacances/fériés,
                     bornés par dateInscription / dateRadiation)
anssafAbsence = Σ (poids des cellules a/am/pm/aj)
anssafPresence= anssafEtude − anssafAbsence
tauxMensuel   = anssafPresence / anssafEtude × 100      (arrondi 2 décimales)
```
Ligne de bas de page **نسبة المواظبة الشهرية %** = moyenne pondérée de la classe.
Annuel : mêmes formules cumulées de septembre à juin.

---

## 4. Calendrier 2026-2027 préchargé (à confirmer)

| Période | Dates proposées | Statut |
|---|---|---|
| Début des cours | lun. 7 septembre 2026 | estimation |
| عطلة الفترة البينية الأولى | 18 → 25 octobre 2026 | estimation |
| ذكرى المسيرة الخضراء | ven. 6 novembre 2026 | officiel |
| عيد الاستقلال | mer. 18 novembre 2026 | officiel |
| عطلة الفترة البينية الثانية (نهاية السنة الميلادية) | 20 décembre 2026 → 3 janvier 2027 | estimation |
| فاتح السنة الميلادية | ven. 1er janvier 2027 | officiel |
| ذكرى تقديم وثيقة الاستقلال | lun. 11 janvier 2027 | officiel |
| رأس السنة الأمازيغية | jeu. 14 janvier 2027 | officiel |
| عطلة منتصف السنة الدراسية | 31 janvier → 7 février 2027 | estimation |
| عيد الفطر | ~ 9 → 11 mars 2027 | **mobile, à confirmer** |
| عطلة الفترة البينية الثالثة | 21 → 28 mars 2027 | estimation |
| عيد الشغل | sam. 1er mai 2027 | officiel |
| عيد الأضحى | ~ 17 → 19 mai 2027 | **mobile, à confirmer** |
| عطلة الفترة البينية الرابعة | mi-mai 2027 | estimation |
| فاتح محرم 1449 | ~ 6 juin 2027 | **mobile, à confirmer** |
| Examen régional unifié | juin 2027 | estimation |

> Les dates marquées « estimation » suivent la structure habituelle du calendrier scolaire marocain ; elles seront toutes **modifiables en 3 clics** dès la publication de la note ministérielle officielle 2026-2027. Les fêtes religieuses dépendent de l'observation lunaire.

---

## 5. Écrans prévus

1. **الإعداد** — établissement + enseignant (prérempli).
2. **الأقسام** — création/édition des classes (6 niveaux préchargés).
3. **التلاميذ** — saisie manuelle, import CSV, collage Excel, tri/renumérotation.
4. **⭐ سجل الشهر** — grille : colonne élève figée à droite (RTL), jours défilants, récapitulatif figé à gauche, ligne de taux en bas.
5. **الإحصائيات** — synthèse annuelle par classe, graphe SVG mensuel, alertes absentéisme.
6. **الرزنامة** — édition des vacances/fériés.
7. **النسخ الاحتياطي** — export/import JSON, export CSV/Excel.
8. **الطباعة** — aperçu A4 paysage fidèle au registre officiel + pied de page « Pr. Omari Mohammed — 2026/2027 ».
