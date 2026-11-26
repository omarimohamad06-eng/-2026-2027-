// node print.js <html> <pdf>
const { chromium } = require('playwright');
(async () => {
  const [html, pdf] = process.argv.slice(2);
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('file://' + html, { waitUntil: 'networkidle' });
  await pg.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await br.close();
})();
