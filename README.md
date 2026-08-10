# Thunderbird AI Assistant

Ein Thunderbird-MailExtension-Add-on für Zusammenfassungen, Antwortentwürfe und weitere E-Mail-Analysen mit der OpenAI API.

## Funktionen

- Zusammenfassung des tatsächlichen Nachrichtentexts aus dem dekodierten MIME-Baum
- iterativer Antworteditor mit AI-Überarbeitung, direkter Textbearbeitung und Übergabe an einen neuen Thunderbird-Antwortentwurf
- persistente Antwortoptionen für Originalzitat, „Allen antworten“ und erneutes Anhängen der ursprünglichen Dateien
- Kategorie- und Wichtigkeitsanalyse
- Übersetzung nach Deutsch, Englisch, Französisch oder Spanisch
- Extraktion von Kontakten, Terminen, Beträgen, Referenzen und Aufgaben
- Spam-/Phishing-Einschätzung mit konkreten Indikatoren
- lokale Suche nach ähnlichen Nachrichten im aktuellen Ordner
- nachrichtenbezogener AI Chat
- lokale Ergebnisablage mit Verwaltung unter **Einstellungen** und Zwischenablage-Aktion
- optionale automatische Zusammenfassung beim Öffnen einer Nachricht
- vollständig deutsch- oder englischsprachige Oberfläche mit expliziter Sprachauswahl
- Windows-Ein-Klick-Installer mit kontrolliertem Thunderbird-Neustart

## OpenAI-Modelle

Die empfohlene Einstellung **Automatisch** wählt das Modell nach Aufgabe:

- `gpt-5.6-terra` für Zusammenfassungen, Antworten, Chat und Textverbesserung
- `gpt-5.6-luna` für Kategorisierung, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung

Alternativ kann Luna, Terra oder `gpt-5.6-sol` für alle Aufgaben fest ausgewählt werden. Das Add-on nutzt die OpenAI Responses API und setzt `store: false`.

## Datenschutz

Bei AI-Aktionen werden Betreff, Absender, Nachrichtentext und Namen erkannter Anhänge direkt von Thunderbird an die OpenAI API gesendet. Beim Verbessern eines Antwortentwurfs werden außerdem der aktuelle Entwurf und die letzten Änderungswünsche übertragen. Die Suche nach ähnlichen Nachrichten läuft ausschließlich lokal. Automatische Verarbeitung ist standardmäßig deaktiviert.

Der API-Schlüssel und gespeicherte Ergebnisse liegen im lokalen Extension-Speicher des Thunderbird-Profils. Für eine breitere Veröffentlichung sollte zusätzlich geprüft werden, ob dieses Sicherheitsmodell den eigenen Anforderungen entspricht.

## Installation unter Windows

1. `Thunderbird-AI-Setup-1.4.0-win-x64.exe` herunterladen und starten.
2. Im Setup **Deutsch** oder **English** wählen. Diese Auswahl wird beim ersten Start als Sprache der Erweiterung übernommen.
3. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung bestätigen.
5. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, **Automatisch (empfohlen)** wählen, die Verbindung testen und speichern. Die Oberflächensprache kann dort jederzeit unabhängig von der Thunderbird-Sprache geändert werden.

Der benutzerbezogene Installer benötigt keine Administratorrechte. Eine neue Setup-Datei aktualisiert die vorhandene Version; eine Deinstallation ist nicht nötig. Die feste Add-on-ID erhält die Einstellungen. Der aktuelle Test-Installer ist nicht Authenticode-signiert und kann deshalb eine SmartScreen-Warnung auslösen.

## Entwicklung und Tests

Voraussetzungen: Node.js 20+, PowerShell 5.1+ und für den Windows-Installer Inno Setup 6.

```powershell
npm test

# Nur die XPI bauen
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-addon.ps1

# XPI und Windows-Installer bauen
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\build-setup.ps1

# Installer isoliert prüfen
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\test-setup.ps1
```

Build-Artefakte:

- `thunderbird-ai.xpi`
- `artifacts\Thunderbird-AI-Setup-1.4.0-win-x64.exe`

Der bestehende Build flacht Dateien aus `thunderbird-ai/` und `common/` in das Root der XPI ab. Dateinamen müssen deshalb repositoryweit eindeutig sein.

## Manueller Funktionstest

1. Eine reine Text-E-Mail und eine HTML-E-Mail öffnen und jeweils **Zusammenfassen** ausführen.
2. **Antwort vorschlagen** ausführen; ein eigener Thunderbird-Tab muss den ersten, direkt bearbeitbaren Entwurf anzeigen.
3. Einen Änderungswunsch eingeben und **Entwurf verbessern** anklicken. Der bisherige Chat muss sichtbar bleiben und der aktuelle Entwurf aktualisiert werden.
4. Die drei Antwortoptionen in ihren Standardwerten prüfen: Originalnachricht und **Allen antworten** aktiviert, ursprüngliche Anhänge deaktiviert.
5. Den Entwurf zusätzlich von Hand ändern und **In Thunderbird vorbereiten** anklicken. Der neue Antwortentwurf muss an alle Teilnehmer adressiert sein, den AI-Text vor dem nativen Thunderbird-Zitat enthalten und keine ursprünglichen Anhänge besitzen.
6. Den Antworteditor erneut öffnen, alle drei Optionen umschalten und wieder vorbereiten. Der Entwurf muss nur an den Absender gehen, kein Originalzitat enthalten und alle ursprünglichen Anhänge besitzen. Beim nächsten Öffnen müssen diese Werte vorausgewählt bleiben.
7. Bei einem Compose-Fehler muss der aktuelle Text stattdessen in die Zwischenablage kopiert werden.
8. Kategorie, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung ausführen.
9. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
10. Beide **AI Chat**-Schaltflächen testen.
11. Das Ergebnis kopieren und lokal speichern.
12. Unter **Einstellungen** jedes Modell testen; anschließend **Automatisch** speichern.
13. Die Oberflächensprache auf **English** umstellen und Popup, Antworteditor, Einstellungen und Hilfe prüfen. Danach zurück auf **Deutsch** wechseln. Alle sichtbaren Texte und Meldungen müssen der Auswahl folgen.
14. Optional die automatische Verarbeitung aktivieren, eine andere E-Mail öffnen und das Popup erneut öffnen. Die automatische Analyse muss angezeigt werden.

Im Popup wird die aktive Add-on-Version unter dem Betreff angezeigt. Nach einem Update muss dort **Version 1.4.0** stehen.

## Technische Struktur

- `thunderbird-ai/`: Manifest, Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.
