"use strict";
/* ============ Navigation ============ */
let view={name:'learn'};
const TABS=[['learn','Lernen',ICON.learn],['practice','Üben',ICON.train],['review','Wiederholen',ICON.cards],['words','Wörter',ICON.list],['settings','Einstellungen',ICON.gear]];
function go(name,params={}){ view={name,...params}; renderView(); window.scrollTo(0,0); }
function renderView(){
  renderTabs();
  const m=$('#main');
  m.innerHTML='';
  ({learn:viewLearn,lesson:viewLesson,practice:viewPractice,review:viewReview,words:viewWords,settings:viewSettings}[view.name]||viewLearn)(m);
}
function renderTabs(){
  const cur = view.name==='lesson' ? 'learn' : view.name;
  const due=dueIds().length;
  $('#tabs').innerHTML=`<div class="logo"><i>汉</i>Hanyu</div>`+TABS.map(([k,t,i])=>`<button data-tab="${k}" aria-current="${cur===k}">${i}<span>${t}${k==='review'&&due?` (${due})`:''}</span></button>`).join('');
}
$('#tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(b) go(b.dataset.tab); });

function lessonStyle(l){ return `--h:${l.hue}`; }
function openSheet(html,onBind){
  const w=$('#sheetwrap'); w.classList.remove('hidden');
  w.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  w.onclick=e=>{ if(e.target===w) closeSheet(); };
  document.body.style.overflow='hidden';
  if(onBind) onBind($('.sheet',w));
}
function closeSheet(){ const w=$('#sheetwrap'); w.classList.add('hidden'); w.innerHTML=''; if(!SESS) document.body.style.overflow=''; }

/* ============ Lernen ============ */
function viewLearn(m){
  const due=dueIds().length;
  // nächste Lektion mit offenen Wörtern
  const next=LESSONS.find(l=>lessonProgress(l).learned<l.words.length) || null;
  m.innerHTML=`<div class="stack fade">
    <div class="hello"><div><h1>Chinesisch lernen</h1><p class="muted" style="font-weight:700;margin-top:2px">Nach dem neuen HSK 3.0, Wörter und Sätze auf Deutsch</p></div></div>
    <div class="levels" role="group" aria-label="HSK-Stufe">${[1,2,3,4,5,6].map(l=>`<button class="chip" data-lv="${l}" aria-pressed="${l===1}" ${l===1?'':'disabled'}>HSK ${l}${l===1?'':' <small>bald</small>'}</button>`).join('')}</div>
    ${towerCard()}
    ${due?`<button class="dueline" data-go="review" style="width:100%;text-align:left"><span>${due} Wörter zur Wiederholung fällig</span><span class="btn small primary">Wiederholen</span></button>`:''}
    ${next?`<div class="nextcard" style="${lessonStyle(next)}"><div class="ic ${next.icon.length>1?'ic2':''}">${next.icon}</div><div class="grow"><span style="opacity:.8;font-size:13px;font-weight:800">${lessonProgress(next).learned?'WEITERMACHEN':'EMPFEHLUNG'}</span><b>${esc(next.title)}</b><span style="opacity:.85;font-size:14px;font-weight:600">${esc(next.sub)}</span></div><button class="btn" data-open="${next.id}">Öffnen</button></div>`:''}
    <div class="sectionhead"><h2>Themen in HSK 1</h2><span class="muted small" style="font-weight:700">${LESSONS.length} Lektionen, 300 Wörter, frei wählbar</span></div>
    <div class="lessons">${LESSONS.map(l=>{ const p=lessonProgress(l); return `<button class="lcard" data-open="${l.id}" style="${lessonStyle(l)}"><div class="ic ${l.icon.length>1?'ic2':''}">${l.icon}</div><div><h3>${esc(l.title)}</h3><div class="sub">${esc(l.sub)}</div></div><div class="meta"><div class="bar thin"><i style="width:${p.learned/p.total*100}%"></i></div><span>${p.learned}/${p.total}</span></div></button>`; }).join('')}</div>
    <p class="muted small center" style="padding:10px 12px;font-weight:600">Wortliste: HSK-3.0-Syllabus (Ausgabe November 2025), 300 Wörter für Stufe 1. Deutsche Bedeutungen und Beispielsätze: eigene Erstellung.</p>
  </div>`;
  setTimeout(towerCheckCelebrate,350);
  m.onclick=e=>{
    const o=e.target.closest('[data-open]'); if(o){ go('lesson',{id:o.dataset.open}); return; }
    if(e.target.closest('[data-go=review]')) go('review');
  };
}

function viewLesson(m){
  const l=LBYID.get(view.id); if(!l) return go('learn');
  const p=lessonProgress(l); const tst=(state.ui.tests||{})[l.id];
  const ex=['choose','pairs','build','trans','cloze','listensent','tones','dictate','speak','draw','wdrill','mixed'];
  m.innerHTML=`<div class="stack fade">
    <div class="pagehead"><button class="btn small" data-back>${ICON.back.replace('<svg','<svg width="18" height="18"')}Zurück</button></div>
    <div class="lhead" style="${lessonStyle(l)}"><div class="ic ${l.icon.length>1?'ic2':''}">${l.icon}</div><div class="grow"><h1>${esc(l.title)}</h1><p class="muted" style="font-weight:700">${esc(l.sub)}</p><div class="bar thin" style="margin-top:10px;max-width:260px"><i style="width:${p.learned/p.total*100}%"></i></div><div class="muted small" style="font-weight:800;margin-top:4px">${p.learned} von ${p.total} Wörtern gelernt</div></div></div>
    <button class="btn primary block big" data-learn>${p.learned===p.total?'Wörter nochmal ansehen':p.learned?'Weitere Wörter lernen':'Wörter lernen'}</button>
    <button class="testcard" data-test><div class="ei">${ICON.cards}</div><div class="grow"><b>Lektionstest</b><span>${l.words.length} Fragen nur zu den Wörtern dieser Lektion${tst?`, letzter Stand ${tst.last}%, beste ${tst.best}%`:''}</span></div><span class="btn small">Starten</span></button>
    <div class="sectionhead"><h2>Üben</h2><span class="muted small" style="font-weight:700">nur diese Lektion</span></div>
    <div class="exgrid">${ex.map(t=>`<button class="excard" data-ex="${t}"><div class="ei">${ICON[TYPE_INFO[t].icon]}</div><div><b>${TYPE_INFO[t].name}</b><span>${TYPE_INFO[t].desc}</span></div></button>`).join('')}</div>
    <div class="sectionhead"><h2>Wörter</h2><span class="muted small" style="font-weight:700">Tippe zum Anhören</span></div>
    <div class="card"><div class="wlist">${l.words.map(id=>{ const w=BYID.get(id), py=wordPy(w), c=state.cards[id]; return `<div class="wrow"><button class="ibtn sm" data-say="${id}" aria-label="Anhören">${ICON.speaker}</button><button class="ibtn sm" data-slowword="${id}" aria-label="Langsam anhören">${ICON.slow}</button><div class="hz" data-word="${id}">${hanziHtml(w.h,py)}</div><div class="mid" data-word="${id}"><div class="py">${pinyinHtml(py)}</div><div class="de">${esc(gloss(w))}</div></div><span class="dot ${c?'on':''}" title="${c?'gelernt':'noch nicht gelernt'}"></span></div>`; }).join('')}</div></div>
    <div class="sectionhead"><h2>Beispielsätze</h2></div>
    <div class="card"><div class="wlist">${l.sentences.map(id=>{ const s=SBYID.get(id); return `<div class="wrow" style="align-items:flex-start"><button class="ibtn sm" data-sayS="${id}" aria-label="Satz anhören">${ICON.speaker}</button><button class="ibtn sm" data-slowsent="${id}" aria-label="Satz langsam anhören">${ICON.slow}</button><div class="mid">${rubyHtml(s,{sm:true}).replace('justify-content:center','')}<div class="de">${esc(s.de)}</div></div></div>`; }).join('')}</div></div>
  </div>`;
  m.onclick=e=>{
    if(e.target.closest('[data-back]')) return go('learn');
    if(e.target.closest('[data-learn]')) return startLearn(l.id);
    if(e.target.closest('[data-test]')) return startLessonTest(l.id);
    const x=e.target.closest('[data-ex]'); if(x) return x.dataset.ex==='wdrill'?writeSetup([l.id]):startPractice(x.dataset.ex,[l.id]);
    const sy=e.target.closest('[data-say]'); if(sy) return void speak(BYID.get(+sy.dataset.say).h);
    const sw=e.target.closest('[data-slowword]'); if(sw) return void speak(BYID.get(+sw.dataset.slowword).h,{slow:true});
    const sws=e.target.closest('[data-slowsent]'); if(sws){ const q=SBYID.get(+sws.dataset.slowsent); return void speak(sentenceText(q),{slow:true,parts:sentParts(q)}); }
    const ss=e.target.closest('[data-sayS]'); if(ss) return void speak(sentenceText(SBYID.get(+ss.dataset.sayS)),{parts:sentParts(SBYID.get(+ss.dataset.sayS))});
    const wd=e.target.closest('[data-word]'); if(wd) return wordSheet(+wd.dataset.word);
  };
}

/* ============ Üben ============ */
function viewPractice(m){
  const types=['choose','pairs','build','trans','cloze','listensent','tones','dictate','speak','draw','wdrill','mixed'];
  const scope=state.ui.scope||[];
  const label=scope.length?(scope.length===1?LBYID.get(scope[0]).title:`${scope.length} Lektionen`):'Alle Lektionen';
  m.innerHTML=`<div class="stack fade">
    <div><h1>Üben</h1><p class="muted" style="font-weight:700;margin-top:2px">Wähle eine Übungsart. Jede lässt sich einzeln trainieren.</p></div>
    <button class="card" data-scope style="display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;width:100%;border-bottom-width:4px"><div><div class="muted small" style="font-weight:800">THEMA</div><b style="font-size:18px">${esc(label)}</b></div><span class="btn small">Ändern</span></button>
    <div class="exgrid">${types.map(t=>`<button class="excard" data-ex="${t}"><div class="ei">${ICON[TYPE_INFO[t].icon]}</div><div><b>${TYPE_INFO[t].name}</b><span>${TYPE_INFO[t].desc}</span></div></button>`).join('')}</div>
    ${speechSupported()?'':`<div class="warnbox">Nachsprechen: Auf diesem Gerät gibt es keine Spracherkennung. Die Übung funktioniert mit Selbstbewertung.</div>`}
    ${ttsUsable()?'':`<div class="warnbox">Auf diesem Gerät ist keine chinesische Stimme installiert. Installiere eine unter Einstellungen, Bedienungshilfen, Gesprochene Inhalte, Stimmen.</div>`}
  </div>`;
  m.onclick=e=>{
    const x=e.target.closest('[data-ex]'); if(x) return x.dataset.ex==='wdrill'?writeSetup(state.ui.scope):startPractice(x.dataset.ex,state.ui.scope);
    if(e.target.closest('[data-scope]')) scopeSheet();
  };
}
function scopeSheet(){
  const sel=new Set(state.ui.scope||[]);
  const html=()=>`<h2 style="margin-bottom:6px">Thema wählen</h2><p class="muted small" style="font-weight:700;margin-bottom:14px">Mehrere Lektionen kannst du kombinieren.</p>
    <div class="row" style="margin-bottom:12px"><button class="chip" data-all aria-pressed="${sel.size===0}">Alle Lektionen</button></div>
    <div class="row">${LESSONS.map(l=>`<button class="chip" data-l="${l.id}" aria-pressed="${sel.has(l.id)}">${esc(l.title)}</button>`).join('')}</div>
    <button class="btn primary block big" style="margin-top:22px" data-ok>Übernehmen</button>`;
  openSheet(html(),sh=>{
    sh.onclick=e=>{
      if(e.target.closest('[data-all]')){ sel.clear(); }
      const c=e.target.closest('[data-l]'); if(c){ const id=c.dataset.l; sel.has(id)?sel.delete(id):sel.add(id); }
      if(e.target.closest('[data-ok]')){ state.ui.scope=[...sel]; save(); closeSheet(); renderView(); return; }
      if(e.target.closest('[data-all],[data-l]')){ const y=sh.scrollTop; sh.innerHTML=`<div class="grab"></div>`+html(); sh.scrollTop=y; }
    };
  });
}

/* ============ Schreibtraining einrichten ============ */
function writeSetup(preScope){
  const d={demo:true,reps:10,count:5,help:'fade',mode:state.settings.freeDraw?'free':'trace'};
  const c=Object.assign(d,state.ui.wset||{});
  const sel=new Set(preScope&&preScope.length?preScope:(c.scope||[]));
  const chip=(k,v,label,cur)=>`<button class="chip" data-${k}="${v}" aria-pressed="${String(cur)===String(v)}">${label}</button>`;
  const html=()=>{
    const words=drillWords([...sel]);
    const prev=words.slice(0,14).map(w=>w.h).join(' ');
    return `<h2 style="margin-bottom:6px">Zeichen schreiben üben</h2>
    <p class="muted small" style="font-weight:700;margin-bottom:20px">Wähle ein Thema. Jedes Wort schreibst du mehrmals hintereinander.</p>
    <div class="fieldlabel">Thema</div>
    <div class="row" style="margin-bottom:6px"><button class="chip" data-all aria-pressed="${sel.size===0}">Alle Lektionen</button>${LESSONS.map(l=>`<button class="chip" data-l="${l.id}" aria-pressed="${sel.has(l.id)}">${esc(l.title)}</button>`).join('')}</div>
    <div class="muted small" style="font-weight:700;margin:10px 0 22px">${words.length} Wörter zum Schreiben${prev?': <span class="hz" style="font-size:18px">'+esc(prev)+(words.length>14?' …':'')+'</span>':''}</div>
    <div class="fieldlabel">So beginnst du</div>
    <div class="choice2" style="margin-bottom:22px">
      <button class="choice" data-demo="1" aria-pressed="${c.demo}"><b>Erst zeigen</b><span>Die Strichfolge läuft einmal vor, dann übst du</span></button>
      <button class="choice" data-demo="0" aria-pressed="${!c.demo}"><b>Direkt üben</b><span>Du schreibst sofort selbst</span></button>
    </div>
    <div class="fieldlabel">Wiederholungen pro Wort</div>
    <div class="row" style="margin-bottom:22px">${[3,5,10,15].map(n=>chip('reps',n,n+'×',c.reps)).join('')}</div>
    <div class="fieldlabel">Wörter pro Runde</div>
    <div class="row" style="margin-bottom:22px">${[3,5,10].map(n=>chip('count',n,n,c.count)).join('')}${chip('count',0,'Alle',c.count)}</div>
    <div class="fieldlabel">Wie zeichnest du?</div>
    <div class="choice2" style="margin-bottom:22px">
      <button class="choice" data-mode="trace" aria-pressed="${c.mode==='trace'}"><b>Nachzeichnen</b><span>Du zeichnest der Vorlage nach, deine Striche rasten in die richtige Form ein</span></button>
      <button class="choice" data-mode="free" aria-pressed="${c.mode==='free'}"><b>Frei zeichnen</b><span>Deine Striche bleiben so, wie du sie malst. Dafür musst du mehr auf die Form achten, es gibt keine Bewertung</span></button>
    </div>
    <div class="fieldlabel">Vorlage im Hintergrund</div>
    <div class="row" style="margin-bottom:8px">${chip('help','fade','Nach und nach ausblenden',c.help)}${chip('help','on','Immer',c.help)}${chip('help','off','Nie',c.help)}</div>
    <p class="muted small" style="font-weight:600;margin-bottom:22px">Beim Ausblenden hast du in den ersten Wiederholungen eine blasse Vorlage, danach schreibst du aus dem Gedächtnis.</p>
    <div class="stickyfoot"><button class="btn primary block big" data-go ${words.length?'':'disabled'}>Los geht's</button></div>`;
  };
  openSheet(html(),sh=>{
    sh.onclick=e=>{
      let redraw=false;
      if(e.target.closest('[data-all]')){ sel.clear(); redraw=true; }
      const l=e.target.closest('[data-l]'); if(l){ const id=l.dataset.l; sel.has(id)?sel.delete(id):sel.add(id); redraw=true; }
      const dm=e.target.closest('[data-demo]'); if(dm){ c.demo=dm.dataset.demo==='1'; redraw=true; }
      const rp=e.target.closest('[data-reps]'); if(rp){ c.reps=+rp.dataset.reps; redraw=true; }
      const ct=e.target.closest('[data-count]'); if(ct){ c.count=+ct.dataset.count; redraw=true; }
      const hp=e.target.closest('[data-help]'); if(hp){ c.help=hp.dataset.help; redraw=true; }
      const md=e.target.closest('[data-mode]'); if(md){ c.mode=md.dataset.mode; redraw=true; }
      if(e.target.closest('[data-go]')){
        c.scope=[...sel]; state.ui.wset={scope:c.scope,demo:c.demo,reps:c.reps,count:c.count,help:c.help,mode:c.mode}; save();
        closeSheet(); startWriteDrill({scope:c.scope,demo:c.demo,reps:c.reps,count:c.count,help:c.help,mode:c.mode}); return;
      }
      if(redraw){ const y=sh.scrollTop; sh.innerHTML=`<div class="grab"></div>`+html(); sh.scrollTop=y; }
    };
  });
}

/* ============ Wiederholen ============ */
/* Schwierige Wörter und freie Karteikarten (unter Wiederholen) */
const KIND_LABEL={lesen:'Lesen',hören:'Hören',schreiben:'Schreiben',sprechen:'Sprechen'};
function hardCard(){
  const ids=hardIds();
  const rows=ids.slice(0,10).map(id=>{
    const w=BYID.get(id), h=state.hard[id], py=wordPy(w);
    const tags=Object.entries(h.k||{}).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span class="kindtag">${KIND_LABEL[k]||k} ${n}×</span>`).join('');
    const dots=Array.from({length:HARD_OUT},(_,i)=>`<i class="${i<h.s?'done':''}"></i>`).join('');
    return `<div class="wrow" data-w="${w.id}" style="cursor:pointer"><div class="hz">${hanziHtml(w.h,py)}</div><div class="mid"><div class="py">${pinyinHtml(py)}</div><div class="de">${esc(gloss(w))}</div><div class="kindrow">${tags}</div></div><div class="hdots" title="${h.s} von ${HARD_OUT} richtig in Folge">${dots}</div></div>`;
  }).join('');
  return `<div class="card" id="hardcard"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="margin:0">Schwierige Wörter</h3><b style="font-size:22px;color:var(--p)">${ids.length}</b></div>
    <p class="muted small" style="font-weight:700;margin:6px 0 12px">Jeder Fehler nimmt ein Wort hier auf. Nach ${HARD_OUT} richtigen Antworten in Folge verschwindet es wieder.</p>
    ${ids.length?`<div class="wlist" style="margin-bottom:12px">${rows}</div>${ids.length>10?`<div class="muted small center" style="font-weight:700;margin-bottom:12px">und ${ids.length-10} weitere</div>`:''}<button class="btn primary big block" data-hard>Schwierige Wörter üben</button>`
    :`<div class="infobox">Noch keine. Wörter, die du falsch beantwortest, erscheinen hier automatisch.</div>`}</div>`;
}
function flashCard(){
  const scope=state.ui.scope||[], n=state.ui.fcCount===undefined?10:state.ui.fcCount;
  const label=scope.length?(scope.length===1?LBYID.get(scope[0]).title:`${scope.length} Lektionen`):'Alle Lektionen';
  const total=scopeInfo(scope).words.length;
  return `<div class="card" id="flashcard"><h3 style="margin-bottom:4px">Karteikarten frei</h3>
    <p class="muted small" style="font-weight:700;margin:0 0 12px">Du siehst die deutsche Bedeutung, sagst das Wort und zeichnest es dann. Der Wiederholungsplan bleibt unverändert, Fehler landen bei den schwierigen Wörtern.</p>
    <button class="btn block" data-fscope style="margin-bottom:12px;justify-content:space-between"><span>Thema: <b>${esc(label)}</b></span><span class="muted small">${total} Wörter</span></button>
    <div class="fieldlabel">Karten pro Runde</div>
    <div class="row" style="margin-bottom:14px">${[5,10,20,0].map(k=>`<button class="chip" data-fcn="${k}" aria-pressed="${n===k}">${k||'Alle'}</button>`).join('')}</div>
    <button class="btn primary big block" data-fstart ${total?'':'disabled'}>Karteikarten starten</button></div>`;
}

function viewReview(m){
  const due=dueIds().length, total=Object.keys(state.cards).length, today=state.log[todayKey()]||0;
  const next=Object.values(state.cards).filter(c=>c.d>Date.now()).sort((a,b)=>a.d-b.d)[0];
  const mastered=Object.values(state.cards).filter(c=>c.i>=21).length;
  m.innerHTML=`<div class="stack fade">
    <div><h1>Wiederholen</h1><p class="muted" style="font-weight:700;margin-top:2px">Karteikarten mit Abstand: Wörter, die du kennst, kommen seltener.</p></div>
    <div class="card" style="text-align:center;padding:28px 18px">
      <div class="muted small" style="font-weight:800">FÄLLIG</div>
      <div style="font-size:72px;font-weight:900;color:var(--p);line-height:1.1">${due}</div>
      <p class="muted" style="font-weight:700;margin:4px 0 20px">${total?`${total} Wörter im Stapel, ${mastered} gefestigt, heute ${today} bewertet`:'Noch keine Wörter im Stapel. Lerne zuerst Wörter in einer Lektion, dann erscheinen sie hier.'}</p>
      ${due?`<button class="btn primary big block" data-start>Wiederholung starten</button>`:total?`<div class="infobox">${next?'Als Nächstes fällig: '+new Date(next.d).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'}):'Alles erledigt.'}</div>
        <button class="btn block" style="margin-top:12px" data-early>Trotzdem die nächsten 10 wiederholen</button>`:`<button class="btn primary big block" data-go-learn>Zu den Lektionen</button>`}
    </div>
    ${hardCard()}
    ${flashCard()}
    <div class="card"><h3 style="margin-bottom:10px">Kartenarten</h3>
      ${[['read','Lesen','Zeichen sehen, Bedeutung und Aussprache wissen'],['listen','Hören','Wort hören, Bedeutung wissen'],['write','Schreiben','Zeichen mit richtiger Strichfolge zeichnen']].map(([k,t,d])=>`<div class="set"><div class="l"><b>${t}</b><span>${d}</span></div><button class="sw" role="switch" aria-checked="${state.settings.modes[k]}" data-mode="${k}" aria-label="${t}"></button></div>`).join('')}
    </div>
  </div>`;
  m.onclick=e=>{
    if(e.target.closest('[data-start]')) return startReview();
    if(e.target.closest('[data-go-learn]')) return go('learn');
    if(e.target.closest('[data-hard]')) return startHardPractice();
    if(e.target.closest('[data-fscope]')) return scopeSheet();
    if(e.target.closest('[data-fstart]')) return startFlashcards(state.ui.scope,state.ui.fcCount===undefined?10:state.ui.fcCount);
    const fc=e.target.closest('[data-fcn]'); if(fc){ state.ui.fcCount=+fc.dataset.fcn; save(); return renderView(); }
    const hw=e.target.closest('#hardcard [data-w]'); if(hw) return wordSheet(+hw.dataset.w);
    if(e.target.closest('[data-early]')){ const ids=Object.entries(state.cards).sort((a,b)=>a[1].d-b[1].d).slice(0,10); ids.forEach(([id,c])=>{ c.d=Date.now(); }); save(); return startReview(); }
    const sw=e.target.closest('[data-mode]'); if(sw){ const k=sw.dataset.mode; state.settings.modes[k]=!state.settings.modes[k]; if(!Object.values(state.settings.modes).some(Boolean)) state.settings.modes[k]=true; save(); renderView(); }
  };
}

/* ============ Wörter ============ */
function viewWords(m){
  m.innerHTML=`<div class="stack fade"><div><h1>Wörter</h1><p class="muted" style="font-weight:700;margin-top:2px">Suche in allen 5400 Wörtern von HSK 1 bis 6 (Deutsch gibt es bisher für HSK 1).</p></div>
    <input class="search" id="q" type="search" placeholder="Zeichen, Pinyin oder Bedeutung" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="levels" style="margin:0" id="lvf">${[0,1,2,3,4,5,6].map(l=>`<button class="chip" data-f="${l}" aria-pressed="${l===(view.f||1)}">${l?'HSK '+l:'Alle'}</button>`).join('')}</div>
    <div class="card" style="padding:6px 14px"><div class="wlist" id="wl"></div></div><div class="muted small center" id="more" style="font-weight:700"></div></div>`;
  let f=view.f||1;
  const norm=s=>baseSyl(s).replace(/\s+/g,'');
  function list(){
    const q=$('#q',m).value.trim().toLowerCase(), qn=norm(q);
    let arr=WORDS.filter(w=>f===0||w.l===f);
    if(q) arr=arr.filter(w=>w.h.includes(q)||norm(w.p).includes(qn)||(w.de&&w.de.toLowerCase().includes(q))||(w.m&&w.m.toLowerCase().includes(q)));
    const shown=arr.slice(0,150);
    $('#wl',m).innerHTML=shown.map(w=>{ const py=wordPy(w); return `<div class="wrow" data-w="${w.id}" style="cursor:pointer"><div class="hz">${hanziHtml(w.h,py)}</div><div class="mid"><div class="py">${pinyinHtml(py)}</div><div class="de">${esc(w.de||w.m)}${w.de?'':' <span class="badge" style="margin-left:6px">EN</span>'}</div></div><span class="badge">HSK ${w.l}</span></div>`; }).join('')||'<p class="muted center" style="padding:18px">Nichts gefunden.</p>';
    $('#more',m).textContent=arr.length>150?`${arr.length} Treffer, die ersten 150 werden angezeigt. Suche genauer.`:`${arr.length} Wörter`;
  }
  $('#q',m).addEventListener('input',list); list();
  m.onclick=e=>{
    const c=e.target.closest('[data-f]'); if(c){ f=+c.dataset.f; view.f=f; $$('#lvf .chip',m).forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.f===f))); list(); return; }
    const r=e.target.closest('[data-w]'); if(r) wordSheet(+r.dataset.w);
  };
}
/* Kleine Worterklärung zum Antippen (in Sätzen und Wortanzeigen) */
function closeTip(){ const t=$('#wtip'); if(t) t.remove(); }
function wordTip(id,anchor){
  const w=BYID.get(id); if(!w) return;
  closeTip();
  const py=wordPy(w), d=document.createElement('div'); d.id='wtip'; d.setAttribute('role','dialog');
  d.innerHTML=`<div class="wt-in"><div class="wt-hz hz">${hanziHtml(w.h,py)}</div><div class="wt-mid"><div class="py">${pinyinHtml(py)}</div><div class="wt-de">${esc(w.deFull||gloss(w))}</div>${w.de&&w.m?`<div class="wt-en">${esc(w.m)}</div>`:''}</div><div class="wt-act"><button class="ibtn sm fill" data-tipau aria-label="Anhören">${ICON.speaker}</button><button class="ibtn sm" data-tipslow aria-label="Langsam anhören">${ICON.slow}</button><button class="ibtn sm" data-tipmore aria-label="Mehr zum Wort">${ICON.list}</button><button class="ibtn sm" data-tipx aria-label="Schließen">${ICON.x}</button></div></div>`;
  document.body.appendChild(d);
  if(anchor){
    const r=anchor.getBoundingClientRect(), W=d.offsetWidth, H=d.offsetHeight, vw=innerWidth, vh=innerHeight;
    let top=r.top-H-12; if(top<10) top=Math.min(r.bottom+12,vh-H-10);
    let left=r.left+r.width/2-W/2; left=Math.max(10,Math.min(left,vw-W-10));
    d.style.top=top+'px'; d.style.left=left+'px';
  }
  $('[data-tipau]',d).addEventListener('click',()=>speak(w.h));
  $('[data-tipslow]',d).addEventListener('click',()=>speak(w.h,{slow:true}));
  $('[data-tipx]',d).addEventListener('click',closeTip);
  $('[data-tipmore]',d).addEventListener('click',()=>{ closeTip(); wordSheet(id); });
  speak(w.h);
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tw]');
  if(t){ e.preventDefault(); wordTip(+t.dataset.tw,t); return; }
  if(!e.target.closest('#wtip')) closeTip();
});
function wordSheet(id){
  const w=BYID.get(id), py=wordPy(w), ex=EXAMPLE.get(id), s=ex?SBYID.get(ex):null;
  openSheet(`<div class="hz bighz" style="margin:6px 0 0">${hanziHtml(w.h,py)}</div>
    <div class="center"><span class="py">${pinyinHtml(py)}</span></div>
    <div class="meaning" style="margin:10px 0 4px">${esc(gloss(w))}</div>
    ${w.de&&w.m?`<div class="center muted small" style="font-weight:700">Englisch: ${esc(w.m)}</div>`:''}
    <div class="center" style="margin:8px 0"><span class="badge">HSK ${w.l}</span> <span class="badge">${esc(w.t||'')}</span></div>
    <div class="row" style="justify-content:center;gap:12px;margin:12px 0"><button class="ibtn fill" data-au="n" aria-label="Anhören">${ICON.speaker}</button><button class="slowbtn" data-au="s">${ICON.slow}Langsam</button></div>
    <div id="tiles" class="tiles" style="margin-top:8px"></div>
    ${s?`<div class="card" style="margin-top:18px;padding:12px 8px 4px"><div class="small muted center" style="font-weight:800">BEISPIEL</div>${rubyHtml(s,{sm:true})}<div class="center" style="font-weight:700;margin-bottom:8px">${esc(s.de)}</div></div>`:''}
    <button class="btn block" style="margin-top:18px" data-close>Schließen</button>`,sh=>{
    bindAudio(sh,w.h);
    mountTiles($('#tiles',sh),w).catch(()=>{ $('#tiles',sh).innerHTML=''; });
    $('[data-close]',sh).addEventListener('click',closeSheet);
    speak(w.h);
  });
}

/* ============ Diagnose ============ */
async function runDiag(out){
  const L=[]; const add=(t,cls='')=>{ L.push(`<div class="${cls}">${t}</div>`); out.innerHTML=L.join(''); };
  const standalone = navigator.standalone===true || matchMedia('(display-mode: standalone)').matches;
  add(`Start: <b>${standalone?'App vom Home-Bildschirm':'Safari-Tab'}</b>`);
  add(`Sichere Verbindung (https): <b>${isSecureContext?'ja':'nein'}</b>`);
  add(`Sprachausgabe: <b>${'speechSynthesis' in window?'vorhanden':'fehlt'}</b>, chinesische Stimmen: <b>${zhVoices.length}</b>${zhVoices[0]?' ('+esc(zhVoices[0].name)+')':''}`);
  add(`Spracherkennung des Browsers: <b>${speechSupported()?'vorhanden':'fehlt'}</b>`);
  add(`Azure: <b>${azActive()?'aktiv':azConfigured()?'eingerichtet, aber die Engine steht auf Browser':'nicht eingerichtet'}</b>`);
  try{ add(`Sprachausgabe-Zustand: spricht ${speechSynthesis.speaking}, wartet ${speechSynthesis.pending}, pausiert ${speechSynthesis.paused}`); }catch(_){}
  add('Mikrofon wird vorbereitet (Sprachausgabe wird gestoppt) …');
  await micPrepare();
  const pc=x=>Math.round(x*100)+' %';
  add(`Mikrofon-Test: Ich probiere nacheinander ${MIC_VARIANTS.length} Einstellungen. Sprich bei jedem Test 3 Sekunden lang laut und ohne Pause, zum Beispiel immer wieder „nǐ hǎo“.`);
  const results=[];
  for(let i=0;i<MIC_VARIANTS.length;i++){
    const v=MIC_VARIANTS[i];
    add(`Test ${i+1} von ${MIC_VARIANTS.length} (${esc(v.name)}): sprich jetzt …`);
    const r=await micProbe(v,3000); results.push(r);
    if(r.error){ add(`${esc(v.name)}: <b>Fehler</b> ${esc(r.error.trim())}`,'bad'); if(/NotAllowed|Permission|denied/i.test(r.error)) { add('Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.','bad'); return; } continue; }
    const wa=Math.max(r.peakAnalyser,r.peakProc), best=Math.max(wa,r.peakRec||0);
    add(`${esc(v.name)}: Web Audio <b>${pc(wa)}</b>, Aufnahme <b>${r.peakRec==null?(r.recErr?'nicht lesbar':'keine'):pc(r.peakRec)}</b>, AudioContext ${esc(r.acState)} (${r.rate} Hz), Spur „${esc(r.label||'ohne Name')}“${r.muted?', <b>stumm geschaltet</b>':''}`,best>=MIC_SIG?'':'bad');
    await sleep(400);
  }
  try{ const dv=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'); add(`Gefundene Mikrofone: <b>${dv.length}</b>${dv.length?' ('+dv.map(d=>esc(d.label||'ohne Name')).join(', ')+')':''}`); }catch(_){}
  const ok=results.filter(r=>!r.error);
  const viaWa=ok.find(r=>Math.max(r.peakAnalyser,r.peakProc)>=MIC_SIG), viaRec=ok.find(r=>(r.peakRec||0)>=MIC_SIG);
  const pick=viaWa||viaRec;
  if(pick){
    state.settings.micVar=pick.id; save();
    add(`Ergebnis: Ton kommt an. Die App nutzt ab jetzt „${esc(pick.name)}“.${viaWa?'':' Web Audio liefert Stille, die App bewertet daher die Aufnahme (dauert etwas länger).'}`);
  } else if(ok.length){
    add('Ergebnis: <b>Bei keiner Einstellung kommt Ton an.</b> Das Mikrofon ist geöffnet, liefert aber nur Stille. Das liegt dann nicht an der App, sondern am Gerät. Probiere der Reihe nach: andere Apps schließen (besonders Bildschirmaufnahme, Videoanruf, Diktierfunktion), iPad neu starten, die Seite im Safari-Tab statt vom Home-Bildschirm öffnen, in den iPad-Einstellungen den Mikrofon-Zugriff für Safari prüfen. Schick mir dann diesen Screenshot.','bad');
  }
  stopSpeak();
  add('Sprachausgabe-Probe (danach): gleich kommt „nǐ … hǎo … nǐhǎo“ langsam. Hörst du etwas?');
  window.__tts.length=0; const t0=performance.now();
  await speak('你好',{slow:true});
  add(`Ablauf (${Math.round(performance.now()-t0)} ms): ${window.__tts.length?esc(window.__tts.join(' | ')):'<b>keine Ereignisse, die Sprachausgabe hat nichts gemeldet</b>'}`);
  add('Fertig. Schick mir diese Zeilen als Screenshot, wenn etwas nicht klappt.');
}

/* ============ Einstellungen ============ */
function viewSettings(m){
  const s=state.settings;
  const voices=zhVoices;
  m.innerHTML=`<div class="stack fade"><h1>Einstellungen</h1>
    ${storageOk?'':`<div class="warnbox">Dein Browser speichert hier nichts. Der Fortschritt geht beim Schließen verloren. Erstelle regelmäßig eine Sicherung.</div>`}
    <div class="card"><h3 style="margin-bottom:6px">Aussprache</h3>
      <div class="set"><div class="l"><b>Stimme</b><span>${voices.length?`${voices.length} chinesische Stimme${voices.length>1?'n':''} gefunden`:'Keine chinesische Stimme gefunden'}</span></div><select id="voice"><option value="">Automatisch</option>${voices.map(v=>`<option value="${esc(v.voiceURI)}" ${s.voice===v.voiceURI?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></div>
      <div class="set"><div class="l"><b>Tempo normal</b><span id="rv">${s.rate.toFixed(2)}</span></div><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${s.rate}"></div>
      <div class="set"><div class="l"><b>Tempo langsam</b><span id="sv">${s.slowRate.toFixed(2)}</span></div><input type="range" id="slow" min="0.2" max="0.8" step="0.05" value="${s.slowRate}"></div>
      <div class="set"><div class="l"><b>Zum Testen</b><span>Spielt einen Beispielsatz</span></div><div class="row"><button class="btn small" data-t="n">Normal</button><button class="btn small" data-t="s">Langsam</button></div></div>
      <div class="set"><div class="l"><b>Automatisch abspielen</b><span>Beim Öffnen einer Aufgabe</span></div><button class="sw" role="switch" aria-checked="${s.auto}" data-sw="auto" aria-label="Automatisch abspielen"></button></div>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">Anzeige</h3>
      <div class="set"><div class="l"><b>Text beim Hören anzeigen</b><span>Zeichen und Pinyin sichtbar, wenn die App etwas vorspricht</span></div><button class="sw" role="switch" aria-checked="${s.showText}" data-sw="showText" aria-label="Text beim Hören anzeigen"></button></div>
      <div class="set"><div class="l"><b>Töne farbig anzeigen</b><span>Pinyin und Zeichen nach Ton einfärben (rot, grün, blau, lila)</span></div><button class="sw" role="switch" aria-checked="${s.tones}" data-sw="tones" aria-label="Töne farbig"></button></div>
      <div class="set"><div class="l"><b>Pinyin auf Kacheln</b><span>Bei Satz bauen und Hören und schreiben</span></div><button class="sw" role="switch" aria-checked="${s.pinyin}" data-sw="pinyin" aria-label="Pinyin auf Kacheln"></button></div>
      <div class="set"><div class="l"><b>Strichhilfe beim Schreiben</b><span>Blasse Vorlage des Zeichens</span></div><button class="sw" role="switch" aria-checked="${s.outline}" data-sw="outline" aria-label="Strichhilfe"></button></div>
      <div class="set"><div class="l"><b>Deutsche Bedeutung beim Zeichnen</b><span>Zeigt das deutsche Wort über der Zeichenfläche an</span></div><button class="sw" role="switch" aria-checked="${s.showDe!==false}" data-sw="showDe" aria-label="Deutsche Bedeutung beim Zeichnen"></button></div>
      <div class="set"><div class="l"><b>Freies Zeichnen</b><span>Deine Striche bleiben so, wie du sie malst, und rasten nicht in die Form ein. Die App prüft sie im Hintergrund trotzdem.</span></div><button class="sw" role="switch" aria-checked="${!!s.freeDraw}" data-sw="freeDraw" aria-label="Freies Zeichnen"></button></div>
      <div class="set"><div class="l"><b>Richtige Form danach zeigen</b><span>Beim freien Zeichnen: nach jedem Zeichen siehst du die richtige Form hinter deinen Strichen.</span></div><button class="sw" role="switch" aria-checked="${s.showRef!==false}" data-sw="showRef" aria-label="Richtige Form danach zeigen"></button></div>
      <div class="set"><div class="l"><b>Aufgaben pro Runde</b></div><select id="per">${[5,8,10,12,15].map(n=>`<option ${s.perRound===n?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="set"><div class="l"><b>Design</b></div><select id="theme">${[['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].map(([k,t])=>`<option value="${k}" ${s.theme===k?'selected':''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">Sprechen testen</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">Prüft, ob Mikrofon und Spracherkennung auf diesem Gerät funktionieren. Sprich nach dem Tippen einen kurzen chinesischen Satz, zum Beispiel „nǐ hǎo“.</p>
      <div class="row"><button class="btn" data-mictest>Spracherkennung testen</button></div><div id="micres" class="small" style="margin-top:12px;font-weight:700"></div>
    </div>
    <div class="card" id="lockcard"><h3 style="margin-bottom:6px">App-Sperre</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">${LOCK.on?'Die App ist durch ein Passwort geschützt. Dein Azure-Schlüssel liegt verschlüsselt auf diesem Gerät. Die App fragt nach dem Schließen erneut nach dem Passwort.':'Keine Sperre eingerichtet. Wie du ein Passwort setzt, steht in der README.txt.'}</p>
      ${LOCK.on?'<div class="row"><button class="btn" data-locknow>Jetzt sperren</button></div>':''}
    </div>
    <div class="card" id="azcard"><h3 style="margin-bottom:6px">Genaue Aussprachebewertung (Azure)</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">Die Bewertung pro Zeichen kommt dann vom Azure-Dienst von Microsoft statt vom Browser. Dafür brauchst du einen kostenlosen Azure-Zugang. Schlüssel und Region bleiben nur auf diesem Gerät und sind nicht in der Sicherung.</p>
      <div class="set"><div class="l"><b>Bewertung durch</b><span id="azstate">${azConfigured()?'Schlüssel gespeichert':'Noch kein Schlüssel'}</span></div><select id="azengine"><option value="browser" ${AZ.engine!=='azure'?'selected':''}>Browser (grob)</option><option value="azure" ${AZ.engine==='azure'?'selected':''} ${azConfigured()?'':'disabled'}>Azure (genau)</option></select></div>
      <div class="azform">
        <label class="small" style="font-weight:800" for="azregion">Region</label>
        <input id="azregion" class="search" list="azregions" placeholder="z. B. westeurope" value="${esc(AZ.region)}" autocomplete="off" autocapitalize="off" spellcheck="false"><datalist id="azregions"><option value="westeurope"><option value="germanywestcentral"><option value="northeurope"><option value="francecentral"><option value="eastus"><option value="southeastasia"></datalist>
        <label class="small" style="font-weight:800;margin-top:10px;display:block" for="azkey">Schlüssel (Key 1)</label>
        <input id="azkey" class="search" type="password" placeholder="${AZ.key?'gespeichert, zum Ändern neu einfügen':'Schlüssel einfügen'}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="row" style="margin-top:12px"><button class="btn primary" data-azsave>Speichern</button><button class="btn" data-aztest ${azConfigured()?'':'disabled'}>Azure testen</button><button class="btn small quiet" data-azdel style="color:var(--bad-d)" ${azConfigured()?'':'disabled'}>Schlüssel löschen</button></div>
        <div id="azres" class="small" style="margin-top:12px;font-weight:700"></div>
        <div class="small muted" style="margin-top:6px;font-weight:700">Geschätzt in diesem Monat genutzt: <span id="azuse">${Math.round(AZ.usageSec/6)/10}</span> Minuten (Kontingent im Gratis-Tarif laut Microsoft: 5 Stunden Sprache pro Monat).</div>
      </div>
      <details style="margin-top:14px"><summary style="font-weight:800;cursor:pointer">So richtest du Azure ein</summary>
        <ol class="small" style="font-weight:600;line-height:1.55;padding-left:20px;margin-top:8px;display:grid;gap:6px">
          <li>Konto anlegen auf azure.microsoft.com/free (Microsoft-Konto nötig, Microsoft verlangt bei der Anmeldung in der Regel eine Karte zur Identitätsprüfung).</li>
          <li>Im Azure-Portal oben „Ressource erstellen“, nach <b>Speech</b> suchen (Dienst „Speech“ von Microsoft) und erstellen.</li>
          <li>Abonnement wählen, neue Ressourcengruppe anlegen, Region wählen (zum Beispiel <b>West Europe</b>), einen Namen vergeben, Tarif <b>Free F0</b> wählen.</li>
          <li>Nach der Erstellung: Ressource öffnen, links „Schlüssel und Endpunkt“. Dort stehen <b>Key 1</b> und <b>Standort/Region</b>.</li>
          <li>Hier die Region (kleingeschrieben, ohne Leerzeichen, z. B. westeurope) und Key 1 eintragen, speichern, „Azure testen“ drücken und den Beispielsatz sprechen.</li>
        </ol>
        <p class="small muted" style="font-weight:600;margin-top:10px">Hinweis: Azure bewertet für Chinesisch Genauigkeit, Flüssigkeit und Vollständigkeit pro Wort. Ein eigener Wert für die Töne ist in der Microsoft-Dokumentation für Mandarin nicht vorgesehen. Falsche Töne fließen aber in die Genauigkeit ein, wenn der Dienst sie als Abweichung erkennt.</p>
      </details>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">Diagnose</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">Prüft Schritt für Schritt Sprachausgabe, Mikrofon und Spracherkennung auf diesem Gerät und zeigt genau, wo etwas hakt. Sprich, wenn die App es sagt.</p>
      <div class="row"><button class="btn" data-diag>Sprache und Mikrofon prüfen</button></div><div id="diagres" class="small diag" style="margin-top:14px;font-weight:600"></div>
    </div>
    <div class="card" id="sycard"><h3 style="margin-bottom:6px">Abgleich zwischen Geräten</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">Dein Lernstand wird in einem privaten Gist deines GitHub-Kontos gespeichert und mit iPad, Handy und PC gemischt. Dabei wird nichts überschrieben. Einstellungen wie Stimme und Design bleiben pro Gerät.</p>
      <div class="set"><div class="l"><b>Status</b><span id="systate">${syConfigured()?(SY.err?esc(SY.err):SY.last?'Zuletzt abgeglichen: '+new Date(SY.last).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Verbunden, noch nicht abgeglichen'):'Nicht eingerichtet'}</span></div></div>
      <div class="azform">
        <label class="small" style="font-weight:800;display:block" for="sytoken">GitHub-Token</label>
        <input id="sytoken" class="search" type="password" placeholder="${syConfigured()?'gespeichert, zum Ändern neu einfügen':'Token einfügen'}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="row" style="margin-top:12px"><button class="btn primary" data-sysave>Verbinden</button><button class="btn" data-synow ${syConfigured()?'':'disabled'}>Jetzt abgleichen</button><button class="btn small quiet" data-sydel ${syConfigured()?'':'disabled'}>Trennen</button></div>
        <div id="syres" class="small" style="margin-top:12px;font-weight:700"></div>
      </div>
      <details style="margin-top:14px"><summary style="font-weight:800;cursor:pointer">So richtest du den Abgleich ein</summary>
        <ol class="small" style="font-weight:600;line-height:1.55;padding-left:20px;margin-top:8px;display:grid;gap:6px">
          <li>Öffne github.com/settings/personal-access-tokens/new und melde dich an.</li>
          <li>Gib dem Token einen Namen (z. B. Hanyu) und wähle die längste Gültigkeit.</li>
          <li>Unter „Repository access“ musst du nichts Besonderes wählen. Das Token braucht keinen Zugriff auf deine Repositories.</li>
          <li>Öffne „Permissions“, dann „Account permissions“, und stelle „Gists“ auf „Read and write“.</li>
          <li>Tippe auf „Generate token“, kopiere das Token und füge es oben ein.</li>
          <li>Wiederhole das Einfügen auf jedem Gerät mit demselben Token.</li>
        </ol>
      </details>
    </div>
    <div class="card"><h3 style="margin-bottom:6px">Sicherung</h3>
      <p class="muted small" style="font-weight:600;margin-bottom:12px">Der Fortschritt liegt nur in diesem Browser. Mit der Sicherung kannst du ihn auf ein anderes Gerät mitnehmen.</p>
      <div class="row"><button class="btn" data-export>Sicherung kopieren</button><button class="btn" data-import>Aus Text wiederherstellen</button></div>
      <textarea id="bk" class="search hidden" style="margin-top:12px;min-height:110px;padding:12px;font-size:13px" placeholder="Sicherungstext hier einfügen"></textarea><div id="bkmsg" class="small" style="margin-top:8px;font-weight:700"></div>
      <div style="margin-top:14px"><button class="btn small quiet" data-reset style="color:var(--bad-d)">Fortschritt zurücksetzen</button></div>
    </div>
  </div>`;
  const test=m.querySelector('[data-t]');
  m.addEventListener('input',e=>{
    if(e.target.id==='rate'){ s.rate=+e.target.value; $('#rv',m).textContent=s.rate.toFixed(2); save(); }
    if(e.target.id==='slow'){ s.slowRate=+e.target.value; $('#sv',m).textContent=s.slowRate.toFixed(2); save(); }
  });
  m.addEventListener('change',e=>{
    if(e.target.id==='voice'){ s.voice=e.target.value; save(); }
    if(e.target.id==='per'){ s.perRound=+e.target.value; save(); }
    if(e.target.id==='azengine'){ AZ.engine=e.target.value; AZ.engineSet=true; azSave(); }
    if(e.target.id==='theme'){ s.theme=e.target.value; save(); applyTheme(); }
  });
  m.onclick=async e=>{
    const sw=e.target.closest('[data-sw]'); if(sw){ const k=sw.dataset.sw; s[k]=!s[k]; save(); sw.setAttribute('aria-checked',String(s[k])); if(k==='tones') applyTones(); return; }
    const t=e.target.closest('[data-t]'); if(t){ speak('你好，很高兴认识你。',{slow:t.dataset.t==='s',parts:['你好','很','高兴','认识','你']}); return; }
    if(e.target.closest('[data-mictest]')){
      const out=$('#micres',m);
      if(!speechSupported()){ out.textContent='Dieser Browser bietet keine Spracherkennung (SpeechRecognition fehlt).'; return; }
      out.textContent='Ich höre zu … sprich jetzt.'; const r=await recognizeOnce();
      out.innerHTML = r.error ? `Ergebnis: Fehler „${esc(r.error)}“. ${esc(speechErrorText(r.error))}` : `Erkannt: <span class="hz" style="font-size:20px">${esc(r.alts[0])}</span> (funktioniert)`;
      return;
    }
    if(e.target.closest('[data-azsave]')){
      const rg=$('#azregion',m).value.trim().toLowerCase().replace(/\s+/g,''), k=$('#azkey',m).value.trim();
      const out=$('#azres',m);
      if(!rg){ out.textContent='Bitte eine Region eintragen, zum Beispiel westeurope.'; return; }
      if(!k && !AZ.key){ out.textContent='Bitte den Schlüssel einfügen.'; return; }
      AZ.region=rg; if(k) AZ.key=k; if(!AZ.engineSet) AZ.engine='azure'; azSave(); out.textContent='Gespeichert. Mit „Azure testen“ prüfst du, ob alles stimmt.'; setTimeout(renderView,700); return;
    }
    if(e.target.closest('[data-locknow]')){ lockNow(); return; }
    if(e.target.closest('[data-diag]')){ runDiag($('#diagres',m)); return; }
    if(e.target.closest('[data-azdel]')){ AZ.key=''; delete AZ.keyEnc; AZ.engine='browser'; AZ.engineSet=false; azSave(); renderView(); return; }
    if(e.target.closest('[data-aztest]')){
      const out=$('#azres',m); const ref=SBYID.get(LESSONS[0].sentences[0]); const txt=sentenceText(ref);
      out.innerHTML=`Sprich nach dem Tippen: <span class="hz" style="font-size:20px">${esc(txt)}</span> (Aufnahme endet bei einer Pause)`;
      const r=await azAssess(ref,[...txt].filter(isHan).join(''));
      if(r.error){ out.textContent=azErrorText(r.error,r.detail)+(r.detail?' (Details: '+String(r.detail).slice(0,160)+')':''); return; }
      const a=r.res.az; $('#azuse',m).textContent=Math.round(AZ.usageSec/6)/10;
      out.innerHTML=`Funktioniert. Gesamt <b>${r.res.score}</b>, Genauigkeit ${a.accuracy}, Flüssigkeit ${a.fluency}, Vollständigkeit ${a.completeness}. Erkannt: <span class="hz" style="font-size:18px">${esc(r.res.heard)}</span><br>Wörter: ${a.words.map(w=>esc(w.w)+' '+w.acc+(w.type!=='None'?' ('+esc(w.type)+')':'')).join(' · ')}`;
      return;
    }
    if(e.target.closest('[data-sysave]')){
      const t=$('#sytoken',m).value.trim(), out=$('#syres',m);
      if(!t){ out.textContent='Füge zuerst das Token ein.'; return; }
      SY.token=t; SY.gist=''; SY.err=''; SY.code=0; out.textContent='Verbinde und gleiche ab …';
      const ch=await syRun();
      if(SY.err&&(SY.code===401||SY.code===403)){ const msg=SY.err; SY.token=''; await sySave(); renderView(); setTimeout(()=>{ const o=$('#syres'); if(o) o.textContent=msg; },0); return; }
      await sySave(); renderView(); if(ch) return;
      setTimeout(()=>{ const o=$('#syres'); if(o) o.textContent=SY.err||'Verbunden und abgeglichen.'; },0);
      return;
    }
    if(e.target.closest('[data-synow]')){
      const out=$('#syres',m); out.textContent='Gleiche ab …'; const ch=await syRun(); renderView();
      setTimeout(()=>{ const o=$('#syres'); if(o) o.textContent=SY.err||(ch?'Abgeglichen, es kamen neue Daten von einem anderen Gerät.':'Abgeglichen, alles auf dem gleichen Stand.'); },0);
      return;
    }
    if(e.target.closest('[data-sydel]')){ SY.token=''; delete SY.tokenEnc; SY.gist=''; SY.err=''; SY.last=0; await sySave(); renderView(); return; }
    if(e.target.closest('[data-export]')){
      const txt=JSON.stringify(state); const msg=$('#bkmsg',m);
      try{ await navigator.clipboard.writeText(txt); msg.textContent='Sicherung in die Zwischenablage kopiert. Füge sie z. B. in eine Notiz ein.'; }
      catch(_){ const bk=$('#bk',m); bk.classList.remove('hidden'); bk.value=txt; bk.select(); msg.textContent='Kopieren nicht möglich. Markiere den Text und kopiere ihn von Hand.'; }
      return;
    }
    if(e.target.closest('[data-import]')){
      const bk=$('#bk',m), msg=$('#bkmsg',m);
      if(bk.classList.contains('hidden')){ bk.classList.remove('hidden'); bk.value=''; msg.textContent='Füge den Sicherungstext ein und tippe nochmal auf „Aus Text wiederherstellen“.'; return; }
      try{ const o=JSON.parse(bk.value); if(!o||typeof o!=='object'||!o.cards) throw new Error('x'); state=Object.assign(defaults(),o); state.settings=Object.assign(defaults().settings,o.settings||{}); state.settings.modes=Object.assign(defaults().settings.modes,(o.settings||{}).modes||{}); save(); applyTheme(); msg.textContent='Wiederhergestellt.'; setTimeout(renderView,600); }
      catch(_){ msg.textContent='Der Text ist keine gültige Sicherung.'; }
      return;
    }
    if(e.target.closest('[data-reset]')){
      openSheet(`<h2>Fortschritt zurücksetzen?</h2><p class="muted" style="font-weight:700;margin:8px 0 18px">Alle gelernten Wörter, Wiederholungen und Statistiken werden gelöscht, auch auf Geräten, die per Abgleich verbunden sind. Das lässt sich nicht rückgängig machen. Erstelle vorher eine Sicherung.</p><button class="btn bad block" data-yes>Ja, alles löschen</button><button class="btn block quiet" style="margin-top:10px" data-no>Abbrechen</button>`,sh=>{
        $('[data-no]',sh).addEventListener('click',closeSheet);
        $('[data-yes]',sh).addEventListener('click',()=>{ const keep=state.settings; state=defaults(); state.settings=keep; state.epoch=Date.now(); save(); closeSheet(); renderView(); });
      });
    }
  };
}

/* ============ Start ============ */
async function boot(){
  await lockGate();
  load(); azLoad(); await azInit(); syLoad(); await syInit(); applyTheme();
  try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme); }catch(_){}
  $('#main').innerHTML='<p class="muted center" style="padding:60px 0;font-weight:700">Lade …</p>';
  try{ await loadData(); }
  catch(err){ $('#main').innerHTML=`<div class="card"><h2>Daten konnten nicht geladen werden</h2><p class="muted" style="margin-top:8px">${esc(err.message||err)}. Die App muss über einen Webserver (nicht per Doppelklick auf die Datei) geöffnet werden.</p></div>`; return; }
  window.__app={state:()=>state,go,startPractice,startLearn,startReview,get S(){return SESS;},scoreSpeech,SBYID,LESSONS,BYID,save,makeItems,renderView};
  renderView();
  syStart();
  if('serviceWorker' in navigator && location.protocol.startsWith('http') && !/claude\.ai|claudeusercontent/.test(location.host)){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
}
boot();
