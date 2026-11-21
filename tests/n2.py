from lib import *
e=Env(); pg=e.pg
try:
    e.open(); e.shot('n2_home.png')
    # Lektion 'Zahlen' oeffnen und Wörter lernen
    pg.click('[data-open=zahlen]'); pg.wait_for_selector('.lhead'); pg.wait_for_timeout(300)
    pg.click('[data-learn]'); pg.wait_for_selector('.tag-mode'); pg.wait_for_timeout(800); e.shot('n2_intro.png')
    print('intro text:',pg.inner_text('.tag-mode'))
    pg.screenshot(path='n2_intro_full.png')
finally:
    print('errors',e.errs); e.close()
