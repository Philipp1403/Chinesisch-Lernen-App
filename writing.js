"use strict";
/* ============ Zeichen schreiben (Hanzi Writer) ============ */
function cssv(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
function writerOpts(size,extra={}){
  return Object.assign({
    width:size,height:size,padding:Math.round(size*0.07),
    showCharacter:true,showOutline:true,
    strokeColor:cssv('--ink')||'#222',outlineColor:cssv('--line2')||'#ccc',
    drawingColor:cssv('--p')||'#4455E6',highlightColor:cssv('--good')||'#22B573',
    strokeAnimationSpeed:1.3,delayBetweenStrokes:220,strokeFadeDuration:300,
    drawingWidth:Math.max(14,Math.round(size/14)),showHintAfterMisses:2,
    charDataLoader:(ch,ok,fail)=>{ const d=CHARS[ch]; if(d) ok(d); else fail(new Error('keine Strichdaten für '+ch)); }
  },extra);
}
/* Strichfolge-Kacheln: Tippen zeigt die Reihenfolge */
async function mountTiles(host,word,{autoplay=true,size=108}={}){
  await ensureChars(word);
  const chars=[...word.h].filter(isHan);
  host.innerHTML=chars.map((c,i)=>`<button class="tile" data-i="${i}" aria-label="Strichfolge von ${esc(c)} abspielen"></button>`).join('');
  if(size!==108) $$('.tile',host).forEach(el=>{ el.style.width=el.style.height=(size+4)+'px'; });
  const writers=$$('.tile',host).map((el,i)=>HanziWriter.create(el,chars[i],writerOpts(size,{padding:8,showCharacter:false,showOutline:true})));
  let token=0;
  async function playAll(){
    const my=++token;
    for(const w of writers){ if(my!==token) return; await new Promise(res=>{ w.hideCharacter(); w.animateCharacter({onComplete:()=>res()}); }); await sleep(250); }
  }
  $$('.tile',host).forEach((el,i)=>el.addEventListener('click',()=>{ token++; writers[i].hideCharacter(); writers[i].animateCharacter(); }));
  if(autoplay) playAll();
  return {playAll};
}
/* Eigene Striche frei darstellen: richtige bleiben stehen wie gezeichnet, falsche verblassen */
function freeLayer(box){
  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('class','freelayer');
  box.appendChild(svg);
  const pending=[]; let cur=null, pts=[], last=null;
  const pos=e=>{ const r=box.getBoundingClientRect(); return [e.clientX-r.left-box.clientLeft,e.clientY-r.top-box.clientTop]; };
  const draw=()=>{ if(!cur) return; let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for(let i=1;i<pts.length-1;i++){ const mx=(pts[i][0]+pts[i+1][0])/2, my=(pts[i][1]+pts[i+1][1])/2; d+=` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
    if(pts.length>1) d+=` L${pts[pts.length-1][0].toFixed(1)} ${pts[pts.length-1][1].toFixed(1)}`;
    cur.setAttribute('d',d); };
  const down=e=>{ if(e.pointerType==='mouse'&&e.button!==0) return; pts=[pos(e)]; cur=document.createElementNS(NS,'path');
    cur.setAttribute('class','fstroke'); cur.setAttribute('style',`stroke-width:${Math.max(6,Math.round(box.clientWidth/34))}px`); svg.appendChild(cur); draw(); };
  const move=e=>{ if(!cur) return; pts.push(pos(e)); draw(); };
  const up=()=>{ if(!cur) return; const p=cur; cur=null;
    if(pts.length<3){ p.remove(); return; } p._pts=pts.slice(); last=p; pending.push(p); };
  box.addEventListener('pointerdown',down); box.addEventListener('pointermove',move);
  box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
  return {
    accept(){ const p=pending.shift()||last; if(p){ p.classList.add('ok'); return p._pts||[]; } return []; },
    reject(){ const p=pending.shift()||last; if(p){ p.classList.add('bad'); setTimeout(()=>p.remove(),380); } }
  };
}
/* Score 1 bis 10: Abstand deiner Striche zur Mittellinie der richtigen Striche, Fehlversuche kosten Punkte */
function resample(pts,n){
  const L=[0]; for(let i=1;i<pts.length;i++) L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const tot=L[L.length-1]||1, out=[]; let j=0;
  for(let k=0;k<n;k++){ const t=tot*k/(n-1); while(j<L.length-2&&L[j+1]<t) j++;
    const seg=(L[j+1]-L[j])||1, f=Math.min(1,Math.max(0,(t-L[j])/seg)); out.push([pts[j][0]+(pts[j+1][0]-pts[j][0])*f,pts[j][1]+(pts[j+1][1]-pts[j][1])*f]); }
  return out;
}
function strokeScore(user,median,tf){
  if(user.length<2||!median||median.length<2) return 0;
  const u=resample(user.map(([x,y])=>[(x-tf.tx)/tf.sx,(y-tf.ty)/tf.sy]),24), m=resample(median,24);
  let d=0; for(let i=0;i<24;i++) d+=Math.hypot(u[i][0]-m[i][0],u[i][1]-m[i][1]);
  d/=24; return Math.max(0,1-d/260);
}
function readTransform(box){
  const g=box.querySelector('svg:not(.freelayer) g[transform]'); if(!g) return null;
  const m=/translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+),\s*([-\d.]+)\)/.exec(g.getAttribute('transform')||''); if(!m) return null;
  return {tx:+m[1],ty:+m[2],sx:+m[3],sy:+m[4]};
}
function drawScore(box,ch,strokes,mistakes){
  const data=CHARS[ch], tf=readTransform(box); if(!data||!tf) return null;
  const per=data.medians.map((med,i)=>strokes[i]?strokeScore(strokes[i],med,tf):0);
  const mean=per.reduce((a,b)=>a+b,0)/Math.max(1,per.length);
  return Math.max(1,Math.min(10,Math.round(1+9*mean-0.5*mistakes)));
}
/* Schreib-Quiz: ein Zeichen nach dem anderen, echte Strichprüfung */
async function writeQuiz(outer,word,{onFinish,outline}={}){
  await ensureChars(word);
  const chars=[...word.h].filter(isHan);
  let idx=0, mistakes=0, gaveUp=false, done=false, writer=null, alive=true; const scores=[];
  const host=document.createElement('div'); outer.replaceChildren(host);
  host.innerHTML=`<div class="wdots"></div><div class="wbox"></div><div class="wmsg" aria-live="polite"></div><div class="row" style="justify-content:center"><button class="btn small" data-q="solution">Lösung zeigen</button><button class="btn small quiet" data-q="restart">Zeichen neu</button></div>`;
  const dots=$('.wdots',host), box=$('.wbox',host), msg=$('.wmsg',host);
  const renderDots=()=>{ dots.innerHTML=chars.length>1?chars.map((c,i)=>`<i class="${i<idx?'done':i===idx?'on':''}"></i>`).join(''):''; };
  const say=(t,cls='')=>{ msg.textContent=t; msg.className='wmsg '+cls; };
  function start(){
    if(done||!alive) return;
    renderDots(); box.innerHTML='';
    const size=Math.max(200,box.clientWidth-4);
    const free=!!state.settings.freeDraw, T='rgba(0,0,0,0)';
    /* Freies Zeichnen: Hanzi Writer prüft nur im Hintergrund (unsichtbar), gezeigt werden deine eigenen Striche */
    writer=HanziWriter.create(box,chars[idx],writerOpts(size,Object.assign({showCharacter:false,showOutline:outline===undefined?state.settings.outline:outline},free?{drawingColor:T,strokeColor:T,highlightColor:T,showHintAfterMisses:false,highlightOnComplete:false}:{})));
    const fl=free?freeLayer(box):null; const strokes=[]; const mistakes0=mistakes;
    say(chars.length>1?`Zeichen ${idx+1} von ${chars.length}: Striche in der richtigen Reihenfolge zeichnen`:'Zeichne die Striche in der richtigen Reihenfolge');
    writer.quiz({
      leniency:1.15,
      onMistake:()=>{ mistakes++; if(fl) fl.reject(); say('Nicht ganz, versuche den Strich nochmal','err'); },
      onCorrectStroke:()=>{ if(fl) strokes.push(fl.accept()); say('Richtig','ok'); },
      onComplete:async()=>{
        if(free){
          const sc=drawScore(box,chars[idx],strokes,mistakes-mistakes0); scores.push(sc==null?7:sc);
          say(`Geschafft · Score ${sc==null?'-':sc} von 10`+(state.settings.showRef!==false?' · so sieht es richtig aus':''),'ok');
          if(state.settings.showRef!==false){ try{ writer.updateColor('strokeColor',cssv('--muted')||'#8a93b5'); writer.showCharacter({duration:250}); }catch(_){} }
          idx++; renderDots(); if(idx<chars.length) await sleep(state.settings.showRef!==false?2600:1100);
        } else { say('Geschafft','ok'); idx++; renderDots(); await sleep(650); }
        if(!alive) return; if(idx<chars.length) start(); else finish(); }
    });
  }
  function finish(){
    done=true; const free=!!state.settings.freeDraw;
    let score=null;
    if(free){ score=gaveUp||!scores.length?1:Math.max(1,Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)); }
    else box.innerHTML=`<div class="hz" style="display:grid;place-items:center;height:100%;font-size:clamp(80px,28vw,170px)">${hanziHtml(word.h,wordPy(word))}</div>`;
    $('.row',host).style.display='none';
    say(free?`Dein Score: ${score} von 10`:(mistakes===0?'Fehlerfrei':`${mistakes} Fehlstrich${mistakes===1?'':'e'}`),(free?score>=7:mistakes===0)?'ok':'');
    if(onFinish) onFinish({mistakes,gaveUp,chars:chars.length,score});
  }
  host.addEventListener('click',async e=>{
    const b=e.target.closest('[data-q]'); if(!b||done) return;
    if(b.dataset.q==='restart'){ start(); }
    if(b.dataset.q==='solution'){
      gaveUp=true; mistakes+=3; try{ writer.cancelQuiz(); }catch(_){}
      if(state.settings.freeDraw){ try{ writer.updateColor('strokeColor',cssv('--p')||'#4455E6'); }catch(_){} }
      say('So geht es:'); await new Promise(r=>{ writer.animateCharacter({onComplete:r}); });
      await sleep(500); if(!alive) return; idx++; renderDots();
      if(idx<chars.length) start(); else finish();
    }
  });
  start();
  return {destroy:()=>{ alive=false; try{ writer&&writer.cancelQuiz(); }catch(_){} }};
}
