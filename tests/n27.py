import sys
from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
mode=sys.argv[1] if len(sys.argv)>1 else 'ipad'
W,H=(1024,712) if mode=='ipad' else (390,844)
e=Env(w=W,h=H,sw=False,mobile=(mode!='ipad')); pg=e.pg
pg.add_init_script(FAKE)
types=['choose','build','trans','dictate','tones','cloze','pairs','listensent','speak','draw']
try:
    e.open()
    pg.evaluate("__app.startLearn('gruss')"); pg.wait_for_timeout(700); e.shot(f's_{mode}_intro.png')
    pg.click('[data-s=quit]') if pg.query_selector('[data-s=quit]') else None
    for t in types:
        pg.evaluate(f"__app.startPractice('{t}',['gruss'])"); pg.wait_for_timeout(900); e.shot(f's_{mode}_{t}.png')
        # Feedback-Zustand
        if t in('choose','cloze','tones','listensent'):
            try:
                pg.click('.opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]',timeout=3000); e.shot(f's_{mode}_{t}_fb.png')
            except Exception as ex: print('fb fail',t,str(ex)[:80])
        pg.evaluate("document.querySelector('[data-s=quit]')&&document.querySelector('[data-s=quit]').click()"); pg.wait_for_timeout(200)
    print('errs',e.errs)
finally: e.close()
