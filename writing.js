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
/* Eigene Striche frei darstellen: richtige bleiben stehen wie gezeichnet, falsche verblassen. Keine Bewertung, nur die Strichprüfung von Hanzi Writer im Hintergrund. */
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
    /* Nach dem Fertigstellen (oder Aufgeben) nimmt das Feld keine Striche mehr an */
    disable(){ box.removeEventListener('pointerdown',down); box.removeEventListener('pointermove',move); box.removeEventListener('pointerup',up); box.removeEventListener('pointercancel',up); if(cur){ cur.remove(); cur=null; } pending.forEach(p=>{ if(!p.classList.contains('ok')) p.remove(); }); pending.length=0; },
    accept(){ const p=pending.shift()||last; if(p){ p.classList.add('ok'); return p._pts||[]; } return []; },
    reject(){ const p=pending.shift()||last; if(p){ p.classList.add('bad'); setTimeout(()=>p.remove(),380); } }
  };
}
/* Schreib-Quiz: alle Zeichen eines Wortes nebeneinander in einem Feld, eins nach dem anderen, echte Strichprüfung.
   free: true = freies Zeichnen (deine Striche bleiben wie gemalt), false = nachzeichnen (Striche rasten ein), sonst Einstellung.
   fit: Feldgröße so wählen, dass Feld, Meldung und Knöpfe über der Fußleiste Platz haben (ohne Scrollen). */
async function writeQuiz(outer,word,{onFinish,outline,free:freeOpt,fit:fitOpt}={}){
  await ensureChars(word);
  const chars=[...word.h].filter(isHan), N=chars.length;
  const free=freeOpt===undefined?!!state.settings.freeDraw:!!freeOpt, showRef=state.settings.showRef!==false;
  let idx=0, mistakes=0, gaveUp=false, done=false, writer=null, alive=true, layer=null, fitted=false, busy=false;
  const host=document.createElement('div'); outer.replaceChildren(host);
  host.innerHTML=`<div class="wbox" style="--n:${N}"></div><div class="wmsg" aria-live="polite"></div><div class="row wbtns" style="justify-content:center"><button class="btn small" data-q="solution">Lösung zeigen</button><button class="btn small quiet" data-q="restart">Zeichen neu</button></div>`;
  const box=$('.wbox',host), msg=$('.wmsg',host), btns=$('.wbtns',host);
  const cells=chars.map(()=>{ const c=document.createElement('div'); c.className='wcell'; box.appendChild(c); return c; });
  const say=(t,cls='')=>{ msg.textContent=t; msg.className='wmsg '+cls; };
  const mark=()=>cells.forEach((c,i)=>c.classList.toggle('on',N>1&&!done&&i===idx));
  function fit(){
    if(!fitOpt) return;
    const dl=outer.closest('.dlay'), grid=!!dl&&getComputedStyle(dl).display==='grid';
    const sb=$('.sbody'); if(sb) sb.scrollTop=0;
    const foot=$('#sf'), fTop=foot&&!foot.classList.contains('hidden')?foot.getBoundingClientRect().top:innerHeight;
    const top=grid?($('.sbar').getBoundingClientRect().bottom+12):box.getBoundingClientRect().top;
    const availW=grid?Math.max(200,dl.clientWidth-240-36):host.clientWidth;
    const extra=msg.offsetHeight+16+btns.offsetHeight+12+14+16;
    const cell=Math.floor(Math.max(120,Math.min(fTop-top-extra,availW/N)));
    box.style.width=(cell*N)+'px'; box.style.height=cell+'px';
  }
  function startChar(){
    if(done||!alive) return;
    if(!fitted){ fitted=true; fit(); }
    /* frisches Element: alte Zeiger-Ereignisse des vorigen Versuchs bleiben nicht hängen */
    const old=cells[idx], cell=old.cloneNode(false); old.replaceWith(cell); cells[idx]=cell; mark();
    const size=Math.max(120,cell.clientWidth-4), T='rgba(0,0,0,0)';
    /* Freies Zeichnen: Hanzi Writer prüft nur im Hintergrund (unsichtbar), gezeigt werden deine eigenen Striche */
    const wr=writer=HanziWriter.create(cell,chars[idx],writerOpts(size,Object.assign({showCharacter:false,showOutline:outline===undefined?state.settings.outline:outline},free?{drawingColor:T,strokeColor:T,highlightColor:T,showHintAfterMisses:false,highlightOnComplete:false}:{})));
    const fl=layer=free?freeLayer(cell):null; const ci=idx;
    say(N>1?`Zeichen ${idx+1} von ${N}: Striche in der richtigen Reihenfolge zeichnen`:'Zeichne die Striche in der richtigen Reihenfolge');
    wr.quiz({
      leniency:1.15,
      onMistake:()=>{ mistakes++; if(fl) fl.reject(); say('Nicht ganz, versuche den Strich nochmal','err'); },
      onCorrectStroke:()=>{ if(fl) fl.accept(); say('Richtig','ok'); },
      onComplete:async()=>{
        if(fl) fl.disable();
        say(N>1?`Zeichen ${ci+1} von ${N} geschafft`:'Geschafft','ok');
        if(free&&showRef){ try{ wr.updateColor('strokeColor',cssv('--muted')||'#8a93b5'); wr.showCharacter({duration:250}); }catch(_){} }
        idx++; if(idx<N) await sleep(free&&showRef?1100:450);
        if(!alive) return; if(idx<N) startChar(); else finish(); }
    });
  }
  function finish(){
    done=true; mark();
    if(layer) layer.disable();
    btns.style.display='none';
    say(mistakes===0?'Fehlerfrei':`${mistakes} Fehlstrich${mistakes===1?'':'e'}`,mistakes===0?'ok':'');
    if(onFinish) onFinish({mistakes,gaveUp,chars:N});
  }
  host.addEventListener('click',async e=>{
    const b=e.target.closest('[data-q]'); if(!b||done) return;
    if(b.dataset.q==='restart'){ if(busy) return; try{ writer&&writer.cancelQuiz(); }catch(_){} startChar(); }
    if(b.dataset.q==='solution'){
      if(busy) return; busy=true;
      gaveUp=true; mistakes+=3; try{ writer.cancelQuiz(); }catch(_){}
      if(layer) layer.disable();
      const cell=cells[idx], size=Math.max(120,cell.clientWidth-4); cell.innerHTML='';
      const sw=HanziWriter.create(cell,chars[idx],writerOpts(size,{showCharacter:false,showOutline:true,strokeColor:cssv('--p')||'#4455E6'}));
      writer=sw; say('So geht es:'); await new Promise(r=>{ sw.animateCharacter({onComplete:r}); });
      await sleep(500); if(!alive) return; idx++; busy=false;
      if(idx<N) startChar(); else finish();
    }
  });
  startChar();
  return {destroy:()=>{ alive=false; try{ writer&&writer.cancelQuiz(); }catch(_){} }};
}
