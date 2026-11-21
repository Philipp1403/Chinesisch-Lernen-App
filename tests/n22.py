import json
from lib import Env
e=Env(w=820,h=1100); pg=e.pg
pg.add_init_script("""
window.__ev=[];
""")
e.open()
# Fehler/Streak-Logik direkt testen
r=pg.evaluate("""()=>{
 const a=window.__app; const out=[];
 const id=a.LESSONS[0].words[0], id2=a.LESSONS[0].words[1];
 noteStat(id,false,'hören'); out.push(['nach Fehler',JSON.stringify(state.hard[id])]);
 noteStat(id,true); noteStat(id,true); out.push(['2 richtig',state.hard[id]&&state.hard[id].s]);
 noteStat(id,false,'lesen'); out.push(['Fehler setzt zurück',state.hard[id].s, JSON.stringify(state.hard[id].k)]);
 noteStat(id,true); noteStat(id,true); noteStat(id,true); out.push(['3 in Folge raus',!!state.hard[id]]);
 noteStat(id2,false,null); out.push(['kind null nimmt nicht auf',!!state.hard[id2]]);
 noteStat(id2,false,'sprechen'); out.push(['sprechen drin',!!state.hard[id2]]);
 return out;}""")
for x in r: print(x)
# UI
pg.evaluate("()=>{const a=window.__app; noteStat(a.LESSONS[0].words[2],false,'schreiben'); noteStat(a.LESSONS[0].words[3],false,'hören'); save(); go('review')}")
pg.wait_for_selector('#hardcard'); pg.wait_for_timeout(300)
print('hard rows',pg.locator('#hardcard .wrow').count(), 'flash',pg.locator('#flashcard').count())
pg.locator('#hardcard').scroll_into_view_if_needed(); e.shot('n22_review.png')
# hard practice session
pg.click('[data-hard]'); pg.wait_for_selector('#sx',timeout=5000); pg.wait_for_timeout(500)
print('hard session types',pg.evaluate("()=>SESS.items.map(i=>i.type+(i.mode?':'+i.mode:'')+(i.variant?':'+i.variant:''))"))
e.shot('n22_hardsess.png')
pg.evaluate("()=>exitSession()")
# Karteikarten frei: Wort 1
pg.wait_for_selector('#flashcard')
pg.click('[data-fcn="5"]'); pg.click('[data-fstart]'); pg.wait_for_selector('#mic',timeout=5000); pg.wait_for_timeout(400)
print('step',pg.inner_text('#wc-step'))
e.shot('n22_wcard_say.png')
pg.click('[data-hint]'); pg.wait_for_timeout(200)
# ohne Azure: Browser-SR nicht verfügbar in Chromium headless? Überspringen -> zeichnen
pg.click('text=Sprechen überspringen'); pg.wait_for_selector('.wbox',timeout=6000); pg.wait_for_timeout(600)
print('step2',pg.inner_text('#wc-step'))
e.shot('n22_wcard_draw.png')
print('errs',e.errs); e.close()
