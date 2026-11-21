from lib import *
import json
e=Env(); pg=e.pg
chars=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__))),'data','chars-1.json')))
def draw_char(ch):
    med=chars[ch]['medians']
    box=pg.evaluate("(()=>{const s=document.querySelector('.wbox svg');const r=s.getBoundingClientRect();return {x:r.left,y:r.top,w:+s.getAttribute('width')||r.width}})()")
    size=box['w']; pad=round(size*0.07); scale=(size-2*pad)/1024; xo=pad; yo=124*scale+pad
    for stroke in med:
        pts=[(box['x']+xo+x*scale, box['y']+size-yo-y*scale) for x,y in stroke]
        pg.mouse.move(*pts[0]); pg.mouse.down()
        for q in pts[1:]: pg.mouse.move(*q,steps=3)
        pg.mouse.up(); pg.wait_for_timeout(110)
try:
    e.open()
    pg.evaluate("__app.startPractice('draw',['zahlen'])"); pg.wait_for_selector('.wbox svg',state='attached'); pg.wait_for_timeout(500)
    e.shot('n5_draw.png')
    for k in range(2):
        wid=pg.evaluate("__app.S.items[__app.S.i].wid"); h=pg.evaluate("__app.BYID.get(__app.S.items[__app.S.i].wid).h")
        print('draw',h)
        for c in h: 
            draw_char(c); pg.wait_for_timeout(1000)
        pg.wait_for_selector('.sfoot.ok',timeout=8000)
        print(' fb:',pg.inner_text('.sfoot .fb b'))
        if k==0: e.shot('n5_draw_ok.png')
        pg.click('.sfoot [data-fb]'); pg.wait_for_selector('.wbox svg',state='attached'); pg.wait_for_timeout(400)
    # Lösung zeigen
    pg.click('[data-q=solution]'); pg.wait_for_selector('.sfoot.no',timeout=9000); print('giveup fb:',pg.inner_text('.sfoot .fb b'))
    pg.click('[data-s=quit]')
    # Wiederholung
    pg.evaluate("(()=>{const s=__app.state(); s.cards={ '254':{e:2.5,i:0,r:0,l:0,d:Date.now()-1000}, '221':{e:2.5,i:0,r:0,l:0,d:Date.now()-1000}, '94':{e:2.5,i:3,r:2,l:0,d:Date.now()-1000}}; s.settings.modes={read:true,listen:false,write:true}; __app.save(); __app.go('review'); })()")
    pg.wait_for_selector('[data-start]'); e.shot('n5_review.png')
    pg.click('[data-start]'); pg.wait_for_selector('.sfoot'); pg.wait_for_timeout(500); e.shot('n5_review_card.png')
    for k in range(6):
        mode=pg.inner_text('.tag-mode')
        if 'SCHREIBEN' in mode.upper():
            h=pg.evaluate("__app.BYID.get(__app.S.items[__app.S.i].wid).h")
            for c in h: draw_char(c); pg.wait_for_timeout(1000)
            pg.wait_for_selector('.rate',timeout=8000)
        else:
            pg.click('[data-fb=\"0\"]'); pg.wait_for_selector('.rate')
        if k==0: e.shot('n5_review_back.png')
        pg.click('.rate .r2'); pg.wait_for_timeout(500)
        if pg.locator('.donebox').count(): break
    print('done?',pg.locator('.donebox').count(), 'cards',json.dumps(pg.evaluate("__app.state().cards"))[:300])
    e.shot('n5_done.png')
finally:
    print('errors',e.errs); e.close()
