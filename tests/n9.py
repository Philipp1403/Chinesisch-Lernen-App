import json,sys
from lib import Env
FAKE='''
(function(){
  const calls=[];window.__azcalls=calls;
  function mk(mode){
    return {
      SpeechConfig:{fromSubscription:(k,r)=>{calls.push(['cfg',k,r]);return {setProperty:(p,v)=>calls.push(['prop',p,v])}}},
      AudioInputStream:{createPushStream:f=>{window.__pushed=0;return {write:b=>{window.__pushed+=b.byteLength},close:()=>calls.push(['pushclose'])}}},
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
e=Env(w=820,h=1100); pg=e.pg
pg.add_init_script(FAKE)
pg.add_init_script("window.__azjson=null;window.__azmode='ok'")
e.open()
# Tower on home: initial
pg.screenshot(path='n9_home0.png')
# set progress: learn all words of 3 lessons + part, via state
pg.evaluate("""()=>{const a=window.__app;const st=a.state();let n=0;for(const l of a.LESSONS.slice(0,12)){for(const id of l.words){st.cards[id]={i:8,e:2.5,d:0,due:0,r:1}}}a.save();a.go('learn')}""")
pg.wait_for_timeout(500); e.shot('n9_home_part.png')
# configure azure and run a speak item
pg.evaluate("""()=>{localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'azure',usageSec:0,month:'%s'}));}""" % __import__('datetime').date.today().strftime('%Y-%m'))
pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(450)
sid=pg.evaluate("()=>window.__app.LESSONS[0].sentences[0]")
pg.evaluate("""(sid)=>{const a=window.__app;a.startPractice('speak',[a.LESSONS[0].id])}""",sid)
pg.wait_for_selector('#mic'); pg.wait_for_timeout(400)
txt=pg.evaluate("()=>[...document.querySelectorAll('#sent .hz, #sent ruby')].length")
# build json for current sentence: words per token
toks=pg.evaluate("()=>{const it=window.__app.S.items[window.__app.S.i];const s=window.__app.SBYID.get(it.sid);return s.t.filter(t=>!t.punc).map(t=>t.h)}")
print('tokens',toks)
words=[{'Word':t,'PronunciationAssessment':{'AccuracyScore':(95 if i!=1 else 40),'ErrorType':'None' if i!=1 else 'Mispronunciation'}} for i,t in enumerate(toks)]
pg.evaluate("(j)=>{window.__azjson=j}",{'RecognitionStatus':'Success','Duration':20000000,'DisplayText':''.join(toks)+'。','NBest':[{'Display':''.join(toks)+'。','PronunciationAssessment':{'AccuracyScore':82,'FluencyScore':90,'CompletenessScore':100,'PronScore':85},'Words':words}]})
pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=5000); pg.wait_for_timeout(500)
print('score',pg.inner_text('.ring'), pg.inner_text('.azsub'))
print('marks',pg.evaluate("()=>[...document.querySelectorAll('#sent [class^=cs-],#sent [class*=\" cs-\"]')].map(x=>x.className)"))
print('calls',pg.evaluate("()=>window.__azcalls"))
print('pushed bytes',pg.evaluate("()=>window.__pushed"))
print('tracks live after result:',pg.evaluate("()=>window.__streams.map(s=>s.getTracks().map(t=>t.readyState))"))
print('play btn:',pg.locator('[data-play]').count(),'model btn:',pg.locator('[data-model]').count())
if pg.locator('[data-play]').count(): pg.click('[data-play]'); pg.wait_for_timeout(300)
e.shot('n9_speak_az.png')
# error: 401
pg.click('text=Nochmal sprechen'); pg.wait_for_selector('#mic'); pg.evaluate("()=>{window.__azmode='401'}")
pg.click('#mic'); pg.wait_for_function("()=>/Schlüssel/.test(document.querySelector('#mnote').textContent)",timeout=5000); print('401:',pg.inner_text('#mnote'))
pg.evaluate("()=>{window.__azmode='silence'}"); pg.click('#mic'); pg.wait_for_function("()=>/Nichts verstanden/.test(document.querySelector('#mnote').textContent)",timeout=5000); print('silence ok')
# settings test
pg.evaluate("()=>exitSession()")
pg.click('#tabs >> text=Einstellungen'); pg.wait_for_selector('#azcard'); pg.evaluate("()=>{window.__azmode='ok'}")
pg.click('[data-aztest]'); pg.wait_for_function("()=>/Funktioniert/.test(document.querySelector('#azres').textContent)",timeout=5000); print(pg.inner_text('#azres'))
pg.locator('#azcard').scroll_into_view_if_needed(); e.shot('n9_settings.png')
print('usage',pg.evaluate("()=>JSON.parse(localStorage.getItem('hanyu.azure.v1')).usageSec"))
print('errs',e.errs); e.close()
