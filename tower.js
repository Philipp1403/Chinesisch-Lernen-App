"use strict";
/* ============ Fernsehturm (Oriental Pearl Tower) ============
   Sechs Abschnitte, einer je HSK-Stufe. Ein Abschnitt füllt sich mit dem Lernstand der Stufe
   und leuchtet voll, sobald alle Wörter der Stufe gelernt sind. */
const TW_SEG=[
  {id:'s1',y0:256,y1:412,d:'M58 412 L77 412 L99 322 L88 322 Z M141 412 L122 412 L101 322 L112 322 Z M94 412 L106 412 L104 322 L96 322 Z M100 290 m-34 0 a34 34 0 1 0 68 0 a34 34 0 1 0 -68 0'},
  {id:'s2',y0:182,y1:258,d:'M87 258 H91 V182 H87 Z M98 258 H102 V182 H98 Z M109 258 H113 V182 H109 Z M100 208 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0'},
  {id:'s3',y0:137,y1:183,d:'M100 160 m-23 0 a23 23 0 1 0 46 0 a23 23 0 1 0 -46 0'},
  {id:'s4',y0:76,y1:138,d:'M97 138 H103 V76 H97 Z M95 96 H105 V104 H95 Z'},
  {id:'s5',y0:54,y1:78,d:'M100 66 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0'},
  {id:'s6',y0:4,y1:56,d:'M97.5 56 L100 4 L102.5 56 Z'}
];
function levelStats(lv){
  if(lv!==1) return {learned:0,total:0,ready:false};
  let learned=0,total=0; for(const l of LESSONS){ const p=lessonProgress(l); learned+=p.learned; total+=p.total; }
  return {learned,total,ready:true,done:total>0&&learned>=total};
}
function towerProgress(){ return [1,2,3,4,5,6].map(lv=>{ const s=levelStats(lv); return s.ready&&s.total?s.learned/s.total:0; }); }
function towerSvg(prefix,prog,opts={}){
  const defs=TW_SEG.map(s=>`<path id="${prefix}${s.id}" d="${s.d}"/>`).join('');
  const clips=TW_SEG.map((s,i)=>{ const p=Math.max(0,Math.min(1,prog[i]||0)); const h=(s.y1-s.y0)*p; return `<clipPath id="${prefix}c${i}"><rect x="0" y="${(s.y1-h).toFixed(1)}" width="200" height="${h.toFixed(1)}"/></clipPath>`; }).join('');
  const base=TW_SEG.map(s=>`<use href="#${prefix}${s.id}" class="tw-off"/>`).join('');
  const on=TW_SEG.map((s,i)=>prog[i]>0?`<use href="#${prefix}${s.id}" clip-path="url(#${prefix}c${i})" fill="url(#${prefix}g)" class="${prog[i]>=0.999?'tw-full':''}"/>`:'').join('');
  return `<svg class="tower" viewBox="45 0 110 420" role="img" aria-label="${esc(opts.label||'Fernsehturm')}"><defs><linearGradient id="${prefix}g" gradientUnits="userSpaceOnUse" x1="0" y1="412" x2="0" y2="4"><stop offset="0" stop-color="#4455E6"/><stop offset="1" stop-color="#E24DA6"/></linearGradient>${defs}${clips}</defs><line x1="30" y1="413" x2="170" y2="413" class="tw-ground"/>${base}${on}</svg>`;
}
function towerCard(){
  const prog=towerProgress(), s1=levelStats(1);
  const done=[1,2,3,4,5,6].filter(lv=>{ const s=levelStats(lv); return s.ready&&s.done; }).length;
  return `<div class="towercard"><div class="tw-art">${towerSvg('tc',prog,{label:`Fernsehturm, ${done} von 6 Stufen geschafft`})}</div>
    <div class="tw-info"><span class="muted small" style="font-weight:800">DEIN TURM</span><b style="font-size:20px">${done} von 6 Stufen geschafft</b>
      <p class="muted small" style="font-weight:600;margin:2px 0 8px">Jede HSK-Stufe füllt ein Sechstel des Shanghaier Fernsehturms. Ein Abschnitt leuchtet ganz, wenn du alle Wörter der Stufe gelernt hast.</p>
      <div class="tw-lv">${[1,2,3,4,5,6].map(lv=>{ const s=levelStats(lv); return `<div class="${s.ready&&s.done?'ok':''}"><span>HSK ${lv}</span><span>${s.ready?`${s.learned}/${s.total}`:'bald'}</span></div>`; }).join('')}</div></div></div>`;
}
/* Einmalige Feier, wenn eine Stufe neu geschafft ist */
function towerCheckCelebrate(){
  const seen=state.ui.towerSeen||(state.ui.towerSeen=[]);
  for(const lv of [1,2,3,4,5,6]){
    const s=levelStats(lv);
    if(s.ready&&s.done&&!seen.includes(lv)){
      seen.push(lv); save();
      const prog=towerProgress(), n=prog.filter(p=>p>=0.999).length;
      openSheet(`<div class="center"><h2>HSK ${lv} geschafft!</h2><p class="muted" style="font-weight:700;margin:6px 0 4px">Ein Stück vom Fernsehturm leuchtet jetzt. ${n} von 6.</p><div style="height:260px;display:flex;justify-content:center">${towerSvg('tz',prog)}</div><button class="btn primary block" style="margin-top:14px" data-no>Weiter</button></div>`,sh=>{ $('[data-no]',sh).addEventListener('click',closeSheet); });
      return;
    }
  }
}
