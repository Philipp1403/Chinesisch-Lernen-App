from lib import *
e=Env(); pg=e.pg
try:
    e.open()
    pg.click('[data-open=familie]'); pg.wait_for_selector('.lhead'); pg.click('[data-learn]')
    for k in range(6):
        pg.wait_for_selector('.tag-mode'); pg.wait_for_timeout(250)
        if k==2: pg.click('[data-fb=\"0\"]')   # kenne ich schon
        else: pg.click('[data-fb=\"1\"]')
        pg.wait_for_timeout(250)
    pg.wait_for_selector('.donebox'); e.shot('n7_done.png')
    print(pg.inner_text('.donebox')[:200].replace('\n',' | '))
    cards=pg.evaluate("__app.state().cards"); print('cards',len(cards),[ (k,v['i']) for k,v in cards.items()])
    pg.click('#sf [data-fb=\"1\"]')  # Fertig
    pg.wait_for_selector('.lhead'); pg.wait_for_timeout(300); print('progress:',pg.inner_text('.lhead .muted.small'))
    pg.click('[data-back]'); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500); e.shot('n7_home_after.png')
    print('due line:',pg.locator('.dueline').count())
    # Wiederholen tab zeigt Fälligkeit
    pg.click('[data-tab=review]'); pg.wait_for_timeout(300); print(pg.inner_text('#main')[:160].replace('\n',' | '))
    # Gemischte Runde
    pg.evaluate("__app.startPractice('mixed',['familie'])"); pg.wait_for_timeout(600)
    types=pg.evaluate("__app.S.items.map(i=>i.type).join(',')"); print('mixed',types)
finally:
    print('errors',e.errs); e.close()
