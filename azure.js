"use strict";
/* ============ Azure: genaue Aussprachebewertung ============
   Nutzt das offizielle Azure Speech SDK für Browser (lokal eingebunden, lädt erst bei Bedarf).
   Schlüssel und Region liegen nur auf diesem Gerät (eigener Speicherplatz, nicht in der Sicherung). */
const AZ_KEY='hanyu.azure.v1';
let AZ={key:'',region:'',engine:'browser',usageSec:0,month:''};
function azMonth(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function azLoad(){ try{ const s=localStorage.getItem(AZ_KEY); if(s) AZ=Object.assign(AZ,JSON.parse(s)); }catch(_){} }
/* Nach dem Entsperren: verschlüsselten Schlüssel öffnen, Monatszähler zurücksetzen, alten Klartext-Schlüssel verschlüsseln */
async function azInit(){
  if(AZ.keyEnc&&LOCK.on&&LOCK.key){
    try{ AZ.key=await lockDecrypt(AZ.keyEnc); delete AZ.keyEnc; }catch(_){ AZ.key=''; } /* nicht lesbar (anderes Passwort): Eintrag bleibt unangetastet */
  }
  if(AZ.month!==azMonth()){ AZ.month=azMonth(); AZ.usageSec=0; }
  azSave();
}
/* Speichern: mit App-Sperre liegt der Schlüssel nur verschlüsselt im Gerät */
let azQ=Promise.resolve();
function azSave(){
  const rec=Object.assign({},AZ);
  azQ=azQ.then(async()=>{
    try{
      const out=Object.assign({},rec);
      if(LOCK.on&&LOCK.key&&rec.key){ out.keyEnc=await lockEncrypt(rec.key); delete out.key; }
      else if(rec.key) delete out.keyEnc;
      localStorage.setItem(AZ_KEY,JSON.stringify(out));
    }catch(_){}
  });
  return azQ;
}
const azConfigured=()=>!!(AZ.key&&AZ.region);
const azActive=()=>AZ.engine==='azure'&&azConfigured();

let sdkPromise=null;
function loadSdk(){
  if(window.SpeechSDK) return Promise.resolve(window.SpeechSDK);
  if(sdkPromise) return sdkPromise;
  sdkPromise=new Promise((res,rej)=>{
    const s=document.createElement('script'); s.src='azure-speech-sdk.min.js';
    s.onload=()=>window.SpeechSDK?res(window.SpeechSDK):rej(new Error('SDK fehlt'));
    s.onerror=()=>{ sdkPromise=null; rej(new Error('Das Azure-Modul konnte nicht geladen werden.')); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}
let azCurrent=null;
function azCancel(){ if(azCurrent){ azCurrent.cancel(); } }

/* Rohergebnis (SDK-JSON oder REST-JSON) in Zeichenwerte umrechnen */
const pick=(o,k)=>{ if(!o) return undefined; const p=o.PronunciationAssessment; return (p&&p[k]!==undefined)?p[k]:o[k]; };
function azMarkFromAcc(acc,type){ if(type==='Omission') return 0; if(acc>=80) return 1; if(acc>=60) return 0.7; return 0; }
function azParse(json,s){
  const nb=json&&json.NBest&&json.NBest[0]; if(!nb) return null;
  const T=sentenceChars(s); const words=(nb.Words||[]);
  const marks=new Array(T.length).fill(null); let pos=0, insertions=0;
  for(const w of words){
    const type=pick(w,'ErrorType')||'None';
    if(type==='Insertion'){ insertions++; continue; }
    const n=[...String(w.Word||'')].filter(isHan).length||0;
    const acc=Number(pick(w,'AccuracyScore')); const m=azMarkFromAcc(isNaN(acc)?0:acc,type);
    for(let k=0;k<n&&pos<T.length;k++) marks[pos++]=m;
  }
  const pron=Number(pick(nb,'PronScore')), acc=Number(pick(nb,'AccuracyScore'));
  const fill=isNaN(acc)?0:azMarkFromAcc(acc,'None');
  for(let i=0;i<marks.length;i++) if(marks[i]===null) marks[i]=fill;
  const score=Math.round(isNaN(pron)?(isNaN(acc)?0:acc):pron);
  return {score,got:marks,heard:(nb.Display||json.DisplayText||'').replace(/[，。？！、,.?!]/g,''),extra:insertions,
    chars:T.map((t,i)=>({ch:t.ch,py:t.py,ti:t.ti,s:marks[i]})),
    az:{accuracy:Math.round(acc),fluency:Math.round(Number(pick(nb,'FluencyScore'))),completeness:Math.round(Number(pick(nb,'CompletenessScore'))),
        words:words.map(w=>({w:w.Word,acc:Math.round(Number(pick(w,'AccuracyScore'))),type:pick(w,'ErrorType')||'None'})),
        seconds:Number(json.Duration)/1e7||0}};
}

/* Aufnahme + Bewertung. Antwort: {res, audio} oder {error, detail}
   Das Mikrofon wird hier selbst geöffnet (getUserMedia), an das SDK weitergereicht und gleichzeitig mitgeschnitten,
   damit man sich anhören kann. Am Ende werden Aufnahme und alle Spuren in jedem Fall gestoppt (Mikrofon-Anzeige geht aus). */
async function azAssess(s,refText){
  let SDK;
  try{ SDK=await loadSdk(); }catch(e){ return {error:'sdk',detail:e.message}; }
  let stream;
  try{
    stream=await Promise.race([navigator.mediaDevices.getUserMedia({audio:true}),new Promise((_,rj)=>setTimeout(()=>rj(new Error('keine Antwort vom Mikrofon nach 8 s')),8000))]);
  }catch(e){ return {error:'mic',detail:(e&&e.name||'')+' '+(e&&e.message||'')}; }
  let mr=null, mime=''; const chunks=[];
  try{
    if(window.MediaRecorder){
      mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
      mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      mr.start();
    }
  }catch(_){ mr=null; }
  const stopAll=()=>new Promise(res=>{
    let ended=false; const end=()=>{ if(ended) return; ended=true; try{ stream.getTracks().forEach(t=>t.stop()); }catch(_){} res(); };
    if(mr&&mr.state!=='inactive'){ mr.onstop=end; try{ mr.stop(); }catch(_){ end(); } setTimeout(end,700); } else end();
  });
  return new Promise(resolve=>{
    let rec, audio, done=false, wd=null;
    const fin=o=>{
      if(done) return; done=true; azCurrent=null; clearTimeout(wd);
      try{ rec&&rec.close(); }catch(_){}
      try{ audio&&audio.close(); }catch(_){}
      stopAll().then(()=>{ if(o&&!o.error&&chunks.length) o.audio=new Blob(chunks,{type:(mr&&mr.mimeType)||mime||'audio/mp4'}); resolve(o); });
    };
    try{
      const cfg=SDK.SpeechConfig.fromSubscription(AZ.key,AZ.region.trim());
      cfg.speechRecognitionLanguage='zh-CN';
      try{ cfg.setProperty(SDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,'1500'); cfg.setProperty(SDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,'6000'); }catch(_){}
      audio=SDK.AudioConfig.fromStreamInput(stream);
      const pa=new SDK.PronunciationAssessmentConfig(refText,SDK.PronunciationAssessmentGradingSystem.HundredMark,SDK.PronunciationAssessmentGranularity.Phoneme,true);
      rec=new SDK.SpeechRecognizer(cfg,audio); pa.applyTo(rec);
      azCurrent={cancel:()=>fin({error:'aborted'})};
      wd=setTimeout(()=>fin({error:'timeout'}),25000);
      rec.recognizeOnceAsync(r=>{
        if(done) return;
        if(r.reason===SDK.ResultReason.Canceled){
          let d=''; try{ const c=SDK.CancellationDetails.fromResult(r); d=c.errorDetails||''; }catch(_){}
          return fin({error:'canceled',detail:d});
        }
        if(r.reason!==SDK.ResultReason.RecognizedSpeech) return fin({error:'no-speech'});
        let json=null; try{ json=JSON.parse(r.properties.getProperty(SDK.PropertyId.SpeechServiceResponse_JsonResult)); }catch(_){}
        const res=json&&azParse(json,s);
        if(!res) return fin({error:'no-speech'});
        AZ.usageSec+=Math.max(res.az.seconds,1); azSave();
        fin({res,raw:json});
      },err=>fin({error:'canceled',detail:String(err)}));
    }catch(e){ fin({error:'start',detail:String(e&&e.message||e)}); }
  });
}
function azErrorText(code,detail=''){
  const d=String(detail);
  if(code==='aborted') return '';
  if(code==='timeout') return 'Keine Antwort von Azure nach 30 Sekunden. Prüfe Internet und Region, dann nochmal versuchen.';
  if(code==='mic'){ if(/NotAllowed|Permission|denied/i.test(d)) return 'Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.'; return 'Das Mikrofon lässt sich nicht öffnen ('+d.trim()+'). Unter Einstellungen, Diagnose siehst du mehr.'; }
  if(code==='no-speech') return 'Nichts verstanden. Tippe auf das Mikrofon und sprich den ganzen Satz deutlich.';
  if(code==='sdk') return 'Das Azure-Modul konnte nicht geladen werden. Öffne die App über deinen Webserver (nicht direkt aus der Vorschau).';
  if(/NotAllowed|Permission|denied|getUserMedia|microphone/i.test(d)) return 'Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.';
  if(/401|Authentication|Unauthorized|invalid subscription/i.test(d)) return 'Azure lehnt Schlüssel oder Region ab. Prüfe beides in den Einstellungen.';
  if(/429|403|quota|Too many|exceeded/i.test(d)) return 'Azure verweigert die Anfrage (Kontingent aufgebraucht oder zu viele Anfragen). Warte kurz oder prüfe das Kontingent im Azure-Portal.';
  if(/WebSocket|connect|network|Failed to fetch|timeout|1006/i.test(d)) return 'Keine Verbindung zu Azure. Prüfe Internet und Region (und ob ein Werbeblocker die Verbindung sperrt).';
  return 'Die Bewertung hat nicht geklappt.';
}
