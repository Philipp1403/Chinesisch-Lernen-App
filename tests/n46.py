"""Hauptansichten: Die Seite selbst scrollt nie, #main scrollt nur wenn nötig. Misst Überlänge je Ansicht."""
import sys
from lib import *
CFG=[(1180,750,True,False),(820,1100,False,False),(390,844,True,True)]
VIEWS=[('learn',"__app.go('learn')"),('practice',"__app.go('practice')"),('review',"__app.go('review')"),('words',"__app.go('words')"),('settings',"__app.go('settings')"),('lesson',"__app.go('lesson',{id:'gruss'})")]
bad=[]
for W,H,dark,mob in CFG:
    e=Env(w=W,h=H,dark=dark,mobile=mob,sw=False); pg=e.pg; tag=f'{W}x{H}'
    try:
        e.open()
        for name,js in VIEWS:
            pg.evaluate(js); pg.wait_for_timeout(500)
            r=pg.evaluate("""(()=>{const m=document.querySelector('#main');const de=document.documentElement;return {pageOver:de.scrollHeight-innerHeight,bodyOver:document.body.scrollHeight-innerHeight,mainOver:m.scrollHeight-m.clientHeight,mainH:m.clientHeight,winScroll:window.scrollY}})()""")
            print(tag,f'{name:9s}',r)
            if r['pageOver']>0 or r['bodyOver']>0: bad.append((tag,name,'Seite scrollt selbst',r))
            e.shot(f'n46_{tag}_{name}.png')
        # Scrollen im Inneren funktioniert und springt beim Wechsel zurück
        pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(300); pg.evaluate("document.querySelector('#main').scrollTop=400"); y=pg.evaluate("document.querySelector('#main').scrollTop")
        pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(300); y2=pg.evaluate("document.querySelector('#main').scrollTop")
        print(tag,'Scroll innen',y,'nach Wechsel',y2)
        if y<=0 and r['mainOver']>0: bad.append((tag,'settings','innen nicht scrollbar'))
        if y2!=0: bad.append((tag,'go() setzt Scroll nicht zurück',y2))
        print(tag,'errs',e.errs)
    finally: e.close()
print('PROBLEME',bad) if bad else print('OK')
sys.exit(1 if bad else 0)
