"""Deutsche Sätze ohne Satzzeichen, 喂 ohne Klammer, Übungen laufen weiter"""
import re
from lib import *
e=Env(w=820,h=1000,sw=False); pg=e.pg
try:
    e.open()
    des=pg.evaluate("SENTS.map(s=>[s.id,s.de])")
    bad=[(i,d) for i,d in des if re.search(r'[,;:!?…„“"()–—]|(?<!\d)\.',d) or d!=d.strip() or '  ' in d]
    print('Sätze',len(des),'mit Satzzeichen:',bad); assert not bad
    print([d for i,d in des if i in (10,74,283,224)])
    g=pg.evaluate("gloss(BYID.get(218))"); print('喂 =',g); assert g=='Hallo'
    print('Klammer-Rest in Bedeutungen:',pg.evaluate("WORDS.filter(w=>w.l===1&&/\\(/.test(gloss(w))).length"))
    for t in ['trans','listensent','pairs','choose']:
        pg.evaluate(f"__app.startPractice('{t}',['gruss'])"); pg.wait_for_timeout(500)
        print(t,'startet, Aufgaben',pg.evaluate("SESS.items.length")); pg.click('[data-s=quit]')
    print('errs',e.errs); assert not e.errs
finally: e.close()
