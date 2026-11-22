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
- `core.js`: Zustand (`state`, Karten `state.cards[id]={e,i,r,l,m,ls,io,d,v}` (m Phase, ls Lernschritt, io altes Intervall nach Fehler, v Format), Einstellungen `state.settings`), Datenladen, Wiederholungslogik, Sprachausgabe `speak()` / `stopSpeak()`.
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
- Content-Security-Policy: als `<meta http-equiv>` in `index.html` (GitHub Pages erlaubt keine eigenen Header). Skripte nur von der eigenen Seite, keine Inline-Skripte und keine `on...=`-Attribute, kein `eval`. Verbindungen nur zu `api.github.com`, `gist.githubusercontent.com` (Sync) sowie `*.microsoft.com` und `*.azure.com` (Azure Speech, auch `wss:`). Wer neue Bibliotheken, externe Hosts, Inline-Skripte oder Web-Worker braucht, muss die CSP anpassen, sonst blockiert der Browser sie ohne sichtbaren Fehler in der App. Test `n48` (zählt Verstöße in allen Übungen, lädt das echte SDK, prüft erlaubte und blockierte Hosts, Negativtest für eingeschleusten Code).
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
- Layout-Prüfung iPad quer: `tests/n44.py` misst in allen Übungen, ob man scrollen müsste. Er nutzt 1180x716 px, das entspricht dem echten iPad Air quer 1180x820 nach Abzug von Statusleiste und Home-Balken (an Philipps Screenshot geeicht, `n44` darf keine Überlänge melden).
- Seitengerüst: `#shell` ist `position:fixed`, `html`/`body` haben `overflow:hidden`, gescrollt wird nur in `#main` (kein Seiten-Scrollen, kein Gummiband). Grund: iPadOS 26 verwischt Seiteninhalt am oberen Rand, feste Elemente nicht. `tests/n46.py` prüft das.
- Handy: Philipp nutzt ein iPhone 13 Pro Max (428x926). Handy-Regeln nur unter 700 px (`@media (max-width:699px)`) oder mit `IS_IPHONE` (iPad meldet sich als Mac), damit das iPad nie betroffen ist. `tests/n47.py` prüft das iPhone-Layout. Kein Ton auf dem iPhone: Ursache nicht belegt, Stumm-Schalter ist eine bekannte Ursache; Diagnose hat einen Tontest (Audio-Element, Web Audio, Sprachausgabe).
- Ein echtes iPad kann niemand außer Philipp prüfen. Bei Geräteproblemen um Screenshot der Einstellungen, Diagnose bitten.

## Arbeitsweise
- Philipp schickt Probleme als Screenshots, oft nacheinander. Erst alle sammeln, dann beheben, dann ein Update pushen. Danach auf der Live-Seite prüfen, ob die neue `sw.js`-Version (und die geänderten Dateien) ausgeliefert werden.
- Änderungen direkt auf `main` committen und pushen (GitHub Pages veröffentlicht sofort), nachdem Lint und die betroffenen Tests grün sind. Philipp erlaubt das ausdrücklich und dauerhaft für dieses Repo: kein eigener Branch, kein Pull Request, keine Rückfrage wegen `main`. Nach dem Push auf der Live-Seite prüfen, ob die neue `sw.js`-Version ausgeliefert wird.
- Nach jedem Push Philipp sagen: App auf dem iPad zweimal komplett schließen und neu öffnen.
- Den Chrome-Tab mit der GitHub-Seite nicht mehr nötig. Kein ZIP mehr bauen.

## Stand (22.11.2026)
- Live ist `hanyu-v30` (Content-Security-Policy in `index.html`, Test `n48`, sonst unverändert zu v29). Davor `hanyu-v29` (Wiederholen mit zwei Phasen: Lernphase 1 und 10 Min, danach Faktoren 1,3 / 2,2 / 3,5, Obergrenze 120 Tage; rotes Zähler-Abzeichen bei Wiederholen auch auf dem iPad; Test `n42`). Davor v28 (Handy-Anpassungen für das iPhone: Tabs einzeilig mit Zähler-Abzeichen, Turm-Chips einzeilig, Kachelreihe gleichmäßig auf zwei Zeilen, iPhone-Tontest in der Diagnose; alles nur unter 700 px bzw. mit iPhone-Kennung, iPad unverändert; Test `n47`). Davor v27 (fester Rahmen: Seite scrollt nie, nur `#main` scrollt innen und nur wenn nötig, Test `n46`). Davor v26 (iPad quer ohne Scrollen in allen Übungen, Seite darunter scheint nicht mehr durch, Sperrseite mit Benutzernamen-Feld für die Passwörter-Ausfüllhilfe; Tests `n44`, `n45`). Davor v25: neue Passwortsperre. v24 Kacheln in Satz bauen, Übersetzen und Hören und schreiben kleiner und immer in einer Zeile (`fitRow` in `tileBuilder`, Test `n43`); v23 Lernleiter für Wiederholen (`LADDER` in `core.js`, Test `n42`); v22 deutsche Sätze ohne Satzzeichen, 喂 = "Hallo"; v21 Rückmeldeleiste kompakt, größere Kacheln und Pinyin, eigene Icons je Übung, Einrichtung mit fester Fußleiste; v20 keine Satzzeichen im Chinesischen; v19 Mikrofon (Diagnose probiert mehrere Einstellungen, Rückfall auf Aufnahme, automatische Verstärkung, Pegelleiste).
- Die Sprechübung mit Azure funktioniert auf Philipps iPad (von ihm bestätigt). Die Mikrofon-Pipeline nicht mehr anfassen, außer er meldet ein neues Problem.
- Wiederholungslogik (`core.js`, Konstanten oben: `LEARN_STEPS`, `RELEARN_STEP`, `GRAD_GOOD`, `GRAD_EASY`, `FACTOR_*`, `LAPSE_FACTOR`, `MAX_INTERVAL`): Lernphase mit Schritten 1 und 10 Min (Schwer auf Schritt 1 = 6 Min, Gut nach dem letzten Schritt = 1 Tag, Leicht und "Kenne ich schon" = 4 Tage). Wiederholung: base = Intervall plus überfällige Kalendertage, Schwer base mal 1,3 (nie kürzer als das Intervall), Gut mal 2,2, Leicht mal 3,5, immer Schwer < Gut < Leicht, höchstens 120 Tage. Nochmal in der Wiederholung: Fehler, 10 Min Lernphase, danach 30 % des alten Intervalls (Leicht in der Nachlernphase: Gut plus 1 Tag). Quelle der Lernschritte: Anki-Standardwerte (docs.ankiweb.net, Deck options: Lernschritte 1m 10m, Abschlussintervall 1 Tag, Easy-Intervall 4 Tage, Nachlernschritt 10m, Schwer auf Schritt 1 = Mittelwert). Die Faktoren 1,3 / 2,2 / 3,5, die 30 %, die Obergrenze und "Leicht in der Nachlernphase" sind eigene Festlegungen. Alte Karten (`s` = Stufe der alten Leiter, `i` Tage) werden mit `migrateCard` einmalig umgerechnet (beim Laden, bei der Wiederherstellung und in `mergeStates`), Fälligkeit bleibt unverändert.
- Git-Historie: Die Historie von `main` wurde bereinigt und per Force-Push ersetzt, damit alte Commits keine persönlichen Angaben mehr enthalten. Nie die alte Historie zurückpushen, nie `--force` ohne Philipps ausdrückliches Ja. Commit-Autor ist `Philipp` mit der noreply-Adresse von GitHub, keine echte E-Mail.
- Passwortsperre: Philipp hat ein neues Passwort gesetzt (v25), das alte ist verbrannt. Ändert er sie wieder, setzt er `lock-config.js` selbst über `passwort-setzen.html`. Danach `sw.js` (`const V`) und `core.js` (`APP_VERSION`) gemeinsam hochzählen, pushen, live prüfen und ihm sagen, dass der Azure-Schlüssel auf allen Geräten neu eingetragen werden muss und die App zweimal komplett geschlossen und neu geöffnet werden muss. `lock-config.js` nie selbst überschreiben, nie nach dem Passwort fragen.
- Falls das langsame Sprechen auf dem iPad weiter hängt: Azure-Sprachausgabe mit SSML `prosody rate` bauen (0,5 Mio. Zeichen im Monat gratis laut Azure-Preisseite, braucht Internet, Rückfall auf die Gerätestimme offline). Vorher Philipp fragen.

## Offen
- HSK 2: 200 Wörter in `words.json`, aber noch keine Lektionen, Sätze und Turmabschnitt. Nicht bauen, bevor Philipp das Freischalt-Konzept bestätigt hat.
- Funktion des Buttons "Weiß nicht" erklären, falls er danach fragt.
- Abgelehnt von Philipp (nicht noch einmal vorschlagen): zusätzliche Phase-6-Funktionen.
