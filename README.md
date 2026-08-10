# Thunderbird AI Assistant

Ein Thunderbird-MailExtension-Add-on für Zusammenfassungen, Antwortentwürfe und weitere E-Mail-Analysen mit der OpenAI API.

## Funktionen

- Zusammenfassung des tatsächlichen Nachrichtentexts aus dem dekodierten MIME-Baum
- iterativer Antworteditor mit AI-Überarbeitung, direkter Textbearbeitung und Übergabe an einen neuen Thunderbird-Antwortentwurf
- persistente Antwortoptionen für Originalzitat, „Allen antworten“ und erneutes Anhängen der ursprünglichen Dateien
- kombinierte Wichtigkeits- und Spam-Bewertung einzelner E-Mails mit korrigierbaren Prozentwerten
- Übersetzung nach Deutsch, Englisch, Französisch oder Spanisch
- Extraktion von Kontakten, Terminen, Beträgen, Referenzen und Aufgaben
- Spam-/Phishing-Einschätzung mit konkreten Indikatoren
- lokale Suche nach ähnlichen Nachrichten im aktuellen Ordner
- nachrichtenbezogener AI Chat
- lokale Ergebnisablage mit Verwaltung unter **Einstellungen** und Zwischenablage-Aktion
- optionale automatische Zusammenfassung beim Öffnen einer Nachricht
- eigenes globales Posteingangs-Dashboard mit vollständiger Header-Paginierung, umschaltbarer Konto- oder kombinierter Neueste-50-Ansicht, kontenübergreifender Score-Sortierung, durchsuchbarem Absenderfilter, Datumsfiltern, frei wählbaren 1–50 Nachrichten pro Konto, Einzelauswahl, Mehrfachlöschen und optionaler lokaler Inhaltsvorschau
- standardmäßig Luna-basierte Bulk-Auswertung ausgewählter Dashboard-Nachrichten mit Wichtigkeits- und Spam-Wahrscheinlichkeit von 0–100 %, dauerhaften Score-Filtern und Score-Sortierungen
- leicht korrigierbare Scores mit separatem, löschunabhängigem Lernarchiv, getrennten Gründen für Wichtigkeit und Spam sowie manueller Referenzverwaltung unter **Einstellungen**
- direkte Dashboard-Aktionen für die bestehende Zusammenfassung und den bestehenden interaktiven Antworteditor
- vollständig deutsch- oder englischsprachige Oberfläche mit expliziter Sprachauswahl
- Windows-Ein-Klick-Installer mit kontrolliertem Thunderbird-Neustart

## OpenAI-Modelle

Das bevorzugte Modell wird pro AI-Funktion eingestellt. Die Standards sind:

- `gpt-5.6-luna` für die kostensensitive Bulk-Auswertung
- `gpt-5.6-terra` für das Scoring einer einzelnen E-Mail
- `gpt-5.6-sol` für Zusammenfassungen, Antwortvorschläge und AI Chat

Kategorisierung, bisherige Wichtigkeits- und Spam-Analyse, Übersetzung, Extraktion und Textverbesserung besitzen ebenfalls eine eigene Modellauswahl. **Automatisch** verwendet jeweils das aufgabenspezifische Standardmodell. Bulk-Aufrufe verarbeiten höchstens acht Nachrichten pro API-Aufruf bei maximal zwei parallelen Aufrufen. Das Add-on nutzt die OpenAI Responses API und setzt `store: false`.

## Datenschutz

Bei AI-Aktionen werden Betreff, Absender, Nachrichtentext und Namen erkannter Anhänge direkt von Thunderbird an die OpenAI API gesendet. Beim Verbessern eines Antwortentwurfs werden außerdem der aktuelle Entwurf und die letzten Änderungswünsche übertragen. Die Dashboard-Bulk-Auswertung überträgt ausschließlich die explizit ausgewählten Nachrichten. Normale AI-Scores speichern lokal nur eine stabile Nachrichtenidentität, Prozentwerte, Modell und Analysezeitpunkt.

Eine ausdrücklich gespeicherte Bewertung wird zusätzlich in einem separaten lokalen Lernarchiv gespeichert: höchstens 250 Datensätze mit einem auf 6.000 Zeichen begrenzten E-Mail-Auszug, Anhangnamen, ursprünglichen und korrigierten Werten sowie getrennten Kategorien und Freitextbegründungen für Wichtigkeit und Spam. Normale Thunderbird-Löschvorgänge verändern dieses Archiv nicht. Bei einer späteren Einzel- oder Bulk-Auswertung werden höchstens fünf nach Absender und Betreff priorisierte Korrekturen als nicht vertrauenswürdige Kalibrierungsbeispiele an OpenAI gesendet. Das ist kontextbezogenes Lernen durch Beispiele und kein dauerhaftes Modell-Fine-Tuning. Unter **Einstellungen** lassen sich alle Referenzen einsehen, manuell neu bewerten und entfernen. Die Suche nach ähnlichen Nachrichten und die optionale Dashboard-Inhaltsvorschau laufen ausschließlich lokal. Automatische Verarbeitung ist standardmäßig deaktiviert.

Der API-Schlüssel und gespeicherte Ergebnisse liegen im lokalen Extension-Speicher des Thunderbird-Profils. Für eine breitere Veröffentlichung sollte zusätzlich geprüft werden, ob dieses Sicherheitsmodell den eigenen Anforderungen entspricht.

## Installation unter Windows

1. `Thunderbird-AI-Setup-2.1.0-win-x64.exe` herunterladen und starten.
2. Im Setup **Deutsch** oder **English** wählen. Diese Auswahl wird beim ersten Start als Sprache der Erweiterung übernommen.
3. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung bestätigen.
5. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, die aufgabenspezifischen Modelle prüfen, die Verbindung testen und speichern. Die Oberflächensprache kann dort jederzeit unabhängig von der Thunderbird-Sprache geändert werden.

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
- `artifacts\Thunderbird-AI-Setup-2.1.0-win-x64.exe`

Der bestehende Build flacht Dateien aus `thunderbird-ai/` und `common/` in das Root der XPI ab. Dateinamen müssen deshalb repositoryweit eindeutig sein.

## Manueller Funktionstest

1. In Thunderbirds Hauptsymbolleiste auf **Thunderbird AI Assistant** klicken. Während des Ladens muss der animierte Ladehinweis sichtbar sein. Danach muss das globale Dashboard die unterstützten Konten standardmäßig getrennt auflisten. **Datum: Neueste zuerst** ist der Standard; die aktuellsten ungelesenen Nachrichten müssen oben stehen, auch wenn ein Konto sehr viele ungelesene Nachrichten enthält.
2. Auf **Konten kombinieren: neueste 50 Nachrichten** umschalten. Es muss genau eine Liste mit höchstens 50 Nachrichten erscheinen, die aus allen Konten global nach Datum ausgewählt wurden. Ein selten genutztes Konto mit alten Nachrichten darf keine neueren Nachrichten eines aktiven Kontos verdrängen. Jede Zeile muss ihr Ursprungskonto anzeigen. Danach zurück zur kontogetrennten Ansicht wechseln; die Auswahl muss nach erneutem Öffnen erhalten bleiben.
3. Die vier lokalen Sortierungen prüfen: neueste/älteste zuerst und **Beteiligte** A–Z/Z–A. Die maximale Anzahl erst auf 2 und dann auf 15 setzen. In der getrennten Ansicht dürfen pro Konto nie mehr Nachrichten als dieser Wert erscheinen; in der kombinierten oder global sortierten Ansicht ist die Grenze fest 50 und das Mengenfeld deaktiviert.
4. Den Absender-Filter öffnen, **Alle Absender** deaktivieren und einzelne Absender auswählen. Im Suchfeld nacheinander zwei unterschiedliche Absender suchen und jeweils aktivieren. Beide müssen ausgewählt bleiben, obwohl immer nur das aktuelle Suchergebnis sichtbar ist. Nur passende Nachrichten dürfen erscheinen; der Filter muss nach erneutem Öffnen erhalten bleiben.
5. Mit den Kalenderfeldern **Datum von** und **Datum bis** einen inklusiven Bereich einstellen. Außerhalb liegende Nachrichten müssen verschwinden; ein Bis-Datum vor dem Von-Datum muss abgewiesen werden.
6. **Nachrichteninhalt als Vorschau anzeigen** aktivieren und nacheinander 1 sowie 5 Vorschauzeilen einstellen. Nur die nach Sortierung, Filtern und Mengenbegrenzung sichtbaren Nachrichten dürfen Inhaltsvorschauen laden. Lange Vorschauen müssen innerhalb der Nachricht scrollbar sein.
7. Mehrere Nachrichten einzeln auswählen und anschließend **Alle auswählen** testen. Anzahl, Auswahlzustand und beide Bulk-Schaltflächen müssen sich passend aktualisieren.
8. **Ausgewählte mit AI analysieren** anklicken. Während der Verarbeitung muss der Luna-Ladehinweis mit Animation sichtbar sein. Danach müssen jede erfolgreich analysierte Nachricht zwei Prozentwerte und die Antwortmeldung das Luna-Modell nennen.
9. Alle vier lokalen Score-Sortierungen und die vier Varianten **über alle Konten** prüfen: Wichtigkeit und Spam-Wahrscheinlichkeit jeweils auf- und absteigend. Die kontenübergreifenden Varianten müssen in der sonst kontogetrennten Ansicht genau eine global sortierte Liste erzeugen. Nicht analysierte Nachrichten müssen hinter analysierten Ergebnissen stehen.
10. Die AI-Filter **Nur analysierte**, **Nur nicht analysierte**, **Wahrscheinlich Spam** und **Wahrscheinlich kein Spam** sowie beide Mindestwerte testen. Einstellungen müssen nach erneutem Öffnen erhalten bleiben.
11. An einer analysierten Nachricht **Werte korrigieren** anklicken. Beide Regler und Zahlenfelder müssen mit den aktuellen Werten starten und synchron bleiben. Ohne Änderung muss das Speichern abgewiesen werden.
12. Wichtigkeit und Spam-Wahrscheinlichkeit ändern, optional eine Begründung eingeben und speichern. Die neuen Werte und **Vom Nutzer korrigiert** müssen sofort erscheinen und von Sortierung/Filtern verwendet werden. Dashboard schließen und erneut öffnen; die Korrektur muss erhalten bleiben.
13. Die korrigierte Testnachricht löschen. Das separate Lernarchiv darf dadurch nicht verändert werden; eine spätere Bulk-Analyse mit einer ähnlichen Nachricht muss weiterhin erfolgreich laufen.
14. An einer Nachricht **Zusammenfassen** anklicken. Ein eigener Tab muss die vorhandene Einzelmail-Oberfläche öffnen und dort automatisch die Zusammenfassung erstellen.
15. An einer Nachricht **Antwort vorschlagen** anklicken. Der vorhandene interaktive Antworteditor muss in einem eigenen Tab erscheinen.
16. Bei einer entbehrlichen Testnachricht die direkte Schaltfläche **Löschen** anklicken und den Dialog zunächst abbrechen. Danach bestätigen; nur diese Nachricht darf aus der Übersicht verschwinden.
17. Mehrere entbehrliche Testnachrichten auswählen, **Ausgewählte löschen** anklicken und bestätigen. Nur die ausgewählten Nachrichten dürfen verschwinden. Thunderbird verwendet dabei die Lösch- und Papierkorb-Einstellungen des jeweiligen Kontos.
18. Eine E-Mail öffnen und den nachrichtenbezogenen **AI Assistant**-Button anklicken. Statt des Dashboards muss die bisherige Einzelmail-Oberfläche erscheinen.
19. Eine reine Text-E-Mail und eine HTML-E-Mail öffnen und jeweils **Zusammenfassen** ausführen.
20. **Antwort vorschlagen** ausführen; ein eigener Thunderbird-Tab muss den ersten, direkt bearbeitbaren Entwurf anzeigen. Bei langem Inhalt muss nur der mittlere Arbeitsbereich scrollen, während **Antwort kopieren** und **In Thunderbird vorbereiten** dauerhaft sichtbar bleiben.
21. Einen Änderungswunsch eingeben und **Entwurf verbessern** anklicken. Der bisherige Chat muss sichtbar bleiben und der aktuelle Entwurf aktualisiert werden.
22. Die drei Antwortoptionen in ihren Standardwerten prüfen: Originalnachricht und **Allen antworten** aktiviert, ursprüngliche Anhänge deaktiviert.
23. Den Entwurf zusätzlich von Hand ändern und **In Thunderbird vorbereiten** anklicken. Der neue Antwortentwurf muss an alle Teilnehmer adressiert sein, den AI-Text vor dem nativen Thunderbird-Zitat enthalten und keine ursprünglichen Anhänge besitzen.
24. Den Antworteditor erneut öffnen, alle drei Optionen umschalten und wieder vorbereiten. Der Entwurf muss nur an den Absender gehen, kein Originalzitat enthalten und alle ursprünglichen Anhänge besitzen. Beim nächsten Öffnen müssen diese Werte vorausgewählt bleiben.
25. Bei einem Compose-Fehler muss der aktuelle Text stattdessen in die Zwischenablage kopiert werden.
26. **Scoring-Info** ausführen. Das Einzelmail-Popup darf keine schnellen Schaltflächen für **Kategorisieren**, **Wichtigkeit prüfen** oder **API testen** mehr zeigen. Terra muss standardmäßig neue Wichtigkeits- und Spam-Werte liefern. Beide Werte ändern, getrennte Gründe auswählen, je einen Freitext eingeben und die Referenz speichern. Beim erneuten Scoring derselben E-Mail müssen die archivierten Werte und Gründe vorausgewählt und für die neue Bewertung berücksichtigt werden.
27. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
28. Beide **AI Chat**-Schaltflächen testen, Ergebnisse kopieren und lokal speichern.
29. Unter **Einstellungen** die Modellauswahl für Bulk, Einzelmail-Scoring, Zusammenfassen, Antwortvorschlag, AI Chat und jede weitere AI-Funktion prüfen. Standardmäßig müssen Luna, Terra beziehungsweise Sol wie im Abschnitt **OpenAI-Modelle** ausgewählt sein; jede Auswahl muss sich unabhängig ändern und speichern lassen.
30. Im **Archiv der Scoring-Referenzen** die gespeicherte Testmail öffnen, Inhalt, Werte und getrennte Gründe prüfen, manuell neu bewerten und speichern. Danach die Referenz entfernen; die Thunderbird-E-Mail darf dabei nicht gelöscht oder verändert werden.
31. Die Oberflächensprache auf **English** umstellen und globales Dashboard, Einzelmail-Popup, Antworteditor, Einstellungen und Hilfe prüfen. Danach zurück auf **Deutsch** wechseln. Alle sichtbaren Texte und Meldungen müssen der Auswahl folgen.
32. Optional die automatische Verarbeitung aktivieren, eine andere E-Mail öffnen und das Popup erneut öffnen. Die automatische Analyse muss angezeigt werden.

Im Einzelmail-Popup wird die aktive Add-on-Version unter dem Betreff angezeigt. Nach einem Update muss dort **Version 2.1.0** stehen. Das Dashboard verwendet den Ungelesen-Status als Kandidatenfilter. Für die im Dashboard ausgewerteten Nachrichten bleiben die AI-Scores lokal gespeichert und erlauben den Filter **Nur nicht analysierte**; Nachrichten, die außerhalb des Dashboards analysiert wurden, erhalten dadurch jedoch keine Dashboard-Markierung.

## Technische Struktur

- `thunderbird-ai/`: Manifest, getrennte globale und nachrichtenbezogene Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.
