from lib import *
FAKE="""
window.__mockHeard=['你好'];
window.__mockErr=null;
class FakeSR{ constructor(){ this.lang=''; }
  start(){ setTimeout(()=>{
     if(window.__mockErr){ this.onerror&&this.onerror({error:window.__mockErr}); return; }
     const alts=window.__mockHeard.map(t=>({transcript:t}));
     this.onresult&&this.onresult({results:[alts]}); },300); }
  stop(){} abort(){} }
window.SpeechRecognition=FakeSR;
"""
e=Env(); pg=e.pg
pg.add_init_script(FAKE)
try:
    e.open()
    # --- Choose ---
    pg.evaluate("__app.startPractice('choose',['zahlen'])"); pg.wait_for_selector('.opt'); pg.wait_for_timeout(500); e.shot('n3_choose.png')
    for k in range(3):
        pg.click('.opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]'); 
        if k==0: e.shot('n3_choose_fb.png')
        pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(250)
    print('choose ok, items',pg.evaluate("__app.S.items.length"))
    pg.click('[data-s=quit]')
    # --- Build ---
    pg.evaluate("__app.startPractice('build',['familie'])"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(400); e.shot('n3_build.png')
    # solve first: read target from session
    ans=pg.evaluate("(()=>{const s=__app.SBYID.get(__app.S.items[__app.S.i].sid);return s.t.filter(t=>!t.punc).map(t=>t.h)})()")
    print('target',ans)
    for h in ans:
        pg.click(f".bank .tok:not(.ghost):has(.th:text-is('{h}'))")
    pg.click('.sfoot [data-fb=\"1\"]'); pg.wait_for_selector('.sfoot.ok'); e.shot('n3_build_ok.png')
    pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(300)
    # falsche Antwort
    pg.click('.bank .tok:not(.ghost) >> nth=0'); pg.click('.sfoot [data-fb=\"1\"]'); pg.wait_for_selector('.sfoot.no'); e.shot('n3_build_no.png')
    n_before=pg.evaluate("__app.S.items.length"); pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(300)
    print('retry queued:',pg.evaluate("__app.S.items.length")-n_before if False else pg.evaluate("__app.S.items.length"), 'vs', n_before)
    pg.click('[data-s=quit]')
    # --- Dictate ---
    pg.evaluate("__app.startPractice('dictate',['essen'])"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(300); e.shot('n3_dictate.png')
    pg.click('.sfoot [data-fb=\"0\"]'); pg.wait_for_selector('.sfoot.no'); print('dictate giveup ok')
    pg.click('[data-s=quit]')
    # --- Speak ---
    pg.evaluate("__app.startPractice('speak',['gruss'])"); pg.wait_for_selector('#mic'); pg.wait_for_timeout(300); e.shot('n3_speak.png')
    target=pg.evaluate("__app.SBYID.get(__app.S.items[__app.S.i].sid).t.map(t=>t.h).join('')")
    print('speak target',target)
    pg.evaluate("window.__mockHeard=['%s']"%target.replace('。','').replace('？','').replace('，',''))
    pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=5000); e.shot('n3_speak_score.png')
    print('score',pg.inner_text('.ring b'))
    pg.click('.sfoot [data-fb=\"1\"]'); pg.wait_for_timeout(400)
    # falsch gesprochen
    pg.evaluate("window.__mockHeard=['我是学生']")
    pg.click('#mic'); pg.wait_for_selector('.scorebox',timeout=5000); e.shot('n3_speak_bad.png'); print('bad score',pg.inner_text('.ring b'))
    # Fehler
    pg.click('.sfoot [data-fb=\"0\"]'); pg.wait_for_selector('#mic'); pg.evaluate("window.__mockErr='not-allowed'"); pg.click('#mic'); pg.wait_for_selector('#mnote'); pg.wait_for_timeout(700); print('err note:',pg.inner_text('#mnote'))
    pg.click('[data-s=quit]')
finally:
    print('errors',e.errs); e.close()
