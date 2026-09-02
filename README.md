# سجل الحضور والغياب — 2026/2027

Application web de gestion du **registre de présence et d'absence** (سجل الحضور والغياب)
pour les établissements scolaires marocains, année scolaire **2026/2027**.

> Lycée Qualifiant Tilmi — Direction Provinciale de Tinghir — AREF Drâa-Tafilalet
> Pr. Omari Mohammed

---

## 1. Démarrer

L'application est en **HTML/CSS/JavaScript pur** : ni `npm install`, ni compilation, ni dépendance externe.

### Option A — usage local immédiat
Servez le dossier avec n'importe quel petit serveur (les modules ES et le mode hors-ligne
exigent `http://`, pas `file://`) :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

### Option B — publication sur GitHub Pages
Poussez le dépôt, activez **Settings → Pages → Deploy from a branch**, puis ouvrez l'URL fournie.
Au premier chargement, l'application se met en cache : elle fonctionne ensuite **sans connexion**,
et peut être installée comme application (bouton « Installer » du navigateur, ou
*Partager → Sur l'écran d'accueil* sur tablette).

---

## 2. Prise en main en 4 étapes

| Étape | Écran | À faire |
|---|---|---|
| 1 | **الإعداد** | Vérifier l'établissement, l'académie, la direction et votre nom (déjà préremplis). |
| 2 | **الأقسام** | Créer vos classes (TCS, TCL, 1BAC SE, 1BAC LSH, 2BAC PC, 2BAC SVT…), avec فوج et matière. |
| 3 | **التلاميذ** | Ajouter les élèves : saisie ligne à ligne, import d'un fichier CSV, ou **collage direct depuis Excel**. |
| 4 | **سجل الشهر** | Pointer les absences. Tout est enregistré automatiquement. |

---

## 3. La grille mensuelle

- Colonnes **ر.ت** et **الاسم والنسب** figées à droite ; les jours défilent horizontalement.
- Les colonnes **grisées** (week-ends, vacances, fêtes, examens) ne sont pas cliquables ;
  le nom de la période s'affiche verticalement, comme sur le registre papier.
- Les colonnes **hachurées** correspondent aux jours hors période d'inscription d'un élève.
- Une **cellule vide = élève présent**. On ne saisit donc que les absences.

### Les états d'une cellule

| Saisie | État | Décompte |
|---|---|---|
| touche `1` | **غائب** (journée) | 2 anssaf (1 le samedi) |
| touche `2` | **غائب صباحا** | 1 نصف |
| touche `3` | **غائب مساء** | 1 نصف |
| touche `4` | **غياب مبرر** | 2 anssaf, comptés à part |
| touche `5` | **تأخر** | signalé, non décompté |
| touche `0` / `Suppr` | effacer | — |

Au clic, la cellule prend l'état sélectionné dans la palette **أداة التعليم** ;
un second clic l'efface. `Espace` fait défiler les états, les **flèches** déplacent le curseur.

### Les calculs (jamais stockés, toujours recalculés)

```
أنصاف أيام الدراسة = 2 × (jours ouvrés du mois)      (1 pour les jours à demi-journée)
                      bornés par les dates d'inscription / de radiation de l'élève
أنصاف أيام الغياب   = somme des poids des cellules
أنصاف أيام الحضور   = الدراسة − الغياب
نسبة المواظبة       = الحضور ÷ الدراسة × 100
```

Corriger une date de vacances met donc automatiquement à jour **tous** les taux, y compris rétroactivement.

---

## 4. Le calendrier scolaire (الرزنامة)

Le calendrier 2026-2027 est **préchargé et entièrement modifiable** :

- Dates **officielles fixes** (cochées « مؤكدة ») : ذكرى المسيرة الخضراء (6 nov.),
  عيد الاستقلال (18 nov.), فاتح السنة الميلادية (1er janv.),
  ذكرى تقديم وثيقة الاستقلال (11 janv.), رأس السنة الأمازيغية (14 janv.), عيد الشغل (1er mai).
- Dates **estimées** (non cochées) : vacances des فترات بينية, عطلة منتصف السنة, examens,
  et les fêtes religieuses (عيد الفطر, عيد الأضحى, فاتح محرم) qui dépendent de l'observation lunaire.

Un bandeau d'avertissement rappelle combien de périodes restent à confirmer.
Dès la publication de la note ministérielle officielle, corrigez les dates dans cet écran
et cochez « مؤكدة » : tous les registres se recalculent.

Vous y réglez aussi les **jours de week-end** (dimanche par défaut) et les
**jours à demi-journée** (samedi par défaut, compté 1 نصف au lieu de 2).

---

## 5. Impression et export

| Bouton | Résultat |
|---|---|
| **🖨 طباعة** | Aperçu A4 **paysage** à l'en-tête ministériel, cadre vert/doré, 40 lignes, نسبة المواظبة en pied de page. Choisir « Enregistrer au format PDF » dans la boîte d'impression donne le **meilleur rendu** (vectoriel, texte sélectionnable). |
| **⬇ PDF** | Télécharge directement un PDF (une page A4 paysage par mois), sans passer par la boîte d'impression. Rendu image, donc fichier plus lourd et texte non sélectionnable. |
| **⬇ CSV** | Données brutes du mois, lisibles par Excel (UTF-8 + séparateur `;`). |
| **⬇ CSV سنوي** | Récapitulatif annuel : absences par mois, totaux et taux, par élève. |
| **🖨 طباعة كل الأشهر / ⬇ PDF السنة** | Les dix mois (septembre → juin) en une seule opération. |

---

## 6. Statistiques (الإحصائيات)

- Taux de fréquentation annuel de la classe, totaux d'anssaf ayam, nombre d'élèves sous le seuil.
- Courbe d'évolution du taux mois par mois.
- Liste des élèves **triée du plus absent au moins absent**, avec pastille de couleur
  (vert ≥ 95 %, ambre ≥ 90 %, rouge < 90 %). Les seuils se règlent dans **الإعداد**.

---

## 7. Données et sauvegarde

Toutes les données sont stockées **localement dans le navigateur** (IndexedDB) :
rien n'est envoyé sur Internet, l'application fonctionne hors connexion.

> ⚠️ Les données appartiennent au navigateur et au profil utilisé.
> Vider les données du site, changer de navigateur ou d'ordinateur les rend inaccessibles.

L'écran **النسخ الاحتياطي** permet de :
- exporter une **sauvegarde JSON** complète (à conserver sur clé USB, e-mail ou cloud) ;
- la restaurer, en remplacement ou en fusion ;
- effacer toutes les données du navigateur.

**Faites une sauvegarde à la fin de chaque mois.**

---

## 8. Structure du projet

```
index.html                 coquille de l'application (SPA, routage par hash)
sw.js                      service worker (fonctionnement hors-ligne)
manifest.webmanifest       installation en application
assets/css/theme.css       couleurs : vert #0d3b2e, doré #c9a227, ivoire #faf6ec
assets/css/app.css         interface écran (RTL)
assets/css/print.css       maquette d'impression A4 paysage
src/db/idb.js              couche IndexedDB (sans dépendance)
src/db/repo.js             accès aux données métier
src/db/backup.js           export / import JSON
src/data/calendar-2026-2027.js   calendrier scolaire préchargé
src/data/levels.js         niveaux du lycée qualifiant
src/data/defaults.js       informations de l'établissement
src/core/schoolCalendar.js jours ouvrés, congés, anssaf ayam
src/core/attendance.js     états des cellules et poids des absences
src/core/stats.js          taux mensuels et annuels, alertes
src/ui/…                   routeur et écrans
src/export/print.js        page imprimable fidèle au registre officiel
src/export/pdf.js          générateur PDF autonome (canvas → PDF)
src/i18n/index.js          dictionnaire arabe / français de l'interface
docs/MODELE-DONNEES.md     modèle de données détaillé
```

Le modèle de données (settings / classes / students / registers / calendar) est décrit dans
[`docs/MODELE-DONNEES.md`](docs/MODELE-DONNEES.md).

---

## 9. Arabe ou français

Le bouton **FR / ع** en haut de l'écran bascule toute l'interface entre l'arabe et le français
(le même réglage existe dans **Paramètres → Langue de l'interface**). Le choix est enregistré :
l'application se rouvre dans la dernière langue utilisée.

En français, la page passe de droite-à-gauche à gauche-à-droite, **sauf la grille du registre**,
qui garde l'ordre officiel : le jour 1 à droite, les colonnes ر.ت et le nom figées à droite, et
les abréviations arabes des jours (أ ث ث ر خ ج س) — exactement comme sur le registre papier.
Survoler l'en-tête d'un jour affiche le jour de la semaine dans la langue choisie.

**Ce qui reste toujours en arabe**, quelle que soit la langue de l'interface :
la feuille imprimée, l'export PDF, ainsi que les données que vous saisissez
(noms des élèves et des classes, intitulés des vacances, informations de l'établissement).
Le registre est un document officiel : sa mise en forme ne dépend pas de la langue de travail.

---

## 10. Sur tablette et téléphone

L'interface s'adapte : la barre de navigation passe sur deux lignes, les sélecteurs et
les boutons s'empilent, et les tableaux larges (élèves, statistiques, rzenama) défilent
**horizontalement dans leur propre cadre** — la page, elle, ne se décale jamais.

Dans la grille mensuelle, les colonnes **ر.ت** et **الاسم والنسب** restent figées à droite
pendant que les jours défilent : le pointage reste possible d'une main sur tablette.
La saisie confortable d'une classe entière reste néanmoins plus rapide sur ordinateur.

---

## 11. Compatibilité

Navigateurs récents pour ordinateur et tablette : Chrome/Edge 100+, Firefox 100+, Safari 16+.
La navigation privée empêche le stockage local : utilisez une fenêtre normale.
