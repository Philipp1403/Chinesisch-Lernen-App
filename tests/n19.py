from lib import *
e=Env(sw=False); pg=e.pg
try:
    e.open()
    pg.evaluate("__app.startPractice; startWriteDrill({scope:['zahlen'],demo:false,reps:3,count:2,help:'fade'})")
    pg.wait_for_selector('.wbox svg'); pg.wait_for_timeout(500)
    print('items',pg.evaluate("__app.S.items.length"), pg.evaluate("document.querySelector('.dtxt').textContent"))
    for rep in range(3):
        pg.click('[data-q=solution]')
        pg.wait_for_selector('.sfoot [data-fb]:has-text("Wiederholung"), .sfoot [data-fb]:has-text("Fertig")',timeout=15000)
        print(' rep',rep+1,pg.evaluate("document.querySelector('.dtxt').textContent"), '|', pg.evaluate("document.querySelector('.sfoot [data-fb]').textContent"))
        pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(500)
    pg.wait_for_selector('.sfoot.ok'); print('done msg:',pg.evaluate("document.querySelector('.sfoot .fb').innerText"))
    pg.click('.sfoot [data-fb]'); pg.wait_for_timeout(600)
    # second word with demo shown
    print('word2 text',pg.evaluate("document.querySelector('.dtxt').textContent"))
    pg.click('[data-s=quit]')
    # demo mode
    pg.evaluate("startWriteDrill({scope:['zahlen'],demo:true,reps:2,count:0,help:'on'})")
    pg.wait_for_selector('.tiles.big .tile'); pg.wait_for_timeout(500)
    print('demo items',pg.evaluate("__app.S.items.length"))
    pg.click('.sfoot [data-fb="1"]'); pg.wait_for_selector('.wbox svg')
    print('help on:',pg.evaluate("document.querySelector('.dtxt').textContent"))
    pg.click('[data-s=quit]')
    # Wort-Tipp
    pg.evaluate("__app.go('lesson',{id:'familie'})"); pg.wait_for_timeout(500)
    pg.click('.wrow .ruby[data-tw] >> nth=0'); pg.wait_for_selector('#wtip'); e.shot('n19_tip.png')
    print('tip:',pg.evaluate("document.querySelector('#wtip').innerText.replace(/\\n/g,' | ')"))
    pg.mouse.click(10,10); pg.wait_for_timeout(200); print('tip closed:',pg.evaluate("!document.querySelector('#wtip')"))
    # Tip im Satz bauen Lösung
    pg.evaluate("__app.startPractice('build',['familie'])"); pg.wait_for_selector('.bank .tok'); pg.click('.sfoot [data-fb="0"]'); pg.wait_for_selector('.sfoot.no')
    pg.click('.sfoot .ruby[data-tw] >> nth=0'); pg.wait_for_selector('#wtip'); e.shot('n19_tip_session.png')
    print('errs',e.errs)
finally: e.close()
