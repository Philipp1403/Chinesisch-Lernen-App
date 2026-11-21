from lib import *
FAKE="""
window.__utt=[];
(function(){
  const ss={speaking:false,pending:false,paused:false,cancel(){window.__cancel=(window.__cancel||0)+1;},getVoices(){return [];},addEventListener(){},speak(u){ window.__utt.push({t:u.text,r:u.rate,v:u.volume}); setTimeout(()=>{u.onstart&&u.onstart({});u.onend&&u.onend({});},20); }};
  Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
  window.SpeechSynthesisUtterance=function(t){ this.text=t; };
})();
"""
e=Env(sw=False,dark=True,w=1024,h=1100); pg=e.pg
pg.add_init_script(FAKE)
try:
    e.open()
    pg.evaluate("window.__utt=[]; speak('你好',{slow:true})"); pg.wait_for_timeout(400)
    print('slow word:',[u['t'] for u in pg.evaluate("__utt")], 'rates',[u['r'] for u in pg.evaluate("__utt")])
    pg.evaluate("window.__utt=[]; speak('你好',{slow:false})"); pg.wait_for_timeout(200)
    print('normal word:',[u['t'] for u in pg.evaluate("__utt")])
    # Neues Wort in der Lernansicht
    pg.evaluate("__app.startLearn('gruss')"); pg.wait_for_selector('.bighz'); pg.wait_for_timeout(700)
    print('intro word:',pg.evaluate("BYID.get(__app.S.items[0].wid).h"))
    print('example card:',pg.locator('text=BEISPIEL').count(),'| shown:',pg.inner_text('.sentence') if pg.locator('.sentence').count() else None)
    print('contains 。:',pg.evaluate("!!document.querySelector('.sentence') && document.querySelector('.sentence').innerText.includes('。')"))
    pg.evaluate("window.__utt=[]"); pg.click('[data-au="s"]'); pg.wait_for_timeout(400)
    print('slow button word:',[u['t'] for u in pg.evaluate("__utt")])
    pg.evaluate("window.__utt=[]"); 
    if pg.locator('[data-ex="s"]').count():
        pg.click('[data-ex="s"]'); pg.wait_for_timeout(500)
        print('slow button example:',[u['t'] for u in pg.evaluate("__utt")])
    e.shot('n25_intro.png')
    # Beispiele aller Wörter prüfen
    r=pg.evaluate("""()=>{const out=[];for(const w of WORDS){const ex=EXAMPLE.get(w.id);if(!ex)out.push(w.h);}return out}""")
    print('Wörter ohne Beispiel:',r)
    r=pg.evaluate("""()=>{const bad=[];for(const w of WORDS){const ex=EXAMPLE.get(w.id);if(ex){const s=SBYID.get(ex);if(s.t.filter(t=>!t.punc).length<2)bad.push(w.h);}}return bad}""")
    print('Beispiel mit nur einem Wort:',r)
    print('errs',e.errs)
finally:
    e.close()
