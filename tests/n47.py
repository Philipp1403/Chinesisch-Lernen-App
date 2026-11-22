"""iPhone 13 Pro Max (428x926): Tabs einlinig, Turm-Chips einlinig, Überschrift ohne Umbruch, Kachelreihe gleichmäßig auf höchstens zwei Zeilen, iPhone-Tonhinweis. Läuft mit iPhone-Kennung."""
import os,subprocess,time,sys
from lib import testroot
from playwright.sync_api import sync_playwright
FAKE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'n17.py')).read().split('FAKE="""')[1].split('"""')[0]
UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
srv=subprocess.Popen(['python3','-m','http.server','8767','-d',testroot()],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
pw=sync_playwright().start(); b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
bad=[]
try:
    for dark in (False,True):
        ctx=b.new_context(viewport={'width':428,'height':926},device_scale_factor=2,is_mobile=True,has_touch=True,user_agent=UA,color_scheme='dark' if dark else 'light',service_workers='block'); pg=ctx.new_page(); pg.add_init_script(FAKE)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://localhost:8767/index.html'); pg.wait_for_selector('.lcard'); pg.wait_for_timeout(500); t='d' if dark else 'l'
        print(t,'IS_IPHONE',pg.evaluate("IS_IPHONE"))
        # Wiederholen-Zähler erzeugen, damit "(7)" erscheint
        pg.evaluate("(()=>{const a=__app,st=a.state();st.cards={};for(const id of a.LESSONS[0].words.slice(0,7)) st.cards[id]={e:2.5,i:0,r:0,l:0,s:0,d:Date.now()-1000};a.save();a.go('learn')})()"); pg.wait_for_timeout(500)
        r=pg.evaluate("""(()=>{const sp=[...document.querySelectorAll('#tabs button span')].map(s=>Math.round(s.getBoundingClientRect().height));const bar=document.querySelector('#tabs').getBoundingClientRect();
          const chips=[...document.querySelectorAll('.tw-lv div')].map(d=>Math.round(d.getBoundingClientRect().height));const h2=document.querySelector('.sectionhead h2');
          const due=document.querySelector('#tabs .due');return {spanH:sp,barH:Math.round(bar.height),chipH:chips,h2H:Math.round(h2.getBoundingClientRect().height),dueTxt:due&&getComputedStyle(due,'::before').content}})()""")
        print(t,r)
        if max(r['spanH'])>16: bad.append((t,'Tab-Label zweizeilig',r['spanH']))
        if max(r['chipH'])>34: bad.append((t,'Turm-Chip zweizeilig',r['chipH']))
        if r['h2H']>30: bad.append((t,'Überschrift umbricht',r['h2H']))
        pg.screenshot(path=f'n47_{t}_lernen.png')
        pg.evaluate("__app.go('settings')"); pg.wait_for_timeout(400); pg.screenshot(path=f'n47_{t}_einst.png')
        hint=pg.evaluate("[...document.querySelectorAll('.infobox')].some(x=>/Stumm-Schalter/.test(x.textContent))"); print(t,'iPhone-Hinweis',hint)
        if not hint: bad.append((t,'Tonhinweis fehlt'))
        # Satz bauen: Zeilen
        pg.evaluate("(t)=>{__app.startPractice(t,[]); const it=__app.makeItems(t,[],50); SESS.items=it; SESS.total=it.length; SESS.i=0; showItem();}",'build'); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(300)
        n=pg.evaluate("SESS.items.length"); worst=0; sh=0
        for k in range(n):
            pg.evaluate("(k)=>{SESS.i=k; showItem();}",k); pg.wait_for_selector('.bank .tok'); pg.wait_for_timeout(100)
            rr=pg.evaluate("""(()=>{const tiles=[...document.querySelectorAll('#bank .tok')];const rows={};tiles.forEach(x=>{const y=Math.round(x.getBoundingClientRect().top);rows[y]=(rows[y]||0)+1});const c=Object.values(rows);
              return {rows:c.length,counts:c,tk:getComputedStyle(document.querySelector('#bank')).getPropertyValue('--tk').trim(),n:tiles.length,over:document.querySelector('#bank').scrollWidth>document.querySelector('#bank').clientWidth+1}})()""")
            worst=max(worst,rr['rows'])
            if rr['rows']>2: bad.append((t,'mehr als zwei Zeilen',k,rr))
            if rr['rows']==2 and abs(rr['counts'][0]-rr['counts'][1])>2 and rr['n']<=8: bad.append((t,'ungleich verteilt',k,rr))
            if rr['over']: bad.append((t,'Reihe läuft über',k,rr))
            if k in (0,1,2,3): pg.screenshot(path=f'n47_{t}_bauen{k}.png')
        print(t,'Satz bauen: Aufgaben',n,'höchstens Zeilen',worst)
        print(t,'errs',errs); 
        if errs: bad.append((t,'Fehler',errs))
        ctx.close()
finally: b.close(); pw.stop(); srv.terminate()
print('PROBLEME',bad[:6],len(bad)) if bad else print('OK')
sys.exit(1 if bad else 0)
