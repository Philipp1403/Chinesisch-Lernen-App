from lib import Env
import datetime
e=Env(); pg=e.pg; e.open()
pg.evaluate("(m)=>localStorage.setItem('hanyu.azure.v1',JSON.stringify({key:'badkey',region:'westeurope',engine:'azure',usageSec:0,month:m}))",datetime.date.today().strftime('%Y-%m'))
pg.reload(); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(400)
print('sdk before',pg.evaluate("()=>typeof window.SpeechSDK"))
pg.evaluate("()=>{const a=window.__app;a.startPractice('speak',[a.LESSONS[0].id])}")
pg.wait_for_selector('#mic'); pg.click('#mic')
pg.wait_for_function("()=>!document.querySelector('#mic').classList.contains('live')",timeout=40000)
print('sdk after',pg.evaluate("()=>typeof window.SpeechSDK+' '+typeof SpeechSDK.SpeechConfig+' '+typeof SpeechSDK.PronunciationAssessmentConfig"))
print('note:',pg.inner_text('#mnote'))
print(e.errs); e.close()
