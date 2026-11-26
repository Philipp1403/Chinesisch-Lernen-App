"use strict";
/* ============ Abgleich zwischen Geräten (privater GitHub-Gist) ============
   Der Lernstand (ohne Einstellungen) liegt in einer Datei in einem geheimen Gist des eigenen GitHub-Kontos.
   Jedes Gerät lädt sie, mischt sie mit seinem Stand (nichts wird überschrieben) und schreibt das Ergebnis zurück.
   Das Zugriffstoken liegt nur auf dem Gerät (mit App-Sperre verschlüsselt), nicht in der Sicherung. */
const SY_KEY='hanyu.sync.v1', SY_FILE='hanyu-progress.json', SY_DESC='Hanyu Lernstand';
let SY={token:'',gist:'',last:0,err:''};
function syLoad(){ try{ const s=localStorage.getItem(SY_KEY); if(s) SY=Object.assign(SY,JSON.parse(s)); }catch(_){} }
async function syInit(){
  if(SY.tokenEnc&&LOCK.on&&LOCK.key){
    try{ SY.token=await lockDecrypt(SY.tokenEnc); delete SY.tokenEnc; }catch(_){ SY.token=''; }
  }
  sySave();
}
let syQ=Promise.resolve();
function sySave(){
  const rec=Object.assign({},SY);
  syQ=syQ.then(async()=>{
    try{
      const out=Object.assign({},rec);
      if(LOCK.on&&LOCK.key&&rec.token){ out.tokenEnc=await lockEncrypt(rec.token); delete out.token; }
      else if(rec.token) delete out.tokenEnc;
      localStorage.setItem(SY_KEY,JSON.stringify(out));
    }catch(_){}
  });
  return syQ;
}
const syConfigured=()=>!!SY.token;

/* Nur der Lernstand wird geteilt. Einstellungen (Stimme, Tempo, Design) bleiben pro Gerät. */
function syShare(st){
  return {v:2,epoch:st.epoch||0,cards:st.cards||{},stats:st.stats||{},hard:st.hard||{},hardOut:st.hardOut||{},log:st.log||{},tests:(st.ui&&st.ui.tests)||{}};
}
/* Zwei Stände mischen. a = dieses Gerät, b = Gist. Reine Funktion, ändert nichts an a und b. */
function mergeStates(a,b){
  const A=syShare(a), B=syShare(b);
  const clone=o=>JSON.parse(JSON.stringify(o));
  /* Ein anderes Gerät kann noch das alte Kartenformat schicken: vor dem Vergleichen auf die zwei Phasen umrechnen (idempotent) */
  A.cards=migrateCards(clone(A.cards)); B.cards=migrateCards(clone(B.cards));
  /* Zurücksetzen auf einem Gerät: der spätere Neustart gewinnt komplett, damit alte Stände nicht zurückkehren */
  if(A.epoch>B.epoch) return clone(A);
  if(B.epoch>A.epoch) return clone(B);
  const out={v:2,epoch:A.epoch,cards:{},stats:{},hard:{},hardOut:{},log:{},tests:{}};
  for(const id of new Set([...Object.keys(A.cards),...Object.keys(B.cards)])){
    const x=A.cards[id], y=B.cards[id];
    out.cards[id]=clone(!x?y:!y?x:(y.r>x.r||(y.r===x.r&&y.i>x.i))?y:x);   /* mehr Wiederholungen = weiter fortgeschritten */
  }
  for(const id of new Set([...Object.keys(A.stats),...Object.keys(B.stats)])){
    const x=A.stats[id]||{ok:0,bad:0}, y=B.stats[id]||{ok:0,bad:0};
    out.stats[id]={ok:Math.max(x.ok,y.ok),bad:Math.max(x.bad,y.bad)};
  }
  for(const d of new Set([...Object.keys(A.log),...Object.keys(B.log)])) out.log[d]=Math.max(A.log[d]||0,B.log[d]||0);
  for(const id of new Set([...Object.keys(A.hardOut),...Object.keys(B.hardOut)])) out.hardOut[id]=Math.max(A.hardOut[id]||0,B.hardOut[id]||0);
  for(const id of new Set([...Object.keys(A.hard),...Object.keys(B.hard)])){
    const x=A.hard[id], y=B.hard[id];
    const c=!x?y:!y?x:(y.t>x.t?y:x);
    if((out.hardOut[id]||0)>(c.t||0)) continue;   /* auf einem Gerät schon wieder herausgenommen */
    out.hard[id]=clone(c);
  }
  for(const l of new Set([...Object.keys(A.tests),...Object.keys(B.tests)])){
    const x=A.tests[l], y=B.tests[l];
    if(!x||!y){ out.tests[l]=clone(x||y); continue; }
    const n=(y.ts||0)>(x.ts||0)?y:x;
    out.tests[l]={last:n.last,ts:n.ts,best:Math.max(x.best||0,y.best||0)};
  }
  return out;
}
/* Gemischtes Ergebnis in den laufenden Zustand übernehmen (Einstellungen und Ansicht bleiben unberührt) */
function syApply(m){
  m=Object.assign({},m,sanitizeLearning(m));   /* Gist-Stand ist eine Eingabe von außen */
  state.epoch=m.epoch; state.cards=m.cards; state.stats=m.stats; state.hard=m.hard; state.hardOut=m.hardOut; state.log=m.log;
  state.ui=state.ui||{}; state.ui.tests=m.tests;
}

async function syApi(path,opt={}){
  const r=await fetch('https://api.github.com'+path,Object.assign({},opt,{headers:Object.assign({
    Accept:'application/vnd.github+json','Authorization':'Bearer '+SY.token,'X-GitHub-Api-Version':'2022-11-28'},
    opt.body?{'Content-Type':'application/json'}:{})}));
  if(!r.ok){ const e=new Error('HTTP '+r.status); e.status=r.status; throw e; }
  return r.status===204?null:r.json();
}
async function syFindGist(){
  for(let p=1;p<=5;p++){
    const list=await syApi('/gists?per_page=100&page='+p);
    const g=list.find(x=>x.files&&x.files[SY_FILE]); if(g) return g.id;
    if(list.length<100) break;
  }
  return '';
}
async function syPull(){
  const g=await syApi('/gists/'+SY.gist); const f=g.files&&g.files[SY_FILE]; if(!f) throw Object.assign(new Error('missing'),{status:404});
  let txt=f.content;
  if(f.truncated||txt==null){ const r=await fetch(f.raw_url); if(!r.ok) throw new Error('HTTP '+r.status); txt=await r.text(); }
  return {text:txt,data:JSON.parse(txt)};
}
function syErrorText(e){
  const s=e&&e.status;
  if(s===401) return 'GitHub lehnt das Token ab (abgelaufen oder falsch). Erstelle ein neues Token.';
  if(s===403||s===429) return 'GitHub hat die Anfrage abgelehnt. Prüfe, dass beim Token „Gists“ auf „Lesen und Schreiben“ steht, oder versuche es später.';
  if(s===404) return 'Der Gist wurde nicht gefunden.';
  if(!navigator.onLine||/Failed to fetch|NetworkError|Load failed/i.test(String(e&&e.message))) return 'Keine Verbindung. Der Abgleich läuft beim nächsten Mal.';
  return 'Der Abgleich hat nicht geklappt ('+String(e&&e.message||'Fehler')+').';
}

let syBusy=false, syTimer=null, syLastRun=0;
/* Einmal abgleichen: holen, mischen, lokal speichern, zurückschreiben. Gibt true zurück, wenn sich lokal etwas geändert hat. */
async function syRun(){
  if(!syConfigured()||syBusy) return false;
  if(typeof SESS!=='undefined'&&SESS){ syQueue(30000); return false; }   /* nicht mitten in einer Übung */
  syBusy=true; syLastRun=Date.now(); let changed=false;
  try{
    if(!SY.gist) SY.gist=await syFindGist();
    let remoteText='', merged=syShare(state);
    if(SY.gist){
      let pulled;
      try{ pulled=await syPull(); }
      catch(e){ if(e.status===404){ SY.gist=''; pulled=null; } else throw e; }
      if(pulled){ remoteText=pulled.text; merged=mergeStates(state,pulled.data); }
    }
    const before=JSON.stringify(syShare(state)), after=JSON.stringify(merged);
    if(before!==after){ syApply(merged); changed=true; try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(_){} }
    const content=JSON.stringify(syShare(state));
    if(content!==remoteText){
      const files={[SY_FILE]:{content}};
      if(SY.gist) await syApi('/gists/'+SY.gist,{method:'PATCH',body:JSON.stringify({files})});
      else{ const g=await syApi('/gists',{method:'POST',body:JSON.stringify({description:SY_DESC,public:false,files})}); SY.gist=g.id; }
    }
    SY.last=Date.now(); SY.err=''; SY.code=0;
  }catch(e){ SY.err=syErrorText(e); SY.code=e&&e.status||0; }
  finally{ syBusy=false; sySave(); }
  return changed;
}
/* Nach Änderungen verzögert abgleichen (gebündelt) */
function syQueue(ms=25000){
  if(!syConfigured()||syBusy) return;
  clearTimeout(syTimer); syTimer=setTimeout(()=>{ syRun().then(ch=>{ if(ch&&typeof renderView==='function'&&!(typeof SESS!=='undefined'&&SESS)) renderView(); }); },ms);
}
function syStart(){
  if(!syConfigured()) return;
  syRun().then(ch=>{ if(ch&&typeof renderView==='function') renderView(); });
  document.addEventListener('visibilitychange',()=>{
    if(!syConfigured()) return;
    if(document.visibilityState==='hidden'){ clearTimeout(syTimer); syRun(); }
    else if(Date.now()-syLastRun>60000){ syRun().then(ch=>{ if(ch&&typeof renderView==='function'&&!(typeof SESS!=='undefined'&&SESS)) renderView(); }); }
  });
  window.addEventListener('online',()=>syQueue(2000));
}
