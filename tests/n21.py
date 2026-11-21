from lib import *
FAKE=open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
e=Env(sw=False); pg=e.pg
pg.add_init_script(FAKE)
try:
    e.open()
    # Tones
    pg.evaluate("__app.startPractice('tones',['zahlen'])"); pg.wait_for_selector('.opt.tone'); pg.wait_for_timeout(400); e.shot('n21_tones.png')
    n=pg.evaluate("__app.S.items.length"); print('tones items',n)
    pg.click('.opt.tone >> nth=1'); pg.wait_for_selector('.sfoot [data-fb]'); e.shot('n21_tones_fb.png'); pg.click('[data-s=quit]')
    # Cloze
    pg.evaluate("__app.startPractice('cloze',['familie'])"); pg.wait_for_selector('.ruby.blank'); pg.wait_for_timeout(300); e.shot('n21_cloze.png')
    print('cloze items',pg.evaluate("__app.S.items.length"))
    pg.click('.opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]'); e.shot('n21_cloze_fb.png'); pg.click('[data-s=quit]')
    # Pairs
    pg.evaluate("__app.startPractice('pairs',['essen'])"); pg.wait_for_selector('.pbtn'); pg.wait_for_timeout(300); e.shot('n21_pairs.png')
    ids=pg.evaluate("__app.S.items[0].wids")
    for i in ids:
        pg.click(f'[data-l="{i}"]'); pg.click(f'[data-r="{i}"]'); pg.wait_for_timeout(100)
    pg.wait_for_selector('.sfoot.ok'); e.shot('n21_pairs_done.png'); print('pairs done; items',pg.evaluate("__app.S.items.length"))
    # falsches Paar
    pg.click('.sfoot [data-fb]'); pg.wait_for_selector('.pbtn'); 
    ids=pg.evaluate("__app.S.items[1].wids"); pg.click(f'[data-l="{ids[0]}"]'); pg.click(f'[data-r="{ids[1]}"]'); pg.wait_for_timeout(200); e.shot('n21_pairs_wrong.png')
    pg.click('[data-s=quit]')
    # listensent
    pg.evaluate("__app.startPractice('listensent',['familie'])"); pg.wait_for_selector('.opts.long .opt'); pg.wait_for_timeout(300); e.shot('n21_listensent.png')
    pg.click('.opts.long .opt >> nth=0'); pg.wait_for_selector('.sfoot [data-fb]'); e.shot('n21_listensent_fb.png'); pg.click('[data-s=quit]')
    # mixed durchlaufen
    pg.evaluate("__app.startPractice('mixed',[])"); pg.wait_for_timeout(500)
    types=pg.evaluate("__app.S.items.map(i=>i.type)"); print('mixed',types)
    # settings
    pg.evaluate("__app.go('practice')"); pg.wait_for_timeout(300); e.shot('n21_practice.png')
    print('errs',e.errs)
finally: e.close()
