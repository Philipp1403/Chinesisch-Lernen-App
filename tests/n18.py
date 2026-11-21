import sys
from lib import *
w=int(sys.argv[1]) if len(sys.argv)>1 else 820
h=1100 if w>600 else 844
e=Env(w=w,h=h,mobile=(w<600),sw=False); pg=e.pg
try:
    e.open(); e.shot(f'n18_{w}_learn.png')
    pg.evaluate("__app.go('lesson',{id:'zahlen'})"); pg.wait_for_timeout(500); e.shot(f'n18_{w}_lesson.png')
    pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(300); e.shot(f'n18_{w}_practice.png')
    pg.click('[data-ex=wdrill]'); pg.wait_for_timeout(500); e.shot(f'n18_{w}_wsetup.png')
    pg.evaluate("document.querySelector('.sheet').scrollTop=9999"); e.shot(f'n18_{w}_wsetup2.png')
    pg.click('.sheet [data-l=zahlen]'); pg.click('.sheet [data-go]'); pg.wait_for_selector('.tiles.big .tile'); pg.wait_for_timeout(2500); e.shot(f'n18_{w}_demo.png')
    pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.wbox svg'); pg.wait_for_timeout(600); e.shot(f'n18_{w}_rep1.png')
    pg.click('[data-s=quit]')
    pg.evaluate("__app.go('review')"); pg.wait_for_timeout(300); e.shot(f'n18_{w}_review.png')
    pg.evaluate("__app.go('words')"); pg.wait_for_timeout(300); e.shot(f'n18_{w}_words.png')
    pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(300); e.shot(f'n18_{w}_settings.png')
    print('errs',e.errs)
finally: e.close()
