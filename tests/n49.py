"""Sicherheit: (1) eingeschleustes HTML aus Sicherung/Gist wird nicht mehr ausgegeben und aus dem Zustand entfernt, (2) normaler Zustand bleibt beim Säubern unverändert,
(3) feindliche Schlüssel (__proto__) setzen nichts, (4) Azure-Region wird geprüft, (5) Referrer-Meta vorhanden, (6) in fremdem Rahmen bleibt die App leer."""
import os,sys,subprocess,time,json
from lib import *
LISTEN="window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective));window.__xss=0;"
bad=[]
def eq(name,got,want):
    ok=got==want; print(('OK   ' if ok else 'FEHLER'),name,'' if ok else f'-> {got} (erwartet {want})')
    if not ok: bad.append(name)
e=Env(w=820,h=1100,sw=False); pg=e.pg; pg.add_init_script(LISTEN)
try:
    e.open()
    eq('Referrer-Meta',pg.evaluate("document.querySelector('meta[name=referrer]')&&document.querySelector('meta[name=referrer]').content"),'no-referrer')
    # (1) feindlicher Stand über die Wiederherstellung
    evil={'cards':{'147':{'e':2.5,'i':3,'r':2,'l':0,'m':1,'ls':0,'io':0,'d':1700000000000,'v':2,'x':'<b>'},'abc':{'i':1}},
          'hard':{'147':{'s':0,'n':1,'k':{'<img src=x onerror="window.__xss=1">':1,'lesen':2},'t':5}},
          'ui':{'tests':{'gruss':{'last':'<img src=x onerror="window.__xss=2">','best':1,'ts':1}},'scope':['gruss','<script>'],'towerSeen':[1,'<b>']},
          'settings':{'voice':'<i>','rate':'schnell','perRound':8,'modes':{'read':True,'x':1}},'epoch':0}
    evil_text=json.dumps(evil).replace('{"cards"','{"__proto__":{"polluted":1},"cards"',1)
    pg.evaluate("(t)=>{const o=JSON.parse(t);window.__s=stateFrom(o);window.__proto=Object.getPrototypeOf(window.__s)===Object.prototype&&!('polluted' in window.__s)}",evil_text)
    eq('Prototyp unverändert',pg.evaluate("window.__proto"),True)
    eq('Karte bereinigt (nur bekannte Felder, falsche ID weg)',pg.evaluate("[Object.keys(__s.cards),Object.keys(__s.cards['147']).sort().join(',')]"),[['147'],'d,e,i,io,l,m,ls,r,v'.split(',')[0]+',e,i,io,l,ls,m,r,v'])
    eq('Gefahrentext in Arten entfernt',pg.evaluate("Object.keys(__s.hard['147'].k)"),['lesen'])
    eq('Testwert ist Zahl',pg.evaluate("typeof __s.ui.tests.gruss.last"),'number')
    eq('Bereich nur gültige Lektions-IDs',pg.evaluate("__s.ui.scope"),['gruss'])
    eq('Einstellungen: falscher Typ verworfen, Text bleibt Text',pg.evaluate("[__s.settings.rate,__s.settings.perRound,__s.settings.voice]"),[0.85,8,'<i>'])
    # in der App darstellen: kein HTML, kein Skript
    pg.evaluate("(t)=>{window.__app.state; const st=stateFrom(JSON.parse(t)); Object.assign(__app.state(),{hard:st.hard,cards:st.cards}); __app.state().ui.tests=st.ui.tests; __app.save(); __app.go('review')}",evil_text); pg.wait_for_timeout(700)
    eq('kein eingeschleustes Bild',pg.evaluate("document.querySelectorAll('.kindtag img').length"),0)
    eq('Skript lief nicht',pg.evaluate("window.__xss"),0)
    # Ausgabe selbst escaped, auch wenn der Zustand verseucht wäre
    pg.evaluate("(()=>{const a=__app,st=a.state(),id=a.LESSONS[0].words[0];st.hard={[id]:{s:0,n:1,k:{'<img src=x onerror=1>':1},t:1}};st.ui.tests={[a.LESSONS[0].id]:{last:'<img src=x>',best:1,ts:1}};a.go('review')})()"); pg.wait_for_timeout(500)
    eq('hardCard escaped',pg.evaluate("document.querySelectorAll('.kindtag img').length"),0)
    pg.evaluate("__app.go('lesson',{id:__app.LESSONS[0].id})"); pg.wait_for_timeout(400)
    eq('Lektionstest-Zeile escaped',pg.evaluate("document.querySelectorAll('#main img').length"),0)
    # (2) normaler Zustand bleibt gleich
    same=pg.evaluate("""(()=>{const a=__app;const st=a.state();st.cards={};for(const id of a.LESSONS[0].words.slice(0,4)) st.cards[id]={e:2.5,i:4,r:3,l:1,m:1,ls:0,io:0,d:1700000000000,v:2};
      st.stats={147:{ok:3,bad:1}};st.hard={147:{s:1,n:2,k:{lesen:1,hören:1},t:5}};st.hardOut={150:9};st.log={'2026-11-22':5};st.ui.tests={gruss:{last:80,best:90,ts:3}};st.ui.scope=['gruss'];st.ui.fcCount=10;st.ui.towerSeen=[1];st.ui.wset={scope:['gruss'],demo:true,reps:10,count:5,help:'fade',mode:'trace'};st.settings.micVar='std';
      const K=x=>JSON.stringify(x,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(q=>[q,v[q]])):v);const r=stateFrom(JSON.parse(JSON.stringify(st)));return [K(r.cards)===K(st.cards),K(r.stats)===K(st.stats),K(r.hard)===K(st.hard),K(r.hardOut)===K(st.hardOut),K(r.log)===K(st.log),K(r.ui)===K(st.ui),K(r.settings)===K(st.settings)]})()""")
    eq('normaler Zustand bleibt beim Säubern unverändert',same,[True]*7)
    # (4) Region
    pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(400)
    pg.fill('#azregion','evil.example.com/x'); pg.fill('#azkey','abc'); pg.click('[data-azsave]'); pg.wait_for_timeout(300)
    eq('ungültige Region abgelehnt',pg.evaluate("/Kleinbuchstaben/.test(document.querySelector('#azres').textContent)"),True)
    eq('Region nicht gespeichert',pg.evaluate("AZ.region!=='evil.example.com/x'"),True)
    pg.evaluate("AZ.region='a.b'; AZ.key='k'")
    eq('Azure verweigert ungültige Region beim Start',pg.evaluate("(async()=>{try{azConfigNew(window.SpeechSDK||{SpeechConfig:{fromSubscription:()=>({})},PropertyId:{}});return 'angenommen'}catch(e){return e.message}})()"),'Ungültige Region')
    print('errs',e.errs)
finally: e.close()
# (6) fremder Rahmen
d=testroot(); open(os.path.join(d,'rahmen.html'),'w').write('<!doctype html><iframe id=f src="index.html" width=800 height=900></iframe>')
srv=subprocess.Popen(['python3','-m','http.server','8768','-d',d],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
from playwright.sync_api import sync_playwright
pw=sync_playwright().start(); b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
try:
    p=b.new_context(service_workers='block').new_page(); p.goto('http://localhost:8768/rahmen.html'); p.wait_for_timeout(1500)
    fr=p.frame_locator('#f'); disp=p.evaluate("document.querySelector('#f').contentDocument.documentElement.style.display")
    eq('in fremdem Rahmen bleibt die App ausgeblendet',disp,'none')
finally: b.close(); pw.stop(); srv.terminate()
print('FEHLGESCHLAGEN',bad) if bad else print('ALLES OK')
sys.exit(1 if bad else 0)
