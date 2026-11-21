from lib import *
e=Env(); pg=e.pg
try:
    e.open()
    for tab in ['practice','review','words','settings']:
        pg.click(f'[data-tab={tab}]'); pg.wait_for_timeout(300); e.shot(f'n6_{tab}.png')
    # Scope sheet
    pg.click('[data-tab=practice]'); pg.click('[data-scope]'); pg.wait_for_selector('.sheet'); pg.click('.sheet [data-l=familie]'); pg.click('.sheet [data-l=zahlen]'); e.shot('n6_scope.png')
    pg.click('.sheet [data-ok]'); pg.wait_for_timeout(200); print('scope label:',pg.inner_text('[data-scope] b'))
    # Wörter Suche + Sheet
    pg.click('[data-tab=words]'); pg.fill('#q','hao'); pg.wait_for_timeout(300); print('hao rows',pg.locator('.wrow').count())
    pg.fill('#q','Wasser'); pg.wait_for_timeout(300); print('Wasser rows',pg.locator('.wrow').count())
    pg.click('.wrow >> nth=0'); pg.wait_for_selector('.sheet .tile svg path',state='attached'); pg.wait_for_timeout(1500); e.shot('n6_wordsheet.png')
    e.close()
    # Dunkel + Handy
    e2=Env(w=390,h=844,dark=True,mobile=True); e2.open(); e2.shot('n6_dark_phone.png')
    e2.pg.click('[data-open=gruss]'); e2.pg.wait_for_selector('.lhead'); e2.shot('n6_dark_lesson.png')
    e2.pg.evaluate("__app.startPractice('build',['familie'])"); e2.pg.wait_for_selector('.bank .tok'); e2.shot('n6_dark_build.png')
    print('errors2',e2.errs); e2.close()
except Exception as ex:
    print('EXC',ex)
print('errors',e.errs)
