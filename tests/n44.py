"""Prüft alle Übungen in Frage- und Rückmeldezustand: Muss man scrollen (Seite höher als das Fenster)? Misst sbody.scrollHeight - clientHeight."""
import os,sys,datetime
from lib import *
FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
SDK='''
(function(){ window.SpeechSDK={SpeechConfig:{fromSubscription:()=>({setProperty:()=>{}})},AudioInputStream:{createPushStream:f=>({write:()=>{},close:()=>{}})},AudioStreamFormat:{getWaveFormatPCM:()=>[]},AudioConfig:{fromStreamInput:st=>({close:()=>{}})},
 PronunciationAssessmentGradingSystem:{HundredMark:1},PronunciationAssessmentGranularity:{Phoneme:3},PronunciationAssessmentConfig:function(){this.applyTo=()=>{}},
 ResultReason:{Canceled:0,RecognizedSpeech:3},PropertyId:{SpeechServiceResponse_JsonResult:9,SpeechServiceConnection_EndSilenceTimeoutMs:1,SpeechServiceConnection_InitialSilenceTimeoutMs:2},CancellationDetails:{fromResult:r=>({})},
 SpeechRecognizer:function(){this.close=()=>{};this.recognizeOnceAsync=(ok)=>setTimeout(()=>ok({reason:3,properties:{getProperty:()=>JSON.stringify(window.__azjson)}}),1500)}}; })();
'''
CFG=[(1180,716,True),(820,1136,False)]
over=[]
def measure(pg):
    return pg.evaluate("(()=>{const s=document.querySelector('.sbody');if(!s) return null;const f=document.querySelector('#sf');return {over:s.scrollHeight-s.clientHeight,ch:s.clientHeight,foot:f&&!f.classList.contains('hidden')?Math.round(f.getBoundingClientRect().height):0}})()")
for W,H,dark in CFG:
    e=Env(w=W,h=H,dark=dark,sw=False); pg=e.pg; pg.add_init_script(FAKE); pg.add_init_script(SDK); pg.add_init_script("window.__azjson=null")
    tag=f'{W}x{H}'
    def rec(name,m):
        print(f'{tag} {name:28s}',m)
        if m and m['over']>2: over.append((tag,name,m['over']))
    def case(name,start,act=None,wait='.sbody *',after_wait=None):
        try:
            pg.evaluate(start); pg.wait_for_timeout(700); rec(name+' Frage',measure(pg)); e.shot(f'n44_{tag}_{name}_q.png')
            if act:
                act(); pg.wait_for_timeout(700); rec(name+' Rückmeldung',measure(pg)); e.shot(f'n44_{tag}_{name}_f.png')
        except Exception as ex: print(tag,name,'FEHLER',str(ex)[:120])
        finally:
            try: pg.evaluate("exitSession()")
            except Exception: pass
    def click_opt(sel='.opt'):
        def f():
            pg.click(sel+' >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]',timeout=4000)
        return f
    def giveup():
        pg.click('.sfoot [data-fb="0"]'); pg.wait_for_selector('.sfoot.no,.sfoot.ok',timeout=4000)
    try:
        e.open()
        case('choose',"__app.startPractice('choose',[])",click_opt())
        case('cloze',"__app.startPractice('cloze',[])",click_opt())
        case('tones',"__app.startPractice('tones',[])",click_opt('.opt.tone'))
        case('listensent',"__app.startPractice('listensent',[])",click_opt('.opts.long .opt'))
        case('pairs',"__app.startPractice('pairs',[])")
        for t in ['build','trans','dictate']: case(t,f"__app.startPractice('{t}',[])",giveup)
        case('draw',"__app.startPractice('draw',[])")
        case('wdrill',"startWriteDrill({scope:[],demo:false,reps:3,count:3,help:'on',mode:'trace'})")
        case('wcard',"startFlashcards([],5)")
        case('intro',"__app.startLearn('gruss')")
        for mode in ['read','listen']:
            case('review_'+mode,"(()=>{const a=__app,st=a.state();st.cards={};for(const id of a.LESSONS[0].words.slice(0,3)) st.cards[id]={e:2.5,i:0,r:0,l:0,s:0,d:Date.now()-1000};st.settings.modes={read:%s,write:false,listen:%s};a.startReview()})()"%(('true','false') if mode=='read' else ('false','true')),lambda: (pg.click('text=Antwort zeigen'),pg.wait_for_selector('[data-rate]',timeout=4000)))
        # Nachsprechen mit Azure-Ergebnis
        pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'K',region:'westeurope',engine:'azure',usageSec:0,month:m}))",datetime.date.today().strftime('%Y-%m'))
        pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
        def speak_result():
            toks=pg.evaluate("(()=>{const it=SESS.items[SESS.i];return SBYID.get(it.sid).t.filter(t=>!t.punc).map(t=>t.h)})()")
            words=[{'Word':x,'PronunciationAssessment':{'AccuracyScore':(90 if i%2==0 else 55),'ErrorType':'None'}} for i,x in enumerate(toks)]
            pg.evaluate("(j)=>{window.__azjson=j}",{'RecognitionStatus':'Success','Duration':20000000,'DisplayText':''.join(toks),'NBest':[{'Display':''.join(toks),'PronunciationAssessment':{'AccuracyScore':77,'FluencyScore':100,'CompletenessScore':100,'PronScore':86},'Words':words}]})
            pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=8000)
        case('speak',"__app.startPractice('speak',[])",speak_result)
        print(tag,'errs',e.errs)
    finally: e.close()
print('ÜBERLÄNGE (Pixel, die man scrollen müsste):'); [print(' ',o) for o in over] if over else print('  keine')
