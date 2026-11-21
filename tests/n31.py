import sys,math
from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
free=len(sys.argv)>1 and sys.argv[1]=='free'
e=Env(w=1024,h=712,sw=False,dark=True); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    if free: pg.evaluate("__app.state().settings.freeDraw=true")
    pg.evaluate("__app.startPractice('draw',['zahlen'])"); pg.wait_for_timeout(1500)
    if pg.query_selector('.sfoot .btn'): 
        try: pg.click('text=Jetzt üben',timeout=1500)
        except Exception: pass
    pg.wait_for_selector('.wbox svg',timeout=5000); pg.wait_for_timeout(500)
    e.shot('d_layout.png')
    bb=pg.evaluate("(()=>{const r=document.querySelector('.wbox').getBoundingClientRect();const f=document.querySelector('.sfoot').getBoundingClientRect();return [r.left,r.top,r.width,r.height,f.top,innerHeight,document.documentElement.scrollHeight]})()")
    print('box',bb)
    # Zeichen holen
    w=pg.evaluate("__app.BYID.get(__app.S.items[__app.S.idx||0].wid).h"); print('word',w)
    # grobe Striche: Wort ist 一/二/三 etc.? zeichne einen wackeligen horizontalen Strich links->rechts
    x0,y0,W=bb[0],bb[1],bb[2]
    pg.mouse.move(702,288); pg.mouse.down()
    for i in range(1,21): pg.mouse.move(702-90*i/20+6*math.sin(i/2),288+112*i/20)
    pg.mouse.up(); pg.wait_for_timeout(700); e.shot('d_after1.png')
    pg.mouse.move(745,210); pg.mouse.down()
    for i in range(1,26): pg.mouse.move(745+170*i/25,210+190*(i/25)**0.7)
    pg.mouse.up(); pg.wait_for_timeout(700); e.shot('d_after2.png')
    pg.wait_for_timeout(300); e.shot('d_after3.png')
    print('fstrokes',pg.evaluate("document.querySelectorAll('.fstroke').length"),'ok',pg.evaluate("document.querySelectorAll('.fstroke.ok').length"),'msg',pg.evaluate("document.querySelector('.wmsg').textContent"),'ref',pg.evaluate("document.querySelectorAll('.wbox svg:not(.freelayer) path').length"))
    print('errs',e.errs)
finally: e.close()
