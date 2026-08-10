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
- eigenes globales Posteingangs-Dashboard mit bis zu zehn ungelesenen Nachrichten pro Konto, Einzelauswahl, „Alle auswählen“, bestätigtem Einzel-/Mehrfachlöschen und optionaler lokaler Inhaltsvorschau
- vollständig deutsch- oder englischsprachige Oberfläche mit expliziter Sprachauswahl
- Windows-Ein-Klick-Installer mit kontrolliertem Thunderbird-Neustart

## OpenAI-Modelle

Die empfohlene Einstellung **Automatisch** wählt das Modell nach Aufgabe:

- `gpt-5.6-terra` für Zusammenfassungen, Antworten, Chat und Textverbesserung
- `gpt-5.6-luna` für Kategorisierung, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung

Alternativ kann Luna, Terra oder `gpt-5.6-sol` für alle Aufgaben fest ausgewählt werden. Das Add-on nutzt die OpenAI Responses API und setzt `store: false`.

## Datenschutz

Bei AI-Aktionen werden Betreff, Absender, Nachrichtentext und Namen erkannter Anhänge direkt von Thunderbird an die OpenAI API gesendet. Beim Verbessern eines Antwortentwurfs werden außerdem der aktuelle Entwurf und die letzten Änderungswünsche übertragen. Die Suche nach ähnlichen Nachrichten und die optionale Dashboard-Inhaltsvorschau laufen ausschließlich lokal. Automatische Verarbeitung ist standardmäßig deaktiviert.

Der API-Schlüssel und gespeicherte Ergebnisse liegen im lokalen Extension-Speicher des Thunderbird-Profils. Für eine breitere Veröffentlichung sollte zusätzlich geprüft werden, ob dieses Sicherheitsmodell den eigenen Anforderungen entspricht.

## Installation unter Windows

1. `Thunderbird-AI-Setup-1.6.0-win-x64.exe` herunterladen und starten.
2. Im Setup **Deutsch** oder **English** wählen. Diese Auswahl wird beim ersten Start als Sprache der Erweiterung übernommen.
3. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung bestätigen.
5. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, **Automatisch (empfohlen)** wählen, die Verbindung testen und speichern. Die Oberflächensprache kann dort jederzeit unabhängig von der Thunderbird-Sprache geändert werden.

Der benutzerbezogene Installer benötigt keine Administratorrechte. Eine neue Setup-Datei aktualisiert die vorhandene Version; eine Deinstallation ist nicht nötig. Die feste Add-on-ID erhält die Einstellungen. Der aktuelle Test-Installer ist nicht Authenticode-signiert und kann deshalb eine SmartScreen-Warnung auslösen.

Version 1.5.1 korrigiert die in 1.3.0 bis 1.5.0 fehlerhaft gepackten Lokalisierungsordner. Diese älteren Installer sollten nicht mehr verteilt werden.

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
- `artifacts\Thunderbird-AI-Setup-1.6.0-win-x64.exe`

Der bestehende Build flacht Dateien aus `thunderbird-ai/` und `common/` in das Root der XPI ab. Dateinamen müssen deshalb repositoryweit eindeutig sein.

## Manueller Funktionstest

1. In Thunderbirds Hauptsymbolleiste auf **Thunderbird AI Assistant** klicken. Das globale Dashboard muss die unterstützten Konten getrennt auflisten und je Konto höchstens zehn ungelesene Nachrichten anzeigen. Dafür ist weder ein API-Schlüssel noch ein AI-Aufruf erforderlich.
2. **Nachrichteninhalt als Vorschau anzeigen** aktivieren und nacheinander 1 sowie 5 Vorschauzeilen einstellen. Lange Vorschauen müssen innerhalb der Nachricht scrollbar sein. Dashboard schließen und erneut öffnen; Schalter und Zeilenzahl müssen erhalten bleiben.
3. Mehrere Nachrichten einzeln auswählen und anschließend **Alle auswählen** testen. Anzahl, Auswahlzustand und Mehrfachschaltfläche müssen sich passend aktualisieren.
4. Bei einer entbehrlichen Testnachricht die direkte Schaltfläche **Löschen** anklicken und den Dialog zunächst abbrechen. Danach bestätigen; nur diese Nachricht darf aus der Übersicht verschwinden.
5. Mehrere entbehrliche Testnachrichten auswählen, **Ausgewählte löschen** anklicken und bestätigen. Nur die ausgewählten Nachrichten dürfen verschwinden. Thunderbird verwendet dabei die Lösch- und Papierkorb-Einstellungen des jeweiligen Kontos.
6. Eine E-Mail öffnen und den nachrichtenbezogenen **AI Assistant**-Button anklicken. Statt des Dashboards muss die bisherige Einzelmail-Oberfläche erscheinen.
7. Eine reine Text-E-Mail und eine HTML-E-Mail öffnen und jeweils **Zusammenfassen** ausführen.
8. **Antwort vorschlagen** ausführen; ein eigener Thunderbird-Tab muss den ersten, direkt bearbeitbaren Entwurf anzeigen. Bei langem Inhalt muss nur der mittlere Arbeitsbereich scrollen, während **Antwort kopieren** und **In Thunderbird vorbereiten** dauerhaft sichtbar bleiben.
9. Einen Änderungswunsch eingeben und **Entwurf verbessern** anklicken. Der bisherige Chat muss sichtbar bleiben und der aktuelle Entwurf aktualisiert werden.
10. Die drei Antwortoptionen in ihren Standardwerten prüfen: Originalnachricht und **Allen antworten** aktiviert, ursprüngliche Anhänge deaktiviert.
11. Den Entwurf zusätzlich von Hand ändern und **In Thunderbird vorbereiten** anklicken. Der neue Antwortentwurf muss an alle Teilnehmer adressiert sein, den AI-Text vor dem nativen Thunderbird-Zitat enthalten und keine ursprünglichen Anhänge besitzen.
12. Den Antworteditor erneut öffnen, alle drei Optionen umschalten und wieder vorbereiten. Der Entwurf muss nur an den Absender gehen, kein Originalzitat enthalten und alle ursprünglichen Anhänge besitzen. Beim nächsten Öffnen müssen diese Werte vorausgewählt bleiben.
13. Bei einem Compose-Fehler muss der aktuelle Text stattdessen in die Zwischenablage kopiert werden.
14. Kategorie, Wichtigkeit, Übersetzung, Extraktion und Spam-Prüfung ausführen.
15. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
16. Beide **AI Chat**-Schaltflächen testen.
17. Das Ergebnis kopieren und lokal speichern.
18. Unter **Einstellungen** jedes Modell testen; anschließend **Automatisch** speichern.
19. Die Oberflächensprache auf **English** umstellen und globales Dashboard, Einzelmail-Popup, Antworteditor, Einstellungen und Hilfe prüfen. Danach zurück auf **Deutsch** wechseln. Alle sichtbaren Texte und Meldungen müssen der Auswahl folgen.
20. Optional die automatische Verarbeitung aktivieren, eine andere E-Mail öffnen und das Popup erneut öffnen. Die automatische Analyse muss angezeigt werden.

Im Einzelmail-Popup wird die aktive Add-on-Version unter dem Betreff angezeigt. Nach einem Update muss dort **Version 1.6.0** stehen. Das Dashboard verwendet den Ungelesen-Status als Kandidatenfilter. Eine separate, dauerhafte Markierung „bereits analysiert“ ist noch nicht Bestandteil dieser Version.

## Technische Struktur

- `thunderbird-ai/`: Manifest, getrennte globale und nachrichtenbezogene Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.
