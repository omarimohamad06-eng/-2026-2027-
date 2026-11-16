# Chapitre 3 – Le génie génétique : rapport de production

**Livrables**
- `2BAC_SVT_Unite2_Chapitre3_Genie_genetique_ELEVE.pdf` : version élève, 8 pages, 3,8 Mo
- `2BAC_SVT_Unite2_Chapitre3_Genie_genetique_PROF.pdf` : version professeur avec réponses, 10 pages, 3,8 Mo

## Reconstruire après une modification
```bash
cd genie_genetique
python3 build/extract.py   # ré-extrait et recadre les images depuis source/*.pptx → images/
node build/render.js       # régénère les deux PDF depuis build/cours.html + build/style.css
```
- Les textes, questions et réponses se trouvent dans `build/cours.html`. Les réponses sont dans les blocs `<div class="ans">`, qui n’apparaissent que dans la version professeur.
- Les couleurs, polices et cadres se trouvent dans `build/style.css`.
- Les recadrages et les corrections d’étiquettes dans les images se trouvent dans `build/extract.py`.

## Documents extraits (25 images, `images/`)
| Fichier | Diapo | Emplacement dans le cours |
|---|---|---|
| doc01_insuline … doc03_tomates | 1 | Situation de départ, Doc 1–3 |
| doc04_graphe_ogm, doc05_mais_mon810 | 2 | Situation de départ, Doc 4–5 |
| doc06 … doc10 | 3–4 | Activité 1, Doc 1, Fig 1–5 |
| doc11, doc12 | 6–7 | Activité 1, Doc 2, Fig 1–2 |
| doc13 … doc15 | 10–11 | Activité 2, Doc 1, Fig 1–3 |
| doc16, doc17 | 14 | Activité 2, Doc 2, Fig 1–2 |
| doc18, doc19 | 16 | Activité 2, Doc 3, Fig 1–2 |
| doc20_insuline | 19 | Activité 3, Doc 1 |
| doc21 … doc25 | 21–22 | Activité 3, Doc 2, Fig 1–4 |

Les textes, légendes, tableaux, questions et réponses (diapos 2, 5, 8–9, 12–13, 15, 17, 20, 23–26) ainsi que le Schéma bilan et le tableau Avantages/Inconvénients (diapos 27–28) ont été ressaisis en HTML pour rester nets à l’impression. Le tableau des enzymes de restriction (diapo 11) a aussi été ressaisi.

## Corrections
**Scientifiques**
1. Insertion des gènes Bt : « transformation biologique à l’aide de *Bacillus thuringiensis* » → **à l’aide d’*Agrobacterium tumefaciens*** (diapo 21).
2. Opines : « phytohormone » → **composés azotés, source de nutriments pour la bactérie**, à distinguer de l’auxine et des cytokinines, qui sont les hormones (diapo 7).
3. Image de l’insuline : « Cellule B humaine » (lymphocyte B) → **Cellule β pancréatique humaine**, corrigé dans l’image.
4. Riz doré : « produit de la vitamine A » → **produit du bêta-carotène, précurseur de la vitamine A** (diapos 1 et 28).
5. ADN-T : « fusionne » → **s’intègre** à l’ADN de la cellule végétale.
6. Ligase : la définition précise maintenant qu’elle **rétablit les liaisons phosphodiester** entre des fragments à extrémités cohésives.
7. Réponse sur la transcriptase inverse : ajout de l’étape d’élimination de l’ARNm, avant la synthèse du 2ᵉ brin.
8. Électroporation : « pôle Positive / pôle Négative » → **pôle positif / pôle négatif**, corrigé dans l’image.

**Terminologie** : « transcriptase reverse/réverse » → **transcriptase inverse**, partout, y compris dans l’image Fig 3. « Transgénèse / transgène » (le procédé) → **transgenèse**. « T-DNA / DNA-T » → **ADN-T**. « *E. Coli* » → ***E. coli***. « *A. tuméfaciens* » → ***A. tumefaciens***. Tous les noms d’espèces sont en italique.

**Orthographe et style** : colonnie → colonie ; champions → champignons ; « du pyrale » → de la pyrale ; « stable au transitoire » → stable ou transitoire ; « En exploitation la fig1 » → En exploitant la figure 1 ; « couteux » → coûteux ; « elle même » → elle-même ; « génes » → gènes ; espaces avant « ; : ? » harmonisées.

**Supprimé** : la référence au manuel « fig2 p 158 » (diapo 21).

**Ajouts signalés** (sans nouvelle notion) : intro et problème de l’Activité 1, reformulés à partir des diapos 3 et 5 ; la Question de la Situation de départ, dont les réponses sont les problèmes de la diapo 2 ; « N : nucléotide quelconque » dans la légende du tableau des enzymes.

## Numérotation
Doc 1–5 pour la Situation de départ. Ensuite Document 1, 2, 3 dans chaque Activité, avec Fig 1, 2… dans chaque document, comme dans vos modèles. Chaque question renvoie au bon document ou à la bonne figure.

## Points à surveiller
- **Résolution** : toutes les images viennent de captures d’écran, de 1000 à 1200 px de large. Elles s’impriment entre 110 et 170 dpi : correct, mais pas aussi net qu’une photo d’origine. Les plus douces sont doc21_pyrale (114 dpi), doc22_mais (109 dpi), doc15_transcriptase (116 dpi) et doc13_sonde (petite image source).
- **Version professeur** : pour garder une mise en page compacte, l’Activité 2, Document 1 est réparti sur deux cadres (en-tête « Document 1 (suite) », entre les parties 2 et 3). Aucune figure ni aucun tableau n’est coupé. Les documents y sont réduits à 95 %, et l’Activité 3, Document 2 à 90 %.
- La page 9 de la version professeur se termine avec environ 70 mm vides, avant le Schéma bilan qui commence une nouvelle page.
- Polices : Carlito (équivalent métrique de Calibri), Jost (proche de Futura) et Liberation Serif (proche de Times). Toutes sont intégrées au PDF.
