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
/* Schreib-Quiz: ein Zeichen nach dem anderen, echte Strichprüfung */
async function writeQuiz(outer,word,{onFinish,outline}={}){
  await ensureChars(word);
  const chars=[...word.h].filter(isHan);
  let idx=0, mistakes=0, gaveUp=false, done=false, writer=null, alive=true;
  const host=document.createElement('div'); outer.replaceChildren(host);
  host.innerHTML=`<div class="wdots"></div><div class="wbox"></div><div class="wmsg" aria-live="polite"></div><div class="row" style="justify-content:center"><button class="btn small" data-q="solution">Lösung zeigen</button><button class="btn small quiet" data-q="restart">Zeichen neu</button></div>`;
  const dots=$('.wdots',host), box=$('.wbox',host), msg=$('.wmsg',host);
  const renderDots=()=>{ dots.innerHTML=chars.length>1?chars.map((c,i)=>`<i class="${i<idx?'done':i===idx?'on':''}"></i>`).join(''):''; };
  const say=(t,cls='')=>{ msg.textContent=t; msg.className='wmsg '+cls; };
  function start(){
    if(done||!alive) return;
    renderDots(); box.innerHTML='';
    const size=Math.max(200,box.clientWidth-4);
    writer=HanziWriter.create(box,chars[idx],writerOpts(size,{showCharacter:false,showOutline:outline===undefined?state.settings.outline:outline}));
    say(chars.length>1?`Zeichen ${idx+1} von ${chars.length}: Striche in der richtigen Reihenfolge zeichnen`:'Zeichne die Striche in der richtigen Reihenfolge');
    writer.quiz({
      leniency:1.15,
      onMistake:()=>{ mistakes++; say('Nicht ganz, versuche den Strich nochmal','err'); },
      onCorrectStroke:()=>{ say('Richtig','ok'); },
      onComplete:async()=>{ say('Geschafft','ok'); idx++; renderDots(); await sleep(650); if(!alive) return; if(idx<chars.length) start(); else finish(); }
    });
  }
  function finish(){
    done=true; box.innerHTML=`<div class="hz" style="display:grid;place-items:center;height:100%;font-size:clamp(80px,28vw,170px)">${hanziHtml(word.h,wordPy(word))}</div>`;
    $('.row',host).style.display='none';
    say(mistakes===0?'Fehlerfrei':`${mistakes} Fehlstrich${mistakes===1?'':'e'}`,mistakes===0?'ok':'');
    if(onFinish) onFinish({mistakes,gaveUp,chars:chars.length});
  }
  host.addEventListener('click',async e=>{
    const b=e.target.closest('[data-q]'); if(!b||done) return;
    if(b.dataset.q==='restart'){ start(); }
    if(b.dataset.q==='solution'){
      gaveUp=true; mistakes+=3; try{ writer.cancelQuiz(); }catch(_){}
      say('So geht es:'); await new Promise(r=>{ writer.animateCharacter({onComplete:r}); });
      await sleep(500); if(!alive) return; idx++; renderDots();
      if(idx<chars.length) start(); else finish();
    }
  });
  start();
  return {destroy:()=>{ alive=false; try{ writer&&writer.cancelQuiz(); }catch(_){} }};
}
