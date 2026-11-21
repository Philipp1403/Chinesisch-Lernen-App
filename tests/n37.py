import json,datetime
from lib import Env
FAKE_SDK='''
(function(){
  const calls=[];window.__azcalls=calls;window.__recogs=0;
  window.SpeechSDK={
    SpeechConfig:{fromSubscription:(k,r)=>({setProperty:()=>{}})},
    AudioInputStream:{createPushStream:f=>{window.__pushed=window.__pushed||0;return {write:b=>{window.__pushed+=b.byteLength},close:()=>{}}}},
    AudioStreamFormat:{getWaveFormatPCM:(a,b,c)=>[a,b,c]},
    AudioConfig:{fromStreamInput:st=>({close:()=>{}})},
    PronunciationAssessmentGradingSystem:{HundredMark:1},PronunciationAssessmentGranularity:{Phoneme:3},
    PronunciationAssessmentConfig:function(){this.applyTo=()=>{}},
    ResultReason:{Canceled:0,RecognizedSpeech:3},PropertyId:{SpeechServiceResponse_JsonResult:9,SpeechServiceConnection_EndSilenceTimeoutMs:1,SpeechServiceConnection_InitialSilenceTimeoutMs:2},
    CancellationDetails:{fromResult:r=>({errorDetails:r.err})},
    SpeechRecognizer:function(){this.close=()=>{};this.recognizeOnceAsync=(ok,bad)=>{const n=++window.__recogs;setTimeout(()=>{
      if(window.__azmode==='first-silent'&&n===1) return ok({reason:1});
      ok({reason:3,properties:{getProperty:()=>JSON.stringify(window.__azjson)}})},(window.__azmode==='first-silent'&&n===1)?2500:300)}}
  };
})();
'''
# Web Audio liefert Stille (Simulation des iPad-Fehlers), die Aufnahme aber nicht
SILENT_WA='''
(function(){ const P=(window.AudioContext||window.webkitAudioContext).prototype; const o=P.createMediaStreamSource;
  P.createMediaStreamSource=function(st){ if(window.__silentWA){ const g=this.createGain(); g.gain.value=0; const c=this.createConstantSource(); c.start(); c.connect(g); g.connect=g.connect.bind(g); return g; } return o.call(this,st); }; })();
'''
today=datetime.date.today().strftime('%Y-%m')
e=Env(w=820,h=1100,sw=False); pg=e.pg
pg.add_init_script(FAKE_SDK); pg.add_init_script(SILENT_WA); pg.add_init_script("window.__azjson=null;window.__azmode='ok';window.__silentWA=false")
try:
    # C) Engine: Azure eingerichtet, nie selbst gewählt -> Azure
    e.open()
    pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'browser',usageSec:0,month:m}))",today)
    pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
    print('Engine nach Einrichtung (nie gewählt):',pg.evaluate("AZ.engine"),'active',pg.evaluate("azActive()")); assert pg.evaluate("azActive()")
    pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'browser',engineSet:true,usageSec:0,month:m}))",today)
    pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
    print('Engine, selbst auf Browser gestellt:',pg.evaluate("AZ.engine")); assert pg.evaluate("AZ.engine")=='browser'
    pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'azure',usageSec:0,month:m}))",today)
    pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
    # A) Diagnose mit Test-Mikrofon
    pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(300)
    pg.click('[data-diag]'); pg.wait_for_function("()=>/Ergebnis|Fehler/.test(document.querySelector('#diagres').innerText)",timeout=40000)
    t=pg.inner_text('#diagres'); print(t[:1500]); e.shot('n37_diag.png')
    assert 'Ton kommt an' in t,'Diagnose findet keinen Ton'
    print('micVar:',pg.evaluate("__app.state().settings.micVar"))
    # B) Web Audio stumm, Aufnahme normal: Sprechen mit Rückfall
    pg.wait_for_function("()=>/Fertig/.test(document.querySelector('#diagres').innerText)",timeout=20000)
    pg.evaluate("window.__silentWA=true")
    pg.click('[data-diag]'); pg.wait_for_function("()=>/Ergebnis|Fehler/.test(document.querySelector('#diagres').innerText)",timeout=40000)
    t=pg.inner_text('#diagres'); print('--- Web Audio stumm ---'); print('\n'.join(l for l in t.split('\n') if 'Ergebnis' in l or 'Web Audio' in l))
    assert 'bewertet daher die Aufnahme' in t,'Rückfall auf die Aufnahme nicht erkannt'
    pg.wait_for_function("()=>/Fertig/.test(document.querySelector('#diagres').innerText)",timeout=20000)
    pg.evaluate("()=>{const a=window.__app;a.go('learn');a.startPractice('speak',[a.LESSONS[0].id])}"); pg.wait_for_selector('#mic'); pg.wait_for_timeout(400)
    toks=pg.evaluate("()=>{const it=window.__app.S.items[window.__app.S.i];const s=window.__app.SBYID.get(it.sid);return s.t.filter(t=>!t.punc).map(t=>t.h)}")
    words=[{'Word':x,'PronunciationAssessment':{'AccuracyScore':90,'ErrorType':'None'}} for x in toks]
    pg.evaluate("(j)=>{window.__azjson=j; window.__azmode='first-silent'; window.__recogs=0}",{'RecognitionStatus':'Success','Duration':20000000,'DisplayText':''.join(toks),'NBest':[{'Display':''.join(toks),'PronunciationAssessment':{'AccuracyScore':90,'FluencyScore':90,'CompletenessScore':100,'PronScore':90},'Words':words}]})
    pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=30000)
    print('Rückfall-Ergebnis: Score',pg.inner_text('.ring'),'| Erkenner-Aufrufe',pg.evaluate("window.__recogs"),'| gepusht',pg.evaluate("window.__pushed"))
    assert pg.evaluate("window.__recogs")==2,'zweiter Erkenner (Aufnahme) wurde nicht gestartet'
    e.shot('n37_fallback.png')
    print('errs',e.errs)
finally: e.close()
