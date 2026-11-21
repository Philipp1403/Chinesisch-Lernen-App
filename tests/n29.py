from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
e=Env(w=1024,h=712,sw=False,dark=True); pg=e.pg; pg.add_init_script(FAKE)
def q(): pg.evaluate("document.querySelector('[data-s=quit]')&&document.querySelector('[data-s=quit]').click()"); pg.wait_for_timeout(250)
try:
    e.open(); e.shot('v_learn.png')
    for v in ['practice','review','words','settings']:
        pg.evaluate(f"__app.go('{v}')"); pg.wait_for_timeout(600); e.shot(f'v_{v}.png')
    pg.evaluate("startFlashcards(['gruss'],3)"); pg.wait_for_timeout(1000); e.shot('v_wcard.png'); q()
    pg.evaluate("__app.startPractice('wdrill',['gruss'])"); pg.wait_for_timeout(1000); e.shot('v_wdrill.png'); q()
    pg.evaluate("__app.go('learn')"); pg.wait_for_timeout(300); pg.click('.lcard >> nth=0'); pg.wait_for_timeout(700); e.shot('v_sheet.png')
    print('errs',e.errs)
finally: e.close()
