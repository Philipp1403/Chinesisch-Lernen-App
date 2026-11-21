import json,subprocess,time,re
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765','-d',__import__('lib').testroot()],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
GISTS={}   # id -> {description, files}
LOG=[]
CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','content-type':'application/json'}
def api(route,request):
    u=request.url.replace('https://api.github.com','')
    m=request.method; LOG.append((m,u,request.headers.get('authorization','')[:12]))
    if m=='OPTIONS': return route.fulfill(status=204,headers=CORS)
    if request.headers.get('authorization')!='Bearer TOKEN1': return route.fulfill(status=401,headers=CORS,body='{}')
    if m=='GET' and u.startswith('/gists?'):
        return route.fulfill(status=200,headers=CORS,body=json.dumps([{'id':i,'files':{k:{} for k in g['files']}} for i,g in GISTS.items()]))
    if m=='POST' and u=='/gists':
        b=json.loads(request.post_data); gid='g%d'%(len(GISTS)+1); GISTS[gid]={'files':{k:{'content':v['content']} for k,v in b['files'].items()},'public':b['public']}
        return route.fulfill(status=201,headers=CORS,body=json.dumps({'id':gid}))
    g=re.match(r'/gists/(\w+)$',u)
    if g and g.group(1) in GISTS:
        G=GISTS[g.group(1)]
        if m=='GET': return route.fulfill(status=200,headers=CORS,body=json.dumps({'id':g.group(1),'files':{k:{'content':v['content'],'truncated':False} for k,v in G['files'].items()}}))
        if m=='PATCH':
            b=json.loads(request.post_data)
            for k,v in b['files'].items(): G['files'][k]={'content':v['content']}
            return route.fulfill(status=200,headers=CORS,body='{}')
    return route.fulfill(status=404,headers=CORS,body='{}')
pw=sync_playwright().start()
b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
errs=[]
def device():
    c=b.new_context(viewport={'width':820,'height':1100},service_workers='block'); c.route('https://api.github.com/**',api)
    p=c.new_page(); p.on('console',lambda m: errs.append(m.text) if m.type=='error' else None); p.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    p.goto('http://localhost:8765/index.html'); p.wait_for_selector('.lcard'); p.wait_for_timeout(400); return p
A=device(); B=device()
# --- Unit: Merge
r=A.evaluate("""()=>{
  const out=[];
  const a={cards:{1:{e:2.5,i:3,r:2,l:0,d:5},2:{e:2.5,i:1,r:1,l:0,d:9}},stats:{1:{ok:3,bad:1}},hard:{7:{s:1,n:1,k:{lesen:1},t:100}},hardOut:{},log:{d1:3},ui:{tests:{L:{last:50,best:60,ts:10}}}};
  const b={cards:{1:{e:2.6,i:8,r:4,l:0,d:50},3:{e:2.5,i:1,r:1,l:0,d:7}},stats:{1:{ok:2,bad:2},2:{ok:1,bad:0}},hard:{7:{s:0,n:2,k:{lesen:2},t:300},8:{s:0,n:1,k:{hören:1},t:50}},hardOut:{8:200},log:{d1:5,d2:1},ui:{tests:{L:{last:80,best:80,ts:20}}}};
  const m=mergeStates(a,b);
  out.push(['card1 weiter fortgeschritten',m.cards[1].r===4]); out.push(['card2,3 beide da',!!m.cards[2]&&!!m.cards[3]]);
  out.push(['stats max',m.stats[1].ok===3&&m.stats[1].bad===2&&m.stats[2].ok===1]);
  out.push(['log max',m.log.d1===5&&m.log.d2===1]);
  out.push(['hard neuer t gewinnt',m.hard[7].n===2]); out.push(['hard 8 durch Tombstone entfernt',!m.hard[8]]);
  out.push(['tests best max, last neuer',m.tests.L.best===80&&m.tests.L.last===80]);
  const c=mergeStates(Object.assign({},a,{epoch:999,cards:{}}),b); out.push(['Reset (epoch) gewinnt',Object.keys(c.cards).length===0&&c.epoch===999]);
  const d=mergeStates(a,Object.assign({},b,{epoch:999})); out.push(['Reset von anderem Gerät gewinnt',d.epoch===999&&!!d.cards[3]&&!d.cards[2]]);
  out.push(['Eingaben unverändert',a.cards[1].r===2&&!a.cards[3]]);
  return out;}""")
for x in r: print(('OK  ' if x[1] else 'FAIL'),x[0])
# --- Integration: A lernt, verbindet; B verbindet, bekommt Stand; B lernt weiter; A zieht nach
def learn(p,n,start=0):
    p.evaluate("""([n,s])=>{const l=LESSONS[0];for(const id of l.words.slice(s,s+n)){state.cards[id]={e:2.5,i:4,r:3,l:0,d:Date.now()+86400000};}save()}""",[n,start])
def connect(p,tok):
    p.evaluate("()=>go('settings')"); p.wait_for_selector('#sycard'); p.fill('#sytoken',tok); p.click('[data-sysave]'); p.wait_for_timeout(1500)
learn(A,5)
connect(A,'TOKEN1')
print('A status:',A.inner_text('#systate'), '| gists:',len(GISTS), '| public:',[g['public'] for g in GISTS.values()])
connect(B,'TOKEN1')
nB=B.evaluate("()=>Object.keys(state.cards).length"); print('B nach Verbinden Karten:',nB,'(erwartet 5)')
learn(B,3,5); B.evaluate("()=>{noteStat(LESSONS[0].words[0],false,'hören');save()}")
B.evaluate("()=>syRun()"); B.wait_for_timeout(800)
A.evaluate("()=>syRun()"); A.wait_for_timeout(800)
print('A nach Abgleich Karten:',A.evaluate("()=>Object.keys(state.cards).length"),'(erwartet 8)','hard:',A.evaluate("()=>Object.keys(state.hard)"))
# A wird 3x richtig -> raus, dann B zieht
A.evaluate("()=>{const id=LESSONS[0].words[0];noteStat(id,true);noteStat(id,true);noteStat(id,true);save()}")
A.evaluate("()=>syRun()"); A.wait_for_timeout(600); B.evaluate("()=>syRun()"); B.wait_for_timeout(600)
print('B hard nach Rauswurf auf A:',B.evaluate("()=>Object.keys(state.hard)"),'(erwartet [])')
# Reset auf A
A.evaluate("()=>{const k=state.settings;state=defaults();state.settings=k;state.epoch=Date.now();save()}")
A.evaluate("()=>syRun()"); A.wait_for_timeout(600); B.evaluate("()=>syRun()"); B.wait_for_timeout(600)
print('B nach Reset auf A, Karten:',B.evaluate("()=>Object.keys(state.cards).length"),'(erwartet 0)')
# Einstellungen nicht geteilt
print('Gist enthält settings?', 'settings' in json.loads(list(GISTS.values())[0]['files']['hanyu-progress.json']['content']))
# Falsches Token
B.evaluate("()=>go('settings')"); B.wait_for_selector('#sycard'); B.click('[data-sydel]'); B.wait_for_timeout(300)
B.fill('#sytoken','BAD'); B.click('[data-sysave]'); B.wait_for_timeout(1500)
print('falsches Token:',B.inner_text('#syres'),'| Status:',B.inner_text('#systate'))
B.screenshot(path='n24_settings.png')
print('errs',[e for e in errs if '401' not in e])
b.close(); pw.stop(); srv.terminate()
