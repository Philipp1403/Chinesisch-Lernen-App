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
- Mikrofon-Einstellungen: `MIC_VARIANTS` in `azure.js` (Standard, ohne Signalverarbeitung, alt). Die Diagnose (`runDiag`) probiert alle durch (`micProbe`: Web Audio und Aufnahme getrennt gemessen) und speichert die beste in `state.settings.micVar`. Liefert Web Audio nur Stille, die Aufnahme aber Ton, bewertet `azAssess` die Aufnahme (`azAssessPcm`). Azure wird automatisch zur Engine, sobald ein Schlüssel da ist und Philipp die Engine nie selbst gewählt hat (`AZ.engineSet`). Test: `n37`. Die Live-Aufnahme wird automatisch verstärkt (bis 6-fach, Rauschen unter 2,5 % Spitze nicht), die Aufnahme als Rückfall auf 70 % Spitze angehoben, beim Sprechen zeigt eine Pegelleiste den Eingang. `tests/n38.py` speist einen Ton ein und prüft Frequenz und Pegel der Daten, die an Azure gehen (`AMP=0.04 sh tests/run.sh n38`).
- Version: `APP_VERSION` in `core.js` UND `const V` in `sw.js` bei jeder Änderung gemeinsam hochzählen. Die Diagnose zeigt die laufende Version.
- Mikrofon auf iOS: vor der Aufnahme `micPrepare()` (Sprachausgabe stoppen und warten), AudioContext selbst anlegen und am Ende alles schließen. Sonst liefert das Mikro nur Stille und Azure gibt Score 0.
- Azure: Gratisstufe F0. Ressourcenname, Schlüssel und Region liegen nur auf dem Gerät (verschlüsselt), nie im Repo. Das Repo ist öffentlich: keine persönlichen Angaben (Alter, Geburtsjahr, Bundesland, Wohnort, Studium, Arbeitgeber, E-Mail, Nachname, Ressourcennamen, Passwörter oder Hinweise darauf) in Dateien, Tests, CLAUDE.md oder Commit-Texte schreiben.
- HTML-Attribute sind nicht groß-/kleinschreibungssensitiv: `data-sayS` und `data-say` kollidieren. Eindeutige Namen verwenden.
- Chinesische Interpunktion in Sätzen: Der Punkt am Satzende wird nicht angezeigt. Das deutsche Komma ist kein chinesisches Komma, Pausen dürfen nicht aus der Übersetzung abgeleitet werden.
- Deutsche Bedeutungen ohne Klammerzusätze ("Guten Tag", nicht "Guten Tag (höflich)"), Klammern nur, wenn die Bedeutung sonst nicht eindeutig wäre.
- Alle Kacheln in einer Übung müssen gleich groß sein. Pinyin groß genug, die Fläche gut nutzen, auf dem iPad darf man zum Zeichnen nicht scrollen müssen.

## Prüfen
- Lint: `tests/lint.sh` (installiert ESLint beim ersten Mal, bündelt alle JS-Dateien, Ziel: 0 Fehler, rund 60 Warnungen sind bekannt).
- Browser-Test: `tests/run.sh n9` (Name des Tests ohne `.py`). Läuft in `tests/out`, dort liegen auch die Screenshots (nicht im Repo). Braucht Python 3, Playwright und Google Chrome unter `/usr/bin/google-chrome`. Die Tests laufen gegen eine Kopie der App ohne Passwortsperre (`tests/lib.py`, `testroot()`), weil im Repo die echte Sperre liegt.
- Wichtige Tests: `n3` (Übungen, Sprechen, Mikro-Fehler), `n9` (Azure-Attrappe: Push-Stream, Score, Fehlertexte), `n17` (langsame Sprachausgabe, Reihenfolge der Silben), `n20` (Diagnose), `n21` (Paare, Lücke, Hören, Töne), `n22` (Karteikarten), `n31`, `n32`, `n33`, `n36` (freies Zeichnen, Lösung, Sperre nach dem Fertigstellen, kein Score), `n18` (Screenshots aller Ansichten bei 820 px und 390 px).
- Tests für die Passwortsperre (`n12` bis `n16` in der Sandbox) liegen nicht im Repo, sie brauchen die Passphrase.
- `window.__app` stellt Zustand und Startfunktionen für Tests bereit (`startPractice`, `startLearn`, `startReview`, `LESSONS`, `SBYID`, `S`).
- `lock-config.js` im Repo ist die echte Sperre (nur der Hash). Beim Arbeiten nie durch eine Entwicklerversion ersetzen oder überschreiben.
- Ein echtes iPad kann niemand außer Philipp prüfen. Bei Geräteproblemen um Screenshot der Einstellungen, Diagnose bitten.

## Arbeitsweise
- Philipp schickt Probleme als Screenshots, oft nacheinander. Erst alle sammeln, dann beheben, dann ein Update pushen. Danach auf der Live-Seite prüfen, ob die neue `sw.js`-Version (und die geänderten Dateien) ausgeliefert werden.
- Änderungen direkt auf `main` committen und pushen (GitHub Pages veröffentlicht sofort), nachdem Lint und die betroffenen Tests grün sind. Philipp erlaubt das ausdrücklich und dauerhaft für dieses Repo: kein eigener Branch, kein Pull Request, keine Rückfrage wegen `main`. Nach dem Push auf der Live-Seite prüfen, ob die neue `sw.js`-Version ausgeliefert wird.
- Nach jedem Push Philipp sagen: App auf dem iPad zweimal komplett schließen und neu öffnen.
- Den Chrome-Tab mit der GitHub-Seite nicht mehr nötig. Kein ZIP mehr bauen.

## Stand (22.11.2026)
- Live ist `hanyu-v24`. Zuletzt: v24 Kacheln in Satz bauen, Übersetzen und Hören und schreiben kleiner und immer in einer Zeile (`fitRow` in `tileBuilder`, Test `n43`); v23 Lernleiter für Wiederholen (`LADDER` in `core.js`, Test `n42`); v22 deutsche Sätze ohne Satzzeichen, 喂 = "Hallo"; v21 Rückmeldeleiste kompakt, größere Kacheln und Pinyin, eigene Icons je Übung, Einrichtung mit fester Fußleiste; v20 keine Satzzeichen im Chinesischen; v19 Mikrofon (Diagnose probiert mehrere Einstellungen, Rückfall auf Aufnahme, automatische Verstärkung, Pegelleiste).
- Die Sprechübung mit Azure funktioniert auf Philipps iPad (von ihm bestätigt). Die Mikrofon-Pipeline nicht mehr anfassen, außer er meldet ein neues Problem.
- Lernleiter: Die Abstände sind meine Wahl nach Philipps Vorgabe, nicht die von Phase 6 (deren Werte sind nicht belegt).
- Git-Historie: Die Historie von `main` wurde bereinigt und per Force-Push ersetzt, damit alte Commits keine persönlichen Angaben mehr enthalten. Nie die alte Historie zurückpushen, nie `--force` ohne Philipps ausdrückliches Ja. Commit-Autor ist `Philipp` mit der noreply-Adresse von GitHub, keine echte E-Mail.
- Passwortsperre offen: Das alte Passwort gilt als verbrannt. Philipp setzt ein neues über `passwort-setzen.html` und ersetzt damit selbst den Inhalt von `lock-config.js`. Sobald er das meldet: `sw.js` (`const V`) und `core.js` (`APP_VERSION`) gemeinsam auf v25 hochzählen, pushen, live prüfen und ihm sagen, dass der Azure-Schlüssel danach auf allen Geräten neu eingetragen werden muss und die App zweimal komplett geschlossen und neu geöffnet werden muss. `lock-config.js` nie selbst überschreiben, nie nach dem Passwort fragen.
- Falls das langsame Sprechen auf dem iPad weiter hängt: Azure-Sprachausgabe mit SSML `prosody rate` bauen (0,5 Mio. Zeichen im Monat gratis laut Azure-Preisseite, braucht Internet, Rückfall auf die Gerätestimme offline). Vorher Philipp fragen.

## Offen
- HSK 2: 200 Wörter in `words.json`, aber noch keine Lektionen, Sätze und Turmabschnitt. Nicht bauen, bevor Philipp das Freischalt-Konzept bestätigt hat.
- Funktion des Buttons "Weiß nicht" erklären, falls er danach fragt.
- Abgelehnt von Philipp (nicht noch einmal vorschlagen): zusätzliche Phase-6-Funktionen.
