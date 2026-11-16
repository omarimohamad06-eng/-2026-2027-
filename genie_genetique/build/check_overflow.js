// Signale les images plus larges que leur conteneur (rendu « print », largeur utile 194 mm).
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:733,height:1000}});
 await p.emulateMedia({media:'print'});
 for (const v of ['eleve','prof']) {
  await p.goto('file://'+path.join(__dirname,'cours.html')+'?v='+v); await p.evaluate(()=>document.fonts.ready);
  const r=await p.evaluate(()=>{const out=[];
   document.querySelectorAll('img').forEach(e=>{const rc=e.getBoundingClientRect(), pr=e.parentElement.getBoundingClientRect();
     const nat=e.naturalWidth; const scale=(rc.width/nat*96/25.4).toFixed(2);
     out.push(`${e.getAttribute('src').split('/').pop().padEnd(34)} ${(rc.width*25.4/96).toFixed(0)}mm  ${(nat/(rc.width/96)).toFixed(0)}dpi ${rc.right>pr.right+0.5?'OVERFLOW':''}`)}); return out});
  console.log('== '+v+'\n'+r.join('\n')); break; }
 await b.close();})();
