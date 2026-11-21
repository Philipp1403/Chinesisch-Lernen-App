from lib import Env
e=Env(w=820,h=1100); pg=e.pg; e.open()
pg.evaluate("""()=>{const a=window.__app;const st=a.state();for(const l of a.LESSONS){for(const id of l.words){st.cards[id]={i:8,e:2.5,d:0,due:0,r:1}}}a.save();a.go('review');a.go('learn')}""")
pg.wait_for_selector('.sheet',timeout=4000); pg.wait_for_timeout(600); e.shot('n10_celebrate.png')
pg.click('.sheet [data-no]'); pg.wait_for_timeout(400); e.shot('n10_full.png')
pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(800); print('sheet again?',pg.locator('.sheet').count())
e.close_ = None
print(e.errs); e.close()
