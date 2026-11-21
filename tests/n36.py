from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
def strokes(pg,ci):
    info=pg.evaluate("""(ci=>{const wb=document.querySelector('.wbox'); const box=wb.querySelectorAll('.wcell')[ci]; const g=box.querySelector('svg:not(.freelayer) g[transform]');
      const m=/translate\\(([-\\d.]+),\\s*([-\\d.]+)\\)\\s*scale\\(([-\\d.]+),\\s*([-\\d.]+)\\)/.exec(g.getAttribute('transform'));
      const r=box.getBoundingClientRect(); return {tx:+m[1],ty:+m[2],sx:+m[3],sy:+m[4],l:r.left,t:r.top}})""",ci)
    meds=pg.evaluate(f"CHARS[[...__app.BYID.get(SESS.items[SESS.i].wid).h][{ci}]].medians")
    for med in meds:
        pts=[(info['l']+info['tx']+x*info['sx'], info['t']+info['ty']+y*info['sy']) for x,y in med]
        dense=[]
        for i in range(len(pts)-1):
            for k in range(8): dense.append((pts[i][0]+(pts[i+1][0]-pts[i][0])*k/8, pts[i][1]+(pts[i+1][1]-pts[i][1])*k/8))
        dense.append(pts[-1]); pg.mouse.move(*dense[0]); pg.mouse.down()
        for p in dense[1:]: pg.mouse.move(*p)
        pg.mouse.up(); pg.wait_for_timeout(400)
def scribble(pg,ci):
    r=pg.evaluate(f"(()=>{{const r=document.querySelectorAll('.wcell')[{ci}].getBoundingClientRect();return [r.left,r.top,r.width,r.height]}})()")
    pg.mouse.move(r[0]+r[2]*.2,r[1]+r[3]*.2); pg.mouse.down()
    for i in range(1,30): pg.mouse.move(r[0]+r[2]*(.2+.6*(i%2)),r[1]+r[3]*(.2+.6*i/30))
    pg.mouse.up(); pg.wait_for_timeout(300)
fs=lambda pg:pg.evaluate("document.querySelectorAll('.fstroke').length")
e=Env(w=1180,h=820,sw=False,dark=True); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    # A) Lösung beim ersten Zeichen: alle Striche müssen in Lösungsfarbe laufen
    pg.evaluate("startWriteDrill({scope:['gruss'],demo:false,reps:3,count:1,help:'on',mode:'free'})")
    pg.wait_for_selector('.wbox .wcell svg',timeout=6000); pg.wait_for_timeout(600)
    pg.click('[data-q=solution]'); pg.wait_for_timeout(4000); e.shot('n36_sol1.png')
    col=pg.evaluate("""(()=>{const c=document.querySelectorAll('.wcell')[0]; const ps=[...c.querySelectorAll('svg:not(.freelayer) path')]; const cs=ps.map(p=>getComputedStyle(p).fill+'|'+(p.getAttribute('fill')||'')+'|'+p.getAttribute('style')); return cs.slice(0,6)})()""")
    print('Pfade',col)
    pg.click('[data-q=solution]'); pg.wait_for_timeout(4000)
    print('Ende:',pg.inner_text('.wmsg')); assert 'Score' not in pg.inner_text('.wmsg')
    # B) kein Weiterschreiben nach Fertigstellen
    pg.click('.sfoot [data-fb]'); pg.wait_for_selector('.wbox .wcell svg'); pg.wait_for_timeout(600)
    strokes(pg,0); pg.wait_for_timeout(1500); n0=fs(pg); print('nach Zeichen 1: freie Striche',n0)
    scribble(pg,0); print('  nach Kritzeln in fertigem Zeichen 1:',fs(pg)); assert fs(pg)==n0,'Zeichen 1 nimmt noch Striche an'
    strokes(pg,1); pg.wait_for_timeout(800); n1=fs(pg); print('nach Zeichen 2: freie Striche',n1,'| Meldung:',pg.inner_text('.wmsg')); assert 'Score' not in pg.inner_text('.wmsg')
    scribble(pg,0); scribble(pg,1); print('  nach Kritzeln im fertigen Wort:',fs(pg)); assert fs(pg)==n1,'Feld nimmt nach dem Ende noch Striche an'
    e.shot('n36_end.png')
    print('errs',e.errs)
finally: e.close()
