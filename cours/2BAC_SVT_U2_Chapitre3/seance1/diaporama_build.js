const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/31c21a8c-c8a3-43e3-9f18-0c15311854ce_3cdf9946-6ae4-4c0f-ab0e-9b6266adfba7/pptx/scripts/apply_theme.js");
const OUT = process.argv[2], IMG = process.argv[3];

const THEME = {
  name: "SVT Omari",
  headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: {
    dk1: "1A1A1A", lt1: "FFFFFF", dk2: "1F4F78", lt2: "F2F6FA",
    accent1: "C00000", accent2: "1E7B3C", accent3: "1F4F78", accent4: "E97A1F",
    accent5: "FFF2E0", accent6: "EAF5EC", hlink: "1F4F78", folHlink: "6B4A8A",
  },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "Pr. Omari Mohammed";
pres.title = "Évaluation formative – Activité 1 – Chapitre 3";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const FOOT = [
  { text: { text: "2BAC SVT – Unité 2 – Chapitre 3 : Le génie génétique", options: { x: 0.5, y: 7.05, w: 6, h: 0.3, fontSize: 11, color: C.text2 } } },
  { text: { text: "Pr : Omari Mohammed", options: { x: 8.3, y: 7.05, w: 4.5, h: 0.3, fontSize: 11, color: C.text2, align: "right" } } },
];
pres.defineSlideMaster({
  title: "TITLE", background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 11.7, h: 1.6, fontSize: 44, bold: true, color: C.background1, align: "center", valign: "middle" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.8, w: 11.7, h: 1.4, fontSize: 24, color: "FFE7C2", align: "center", valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 12.3, h: 0.9, fontSize: 34, bold: true, color: C.accent1, valign: "middle", margin: 0 }, text: "" } },
    ...FOOT,
  ],
  slideNumber: { x: 12.4, y: 6.6, w: 0.5, h: 0.3, fontSize: 11, color: C.text2 },
});
pres.defineSlideMaster({
  title: "SECTION", background: { color: C.accent2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.6, w: 11.7, h: 1.4, fontSize: 48, bold: true, color: C.background1, align: "center", valign: "middle" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.0, w: 11.7, h: 1.0, fontSize: 24, color: C.accent6, align: "center", valign: "top" }, text: "" } },
  ],
});

const S = (m, sec) => pres.addSlide({ masterName: m, sectionTitle: sec });
const pts = (s, txt) => s.addText(txt, { x: 10.6, y: 0.4, w: 2.2, h: 0.7, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.15, fill: { color: C.accent5 }, color: C.accent4, bold: true, fontSize: 22, align: "center", valign: "middle", isTextBox: true, objectName: "Barème" });
const card = (s, x, y, w, h, fill, name) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { type: "none" }, objectName: name });

// ---------- 1. Titre
pres.addSection({ title: "Évaluation" });
let s = S("TITLE", "Évaluation");
s.addText("Évaluation formative", { placeholder: "title" });
s.addText("Activité 1 : Transfert naturel de gènes d’une bactérie à des cellules végétales\n10 minutes  •  Barème : / 5", { placeholder: "body" });
s.addNotes("Distribuer les demi-feuilles d’évaluation avant d’afficher la diapo suivante.");

// ---------- 2. Consignes
s = S("CONTENT", "Évaluation");
s.addText("Consignes", { placeholder: "title" });
const cons = [
  ["1", "Travail individuel", "Chacun répond seul, sans le cahier."],
  ["2", "Sur la demi-feuille", "Écrire nom, prénom et classe en haut."],
  ["3", "Justifier les réponses", "Une réponse sans justification ne rapporte pas tous les points."],
  ["4", "Durée : 10 minutes", "La correction se fait ensemble à la fin."],
];
cons.forEach((c, i) => {
  const y = 1.55 + i * 1.3;
  s.addShape(pres.shapes.OVAL, { x: 0.9, y, w: 0.9, h: 0.9, fill: { color: C.text2 }, line: { type: "none" }, objectName: `Pastille ${c[0]}` });
  s.addText(c[0], { x: 0.9, y, w: 0.9, h: 0.9, fontSize: 28, bold: true, color: C.background1, align: "center", valign: "middle", isTextBox: true });
  s.addText([{ text: c[1], options: { bold: true, fontSize: 24, color: C.text1, breakLine: true } }, { text: c[2], options: { fontSize: 18, color: "555555" } }],
    { x: 2.1, y: y - 0.05, w: 10, h: 1.0, valign: "middle", margin: 0, isTextBox: true });
});

// ---------- 3. Question 1
s = S("CONTENT", "Évaluation");
s.addText("Question 1 : Vrai ou faux ? Justifier.", { placeholder: "title" });
pts(s, "2 points");
[["a)", "Le plasmide Ti se trouve dans le noyau de la bactérie."], ["b)", "Tout le plasmide Ti est transféré dans la cellule végétale."]].forEach((q, i) => {
  const y = 1.9 + i * 2.2;
  card(s, 0.7, y, 11.9, 1.7, C.background2, `Affirmation ${q[0]}`);
  s.addText([{ text: q[0] + "  ", options: { bold: true, color: C.accent1 } }, { text: q[1], options: { color: C.text1 } }],
    { x: 1.0, y, w: 8.4, h: 1.7, fontSize: 26, valign: "middle", isTextBox: true });
  s.addText("Vrai  /  Faux ?", { x: 9.6, y: y + 0.45, w: 2.7, h: 0.8, fontSize: 22, bold: true, color: C.text2, align: "center", valign: "middle", shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.text2, width: 1.5 }, isTextBox: true });
});

// ---------- 4. Question 2
s = S("CONTENT", "Évaluation");
s.addText("Question 2", { placeholder: "title" });
pts(s, "1 point");
s.addImage({ path: IMG, x: 0.7, y: 1.5, w: 5.4, h: 5.4 * 1066 / 1250, altText: "Carte génétique du plasmide Ti" });
card(s, 6.6, 2.2, 6.1, 3.2, C.background2, "Question");
s.addText([{ text: "Expliquer l’intérêt, pour la bactérie, du transfert des gènes ", options: { color: C.text1 } }, { text: "OPS", options: { bold: true, color: C.accent1 } }, { text: ".", options: { color: C.text1 } }],
  { x: 6.9, y: 2.2, w: 5.5, h: 3.2, fontSize: 28, valign: "middle", isTextBox: true });

// ---------- 5. Question 3
s = S("CONTENT", "Évaluation");
s.addText("Question 3", { placeholder: "title" });
pts(s, "2 points");
card(s, 0.7, 1.7, 11.9, 2.3, C.background2, "Situation");
s.addText([{ text: "Des ", options: {} }, { text: "Agrobacterium tumefaciens", options: { italic: true } }, { text: " cultivées à ", options: {} }, { text: "37 °C", options: { bold: true, color: C.accent1 } }, { text: " sont inoculées à une plante blessée.", options: {} }],
  { x: 1.0, y: 1.7, w: 11.3, h: 2.3, fontSize: 30, color: C.text1, valign: "middle", isTextBox: true });
s.addText("Que se passe-t-il ?  Justifier votre réponse.", { x: 0.7, y: 4.5, w: 11.9, h: 1.2, fontSize: 30, bold: true, color: C.text2, align: "center", valign: "middle", isTextBox: true });
s.addText("Indice : relisez la légende de la figure 5 (Doc 1 p 2).", { x: 0.7, y: 5.7, w: 11.9, h: 0.6, fontSize: 18, italic: true, color: "666666", align: "center", isTextBox: true });

// ---------- 6. Section correction
pres.addSection({ title: "Correction" });
s = S("SECTION", "Correction");
s.addText("Correction", { placeholder: "title" });
s.addText("Échangez vos feuilles avec votre voisin et corrigez au stylo vert", { placeholder: "body" });

// ---------- 7. Correction Q1
s = S("CONTENT", "Correction");
s.addText("Correction – Question 1", { placeholder: "title" });
pts(s, "2 points");
[["a)", "Le plasmide Ti se trouve dans le noyau de la bactérie.", "La bactérie est un procaryote : elle n’a pas de noyau. Le plasmide est dans le cytoplasme."],
 ["b)", "Tout le plasmide Ti est transféré dans la cellule végétale.", "Seul un fragment du plasmide, l’ADN-T, est transféré et s’intègre au génome végétal."]].forEach((q, i) => {
  const y = 1.6 + i * 2.6;
  card(s, 0.7, y, 11.9, 2.2, C.background2, `Correction ${q[0]}`);
  s.addText("FAUX", { x: 0.95, y: y + 0.6, w: 1.6, h: 1.0, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.1, fill: { color: C.accent1 }, color: C.background1, bold: true, fontSize: 26, align: "center", valign: "middle", isTextBox: true });
  s.addText([{ text: `${q[0]} ${q[1]}`, options: { bold: true, fontSize: 20, color: C.text2, breakLine: true } }, { text: q[2], options: { fontSize: 22, color: C.text1 } }, { text: "   (1 pt)", options: { fontSize: 16, italic: true, color: C.accent4 } }],
    { x: 2.8, y, w: 9.6, h: 2.2, valign: "middle", margin: 0, isTextBox: true });
});

// ---------- 8. Correction Q2
s = S("CONTENT", "Correction");
s.addText("Correction – Question 2", { placeholder: "title" });
pts(s, "1 point");
const chain = [["Gènes OPS", "transférés dans la cellule végétale"], ["Opines", "produites par la cellule végétale"], ["Nutrition", "de la bactérie (C, N, énergie) grâce aux gènes OCC"]];
chain.forEach((c, i) => {
  const x = 0.7 + i * 4.2;
  card(s, x, 2.0, 3.5, 2.6, i === 1 ? C.accent5 : C.background2, `Étape ${i + 1}`);
  s.addText([{ text: c[0], options: { bold: true, fontSize: 28, color: C.accent2, breakLine: true } }, { text: c[1], options: { fontSize: 19, color: C.text1 } }],
    { x: x + 0.15, y: 2.0, w: 3.2, h: 2.6, align: "center", valign: "middle", isTextBox: true });
  if (i < 2) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 3.55, y: 3.05, w: 0.6, h: 0.5, fill: { color: C.text2 }, line: { type: "none" }, objectName: `Flèche ${i + 1}` });
});
s.addText("La bactérie oblige la plante à fabriquer sa propre nourriture : les opines.", { x: 0.7, y: 5.2, w: 11.9, h: 0.9, fontSize: 24, bold: true, color: C.text2, align: "center", valign: "middle", isTextBox: true });

// ---------- 9. Correction Q3
s = S("CONTENT", "Correction");
s.addText("Correction – Question 3", { placeholder: "title" });
pts(s, "2 points");
s.addText("Pas de tumeur (pas de galle du collet)", { x: 0.7, y: 1.55, w: 11.9, h: 1.0, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, fill: { color: C.accent2 }, color: C.background1, bold: true, fontSize: 30, align: "center", valign: "middle", isTextBox: true });
s.addText("0,5 pt", { x: 10.9, y: 1.55, w: 1.6, h: 1.0, fontSize: 16, italic: true, color: "FFE7C2", align: "center", valign: "middle", isTextBox: true });
const just = [["À 37 °C, les bactéries perdent leur plasmide Ti.", "0,75 pt"], ["Sans plasmide Ti → pas de transfert d’ADN-T → les gènes ONC ne s’expriment pas dans la plante → pas d’auxines ni de cytokinines en excès.", "0,75 pt"]];
just.forEach((j, i) => {
  const y = 3.0 + i * 1.75;
  card(s, 0.7, y, 11.9, 1.5, C.background2, `Justification ${i + 1}`);
  s.addText(j[0], { x: 1.0, y, w: 9.8, h: 1.5, fontSize: 22, color: C.text1, valign: "middle", isTextBox: true });
  s.addText(j[1], { x: 10.9, y, w: 1.6, h: 1.5, fontSize: 16, italic: true, bold: true, color: C.accent4, align: "center", valign: "middle", isTextBox: true });
});

// ---------- 10. Erreurs fréquentes
s = S("CONTENT", "Correction");
s.addText("Attention aux erreurs fréquentes", { placeholder: "title" });
const err = [
  ["Plasmide Ti  ≠  ADN-T", "Le plasmide Ti reste dans la bactérie ; seul l’ADN-T est transféré."],
  ["La bactérie n’entre pas dans la cellule", "Elle se fixe sur la cellule végétale ; seul l’ADN-T y pénètre."],
  ["La tumeur vient de la plante elle-même", "Ce sont les hormones (auxines, cytokinines) produites par la cellule végétale."],
];
err.forEach((e, i) => {
  const y = 1.6 + i * 1.7;
  card(s, 0.7, y, 11.9, 1.45, i % 2 ? C.background2 : C.accent5, `Erreur ${i + 1}`);
  s.addText("✗", { x: 0.9, y, w: 0.9, h: 1.45, fontSize: 36, bold: true, color: C.accent1, align: "center", valign: "middle", isTextBox: true });
  s.addText([{ text: e[0], options: { bold: true, fontSize: 24, color: C.text2, breakLine: true } }, { text: e[1], options: { fontSize: 19, color: C.text1 } }],
    { x: 1.9, y, w: 10.5, h: 1.45, valign: "middle", margin: 0, isTextBox: true });
});

// ---------- 11. Ouverture
pres.addSection({ title: "Ouverture" });
s = S("SECTION", "Ouverture");
s.addText("La nature transfère des gènes…", { placeholder: "title" });
s.addText("Quels outils permettent à l’Homme de le faire au laboratoire ?\nProchaine séance : Activité 2 – Outils et techniques du génie génétique", { placeholder: "body" });

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
