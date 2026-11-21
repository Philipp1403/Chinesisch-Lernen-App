import subprocess, time, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def testroot():
    """Kopie der App ohne Passwortsperre (im Repo liegt die echte Sperre) für die Tests"""
    import shutil
    d='/tmp/hanyu-testroot'; shutil.rmtree(d,ignore_errors=True)
    shutil.copytree(ROOT,d,ignore=shutil.ignore_patterns('.git','tests','node_modules'))
    open(os.path.join(d,'lock-config.js'),'w').write('window.HANYU_LOCK=null;')
    return d
from playwright.sync_api import sync_playwright
class Env:
    def __init__(self,w=820,h=1100,dark=False,mobile=False,sw=True):
        self.srv=subprocess.Popen(['python3','-m','http.server','8765','-d',testroot()],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        time.sleep(0.8)
        self.errs=[]
        self.pw=sync_playwright().start()
        self.b=self.pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
        self.ctx=self.b.new_context(viewport={'width':w,'height':h},color_scheme='dark' if dark else 'light',has_touch=mobile,**({} if sw else {'service_workers':'block'}))
        self.pg=self.ctx.new_page()
        self.pg.on('console',lambda m: self.errs.append(m.text) if m.type=='error' else None)
        self.pg.on('pageerror',lambda e: self.errs.append('PAGEERR '+str(e)))
    def open(self):
        self.pg.goto('http://localhost:8765/index.html'); self.pg.wait_for_selector('.lcard'); self.pg.wait_for_timeout(450)
    def shot(self,name): self.pg.wait_for_timeout(450); self.pg.screenshot(path=name)
    def close(self):
        self.b.close(); self.pw.stop(); self.srv.terminate()
