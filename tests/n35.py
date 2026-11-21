import sys
from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
def run(W,H,dark,mobile,mode):
    e=Env(w=W,h=H,sw=False,dark=dark,mobile=mobile); pg=e.pg; pg.add_init_script(FAKE)
    tag=f'{W}x{H}_{"d" if dark else "l"}_{mode}'
    try:
        e.open()
        pg.evaluate(f"startWriteDrill({{scope:['gruss'],demo:false,reps:3,count:1,help:'on',mode:'{mode}'}})")
        pg.wait_for_selector('.wbox .wcell svg',timeout=6000); pg.wait_for_timeout(600)
        r=pg.evaluate("""(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const b=q('.wbox'),f=q('.sfoot'),bt=q('.wbtns'),m=q('.wmsg'),sk=document.querySelector('.sfoot .btn').getBoundingClientRect();
          return {cells:document.querySelectorAll('.wcell').length,boxes:document.querySelectorAll('.wbox').length,bw:b.width,bh:b.height,boxBottom:b.bottom,btnBottom:bt.bottom,msgBottom:m.bottom,footTop:f.top,footH:f.height,skipH:sk.height,vh:innerHeight,sh:document.querySelector('.sbody').scrollHeight,ch:document.querySelector('.sbody').clientHeight}})()""")
        print(tag,r)
        assert r['boxes']==1 and r['cells']==2,'zwei Zeichen müssen nebeneinander in einem Feld stehen'
        assert abs(r['bw']-2*r['bh'])<6,'Feld nicht doppelt so breit wie hoch'
        assert r['btnBottom']<=r['footTop']+1,'Knöpfe überlappen die Fußleiste'
        assert r['skipH']<=48,'Fußleiste-Knopf zu groß'
        e.shot(f'n35_{tag}.png')
        # beide Zeichen nacheinander zeichnen
        word=pg.evaluate("__app.BYID.get(SESS.items[SESS.i].wid).h")
        for ci in range(len([c for c in word])):
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
            pg.wait_for_timeout(1700)
            print(' char',ci,'msg',pg.inner_text('.wmsg'),'| strokes',pg.evaluate("document.querySelectorAll('.fstroke').length"))
            if ci==0: e.shot(f'n35_{tag}_mid.png')
        pg.wait_for_timeout(500); e.shot(f'n35_{tag}_end.png')
        fin=pg.inner_text('.wmsg'); print(' ende:',fin,'| Footer:',pg.inner_text('.sfoot'))
        if mode=='free': assert pg.evaluate("document.querySelectorAll('.fstroke').length")>0,'freie Striche fehlen'
        else: assert pg.evaluate("document.querySelectorAll('.fstroke').length")==0,'im Nachzeichnen-Modus darf es keine freien Striche geben'
        print(' errs',e.errs)
    finally: e.close()
for args in [(1180,820,True,False,'trace'),(1180,820,True,False,'free'),(820,1180,False,False,'trace'),(390,844,False,True,'free')]:
    run(*args)

# Komma-Kachel beim Satz bauen
e=Env(w=820,h=1000,sw=False); pg=e.pg; pg.add_init_script(FAKE)
try:
    e.open()
    pg.evaluate("__app.startPractice('build',['gruss'])"); pg.wait_for_selector('.bank .tok')
    pg.evaluate("SESS.items=[{type:'build',sid:284,dis:[{h:'吃',p:'chī'},{h:'好',p:'hǎo'}]}]; SESS.total=1; SESS.i=0; showItem()"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(300)
    toks=pg.evaluate("[...document.querySelectorAll('.bank .tok')].map(t=>t.querySelector('.th').textContent+(t.classList.contains('pun')?'*':''))"); print('Kacheln',toks)
    assert not any(t.endswith('*') or t in '，。、？！' for t in toks),'seit v20 gibt es keine Satzzeichen-Kacheln'
    for h in ['对不起','没关系']:
        pg.evaluate("h=>{const b=[...document.querySelectorAll('.bank .tok:not(.ghost)')].find(t=>t.querySelector('.th').textContent===h); b.click();}",h); pg.wait_for_timeout(120)
    e.shot('n35_build.png'); pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.sfoot.ok,.sfoot.no'); print('Ergebnis:',pg.inner_text('.sfoot').split('\n')[0])
    assert pg.evaluate("document.querySelector('.sfoot').classList.contains('ok')"),'Satz ohne Satzzeichen nicht als richtig gewertet'
    # Satz ohne inneres Satzzeichen: keine Kachel
    pg.evaluate("SESS.items=[{type:'build',sid:8,dis:[{h:'吃',p:'chī'}]}]; SESS.i=0; showItem()"); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(300)
    assert pg.evaluate("document.querySelectorAll('.bank .tok.pun').length")==0
    print('errs',e.errs)
finally: e.close()
