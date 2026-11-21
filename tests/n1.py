import asyncio, json, subprocess, time, sys
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765','-d','/home/claude/app'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
errs=[]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':820,'height':1100})
    pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_selector('.lcard')
    pg.screenshot(path='n1_home.png')
    pg.click('.lcard >> nth=7'); pg.wait_for_selector('.lhead')
    pg.screenshot(path='n1_lesson.png',full_page=False)
    print('lessons',pg.locator('.lcard').count())
    b.close()
finally:
  srv.terminate()
print('errors:',errs)
