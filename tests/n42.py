"""Wiederholungslogik mit zwei Phasen: Lernphase (1, 10 Min) und Wiederholung (Faktoren 1,3 / 2,2 / 3,5, Obergrenze 120 Tage), Migration, Abgleich, Wiedervorlage in der Runde"""
import time,sys
from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
def eq(name,got,want):
    ok=got==want; print(('OK   ' if ok else 'FEHLER'),name,'->',got,'' if ok else f'(erwartet {want})')
    if not ok: bad.append(name)
bad=[]
e=Env(w=820,h=1100,sw=False); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    pg.evaluate("""(()=>{window.__seq=(card,seq)=>{ let c=card,out=[]; for(const q of seq){ const now=c.d>Date.now()?c.d:Date.now(); const s=sched(c,q,now);
      out.push(s.days?s.days:s.min+'m'); c={e:s.e,i:s.i,r:s.r,l:s.l,m:s.m,ls:s.ls,io:s.io,v:2,d:s.days?dayStart(s.days):now+s.min*60000}; } return out; }})()""")
    seq=lambda card,s:pg.evaluate("([c,s])=>__seq(c,s)",[card,s])
    new={'e':2.5,'i':0,'r':0,'l':0,'m':0,'ls':0,'io':0,'d':0,'v':2}
    # --- Testfälle aus der Aufgabe
    eq('neues Wort nur Gut (der Startschritt 1 Min ist das neue Wort selbst, danach)',seq(new,[2]*9),['10m',1,2,4,9,20,44,97,120])
    eq('...und das Ende bleibt bei 120',seq(new,[2]*11)[-2:],[120,120])
    eq('neues Wort Leicht, dann nur Leicht',seq(new,[3]*4),[4,14,49,120])
    s2=seq(new,[1,1,2]); eq('Schwer, Schwer, Gut',s2,['6m','6m','10m'])
    eq('Schritt 1 nicht übersprungen: nach Schwer steht ls noch auf 0',pg.evaluate("(()=>{let c={e:2.5,i:0,r:0,l:0,m:0,ls:0,io:0,d:0,v:2};const s=sched(c,1);return [s.ls,s.m]})()"),[0,0])
    eq('Gut nach Schwer geht auf Schritt 2',pg.evaluate("(()=>{let c={e:2.5,i:0,r:1,l:0,m:0,ls:0,io:0,d:0,v:2};const s=sched(c,2);return [s.ls,s.min]})()"),[1,10])
    eq('Nochmal auf Schritt 2 zurück auf Schritt 1',pg.evaluate("(()=>{const s=sched({e:2.5,i:0,r:1,l:0,m:0,ls:1,io:0,d:0,v:2},0);return [s.ls,s.min]})()"),[0,1])
    eq('Schwer auf Schritt 2 wiederholt 10 Min',pg.evaluate("sched({e:2.5,i:0,r:1,l:0,m:0,ls:1,io:0,d:0,v:2},1).min"),10)
    due0=pg.evaluate("dayStart(0)-1000*60*60*24*3")
    c20={'e':2.5,'i':20,'r':5,'l':0,'m':1,'ls':0,'io':0,'d':pg.evaluate("dayStart(0)"),'v':2}
    n=pg.evaluate("(c)=>{const s=sched(c,0);return {m:s.m,min:s.min,io:s.io,l:s.l}}",c20); eq('I=20 und Nochmal: Lernphase 10 Min, alt gemerkt, Fehler gezählt',n,{'m':0,'min':10,'io':20,'l':1})
    eq('danach Gut: 6 Tage',pg.evaluate("(c)=>{let s=sched(c,0);let d=Object.assign({},c,{e:s.e,i:s.i,r:s.r,l:s.l,m:s.m,ls:s.ls,io:s.io,d:Date.now(),v:2});return sched(d,2).days}",c20),6)
    eq('danach Leicht: 7 Tage (Gut plus 1)',pg.evaluate("(c)=>{let s=sched(c,0);let d=Object.assign({},c,{e:s.e,i:s.i,r:s.r,l:s.l,m:s.m,ls:s.ls,io:s.io,d:Date.now(),v:2});return sched(d,3).days}",c20),7)
    eq('Nochmal in der Nachlernphase bleibt bei 10 Min',pg.evaluate("sched({e:2.5,i:0,r:2,l:1,m:0,ls:0,io:20,d:0,v:2},0).min"),10)
    c4={'e':2.5,'i':4,'r':5,'l':0,'m':1,'ls':0,'io':0,'d':pg.evaluate("dayStart(-8)"),'v':2}   # Intervall 4, 8 Tage überfällig, also 12 Tage seit der letzten Wiederholung
    eq('I=4, nach 12 Tagen mit Gut: 26 Tage',pg.evaluate("(c)=>sched(c,2).days",c4),26)
    eq('...Schwer / Leicht dazu',pg.evaluate("(c)=>[sched(c,1).days,sched(c,3).days]",c4),[16,42])
    # --- Ordnung und Obergrenze für alle Intervalle
    probs=pg.evaluate("""(()=>{const out=[];for(let I=1;I<=120;I++){const iv=reviewIntervals({i:I,d:dayStart(0)},Date.now());
      if(iv.hard<I&&iv.hard<MAX_INTERVAL) out.push(['Schwer kürzer als I',I,iv]); if(iv.good>MAX_INTERVAL||iv.easy>MAX_INTERVAL) out.push(['über Obergrenze',I,iv]);
      if(iv.hard<MAX_INTERVAL&&!(iv.hard<iv.good)) out.push(['Schwer>=Gut',I,iv]); if(iv.good<MAX_INTERVAL&&!(iv.good<iv.easy)) out.push(['Gut>=Leicht',I,iv]); if(iv.easy>MAX_INTERVAL) out.push(['Leicht>120',I]);}return out})()""")
    eq('Schwer < Gut < Leicht und Obergrenze 120 für I=1..120',probs,[])
    print('Beispiele I=1,2,7,30,97:',pg.evaluate("[1,2,7,30,97].map(I=>{const v=reviewIntervals({i:I,d:dayStart(0)},Date.now());return [I,v.hard,v.good,v.easy]})"))
    # --- Migration
    old=lambda s,i,r:{'e':2.5,'i':i,'r':r,'l':0,'s':s,'d':1700000000000}
    mig=pg.evaluate("(cs)=>cs.map(c=>{const m=migrateCard(c);return [m.m,m.ls,m.i,m.d,m.v,'s' in m]})",[old(0,0,0),old(1,0,2),old(2,0,3),old(3,1,3),old(5,4,4),old(8,30,6),old(10,120,9)])
    eq('Migration Stufe 0 bis 2 -> Lernphase (Schritt 1, 2, 2), Stufe 3 ab -> Wiederholung mit altem Intervall, Fälligkeit unverändert',mig,
       [[0,0,0,1700000000000,2,False],[0,1,0,1700000000000,2,False],[0,1,0,1700000000000,2,False],[1,0,1,1700000000000,2,False],[1,0,4,1700000000000,2,False],[1,0,30,1700000000000,2,False],[1,0,120,1700000000000,2,False]])
    eq('Altbestand ohne Stufe (nur Tage): i=7 -> Wiederholung, i=0 mit Wiederholungen -> Lernphase',pg.evaluate("[migrateCard({e:2.5,i:7,r:3,l:0,d:5}),migrateCard({e:2.5,i:0,r:2,l:1,d:5})].map(m=>[m.m,m.i])"),[[1,7],[0,0]])
    eq('idempotent',pg.evaluate("(cs)=>cs.every(c=>{const a=migrateCard(c),b=migrateCard(a);return JSON.stringify(a)===JSON.stringify(b)&&a===b})",[old(0,0,0),old(5,4,4),old(10,120,9)]),True)
    # --- Abgleich: anderes Gerät schickt noch das alte Format
    mg=pg.evaluate("""(()=>{const A={epoch:0,cards:{1:migrateCard({e:2.5,i:4,r:4,l:0,s:5,d:100}),2:{e:2.5,i:0,r:1,l:0,s:1,d:50}},stats:{},hard:{},hardOut:{},log:{},ui:{tests:{}}};
      const B={epoch:0,cards:{1:{e:2.5,i:7,r:5,l:0,s:6,d:200},3:{e:2.5,i:0,r:2,l:0,s:2,d:60}},stats:{},hard:{},hardOut:{},log:{},ui:{tests:{}}};
      const m=mergeStates(A,B);return Object.fromEntries(Object.entries(m.cards).map(([k,c])=>[k,[c.v,c.m,c.i,c.d,'s' in c]]))})()""")
    eq('Abgleich mit altem Format: alles auf Format 2, mehr Wiederholungen gewinnt',mg,{'1':[2,1,7,200,False],'2':[2,0,0,50,False],'3':[2,0,0,60,False]})
    # --- Knopfbeschriftung in der Karteikarte (neue Karte) und Wiederholen-Ansicht, Wiedervorlage mit Karten im alten Format
    pg.evaluate("(()=>{const a=window.__app;const st=a.state();st.cards={};for(const id of a.LESSONS[0].words.slice(0,3)) st.cards[id]={e:2.5,i:0,r:0,l:0,s:0,d:Date.now()-1000};st.settings.modes={read:true,write:false,listen:false};a.save();a.startReview()})()")
    pg.wait_for_selector('text=Antwort zeigen',timeout=5000); first=pg.evaluate("SESS.items[SESS.i].wid"); pg.click('text=Antwort zeigen'); pg.wait_for_selector('[data-rate]',timeout=5000); e.shot('n42_bewerten.png')
    labels=pg.evaluate("[...document.querySelectorAll('[data-rate]')].map(b=>b.innerText.replace(/\\n/g,' '))")
    eq('Knöpfe bei neuem Wort',labels,['Nochmal 1 Min','Schwer 6 Min','Gut 10 Min','Leicht 4 Tage'])
    pg.click('[data-rate="0"]'); pg.wait_for_timeout(400)
    c1=pg.evaluate("(id)=>{const c=__app.state().cards[id];return {m:c.m,ls:c.ls,v:c.v,due:Math.round((c.d-Date.now())/1000)}}",first); print('nach Nochmal:',c1)
    eq('Nochmal in der Lernphase: 1 Min, Format 2',[c1['m'],c1['ls'],c1['v'],0<c1['due']<=61],[0,0,2,True])
    for k in range(2):
        pg.wait_for_selector('text=Antwort zeigen',timeout=5000); pg.click('text=Antwort zeigen'); pg.wait_for_selector('[data-rate]'); pg.click('[data-rate="3"]'); pg.wait_for_timeout(400)
    leicht=pg.evaluate("(()=>{const st=__app.state();return Object.values(st.cards).filter(c=>c.m===1&&c.i===4).length})()"); eq('zwei Wörter mit Leicht: 4 Tage, Wiederholung',leicht,2)
    pg.wait_for_selector('#wt',timeout=5000); print('Wartebildschirm:',pg.inner_text('.donebox').replace('\n',' ')); e.shot('n42_warten.png')
    pg.click('text=Jetzt weiter'); pg.wait_for_selector('text=Antwort zeigen',timeout=5000); eq('Karte kommt zurück',pg.evaluate("SESS.items[SESS.i].wid")==first,True)
    pg.click('[data-s=quit]'); pg.evaluate("__app.go('review')"); pg.wait_for_timeout(500); e.shot('n42_ansicht.png')
    print(pg.inner_text('.ladder').replace('\n',' '))
    eq('Anzeige: fünf Bereiche, 1 in der Lernphase, 2 bei 4 bis 14 Tage',pg.evaluate("[...document.querySelectorAll('.ladder .lstep')].map(x=>x.innerText.replace(/\\n/g,' '))"),['1 Lernphase','0 1 bis 3 Tage','2 4 bis 14 Tage','0 15 bis 60 Tage','0 über 60 Tage'])
    print('errs',e.errs); eq('keine Fehler',e.errs,[])
finally: e.close()
print('FEHLGESCHLAGEN:',bad) if bad else print('ALLES OK')
sys.exit(1 if bad else 0)
