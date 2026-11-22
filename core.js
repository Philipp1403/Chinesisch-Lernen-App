"use strict";
/* ============ Helfer ============ */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isHan = ch => /[㐀-鿿]/.test(ch);
const DAY = 86400000;
const APP_VERSION = 'v29'; /* bei jeder Änderung mit sw.js (const V) hochzählen */
const sleep = ms => new Promise(r => setTimeout(r, ms));
function dayStart(plus=0){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+plus); return d.getTime(); }
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function sample(a,n){ return shuffle(a).slice(0,n); }
const svg = (inner,extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
const ICON = {
  speaker: svg('<path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
  slow: svg('<path d="M3 16c0-4.2 3.2-7 7.5-7s7.5 2.8 7.5 7z"/><path d="M18 13.5c1.6-1 3.2-.8 3.2.6s-1.6 1.9-3.2 1.9"/><path d="M6.5 16v2M14.5 16v2"/><path d="M9 12.5 10.5 11l1.5 1.5"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M8.5 21h7"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  learn: svg('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z"/>'),
  train: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  cards: svg('<rect x="3.5" y="7" width="13" height="13" rx="2.5"/><path d="M7.5 4.2h11a2 2 0 0 1 2 2V16"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  choose: svg('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><path d="m14.5 16.8 2 2 3.5-4"/>'),
  build: svg('<rect x="3" y="4" width="8" height="6.5" rx="2"/><rect x="13" y="4" width="8" height="6.5" rx="2"/><rect x="3" y="13.5" width="8" height="6.5" rx="2"/><path d="M15 16.8h5M17.5 14.3v5"/>'),
  draw: svg('<path d="M4 20l1-4.2L16.6 4.2a2.1 2.1 0 0 1 3 3L8 18.8z"/><path d="M14.5 6.3l3.2 3.2"/>'),
  dictate: svg('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13.5" width="4.2" height="6.5" rx="2" fill="currentColor"/><rect x="16.8" y="13.5" width="4.2" height="6.5" rx="2" fill="currentColor"/>'),
  mixed: svg('<path d="M3 7h3.5c5 0 5 10 10 10H21M3 17h3.5c1.7 0 2.9-.9 3.8-2.1M13.7 9.1C14.6 7.9 15.5 7 17 7h4"/><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5"/>'),
  translate: svg('<path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5"/><path d="M20 16H7M10.5 12.5 7 16l3.5 3.5"/>'),
  tone: svg('<path d="M3 12c1.5-6 3-6 4.5 0s3 6 4.5 0 3-6 4.5 0 3 6 4.5 0"/>'),
  blank: svg('<path d="M3 6h18"/><path d="M3 18h18"/><path d="M3 12h4.5M16.5 12H21"/><rect x="9.5" y="8.5" width="5" height="7" rx="1.3" stroke-dasharray="2 2"/>'),
  link: svg('<circle cx="6" cy="7" r="2.6"/><circle cx="18" cy="17" r="2.6"/><circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="7" r="2.6"/><path d="M8.4 8.2 15.6 15.8M8.4 15.8 15.6 8.2"/>'),
  ear: svg('<path d="M7 9.5a5 5 0 0 1 10 0c0 2.6-2.2 3.4-3.2 5.1-.9 1.6-.4 3.9-2.8 4.4-2 .4-3.5-1-3.5-2.6"/><path d="M10 9.5a2 2 0 0 1 4 0"/>'),
  grid: svg('<rect x="4" y="4" width="16" height="16" rx="2.6"/><path d="M12 4v16M4 12h16" stroke-dasharray="2 2.6"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
};

/* ============ Pinyin und Töne ============ */
const TONE = {'ā':1,'ē':1,'ī':1,'ō':1,'ū':1,'ǖ':1,'á':2,'é':2,'í':2,'ó':2,'ú':2,'ǘ':2,'ǎ':3,'ě':3,'ǐ':3,'ǒ':3,'ǔ':3,'ǚ':3,'à':4,'è':4,'ì':4,'ò':4,'ù':4,'ǜ':4};
const VOW = 'aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const SYL = new RegExp('(?:zh|ch|sh|[bpmfdtnlgkhjqxzcsrwy])?['+VOW+']+(?:ng|n|r)?(?!['+VOW+'])','gi');
function toneOf(s){ for(const c of String(s).toLowerCase()) if(TONE[c]) return TONE[c]; return 0; }
function sylls(py){ return String(py).match(SYL) || []; }
function pinyinHtml(py){ return esc(py).replace(SYL, m => `<span class="t${toneOf(m)}">${m}</span>`); }
function baseSyl(p){ return String(p).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’']/g,''); }
/* Silben je Zeichen (mit Sonderfall Erhua) */
function charSylls(h, py){
  const chars=[...h]; let syl=sylls(py);
  if(chars.length===syl.length+1 && chars[chars.length-1]==='儿' && /r$/i.test(syl[syl.length-1])){
    syl=[...syl]; syl[syl.length-1]=syl[syl.length-1].slice(0,-1); syl.push('r');
  }
  return syl.length===chars.length ? syl : null;
}
function hanziHtml(h, py){
  const chars=[...h], syl=charSylls(h,py);
  if(syl) return chars.map((c,i)=>`<span class="t${toneOf(syl[i])}">${esc(c)}</span>`).join('');
  return esc(h);
}

/* ============ Daten ============ */
let WORDS=[], BYID=new Map(), CHARLEVEL={}, CHARS={}, chunkLoaded={};
let LESSONS=[], LBYID=new Map(), SENTS=[], SBYID=new Map(), EXAMPLE=new Map();
const LESSON_ICON={gruss:'你好',ich:'我',menschen:'人',familie:'家',zahlen:'三',mengen:'个',datum:'日',uhrzeit:'时',essen:'吃',trinken:'喝',einkaufen:'买',dies:'这',ort:'里',schule:'学',chinesisch:'字',arbeit:'工',freizeit:'玩',unterwegs:'车',gesundheit:'雨',wuensche:'爱',verben:'做',eigenschaften:'大',kleine:'也',fragen:'吗'};
/* Deutsche Sätze ohne Satzzeichen (Komma, Punkt, Frage-, Ausrufezeichen, Gedankenstrich). Der Punkt nach einer Ziffer (Ordnungszahl wie "2. Oktober") bleibt. */
function deNoPunc(t){ return String(t).replace(/(\d)\./g,'$1\u0001').replace(/[.,;:!?…„“"()–—]/g,' ').replace(/\u0001/g,'.').replace(/\s+/g,' ').trim(); }
async function loadData(){
  const [r1,r2]=await Promise.all([fetch('data/words.json'),fetch('data/hsk1.json')]);
  if(!r1.ok) throw new Error('words.json '+r1.status);
  if(!r2.ok) throw new Error('hsk1.json '+r2.status);
  const d=await r1.json(), h=await r2.json();
  WORDS=d.words; CHARLEVEL=d.charLevel; BYID=new Map(WORDS.map(w=>[w.id,w]));
  LESSONS=h.lessons; LBYID=new Map(LESSONS.map((l,i)=>{ l.idx=i; l.hue=(i*37+215)%360; l.icon=LESSON_ICON[l.id]||'字'; return [l.id,l]; }));
  for(const [id,de] of Object.entries(h.de)){ const w=BYID.get(+id); if(w){ w.de=de; w.deFull=de; } }
  /* Klammerzusätze wie "(höflich)" weglassen, außer sie unterscheiden zwei Wörter voneinander oder der Eintrag bestünde nur aus der Klammer */
  const clean=t=>t.replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
  const cnt=new Map();
  for(const w of WORDS) if(w.deFull){ const k=clean(w.deFull); if(k) cnt.set(k,(cnt.get(k)||0)+1); }
  for(const w of WORDS) if(w.deFull){ const c=clean(w.deFull); if(c && cnt.get(c)===1) w.de=c; }
  for(const l of LESSONS) for(const id of l.words){ const w=BYID.get(id); if(w) w.lesson=l.id; }
  SENTS=h.sentences; for(const s of SENTS) s.de=deNoPunc(s.de); SBYID=new Map(SENTS.map(s=>[s.id,s]));
  for(const s of SENTS){
    /* Beispielsatz je Wort: der kürzeste Satz mit mindestens zwei Wörtern (ein Satz, der nur das Wort selbst ist, wäre sinnlos) */
    const nw=s.t.filter(x=>!x.punc).length; if(nw<2) continue;
    for(const t of s.t){ if(t.punc) continue; const cur=EXAMPLE.get(t.w); if(!cur || SBYID.get(cur).t.filter(x=>!x.punc).length>nw) EXAMPLE.set(t.w,s.id); }
  }
}
const gloss = w => w.de || w.m;
const wordPy = w => w.p.split('/')[0];
async function ensureChars(word){
  const lv=new Set([...word.h].filter(isHan).map(c=>CHARLEVEL[c]).filter(Boolean));
  await Promise.all([...lv].map(async l=>{
    if(chunkLoaded[l]) return chunkLoaded[l];
    chunkLoaded[l]=fetch(`data/chars-${l}.json`).then(r=>{ if(!r.ok) throw new Error('chars '+l); return r.json(); }).then(o=>{ Object.assign(CHARS,o); });
    try{ await chunkLoaded[l]; }catch(e){ chunkLoaded[l]=null; throw e; }
  }));
}

/* ============ Zustand + Speicher ============ */
const KEY='hanyu.v2';
let storageOk=true;
const defaults=()=>({v:2,
  settings:{level:1,rate:0.85,slowRate:0.5,voice:'',auto:true,showText:true,tones:false,pinyin:true,outline:true,showDe:true,freeDraw:false,showRef:true,perRound:8,theme:'auto',modes:{read:true,listen:true,write:true}},
  cards:{},stats:{},hard:{},hardOut:{},epoch:0,log:{},ui:{scope:[]}});
let state=defaults();
function load(){
  try{
    const s=localStorage.getItem(KEY);
    if(s){ const o=JSON.parse(s); const d=defaults(); state=Object.assign(d,o); state.settings=Object.assign(d.settings,o.settings||{}); state.settings.modes=Object.assign(d.settings.modes,(o.settings||{}).modes||{}); state.ui=Object.assign(d.ui,o.ui||{}); }
  }catch(e){ storageOk=false; }
  migrateCards(state.cards);   /* alte Karten einmalig auf die zwei Phasen umrechnen (idempotent) */
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); }catch(e){ storageOk=false; } if(typeof syQueue==='function') syQueue(); }
function applyTones(){ document.documentElement.dataset.tones = state.settings.tones?'on':'off'; }
function applyTheme(){
  applyTones();
  const t=state.settings.theme; const dark = t==='dark' || (t==='auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark?'dark':'light';
  const m=$('meta[name=theme-color]'); if(m) m.content = dark?'#0E1220':'#4455E6';
}

/* ============ Wiederholungs-Plan: zwei Phasen ============
   Phase 1, Lernphase (neues Wort oder nach einem Fehler): feste Schritte in Minuten.
   Phase 2, Wiederholung: Intervall in Tagen, jedes Mal mal einem Faktor, je nach Bewertung.
   Die Lernschritte entsprechen den Anki-Standardwerten (1 und 10 Minuten). Alle Zahlen unten (Abschlussintervalle, Faktoren 1,3 / 2,2 / 3,5,
   die 30 % nach einem Fehler und die Obergrenze) sind eigene Festlegungen von Philipp und leicht hier zu ändern. */
const LEARN_STEPS=[1,10];                 /* Minuten der Lernphase */
const RELEARN_STEP=10;                    /* Minuten nach einem Fehler in der Wiederholung */
const HARD_FIRST_STEP=LEARN_STEPS.length>1?Math.round((LEARN_STEPS[0]+LEARN_STEPS[1])/2):LEARN_STEPS[0];   /* Schwer auf Schritt 1: 6 Min */
const GRAD_GOOD=1, GRAD_EASY=4;           /* Tage beim Abschluss der Lernphase (Gut nach dem letzten Schritt / Leicht) */
const FACTOR_HARD=1.3, FACTOR_GOOD=2.2, FACTOR_EASY=3.5;
const LAPSE_FACTOR=0.3;                   /* neues Intervall nach Fehler = 30 % des alten */
const MAX_INTERVAL=120;                   /* Tage */
const CARD_V=2;                           /* Kartenformat dieser Logik */
const OLD_LADDER=[1,15,60,1440,2880,5760,10080,20160,43200,86400,172800];   /* alte Leiter (Minuten), nur für die Umrechnung */

function minLabel(min){ return min<60?min+' Min':Math.round(min/60)+' Std'; }
function dayLabel(d){ return d+(d===1?' Tag':' Tage'); }
/* Karte aus altem Format (Stufe c.s der Leiter, Tage c.i) in das neue umrechnen. Rein und idempotent: Karten mit v===CARD_V bleiben unverändert.
   Die Fälligkeit c.d bleibt immer unverändert, damit keine Karte plötzlich fällig wird. */
function migrateCard(c){
  if(!c||c.v===CARD_V) return c;
  const o=Object.assign({},c);
  let box;
  if(typeof c.s==='number') box=Math.max(0,Math.min(OLD_LADDER.length-1,c.s));
  else if(!c.r||!c.i) box=0;
  else{ box=3; for(let k=3;k<OLD_LADDER.length;k++) if(OLD_LADDER[k]<=c.i*1440) box=k; }
  if(box<=2){ o.m=0; o.ls=Math.min(box,LEARN_STEPS.length-1); o.i=0; }
  else{ o.m=1; o.ls=0; o.i=Math.min(MAX_INTERVAL,c.i>0?Math.round(c.i):Math.round(OLD_LADDER[box]/1440)); }
  o.io=0; delete o.s; o.v=CARD_V;
  return o;
}
function migrateCards(cards){ for(const id of Object.keys(cards||{})) cards[id]=migrateCard(cards[id]); return cards; }
const newCard=()=>({e:2.5,i:0,r:0,l:0,m:0,ls:0,io:0,d:Date.now(),v:CARD_V});
function ensureCard(id){ if(!state.cards[id]){ state.cards[id]=newCard(); return true; } return false; }
/* Tage zwischen Fälligkeitstag und heute (nur wenn überfällig), nach Kalendertagen, damit Sommerzeit nichts verschiebt */
function overdueDays(c,now){ const a=new Date(c.d).setHours(0,0,0,0), b=new Date(now).setHours(0,0,0,0); return Math.max(0,Math.round((b-a)/DAY)); }
/* Intervalle (Tage) der drei Antworten Schwer, Gut, Leicht für eine Karte in der Wiederholung */
function reviewIntervals(c,now){
  const I=Math.max(1,Math.round(c.i)||1), base=I+overdueDays(c,now);   /* base = max(Intervall, tatsächlich vergangene Tage) */
  let h=Math.max(I,Math.round(base*FACTOR_HARD)), g=Math.round(base*FACTOR_GOOD), e=Math.round(base*FACTOR_EASY);
  if(g<=h) g=h+1; if(e<=g) e=g+1;                                    /* Schwer < Gut < Leicht, mindestens ein Tag Abstand */
  const cap=x=>Math.min(MAX_INTERVAL,x);
  return {I,base,hard:cap(h),good:cap(g),easy:cap(e)};
}
/* Was passiert bei Antwort q (0 Nochmal, 1 Schwer, 2 Gut, 3 Leicht)? Ergebnis: neue Kartenfelder plus min (Minuten) oder days (Tage). */
function sched(c,q,now=Date.now()){
  c=migrateCard(c);
  const r=(c.r||0)+1, e=c.e||2.5; let l=c.l||0;
  const grad=days=>{ days=Math.max(1,Math.min(MAX_INTERVAL,days)); return {m:1,ls:0,io:0,i:days,r,l,e,days}; };
  if(c.m===1){                                   /* Wiederholung */
    const iv=reviewIntervals(c,now);
    if(q===0) return {m:0,ls:0,io:iv.I,i:0,r,l:l+1,e,min:RELEARN_STEP};   /* Fehler: zurück in die Lernphase, altes Intervall merken */
    return grad(q===1?iv.hard:q===2?iv.good:iv.easy);
  }
  if(c.io>0){                                    /* Lernphase nach einem Fehler: ein Schritt, danach 30 % des alten Intervalls */
    const back=Math.max(1,Math.round(LAPSE_FACTOR*c.io));
    if(q===3) return grad(back+1);
    if(q===2) return grad(back);
    return {m:0,ls:0,io:c.io,i:0,r,l,e,min:RELEARN_STEP};
  }
  const ls=Math.max(0,Math.min(LEARN_STEPS.length-1,c.ls|0));        /* normale Lernphase */
  if(q===0) return {m:0,ls:0,io:0,i:0,r,l,e,min:LEARN_STEPS[0]};
  if(q===1) return {m:0,ls,io:0,i:0,r,l,e,min:ls===0?HARD_FIRST_STEP:LEARN_STEPS[ls]};
  if(q===2){
    if(ls+1<LEARN_STEPS.length) return {m:0,ls:ls+1,io:0,i:0,r,l,e,min:LEARN_STEPS[ls+1]};
    return grad(GRAD_GOOD);
  }
  return grad(GRAD_EASY);                        /* Leicht (und "Kenne ich schon") schließt die Lernphase sofort ab */
}
const ratingLabel=s=>s.days?dayLabel(s.days):minLabel(s.min);
/* Bewertung anwenden; gibt den neuen Fälligkeitszeitpunkt zurück */
function applyRating(id,q){
  const now=Date.now(), c=state.cards[id]||newCard(), s=sched(c,q,now);
  const due=s.days?dayStart(s.days):now+s.min*60000;
  state.cards[id]={e:s.e,i:s.i,r:s.r,l:s.l,m:s.m,ls:s.ls,io:s.io,d:due,v:CARD_V};
  const k=todayKey(); state.log[k]=(state.log[k]||0)+1;
  return due;
}
function dueIds(){ const now=Date.now(); return Object.entries(state.cards).filter(([id,c])=>c.d<=now).sort((a,b)=>a[1].d-b[1].d).map(([id])=>+id); }
/* Schwierige Wörter: Ein Fehler nimmt das Wort auf, HARD_OUT richtige Antworten in Folge nehmen es wieder heraus.
   kind: lesen, hören, schreiben, sprechen (null = Fehler nimmt das Wort nicht auf, richtige Antworten zählen aber) */
const HARD_OUT=3;
function noteStat(wid,ok,kind){
  const s=state.stats[wid]||(state.stats[wid]={ok:0,bad:0}); if(ok) s.ok++; else s.bad++;
  if(!state.hard) state.hard={};
  let h=state.hard[wid];
  if(!ok){
    if(!kind) return;
    if(!h) h=state.hard[wid]={s:0,n:0,k:{},t:0};
    h.s=0; h.n++; h.k[kind]=(h.k[kind]||0)+1; h.t=Date.now();
  }else if(h){
    h.s++; h.t=Date.now();
    if(h.s>=HARD_OUT){ delete state.hard[wid]; (state.hardOut||(state.hardOut={}))[wid]=Date.now(); }
  }
}
function hardIds(){ return Object.keys(state.hard||{}).map(Number).filter(id=>BYID.has(id)).sort((a,b)=>{ const x=state.hard[a],y=state.hard[b]; return (x.s-y.s)||(y.n-x.n)||(y.t-x.t); }); }
function weightOf(wid){ const s=state.stats[wid]; if(!s) return 2; const n=s.ok+s.bad; return 1+3*(s.bad+0.5)/(n+1)+(n<2?0.5:0); }
function pickWeighted(items,n,wf){
  const pool=items.map(x=>({x,w:wf(x)})); const out=[];
  while(out.length<n && pool.length){
    const tot=pool.reduce((a,b)=>a+b.w,0); let r=Math.random()*tot, k=0;
    for(;k<pool.length;k++){ r-=pool[k].w; if(r<=0) break; }
    k=Math.min(k,pool.length-1); out.push(pool[k].x); pool.splice(k,1);
  }
  return out;
}
function lessonProgress(l){
  let learned=0, solid=0; for(const id of l.words){ const c=state.cards[id]; if(c){ learned++; if(c.i>=7) solid++; } }
  return {learned,solid,total:l.words.length};
}

/* ============ Sprachausgabe ============ */
let zhVoices=[], voicesReady=false, speakTick=0;
function refreshVoices(){
  try{ const all=speechSynthesis.getVoices(); voicesReady=all.length>0; zhVoices=all.filter(v=>/^(zh|cmn)/i.test(v.lang)||/chinese|mandarin|普通话|中文/i.test(v.name)); }catch(e){}
}
if('speechSynthesis' in window){ refreshVoices(); try{ speechSynthesis.addEventListener('voiceschanged',refreshVoices); }catch(e){} }
function ttsUsable(){ return 'speechSynthesis' in window && (!voicesReady || zhVoices.length>0); }
function pickVoice(){
  if(state.settings.voice){ const v=zhVoices.find(v=>v.voiceURI===state.settings.voice); if(v) return v; }
  return zhVoices.find(v=>/zh[-_]CN|cmn[-_]Hans/i.test(v.lang)) || zhVoices[0] || null;
}
/* Sprechen: normal in einem Stück. Langsam: Silbe für Silbe (bzw. Wort für Wort) mit Pausen,
   danach das Ganze noch einmal im niedrigen Tempo. Nur über das Tempo allein bleibt iOS oft
   beinahe gleich schnell, die Pausen machen den Unterschied hörbar. */
window.__tts=[];
const ttsLog=m=>{ window.__tts.push(Math.round(performance.now())+' '+m); if(window.__tts.length>60) window.__tts.shift(); };
function speakParts(text,parts){
  if(parts&&parts.length) return parts.filter(Boolean);
  const chars=[...text].filter(isHan);
  return chars.length>1?chars:[];
}
/* iPhone (nicht iPad: iPadOS meldet sich als Mac): hat einen Stumm-Schalter. Die Audio-Sitzung auf "playback" zu stellen ist ein Versuch,
   dass Ton auch dann hörbar bleibt (Wirkung auf die Sprachausgabe nicht belegt, deshalb zeigt die Diagnose den Zustand). */
const IS_IPHONE=/iPhone/.test(navigator.userAgent);
function phoneAudioPrepare(){ if(!IS_IPHONE) return; try{ if(navigator.audioSession&&navigator.audioSession.type!=='playback') navigator.audioSession.type='playback'; }catch(_){} }
function speak(text,opts={}){
  const slow=!!opts.slow; const my=++speakTick;
  phoneAudioPrepare();
  return new Promise(res=>{
    if(!('speechSynthesis' in window)) return res(false);
    try{
      const ss=speechSynthesis;
      const busy=ss.speaking||ss.pending;
      if(busy) ss.cancel();
      if(ss.paused) ss.resume();
      const v=pickVoice();
      const rate = slow ? Math.min(state.settings.slowRate,0.6) : state.settings.rate;
      /* Alles wird sofort und in einem Zug in die Warteschlange gelegt, ohne Warten auf Ereignisse oder Timer.
         iOS spielt Sprache nur zuverlässig ab, wenn sie direkt beim Antippen gestartet wird, und verliert Ereignisse,
         wenn man nach einem Abbruch (cancel) mit await weitermacht. Die Pausen kommen vom Komma hinter jeder Silbe. */
      const list=[];
      if(slow){ for(const p of speakParts(text,opts.parts)) list.push(p+'，'); }
      list.push(text);
      const make=(t,r,vol)=>{ const u=new SpeechSynthesisUtterance(t); u.lang='zh-CN'; if(v){ u.voice=v; u.lang=v.lang; } u.rate=r; if(vol!==undefined) u.volume=vol; return u; };
      /* Nach einem Abbruch geht bei WebKit die erste neue Äußerung gern verloren: ein lautloser Platzhalter fängt das ab */
      if(busy){ const pr=make('。',1,0); ss.speak(pr); ttsLog('platzhalter'); }
      let done=false; const fin=ok=>{ if(!done){ done=true; res(ok&&my===speakTick); } };
      list.forEach((t,i)=>{
        const u=make(t,rate); const last=i===list.length-1;
        u.onstart=()=>ttsLog('start '+t); u.onend=()=>{ ttsLog('ende '+t); if(last) fin(true); }; u.onerror=e=>{ ttsLog('fehler '+(e&&e.error||'')+' '+t); if(last) fin(false); };
        ss.speak(u); ttsLog('sprich '+t+' rate '+rate);
      });
      setTimeout(()=>{ if(!done){ if(my===speakTick){ try{ ss.cancel(); }catch(_){} } ttsLog('zeitlimit, Warteschlange geleert'); fin(false); } },3000+list.reduce((a,t)=>a+2500+t.length*1400,0));
    }catch(e){ res(false); }
  });
}
function stopSpeak(){ speakTick++; try{ speechSynthesis.cancel(); }catch(e){} }
const sentenceText = s => s.t.map(x=>x.h).join('');
