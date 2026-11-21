from lib import *
e=Env(w=1280,h=900); pg=e.pg
try:
    e.open(); e.shot('n8_desktop.png')
    pg.click('[data-open=einkaufen]'); pg.wait_for_selector('.lhead'); pg.wait_for_timeout(300)
    pg.evaluate("window.scrollTo(0,document.body.scrollHeight)"); pg.wait_for_timeout(300); pg.screenshot(path='n8_lesson_bottom.png')
finally:
    print('errors',e.errs); e.close()
