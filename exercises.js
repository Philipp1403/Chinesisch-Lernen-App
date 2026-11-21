"use strict";
/* ============ Darstellung von Sätzen ============ */
function rubyUnit(py,h,cls='',w=null){ return `<span class="ruby ${cls}" ${w!=null&&BYID.has(w)?`data-tw="${w}" role="button" tabindex="0"`:''}><span class="r-py">${pinyinHtml(py)}</span><span class="r-hz">${hanziHtml(h,py)}</span></span>`; }
function rubyHtml(s,{marks=null,sm=false,blank=-1}={}){
  let out='', ci=0, ti=-1;
  for(const tok of s.t){
    ti++;
    if(ti===blank){ out+=`<span class="ruby blank"><span class="r-py"></span><span class="r-hz">&nbsp;</span></span>`; continue; }
    if(tok.punc){ if(tok.h==='。') continue;   /* der Schlusspunkt wird nicht angezeigt */
      out+=`<span class="ruby punc"><span class="r-py"></span><span class="r-hz">${esc(tok.h)}</span></span>`; continue; }
    if(marks){
      const chars=[...tok.h], syl=charSylls(tok.h,tok.p);
      chars.forEach((c,i)=>{
        const v=marks[ci++]; const cls = v>=0.9?'cs-g':v>=0.5?'cs-o':'cs-r';
        const py=syl?syl[i]:tok.p;
        out+=`<span class="ruby ${cls}" ${tok.w!=null&&BYID.has(tok.w)?`data-tw="${tok.w}"`:''}><span class="r-py">${esc(py)}</span><span class="r-hz">${esc(c)}</span></span>`;
      });
    } else out+=rubyUnit(tok.p,tok.h,'',tok.w);
  }
  return `<div class="sentence ${sm?'sm':''}">${out}</div>`;
}
const audioRow=(slowToo=true,extra='')=>`<div class="row" style="justify-content:center;gap:12px">${'<button class="ibtn fill" data-au="n" aria-label="Aussprache abspielen">'+ICON.speaker+'</button>'}${slowToo?'<button class="slowbtn" data-au="s" aria-label="Langsam abspielen">'+ICON.slow+'Langsam</button>':''}${extra}</div>`;
function bindAudio(root,text,parts=null){ $$('[data-au]',root).forEach(b=>b.addEventListener('click',()=>speak(text,{slow:b.dataset.au==='s',parts}))); }
const sentParts=s=>s.t.filter(t=>!t.punc).map(t=>t.h);
/* Text zum Hören: Zeichen und Pinyin, abschaltbar in den Einstellungen */
const listenWord=(w,{hanzi=true}={})=>state.settings.showText?`<div class="listentext">${hanzi?`<div class="hz">${hanziHtml(w.h,wordPy(w))}</div>`:''}<div class="py">${pinyinHtml(wordPy(w))}</div></div>`:'';
const listenSent=s=>state.settings.showText?`<div class="listentext">${rubyHtml(s,{sm:true})}</div>`:'';
const autoSpeak=(t,slow=false)=>{ if(state.settings.auto) setTimeout(()=>speak(t,{slow}),200); };

/* ============ Sitzungs-Motor ============ */
let SESS=null; const EX={};
function runSession(opts){
  SESS={title:opts.title||'',items:[...opts.items],total:opts.items.length,regen:opts.regen||null,onExit:opts.onExit||null,kind:opts.kind||'',t0:Date.now(),i:0,okFirst:0,cntFirst:0,learned:0,cleanup:null,handlers:[],noRetry:!!opts.noRetry,wrong:new Set(),lessonId:opts.lessonId||null};
  const root=$('#session'); root.classList.remove('hidden'); document.body.style.overflow='hidden';
  root.innerHTML=`<div class="sbar"><button class="xbtn" data-s="quit" aria-label="Beenden">${ICON.x}</button><div class="bar thin p grow" role="progressbar"><i style="width:0%"></i></div></div><div class="sbody"><div class="sinner" id="sx"></div></div><div class="sfoot hidden" id="sf"></div>`;
  root.onclick=e=>{ if(e.target.closest('[data-s=quit]')) exitSession(); };
  showItem();
}
function exitSession(){
  if(!SESS) return;
  try{ SESS.cleanup&&SESS.cleanup(); }catch(_){}
  stopSpeak(); abortListening();
  const cb=SESS.onExit; SESS=null;
  $('#session').classList.add('hidden'); $('#session').innerHTML=''; document.body.style.overflow='';
  save(); if(cb) cb(); else renderView();
}
function setFooter(cls,html){ const f=$('#sf'); if(!f) return; f.className='sfoot '+(cls||''); f.innerHTML=`<div class="in">${html}</div>`; }
function showItem(){
  if(!SESS) return;
  try{ SESS.cleanup&&SESS.cleanup(); }catch(_){} SESS.cleanup=null;
  stopSpeak(); abortListening();
  if(SESS.i>=SESS.items.length) return showDone();
  const it=SESS.items[SESS.i];
  const pct=Math.round(SESS.i/SESS.items.length*100);
  $('.sbar .bar>i').style.width=pct+'%';
  const f=$('#sf'); f.className='sfoot hidden'; f.innerHTML='';
  const old=$('#sx'); const host=document.createElement('div'); host.id='sx'; host.className='sinner fade'; old.replaceWith(host); $('.sbody').scrollTop=0;
  const ctx=makeCtx(it);
  try{ SESS.cleanup=EX[it.type](host,it,ctx)||null; }
  catch(err){ host.innerHTML=`<div class="card"><p>Diese Aufgabe konnte nicht geladen werden.</p><p class="muted small">${esc(err.message||err)}</p></div>`; ctx.footer([{label:'Weiter',cls:'primary grow',onClick:()=>ctx.next()}]); }
}
/* In welcher Fähigkeit liegt der Fehler? Bestimmt die Anzeige bei den schwierigen Wörtern */
function hardKind(it){
  if(it.type==='review') return it.mode==='write'?'schreiben':it.mode==='listen'?'hören':'lesen';
  if(it.type==='choose') return it.variant==='listen'?'hören':'lesen';
  if(it.type==='draw'||it.type==='wdrill') return 'schreiben';
  if(it.type==='dictate'||it.type==='listensent'||it.type==='tones') return 'hören';
  return 'lesen';
}
function makeCtx(it){
  let handlers=[];
  const ctx={
    it,
    footer(btns,cls=''){
      handlers=btns.map(b=>b.onClick);
      setFooter(cls,btns.map((b,i)=>`<button class="btn ${b.cls||''}" data-fb="${i}" ${b.disabled?'disabled':''}>${b.label}</button>`).join(''));
      $('#sf').onclick=e=>{ const b=e.target.closest('[data-fb]'); if(b&&!b.disabled) handlers[+b.dataset.fb](); };
    },
    footerRaw(html,onClick,cls=''){ setFooter(cls,html); $('#sf').onclick=onClick; },
    setDisabled(i,on){ const b=$(`#sf [data-fb="${i}"]`); if(b) b.disabled=on; },
    next(){ SESS.i++; showItem(); },
    /* Ergebnis mit Rückmeldung (grün/rot) */
    finish({ok,title,html=''}){
      ctx.record(ok);
      ctx.footerRaw(`<div class="fb"><b>${esc(title||(ok?'Richtig!':'Nicht ganz'))}</b><div>${html}</div></div><button class="btn ${ok?'good':'bad'}" data-fb="0">Weiter</button>`,
        e=>{ if(e.target.closest('[data-fb]')) ctx.next(); }, ok?'ok':'no');
    },
    /* ohne Rückmeldung weiter; ok=null: nicht werten */
    complete(ok){ ctx.record(ok); ctx.next(); },
    record(ok){
      if(it._rec) return; it._rec=true;
      if(ok===null||ok===undefined) return;
      if(!it.retry){ SESS.cntFirst++; if(ok) SESS.okFirst++; }
      if(!ok && !it.retry && it.wid) SESS.wrong.add(it.wid);
      if(!ok && !SESS.noRetry){ SESS.items.push({...it,retry:true,_rec:false}); }
      if(it.wid) noteStat(it.wid,ok,hardKind(it));
      if(it.sid){ const s=SBYID.get(it.sid); for(const t of s.t) if(!t.punc) noteStat(t.w,ok,null); }
    },
  };
  return ctx;
}
function showDone(){
  const el=Math.round((Date.now()-SESS.t0)/1000), mm=Math.floor(el/60), ss=String(el%60).padStart(2,'0');
  const acc=SESS.cntFirst? Math.round(100*SESS.okFirst/SESS.cntFirst):null;
  $('.sbar .bar>i').style.width='100%';
  const head = SESS.kind==='learn' ? 'Wörter gelernt' : SESS.kind==='review' ? 'Wiederholung erledigt' : SESS.kind==='test' ? 'Lektionstest fertig' : 'Runde geschafft';
  if(SESS.kind==='test'&&SESS.lessonId){ const t=state.ui.tests=state.ui.tests||{}; const old=t[SESS.lessonId]; t[SESS.lessonId]={last:acc,best:Math.max(acc||0,old&&old.best||0),ts:Date.now()}; save(); }
  const wrongList=[...SESS.wrong].map(id=>BYID.get(id)).filter(Boolean);
  $('#sx').innerHTML=`<div class="donebox fade"><div class="hz" style="font-size:72px;color:var(--p)">好</div><h1 style="margin-top:6px">${head}</h1>
    <div class="stats3">
      ${SESS.kind==='learn'
        ? `<div class="stat"><b>${SESS.learned}</b><span>neue Wörter</span></div><div class="stat"><b>${Object.keys(state.cards).length}</b><span>im Stapel</span></div>`
        : `<div class="stat"><b>${acc===null?'–':acc+'%'}</b><span>${SESS.kind==='test'?'richtig':'beim 1. Versuch'}</span></div><div class="stat"><b>${SESS.total}</b><span>Aufgaben</span></div>`}
      <div class="stat"><b>${mm}:${ss}</b><span>Zeit</span></div>
    </div>
    ${SESS.kind==='learn'?'<p class="muted" style="font-weight:700">Die Wörter sind jetzt in deiner Wiederholung. Übe sie gleich in einer Runde.</p>':''}
    ${SESS.kind==='test'?(wrongList.length?`<div class="card wronglist"><div class="fieldlabel">Das solltest du nochmal üben</div>${wrongList.map(w=>`<div class="wrow"><div class="hz" data-tw="${w.id}">${hanziHtml(w.h,wordPy(w))}</div><div class="mid"><div class="py">${pinyinHtml(wordPy(w))}</div><div class="de">${esc(gloss(w))}</div></div></div>`).join('')}</div>`:'<p class="muted" style="font-weight:700">Alles richtig beim ersten Versuch.</p>'):''}</div>`;
  const btns=[]; const nextItems=SESS.regen?SESS.regen():null;
  if(nextItems&&nextItems.length) btns.push({label:SESS.kind==='learn'?'Weitere Wörter':'Noch eine Runde',cls:'primary grow',onClick:()=>{ const o=SESS; runSession({title:o.title,items:nextItems,regen:o.regen,onExit:o.onExit,kind:o.kind}); }});
  btns.push({label:'Fertig',cls:(btns.length?'':'primary ')+'grow',onClick:exitSession});
  makeCtx({}).footer(btns);
}

/* ============ Aufgabentypen ============ */
const MODE_TAG=t=>`<div class="tag-mode">${t}</div>`;
const TYPE_INFO={
  choose:{name:'Wörter auswählen',desc:'Hören, lesen, zuordnen',icon:'choose'},
  build:{name:'Satz bauen',desc:'Chinesischen Satz aus Kacheln bilden',icon:'build'},
  trans:{name:'Übersetzen',desc:'Chinesischen Satz aus deutschen Wörtern bilden',icon:'build'},
  tones:{name:'Töne-Training',desc:'Ton hören und bestimmen',icon:'dictate'},
  cloze:{name:'Lückentext',desc:'Fehlendes Wort im Satz wählen',icon:'choose'},
  pairs:{name:'Paare zuordnen',desc:'Chinesisch und Deutsch verbinden',icon:'mixed'},
  listensent:{name:'Hören und verstehen',desc:'Satz hören, Bedeutung wählen',icon:'dictate'},
  speak:{name:'Nachsprechen',desc:'Satz sprechen, Bewertung erhalten',icon:'mic'},
  draw:{name:'Zeichen zeichnen',desc:'Zeichen mit der richtigen Strichfolge',icon:'draw'},
  dictate:{name:'Hören und schreiben',desc:'Satz hören, aus Kacheln schreiben',icon:'dictate'},
  wcard:{name:'Karteikarten frei',desc:'Sprechen und zeichnen',icon:'mic'},
  wdrill:{name:'Schreibtraining',desc:'Zeichen mehrfach hintereinander üben',icon:'draw'},
  mixed:{name:'Gemischte Runde',desc:'Von allem etwas',icon:'mixed'},
};

/* --- Neues Wort --- */
EX.intro=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), ex=EXAMPLE.get(w.id), s=ex?SBYID.get(ex):null;
  host.innerHTML=`${MODE_TAG('Neues Wort')}
    <div class="hz bighz" style="margin:4px 0 2px">${hanziHtml(w.h,py)}</div>
    <div class="center"><span class="py">${pinyinHtml(py)}</span></div>
    <div class="meaning" style="margin:10px 0 16px">${esc(gloss(w))}</div>
    ${audioRow()}
    <div class="muted small center" style="margin:18px 0 8px;font-weight:700">Tippe auf ein Zeichen, um die Strichfolge zu sehen</div>
    <div id="tiles" class="tiles"></div>
    ${s?`<div class="card" style="margin-top:20px;padding:14px 10px 6px"><div class="small muted center" style="font-weight:800;margin-bottom:8px">BEISPIEL</div>${rubyHtml(s,{sm:true})}<div class="center" style="font-weight:700;margin:0 0 10px">${esc(s.de)}</div><div class="row" style="justify-content:center;margin-bottom:8px"><button class="slowbtn" data-ex="n">${ICON.speaker}Anhören</button><button class="slowbtn" data-ex="s">${ICON.slow}Langsam</button></div></div>`:''}`;
  bindAudio(host,w.h);
  $$('[data-ex]',host).forEach(b=>b.addEventListener('click',()=>speak(sentenceText(s),{slow:b.dataset.ex==='s',parts:sentParts(s)})));
  mountTiles($('#tiles',host),w).catch(()=>{ $('#tiles',host).innerHTML='<p class="muted small">Strichdaten konnten nicht geladen werden.</p>'; });
  autoSpeak(w.h);
  ctx.footer([
    {label:'Kenne ich schon',cls:'quiet',onClick:()=>{ ensureCard(w.id); applyRating(w.id,3); SESS.learned++; save(); ctx.next(); }},
    {label:'Weiter',cls:'primary grow',onClick:()=>{ ensureCard(w.id); SESS.learned++; save(); ctx.next(); }},
  ]);
};

/* --- Wörter auswählen --- */
EX.choose=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), v=it.variant;
  let head='';
  if(v==='listen') head=`${MODE_TAG('Hören')}<div class="prompt">Was bedeutet das?</div><div class="row" style="justify-content:center;gap:14px;margin:6px 0 14px"><button class="ibtn xl fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>${listenWord(w)}`;
  else if(v==='read') head=`${MODE_TAG('Lesen')}<div class="prompt">Was bedeutet das?</div><div class="hz bighz" style="margin:0 0 4px">${hanziHtml(w.h,py)}</div><div class="center" style="margin-bottom:20px"><span class="py">${pinyinHtml(py)}</span></div>`;
  else head=`${MODE_TAG('Zuordnen')}<div class="prompt">Welches Wort passt?</div><div class="meaning" style="font-size:clamp(26px,7vw,36px);margin:0 0 24px">${esc(gloss(w))}</div>`;
  const optHtml=id=>{ const o=BYID.get(id); return v==='rev'
    ? `<button class="opt" data-o="${id}"><span class="hz">${hanziHtml(o.h,wordPy(o))}</span><span class="py">${esc(wordPy(o))}</span></button>`
    : `<button class="opt" data-o="${id}">${esc(gloss(o))}</button>`; };
  host.innerHTML=head+`<div class="opts">${it.opts.map(optHtml).join('')}</div>`;
  bindAudio(host,w.h);
  if(v==='listen') autoSpeak(w.h);
  let locked=false;
  $$('.opt',host).forEach(b=>b.addEventListener('click',()=>{
    if(locked) return; locked=true;
    const ok=+b.dataset.o===w.id;
    $$('.opt',host).forEach(x=>{ x.disabled=true; if(+x.dataset.o===w.id) x.classList.add('right'); });
    if(!ok) b.classList.add('wrong');
    if(v!=='listen') speak(w.h);
    ctx.finish({ok,title:ok?'Richtig!':'Das war:',html:`<span class="hz">${hanziHtml(w.h,py)}</span> &nbsp;${esc(py)} &nbsp;=&nbsp; ${esc(gloss(w))}`});
  }));
};

/* --- Kacheln (Satz bauen / Hören und schreiben) --- */
function tileBuilder(host,it,ctx,mode){
  const s=SBYID.get(it.sid); const trans=mode==='trans';
  /* Chinesisch: Satzzeichen im Satz (Komma, Aufzählungskomma) sind eigene Kacheln, nach chinesischer Regel gesetzt. Das Schlusszeichen entfällt. */
  const target=trans?germanTokens(s.de).map(h=>({h,p:'',w:null})):s.t.filter((t,i)=>!t.punc||i<s.t.length-1);
  const bank=shuffle([...target.map((t,i)=>({h:t.h,p:t.p,w:t.w,punc:!!t.punc})),...it.dis.map(t=>({h:t.h,p:t.p||'',w:t.w}))]).map((t,i)=>({...t,k:i}));
  const ans=[];
  const tok=(t,cls='',attr='')=>trans
    ? `<button class="tok de ${cls}" ${attr}><span class="th">${esc(t.h)}</span></button>`
    : t.punc ? `<button class="tok pun ${cls}" ${attr}><span class="tp">&nbsp;</span><span class="th">${esc(t.h)}</span></button>`
    : `<button class="tok ${cls}" ${attr}><span class="tp">${pinyinHtml(t.p)}</span><span class="th">${esc(t.h)}</span></button>`;
  let head;
  if(trans) head=`${MODE_TAG('Übersetzen')}<div class="prompt">Was heißt das auf Deutsch?</div>${rubyHtml(s)}<div class="row" style="justify-content:center;gap:12px;margin:6px 0 24px"><button class="ibtn sm fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>`;
  else if(mode==='build') head=`${MODE_TAG('Satz bauen')}<div class="prompt">Übersetze ins Chinesische</div><div class="meaning" style="font-size:clamp(22px,5.6vw,30px);margin:0 0 22px">${esc(s.de)}</div>`;
  else head=`${MODE_TAG('Hören und schreiben')}<div class="prompt">Schreibe, was du hörst</div><div class="row" style="justify-content:center;gap:12px;margin:0 0 14px"><button class="ibtn xl fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>${listenSent(s)}`;
  host.innerHTML=head+`<div class="answer" id="ans"></div><div class="bank" id="bank"></div>`;
  host.classList.toggle('pinyin-off',!state.settings.pinyin);
  bindAudio(host,sentenceText(s),sentParts(s));
  if(mode==='dictate'||trans) autoSpeak(sentenceText(s));
  const ansEl=$('#ans',host), bankEl=$('#bank',host);
  let locked=false;
  function draw(){
    ansEl.innerHTML=ans.map((k,i)=>tok(bank[k],'',`data-a="${i}"`)).join('');
    bankEl.innerHTML=bank.map(t=>ans.includes(t.k)?tok(t,'ghost','disabled'):tok(t,'',`data-b="${t.k}"`)).join('');
    ctx.setDisabled(1,!ans.length);
  }
  host.addEventListener('click',e=>{
    if(locked) return;
    const b=e.target.closest('[data-b]'), a=e.target.closest('[data-a]');
    if(b){ const k=+b.dataset.b; ans.push(k); if(!trans&&!bank[k].punc) speak(bank[k].h); draw(); }
    else if(a){ ans.splice(+a.dataset.a,1); draw(); }
  });
  const solution=()=>trans?`<div style="font-weight:800;font-size:17px">${esc(s.de)}</div>`:`${rubyHtml(s,{sm:true})}<div style="font-weight:700">${esc(s.de)}</div>`;
  function check(){
    locked=true;
    const got=ans.map(k=>bank[k].h), want=target.map(t=>t.h);
    const same=(a,b)=>trans?a.toLowerCase()===b.toLowerCase():a===b;
    const ok=got.length===want.length && got.every((h,i)=>same(h,want[i]));
    $$('#ans .tok',host).forEach((el,i)=>el.classList.add(want[i]!==undefined&&same(got[i],want[i])?'good':'bad'));
    if(ok){ speak(sentenceText(s)); ctx.finish({ok:true,title:'Richtig!',html:solution()}); }
    else ctx.finish({ok:false,title:'Die richtige Lösung:',html:solution()});
  }
  function giveUp(){ locked=true; ctx.finish({ok:false,title:'Die richtige Lösung:',html:solution()}); }
  ctx.footer([{label:'Weiß nicht',cls:'quiet',onClick:giveUp},{label:'Prüfen',cls:'primary grow',disabled:true,onClick:check}]);
  draw();
}
EX.build=(host,it,ctx)=>tileBuilder(host,it,ctx,'build');
EX.dictate=(host,it,ctx)=>tileBuilder(host,it,ctx,'dictate');
EX.trans=(host,it,ctx)=>tileBuilder(host,it,ctx,'trans');

/* --- Nachsprechen --- */
EX.speak=(host,it,ctx)=>{
  const s=SBYID.get(it.sid), text=sentenceText(s);
  const useAz=azActive(), supported=useAz||speechSupported();
  host.innerHTML=`${MODE_TAG('Nachsprechen')}<div class="prompt">Sprich den Satz nach</div>
    <div id="sent">${rubyHtml(s)}</div>
    <div class="center" style="font-weight:700;margin:0 0 16px;color:var(--muted)" id="de">${esc(s.de)}</div>
    ${audioRow()}
    <div id="micarea"></div><div id="result"></div>`;
  bindAudio(host,text,sentParts(s));
  const area=$('#micarea',host), resEl=$('#result',host);
  let busy=false, finished=false, myUrl=null, player=null;
  const skipBtn={label:'Ohne Bewertung weiter',cls:'quiet',onClick:()=>ctx.complete(null)};
  function idle(note){
    resEl.innerHTML='';
    if(!supported){
      area.innerHTML=`<div class="micwrap"><div class="infobox center">Spracherkennung ist hier nicht verfügbar. Höre dir den Satz an, sprich ihn laut nach und bewerte dich selbst.</div></div>`;
      ctx.footer([{label:'Nochmal üben',cls:'',onClick:()=>speak(text)},{label:'Hat geklappt',cls:'good grow',onClick:()=>ctx.complete(true)}]);
      return;
    }
    area.innerHTML=`<div class="micwrap"><button class="mic" id="mic" aria-label="Aufnahme starten">${ICON.mic}</button><div class="micnote" id="mnote">${note||'Tippe auf das Mikrofon und sprich den Satz'}</div></div>`;
    $('#mic',host).addEventListener('click',listen);
    ctx.footer([skipBtn]);
  }
  async function listen(){
    if(busy){ if(useAz) azCancel(); else stopListening(); return; }
    busy=true; stopSpeak();
    const mic=$('#mic',host), note=$('#mnote',host);
    mic.classList.add('live');
    if(useAz){
      note.textContent='Ich höre zu … sprich den ganzen Satz, Ende wird erkannt';
      const refText=[...text].filter(isHan).join('');
      const r=await azAssess(s,refText); busy=false; if(finished) return;
      if(r.error){ idle(azErrorText(r.error,r.detail)||undefined); return; }
      evaluate(null,r.res,r.audio); return;
    }
    note.textContent='Ich höre zu … tippe nochmal, wenn du fertig bist';
    const r=await recognizeOnce(); busy=false; if(finished) return;
    if(r.error){ idle(speechErrorText(r.error)||undefined); return; }
    evaluate(r.alts);
  }
  function evaluate(alts,pre,audioBlob){
    const res=pre||scoreSpeech(s,alts); const sc=res.score;
    if(myUrl){ try{ URL.revokeObjectURL(myUrl); }catch(_){} myUrl=null; }
    if(audioBlob){ try{ myUrl=URL.createObjectURL(audioBlob); }catch(_){ myUrl=null; } }
    const ok=sc>=70, col=sc>=80?'var(--good)':sc>=50?'var(--warn)':'var(--bad)';
    area.innerHTML='';
    $('#sent',host).innerHTML=rubyHtml(s,{marks:res.got});
    resEl.innerHTML=`<div class="scorebox"><div class="ring" style="--v:${sc};--c:${col}"><b>${sc}</b></div><div><div style="font-size:20px;font-weight:900">${sc>=90?'Sehr gut!':sc>=70?'Gut':sc>=50?'Fast':'Versuche es nochmal'}</div><div class="heard">Verstanden: <span class="hz">${esc(res.heard||'–')}</span></div></div></div>
      ${myUrl?`<div class="row" style="justify-content:center;margin:16px 0 4px"><button class="slowbtn" data-play>${ICON.play}Meine Aufnahme anhören</button><button class="slowbtn" data-model>${ICON.speaker}Vorbild</button></div>`:''}
      ${res.az?`<div class="azsub"><span>Genauigkeit <b>${res.az.accuracy}</b></span><span>Flüssigkeit <b>${res.az.fluency}</b></span><span>Vollständigkeit <b>${res.az.completeness}</b></span></div>`:''}
      <div class="legend"><span><i style="background:var(--good)"></i>richtig</span><span><i style="background:var(--warn)"></i>${res.az?'wackelig':'Ton oder ähnlich'}</span><span><i style="background:var(--bad)"></i>${res.az?'falsch oder fehlt':'nicht erkannt'}</span></div>`;
    ctx.footer([{label:'Nochmal sprechen',cls:'',onClick:()=>{ $('#sent',host).innerHTML=rubyHtml(s); idle(); }},{label:'Weiter',cls:(ok?'good':'primary')+' grow',onClick:()=>{
      finished=true;
      // Wortweise Statistik
      const bad=new Set(); res.chars.forEach(c=>{ if(c.s<0.9) bad.add(c.ti); });
      s.t.forEach((t,ti)=>{ if(!t.punc) noteStat(t.w,!bad.has(ti),'sprechen'); });
      it._rec=true; if(!it.retry){ SESS.cntFirst++; if(ok) SESS.okFirst++; }
      SESS.i++; showItem();
    }}]);
  }
  resEl.addEventListener('click',e=>{
    if(e.target.closest('[data-model]')){ if(player){ player.pause(); } speak(text,{parts:sentParts(s)}); return; }
    if(e.target.closest('[data-play]')&&myUrl){ stopSpeak(); if(player){ player.pause(); } player=new Audio(myUrl); player.play().catch(()=>{ const n=$('.scorebox',resEl); if(n) n.insertAdjacentHTML('afterend','<p class="muted small center" style="font-weight:700">Die Aufnahme lässt sich auf diesem Gerät nicht abspielen.</p>'); }); }
  });
  autoSpeak(text);
  idle();
  return ()=>{ finished=true; abortListening(); if(player){ try{ player.pause(); }catch(_){} } if(myUrl){ try{ URL.revokeObjectURL(myUrl); }catch(_){} } };
};

/* --- Zeichen zeichnen --- */
EX.draw=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), audioOnly=it.variant==='audio';
  host.innerHTML=`<div class="dlay"><div class="dhead">${MODE_TAG(audioOnly?'Hören und zeichnen':'Zeichen zeichnen')}
    ${audioOnly?`<div class="prompt">Höre zu und zeichne das Wort</div>`:''}<div class="center" style="margin-top:4px"><span class="py">${pinyinHtml(py)}</span></div>
    ${state.settings.showDe!==false?`<div class="meaning" style="margin:8px 0 12px">${esc(gloss(w))}</div>`:''}
    ${audioRow()}</div><div class="dmain"><div id="q" style="margin-top:14px"></div></div></div>`;
  bindAudio(host,w.h);
  autoSpeak(w.h);
  let quiz=null, dead=false;
  writeQuiz($('#q',host),w,{onFinish:({mistakes,gaveUp,chars,score})=>{
    const ok=score!=null?(!gaveUp&&score>=5):(!gaveUp && mistakes<=chars*2);
    ctx.finish({ok,title:score!=null?`Score ${score} von 10`:gaveUp?'Das nächste Mal klappt es':mistakes===0?'Fehlerfrei!':ok?'Gut gezeichnet':'Übe es noch einmal',html:`<span class="hz">${hanziHtml(w.h,py)}</span> &nbsp;${esc(py)} &nbsp;=&nbsp; ${esc(gloss(w))}`});
  }}).then(q=>{ if(dead) q.destroy(); else quiz=q; }).catch(()=>{ $('#q',host).innerHTML='<p class="muted small center">Strichdaten konnten nicht geladen werden.</p>'; ctx.footer([{label:'Weiter',cls:'primary grow',onClick:()=>ctx.complete(null)}]); });
  return ()=>{ dead=true; if(quiz) quiz.destroy(); };
};

/* --- Karteikarte frei: erst sprechen, dann zeichnen (Schritt 1 und 2 für ein Wort) --- */
EX.wcard=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w);
  const nHan=[...w.h].filter(isHan).length;
  const canSay=nHan>0, canDraw=nHan>=1&&nHan<=4&&nHan===[...w.h].length;
  const s={t:[{h:w.h,p:w.p,w:w.id}]};
  const useAz=azActive(), supported=useAz||speechSupported();
  let busy=false, dead=false, quiz=null, speakOk=null, drawOk=null, myUrl=null, player=null;
  host.innerHTML=`<div class="dlay"><div class="dhead">${MODE_TAG('Sprechen und zeichnen')}
    <div class="subprompt" id="wc-step"></div>
    <div class="meaning" style="margin:12px 0 6px;font-size:28px">${esc(gloss(w))}</div>
    <div id="wc-show" class="center" style="min-height:40px"></div></div>
    <div class="dmain"><div id="wc-body"></div></div></div>`;
  const step=$('#wc-step',host), show=$('#wc-show',host), body=$('#wc-body',host);
  /* Das Zeichen bleibt verborgen, bis es gezeichnet ist; nur das Pinyin hilft */
  const reveal=()=>{ show.innerHTML=`<div class="center" style="margin:6px 0"><span class="py" style="font-size:24px">${pinyinHtml(py)}</span></div>`; };
  const killQuiz=()=>{ if(quiz){ try{ quiz.destroy(); }catch(_){} quiz=null; } };
  function finishCard(){
    killQuiz();
    const fails=[]; if(speakOk===false) fails.push('sprechen'); if(drawOk===false) fails.push('schreiben');
    const counted=speakOk!==null||drawOk!==null;
    if(counted){ if(fails.length) fails.forEach(k=>noteStat(w.id,false,k)); else noteStat(w.id,true); }
    if(it._rec) return; it._rec=true;
    if(counted){ SESS.cntFirst++; if(!fails.length) SESS.okFirst++; else SESS.wrong.add(w.id); }
    const ok=!fails.length;
    const parts=[]; if(speakOk!==null) parts.push('Sprechen '+(speakOk?'gut':'üben')); if(drawOk!==null) parts.push('Zeichnen '+(drawOk?'gut':'üben'));
    ctx.footerRaw(`<div class="fb"><b>${counted?(ok?'Beides geschafft!':'Noch nicht ganz'):'Übersprungen'}</b><div><span class="hz">${hanziHtml(w.h,py)}</span> &nbsp;${esc(py)}${parts.length?' &nbsp;·&nbsp; '+parts.join(', '):''}</div></div><button class="btn ${ok?'good':'bad'}" data-fb="0">Weiter</button>`,
      e=>{ if(e.target.closest('[data-fb]')) ctx.next(); }, counted?(ok?'ok':'no'):'');
  }
  function drawPhase(){
    step.textContent=canSay?'Schritt 2 von 2: Zeichne das Wort':'Zeichne das Wort';
    reveal(); body.innerHTML=`<div id="wq" style="margin-top:12px"></div>`;
    ctx.footer([{label:'Überspringen',cls:'quiet grow',onClick:()=>{ drawOk=null; finishCard(); }}]);
    const sub=$('#wq',body);
    writeQuiz(sub,w,{outline:false,onFinish:({mistakes,gaveUp,chars})=>{ drawOk=!gaveUp&&mistakes<=chars*2; finishCard(); }})
      .then(q=>{ if(dead) q.destroy(); else quiz=q; })
      .catch(()=>{ sub.innerHTML='<p class="muted small center">Strichdaten konnten nicht geladen werden.</p>'; ctx.footer([{label:'Weiter',cls:'primary grow',onClick:finishCard}]); });
  }
  function afterSay(){ if(canDraw) drawPhase(); else finishCard(); }
  function sayPhase(note){
    step.textContent=canDraw?'Schritt 1 von 2: Sag das Wort auf Chinesisch':'Sag das Wort auf Chinesisch';
    show.innerHTML=`<button class="slowbtn" data-hint>${ICON.speaker}Hinweis: Wort hören</button> <button class="slowbtn" data-hint="s">${ICON.slow}Langsam</button>`;
    if(!supported){
      body.innerHTML=`<div class="micwrap"><div class="infobox center">Spracherkennung ist hier nicht verfügbar. Sprich das Wort laut und bewerte dich selbst.</div></div>`;
      ctx.footer([{label:'Nicht gewusst',cls:'',onClick:()=>{ speakOk=false; reveal(); speak(w.h); afterSayBtn(); }},{label:'Gewusst',cls:'good grow',onClick:()=>{ speakOk=true; afterSay(); }}]);
      return;
    }
    body.innerHTML=`<div class="micwrap"><button class="mic" id="mic" aria-label="Aufnahme starten">${ICON.mic}</button><div class="micnote" id="mnote">${note||'Tippe auf das Mikrofon und sag das Wort'}</div></div>`;
    $('#mic',body).addEventListener('click',listen);
    ctx.footer([{label:canDraw?'Sprechen überspringen':'Überspringen',cls:'quiet grow',onClick:()=>{ speakOk=null; afterSay(); }}]);
  }
  function afterSayBtn(){ ctx.footer([{label:canDraw?'Weiter zum Zeichnen':'Weiter',cls:'primary grow big',onClick:afterSay}]); }
  async function listen(){
    if(busy){ if(useAz) azCancel(); else stopListening(); return; }
    busy=true; stopSpeak();
    const mic=$('#mic',body), note=$('#mnote',body); mic.classList.add('live');
    note.textContent='Ich höre zu … sprich das Wort, tippe nochmal zum Beenden';
    let res=null, audio=null, err=null;
    if(useAz){
      const r=await azAssess(s,[...w.h].filter(isHan).join('')); if(r.error) err=azErrorText(r.error,r.detail); else{ res=r.res; audio=r.audio; }
    }else{
      const r=await recognizeOnce(); if(r.error) err=speechErrorText(r.error); else res=scoreSpeech(s,r.alts);
    }
    busy=false; if(dead) return;
    if(err!==null&&!res){ sayPhase(err||undefined); return; }
    if(myUrl){ try{ URL.revokeObjectURL(myUrl); }catch(_){} myUrl=null; }
    if(audio){ try{ myUrl=URL.createObjectURL(audio); }catch(_){ myUrl=null; } }
    const sc=res.score; speakOk=sc>=70; reveal();
    const col=sc>=80?'var(--good)':sc>=50?'var(--warn)':'var(--bad)';
    body.innerHTML=`<div class="scorebox"><div class="ring" style="--v:${sc};--c:${col}"><b>${sc}</b></div><div><div style="font-size:20px;font-weight:900">${sc>=90?'Sehr gut!':sc>=70?'Gut':sc>=50?'Fast':'Nochmal versuchen'}</div></div></div>
      <div class="row" style="justify-content:center;margin:14px 0 4px"><button class="slowbtn" data-model>${ICON.speaker}Vorbild</button>${myUrl?`<button class="slowbtn" data-play>${ICON.play}Meine Aufnahme</button>`:''}</div>`;
    ctx.footer([{label:'Nochmal sprechen',cls:'',onClick:()=>{ speakOk=null; show.innerHTML=''; sayPhase(); }},{label:canDraw?'Weiter zum Zeichnen':'Weiter',cls:'primary grow big',onClick:afterSay}]);
  }
  host.addEventListener('click',e=>{
    const hb=e.target.closest('[data-hint]'); if(hb){ speak(w.h,{slow:hb.dataset.hint==='s'}); return; }
    if(e.target.closest('[data-model]')){ if(player) player.pause(); speak(w.h); return; }
    if(e.target.closest('[data-play]')&&myUrl){ stopSpeak(); if(player) player.pause(); player=new Audio(myUrl); player.play().catch(()=>{}); }
  });
  if(canSay) sayPhase(); else drawPhase();
  return ()=>{ dead=true; killQuiz(); abortListening(); if(player){ try{ player.pause(); }catch(_){} } if(myUrl){ try{ URL.revokeObjectURL(myUrl); }catch(_){} } };
};

/* --- Töne-Training: Silbe hören, Ton bestimmen --- */
const TONE_SVG={
  1:'<path d="M6 10H34"/>', 2:'<path d="M6 30L34 10"/>', 3:'<path d="M6 12L16 30L34 8"/>', 4:'<path d="M6 8L34 32"/>'};
const TONE_NAME={1:'1. Ton: hoch, gleichbleibend',2:'2. Ton: steigend',3:'3. Ton: fällt, dann steigt',4:'4. Ton: fallend'};
EX.tones=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), tone=toneOf(py), base=baseSyl(py);
  host.innerHTML=`${MODE_TAG('Töne')}<div class="prompt">Welchen Ton hörst du?</div>
    <div class="row" style="justify-content:center;gap:14px;margin:6px 0 14px"><button class="ibtn xl fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>
    ${state.settings.showText?`<div class="listentext"><div class="hz">${esc(w.h)}</div><div class="py">${esc(base)}</div></div>`:`<div class="listentext"><div class="py" style="font-size:26px">${esc(base)}</div></div>`}
    <div class="opts tonegrid">${[1,2,3,4].map(t=>`<button class="opt tone" data-t="${t}"><svg viewBox="0 0 40 40" width="44" height="44" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${TONE_SVG[t]}</svg><span class="py">${TONE_NAME[t]}</span></button>`).join('')}</div>`;
  bindAudio(host,w.h);
  autoSpeak(w.h);
  let locked=false;
  $$('.opt',host).forEach(b=>b.addEventListener('click',()=>{
    if(locked) return; locked=true;
    const ok=+b.dataset.t===tone;
    $$('.opt',host).forEach(x=>{ x.disabled=true; if(+x.dataset.t===tone) x.classList.add('right'); });
    if(!ok) b.classList.add('wrong');
    speak(w.h);
    ctx.finish({ok,title:ok?'Richtig!':`Das war der ${tone}. Ton`,html:`<span class="hz">${hanziHtml(w.h,py)}</span> &nbsp;${esc(py)} &nbsp;=&nbsp; ${esc(gloss(w))}`});
  }));
};

/* --- Lückentext: fehlendes Wort wählen --- */
EX.cloze=(host,it,ctx)=>{
  const s=SBYID.get(it.sid), tok=s.t[it.idx];
  host.innerHTML=`${MODE_TAG('Lückentext')}<div class="prompt">Welches Wort fehlt?</div>
    <div id="csent">${rubyHtml(s,{blank:it.idx})}</div>
    <div class="center cde">${esc(s.de)}</div>
    <div class="opts">${it.opts.map((o,i)=>`<button class="opt" data-i="${i}"><span class="hz">${esc(o.h)}</span><span class="py">${pinyinHtml(o.p)}</span></button>`).join('')}</div>`;
  let locked=false;
  $$('.opt',host).forEach(b=>b.addEventListener('click',()=>{
    if(locked) return; locked=true;
    const o=it.opts[+b.dataset.i], ok=o.h===tok.h;
    $$('.opt',host).forEach(x=>{ x.disabled=true; if(it.opts[+x.dataset.i].h===tok.h) x.classList.add('right'); });
    if(!ok) b.classList.add('wrong');
    $('#csent',host).innerHTML=rubyHtml(s);
    speak(sentenceText(s));
    ctx.finish({ok,title:ok?'Richtig!':'Das richtige Wort:',html:`<span class="hz">${esc(tok.h)}</span> &nbsp;${esc(tok.p)}`});
  }));
};

/* --- Paare zuordnen --- */
EX.pairs=(host,it,ctx)=>{
  const ws=it.wids.map(id=>BYID.get(id));
  const left=shuffle(ws), right=shuffle(ws);
  host.innerHTML=`${MODE_TAG('Paare')}<div class="prompt">Finde die Paare</div>
    <div class="pairs" style="--n:${ws.length}"><div class="pcol" id="pl">${left.map(w=>`<button class="pbtn" data-l="${w.id}"><span class="hz">${esc(w.h)}</span><span class="py">${pinyinHtml(wordPy(w))}</span></button>`).join('')}</div>
    <div class="pcol" id="pr">${right.map(w=>`<button class="pbtn de" data-r="${w.id}">${esc(gloss(w))}</button>`).join('')}</div></div>`;
  let selL=null, mist=0, left_n=ws.length, busy=false;
  const done=()=>{ ctx.record(null); ctx.footerRaw(`<div class="fb"><b>${mist===0?'Alle Paare ohne Fehler':'Alle Paare gefunden'}</b><div>${mist} Fehlversuch${mist===1?'':'e'}</div></div><button class="btn good" data-fb="0">Weiter</button>`,e=>{ if(e.target.closest('[data-fb]')) ctx.next(); },'ok'); };
  host.addEventListener('click',async e=>{
    if(busy) return;
    const l=e.target.closest('[data-l]'), r=e.target.closest('[data-r]');
    if(l&&!l.disabled){ $$('[data-l]',host).forEach(x=>x.classList.remove('sel')); l.classList.add('sel'); selL=l; speak(BYID.get(+l.dataset.l).h); return; }
    if(r&&!r.disabled&&selL){
      busy=true;
      if(selL.dataset.l===r.dataset.r){ [selL,r].forEach(x=>{ x.classList.remove('sel'); x.classList.add('right'); x.disabled=true; }); left_n--; selL=null; busy=false; if(!left_n) done(); }
      else{ mist++; r.classList.add('wrong'); selL.classList.add('wrong'); await sleep(550); r.classList.remove('wrong'); selL.classList.remove('wrong','sel'); selL=null; busy=false; }
    }
  });
};

/* --- Satz hören, Bedeutung wählen --- */
EX.listensent=(host,it,ctx)=>{
  const s=SBYID.get(it.sid);
  host.innerHTML=`${MODE_TAG('Hören und verstehen')}<div class="prompt">Was bedeutet der Satz?</div>
    <div class="row" style="justify-content:center;gap:14px;margin:6px 0 14px"><button class="ibtn xl fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>
    ${listenSent(s)}
    <div class="opts long">${it.opts.map((o,i)=>`<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
  bindAudio(host,sentenceText(s),sentParts(s));
  autoSpeak(sentenceText(s));
  let locked=false;
  $$('.opt',host).forEach(b=>b.addEventListener('click',()=>{
    if(locked) return; locked=true;
    const ok=it.opts[+b.dataset.i]===s.de;
    $$('.opt',host).forEach(x=>{ x.disabled=true; if(it.opts[+x.dataset.i]===s.de) x.classList.add('right'); });
    if(!ok) b.classList.add('wrong');
    ctx.finish({ok,title:ok?'Richtig!':'Das heißt:',html:`${rubyHtml(s,{sm:true})}<div style="font-weight:700">${esc(s.de)}</div>`});
  }));
};

/* --- Schreibtraining: ein Wort mehrfach hintereinander schreiben --- */
EX.wdrill=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), N=it.reps;
  let r=0, phase='', quiz=null, dead=false, mist=0, replay=null;
  host.innerHTML=`<div class="dlay"><div class="dhead">${MODE_TAG('Schreibtraining')}
    <div class="center"><span class="py">${pinyinHtml(py)}</span></div>
    ${state.settings.showDe!==false?`<div class="meaning" style="margin:6px 0 16px">${esc(gloss(w))}</div>`:''}
    ${audioRow()}
    <div class="dprog" id="dprog"></div></div>
    <div class="dmain"><div id="q" style="margin-top:6px"></div></div></div>`;
  bindAudio(host,w.h);
  const q=$('#q',host), prog=$('#dprog',host);
  const setBar=()=>{ const b=$('.sbar .bar>i'); if(b) b.style.width=Math.round((SESS.i+(phase==='demo'?0:r/N))/SESS.total*100)+'%'; };
  const dots=(cur)=>{ prog.innerHTML=`<div class="dtxt">${cur}</div><div class="ddots">${Array.from({length:N},(_,i)=>`<i class="${i<r?'done':i===r&&phase==='practice'?'on':''}"></i>`).join('')}</div>`; };
  function killQuiz(){ if(quiz){ try{ quiz.destroy(); }catch(_){} quiz=null; } }
  function showDemo(){
    phase='demo'; killQuiz(); setBar();
    prog.innerHTML=`<div class="dtxt">Erst anschauen, dann üben</div>`;
    q.innerHTML=`<div id="dt" class="tiles big"></div><p class="muted small center" style="margin-top:14px;font-weight:700">Tippe auf ein Zeichen, um die Strichfolge nochmal zu sehen</p>`;
    mountTiles($('#dt',q),w,{size:Math.max(110,Math.min(230,Math.floor((Math.min(innerWidth,820)-56-([...w.h].length-1)*16)/[...w.h].length)-4))}).then(m=>{ replay=m; }).catch(()=>{ $('#dt',q).innerHTML='<p class="muted small">Strichdaten konnten nicht geladen werden.</p>'; });
    ctx.footer([{label:'Nochmal zeigen',onClick:()=>{ if(replay) replay.playAll(); }},{label:'Jetzt üben',cls:'primary grow',onClick:startRep}]);
  }
  function startRep(){
    phase='practice'; killQuiz(); setBar();
    const outline = it.help==='on' ? true : it.help==='off' ? false : r<Math.ceil(N*0.4);
    dots(`Wiederholung ${r+1} von ${N}${it.help==='fade'?(outline?' · mit Vorlage':' · ohne Vorlage'):''}`);
    q.innerHTML=''; const sub=document.createElement('div'); q.appendChild(sub);
    ctx.footer([{label:'Wort überspringen',cls:'quiet grow',onClick:()=>ctx.complete(null)}],'slim');
    writeQuiz(sub,w,{outline,free:it.free,fit:true,onFinish:({mistakes})=>{
      mist+=mistakes; r++; setBar(); dots(r>=N?'Geschafft':`Wiederholung ${r} von ${N} erledigt`);
      ctx.footer([r>=N?{label:'Fertig',cls:'primary grow big',onClick:done}:{label:`Wiederholung ${r+1} von ${N}`,cls:'primary grow big',onClick:startRep}],'slim');
    }}).then(z=>{ if(dead) z.destroy(); else quiz=z; }).catch(()=>{ q.innerHTML='<p class="muted small center">Strichdaten konnten nicht geladen werden.</p>'; ctx.footer([{label:'Weiter',cls:'primary grow',onClick:()=>ctx.complete(null)}]); });
  }
  function done(){
    killQuiz(); ctx.record(null);
    ctx.footerRaw(`<div class="fb"><b>${N} Wiederholungen geschafft</b><div><span class="hz">${hanziHtml(w.h,py)}</span> &nbsp;${mist===0?'ohne Fehlstrich':mist+' Fehlstrich'+(mist===1?'':'e')}</div></div><button class="btn good" data-fb="0">Weiter</button>`,e=>{ if(e.target.closest('[data-fb]')) ctx.next(); },'ok');
  }
  autoSpeak(w.h);
  if(it.demo) showDemo(); else startRep();
  return ()=>{ dead=true; killQuiz(); };
};

/* --- Wiederholung (Karteikarte) --- */
EX.review=(host,it,ctx)=>{
  const w=BYID.get(it.wid), py=wordPy(w), mode=it.mode, c=state.cards[w.id]||newCard();
  const front = mode==='read' ? `${MODE_TAG('Lesen')}<div class="subprompt">Was heißt das, und wie spricht man es aus?</div><div class="hz bighz" id="fronthz" style="margin:20px 0 10px">${esc(w.h)}</div>`
    : mode==='listen' ? `${MODE_TAG('Hören')}<div class="subprompt">Was bedeutet das Wort?</div><div class="row" style="justify-content:center;gap:14px;margin:26px 0 14px"><button class="ibtn xl fill" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>${listenWord(w)}`
    : `<div class="dlay"><div class="dhead">${MODE_TAG('Schreiben')}<div class="center" style="margin-top:6px"><span class="py">${pinyinHtml(py)}</span></div>${state.settings.showDe!==false?`<div class="meaning" style="margin:8px 0 10px">${esc(gloss(w))}</div>`:''}${audioRow()}</div><div class="dmain"><div id="q" style="margin-top:12px"></div></div></div>`;
  host.innerHTML=front+`<div id="back"></div>`;
  bindAudio(host,w.h);
  const rate=(q)=>{ applyRating(w.id,q); save(); ctx.complete(q>0); };
  const ratingFooter=(sug)=>{
    const labels=['Nochmal','Schwer','Gut','Leicht'];
    ctx.footerRaw(`<div class="rate" style="margin:0;width:100%">${labels.map((t,q)=>`<button class="r${q} ${sug===q?'sug':''}" data-rate="${q}">${t}<small>${dayLabel(sched(c,q).days)}</small></button>`).join('')}</div>`,
      e=>{ const b=e.target.closest('[data-rate]'); if(b) rate(+b.dataset.rate); });
  };
  function reveal(sug){
    const fh=$('#fronthz',host); if(fh) fh.remove(); const lt=$('.listentext',host); if(lt) lt.remove();
    $('#back',host).innerHTML=`<div class="hz bighz" style="margin:${mode==='write'?'0':'6px'} 0 2px;${mode==='write'?'display:none':''}">${hanziHtml(w.h,py)}</div>
      ${mode==='write'?'':`<div class="center"><span class="py">${pinyinHtml(py)}</span></div><div class="meaning" style="margin:8px 0 6px">${esc(gloss(w))}</div><div class="row" style="justify-content:center;margin-top:10px"><button class="ibtn sm" data-au="n" aria-label="Abspielen">${ICON.speaker}</button><button class="ibtn sm" data-au="s" aria-label="Langsam">${ICON.slow}</button></div>`}`;
    bindAudio($('#back',host),w.h);
    ratingFooter(sug);
  }
  if(mode==='write'){
    autoSpeak(w.h);
    let quiz=null, dead=false;
    ctx.footer([{label:'Überspringen',cls:'quiet grow',onClick:()=>ctx.complete(null)}]);
    writeQuiz($('#q',host),w,{onFinish:({mistakes,gaveUp,chars})=>{ reveal(gaveUp?0:mistakes===0?2:mistakes<=chars?1:0); }}).then(q=>{ if(dead) q.destroy(); else quiz=q; }).catch(()=>{ $('#q',host).innerHTML='<p class="muted small center">Strichdaten konnten nicht geladen werden.</p>'; reveal(null); });
    return ()=>{ dead=true; if(quiz) quiz.destroy(); };
  }
  if(mode==='listen') autoSpeak(w.h);
  ctx.footer([{label:'Antwort zeigen',cls:'primary grow big',onClick:()=>{ reveal(null); speak(w.h); }}]);
};

/* ============ Aufgaben erzeugen ============ */
function scopeInfo(scope){
  const ls=(scope&&scope.length?scope.map(id=>LBYID.get(id)):LESSONS).filter(Boolean);
  const wids=[...new Set(ls.flatMap(l=>l.words))], sids=[...new Set(ls.flatMap(l=>l.sentences))];
  return {lessons:ls,words:wids.map(id=>BYID.get(id)),sents:sids.map(id=>SBYID.get(id))};
}
function sentWeight(s){ const t=s.t.filter(x=>!x.punc); return t.reduce((a,x)=>a+weightOf(x.w),0)/Math.max(1,t.length); }
function distractorsFor(s,info,n){
  const have=new Set(s.t.filter(t=>!t.punc).map(t=>t.h));
  let pool=[]; const seen=new Set();
  for(const x of info.sents) for(const t of x.t){ if(t.punc||have.has(t.h)||seen.has(t.h)) continue; seen.add(t.h); pool.push({h:t.h,p:t.p,w:t.w}); }
  if(pool.length<n+2){ for(const w of WORDS){ if(w.l!==1||have.has(w.h)||seen.has(w.h)) continue; seen.add(w.h); pool.push({h:w.h,p:wordPy(w),w:w.id}); } }
  return sample(pool,n);
}
/* Deutsche Kacheln: Wörter des Satzes ohne Satzzeichen */
function germanTokens(de){ return String(de).replace(/[.,!?;:„“"…()]/g,' ').split(/\s+/).filter(t=>/[\p{L}\p{N}]/u.test(t)); }
function germanDistractors(s,info,n){
  const have=new Set(germanTokens(s.de).map(x=>x.toLowerCase()));
  const pool=[]; const seen=new Set();
  for(const x of info.sents){ if(x.id===s.id) continue; for(const t of germanTokens(x.de)){ const k=t.toLowerCase(); if(have.has(k)||seen.has(k)) continue; seen.add(k); pool.push({h:t}); } }
  if(pool.length<n+2){ for(const x of SENTS){ if(x.id===s.id) continue; for(const t of germanTokens(x.de)){ const k=t.toLowerCase(); if(have.has(k)||seen.has(k)) continue; seen.add(k); pool.push({h:t}); } } }
  return sample(pool,n);
}
function chooseItem(w,info,variant){
  const g=gloss(w); const same=info.words.filter(x=>x.id!==w.id&&gloss(x)!==g);
  const pool = same.length>=3 ? same : WORDS.filter(x=>x.l===1&&x.id!==w.id&&gloss(x)!==g);
  const dis=sample(pool,3).map(x=>x.id);
  return {type:'choose',wid:w.id,variant,opts:shuffle([w.id,...dis])};
}
function makeItems(type,scope,n){
  const info=scopeInfo(scope), out=[];
  const variants=ttsUsable()?['listen','read','rev']:['read','rev'];
  const multi=info.sents.filter(s=>s.t.filter(t=>!t.punc).length>=2);
  const sentPool = multi.length>=Math.min(n,6) ? multi : info.sents;
  const drawable=info.words.filter(w=>{ const c=[...w.h].filter(isHan).length; return c>=1&&c<=3; });
  if(type==='mixed'){
    const plan=['choose','build','tones','cloze','speak','trans','draw','listensent','choose','pairs','dictate','speak','cloze','draw','build','trans','tones'];
    const k=Math.max(4,n); const types=[]; for(let i=0;i<k;i++) types.push(plan[i%plan.length]);
    for(const t of types){ const part=makeItems(t,scope,1); if(part[0]) out.push(part[0]); }
    return out;
  }
  if(type==='tones'){
    const single=ws=>ws.filter(w=>{ const ch=[...w.h].filter(isHan); return ch.length===1&&[...w.h].length===1&&toneOf(wordPy(w))>0; });
    let c=single(info.words); if(c.length<6) c=single(WORDS.filter(w=>w.l===1));
    for(const w of pickWeighted(c,n,w=>weightOf(w.id))) out.push({type:'tones',wid:w.id});
  }
  else if(type==='cloze'){
    for(const s of pickWeighted(sentPool,n,sentWeight)){
      const cand=s.t.map((t,i)=>({t,i})).filter(x=>!x.t.punc&&BYID.has(x.t.w));
      if(!cand.length) continue; const pick=cand[Math.floor(Math.random()*cand.length)];
      /* Ablenker dürfen kein Zeichen mit dem Satz teilen (sonst steht z. B. 你好 als Option neben dem sichtbaren 你) */
      const have=new Set(s.t.map(t=>t.h)); const chars=new Set([...s.t.map(t=>t.h).join('')]);
      const okW=w=>!have.has(w.h)&&![...w.h].some(c=>chars.has(c));
      const pool=info.words.filter(okW);
      const dis=sample(pool.length>=3?pool:WORDS.filter(w=>w.l===1&&okW(w)),3).map(w=>({h:w.h,p:wordPy(w)}));
      out.push({type:'cloze',sid:s.id,idx:pick.i,opts:shuffle([{h:pick.t.h,p:pick.t.p},...dis])});
    }
  }
  else if(type==='pairs'){
    const rounds=Math.max(2,Math.round(n/3));
    for(let r=0;r<rounds;r++){
      const seen=new Set(), ids=[];
      for(const w of shuffle(info.words)){ const g=gloss(w); if(seen.has(g)) continue; seen.add(g); ids.push(w.id); if(ids.length===5) break; }
      if(ids.length>=3) out.push({type:'pairs',wids:ids});
    }
  }
  else if(type==='listensent'){
    for(const s of pickWeighted(sentPool,n,sentWeight)){
      const other=sample(info.sents.filter(x=>x.id!==s.id&&x.de!==s.de),3).map(x=>x.de);
      const more=other.length<3?sample(SENTS.filter(x=>x.id!==s.id&&x.de!==s.de&&!other.includes(x.de)),3-other.length).map(x=>x.de):[];
      out.push({type:'listensent',sid:s.id,opts:shuffle([s.de,...other,...more])});
    }
  }
  else if(type==='choose') for(const w of pickWeighted(info.words,n,w=>weightOf(w.id))) out.push(chooseItem(w,info,variants[out.length%variants.length]));
  else if(type==='build'||type==='dictate'||type==='speak'||type==='trans'){
    for(const s of pickWeighted(sentPool,n,sentWeight)){
      const nt=s.t.filter(t=>!t.punc).length;
      const it={type,sid:s.id};
      if(type==='trans') it.dis=germanDistractors(s,info,nt<=2?3:2);
      else if(type!=='speak') it.dis=distractorsFor(s,info,nt<=2?3:2);
      out.push(it);
    }
  } else if(type==='draw') for(const w of pickWeighted(drawable,n,w=>weightOf(w.id))) out.push({type:'draw',wid:w.id,variant:Math.random()<0.4?'audio':'pinyin'});
  return out;
}
function learnItems(lesson,count){
  const l=lesson; const fresh=l.words.filter(id=>!state.cards[id]);
  const ids=(fresh.length?fresh:l.words).slice(0,count);
  return ids.map(id=>({type:'intro',wid:id}));
}
function startPractice(type,scope){
  const n=state.settings.perRound;
  const items=makeItems(type,scope,n); if(!items.length) return;
  runSession({title:TYPE_INFO[type].name,items,kind:'practice',regen:()=>makeItems(type,scope,n),onExit:()=>renderView()});
}
/* Schreibtraining: Themen wählen, Wörter der Reihe nach, jedes mehrfach hintereinander */
function drillWords(scope){
  const info=scopeInfo(scope);
  return info.lessons.flatMap(l=>l.words).filter((id,i,a)=>a.indexOf(id)===i).map(id=>BYID.get(id)).filter(w=>{ const c=[...w.h].filter(isHan).length; return w&&c>=1&&c<=3&&c===[...w.h].length; });
}
function startWriteDrill(cfg){
  const words=drillWords(cfg.scope); if(!words.length) return;
  const per=cfg.count>0?Math.min(cfg.count,words.length):words.length;
  let off=0;
  const gen=()=>{ const out=[]; for(let i=0;i<per;i++){ const w=words[(off+i)%words.length]; out.push({type:'wdrill',wid:w.id,reps:cfg.reps,demo:cfg.demo,help:cfg.help,free:cfg.mode==='free'}); } off=(off+per)%words.length; return out; };
  runSession({title:'Schreibtraining',items:gen(),kind:'practice',regen:per<words.length?gen:null,onExit:()=>renderView()});
}
/* Lektionstest: jedes Wort der Lektion einmal, nur Wörter, ohne Wiederholungsrunde */
function startLessonTest(lessonId){
  const l=LBYID.get(lessonId); if(!l) return;
  const info=scopeInfo([lessonId]);
  const variants=ttsUsable()?['read','rev','listen']:['read','rev'];
  const words=shuffle([...info.words]);
  const items=words.map((w,i)=>chooseItem(w,info,variants[i%variants.length]));
  runSession({title:'Test: '+l.title,items,kind:'test',noRetry:true,lessonId,onExit:()=>renderView()});
}
function startLearn(lessonId){
  const l=LBYID.get(lessonId);
  const gen=()=>learnItems(l,6);
  runSession({title:l.title,items:gen(),kind:'learn',regen:()=>{ const fresh=l.words.filter(id=>!state.cards[id]); return fresh.length?learnItems(l,6):null; },onExit:()=>renderView()});
}
/* Freie Karteikarten: Wörter der gewählten Themen, gemischt, erst sprechen dann zeichnen. Ändert den Wiederholungsplan nicht. */
function startFlashcards(scope,count){
  const info=scopeInfo(scope); const pool=info.words.filter(Boolean);
  if(!pool.length) return;
  const per=count>0?Math.min(count,pool.length):pool.length;
  const gen=()=>pickWeighted(pool,per,w=>weightOf(w.id)).map(w=>({type:'wcard',wid:w.id}));
  runSession({title:'Karteikarten frei',items:gen(),kind:'practice',noRetry:true,regen:pool.length>per?gen:null,onExit:()=>renderView()});
}
/* Schwierige Wörter üben: je Wort eine Aufgabe passend zur Schwäche (lesen, hören, schreiben oder sprechen und zeichnen) */
function hardItems(n){
  const ids=hardIds().slice(0,n); if(!ids.length) return [];
  const info=scopeInfo(null);
  return ids.map(id=>{
    const w=BYID.get(id), h=state.hard[id];
    const kinds=Object.entries(h.k||{}); let kind='lesen';
    if(kinds.length){ let r=Math.random()*kinds.reduce((a,b)=>a+b[1],0); for(const [k,v] of kinds){ r-=v; if(r<=0){ kind=k; break; } } }
    if(kind==='hören'&&!ttsUsable()) kind='lesen';
    if(kind==='sprechen') return {type:'wcard',wid:id};
    if(kind==='schreiben'&&[...w.h].every(isHan)&&[...w.h].length<=4) return {type:'review',wid:id,mode:'write'};
    return chooseItem(w,info,kind==='hören'?'listen':(Math.random()<0.5?'read':'rev'));
  });
}
function startHardPractice(){
  const items=hardItems(12); if(!items.length) return;
  runSession({title:'Schwierige Wörter',items,kind:'practice',regen:()=>{ const x=hardItems(12); return x.length?x:null; },onExit:()=>renderView()});
}
function startReview(){
  const ids=dueIds().slice(0,30); if(!ids.length) return;
  const m=state.settings.modes; const modes=[]; if(m.read) modes.push('read'); if(m.write) modes.push('write'); if(m.listen&&ttsUsable()) modes.push('listen'); if(!modes.length) modes.push('read');
  let last=null;
  const items=ids.map(id=>{ let pool=modes.filter(x=>x!==last); if(!pool.length) pool=modes; const mode=pool[Math.floor(Math.random()*pool.length)]; last=mode; return {type:'review',wid:id,mode}; });
  runSession({title:'Wiederholen',items,kind:'review',onExit:()=>renderView()});
}
