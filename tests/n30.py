from lib import *
FAKE=open('n17.py').read().split('FAKE="""')[1].split('"""')[0]
e=Env(w=834,h=1194,sw=False); pg=e.pg; pg.add_init_script(FAKE)
def q(): pg.evaluate("document.querySelector('[data-s=quit]')&&document.querySelector('[data-s=quit]').click()"); pg.wait_for_timeout(250)
try:
    e.open(); e.shot('p_learn.png')
    for t in ['pairs','cloze','trans','choose']:
        pg.evaluate(f"__app.startPractice('{t}',['gruss'])"); pg.wait_for_timeout(900); e.shot(f'p_{t}.png'); q()
    # Ergebnisbildschirm: Paare komplett lösen
    pg.evaluate("__app.startPractice('pairs',['gruss'])"); pg.wait_for_selector('.pbtn')
    for r in range(3):
        ids=pg.evaluate("__app.S.items[__app.S.idx].wids")
        for i in ids: pg.click(f'[data-l="{i}"]'); pg.click(f'[data-r="{i}"]'); pg.wait_for_timeout(80)
        pg.wait_for_selector('.sfoot [data-fb]'); pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(500)
        if not pg.query_selector('.pbtn'): break
    pg.wait_for_timeout(600); e.shot('p_result.png')
    print('errs',e.errs)
finally: e.close()
