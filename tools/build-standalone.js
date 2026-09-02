/**
 * Fabrique une version « fichier unique » de l'application : dist/sijil-hodour.html
 *
 * Tout est embarqué (CSS, modules, icône). Les modules ES sont conservés tels
 * quels puis reliés entre eux par des URL blob créées au chargement : le fichier
 * s'ouvre donc par un simple double-clic (file://), sans serveur web.
 *
 *   node tools/build-standalone.js
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;
const lire = f => readFileSync(join(RACINE, f), 'utf8');

const ENTREE = 'src/main.js';
const RE_IMPORT = /(?:^|\s)(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g;

/** Résout un spécificateur relatif par rapport au module qui l'importe. */
const resoudre = (depuis, spec) => normalize(join(dirname(depuis), spec)).replace(/\\/g, '/');

/** Parcours en profondeur : renvoie les modules en ordre de dépendance. */
function collecter(entree) {
  const sources = new Map();
  const ordre = [];
  const enCours = new Set();

  (function visiter(chemin, pile) {
    if (sources.has(chemin)) return;
    if (enCours.has(chemin)) {
      throw new Error('Cycle de dépendances : ' + [...pile, chemin].join(' -> '));
    }
    enCours.add(chemin);
    const code = lire(chemin);
    for (const [, spec] of code.matchAll(RE_IMPORT)) {
      if (!spec.startsWith('.')) throw new Error(`Import externe non supporté : ${spec} (${chemin})`);
      visiter(resoudre(chemin, spec), [...pile, chemin]);
    }
    enCours.delete(chemin);
    sources.set(chemin, code);
    ordre.push(chemin);
  })(entree, []);

  return { sources, ordre };
}

const { sources, ordre } = collecter(ENTREE);

// Chaque spécificateur devient un jeton que le chargeur remplace par une URL blob.
const jeton = chemin => '__MOD__' + chemin + '__';

const modules = ordre.map(chemin => {
  const code = sources.get(chemin).replace(RE_IMPORT, (frag, spec) =>
    frag.replace(spec, jeton(resoudre(chemin, spec))));
  return [chemin, code];
});

const css = ['assets/css/theme.css', 'assets/css/app.css'].map(lire).join('\n');
const cssImpression = lire('assets/css/print.css');
const icone = lire('assets/img/icon.svg');

// Le squelette reprend index.html en retirant les liens vers des fichiers externes.
let html = lire('index.html')
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  .replace(/\s*<script type="module"[^>]*><\/script>/, '');

const chargeur = `
<script>
/* Chargeur : recrée les modules ES sous forme d'URL blob, dans l'ordre des dépendances. */
(function () {
  var MODULES = ${JSON.stringify(modules)};
  var urls = Object.create(null);
  for (var i = 0; i < MODULES.length; i++) {
    var chemin = MODULES[i][0];
    var code = MODULES[i][1].replace(/__MOD__(.*?)__(?=['"])/g, function (_, dep) { return urls[dep]; });
    urls[chemin] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  }
  var s = document.createElement('script');
  s.type = 'module';
  s.src = urls[${JSON.stringify(ENTREE)}];
  document.body.appendChild(s);
})();
</script>`;

html = html
  .replace('</head>',
    `<style>\n${css}\n</style>\n<style media="print">\n${cssImpression}\n</style>\n` +
    `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(icone).toString('base64')}">\n</head>`)
  .replace('</body>', `${chargeur}\n</body>`);

mkdirSync(join(RACINE, 'dist'), { recursive: true });
writeFileSync(join(RACINE, 'dist/sijil-hodour.html'), html);
console.log(`dist/sijil-hodour.html — ${modules.length} modules, ${(html.length / 1024).toFixed(0)} Ko`);
