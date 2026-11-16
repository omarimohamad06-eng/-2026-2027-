// Rendu PDF des deux versions avec Chromium (Playwright).
// Usage : node build/render.js            (depuis le dossier genie_genetique)
const { chromium } = require('playwright');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = 'file://' + path.join(__dirname, 'cours.html');

const header = `
<div style="width:100%;font-family:Carlito,Calibri,sans-serif;font-size:7.6pt;font-weight:700;padding:0 8mm;display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">
  <span style="color:#1a1a1a">Unité II : <span style="color:#1f6fb5">Nature et mécanisme de l’expression du matériel génétique – Le génie génétique</span></span>
  <span style="color:#1a1a1a">2BAC-SVT &nbsp;|&nbsp; 2026-2027</span>
</div>`;
const footer = (label) => `
<div style="width:100%;font-family:'Liberation Serif','Times New Roman',serif;font-size:8.5pt;color:#555;padding:0 9mm;display:flex;justify-content:space-between">
  <span>Pr : Omari Mohammed</span>
  <span style="font-family:Carlito,sans-serif;font-weight:700;color:${label.color}">${label.text}</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

const VERSIONS = [
  { q: 'eleve', out: '2BAC_SVT_Unite2_Chapitre3_Genie_genetique_ELEVE.pdf', label: { text: 'Chapitre 3 : Le génie génétique', color: '#1f6fb5' } },
  { q: 'prof',  out: '2BAC_SVT_Unite2_Chapitre3_Genie_genetique_PROF.pdf',  label: { text: 'Version professeur (avec réponses)', color: '#2e8b57' } },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const v of VERSIONS) {
    await page.goto(`${HTML}?v=${v.q}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(ROOT, v.out), format: 'A4', printBackground: true,
      displayHeaderFooter: true, headerTemplate: header, footerTemplate: footer(v.label),
      margin: { top: '13mm', bottom: '12mm', left: '8mm', right: '8mm' },
      preferCSSPageSize: false,
    });
    console.log('OK', v.out);
  }
  await browser.close();
})();
