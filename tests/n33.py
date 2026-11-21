import sys
from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
mode=sys.argv[1] if len(sys.argv)>1 else 'ipad'
W,H=(1024,712) if mode=='ipad' else (390,844)
e=Env(w=W,h=H,sw=False,mobile=(mode!='ipad')); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    pg.evaluate("(()=>{const s=__app.state().settings; s.freeDraw=true; s.showRef=true; s.showDe=false;})()")
    pg.evaluate("__app.startPractice('draw',['gruss'])"); pg.wait_for_selector('.wbox svg'); pg.wait_for_timeout(700)
    # warte bis Wort mit >=2 Zeichen oder nimm das erste
    word=pg.evaluate("__app.BYID.get(__app.S.items[__app.S.idx||0].wid).h"); n=len([c for c in word])
    print('word',word,'meaning visible',pg.evaluate("!!document.querySelector('.meaning')"))
    for ci in range(n):
        info=pg.evaluate("""(ci=>{const wb=document.querySelector('.wbox'); const box=wb.querySelectorAll('.wcell')[ci]||wb; const g=box.querySelector('svg:not(.freelayer) g[transform]');
          const m=/translate\\(([-\\d.]+),\\s*([-\\d.]+)\\)\\s*scale\\(([-\\d.]+),\\s*([-\\d.]+)\\)/.exec(g.getAttribute('transform'));
          const r=box.getBoundingClientRect(); return {tx:+m[1],ty:+m[2],sx:+m[3],sy:+m[4],l:r.left+box.clientLeft,t:r.top+box.clientTop}})""",ci)
        meds=pg.evaluate(f"CHARS[[...__app.BYID.get(__app.S.items[__app.S.idx||0].wid).h][{ci}]].medians")
        if ci==0: e.shot(f'g_{mode}_start.png')
        for med in meds:
            pts=[(info['l']+info['tx']+x*info['sx'], info['t']+info['ty']+y*info['sy']) for x,y in med]
            dense=[]
            for i in range(len(pts)-1):
                for k in range(8): dense.append((pts[i][0]+(pts[i+1][0]-pts[i][0])*k/8, pts[i][1]+(pts[i+1][1]-pts[i][1])*k/8))
            dense.append(pts[-1]); pg.mouse.move(*dense[0]); pg.mouse.down()
            for p in dense[1:]: pg.mouse.move(*p)
            pg.mouse.up(); pg.wait_for_timeout(420)
        pg.wait_for_timeout(1200); print('char',ci,'msg',pg.evaluate("document.querySelector('.wmsg').textContent"))
        if ci==0 and n>1: e.shot(f'g_{mode}_mid.png'); pg.wait_for_timeout(2600)
    pg.wait_for_timeout(500); e.shot(f'g_{mode}_end.png')
    print('footer',pg.evaluate("(document.querySelector('.sfoot')||{}).innerText"),'errs',e.errs)
finally: e.close()
