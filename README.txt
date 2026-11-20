Hanyu: Chinesisch lernen nach HSK 3.0

Starten (Test am Rechner):  python3 -m http.server 8000   im Ordner, dann http://localhost:8000 öffnen.
Veröffentlichen:  Den gesamten Ordner auf einen Webserver legen (z. B. GitHub Pages, Netlify oder Cloudflare Pages), HTTPS ist Pflicht für Mikrofon und Offlinebetrieb.
iPad/iPhone:  In Safari öffnen, Teilen, "Zum Home-Bildschirm".
Sprechen testen:  In der App unter Einstellungen den Punkt "Spracherkennung testen" verwenden, einmal im Safari-Tab und einmal als Home-Bildschirm-App.

Azure-Aussprachebewertung (optional):
  1. Konto auf azure.microsoft.com/free anlegen.
  2. Im Azure-Portal eine Ressource "Speech" erstellen (Tarif Free F0, Region z. B. West Europe).
  3. Unter "Schlüssel und Endpunkt" Key 1 und die Region kopieren.
  4. In der App: Einstellungen, Abschnitt Azure, Region und Schlüssel eintragen, speichern, "Azure testen", dann "Bewertung durch: Azure".
  Schlüssel und Region bleiben nur im Browser dieses Geräts.
  Das Azure Speech SDK (azure-speech-sdk.min.js, MIT-Lizenz, Datei azure-speech-sdk-LICENSE.txt) liegt lokal im Ordner.

Fernsehturm: sechs Abschnitte, einer je HSK-Stufe. Er füllt sich mit dem Lernstand und leuchtet voll, wenn alle Wörter einer Stufe gelernt sind.

App-Sperre (Passwort):
  Die Datei lock-config.js enthält nur einen Prüfwert, nie das Passwort. Ohne Prüfwert ist die Sperre aus.
  Neues Passwort oder neuer Zahlencode: passwort-setzen.html im Browser öffnen, eingeben (nur Ziffern ergibt ein Tastenfeld), den erzeugten Text in lock-config.js einfügen, neu hochladen.
  Mit Sperre fragt die App beim Start nach dem Passwort (nach Schließen der App erneut) und der Azure-Schlüssel liegt verschlüsselt im Gerät.
  Grenzen: Der Seitencode ist öffentlich lesbar. Die Sperre hält Zufallsbesucher ab, ersetzt aber keinen echten Zugriffsschutz auf Serverseite. Lernstand und Einstellungen liegen unverschlüsselt im Browser des jeweiligen Geräts.
Suchmaschinen: noindex im Seitenkopf, robots.txt und _headers (Netlify) sind eingerichtet.
