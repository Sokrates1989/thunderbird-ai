# Thunderbird AI Assistant

Ein Thunderbird-MailExtension-Add-on für Zusammenfassungen, Antwortentwürfe und weitere E-Mail-Analysen mit der OpenAI API.

## Funktionen

- Zusammenfassung des tatsächlichen Nachrichtentexts aus dem dekodierten MIME-Baum
- iterativer Antworteditor mit AI-Überarbeitung, direkter Textbearbeitung und Übergabe an einen neuen Thunderbird-Antwortentwurf
- persistente Antwortoptionen für Originalzitat, „Allen antworten“ und erneutes Anhängen der ursprünglichen Dateien
- kombinierte Wichtigkeits-, Spam- und Risiko-Bewertung einzelner E-Mails mit korrigierbaren Prozentwerten
- Übersetzung nach Deutsch, Englisch, Französisch oder Spanisch
- Extraktion von Kontakten, Terminen, Beträgen, Referenzen und Aufgaben
- unabhängiger Risikowert für Phishing, Betrug, gefährliche Inhalte, potenziell Rechtswidriges und sonst unerwünschte Kontakte
- lokale Suche nach ähnlichen Nachrichten im aktuellen Ordner
- nachrichtenbezogener AI Chat
- lokale Ergebnisablage mit Verwaltung unter **Einstellungen** und Zwischenablage-Aktion
- lokale, tokenbasierte Schätzung der bisherigen OpenAI-API-Kosten mit transparentem Preisstand
- eigenes globales Posteingangs-Dashboard mit vollständiger Header-Paginierung, einer übersichtlich gruppierten und dauerhaft ein-/ausklappbaren Ansichtskonfiguration, umschaltbarer Konto- oder kombinierter Neueste-50-Ansicht, kontenübergreifender Score-Sortierung, durchsuchbarem Absenderfilter, Datumsfiltern, frei wählbaren 1–50 Nachrichten pro Konto, Einzelauswahl, Mehrfachlöschen und optionaler lokaler Inhaltsvorschau
- standardmäßig Luna-basierte Bulk-Auswertung noch nicht bewerteter ausgewählter Dashboard-Nachrichten mit Wichtigkeit, Spam-Wahrscheinlichkeit und Risikowert von 0–100 %, dauerhaften Score-Filtern, Score-Sortierungen und ausdrücklicher Neu-Bewertung
- lokale, begrenzte Spam-Vorprüfung mit Absenderhäufigkeit der letzten 30/90 Tage und insgesamt sowie strukturellen Newsletter-/Massenversand-Signalen
- leicht korrigierbare Scores mit separatem, löschunabhängigem Lernarchiv, getrennten Gründen für Wichtigkeit, Spam und Risiko sowie manueller Referenzverwaltung unter **Einstellungen**
- direkte Dashboard-Aktionen für die bestehende Zusammenfassung und den bestehenden interaktiven Antworteditor
- klar getrennte, zweispaltige AI- und E-Mail-Aktionen mit Icons, direktes oder gebündeltes Markieren als gelesen sowie native Thunderbird-Archivierung in die kontobezogenen Jahresarchive
- vollständig deutsch- oder englischsprachige Oberfläche mit expliziter Sprachauswahl
- Windows-Ein-Klick-Installer mit kontrolliertem Thunderbird-Neustart

## OpenAI-Modelle

Das bevorzugte Modell wird pro AI-Funktion eingestellt. Die Standards sind:

- `gpt-5.6-luna` für die kostensensitive Bulk-Auswertung
- `gpt-5.6-terra` für das Scoring einer einzelnen E-Mail
- `gpt-5.6-sol` für Zusammenfassungen, Antwortvorschläge und AI Chat

Kategorisierung, bisherige Wichtigkeits- und Spam-Analyse, Übersetzung, Extraktion und Textverbesserung besitzen ebenfalls eine eigene Modellauswahl. **Automatisch** verwendet jeweils das aufgabenspezifische Standardmodell. Bulk-Aufrufe verarbeiten höchstens acht Nachrichten pro API-Aufruf bei maximal zwei parallelen Aufrufen. Das Add-on nutzt die OpenAI Responses API und setzt `store: false`.

Der **Spam-Wert** bewertet typische unerwünschte Massen-, Werbe- oder Streunachrichten. Der davon unabhängige **Risikowert** bewertet Signale für Phishing oder Social Engineering, Betrugsversuche, verdächtige Links oder Anhänge, Drohungen, möglicherweise rechtswidrige Angebote und unerwünschte Kontaktaufnahme. Er ist eine AI-Einschätzung und weder technischer Malwaretest noch rechtliches Urteil.

Vor Einzel- und Bulk-Scorings zählt das Add-on lokal E-Mails mit derselben vollständigen Absenderadresse. Die Abfrage endet spätestens nach 1.000 Treffern, wird zehn Minuten im Arbeitsspeicher zwischengespeichert und erfasst zusätzlich List-Unsubscribe/List-ID, Bulk-Header, automatisierte Absender, Abmeldesprache und Kampagnenlinks als Signalnamen. Häufigkeit erhöht die Spam-Vermutung, gilt für sich allein aber nicht als Beweis, weil legitime Transaktions- und Systemmails ebenfalls häufig eintreffen können. Klare Newsletter werden auf einer ausdrücklich kalibrierten Spam-Skala höher eingestuft; gespeicherte Korrekturen für denselben Absender haben Vorrang vor der lokalen Untergrenze.

Temporäre Netzwerkfehler, Zeitüberschreitungen, Anfragelimits und vorübergehende OpenAI-Serverfehler werden mit begrenzten Wartezeiten automatisch bis zu zweimal wiederholt. Ein `Retry-After`-Hinweis von OpenAI wird bis zu zehn Sekunden berücksichtigt. Fehlerhafte oder unberechtigte API-Schlüssel, ausgeschöpftes Guthaben und dauerhafte Clientfehler werden ohne nutzlose Wiederholung eindeutig gemeldet. Thunderbird-Verbindungsfehler werden nur dann wiederholt, wenn Thunderbird bestätigt, dass die Nachricht den Hintergrundprozess nicht erreicht hat.

## Dashboard-Archivierung

**Archivieren** und **Ausgewählte archivieren** verwenden Thunderbirds native Archivfunktion. Dadurch gelten für jede Nachricht die Archiveinstellungen ihres Kontos und ihrer Identität; das Add-on errät keine lokalisierten Ordnernamen und verschiebt Nachrichten unterschiedlicher Konten nicht versehentlich in dasselbe Archiv. Damit das Ziel `Archiv/<Sendejahr>` entsteht, muss unter **Konten-Einstellungen → Kopien & Ordner → Nachrichtenarchiv → Archivoptionen** für die jeweilige Identität **Jährliche archivierte Ordner** ausgewählt sein. Konten wie Gmail können serverseitig ein anderes Archivmodell vorgeben.

Unter **Einstellungen → Thunderbird-Archivierung** zeigt **Archivordner prüfen** für jedes unterstützte Konto ausschließlich die Ordner an, die Thunderbird selbst als Archiv kennzeichnet, außerdem vorhandene direkte Jahresordner und die gemeldete Fähigkeit, Unterordner anzulegen. Die Prüfung verändert keine E-Mails, Ordner oder Kontoeinstellungen. Thunderbird stellt MailExtensions keinen Deep-Link zu den geschützten Konten-Einstellungen und keinen Lesezugriff auf die Auswahl **Jährliche archivierte Ordner** bereit. Der Abschnitt nennt deshalb den exakten manuellen Menüpfad und öffnet über **Thunderbird-Hilfe öffnen** die offizielle Anleitung im Standardbrowser.

## Datenschutz

Bei AI-Aktionen werden Betreff, Absender, Nachrichtentext und Namen erkannter Anhänge direkt von Thunderbird an die OpenAI API gesendet. Beim Verbessern eines Antwortentwurfs werden außerdem der aktuelle Entwurf und die letzten Änderungswünsche übertragen. Die normale Dashboard-Bulk-Auswertung überträgt ausschließlich explizit ausgewählte Nachrichten ohne vorhandenen Dashboard-Score; bereits bewertete Nachrichten werden ohne API-Aufruf übersprungen. Nur **Auswahl neu bewerten** sendet sie nach einer Bestätigung erneut. Nicht korrigierte AI-Scores speichern lokal ausschließlich eine stabile Nachrichtenidentität aus Konto und RFC Message-ID, Prozentwerte, Modell und Analysezeitpunkt. Bei einer Dashboard-Korrektur kommen die getrennten Kategorien und Freitexte für Wichtigkeit, Spam und Risiko hinzu, damit sie beim erneuten Öffnen vorausgewählt werden können. Fehlt die RFC Message-ID, werden Konto, Datum, Absender, Betreff und Größe als Ersatzidentität verwendet. Höchstens 1.000 dieser Score-Datensätze bleiben erhalten. Vor Version 2.6.0 gespeicherte Zwei-Werte-Datensätze bleiben erhalten und zeigen den Risikowert als **noch nicht bewertet**. Sie werden nicht automatisch erneut an OpenAI gesendet; eine ausdrückliche Neu-Bewertung oder manuelle Korrektur ergänzt den dritten Wert.

Beim Scoring werden außerdem ausschließlich die aggregierten Ergebnisse der lokalen Spam-Vorprüfung an OpenAI gesendet: Trefferzahlen für denselben Absender insgesamt und in den letzten 30/90 Tagen, die Anzahl vorhandener Junk-Markierungen, erkannte Signalnamen und die daraus berechnete konservative Spam-Untergrenze. Inhalte anderer Nachrichten, rohe MIME-Header und URLs werden dafür nicht übertragen. Die Absenderstatistik wird nicht dauerhaft gespeichert; ihr Arbeitsspeicher-Cache verfällt nach zehn Minuten.

Bei einem als temporär erkannten Fehler kann derselbe AI-Inhalt innerhalb einer Benutzeraktion bis zu drei Mal an OpenAI gesendet werden. Ein bereits vom Server angenommener, aber lokal nicht mehr bestätigter Versuch kann dadurch zusätzliche API-Kosten verursachen; die lokale Statistik zählt deshalb die tatsächlich gestarteten API-Versuche. Ab Version 2.3.0 werden zusätzlich die von erfolgreichen OpenAI-Antworten gemeldeten Input-, Cache- und Output-Text-Tokens getrennt nach Modell lokal summiert. Die Einstellungen zeigen daraus eine USD-Schätzung mit fest ausgewiesenem Preisstand. Frühere Aufrufe, Steuern, Sondertarife sowie mögliche Langkontext- oder Cache-Schreibaufschläge sind nicht enthalten. Scoring-Korrekturen werden unter ihrer stabilen Nachrichtenidentität aktualisiert statt dupliziert.

Eine ausdrücklich gespeicherte Bewertung wird zusätzlich in einem separaten lokalen Lernarchiv gespeichert: höchstens 250 Datensätze mit einem auf 6.000 Zeichen begrenzten E-Mail-Auszug, Anhangnamen, ursprünglichen und korrigierten Werten sowie getrennten Kategorien und Freitextbegründungen für Wichtigkeit, Spam und Risiko. Normale Thunderbird-Löschvorgänge verändern dieses Archiv nicht. Bei einer späteren Einzel- oder Bulk-Auswertung werden höchstens fünf nach Absender und Betreff priorisierte Korrekturen als nicht vertrauenswürdige Kalibrierungsbeispiele an OpenAI gesendet. Das ist kontextbezogenes Lernen durch Beispiele und kein dauerhaftes Modell-Fine-Tuning. Ältere Referenzen ohne Risikowert bleiben lesbar; ihr Risikofeld ist bis zur manuellen Bearbeitung leer. Unter **Einstellungen** lassen sich alle Referenzen einsehen, manuell neu bewerten und entfernen. Die Suche nach ähnlichen Nachrichten und die optionale Dashboard-Inhaltsvorschau laufen ausschließlich lokal. Eine automatische E-Mail-Analyse beim Öffnen findet nicht statt.

Der API-Schlüssel und gespeicherte Ergebnisse liegen im lokalen Extension-Speicher des Thunderbird-Profils. Für eine breitere Veröffentlichung sollte zusätzlich geprüft werden, ob dieses Sicherheitsmodell den eigenen Anforderungen entspricht.

## Installation unter Windows

1. `Thunderbird-AI-Setup-2.7.1-win-x64.exe` herunterladen und starten.
2. Im Setup **Deutsch** oder **English** wählen. Diese Auswahl wird beim ersten Start als Sprache der Erweiterung übernommen.
3. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung und zu den Berechtigungen zum Ändern, Verschieben und Löschen von Nachrichten bestätigen.
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
- `artifacts\Thunderbird-AI-Setup-2.7.1-win-x64.exe`

Der bestehende Build flacht Dateien aus `thunderbird-ai/` und `common/` in das Root der XPI ab. Dateinamen müssen deshalb repositoryweit eindeutig sein.

## Manueller Funktionstest

1. In Thunderbirds Hauptsymbolleiste auf **Thunderbird AI Assistant** klicken. Während des Ladens muss der animierte Ladehinweis sichtbar sein. Danach muss das globale Dashboard die unterstützten Konten standardmäßig getrennt auflisten. **Datum: Neueste zuerst** ist der Standard; die aktuellsten ungelesenen Nachrichten müssen oben stehen, auch wenn ein Konto sehr viele ungelesene Nachrichten enthält. Das Panel **Ansicht** muss beim ersten Start geöffnet und in die vier Bereiche Darstellung/Sortierung, Zeitraum/Absender, Inhaltsvorschau und AI-Filter gegliedert sein. Panel schließen, Dashboard erneut öffnen und den geschlossenen Zustand prüfen; danach wieder öffnen und auch diesen Zustand über ein erneutes Öffnen hinweg prüfen.
2. Auf **Konten kombinieren: neueste 50 Nachrichten** umschalten. Es muss genau eine Liste mit höchstens 50 Nachrichten erscheinen, die aus allen Konten global nach Datum ausgewählt wurden. Ein selten genutztes Konto mit alten Nachrichten darf keine neueren Nachrichten eines aktiven Kontos verdrängen. Jede Zeile muss ihr Ursprungskonto anzeigen. Danach zurück zur kontogetrennten Ansicht wechseln; die Auswahl muss nach erneutem Öffnen erhalten bleiben.
3. Die vier lokalen Sortierungen prüfen: neueste/älteste zuerst und **Beteiligte** A–Z/Z–A. Die maximale Anzahl erst auf 2 und dann auf 15 setzen. In der getrennten Ansicht dürfen pro Konto nie mehr Nachrichten als dieser Wert erscheinen; in der kombinierten oder global sortierten Ansicht ist die Grenze fest 50 und das Mengenfeld deaktiviert.
4. Den Absender-Filter öffnen, **Alle Absender** deaktivieren und einzelne Absender auswählen. Im Suchfeld nacheinander zwei unterschiedliche Absender suchen und jeweils aktivieren. Beide müssen ausgewählt bleiben, obwohl immer nur das aktuelle Suchergebnis sichtbar ist. Nur passende Nachrichten dürfen erscheinen; der Filter muss nach erneutem Öffnen erhalten bleiben.
5. Mit den Kalenderfeldern **Datum von** und **Datum bis** einen inklusiven Bereich einstellen. Außerhalb liegende Nachrichten müssen verschwinden; ein Bis-Datum vor dem Von-Datum muss abgewiesen werden.
6. **Nachrichteninhalt als Vorschau anzeigen** aktivieren und nacheinander 1 sowie 5 Vorschauzeilen einstellen. Nur die nach Sortierung, Filtern und Mengenbegrenzung sichtbaren Nachrichten dürfen Inhaltsvorschauen laden. Lange Vorschauen müssen innerhalb der Nachricht scrollbar sein.
7. Mehrere Nachrichten einzeln auswählen und anschließend **Alle auswählen** testen. Anzahl, Auswahlzustand und alle vier Bulk-Schaltflächen müssen sich passend aktualisieren.
8. Eine Mischung aus noch nicht bewerteten und bereits bewerteten Nachrichten markieren und **Unbewertete Auswahl analysieren** anklicken. Während der Verarbeitung muss der Ladehinweis mit Animation sichtbar sein. Danach müssen nur die vorher unbewerteten Nachrichten neue Prozentwerte erhalten und die Meldung muss die Anzahl der ohne API-Aufruf übersprungenen Nachrichten nennen. Nur bereits bewertete Nachrichten auswählen und dieselbe Aktion erneut ausführen; es darf keine API-Anfrage erfolgen. Anschließend **Auswahl neu bewerten** anklicken, den Bestätigungsdialog zunächst abbrechen und beim zweiten Versuch bestätigen. Erst dann dürfen vorhandene sichtbare Scores ersetzt werden; gespeicherte Nutzerkorrekturen müssen im Lernarchiv erhalten bleiben.
9. Alle sechs lokalen Score-Sortierungen und die sechs Varianten **über alle Konten** prüfen: Wichtigkeit, Spam-Wahrscheinlichkeit und Risikowert jeweils auf- und absteigend. Die kontenübergreifenden Varianten müssen in der sonst kontogetrennten Ansicht genau eine global sortierte Liste erzeugen. Nicht analysierte Nachrichten müssen hinter analysierten Ergebnissen stehen.
10. Die AI-Filter **Nur analysierte**, **Nur nicht analysierte**, **Wahrscheinlich Spam**, **Wahrscheinlich kein Spam**, **Wahrscheinlich riskant** und **Wahrscheinlich wenig riskant** sowie alle drei Mindestwerte testen. Einstellungen müssen nach erneutem Öffnen erhalten bleiben.
11. An einer analysierten Nachricht **Werte korrigieren** anklicken. Wichtigkeit, Spam und Risiko müssen jeweils einen eigenen Regler, ein synchrones Zahlenfeld, passende Begründungs-Kontrollkästchen und ein eigenes Freitextfeld zeigen. Ohne Änderung muss das Speichern abgewiesen werden.
12. Wichtigkeit, Spam-Wahrscheinlichkeit und Risikowert ändern, für alle drei Werte unterschiedliche Gründe auswählen sowie getrennte Freitexte eingeben und speichern. Die neuen Werte und **Vom Nutzer korrigiert** müssen sofort erscheinen und von Sortierung/Filtern verwendet werden. Dashboard schließen und erneut öffnen; Werte und getrennte Gründe müssen erhalten bleiben und beim erneuten Korrigieren vorausgewählt sein.
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
26. **Scoring-Info** ausführen. Das Einzelmail-Popup darf keine schnellen Schaltflächen für **Kategorisieren**, **Wichtigkeit prüfen** oder **API testen** mehr zeigen. Terra muss standardmäßig neue Wichtigkeits-, Spam- und Risikowerte liefern. Alle drei Werte ändern, getrennte Gründe auswählen, je einen Freitext eingeben und die Referenz speichern. Beim erneuten Scoring derselben E-Mail müssen die archivierten Werte und Gründe vorausgewählt und für die neue Bewertung berücksichtigt werden.
27. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
28. Beide **AI Chat**-Schaltflächen testen, Ergebnisse kopieren und lokal speichern.
29. Unter **Einstellungen** die Modellauswahl für Bulk, Einzelmail-Scoring, Zusammenfassen, Antwortvorschlag, AI Chat und jede weitere AI-Funktion prüfen. Jede Bezeichnung und das zugehörige Auswahlfeld müssen unmittelbar zusammen in einer eigenen klar abgegrenzten Karte stehen. Standardmäßig müssen Luna, Terra beziehungsweise Sol wie im Abschnitt **OpenAI-Modelle** ausgewählt sein; jede Auswahl muss sich unabhängig ändern und speichern lassen.
30. Im **Archiv der Scoring-Referenzen** die gespeicherte Testmail öffnen, alle drei Werte und getrennten Gründe prüfen, manuell neu bewerten und speichern. Eine vor Version 2.6.0 gespeicherte Referenz muss mit leerem Risikofeld lesbar bleiben und sich nach Eingabe des Risikowerts speichern lassen. Danach die Referenz entfernen; die Thunderbird-E-Mail darf dabei nicht gelöscht oder verändert werden.
31. Die Oberflächensprache auf **English** umstellen und globales Dashboard, Einzelmail-Popup, Antworteditor, Einstellungen und Hilfe prüfen. Danach zurück auf **Deutsch** wechseln. Alle sichtbaren Texte und Meldungen müssen der Auswahl folgen.
32. In den **Einstellungen** darf kein Abschnitt für automatische E-Mail-Verarbeitung mehr erscheinen. Einen erfolgreichen API-Test oder eine andere AI-Aktion ausführen und anschließend die Nutzungsstatistiken aktualisieren. **Geschätzte API-Kosten** müssen als lokalisierter USD-Wert erscheinen und der Hinweis muss Beginn der Tokenaufzeichnung, Preisstand sowie Einschränkungen nennen.
33. Den API-Verbindungstest nur einmal anklicken. Bei einem kurzzeitigen Verbindungsproblem muss die Oberfläche im Ladezustand bleiben, während das Add-on selbstständig erneut versucht. Erst nach allen erfolglosen Versuchen darf eine konkrete Netzwerk-, Zeitlimit-, Rate-Limit-, Server-, Schlüssel- oder Guthabenmeldung erscheinen.
34. Eine Scoring-Korrektur nur einmal speichern. Ein kurzzeitiger Thunderbird- oder lokaler Speicherfehler muss intern erneut versucht werden; die Referenz darf höchstens einmal unter ihrer stabilen Nachrichtenidentität im Archiv erscheinen.
35. Im Dashboard müssen AI- und E-Mail-Aktionen sowohl im Bulk-Bereich als auch pro Nachricht in zwei klar beschrifteten Spalten mit Icons erscheinen. Eine einzelne Nachricht über **Als gelesen markieren** bearbeiten; sie muss ohne Rückfrage aus der ungelesenen Ansicht verschwinden. Danach mehrere Nachrichten auswählen und **Ausgewählte als gelesen markieren** verwenden. Erfolgreich geänderte Nachrichten müssen verschwinden, während mögliche Einzelfehler gemeldet werden, ohne die übrigen Änderungen zurückzunehmen.
36. In Thunderbird unter **Konten-Einstellungen → Kopien & Ordner → Nachrichtenarchiv** für die Testkonten jährliche Archivordner konfigurieren. Eine Nachricht aus einem früheren Jahr direkt über **Archivieren** verschieben und prüfen, dass Thunderbird sie im kontobezogenen Ordner `Archiv/<Sendejahr>` ablegt. Danach Nachrichten unterschiedlicher Jahre und Konten auswählen und **Ausgewählte archivieren** verwenden; jede Nachricht muss gemäß ihrer Konto- und Identitätseinstellungen im passenden Jahresarchiv landen und aus dem ungelesenen Dashboard verschwinden.
37. Unter **Einstellungen → Thunderbird-Archivierung** auf **Archivordner prüfen** klicken. Ein von Thunderbird als Archiv gekennzeichneter Testordner muss mit Pfad, vorhandenen direkten Jahresordnern und Unterordner-Fähigkeit erscheinen. Ein lediglich gleich benannter, aber nicht als Archiv gekennzeichneter Ordner darf nicht fälschlich erkannt werden. Über **Thunderbird-Hilfe öffnen** muss die offizielle Anleitung im Standardbrowser erscheinen. Anschließend die nicht per Add-on auslesbare Auswahl **Jährliche archivierte Ordner** einmal manuell über den angezeigten Menüpfad kontrollieren.
38. Für einen klaren Newsletter mit List-Unsubscribe/List-ID oder sichtbarer Abmeldemöglichkeit **Scoring-Info** ausführen. Der Spam-Wert darf nicht mehr im einstelligen Bereich bleiben und muss mindestens die lokale Untergrenze erreichen. Anschließend mehrere Newsletter desselben Absenders in der Bulk-Auswertung prüfen; eine höhere Absenderhäufigkeit muss die lokale Vorprüfung erhöhen. Eine häufige, aber ausdrücklich als erwünscht korrigierte Systemmail desselben Absenders erneut bewerten; die gespeicherte Absenderkorrektur muss Vorrang behalten.

Im Einzelmail-Popup wird die aktive Add-on-Version unter dem Betreff angezeigt. Nach einem Update muss dort **Version 2.7.1** stehen. Das Dashboard verwendet den Ungelesen-Status als Kandidatenfilter. Für die im Dashboard ausgewerteten Nachrichten bleiben die AI-Scores lokal gespeichert und erlauben den Filter **Nur nicht analysierte**; Nachrichten, die außerhalb des Dashboards analysiert wurden, erhalten dadurch jedoch keine Dashboard-Markierung.

## Technische Struktur

- `thunderbird-ai/`: Manifest, getrennte globale und nachrichtenbezogene Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.
