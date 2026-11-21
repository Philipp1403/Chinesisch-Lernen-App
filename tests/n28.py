from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
e=Env(w=1024,h=712,sw=False); pg=e.pg
pg.add_init_script(FAKE)
res=[]
def slowcheck(label):
    btns=pg.query_selector_all('[data-au=s], [data-ex=s], [data-t=s], [data-hint=s], [data-slowword], [data-slowsent], [data-tipslow]')
    vis=[b for b in btns if b.is_visible()]
    if not vis: res.append((label,'KEIN Langsam-Knopf')); return
    for i,b in enumerate(vis):
        pg.evaluate("window.__utt=[]"); b.click(); pg.wait_for_timeout(500)
        u=pg.evaluate("__utt")
        ok=bool(u) and all(x['r']<=0.6 for x in u)
        res.append((label+f'#{i}','OK' if ok else 'FEHLER',[ (x['t'],x['r']) for x in u]))
try:
    e.open()
    pg.evaluate("__app.startLearn('gruss')"); pg.wait_for_timeout(800); slowcheck('intro')
    for t in ['choose','trans','dictate','tones','listensent','speak','draw']:
        pg.evaluate(f"__app.startPractice('{t}',['gruss'])"); pg.wait_for_timeout(900); slowcheck(t)
        pg.evaluate("document.querySelector('[data-s=quit]')&&document.querySelector('[data-s=quit]').click()"); pg.wait_for_timeout(200)
    # Karteikarten
    pg.evaluate("startFlashcards(['gruss'],3)"); pg.wait_for_timeout(900); slowcheck('wcard')
    pg.evaluate("document.querySelector('[data-s=quit]')&&document.querySelector('[data-s=quit]').click()"); pg.wait_for_timeout(200)
    # Lektionsblatt + Wortdetail
    # wcard braucht Sprechphase
    pg.evaluate("__app.go('learn')"); pg.wait_for_timeout(400)
    pg.click('.lcard >> nth=0'); pg.wait_for_timeout(600)
    for sel in ['[data-slowword] >> nth=0','[data-slowsent] >> nth=0']:
        pg.evaluate("window.__utt=[]"); pg.click(sel); pg.wait_for_timeout(500); u=pg.evaluate("__utt"); res.append((sel,'OK' if u and all(x['r']<=0.6 for x in u) else 'FEHLER',[(x['t'],x['r']) for x in u]))
    pg.click('[data-word] >> nth=0'); pg.wait_for_timeout(600)
    pg.evaluate("window.__utt=[]"); pg.click('#sheetwrap [data-au=s]'); pg.wait_for_timeout(500); u=pg.evaluate("__utt"); res.append(('wortblatt','OK' if u and all(x['r']<=0.6 for x in u) else 'FEHLER',[(x['t'],x['r']) for x in u]))
    for r in res: print(r)
    print('errs',e.errs)
finally: e.close()
