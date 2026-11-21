from lib import *
e=Env(); pg=e.pg
try:
    e.open()
    js="""(()=>{
      const find=z=>__app.SENTS?0:0;
      const S=[...__app.SBYID.values()];
      const by=zh=>S.find(s=>s.zh===zh);
      const t=(zh,heard)=>{ const s=by(zh); if(!s) return 'NOSENT '+zh; const r=__app.scoreSpeech(s,[heard]); return zh+' <- '+heard+' = '+r.score+' '+r.chars.map(c=>c.ch+':'+c.s).join(' '); };
      return [
        t('你好吗？','你好吗'),
        t('你好吗？','你好'),
        t('你好吗？','尼好吗'),
        t('你好吗？','你号吗'),
        t('我二十岁。','我20岁'),
        t('我二十岁。','我二十岁了'),
        t('我有两个朋友。','我有2个朋友'),
        t('现在三点半。','现在3点半'),
        t('今年是二零二六年。','今年是2026年'),
        t('我是学生。','我是老师'),
        t('我是学生。','他是学生'),
        t('我有一个哥哥。','我有一个哥哥'),
      ];
    })()"""
    for l in pg.evaluate(js): print(l)
finally:
    print('errors',e.errs); e.close()
