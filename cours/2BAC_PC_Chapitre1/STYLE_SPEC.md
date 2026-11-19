# STYLE_SPEC — Cours SVT, Pr. Omari Mohammed

Derived from the reference lesson `Unit_1_2BAC_26.pdf` (32 pages, Word 2013, Calibri).
Every page was rendered to PNG and measured; fonts, sizes and colours below come from the PDF itself (`pdffonts` + span analysis).

## 1. Page
| Item | Reference value | Used in this build |
|---|---|---|
| Format | A4 portrait (595 × 842 pt) | A4 portrait |
| Text margins | left/right ≈ 25 mm (text starts x = 71 pt), top ≈ 25 mm | 22 mm left/right, 20 mm top, 22 mm bottom |
| Document images | wider than the text column (frames reach ≈ 12 mm from the page edge) | full text width (166 mm) |
| Body font | Calibri 14 pt, black, line height ≈ 1.3 | Carlito (metric clone of Calibri), 13.5 pt, line height 1.35 |
| Page number | centred, Calibri 11 pt, at 28 mm from the bottom; no number on the cover | centred, kept |
| Footer | none in the reference (only the page number) | the teacher's 3-column footer from the cahier: `Niveau | Année scolaire | Pr : Omari Mohammed`, thin grey rule above, Carlito 9 pt grey; not on the cover |

## 2. Cover (page 1)
- A single title, vertically centred: **Unité 1 : Consommation de la matière organique et flux de l’énergie**.
- Calibri **Bold 36 pt, pure red #FF0000**, centred, 3 lines. Nothing else on the page.

## 3. Heading hierarchy
| Level | Look (reference) | Example |
|---|---|---|
| Unité | Bold 36 pt red, centred (cover) | Unité 1 : … |
| Section label (unité) | Bold 14 pt black | Mise en situation |
| Chapitre | **Bold 16 pt red #FF0000**, left-aligned | Chapitre 1 : Libération de … |
| Sub-heading of the chapter | *Italic 16 pt black, underlined* | *Situation du départ* |
| “Problèmes du chapitre” | full-width brown/orange bar (#BF7A2E), white bold centred text | |
| Problems | bullets •, **bold 16 pt red** | Comment les cellules … ? |
| Activité | “**Activité N :**” bold 18 pt black, underlined + title **bold 18 pt red** | Activité 1 : Mise en évidence … |
| Partie | “1) …” regular 14 pt **light green #92D050** (no bold) | 1) Mise en évidence des réactions … |
| Sous-partie | “a) …” **bold 14 pt black** | a) Matériel des expériences |
| Answer numbering | “1- / 2- / 3-” bold, hanging indent, sub-points with “-” | |

## 4. Recurrent blocks
- **Document** (from the cahier d’activités): pasted as one image with its dashed grey frame, peach “Document N” tab + pale-yellow title bar, and its own “Guide d’exploitation” box. Placed right after the partie/sous-partie heading, before the answers. Never split across pages.
- **Answers / analysis**: running text in 14 pt; key words in **bold**, conclusions in red (#FF0000) or green (#00B050); key terms in blue (#0070C0).
- **Conclusion:** label = small cyan rectangle (#7FE6FA) with red bold Arial-like text; the conclusion text below in dark blue (#1F3864) and the key phrase in green.
- **Explication** label = blue rectangle (#0070C0) with white bold text.
- **Remarque :** green bold italic text (#00B050) in a thin salmon frame (#F4B183).
- **❖ Bilan : / ❖ Déduction :** Wingdings ❖ bullet + bold label.
- **Equations**: centred, bold, in a pale-yellow strip (#FFF2CC, border #FFE699); subscripts true; “→” arrow; name of reactants in small italic under the formula (Glucose, éthanol…). The arrow “→ Réaction globale de …” lead-in is green bold italic.
- **Red-bordered reaction boxes** (Activité 2 and 4): white background, 1 pt red frame, bold formula.
- **Bilan of a partie** (end of Activité 1): pale-yellow box (#FFF2CC) with a red-orange frame, Times-like serif text, bullets with green key terms.
- **Transition question** (end of an activité): centred, bold red, e.g. *Quel est le devenir du pyruvate ?*
- **Encadré cyan** (#DAF5FA): definitions / important statements (NADH,H⁺, phosphorylation oxydative).
- **Équation bilan** of respiration: cyan strip (#CCFFFF), large bold, O₂ red, H₂O blue, 38 ATP red.
- **Checklists**: ✓ bullets for the conditions of ATP synthesis and the rendement remarks.

## 5. Tables
- Bilan / comparison tables: thin black grid, header row bold (blue #0070C0 text or orange #FFC000 fill with white text for the rendement table), body 12–13 pt.

## 6. Figures from the presentation
- Slide figures (schemas, photos) are inserted as images, centred, at 60–100 % of the text width, without extra caption unless the slide had one (e.g. “Titre : Schéma d’une mitochondrie”).

## 7. End of chapter
- Last page of the reference: **Schéma bilan du chapitre** (the cahier p. 13 frame, title in orange #C55A11) on its own page.
- The PC presentation adds an **Évaluation** (3 exercices) and **Éléments de correction**; they are placed after the schéma bilan, using the activité heading style (“Exercice N :” black underlined + red title) under a brown bar like “Problèmes du chapitre”.

## 8. Pagination rules (applied in CSS)
- Headings never left alone at the bottom of a page (`break-after: avoid`, heading kept with the next block).
- Documents, figures, tables, equation strips and boxes never split (`break-inside: avoid`).
- Each activité starts on the current page if at least its heading + first block fit, otherwise on a new page.
