import sys,math,json
from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
sloppy=float(sys.argv[1]) if len(sys.argv)>1 else 0
ref=(sys.argv[2]!='noref') if len(sys.argv)>2 else True
e=Env(w=1024,h=712,sw=False,dark=True); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    pg.evaluate(f"(()=>{{const s=__app.state().settings; s.freeDraw=true; s.showRef={str(ref).lower()};}})()")
    pg.evaluate("__app.startPractice('draw',['zahlen'])"); pg.wait_for_selector('.wbox svg'); pg.wait_for_timeout(700)
    for ch in range(2):
        info=pg.evaluate("""(()=>{const box=document.querySelector('.wbox'); const g=box.querySelector('svg:not(.freelayer) g[transform]');
          const m=/translate\\(([-\\d.]+),\\s*([-\\d.]+)\\)\\s*scale\\(([-\\d.]+),\\s*([-\\d.]+)\\)/.exec(g.getAttribute('transform'));
          const r=box.getBoundingClientRect(); const w=__app.BYID.get(__app.S.items[__app.S.idx||0].wid).h;
          return {tx:+m[1],ty:+m[2],sx:+m[3],sy:+m[4],l:r.left+box.clientLeft,t:r.top+box.clientTop,w}})()""")
        if ch==0: print('word',info['w'])
        meds=pg.evaluate(f"CHARS[[...__app.BYID.get(__app.S.items[__app.S.idx||0].wid).h][0]].medians")
        for med in meds:
            pts=[(info['l']+info['tx']+x*info['sx']+sloppy, info['t']+info['ty']+y*info['sy']+sloppy*0.7) for x,y in med]
            # interpoliere
            dense=[]
            for i in range(len(pts)-1):
                for k in range(8): dense.append((pts[i][0]+(pts[i+1][0]-pts[i][0])*k/8, pts[i][1]+(pts[i+1][1]-pts[i][1])*k/8))
            dense.append(pts[-1])
            pg.mouse.move(*dense[0]); pg.mouse.down()
            for p in dense[1:]: pg.mouse.move(*p)
            pg.mouse.up(); pg.wait_for_timeout(450)
        pg.wait_for_timeout(500)
        break
    e.shot(f'f_{int(sloppy)}_{"ref" if ref else "noref"}.png')
    print('msg',pg.evaluate("document.querySelector('.wmsg').textContent"),'| footer',pg.evaluate("(document.querySelector('.sfoot')||{}).innerText"))
    print('errs',e.errs)
finally: e.close()
