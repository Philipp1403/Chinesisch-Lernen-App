"use strict";
/* ============ Sprachbewertung (Browser-Erkennung) ============
   Vergleicht das Erkannte Zeichen für Zeichen mit dem Satz.
   Hinweis: Die Browser-Erkennung glättet Aussprachefehler oft, die Bewertung ist daher ein Richtwert. */

let CHARPY=null;
function charPinyinMap(){
  if(CHARPY) return CHARPY;
  CHARPY=new Map();
  for(const w of WORDS){
    for(const py of w.p.split('/')){
      const syl=charSylls(w.h,py); if(!syl) continue;
      [...w.h].forEach((c,i)=>{ let s=CHARPY.get(c); if(!s){ s=new Set(); CHARPY.set(c,s); } s.add(syl[i].toLowerCase()); });
    }
  }
  return CHARPY;
}
const ZD='零一二三四五六七八九';
function numToZh(n){
  n=+n; if(!isFinite(n)||n<0||n>9999) return null;
  if(n<10) return ZD[n];
  if(n<20) return '十'+(n%10?ZD[n%10]:'');
  if(n<100) return ZD[Math.floor(n/10)]+'十'+(n%10?ZD[n%10]:'');
  const part=(v,u)=>{ const d=Math.floor(v/u), r=v%u; return {d,r}; };
  let out='', rest=n;
  for(const [u,ch] of [[1000,'千'],[100,'百']]){
    if(rest>=u){ const {d,r}=part(rest,u); out+=ZD[d]+ch; rest=r; if(rest>0 && rest<u/10) out+='零'; }
  }
  if(rest>0){ if(rest<10) out+=ZD[rest]; else out+=ZD[Math.floor(rest/10)]+'十'+(rest%10?ZD[rest%10]:''); }
  return out;
}
/* Erkannten Text bereinigen; Ziffern in zwei Lesarten (einzeln / als Zahl) */
function heardCandidates(text){
  const base=String(text||'').replace(/[\s，。？！、；：,.?!;:"'“”‘’…\-]/g,'');
  const outs=new Set();
  outs.add(base.replace(/\d/g,d=>ZD[+d]));
  outs.add(base.replace(/\d+/g,m=>numToZh(m)||m.split('').map(d=>ZD[+d]).join('')));
  return [...outs].map(s=>[...s].filter(c=>isHan(c)));
}
const SANDHI=new Set(['不','一']);
function simChar(t,rch){
  if(t.ch===rch) return 1;
  if((t.ch==='二'&&rch==='两')||(t.ch==='两'&&rch==='二')) return 0.9;
  const m=charPinyinMap().get(rch); if(!m) return 0;
  const tp=t.py.toLowerCase();
  if(m.has(tp)) return 1;
  const tb=baseSyl(tp);
  for(const p of m){ if(baseSyl(p)===tb) return SANDHI.has(t.ch)?1:0.6; }
  return 0;
}
/* Zeichen eines Satzes mit Silbe */
function sentenceChars(s){
  const out=[];
  s.t.forEach((tok,ti)=>{
    if(tok.punc) return;
    const chars=[...tok.h], syl=charSylls(tok.h,tok.p);
    chars.forEach((c,i)=>out.push({ch:c,py:syl?syl[i]:tok.p,ti}));
  });
  return out;
}
function alignScore(T,R){
  const n=T.length, m=R.length;
  const sim=Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>simChar(T[i],R[j])));
  const dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++) dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]+sim[i-1][j-1]);
  const got=new Array(n).fill(0); let i=n,j=m,matched=0;
  while(i>0&&j>0){
    if(dp[i][j]===dp[i-1][j-1]+sim[i-1][j-1] && sim[i-1][j-1]>0){ got[i-1]=sim[i-1][j-1]; matched++; i--; j--; }
    else if(dp[i][j]===dp[i-1][j]) i--; else j--;
  }
  const sum=got.reduce((a,b)=>a+b,0), extra=Math.max(0,m-matched);
  return {got,sum,extra};
}
function scoreSpeech(s, alts){
  const T=sentenceChars(s); let best=null;
  for(const a of alts){
    for(const R of heardCandidates(a)){
      const r=alignScore(T,R);
      const pen=1-Math.min(0.5,0.25*r.extra/Math.max(1,T.length));
      const score=Math.round(100*r.sum/Math.max(1,T.length)*pen);
      if(!best||score>best.score) best={score,got:r.got,heard:R.join(''),extra:r.extra};
    }
    break; // nur die wahrscheinlichste Variante zählt (ehrlicher als Best-of)
  }
  if(!best) best={score:0,got:new Array(T.length).fill(0),heard:'',extra:0};
  best.chars=T.map((t,i)=>({ch:t.ch,py:t.py,ti:t.ti,s:best.got[i]}));
  return best;
}

/* ============ Erkennung ============ */
let activeRec=null;
function speechSupported(){ return !!(window.SpeechRecognition||window.webkitSpeechRecognition); }
function recognizeOnce(){
  return new Promise(resolve=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return resolve({error:'unsupported'});
    let finished=false, rec, heard=false;
    const fin=o=>{ if(finished) return; finished=true; clearTimeout(wd); activeRec=null; resolve(o); };
    /* Wenn der Browser nach 7 s nicht einmal die Aufnahme startet, reagiert die Erkennung nicht (typisch für iPad-Home-Bildschirm-Apps) */
    const wd=setTimeout(()=>{ if(!heard){ try{ rec&&rec.abort(); }catch(_){} fin({error:'no-response'}); } },7000);
    try{
      rec=new SR(); rec.lang='zh-CN'; rec.interimResults=false; rec.continuous=false; rec.maxAlternatives=3;
      rec.onaudiostart=()=>{ heard=true; }; rec.onstart=()=>{ heard=true; };
      rec.onresult=e=>{ const alts=[]; try{ for(const a of e.results[0]) alts.push(a.transcript); }catch(_){} fin(alts.length?{alts}:{error:'no-speech'}); };
      rec.onerror=e=>fin({error:e.error||'error'});
      rec.onnomatch=()=>fin({error:'no-speech'});
      rec.onend=()=>fin({error:'no-speech'});
      activeRec={stop:()=>{ try{ rec.stop(); }catch(_){} }, abort:()=>{ try{ rec.abort(); }catch(_){} fin({error:'aborted'}); }};
      /* Läuft noch eine Sprachausgabe, bleibt auf dem iPad die Audiositzung im Wiedergabemodus und das Mikro hört nichts. Synchron stoppen, damit die Geste erhalten bleibt */
      try{ stopSpeak(); }catch(_){}
      rec.start();
    }catch(err){ fin({error:'start-failed',message:String(err)}); }
  });
}
function stopListening(){ if(activeRec) activeRec.stop(); }
function abortListening(){ if(activeRec) activeRec.abort(); if(typeof azCancel==='function') azCancel(); }
function speechErrorText(code){
  switch(code){
    case 'unsupported': return 'Spracherkennung ist in diesem Browser nicht verfügbar.';
    case 'not-allowed': return 'Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.';
    case 'service-not-allowed': return 'Die Spracherkennung ist ausgeschaltet. Aktiviere auf dem iPad die Diktierfunktion (Einstellungen, Allgemein, Tastatur).';
    case 'no-speech': return 'Nichts gehört. Tippe auf das Mikrofon und sprich dann den Satz.';
    case 'audio-capture': return 'Kein Mikrofon gefunden.';
    case 'network': return 'Die Spracherkennung braucht eine Internetverbindung.';
    case 'language-not-supported': return 'Chinesisch wird von der Spracherkennung dieses Geräts nicht unterstützt.';
    case 'no-response': return 'Die Spracherkennung des Browsers reagiert nicht. Auf dem iPad klappt sie oft nur im Safari-Tab, nicht in der App vom Home-Bildschirm. Unter Einstellungen, Diagnose siehst du, was genau fehlt.';
    case 'aborted': return '';
    default: return 'Die Aufnahme hat nicht geklappt ('+esc(code||'unbekannt')+').';
  }
}
