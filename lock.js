"use strict";
/* ============ App-Sperre ============
   Optionales Passwort beim Start. Das Passwort selbst steht nirgends, nur ein Prüfwert (lock-config.js).
   Aus dem Passwort wird außerdem ein Schlüssel abgeleitet, mit dem der Azure-Schlüssel verschlüsselt im Gerät liegt.
   Ehrlich gesagt: Der Seitencode ist öffentlich lesbar. Das hält Zufallsbesucher ab, ist aber kein Banktresor. */
const LOCK={on:!!(window.HANYU_LOCK&&window.HANYU_LOCK.verifier),key:null};
const LOCK_SS='hanyu.lock.session';
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64e=u=>btoa(String.fromCharCode(...u));
async function lockDerive(pw,tag){
  const cfg=window.HANYU_LOCK, enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(String(pw).normalize('NFKC')),'PBKDF2',false,['deriveBits']);
  const salt=new Uint8Array([...b64d(cfg.salt),...enc.encode(tag)]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:cfg.iter},base,256));
}
const aesKey=raw=>crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
async function lockEncrypt(text){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aesKey(LOCK.key),new TextEncoder().encode(text)));
  return {iv:b64e(iv),ct:b64e(ct)};
}
async function lockDecrypt(o){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(o.iv)},await aesKey(LOCK.key),b64d(o.ct));
  return new TextDecoder().decode(pt);
}
function lockNow(){ try{ sessionStorage.removeItem(LOCK_SS); }catch(_){} location.reload(); }

/* Läuft vor dem Start der App. Löst auf, sobald entsperrt ist (oder keine Sperre eingerichtet ist). */
function lockGate(){
  if(!LOCK.on) return Promise.resolve();
  // innerhalb derselben Sitzung (Neuladen) nicht erneut fragen
  try{ const k=sessionStorage.getItem(LOCK_SS); if(k){ LOCK.key=b64d(k); return Promise.resolve(); } }catch(_){}
  return new Promise(resolve=>{
    const cfg=window.HANYU_LOCK, N=cfg.len|0; // N>0: Zahlencode mit fester Länge
    const shell=document.getElementById('shell'); if(shell) shell.classList.add('hidden');
    const box=document.createElement('div'); box.id='lock';
    const pad=['1','2','3','4','5','6','7','8','9','','0','<'].map(k=>k===''?'<span></span>':`<button type="button" class="pk${k==='<'?' pk-del':''}" data-k="${k}" aria-label="${k==='<'?'Löschen':k}">${k==='<'?'⌫':k}</button>`).join('');
    box.innerHTML=N?`<div class="lockbox">
      <div class="lockmark" aria-hidden="true">汉</div>
      <h1>Hanyu</h1>
      <p class="muted" style="font-weight:700">Zahlencode eingeben</p>
      <div class="pindots" id="pindots" role="img" aria-label="Eingegebene Ziffern">${'<i></i>'.repeat(N)}</div>
      <div class="pinpad" id="pinpad">${pad}</div>
      <div id="lockmsg" class="small" style="font-weight:700;min-height:22px" role="alert"></div>
    </div>`:`<form class="lockbox" autocomplete="off">
      <div class="lockmark" aria-hidden="true">汉</div>
      <h1>Hanyu</h1>
      <p class="muted" style="font-weight:700">Bitte gib das Passwort ein.</p>
      <input id="lockpw" class="search" type="password" placeholder="Passwort" autocomplete="current-password" autocapitalize="off" spellcheck="false" aria-label="Passwort">
      <button class="btn primary block" type="submit" id="lockbtn">Entsperren</button>
      <div id="lockmsg" class="small" style="font-weight:700;min-height:20px;margin-top:10px" role="alert"></div>
    </form>`;
    document.body.appendChild(box);
    const msg=box.querySelector('#lockmsg');
    if(!(window.crypto&&crypto.subtle)){ msg.textContent='Dieser Browser kann hier nicht entsperren. Öffne die Seite über eine sichere Adresse (https).'; return; }
    let fails=0, busy=false;
    const done=async v=>{
      const ver=await lockDerive(v,'v');
      if(b64e(ver)!==cfg.verifier) return false;
      LOCK.key=await lockDerive(v,'k');
      try{ sessionStorage.setItem(LOCK_SS,b64e(LOCK.key)); }catch(_){}
      document.removeEventListener('keydown',onKey);
      box.remove(); if(shell) shell.classList.remove('hidden'); resolve(); return true;
    };
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    let code='', onKey=()=>{};
    if(N){
      const dots=[...box.querySelectorAll('#pindots i')];
      const paint=()=>dots.forEach((d,i)=>d.classList.toggle('on',i<code.length));
      const press=async k=>{
        if(busy) return;
        if(k==='<'){ code=code.slice(0,-1); paint(); msg.textContent=''; return; }
        if(code.length>=N) return;
        code+=k; paint(); msg.textContent='';
        if(code.length<N) return;
        busy=true; box.classList.add('busy');
        try{
          if(await done(code)) return;
          fails++; box.querySelector('#pindots').classList.add('shake'); msg.textContent='Falscher Code.';
          await wait(450); box.querySelector('#pindots').classList.remove('shake');
          code=''; paint(); await wait(Math.min(fails,6)*600);
        }catch(err){ msg.textContent='Das Entsperren hat nicht geklappt: '+(err.message||err); code=''; paint(); }
        busy=false; box.classList.remove('busy');
      };
      box.querySelector('#pinpad').addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(b) press(b.dataset.k); });
      onKey=e=>{ if(e.key>='0'&&e.key<='9'&&e.key.length===1) press(e.key); else if(e.key==='Backspace') press('<'); };
      document.addEventListener('keydown',onKey);
    }else{
      const form=box.querySelector('form'), pw=box.querySelector('#lockpw'), btn=box.querySelector('#lockbtn'); setTimeout(()=>pw.focus(),50);
      form.addEventListener('submit',async e=>{
        e.preventDefault(); if(btn.disabled) return;
        const v=pw.value; if(!v){ msg.textContent='Bitte ein Passwort eingeben.'; return; }
        btn.disabled=true; msg.textContent='Prüfe …';
        try{
          if(await done(v)) return;
          fails++; msg.textContent='Falsches Passwort.'; pw.value=''; pw.focus(); await wait(Math.min(fails,6)*800);
        }catch(err){ msg.textContent='Das Entsperren hat nicht geklappt: '+(err.message||err); }
        btn.disabled=false;
      });
    }
  });
}
