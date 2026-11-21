from lib import *
e=Env(sw=False); pg=e.pg
try:
    e.open()
    r=pg.evaluate("""()=>{const ids=LESSONS.flatMap(l=>l.words);const no=ids.filter(id=>!EXAMPLE.get(id)).map(id=>BYID.get(id).h);
      const one=ids.filter(id=>{const s=SBYID.get(EXAMPLE.get(id));return s&&s.t.filter(t=>!t.punc).length<2}).map(id=>BYID.get(id).h);
      const same=ids.filter(id=>{const s=SBYID.get(EXAMPLE.get(id));return s&&s.t.map(t=>t.h).join('').replace(/[。！？，]/g,'')===BYID.get(id).h}).map(id=>BYID.get(id).h);
      return {total:ids.length,no,one,same,gruss:LESSONS[0].sentences.length}}""")
    print(r); print('errs',e.errs)
finally: e.close()
