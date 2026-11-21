from lib import *
e=Env(sw=False); pg=e.pg
try:
    e.open()
    pg.evaluate("__app.startPractice('choose',['zahlen'])"); pg.wait_for_selector('.opt')
    n0=pg.evaluate("__app.S.items.length"); print('start items',n0)
    # dieselbe Aufgabe 4x absichtlich falsch: sie muss jedes Mal wieder hinten angehängt werden
    wid=pg.evaluate("__app.S.items[0].wid"); wrongs=0
    for k in range(4):
        cur=pg.evaluate("__app.S.items[__app.S.i]")
        right=cur['wid']
        opts=pg.evaluate("[...document.querySelectorAll('.opt')].map(o=>o.dataset.o||o.dataset.id||'')")
        # falsche Option wählen: erste, deren data nicht die richtige ID ist
        idx=next((i for i,o in enumerate(opts) if str(right) not in (o or '')),0)
        pg.click(f'.opt >> nth={idx}'); pg.wait_for_selector('.sfoot [data-fb]'); pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(150)
        print('after wrong',k,'len',pg.evaluate("__app.S.items.length"))
    assert pg.evaluate("__app.S.items.length")>n0, 'keine Wiederholung'
    print('retry-Kopien', pg.evaluate("__app.S.items.filter(i=>i.retry).length"))
    print('errs',e.errs)
finally: e.close()
