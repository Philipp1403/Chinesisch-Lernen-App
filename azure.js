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
  /* Ist Azure eingerichtet und hat Philipp die Engine nie selbst gewählt, gilt Azure */
  if(azConfigured()&&!AZ.engineSet&&AZ.engine!=='azure') AZ.engine='azure';
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

/* Mikrofon vorbereiten: Sprachausgabe stoppen und warten, bis sie wirklich still ist.
   Auf dem iPad bleibt die Audiositzung sonst im Wiedergabemodus, und das Mikrofon liefert nur Stille. */
async function micPrepare(){
  try{ stopSpeak(); }catch(_){}
  const t0=Date.now();
  try{ while(Date.now()-t0<1500&&(speechSynthesis.speaking||speechSynthesis.pending)) await sleep(50); }catch(_){}
  await sleep(150);
}
/* Mikrofon-Einstellungen: Welche auf diesem Gerät Ton liefert, ermittelt die Diagnose. Die App merkt sich die beste (state.settings.micVar). */
const MIC_VARIANTS=[
  {id:'std',name:'Standard',c:{audio:true}},
  {id:'raw',name:'Ohne Signalverarbeitung',c:{audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}},
  {id:'old',name:'Mit Echo- und Rauschfilter, Mono',c:{audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}}},
];
const MIC_SIG=0.02; /* ab diesem Spitzenwert (2 %) gilt Ton als angekommen */
const micVariant=()=>MIC_VARIANTS.find(v=>v.id===(state.settings.micVar||'std'))||MIC_VARIANTS[0];
async function micOpen(c){
  return Promise.race([navigator.mediaDevices.getUserMedia(c||micVariant().c),new Promise((_,rj)=>setTimeout(()=>rj(new Error('keine Antwort vom Mikrofon nach 8 s')),8000))]);
}
const REC_MIMES=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'];
/* Misst über eine Mikrofon-Einstellung, wie viel Ton ankommt: Web Audio (Analyser und ScriptProcessor, beide fest bis zum Ausgang verbunden)
   und getrennt davon die Aufnahme (MediaRecorder, danach dekodiert). So sieht man, ob der Ton schon im Mikrofonstrom fehlt oder erst in Web Audio. */
async function micProbe(variant,ms=3000){
  const out={id:variant.id,name:variant.name};
  const AC=window.AudioContext||window.webkitAudioContext; let ac=null, stream=null, mr=null;
  try{
    await micPrepare();
    stream=await micOpen(variant.c);
    const tr=stream.getAudioTracks()[0]; out.label=tr&&tr.label; out.muted=!!(tr&&tr.muted); out.track=tr&&tr.readyState;
    try{ out.settings=tr.getSettings(); }catch(_){}
    ac=new AC(); try{ await ac.resume(); }catch(_){}
    out.acState=ac.state; out.rate=ac.sampleRate;
    const src=ac.createMediaStreamSource(stream), an=ac.createAnalyser(), proc=ac.createScriptProcessor(2048,1,1), mute=ac.createGain(); mute.gain.value=0;
    an.fftSize=1024; src.connect(an); src.connect(proc); proc.connect(mute); an.connect(mute); mute.connect(ac.destination);
    let pa=0, pp=0; const buf=new Uint8Array(an.fftSize);
    proc.onaudioprocess=e=>{ const d=e.inputBuffer.getChannelData(0); for(let i=0;i<d.length;i++){ const v=Math.abs(d[i]); if(v>pp) pp=v; } };
    const chunks=[]; let mime='';
    if(window.MediaRecorder){
      try{ mime=REC_MIMES.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||''; mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
        mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); }; mr.start(); }catch(_){ mr=null; }
    }
    const end=Date.now()+ms;
    while(Date.now()<end){ an.getByteTimeDomainData(buf); for(const v of buf){ const a=Math.abs(v-128)/128; if(a>pa) pa=a; } await sleep(40); }
    out.peakAnalyser=pa; out.peakProc=pp;
    if(mr&&mr.state!=='inactive'){ await new Promise(res=>{ mr.onstop=res; try{ mr.stop(); }catch(_){ res(); } setTimeout(res,1500); }); }
    if(chunks.length){
      try{ const d=await azDecode(new Blob(chunks,{type:mime||'audio/mp4'})); let m=0; for(let i=0;i<d.data.length;i++){ const v=Math.abs(d.data[i]); if(v>m) m=v; } out.peakRec=m; }
      catch(e){ out.recErr=String(e&&e.message||e); }
    } else out.recErr='keine Aufnahme';
  }catch(e){ out.error=((e&&e.name)||'')+' '+((e&&e.message)||''); }
  finally{ try{ stream&&stream.getTracks().forEach(t=>t.stop()); }catch(_){} try{ ac&&ac.close(); }catch(_){} }
  return out;
}
/* Aufnahme (Blob) in Mono-Fließkommadaten umwandeln */
async function azDecode(blob){
  const AC=window.AudioContext||window.webkitAudioContext; const ac=new AC();
  try{
    const buf=await blob.arrayBuffer();
    const au=await new Promise((res,rj)=>{ const p=ac.decodeAudioData(buf,res,rj); if(p&&p.then) p.then(res,rj); });
    const n=au.length, ch=au.numberOfChannels, mono=new Float32Array(n);
    for(let c=0;c<ch;c++){ const d=au.getChannelData(c); for(let i=0;i<n;i++) mono[i]+=d[i]/ch; }
    return {data:mono,rate:au.sampleRate};
  } finally { try{ ac.close(); }catch(_){} }
}
function azPcm16k(mono,rate){
  const ratio=rate/16000, n=Math.floor(mono.length/ratio), out=new Int16Array(n); let peak=0;
  for(let i=0;i<mono.length;i++){ const a=Math.abs(mono[i]); if(a>peak) peak=a; }
  /* Aufnahme auf ca. 70 % Spitze anheben (höchstens 20-fach), wenn überhaupt Ton da ist */
  const g=peak>=MIC_SIG?Math.min(20,0.7/peak):1;
  for(let i=0;i<n;i++){
    const a=Math.floor(i*ratio), b=Math.min(mono.length,Math.floor((i+1)*ratio)); let sum=0;
    for(let k=a;k<b;k++) sum+=mono[k];
    const v=Math.max(-1,Math.min(1,g*sum/Math.max(1,b-a)));
    out[i]=v<0?v*0x8000:v*0x7FFF;
  }
  return {pcm:out,peak,gain:g};
}

/* Aufnahme + Bewertung. Antwort: {res, audio} oder {error, detail}
   Das Mikrofon wird hier selbst geöffnet und über einen eigenen AudioContext (16 kHz, 16 Bit) als Push-Stream an Azure geschickt.
   So bleibt der AudioContext unter eigener Kontrolle (iOS startet ihn sonst gern „angehalten“ und Azure hört nur Stille).
   Zusätzlich wird mitgeschnitten, damit man sich anhören kann. Am Ende wird alles geschlossen (Mikrofon-Anzeige geht aus). */
async function azAssessLive(s,refText,opts={}){
  const AC=window.AudioContext||window.webkitAudioContext; let ac=null; const t0=Date.now();
  const closeAc=()=>{ try{ ac&&ac.close(); }catch(_){} };
  let SDK;
  try{ SDK=await loadSdk(); }catch(e){ return {error:'sdk',detail:e.message}; }
  await micPrepare();
  let stream;
  try{ stream=await micOpen(); }catch(e){ return {error:'mic',detail:(e&&e.name||'')+' '+(e&&e.message||'')}; }
  /* AudioContext erst nach dem Mikrofon anlegen: genau die Reihenfolge, die der Mikrofon-Test auf dem iPad bewiesen hat (Pegel 42 %).
     Vorher angelegt, kann iOS ihn beim Öffnen des Mikrofons anhalten, und Azure hört dann nur Stille. */
  try{ ac=new AC(); await Promise.race([ac.resume(),sleep(1500)]); }catch(_){ ac=null; }
  if(!ac){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(_){} return {error:'mic',detail:'Kein AudioContext verfügbar'}; }
  let mr=null, mime=''; const chunks=[];
  try{
    if(window.MediaRecorder){
      mime=REC_MIMES.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
      mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
      mr.start();
    }
  }catch(_){ mr=null; }
  let src=null, proc=null, mute=null, peak=0, push=null, gain=1, gmax=1, hold=0;
  const stopAll=()=>new Promise(res=>{
    let ended=false;
    const end=()=>{
      if(ended) return; ended=true;
      try{ proc&&(proc.onaudioprocess=null); proc&&proc.disconnect(); src&&src.disconnect(); mute&&mute.disconnect(); }catch(_){}
      try{ stream.getTracks().forEach(t=>t.stop()); }catch(_){}
      closeAc(); res();
    };
    if(mr&&mr.state!=='inactive'){ mr.onstop=end; try{ mr.stop(); }catch(_){ end(); } setTimeout(end,700); } else end();
  });
  return new Promise(resolve=>{
    let rec, audio, done=false, wd=null;
    const fin=o=>{
      if(done) return; done=true; azCurrent=null; clearTimeout(wd);
      const acSt=ac.state;
      try{ push&&push.close(); }catch(_){}
      try{ rec&&rec.close(); }catch(_){}
      try{ audio&&audio.close(); }catch(_){}
      stopAll().then(()=>{
        if(o&&(!o.error||o.error==='silent'||o.error==='no-speech')&&chunks.length) o.audio=new Blob(chunks,{type:(mr&&mr.mimeType)||mime||'audio/mp4'});
        if(o){ o.peak=peak; o.dbg=`Web Audio ${acSt}, Spitze ${Math.round(peak*100)} %, Verstärkung bis ${gmax.toFixed(1)}x, Aufnahme ${chunks.reduce((a,c)=>a+c.size,0)} Byte, ${Date.now()-t0} ms`; }
        resolve(o);
      });
    };
    try{
      const cfg=azConfigNew(SDK);
      push=SDK.AudioInputStream.createPushStream(SDK.AudioStreamFormat.getWaveFormatPCM(16000,16,1));
      audio=SDK.AudioConfig.fromStreamInput(push);
      src=ac.createMediaStreamSource(stream);
      proc=ac.createScriptProcessor(4096,1,1);
      mute=ac.createGain(); mute.gain.value=0;
      const ratio=ac.sampleRate/16000;
      /* Automatische Verstärkung: leise Stimmen werden angehoben (Ziel: lauteste Stellen bei ca. 40 %), höchstens 6-fach.
         Unter 2,5 % Spitze wird nichts verstärkt (das ist Rauschen, sonst erkennt Azure das Ende der Aussage nicht). Runter sofort, hoch langsam. */
      const TARGET=0.4, MAXG=6, GATE=0.025;
      proc.onaudioprocess=e=>{
        if(done) return;
        const inp=e.inputBuffer.getChannelData(0); let cp=0;
        for(let i=0;i<inp.length;i++){ const a=Math.abs(inp[i]); if(a>cp) cp=a; }
        if(cp>peak) peak=cp;
        if(opts.onLevel){ try{ opts.onLevel(cp); }catch(_){} }
        hold=Math.max(cp,hold*0.9);
        const want=hold<GATE?1:Math.min(MAXG,Math.max(1,TARGET/hold));
        gain=want<gain?want:gain+(want-gain)*0.25; if(gain>gmax) gmax=gain;
        const n=Math.floor(inp.length/ratio); const out=new Int16Array(n);
        for(let i=0;i<n;i++){
          const a=Math.floor(i*ratio), b=Math.min(inp.length,Math.floor((i+1)*ratio)); let sum=0;
          for(let k=a;k<b;k++) sum+=inp[k];
          const v=Math.max(-1,Math.min(1,gain*sum/Math.max(1,b-a)));
          out[i]=v<0?v*0x8000:v*0x7FFF;
        }
        try{ push.write(out.buffer); }catch(_){}
      };
      src.connect(proc); proc.connect(mute); mute.connect(ac.destination);
      const pa=new SDK.PronunciationAssessmentConfig(refText,SDK.PronunciationAssessmentGradingSystem.HundredMark,SDK.PronunciationAssessmentGranularity.Phoneme,true);
      rec=new SDK.SpeechRecognizer(cfg,audio); pa.applyTo(rec);
      azCurrent={cancel:()=>fin({error:'aborted'})};
      wd=setTimeout(()=>fin({error:'timeout'}),25000);
      const silent=()=>peak<0.015;
      rec.recognizeOnceAsync(r=>{
        if(done) return;
        fin(azResult(SDK,r,s,silent(),'AudioContext '+ac.state));
      },err=>fin({error:'canceled',detail:String(err)}));
    }catch(e){ fin({error:'start',detail:String(e&&e.message||e)}); }
  });
}
/* Ergebnis des Azure-Erkenners auswerten (Livemikrofon und Aufnahme teilen sich das) */
function azResult(SDK,r,s,silent,silentDetail){
  if(r.reason===SDK.ResultReason.Canceled){
    let d=''; try{ const c=SDK.CancellationDetails.fromResult(r); d=c.errorDetails||''; }catch(_){}
    return {error:'canceled',detail:d};
  }
  if(r.reason!==SDK.ResultReason.RecognizedSpeech) return silent?{error:'silent',detail:silentDetail}:{error:'no-speech'};
  let json=null; try{ json=JSON.parse(r.properties.getProperty(SDK.PropertyId.SpeechServiceResponse_JsonResult)); }catch(_){}
  const res=json&&azParse(json,s);
  if(!res) return silent?{error:'silent',detail:silentDetail}:{error:'no-speech'};
  AZ.usageSec+=Math.max(res.az.seconds,1); azSave();
  return {res,raw:json};
}
function azConfigNew(SDK){
  if(!/^[a-z0-9]{3,30}$/.test(String(AZ.region).trim())) throw new Error('Ungültige Region');   /* die Region wird Teil des Servernamens */
  const cfg=SDK.SpeechConfig.fromSubscription(AZ.key,AZ.region.trim());
  cfg.speechRecognitionLanguage='zh-CN';
  try{ cfg.setProperty(SDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,'1500'); cfg.setProperty(SDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,'6000'); }catch(_){}
  return cfg;
}
/* Bewertung einer fertigen Aufnahme (16 kHz, 16 Bit, mono) */
async function azAssessPcm(s,refText,pcm){
  let SDK; try{ SDK=await loadSdk(); }catch(e){ return {error:'sdk',detail:e.message}; }
  return new Promise(resolve=>{
    let rec=null, audio=null, push=null, done=false, wd=null;
    const fin=o=>{ if(done) return; done=true; azCurrent=null; clearTimeout(wd); try{ push&&push.close(); }catch(_){} try{ rec&&rec.close(); }catch(_){} try{ audio&&audio.close(); }catch(_){} resolve(o); };
    try{
      const cfg=azConfigNew(SDK);
      push=SDK.AudioInputStream.createPushStream(SDK.AudioStreamFormat.getWaveFormatPCM(16000,16,1));
      audio=SDK.AudioConfig.fromStreamInput(push);
      const pa=new SDK.PronunciationAssessmentConfig(refText,SDK.PronunciationAssessmentGradingSystem.HundredMark,SDK.PronunciationAssessmentGranularity.Phoneme,true);
      rec=new SDK.SpeechRecognizer(cfg,audio); pa.applyTo(rec);
      azCurrent={cancel:()=>fin({error:'aborted'})}; wd=setTimeout(()=>fin({error:'timeout'}),25000);
      const bytes=new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      for(let o=0;o<bytes.length;o+=32000) push.write(bytes.slice(o,o+32000).buffer);
      push.close(); push=null;
      rec.recognizeOnceAsync(r=>{ if(!done) fin(azResult(SDK,r,s,false,'')); },err=>fin({error:'canceled',detail:String(err)}));
    }catch(e){ fin({error:'start',detail:String(e&&e.message||e)}); }
  });
}
/* Aufnahme + Bewertung mit Rückfall: Liefert Web Audio nur Stille, die Aufnahme (MediaRecorder) aber Ton, wird die Aufnahme bewertet.
   Das ist auf dem iPad der Weg, wenn der Mikrofonstrom in Web Audio ankommt, aber leer ist. */
async function azAssess(s,refText,opts){
  const r=await azAssessLive(s,refText,opts);
  if((r.error==='silent'||r.error==='no-speech')&&r.audio){
    try{
      const d=await azDecode(r.audio), p=azPcm16k(d.data,d.rate);
      r.dbg=(r.dbg||'')+`, Aufnahme gelesen: Spitze ${Math.round(p.peak*100)} %, angehoben ${p.gain.toFixed(1)}x`;
      if(p.peak>=MIC_SIG){ const r2=await azAssessPcm(s,refText,p.pcm); r2.dbg=r.dbg+(r2.error?', zweiter Versuch: '+r2.error:', zweiter Versuch ok'); if(!r2.error){ r2.audio=r.audio; r2.viaRecorder=true; } return r2; }
    }catch(e){ r.dbg=(r.dbg||'')+', Aufnahme nicht lesbar: '+String(e&&e.message||e); }
  }
  return r;
}
function azErrorText(code,detail=''){
  const d=String(detail);
  if(code==='aborted') return '';
  if(code==='timeout') return 'Keine Antwort von Azure nach 30 Sekunden. Prüfe Internet und Region, dann nochmal versuchen.';
  if(code==='mic'){ if(/NotAllowed|Permission|denied/i.test(d)) return 'Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.'; return 'Das Mikrofon lässt sich nicht öffnen ('+d.trim()+'). Unter Einstellungen, Diagnose siehst du mehr.'; }
  if(code==='silent') return 'Das Mikrofon liefert nur Stille. Öffne Einstellungen, Diagnose: Der Mikrofon-Test probiert mehrere Einstellungen durch und merkt sich die, die Ton liefert.';
  if(code==='no-speech') return 'Nichts verstanden. Tippe auf das Mikrofon und sprich den ganzen Satz deutlich.';
  if(code==='sdk') return 'Das Azure-Modul konnte nicht geladen werden. Öffne die App über deinen Webserver (nicht direkt aus der Vorschau).';
  if(/NotAllowed|Permission|denied|getUserMedia|microphone/i.test(d)) return 'Mikrofon blockiert. Erlaube den Zugriff in den Browser- bzw. iPad-Einstellungen.';
  if(/401|Authentication|Unauthorized|invalid subscription/i.test(d)) return 'Azure lehnt Schlüssel oder Region ab. Prüfe beides in den Einstellungen.';
  if(/429|403|quota|Too many|exceeded/i.test(d)) return 'Azure verweigert die Anfrage (Kontingent aufgebraucht oder zu viele Anfragen). Warte kurz oder prüfe das Kontingent im Azure-Portal.';
  if(/WebSocket|connect|network|Failed to fetch|timeout|1006/i.test(d)) return 'Keine Verbindung zu Azure. Prüfe Internet und Region (und ob ein Werbeblocker die Verbindung sperrt).';
  return 'Die Bewertung hat nicht geklappt.';
}
