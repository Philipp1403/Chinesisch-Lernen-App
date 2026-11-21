from lib import *
exec(open('n17.py').read().split("e=Env")[0].split("from lib import *")[1])  # FAKE tts
e=Env(sw=False); pg=e.pg
pg.add_init_script(FAKE)
try:
    e.open()
    print('tones attr',pg.evaluate("document.documentElement.dataset.tones"))
    # trans
    pg.evaluate("__app.startPractice('trans',['familie'])"); pg.wait_for_selector('.bank .tok.de'); pg.wait_for_timeout(400); e.shot('n20_trans.png')
    it=pg.evaluate("(()=>{const s=__app.SBYID.get(__app.S.items[0].sid);return s.de})()"); print('de:',it)
    import re
    words=[w for w in re.sub(r'[.,!?;:„“"…]',' ',it).split() if w]
    for w in words:
        pg.click(f".bank .tok:not(.ghost):has(.th:text-is('{w}'))")
    e.shot('n20_trans2.png')
    pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.sfoot.ok'); e.shot('n20_trans_ok.png'); print('trans ok')
    pg.click('[data-s=quit]')
    # dictate wrong -> footer
    pg.evaluate("__app.startPractice('build',['essen'])"); pg.wait_for_selector('.bank .tok'); e.shot('n20_build_empty.png')
    pg.click('.bank .tok:not(.ghost) >> nth=0'); pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.sfoot.no'); e.shot('n20_build_no.png')
    pg.click('[data-s=quit]')
    # Lektionstest
    pg.evaluate("__app.go('lesson',{id:'zahlen'})"); pg.wait_for_timeout(400); e.shot('n20_lesson.png')
    pg.click('[data-test]'); pg.wait_for_selector('.opt')
    n=pg.evaluate("__app.S.items.length"); print('test items',n)
    for i in range(n):
        pg.wait_for_selector('.opt:not([disabled])'); pg.click('.opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]'); pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(200)
    pg.wait_for_selector('.donebox'); e.shot('n20_testdone.png'); print('items after',pg.evaluate("__app.S.items.length"), 'tests',pg.evaluate("JSON.stringify(__app.state().ui.tests)"))
    pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(400)
    pg.evaluate("__app.go('lesson',{id:'zahlen'})"); pg.wait_for_timeout(300); print(pg.evaluate("document.querySelector('.testcard').innerText.replace(/\\n/g,' ')"))
    # Settings + Diagnose
    pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(300)
    pg.click('[data-diag]'); pg.wait_for_timeout(7000); e.shot('n20_diag.png')
    print(pg.evaluate("document.querySelector('#diagres').innerText"))
    print('errs',e.errs)
finally: e.close()
