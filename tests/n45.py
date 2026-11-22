"""Sperrseite mit Test-Passwort: Formularaufbau für die Passwörter-Ausfüllhilfe, Entsperren funktioniert. Das Test-Passwort ist ausgedacht und hat nichts mit der echten Sperre zu tun."""
import os,subprocess,time,shutil,sys
from lib import ROOT
from playwright.sync_api import sync_playwright
TESTPW='testpasswort-nur-fuer-tests'
d='/tmp/hanyu-lockroot'; shutil.rmtree(d,ignore_errors=True)
shutil.copytree(ROOT,d,ignore=shutil.ignore_patterns('.git','tests','node_modules'))
srv=subprocess.Popen(['python3','-m','http.server','8766','-d',d],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(0.8)
pw=sync_playwright().start(); b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
try:
    pg=b.new_context(viewport={'width':820,'height':900},service_workers='block').new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    # Konfiguration mit dem Werkzeug der App erzeugen (nur Test-Passwort)
    pg.goto('http://localhost:8766/passwort-setzen.html'); pg.fill('#pw',TESTPW); pg.click('#go'); pg.wait_for_function("document.getElementById('out').value.length>20",timeout=20000)
    cfg=pg.input_value('#out'); open(os.path.join(d,'lock-config.js'),'w').write(cfg)
    pg.goto('http://localhost:8766/index.html'); pg.wait_for_selector('#lockpw',timeout=10000)
    info=pg.evaluate("""(()=>{const f=document.querySelector('#lock form'),u=f.querySelector('input[autocomplete=username]'),p=f.querySelector('input[type=password]');
      return {formAutocomplete:f.getAttribute('autocomplete'),method:f.method,user:!!u,userName:u&&u.name,userVal:u&&u.value,pwAuto:p.autocomplete,pwName:p.name,pwId:p.id,submit:!!f.querySelector('button[type=submit]')}})()""")
    print(info)
    assert info['formAutocomplete'] is None and info['user'] and info['pwAuto']=='current-password' and info['submit']
    pg.screenshot(path='n45_lock.png')
    pg.fill('#lockpw','falsches-passwort-123'); pg.click('#lockbtn'); pg.wait_for_function("/Falsch/.test(document.getElementById('lockmsg').textContent)",timeout=30000); pg.wait_for_function("!document.getElementById('lockbtn').disabled",timeout=30000); print('falsch:',pg.inner_text('#lockmsg'))
    pg.fill('#lockpw',TESTPW); pg.click('#lockbtn'); pg.wait_for_selector('.lcard',timeout=20000); print('Entsperren ok, errs',errs); assert not errs
finally: b.close(); pw.stop(); srv.terminate()
