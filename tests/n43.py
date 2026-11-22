"""Satz bauen, Übersetzen, Hören und schreiben: Auswahl und Antwort immer in EINER Zeile, Kacheln nicht zu groß, nichts unter der Leiste"""
import os,sys
from lib import *
FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
CFG=[(1180,820,True,False),(820,1180,False,False),(390,844,True,True)]
bad=[]
for W,H,dark,mob in CFG:
    e=Env(w=W,h=H,dark=dark,mobile=mob,sw=False); pg=e.pg; pg.add_init_script(FAKE)
    try:
        e.open()
        for t in ['build','trans','dictate']:
            pg.evaluate("(t)=>{__app.startPractice(t,[]); const it=__app.makeItems(t,[],60); SESS.items=it; SESS.total=it.length; SESS.i=0; showItem();}",t); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(300)
            n=pg.evaluate("SESS.items.length"); worst=1; minK=1; shots=0
            for k in range(n):
                pg.evaluate("(k)=>{SESS.i=k; showItem();}",k); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(120)
                r=pg.evaluate("""(()=>{const b=document.querySelector('#bank'),a=document.querySelector('#ans');const tiles=[...b.children];
                  const tops=new Set(tiles.map(t=>Math.round(t.getBoundingClientRect().top)));const bb=b.getBoundingClientRect();const f=document.querySelector('#sf').getBoundingClientRect();
                  const lastR=Math.max(...tiles.map(t=>t.getBoundingClientRect().right)),firstL=Math.min(...tiles.map(t=>t.getBoundingClientRect().left));
                  return {rows:tops.size,tk:parseFloat(getComputedStyle(b).getPropertyValue('--tk')),bottom:Math.max(...tiles.map(t=>t.getBoundingClientRect().bottom)),foot:f.top,right:lastR,left:firstL,vw:innerWidth,th:tiles[0].getBoundingClientRect().height,n:tiles.length,scroll:b.scrollWidth>b.clientWidth+1}})()""")
                minK=min(minK,r['tk'])
                if r['rows']!=1 and W>=700: bad.append((W,t,k,'mehr als eine Zeile',r))
                if r['scroll'] and r['tk']>0.56 and W>=700: bad.append((W,t,k,'scrollt trotz Platz',r))
                if W>=820 and r['bottom']>r['foot']: bad.append((W,t,k,'Kacheln unter der Leiste',r))
                # alle Kacheln antippen: Antwortzeile ebenfalls eine Zeile
                pg.evaluate("()=>{for(const b of document.querySelectorAll('#bank [data-b]')) b.click();}"); pg.wait_for_timeout(60)
                r2=pg.evaluate("(()=>{const a=document.querySelector('#ans');const tops=new Set([...a.children].map(t=>Math.round(t.getBoundingClientRect().top)));return {rows:tops.size,n:a.children.length}})()")
                if r2['rows']!=1 and W>=700: bad.append((W,t,k,'Antwort mehr als eine Zeile',r2))
                if k==0 and t=='build': e.shot(f'n43_{W}_{t}_ein.png')
            print(W,t,'Aufgaben',n,'kleinster Maßstab %.2f'%minK)
        # Kachelgröße (iPad quer): Höhe der Kachel
        pg.evaluate("(()=>{__app.startPractice('build',[]); const it=__app.makeItems('build',[],5); SESS.items=it; SESS.total=5; SESS.i=0; showItem();})()"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(400)
        print(W,'Kachel Höhe/Breite',pg.evaluate("(()=>{const r=document.querySelector('#bank .tok').getBoundingClientRect();return [Math.round(r.height),Math.round(r.width)]})()")); e.shot(f'n43_{W}_build.png')
        # Rückmeldeleiste: Auswahl darf nicht unter der Leiste liegen
        pg.evaluate("()=>{const s=SBYID.get(SESS.items[SESS.i].sid); const want=s.t.filter(t=>!t.punc).map(t=>t.h); for(const h of want){ const b=[...document.querySelectorAll('#bank [data-b]')].find(x=>x.querySelector('.th').textContent===h); b.click(); }}"); pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.sfoot.ok'); pg.wait_for_timeout(300)
        rb=pg.evaluate("(()=>{const b=document.querySelector('#bank');const f=document.querySelector('#sf').getBoundingClientRect();return {bank:Math.max(...[...b.children].map(t=>t.getBoundingClientRect().bottom)),foot:f.top}})()"); print(W,'Leiste',rb); e.shot(f'n43_{W}_fb.png')
        if W>=820 and rb['bank']>rb['foot']: bad.append((W,'Rückmeldeleiste verdeckt Kacheln',rb))
        print(W,'errs',e.errs)
    finally: e.close()
print('PROBLEME',bad[:8],len(bad)) if bad else print('OK')
sys.exit(1 if bad else 0)
