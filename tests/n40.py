"""Screenshots der Ansichten aus der Feedback-Liste (Üben-Übersicht, Satz bauen, Lückentext, Hören und verstehen, Lektionsblatt, Schreibtraining-Einrichtung) und Platz-Prüfungen."""
import sys,os
from lib import *
FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
TAG=os.environ.get("TAG","x")
CFG=[(1180,820,True,False),(820,1180,False,False),(390,844,True,True)]
problems=[]
for W,H,dark,mob in CFG:
    e=Env(w=W,h=H,dark=dark,mobile=mob,sw=False); pg=e.pg; pg.add_init_script(FAKE); n=f'{TAG}_{W}x{H}'
    try:
        e.open()
        # Üben-Übersicht
        pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(500); e.shot(f'n40_{n}_ueben.png')
        # Satz bauen leer
        pg.evaluate("__app.startPractice('build',['gruss'])"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(400); e.shot(f'n40_{n}_build.png'); pg.click('[data-s=quit]')
        # Lückentext
        pg.evaluate("__app.startPractice('cloze',['gruss'])"); pg.wait_for_selector('.ruby.blank'); pg.wait_for_timeout(400); e.shot(f'n40_{n}_cloze.png')
        pg.click('.opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]'); e.shot(f'n40_{n}_cloze_fb.png'); pg.click('[data-s=quit]')
        # Hören und verstehen: falsche Antwort wählen
        pg.evaluate("__app.startPractice('listensent',['gruss'])"); pg.wait_for_selector('.opts.long .opt'); pg.wait_for_timeout(400)
        de=pg.evaluate("SBYID.get(SESS.items[SESS.i].sid).de")
        idx=pg.evaluate("(de)=>[...document.querySelectorAll('.opts.long .opt')].findIndex(o=>o.textContent!==de)",de)
        pg.click(f'.opts.long .opt >> nth={idx}'); pg.wait_for_selector('.sfoot [data-fb]'); pg.wait_for_timeout(300); e.shot(f'n40_{n}_hoeren_falsch.png')
        r=pg.evaluate("""(()=>{const o=[...document.querySelectorAll('.opts.long .opt')]; const last=o[o.length-1].getBoundingClientRect(); const f=document.querySelector('#sf').getBoundingClientRect(); const sb=document.querySelector('.sbody'); return {lastBottom:last.bottom,footTop:f.top,footH:f.height,scroll:sb.scrollHeight>sb.clientHeight+2}})()""")
        print(n,'hören falsch',r)
        if W>=820 and r['lastBottom']>r['footTop']+1: problems.append((n,'letzte Antwort unter der Leiste',r))
        pg.click('[data-s=quit]')
        # Lektionsblatt
        pg.evaluate("__app.go('lesson',{id:'gruss'})"); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('[data-sayS]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200); e.shot(f'n40_{n}_lektion.png')
        # Schreibtraining-Einrichtung
        pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(300); pg.click('[data-ex=wdrill]'); pg.wait_for_selector('.sheet'); pg.wait_for_timeout(400); e.shot(f'n40_{n}_setup.png')
        print(n,'errs',e.errs)
    finally: e.close()
print('PROBLEME',problems) if problems else print('OK')
# Einrichtungsfenster: bis ganz unten scrollen, letzter Inhalt muss über dem festen Knopf liegen
e=Env(w=1180,h=820,dark=True,sw=False); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open(); pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(300); pg.click('[data-ex=wdrill]'); pg.wait_for_selector('.sheet.fixfoot'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.sheetscroll').scrollTop=99999"); pg.wait_for_timeout(200); e.shot('n40_setup_ende.png')
    r=pg.evaluate("(()=>{const sc=document.querySelector('.sheetscroll'),f=document.querySelector('.sheetfoot').getBoundingClientRect(),last=[...sc.querySelectorAll('p,div,button')].pop().getBoundingClientRect();return {lastBottom:last.bottom,footTop:f.top}})()")
    print('Einrichtung Ende',r); assert r['lastBottom']<=r['footTop']+1,'Inhalt unter dem Knopf'
    # gewählt/ungewählt unterscheidbar
    pg.click('[data-mode=free]'); pg.wait_for_timeout(200)
    st=pg.evaluate("[...document.querySelectorAll('.choice')].map(c=>c.getAttribute('aria-pressed')+':'+getComputedStyle(c).backgroundColor)"); print('Auswahl',st)
finally: e.close()
