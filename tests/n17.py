from lib import *
FAKE="""
window.__utt=[];
(function(){
  const ss={speaking:false,cancel(){},getVoices(){return [];},addEventListener(){},speak(u){ window.__utt.push({t:u.text,r:u.rate}); setTimeout(()=>{u.onend&&u.onend({});},30); }};
  Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
  window.SpeechSynthesisUtterance=function(t){ this.text=t; };
})();
"""
e=Env(sw=False); pg=e.pg
pg.add_init_script(FAKE)
try:
    e.open()
    # slow audio chunking
    pg.evaluate("window.__utt=[]; speak('你好',{slow:true})"); pg.wait_for_timeout(1500)
    print('slow word:',pg.evaluate("__utt"))
    pg.evaluate("window.__utt=[]; speak('你好',{slow:false})"); pg.wait_for_timeout(300)
    print('normal word:',pg.evaluate("__utt"))
    # choose listen shows text
    pg.evaluate("__app.startPractice('choose',['zahlen'])"); pg.wait_for_selector('.opt'); pg.wait_for_timeout(500)
    print('listentext present:',pg.evaluate("!!document.querySelector('.listentext')"), 'variant',pg.evaluate("__app.S.items[0].variant"))
    e.shot('n17_choose.png')
    pg.click('[data-s=quit]')
    # build tiles
    pg.evaluate("__app.startPractice('build',['familie'])"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(400); e.shot('n17_build.png')
    pg.click('.bank .tok:not(.ghost) >> nth=0'); pg.click('.bank .tok:not(.ghost) >> nth=1'); e.shot('n17_build2.png')
    pg.click('[data-s=quit]')
    # dictate
    pg.evaluate("__app.startPractice('dictate',['familie'])"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(400); e.shot('n17_dictate.png')
    pg.click('[data-s=quit]')
    print('errs',e.errs)
finally:
    e.close()
