# Hanyu: HSK-3.0-Chinesisch-Lern-App

Persönliche Lern-App von Philipp (deutsche Oberfläche). Sie läuft als PWA vom Home-Bildschirm, vor allem auf dem iPad, daneben iPhone und PC.
Live: https://philipp1403.github.io/Chinesisch-Lernen-App/ (GitHub Pages, Branch `main`, Wurzelverzeichnis).

## Regeln für die Zusammenarbeit (immer einhalten)
- Jede Antwort beginnt mit "Philipp."
- Nie Gedankenstriche (em dash) verwenden.
- Mentor- und Sparring-Ton: Schwachstellen ungefragt nennen, kein Lob, keine Floskeln. Zuerst Lösungen und Alternativen, Kritik kurz und konkret.
- Keine ungeprüften Annahmen: Aussagen selbst gegen echte Quellen oder Tests prüfen, Quellen nennen.
- Rückfragen als klickbare Auswahl mit mehreren Optionen (Mehrfachauswahl), nicht dieselbe Frage wiederholen.
- Zugangsdaten (Passwörter, Schlüssel, Tokens) gibt nur Philipp selbst ein. Nie nach ihnen fragen, nie in Chat, Code oder Commits schreiben. Das Repo ist öffentlich.
- Commit-Texte kurz und deutsch, zum Beispiel `v12 Mikrofon und Sprachausgabe`.
- Nach jeder Änderung: die betroffene Übung wirklich im Browser prüfen (Layout iPad 820 px breit und iPhone 390 px, hell und dunkel), nicht nur den Code lesen.

## Aufbau (reines Vanilla-JS, kein Build-Schritt, keine Frameworks)
- `index.html`, `style.css`, `manifest.webmanifest`, `sw.js` (Service Worker), Icons.
- `core.js`: Zustand (`state`, Karten `state.cards[id]={e,i,r,l,d}`, Einstellungen `state.settings`), Datenladen, Wiederholungslogik, Sprachausgabe `speak()` / `stopSpeak()`.
- `exercises.js`: alle Übungstypen (Paare, Lückentext, Übersetzen, Hören, Töne, Bauen, Diktat, Sprechen, Schreiben, Karteikarten).
- `views.js`: Ansichten, Lektionsblätter, Einstellungen, Diagnose (`runDiag`).
- `writing.js`: Zeichen schreiben mit Hanzi Writer, freies Zeichnen mit Score.
- `azure.js`: Azure-Aussprachebewertung (Speech SDK, lokal als `azure-speech-sdk.min.js`, lädt erst bei Bedarf). `azAssess` öffnet das Mikro selbst und schickt 16-kHz-PCM als Push-Stream.
- `speech.js` (Browser-Spracherkennung), `lock.js` / `lock-config.js` (Passwortsperre, nur Hash im Repo), `sync.js` (Sicherung über privates GitHub-Gist), `tower.js` (Oriental Pearl Tower je HSK-Stufe).
- `data/words.json` (Wörter HSK 1 und 2), `data/hsk1.json` (Lektionen und Sätze), `data/chars-*.json` (Strichdaten).
- Dateien in `data/` müssen beim Hochladen im Ordner `data/` landen (beim Drag-and-drop landeten sie schon in der Wurzel).

## Wichtige Eigenheiten
- Service Worker: Version in `sw.js` (`const V = 'hanyu-vNN'`) bei JEDER Änderung hochzählen. Code wird erst über das Netz geholt, Daten kommen zuerst aus dem Cache. Nach einem Update muss Philipp die App auf dem iPad zweimal komplett schließen und neu öffnen.
- Sprachausgabe auf iOS (WebKit): `speak()` muss direkt im Tippen aufgerufen werden. Nach `cancel()` gehen Ereignisse verloren. Langsam spricht die App Silbe für Silbe, mit Komma als Pause. Auf dem iPad hängt das langsame Sprechen teils nach der ersten Silbe (offen, mögliche Lösung: Azure-Sprachausgabe mit SSML `prosody rate`, braucht Internet und Kontingent).
- Mikrofon auf iOS: vor der Aufnahme `micPrepare()` (Sprachausgabe stoppen und warten), AudioContext selbst anlegen und am Ende alles schließen. Sonst liefert das Mikro nur Stille und Azure gibt Score 0.
- Azure: Gratisstufe F0. Ressourcenname, Schlüssel und Region liegen nur auf dem Gerät (verschlüsselt), nie im Repo. Das Repo ist öffentlich: keine persönlichen Angaben (Alter, Wohnort, E-Mail, Ressourcennamen) in Dateien oder Commit-Texte schreiben.
- HTML-Attribute sind nicht groß-/kleinschreibungssensitiv: `data-sayS` und `data-say` kollidieren. Eindeutige Namen verwenden.
- Chinesische Interpunktion in Sätzen: Der Punkt am Satzende wird nicht angezeigt. Das deutsche Komma ist kein chinesisches Komma, Pausen dürfen nicht aus der Übersetzung abgeleitet werden.
- Deutsche Bedeutungen ohne Klammerzusätze ("Guten Tag", nicht "Guten Tag (höflich)"), Klammern nur, wenn die Bedeutung sonst nicht eindeutig wäre.
- Alle Kacheln in einer Übung müssen gleich groß sein. Pinyin groß genug, die Fläche gut nutzen, auf dem iPad darf man zum Zeichnen nicht scrollen müssen.

## Prüfen
- Lint: `npx eslint` über alle JS-Dateien (Ziel: 0 Fehler, Warnungen sind bekannt).
- Browser-Tests mit Playwright und Chrome gegen `python3 -m http.server 8765` im App-Ordner (Fake-Mikrofon: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`). Azure wird dabei durch eine Attrappe des SDK ersetzt. `window.__app` stellt Zustand und Startfunktionen für Tests bereit.
- Release-ZIP: `lock-config.js` gegen die echte Sperre tauschen (liegt nicht im Repo).
- Ein echtes iPad kann niemand außer Philipp prüfen. Bei Geräteproblemen um Screenshot der Einstellungen, Diagnose bitten.

## Offen
- HSK 2: 200 Wörter in `words.json`, aber noch keine Lektionen, Sätze und Turmabschnitt. Nicht bauen, bevor Philipp das Freischalt-Konzept bestätigt hat.
- Funktion des Buttons "Weiß nicht" erklären, falls er danach fragt.
- Abgelehnt von Philipp (nicht noch einmal vorschlagen): zusätzliche Phase-6-Funktionen.
