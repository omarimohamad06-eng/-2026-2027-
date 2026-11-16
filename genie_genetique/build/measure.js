// Hauteur (mm) de chaque bloc compris entre deux sauts de page forcés ; page utile = 272 mm.
const { chromium } = require('playwright'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:733,height:1000}});
 await p.emulateMedia({media:'print'});
 for (const v of (process.argv[2]?[process.argv[2]]:['eleve','prof'])) {
  await p.goto('file://'+path.join(__dirname,'cours.html')+'?v='+v); await p.evaluate(()=>document.fonts.ready);
  const r=await p.evaluate(()=>{const mm=px=>px*25.4/96; const kids=[...document.body.children].filter(e=>e.tagName!=='SCRIPT');
    const segs=[]; let cur=[];
    for(const k of kids){ const cs=getComputedStyle(k); if(cs.breakBefore==='page'){ if(cur.length) segs.push(cur); cur=[]; } if(k.offsetHeight||k.classList.length) cur.push(k);} segs.push(cur);
    return segs.map(s=>{const vis=s.filter(e=>e.getBoundingClientRect().height>0); if(!vis.length) return null; const t=vis[0].getBoundingClientRect().top, bt=Math.max(...vis.map(e=>e.getBoundingClientRect().bottom+parseFloat(getComputedStyle(e).marginBottom)));
      return mm(bt-t).toFixed(0)+'mm  '+(vis[0].textContent.trim().slice(0,50).replace(/\s+/g,' '));}).filter(Boolean)});
  console.log('== '+v+'\n'+r.join('\n')); }
 await b.close();})();
