"""Prüft die Audiodaten, die wirklich an Azure gehen: bekannter Ton (440 Hz, Spitze 30 %) rein, Frequenz und Pegel am Ende der Kette messen."""
import math,struct,wave,os,sys,subprocess,time,json
import numpy as np
from lib import testroot
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/n38'; os.makedirs(OUT,exist_ok=True)
AMP=float(os.environ.get('AMP','0.3'))
wav=os.path.join(OUT,'tone.wav'); sr=48000
with wave.open(wav,'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(b''.join(struct.pack('<h',int(AMP*32767*math.sin(2*math.pi*440*i/sr))) for i in range(sr*8)))
FAKE='''
(function(){
  window.__pcm=[];
  window.SpeechSDK={
    SpeechConfig:{fromSubscription:()=>({setProperty:()=>{}})},
    AudioInputStream:{createPushStream:f=>({write:b=>{window.__pcm.push(Array.from(new Int16Array(b)))},close:()=>{}})},
    AudioStreamFormat:{getWaveFormatPCM:(a,b,c)=>[a,b,c]},
    AudioConfig:{fromStreamInput:st=>({close:()=>{}})},
    PronunciationAssessmentGradingSystem:{HundredMark:1},PronunciationAssessmentGranularity:{Phoneme:3},
    PronunciationAssessmentConfig:function(){this.applyTo=()=>{}},
    ResultReason:{Canceled:0,RecognizedSpeech:3},PropertyId:{SpeechServiceResponse_JsonResult:9,SpeechServiceConnection_EndSilenceTimeoutMs:1,SpeechServiceConnection_InitialSilenceTimeoutMs:2},
    CancellationDetails:{fromResult:r=>({errorDetails:r.err})},
    SpeechRecognizer:function(){this.close=()=>{};this.recognizeOnceAsync=(ok,bad)=>setTimeout(()=>ok({reason:1}),4000)}
  };
})();
'''
srv=subprocess.Popen(['python3','-m','http.server','8765','-d',testroot()],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
pw=sync_playwright().start()
b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+wav])
try:
    ctx=b.new_context(viewport={'width':820,'height':1000},service_workers='block'); pg=ctx.new_page(); pg.add_init_script(FAKE)
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
    pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'azure',usageSec:0,month:m}))",time.strftime('%Y-%m'))
    pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
    pg.evaluate("()=>{const a=window.__app;a.startPractice('speak',[a.LESSONS[0].id])}"); pg.wait_for_selector('#mic'); pg.wait_for_timeout(300)
    pg.click('#mic'); pg.wait_for_timeout(1500); pg.screenshot(path='n38_listen.png')
    pg.click('#mic') if False else None
    pg.wait_for_function("()=>/Nichts verstanden|Stille|Technik|\\[/.test(document.querySelector('#mnote').textContent)",timeout=30000)
    print('Meldung:',pg.inner_text('#mnote'))
    chunks=pg.evaluate("window.__pcm"); x=np.array([v for c in chunks for v in c],dtype=np.float64)/32768.0
    print('gepushte Samples',len(x),'= %.2f s bei 16 kHz'%(len(x)/16000),'| Chunks',len(chunks))
    # mittleren Teil analysieren (Anlauf weglassen)
    seg=x[16000:] if len(x)>32000 else x
    spec=np.abs(np.fft.rfft(seg*np.hanning(len(seg)))); f=np.fft.rfftfreq(len(seg),1/16000); k=spec.argmax()
    print('Spitzenfrequenz %.1f Hz (erwartet 440) | Spitze %.3f | RMS %.3f (Sinus-Spitze %.2f -> RMS %.3f)'%(f[k],np.abs(seg).max(),np.sqrt((seg**2).mean()),AMP,AMP/math.sqrt(2)))
    print('Fehler:',errs)
finally:
    b.close(); pw.stop(); srv.terminate()
