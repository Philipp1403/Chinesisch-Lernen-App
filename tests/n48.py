"""Content-Security-Policy: Die App darf durch die CSP in index.html nichts verlieren, und die CSP muss wirklich greifen.
1) Alle Ansichten und Übungen durchlaufen, dabei jeden Verstoß (securitypolicyviolation) mitzählen: erwartet 0.
2) Echtes Azure-SDK nachladen (nicht die Attrappe): erwartet geladen, 0 Verstöße.
3) Verbindungsziele prüfen: erlaubte Hosts dürfen keinen Verstoß melden, fremde Hosts müssen einen melden.
4) Negativtest: eingeschleuster Inline-Code und fremde Skripte müssen blockiert werden."""
import os,sys
from lib import *
FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
LISTEN="window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));"
fails=[]
def check(name,ok,info=''):
    print(('OK   ' if ok else 'FAIL '),name,info)
    if not ok: fails.append(name)
e=Env(w=820,h=1136,sw=False); pg=e.pg; pg.add_init_script(LISTEN); pg.add_init_script(FAKE)
try:
    # Die Seite muss die CSP wirklich enthalten
    e.open()
    pol=pg.evaluate("document.querySelector('meta[http-equiv=Content-Security-Policy]')&&document.querySelector('meta[http-equiv=Content-Security-Policy]').content")
    check('CSP-Meta vorhanden',bool(pol))
    # 1) Ansichten und Übungen
    def case(name,start):
        try:
            pg.evaluate(start); pg.wait_for_timeout(600)
        except Exception as ex: print('Fehler',name,str(ex)[:100])
        finally:
            try: pg.evaluate("exitSession()")
            except Exception: pass
    for t in ['choose','cloze','tones','listensent','pairs','build','trans','dictate','draw','speak']:
        case(t,f"__app.startPractice('{t}',[])")
    case('wdrill',"startWriteDrill({scope:[],demo:false,reps:3,count:3,help:'on',mode:'trace'})")
    case('wcard',"startFlashcards([],5)")
    case('intro',"__app.startLearn('gruss')")
    # Tabs durchklicken
    for sel in pg.query_selector_all('#tabs button, #tabs a'):
        try: sel.click(); pg.wait_for_timeout(350)
        except Exception: pass
    # Einstellungen und Diagnose öffnen (Blätter, Sheets)
    for js in ["typeof openSettings==='function'&&openSettings()","typeof openDiag==='function'&&openDiag()"]:
        try: pg.evaluate(js); pg.wait_for_timeout(400)
        except Exception: pass
    v=pg.evaluate("window.__csp")
    check('Ansichten und Übungen ohne CSP-Verstoß',len(v)==0,str(v[:5]))
    # 2) Echtes SDK laden (ohne Attrappe)
    p2=pg
    try:
        pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500)
        ok=p2.evaluate("loadSdk().then(s=>!!(s&&s.SpeechConfig),()=>false)") if p2.evaluate("typeof loadSdk")=='function' else None
        if ok is None:
            ok=p2.evaluate("new Promise(r=>{const s=document.createElement('script');s.src='azure-speech-sdk.min.js';s.onload=()=>r(!!(window.SpeechSDK&&window.SpeechSDK.SpeechConfig));s.onerror=()=>r(false);document.head.appendChild(s)})")
        check('Echtes Azure-SDK lädt unter CSP',bool(ok))
        check('SDK-Laden ohne Verstoß',len(p2.evaluate("window.__csp"))==0,str(p2.evaluate("window.__csp")))
        # 3) Verbindungsziele: Verstoß-Ereignis kommt synchron beim Aufbau, unabhängig davon, ob das Netz erreichbar ist
        def conn(url,ws=False):
            return p2.evaluate("""(u)=>new Promise(r=>{window.__csp.length=0;
              try{ if(u.startsWith('ws')){ const w=new WebSocket(u); w.onerror=()=>{};w.onopen=()=>w.close(); }else{ fetch(u,{mode:'no-cors'}).catch(()=>{}); } }catch(x){}
              setTimeout(()=>r(window.__csp.length),600)})""",url)
        allowed=['https://api.github.com/gists','https://gist.githubusercontent.com/x/y/raw/z',
                 'wss://germanywestcentral.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1',
                 'wss://westeurope.stt.speech.microsoft.com/x','wss://germanywestcentral.s2s.speech.microsoft.com/x',
                 'https://germanywestcentral.api.cognitive.microsoft.com/sts/v1.0/issueToken',
                 'https://germanywestcentral.tts.speech.microsoft.com/cognitiveservices/v1',
                 'https://hanyu-test.cognitiveservices.azure.com/x']
        for u in allowed: check('erlaubt: '+u[:60],conn(u)==0)
        for u in ['https://evil.example.com/steal','wss://evil.example.com/x','https://cdn.jsdelivr.net/npm/x','https://api.github.com.evil.com/x']:
            check('blockiert: '+u[:60],conn(u)>0)
        # 4) Negativtests: Einschleusen von Code
        r=p2.evaluate("""new Promise(r=>{window.__csp.length=0;window.__pwned=false;
          const s=document.createElement('script');s.textContent='window.__pwned=true';document.head.appendChild(s);
          const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/lodash/lodash.min.js';document.head.appendChild(x);
          const d=document.createElement('div');d.innerHTML='<img src=x onerror="window.__pwned=true">';document.body.appendChild(d);
          setTimeout(()=>r({pwned:window.__pwned,viol:window.__csp.slice()}),800)})""")
        check('Inline-Skript wird blockiert',r['pwned']==False,str(r))
        check('Fremdes Skript und Inline-Handler melden Verstöße',len(r['viol'])>=2,str(r['viol']))
        print('errs',[x for x in e.errs if 'Content Security' not in x][:5])
    finally: pass
finally: e.close()
print('FEHLGESCHLAGEN:',fails) if fails else print('ALLES OK')
sys.exit(1 if fails else 0)
