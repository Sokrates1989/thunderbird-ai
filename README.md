# Thunderbird AI Assistant

Ein Thunderbird-MailExtension-Add-on für Zusammenfassungen, Antwortentwürfe und weitere E-Mail-Analysen mit der OpenAI API.

## Funktionen

- Zusammenfassung des tatsächlichen Nachrichtentexts aus dem dekodierten MIME-Baum
- Antwortvorschläge mit Übergabe an einen neuen Thunderbird-Antwortentwurf
- Kategorie- und Wichtigkeitsanalyse
- Übersetzung nach Deutsch, Englisch, Französisch oder Spanisch
- Extraktion von Kontakten, Terminen, Beträgen, Referenzen und Aufgaben
- Spam-/Phishing-Einschätzung mit konkreten Indikatoren
- lokale Suche nach ähnlichen Nachrichten im aktuellen Ordner
- nachrichtenbezogener AI Chat
- lokale Ergebnisablage mit Verwaltung unter **Einstellungen** und Zwischenablage-Aktion
- optionale automatische Zusammenfassung beim Öffnen einer Nachricht
- Windows-Ein-Klick-Installer mit kontrolliertem Thunderbird-Neustart

## OpenAI-Modelle

Die empfohlene Einstellung **Automatisch** wählt das Modell nach Aufgabe:

- `gpt-5.6-terra` für Zusammenfassungen, Antworten, Chat und Textverbesserung
- `gpt-5.6-luna` für Kategorisierung, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung

Alternativ kann Luna, Terra oder `gpt-5.6-sol` für alle Aufgaben fest ausgewählt werden. Das Add-on nutzt die OpenAI Responses API und setzt `store: false`.

## Datenschutz

Bei AI-Aktionen werden Betreff, Absender, Nachrichtentext und Namen erkannter Anhänge direkt von Thunderbird an die OpenAI API gesendet. Die Suche nach ähnlichen Nachrichten läuft ausschließlich lokal. Automatische Verarbeitung ist standardmäßig deaktiviert.

Der API-Schlüssel und gespeicherte Ergebnisse liegen im lokalen Extension-Speicher des Thunderbird-Profils. Für eine breitere Veröffentlichung sollte zusätzlich geprüft werden, ob dieses Sicherheitsmodell den eigenen Anforderungen entspricht.

## Installation unter Windows

1. `Thunderbird-AI-Setup-1.1.0-win-x64.exe` herunterladen und starten.
2. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
3. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung bestätigen.
4. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, **Automatisch (empfohlen)** wählen, die Verbindung testen und speichern.

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
- `artifacts\Thunderbird-AI-Setup-1.1.0-win-x64.exe`

Der bestehende Build flacht Dateien aus `thunderbird-ai/` und `common/` in das Root der XPI ab. Dateinamen müssen deshalb repositoryweit eindeutig sein.

## Manueller Funktionstest

1. Eine reine Text-E-Mail und eine HTML-E-Mail öffnen und jeweils **Zusammenfassen** ausführen.
2. **Antwort vorschlagen** ausführen und **Als Antwort verwenden** anklicken; ein vorausgefüllter Thunderbird-Entwurf muss erscheinen.
3. Kategorie, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung ausführen.
4. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
5. Beide **AI Chat**-Schaltflächen testen.
6. Das Ergebnis kopieren und lokal speichern.
7. Unter **Einstellungen** jedes Modell testen; anschließend **Automatisch** speichern.
8. Optional die automatische Verarbeitung aktivieren, eine andere E-Mail öffnen und das Popup erneut öffnen. Die automatische Analyse muss angezeigt werden.

## Technische Struktur

- `thunderbird-ai/`: Manifest, Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.
