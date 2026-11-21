"""Lernleiter: Stufen, dreimal Leicht = 1 Woche, Altbestand, Wiedervorlage in der Runde"""
import time
from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
e=Env(w=820,h=1100,sw=False); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    mins=lambda c:pg.evaluate("(c)=>LADDER[sched(c,%s).s]"%'c.q',c)
    def step(c,q,known=False): return pg.evaluate("([c,q,k])=>{const s=sched(c,q,k);return [s.s,s.min,s.i]}",[c,q,known])
    new={'e':2.5,'i':0,'r':0,'l':0,'s':0,'d':0}
    # Dreimal Leicht -> 1 Woche
    c=dict(new); path=[]
    for k in range(3):
        s=step(c,3); path.append(s); c={**c,'s':s[0],'r':c['r']+1,'i':s[2]}
    print('3x Leicht:',path); assert path[-1][1]==10080,'dreimal Leicht muss auf 1 Woche führen'
    # Gut-Weg
    c=dict(new); g=[]
    for k in range(7):
        s=step(c,2); g.append(s[1]); c={**c,'s':s[0],'r':c['r']+1}
    print('Gut-Weg (Minuten):',g); assert g[:4]==[15,60,1440,2880]
    # Nochmal setzt zurück, Schwer
    assert step({**new,'s':6},0)[1]==1
    assert step({**new,'s':1},1)[0]==1 and step({**new,'s':6},1)[0]==5
    assert step(new,3,True)[1]==1440,'Kenne ich schon: mindestens 1 Tag'
    # Höchststufe
    assert step({**new,'s':10},3)[0]==10
    # Altbestand (nur Tage)
    print('Altbestand:',[pg.evaluate("(c)=>boxOf(c)",{'e':2.5,'i':d,'r':3,'l':0,'d':0}) for d in (0,1,3,7,14,30,60,400)])
    print('Labels:',pg.evaluate("LADDER.map(stepLabel)"))
    # Wiedervorlage in der Runde: Karte mit Nochmal kommt nach kurzer Pause wieder
    pg.evaluate("(()=>{const a=window.__app;const st=a.state();st.cards={};for(const id of a.LESSONS[0].words.slice(0,3)) st.cards[id]={e:2.5,i:0,r:0,l:0,s:0,d:Date.now()-1000};st.settings.modes={read:true,write:false,listen:false};a.save();a.startReview()})()")
    pg.wait_for_selector('[data-rate], .fb, .micwrap, .subprompt',timeout=5000); pg.wait_for_timeout(300)
    n0=pg.evaluate("SESS.items.length"); print('Karten in der Runde',n0)
    # erste Karte aufdecken und Nochmal
    first=pg.evaluate("SESS.items[SESS.i].wid")
    pg.click('text=Antwort zeigen')
    pg.wait_for_selector('[data-rate]',timeout=5000); e.shot('n42_bewerten.png')
    labels=pg.evaluate("[...document.querySelectorAll('[data-rate]')].map(b=>b.innerText.replace(/\\n/g,' '))"); print('Knöpfe:',labels)
    pg.click('[data-rate="0"]'); pg.wait_for_timeout(400)
    c1=pg.evaluate("(id)=>({s:__app.state().cards[id].s,due:Math.round((__app.state().cards[id].d-Date.now())/1000)})",first); print('nach Nochmal:',c1); assert c1['s']==0 and 0<c1['due']<=61
    print('Runde jetzt',pg.evaluate("SESS.items.length"),'Aufgaben; erste Karte erneut vorgemerkt:',pg.evaluate("SESS.items.filter(x=>x.wid===%d&&x.notBefore).length"%first))
    # die beiden anderen Karten mit Leicht beenden, dann muss der Wartebildschirm kommen
    for k in range(2):
        pg.wait_for_selector('text=Antwort zeigen',timeout=5000); pg.click('text=Antwort zeigen'); pg.wait_for_selector('[data-rate]'); pg.click('[data-rate="3"]'); pg.wait_for_timeout(400)
    pg.wait_for_selector('#wt',timeout=5000); print('Wartebildschirm:',pg.inner_text('.donebox').replace('\n',' ')); e.shot('n42_warten.png')
    pg.click('text=Jetzt weiter'); pg.wait_for_selector('text=Antwort zeigen',timeout=5000)
    print('Karte kommt zurück:',pg.evaluate("SESS.items[SESS.i].wid")==first)
    # Wiederholen-Ansicht
    pg.click('[data-s=quit]'); pg.evaluate("__app.go('review')"); pg.wait_for_timeout(500); e.shot('n42_ansicht.png')
    print(pg.inner_text('.ladder').replace('\n',' '))
    print('errs',e.errs); assert not e.errs
finally: e.close()
