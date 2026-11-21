# Hanyu: HSK-3.0-Chinesisch-Lern-App

Persönliche Lern-App von Philipp (21, Student, Bayern, deutsche Oberfläche). Sie läuft als PWA vom Home-Bildschirm, vor allem auf dem iPad, daneben iPhone und PC.
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
- Azure: Ressource `hanyu-speech-philipp`, Region `germanywestcentral`, Gratisstufe F0. Schlüssel und Region liegen nur auf dem Gerät (verschlüsselt), nie im Repo.
- HTML-Attribute sind nicht groß-/kleinschreibungssensitiv: `data-sayS` und `data-say` kollidieren. Eindeutige Namen verwenden.
- Chinesische Interpunktion in Sätzen: Der Punkt am Satzende wird nicht angezeigt. Das deutsche Komma ist kein chinesisches Komma, Pausen dürfen nicht aus der Übersetzung abgeleitet werden.
- Deutsche Bedeutungen ohne Klammerzusätze ("Guten Tag", nicht "Guten Tag (höflich)"), Klammern nur, wenn die Bedeutung sonst nicht eindeutig wäre.
- Alle Kacheln in einer Übung müssen gleich groß sein. Pinyin groß genug, die Fläche gut nutzen, auf dem iPad darf man zum Zeichnen nicht scrollen müssen.

## Prüfen
- Lint: `tests/lint.sh` (installiert ESLint beim ersten Mal, bündelt alle JS-Dateien, Ziel: 0 Fehler, rund 60 Warnungen sind bekannt).
- Browser-Test: `tests/run.sh n9` (Name des Tests ohne `.py`). Läuft in `tests/out`, dort liegen auch die Screenshots (nicht im Repo). Braucht Python 3, Playwright und Google Chrome unter `/usr/bin/google-chrome`. Die Tests laufen gegen eine Kopie der App ohne Passwortsperre (`tests/lib.py`, `testroot()`), weil im Repo die echte Sperre liegt.
- Wichtige Tests: `n3` (Übungen, Sprechen, Mikro-Fehler), `n9` (Azure-Attrappe: Push-Stream, Score, Fehlertexte), `n17` (langsame Sprachausgabe, Reihenfolge der Silben), `n20` (Diagnose), `n21` (Paare, Lücke, Hören, Töne), `n22` (Karteikarten), `n31` (freies Zeichnen mit Score), `n18` (Screenshots aller Ansichten bei 820 px und 390 px).
- Tests für die Passwortsperre (`n12` bis `n16` in der Sandbox) liegen nicht im Repo, sie brauchen die Passphrase.
- `window.__app` stellt Zustand und Startfunktionen für Tests bereit (`startPractice`, `startLearn`, `startReview`, `LESSONS`, `SBYID`, `S`).
- `lock-config.js` im Repo ist die echte Sperre (nur der Hash). Beim Arbeiten nie durch eine Entwicklerversion ersetzen oder überschreiben.
- Ein echtes iPad kann niemand außer Philipp prüfen. Bei Geräteproblemen um Screenshot der Einstellungen, Diagnose bitten.

## Arbeitsweise
- Philipp schickt Probleme als Screenshots, oft nacheinander. Erst alle sammeln, dann beheben, dann ein Update pushen. Danach auf der Live-Seite prüfen, ob die neue `sw.js`-Version (und die geänderten Dateien) ausgeliefert werden.
- Änderungen direkt auf `main` committen und pushen (GitHub Pages veröffentlicht sofort), nachdem Lint und die betroffenen Tests grün sind.
- Nach jedem Push Philipp sagen: App auf dem iPad zweimal komplett schließen und neu öffnen.
- Den Chrome-Tab mit der GitHub-Seite nicht mehr nötig. Kein ZIP mehr bauen.
- Skills in `.claude/skills/`: `tdd` (Tests bei Änderungen, Seams vorher mit Philipp abstimmen), `code-review` (Review gegen `main`), `diagnosing-bugs` (Fehlersuche mit Feedback-Schleife) und `ponytail` (kleinste Änderung). `ponytail` immer in der Stufe `lite` nutzen. Es gibt keinen Issue-Tracker, `code-review` fragt dann nach der Spezifikation.

## Stand (21.11.2026)
- Live ist `hanyu-v12`: neue Mikro-Pipeline (`micPrepare`, eigener AudioContext, Push-Stream zu Azure, Fehlercode `silent`), Zeitlimit in `speak()` leert die Warteschlange, Diagnose prüft zuerst das Mikro.
- Problem davor (v11): Auf Philipps iPad lieferte das Mikro nur 5 % Pegel, Azure bekam Stille (Score 0, Omission), und das langsame Sprechen spielte nur die erste Silbe. Beides hing vermutlich an einer hängenden Sprachausgabe oder einem offen gebliebenen Audiokanal. Das ist eine Vermutung, nicht bestätigt.
- Offen: Philipp muss v12 auf dem iPad testen (Einstellungen, Diagnose, Pegel über 6 %, dann Engine auf "Azure" stellen und "Azure testen"). Seine Engine stand bis dahin auf "Browser".
- Falls das langsame Sprechen weiter hängt: Azure-Sprachausgabe mit SSML `prosody rate` bauen (0,5 Mio. Zeichen im Monat gratis laut Azure-Preisseite, braucht Internet, Rückfall auf die Gerätestimme offline). Vorher Philipp fragen.

## Offen
- HSK 2: 200 Wörter in `words.json`, aber noch keine Lektionen, Sätze und Turmabschnitt. Nicht bauen, bevor Philipp das Freischalt-Konzept bestätigt hat.
- Funktion des Buttons "Weiß nicht" erklären, falls er danach fragt.
- Abgelehnt von Philipp (nicht noch einmal vorschlagen): zusätzliche Phase-6-Funktionen.
