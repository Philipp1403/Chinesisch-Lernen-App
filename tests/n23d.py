import json,sys
from lib import Env
FAKE='''
(function(){
  const calls=[];window.__azcalls=calls;
  function mk(mode){
    return {
      SpeechConfig:{fromSubscription:(k,r)=>{calls.push(['cfg',k,r]);return {setProperty:(p,v)=>calls.push(['prop',p,v])}}},
      AudioInputStream:{createPushStream:f=>({write:b=>{},close:()=>calls.push(['pushclose'])})},
      AudioStreamFormat:{getWaveFormatPCM:(a,b,c)=>[a,b,c]},
      AudioConfig:{fromStreamInput:st=>{calls.push(['stream',!!(st&&st.write)]);return {close:()=>calls.push(['audioclose'])}}},
      PronunciationAssessmentGradingSystem:{HundredMark:1},PronunciationAssessmentGranularity:{Phoneme:3},
      PronunciationAssessmentConfig:function(ref,g,gr,m){calls.push(['pa',ref,m]);this.applyTo=()=>{}},
      ResultReason:{Canceled:0,RecognizedSpeech:3},PropertyId:{SpeechServiceResponse_JsonResult:9,SpeechServiceConnection_EndSilenceTimeoutMs:1,SpeechServiceConnection_InitialSilenceTimeoutMs:2},
      CancellationDetails:{fromResult:r=>({errorDetails:r.err})},
      SpeechRecognizer:function(){this.close=()=>{};this.recognizeOnceAsync=(ok,bad)=>setTimeout(()=>{
        if(window.__azmode==='401') return ok({reason:0,err:'Authentication error (401)'});
        if(window.__azmode==='silence') return ok({reason:1});
        ok({reason:3,properties:{getProperty:()=>JSON.stringify(window.__azjson)}})},2200)}
    };
  }
  window.SpeechSDK=mk();
  const og=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.__streams=[];
  navigator.mediaDevices.getUserMedia=async c=>{const st=await og(c);window.__streams.push(st);return st};
})();
'''

import datetime
e=Env(w=820,h=1100); pg=e.pg
pg.add_init_script(FAKE)
pg.add_init_script("window.__azjson=null;window.__azmode='ok'")
e.open()
pg.evaluate("""()=>{localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'azure',usageSec:0,month:'%s'}));}""" % datetime.date.today().strftime('%Y-%m'))
pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(450)
wid=pg.evaluate("()=>window.__app.LESSONS[0].words[0]")
pg.evaluate("(w)=>{startFlashcards([],1)}",wid)
pg.wait_for_selector('#mic'); pg.wait_for_timeout(300)
h=pg.evaluate("()=>{const it=SESS.items[0];const w=BYID.get(it.wid);return [w.h,w.id]}")
print('word',h)
js={'RecognitionStatus':'Success','Duration':10000000,'NBest':[{'Display':h[0],'PronunciationAssessment':{'AccuracyScore':90,'FluencyScore':90,'CompletenessScore':100,'PronScore':91},'Words':[{'Word':h[0],'PronunciationAssessment':{'AccuracyScore':90,'ErrorType':'None'}}]}]}
pg.evaluate("(j)=>{window.__azjson=j}",js)
pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=5000)
print('score',pg.inner_text('.ring'),'play',pg.locator('[data-play]').count(),'hanzi shown before draw:',pg.locator('#wc-show .hz').count())
pg.click('text=Weiter zum Zeichnen'); pg.wait_for_selector('.wbox',timeout=6000); pg.wait_for_timeout(500)
print('hanzi in show during draw:',pg.locator('#wc-show .hz').count())
pg.click('text=Lösung zeigen') if pg.locator('text=Lösung zeigen').count() else None
pg.wait_for_timeout(6000); print('msg',pg.inner_text('.wmsg') if pg.locator('.wmsg').count() else None, 'sf', pg.inner_html('#sf')[:300]); e.shot('n23_dbg.png')
print('feedback visible:',pg.locator('.fb').count(), pg.inner_text('.fb') if pg.locator('.fb').count() else '')
print('hard after:',pg.evaluate("()=>JSON.stringify(state.hard)"))
e.shot('n23_fb.png')
print('errs',e.errs); e.close()
