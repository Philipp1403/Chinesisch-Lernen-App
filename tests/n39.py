import sys
from lib import *
PUNC='，。、？！：；,.?!'
bad=[]
for w,h,dark in [(820,1100,False),(390,844,True)]:
    e=Env(w=w,h=h,dark=dark,mobile=(w<600),sw=False); pg=e.pg
    try:
        e.open()
        ids=pg.evaluate("[...document.querySelectorAll('[data-open]')].map(b=>b.dataset.open)")
        for lid in [ids[0],ids[len(ids)//2],ids[-1]]:
            try: pg.evaluate(f"__app.go('lesson',{{id:'{lid}'}})")
            except Exception: continue
            pg.wait_for_timeout(500)
            rows=pg.evaluate("""()=>[...document.querySelectorAll('[data-sayS]')].map(b=>{
              const r=b.closest('.wrow'), rr=r.getBoundingClientRect(), br=b.getBoundingClientRect(), b2=r.querySelector('[data-slowsent]').getBoundingClientRect();
              const cut=(rr.top+rr.bottom)/2;
              return {d1:Math.abs((br.top+br.bottom)/2-cut), d2:Math.abs((b2.top+b2.bottom)/2-cut), zh:[...r.querySelectorAll('.r-hz')].map(x=>x.textContent).join(''), de:r.querySelector('.de').textContent}})""")
            assert rows, 'keine Satzzeilen'
            for r in rows:
                if r['d1']>3 or r['d2']>3: bad.append(('mitte',w,lid,r))
                if any(c in r['zh'] for c in PUNC): bad.append(('zeichen zh',w,lid,r))
                if r['de'].rstrip()[-1:] in '.!?': bad.append(('zeichen de',w,lid,r))
            print(w,lid,len(rows),'Zeilen, max Abweichung',max(max(r['d1'],r['d2']) for r in rows))
            pg.evaluate("document.querySelector('[data-sayS]').scrollIntoView({block:'center'})"); e.shot(f'n39_{w}_{lid}.png')
        # Satz bauen: keine Satzzeichen-Kacheln, Satz ohne Satzzeichen
        for ex in ['build','trans']:
            pg.evaluate(f"__app.startPractice('{ex}',['{ids[0]}'])"); pg.wait_for_selector('.tok'); pg.wait_for_timeout(400)
            txt=pg.evaluate("[...document.querySelectorAll('.tok')].map(x=>x.textContent).join('')+[...document.querySelectorAll('.sentence .r-hz')].map(x=>x.textContent).join('')")
            if ex=='build' and any(c in txt for c in PUNC): bad.append(('kachel zeichen',w,txt))
            print(ex,'Kacheln geprüft')
            pg.click('[data-s=quit]'); pg.wait_for_timeout(300)
        print('errs',e.errs); assert not e.errs
    finally: e.close()
print('FEHLER',bad) if bad else print('OK')
sys.exit(1 if bad else 0)
