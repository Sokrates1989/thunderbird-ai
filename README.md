# Thunderbird AI Assistant

Ein Thunderbird-MailExtension-Add-on für Zusammenfassungen, Antwortentwürfe und weitere E-Mail-Analysen mit der OpenAI API.

## Download und Veröffentlichungen

- [Aktuelle Veröffentlichung](https://github.com/Sokrates1989/thunderbird-ai/releases/latest)
- [Installer- und Versionshistorie](https://github.com/Sokrates1989/thunderbird-ai/releases)
- [Aktueller macOS-Installer](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/Thunderbird-AI-Setup-macos.pkg)
- [Aktueller Windows-Installer](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/Thunderbird-AI-Setup-win-x64.exe)

Die stabilen Downloadnamen zeigen immer auf die aktuelle GitHub-Veröffentlichung. Jede Veröffentlichung behält zusätzlich versionierte Installer und SHA-256-Prüfsummen für eine nachvollziehbare Historie.

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
- eigenes globales Posteingangs-Dashboard mit vollständiger Header-Paginierung, einer übersichtlich gruppierten und dauerhaft ein-/ausklappbaren Ansichtskonfiguration, stabiler Tab-Ansicht, umschaltbarer Konto- oder kombinierter Neueste-50-Ansicht, kontenübergreifender Score-Sortierung, durchsuchbarem Absenderfilter, Datumsfiltern, frei wählbaren 1–50 Nachrichten pro Konto, Einzelauswahl, Mehrfachlöschen, identischen Bulk-Aktionen ober- und unterhalb der Nachrichten sowie globaler oder nur für eine angeklickte E-Mail geladener lokaler Inhaltsvorschau
- standardmäßig Luna-basierte Bulk-Auswertung noch nicht bewerteter ausgewählter Dashboard-Nachrichten mit Wichtigkeit, Spam-Wahrscheinlichkeit und Risikowert von 0–100 %, dauerhaften Score-Filtern, Score-Sortierungen und ausdrücklicher Neu-Bewertung
- lokale, begrenzte Spam-Vorprüfung mit Absenderhäufigkeit der letzten 30/90 Tage und insgesamt sowie strukturellen Newsletter-/Massenversand-Signalen
- leicht korrigierbare Scores mit separatem, löschunabhängigem Lernarchiv, getrennten Gründen für Wichtigkeit, Spam und Risiko sowie manueller Referenzverwaltung unter **Einstellungen**
- direkte Dashboard-Aktionen für die bestehende Zusammenfassung, den interaktiven Antworteditor und den nachrichtenbezogenen AI Chat
- dieselben farbcodierten AI- und E-Mail-Aktionsgruppen in der Einzelmail-Ansicht: Zusammenfassen, Antwort, Chat, Werte korrigieren, als gelesen markieren, PDF-Export, Archivieren und Löschen
- sichere Antwortübergabe mit bevorzugter Thunderbird-Identität: eine exakt unter An/CC/BCC gefundene eigene Adresse hat Vorrang, andernfalls wird die Standardidentität des ursprünglichen Kontos verwendet
- optionale Übergabe einer einzelnen Dashboard-Mail an Thunderbird PDF Archiver; fehlt eine kompatible Installation, führt ein lokalisierter Dialog zur offiziellen GitHub-Seite
- klar getrennte AI-Aktionen, Leseoptionen und E-Mail-Aktionen mit Icons; Leseoptionen öffnen die Originalmail in einem neuen Thunderbird-Tab, blenden bei ausgeschalteter globaler Vorschau nur den angeklickten Inhalt ein oder markieren die Mail als gelesen
- noch nicht bewertete Einzelmails lassen sich direkt in ihrer AI-Aktionsspalte über denselben geschützten Scoring-Ablauf wie die Bulk-Auswertung analysieren; danach ersetzt **Werte korrigieren** diese Schaltfläche, während das Kontextmenü zusätzlich eine bestätigte Neu-Analyse anbietet
- jede sichtbare Einzelvorschau lässt sich unabhängig in Vier-Zeilen-Schritten bis 20 Zeilen vergrößern, direkt auf ihre Ausgangshöhe zurücksetzen, schließen oder über das Vollbildsymbol als Originalmail in einem neuen Tab öffnen
- dieselben Einzelmail-Aktionen über ein Rechtsklick-Kontextmenü auf der gesamten Dashboard-Zeile; direkt sichtbare Gruppenüberschriften sind Standard, gruppierte Untermenüs lassen sich im Kontextmenü dauerhaft auswählen
- vollständig deutsch- oder englischsprachige Oberfläche mit expliziter Sprachauswahl
- getrennt wählbarer Start des globalen Dashboards und der Einzelmail-Ansicht als kompaktes Overlay oder dauerhafter Thunderbird-Tab; die Einzelmail-Ansicht besitzt zusätzlich eine Vollbild-Schaltfläche
- gemeinsamer schwebender „Nach oben“-Button in Dashboard und Einzelmail-Ansicht, sobald die jeweilige Ansicht nach unten gescrollt wurde
- wecksichere Toolbar-Steuerung ohne statische Popup-Rückfallebene: jeder Klick aktiviert zuerst den Hintergrundprozess und liest danach die dauerhaft gespeicherte Öffnungseinstellung
- automatische Bereinigung alter Dashboard-Tabs beim ersten Öffnen nach Installation oder Update, damit kein von Thunderbird wiederhergestelltes Fallback-Dokument fokussiert wird
- kopierbare, inhaltsfreie Support-Diagnose mit Dashboard-Start und den letzten Hintergrund-/UI-Aktionsgrenzen; ein Vorgang ohne Abschluss zeigt die wahrscheinliche Blockadestelle
- native Windows- und macOS-Installer mit kontrolliertem Thunderbird-Neustart

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

1. `Thunderbird-AI-Setup-3.0.0-win-x64.exe` herunterladen und starten.
2. Im Setup **Deutsch** oder **English** wählen und die GNU General Public License bestätigen. Diese Auswahl wird beim ersten Start als Sprache der Erweiterung übernommen.
3. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung und zu den Berechtigungen zum Ändern, Verschieben und Löschen von Nachrichten bestätigen.
5. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, die aufgabenspezifischen Modelle prüfen, die Verbindung testen und speichern. Die Oberflächensprache kann dort jederzeit unabhängig von der Thunderbird-Sprache geändert werden.

Der benutzerbezogene Installer benötigt keine Administratorrechte. Eine neue Setup-Datei aktualisiert die vorhandene Version; eine Deinstallation ist nicht nötig. Die feste Add-on-ID erhält die Einstellungen. Der aktuelle Test-Installer ist nicht Authenticode-signiert und kann deshalb eine SmartScreen-Warnung auslösen.

Version 1.5.1 korrigiert die in 1.3.0 bis 1.5.0 fehlerhaft gepackten Lokalisierungsordner. Diese älteren Installer sollten nicht mehr verteilt werden.

## Installation unter macOS

1. Thunderbird mindestens einmal starten, damit ein Profil angelegt ist.
2. `Thunderbird-AI-Setup-3.0.0-macos.pkg` öffnen.
3. Die GNU General Public License bestätigen, offene Thunderbird-Entwürfe speichern und die Installation fortsetzen. Das macOS-Installationsprogramm fordert Thunderbird zum normalen Beenden auf und beendet es niemals erzwungen.
4. Nach erfolgreicher Installation öffnet das Setup Thunderbird automatisch. Eine mögliche einmalige Rückfrage zur Aktivierung und zu den Berechtigungen zum Ändern, Verschieben und Löschen von Nachrichten bestätigen.
5. Unter **Einstellungen** den OpenAI API-Schlüssel eintragen, die aufgabenspezifischen Modelle prüfen, die Verbindung testen und speichern.

Der macOS-Installer installiert das Add-on ohne Administratorrechte für den aktuellen Benutzer in alle vorhandenen Thunderbird-Profile. Eine erneute Ausführung aktualisiert die vorhandene Installation; Einstellungen bleiben durch die feste Add-on-ID erhalten. Die anfängliche Oberflächensprache folgt automatisch Thunderbird und kann jederzeit in den Add-on-Einstellungen geändert werden. Das aktuelle Testpaket ist noch nicht mit einer Developer-ID signiert oder notarisiert; vor einer öffentlichen Veröffentlichung sind Signatur, Notarisierung und eine veröffentlichte SHA-256-Prüfsumme erforderlich.

Version 3.0.0 verwendet die dauerhafte Veröffentlichungs-ID `thunderbird-ai@felicitas-wisdom.com`. Die privaten Vorabversionen mit `thunderbird-ai@example.com` werden beim nativen Setup entfernt. Bei einer manuellen XPI-Installation muss die Vorabversion einmalig selbst deinstalliert werden.

Wird ein bereits geöffneter Dashboard-Tab nach einer Installation wiederhergestellt, lädt ihn Version 3.0.0 einmal gezielt als frisches Erweiterungsdokument. Falls kurz nach der Installation trotzdem keine ungelesenen E-Mails erscheinen, zeigt das Dashboard zusätzlich den sicheren Wiederherstellungsweg: Tab schließen und über die Thunderbird-AI-Schaltfläche neu öffnen.

## Entwicklung und Tests

Voraussetzungen: Node.js 20+, unter Windows PowerShell 5.1+ und Inno Setup 6 sowie unter macOS die Apple-Werkzeuge `pkgbuild` und `productbuild`.

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
- `artifacts\Thunderbird-AI-Setup-3.0.0-win-x64.exe`
- `artifacts/Thunderbird-AI-Setup-3.0.0-macos.pkg`

Unter macOS werden XPI und Installer vom Repository-Stamm aus gebaut und isoliert geprüft:

```bash
./build-addon.sh
./installer/macos/build-setup.sh
./installer/macos/test-setup.sh
```

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
15a. An einer Nachricht **AI Chat** anklicken. Derselbe nachrichtenbezogene Chat wie in der Einzelmail-Ansicht muss in einem eigenen Tab erscheinen. Ein weiterer Klick für dieselbe Nachricht und denselben AI-Modus muss den vorhandenen Workspace fokussieren, sofern Thunderbird die Tab-Erkennung unterstützt.
16. Bei einer entbehrlichen Testnachricht die direkte Schaltfläche **Löschen** anklicken. Der eingebettete Dialog muss den Inhalt deutlich abdunkeln und einen großen roten Papierkorb-Button sowie einen kleineren grauen Abbrechen-Button mit X-Symbol zeigen. Zunächst abbrechen, danach bestätigen; nur diese Nachricht darf aus der Übersicht verschwinden. Anschließend muss ein prominenter Ergebnisdialog Erfolg oder Fehler zusammen mit der technischen Löschdiagnose anzeigen. Wird das Toolbar-Popup vorher geschlossen, muss dieses noch nicht quittierte Ergebnis beim nächsten Öffnen erneut erscheinen. Ab Thunderbird 137 muss der Hintergrundprozess den Vorgang als rückgängig machbare Benutzeraktion an Thunderbird übergeben.
17. Mehrere entbehrliche Testnachrichten auswählen, **Ausgewählte löschen** anklicken und bestätigen. Nur die ausgewählten Nachrichten dürfen verschwinden. Thunderbird verwendet dabei die Lösch- und Papierkorb-Einstellungen des jeweiligen Kontos. Eine Erfolgsmeldung darf erst erscheinen, nachdem bis zu drei kurz verzögerte Aktualisierungen der ungelesenen Übersicht die Nachrichten nicht mehr enthalten. Erfolg, Fehler und technische Löschdiagnose dürfen nur im prominenten Ergebnisdialog erscheinen und den normalen Dashboard-Status nicht dauerhaft ersetzen. Für zusätzliche Hintergrundprotokolle: **Add-ons und Themes → Zahnrad → Add-ons debuggen → Thunderbird AI Assistant → Untersuchen** öffnen und im Drei-Punkte-Menü **Log nicht leeren** aktivieren. Die Einträge `Submitting dashboard delete request` und die anschließende Abschluss- oder Fehlermeldung enthalten Version, Aufrufmodus und Anzahlen, aber keine E-Mail-Inhalte oder internen Nachrichtenkennungen.
18. Eine E-Mail öffnen und den nachrichtenbezogenen **AI Assistant**-Button anklicken. Statt des Dashboards muss die Einzelmail-Oberfläche mit getrennten Spalten **AI-Aktionen** und **E-Mail-Aktionen** erscheinen. Die E-Mail-Aktionen müssen dieselben Farben und Funktionen wie das Dashboard verwenden: grün für **Als gelesen markieren**, grau für **Als PDF exportieren** und **Archivieren**, rot für **Löschen**. **Werte korrigieren** muss violett dargestellt werden.
19. Eine reine Text-E-Mail und eine HTML-E-Mail öffnen und jeweils **Zusammenfassen** ausführen.
20. **Antwort vorschlagen** ausführen; ein eigener Thunderbird-Tab muss den ersten, direkt bearbeitbaren Entwurf anzeigen. Bei langem Inhalt muss nur der mittlere Arbeitsbereich scrollen, während **Antwort kopieren** und **In Thunderbird vorbereiten** dauerhaft sichtbar bleiben.
21. Einen Änderungswunsch eingeben und **Entwurf verbessern** anklicken. Der bisherige Chat muss sichtbar bleiben und der aktuelle Entwurf aktualisiert werden.
22. Die drei Antwortoptionen in ihren Standardwerten prüfen: Originalnachricht und **Allen antworten** aktiviert, ursprüngliche Anhänge deaktiviert.
23. Den Entwurf zusätzlich von Hand ändern und **In Thunderbird vorbereiten** anklicken. Der neue Antwortentwurf muss an alle Teilnehmer adressiert sein, den AI-Text vor dem nativen Thunderbird-Zitat enthalten und keine ursprünglichen Anhänge besitzen. Als Absenderidentität muss möglichst die konfigurierte eigene Adresse gewählt sein, an welche die Ursprungsmail adressiert war; ohne exakte Empfängerübereinstimmung muss die Standardidentität des Ursprungskontos verwendet werden.
24. Den Antworteditor erneut öffnen, alle drei Optionen umschalten und wieder vorbereiten. Der Entwurf muss nur an den Absender gehen, kein Originalzitat enthalten und alle ursprünglichen Anhänge besitzen. Beim nächsten Öffnen müssen diese Werte vorausgewählt bleiben.
25. Bei einem Compose-Fehler muss der aktuelle Text stattdessen in die Zwischenablage kopiert werden.
26. **Werte korrigieren** ausführen. Das Einzelmail-Popup darf keine schnellen Schaltflächen für **Kategorisieren**, **Wichtigkeit prüfen** oder **API testen** mehr zeigen. Terra muss standardmäßig neue Wichtigkeits-, Spam- und Risikowerte liefern. Alle drei Werte ändern, getrennte Gründe auswählen, je einen Freitext eingeben und die Referenz speichern. Beim erneuten Scoring derselben E-Mail müssen die archivierten Werte und Gründe vorausgewählt und für die neue Bewertung berücksichtigt werden.
27. **Ähnliche finden** prüfen; diese Aktion benötigt keinen OpenAI-Aufruf.
28. Beide **AI Chat**-Schaltflächen testen, Ergebnisse kopieren und lokal speichern.
29. Unter **Einstellungen** die Modellauswahl für Bulk, Einzelmail-Scoring, Zusammenfassen, Antwortvorschlag, AI Chat und jede weitere AI-Funktion prüfen. Jede Bezeichnung und das zugehörige Auswahlfeld müssen unmittelbar zusammen in einer eigenen klar abgegrenzten Karte stehen. Standardmäßig müssen Luna, Terra beziehungsweise Sol wie im Abschnitt **OpenAI-Modelle** ausgewählt sein; jede Auswahl muss sich unabhängig ändern und speichern lassen.
30. Im **Archiv der Scoring-Referenzen** die gespeicherte Testmail öffnen, alle drei Werte und getrennten Gründe prüfen, manuell neu bewerten und speichern. Eine vor Version 2.6.0 gespeicherte Referenz muss mit leerem Risikofeld lesbar bleiben und sich nach Eingabe des Risikowerts speichern lassen. Danach die Referenz entfernen; die Thunderbird-E-Mail darf dabei nicht gelöscht oder verändert werden.
31. Die Oberflächensprache auf **English** umstellen und globales Dashboard, Einzelmail-Popup, Antworteditor, Einstellungen und Hilfe prüfen. Danach zurück auf **Deutsch** wechseln. Alle sichtbaren Texte und Meldungen müssen der Auswahl folgen.
32. In den **Einstellungen** darf kein Abschnitt für automatische E-Mail-Verarbeitung mehr erscheinen. Einen erfolgreichen API-Test oder eine andere AI-Aktion ausführen und anschließend die Nutzungsstatistiken aktualisieren. **Geschätzte API-Kosten** müssen als lokalisierter USD-Wert erscheinen und der Hinweis muss Beginn der Tokenaufzeichnung, Preisstand sowie Einschränkungen nennen.
33. Den API-Verbindungstest nur einmal anklicken. Bei einem kurzzeitigen Verbindungsproblem muss die Oberfläche im Ladezustand bleiben, während das Add-on selbstständig erneut versucht. Erst nach allen erfolglosen Versuchen darf eine konkrete Netzwerk-, Zeitlimit-, Rate-Limit-, Server-, Schlüssel- oder Guthabenmeldung erscheinen.
34. Eine Scoring-Korrektur nur einmal speichern. Ein kurzzeitiger Thunderbird- oder lokaler Speicherfehler muss intern erneut versucht werden; die Referenz darf höchstens einmal unter ihrer stabilen Nachrichtenidentität im Archiv erscheinen.
35. Im Dashboard mehrere Nachrichten auswählen und oben rechts das Vollbildsymbol verwenden. Das Dashboard muss sich als eigener Thunderbird-Tab öffnen, die Auswahl sowie Filter- und Ansichtseinstellungen übernehmen und geöffnet bleiben, bis der Tab geschlossen wird. Die Bulk-Aktionen bleiben in zwei Gruppen; pro Nachricht müssen **AI-Aktionen**, **Leseoptionen** und **E-Mail-Aktionen** in drei klar beschrifteten Spalten mit Icons erscheinen. Bei einer noch nicht bewerteten Nachricht **Mit AI analysieren** verwenden: Nur diese E-Mail muss über den Bulk-Scoring-Ablauf bewertet werden; danach muss die Schaltfläche durch **Werte korrigieren** ersetzt werden. Das Rechtsklick-Kontextmenü derselben bewerteten Nachricht muss zusätzlich **Erneut mit AI analysieren** anbieten und vor dem Ersetzen sichtbarer Werte eine Bestätigung verlangen. Bei ausgeschalteter globaler Vorschau an genau einer Nachricht **Inhaltsvorschau anzeigen** verwenden: Nur diese Nachricht darf ihren lokalen Inhalt laden und die Schaltfläche muss danach für sie verschwinden. In der Vorschau zweimal **+** verwenden und prüfen, dass nur diese E-Mail jeweils vier weitere sichtbare Zeilen erhält; **−** muss direkt auf die Ausgangshöhe zurückkehren. Das kleine Vollbildsymbol muss die Originalmail in einem aktiven Thunderbird-Nachrichtentab anzeigen. **×** muss nur diese Vorschau schließen und die Aktion **Inhaltsvorschau anzeigen** wieder verfügbar machen. Anschließend die gesamte Nachrichtenzeile rechtsklicken und dieselben Aktionen zunächst direkt unter drei Gruppenüberschriften prüfen. Unter **Darstellung des Kontextmenüs** auf **Gruppierte Untermenüs** wechseln, das Menü erneut öffnen und die drei Untermenüs per Hover, Klick und Tastatur prüfen; danach wieder **Titel mit direkten Aktionen** auswählen. Eine einzelne Nachricht über **Als gelesen markieren** bearbeiten; sie muss ohne Rückfrage aus der ungelesenen Ansicht verschwinden. Danach mehrere Nachrichten auswählen und **Ausgewählte als gelesen markieren** verwenden. Erfolgreich geänderte Nachrichten müssen verschwinden, während mögliche Einzelfehler gemeldet werden, ohne die übrigen Änderungen zurückzunehmen.
36. In Thunderbird unter **Konten-Einstellungen → Kopien & Ordner → Nachrichtenarchiv** für die Testkonten jährliche Archivordner konfigurieren. Eine Nachricht aus einem früheren Jahr direkt über **Archivieren** verschieben und prüfen, dass Thunderbird sie im kontobezogenen Ordner `Archiv/<Sendejahr>` ablegt. Danach Nachrichten unterschiedlicher Jahre und Konten auswählen und **Ausgewählte archivieren** verwenden; jede Nachricht muss gemäß ihrer Konto- und Identitätseinstellungen im passenden Jahresarchiv landen und aus dem ungelesenen Dashboard verschwinden.
37. Unter **Einstellungen → Thunderbird-Archivierung** auf **Archivordner prüfen** klicken. Ein von Thunderbird als Archiv gekennzeichneter Testordner muss mit Pfad, vorhandenen direkten Jahresordnern und Unterordner-Fähigkeit erscheinen. Ein lediglich gleich benannter, aber nicht als Archiv gekennzeichneter Ordner darf nicht fälschlich erkannt werden. Über **Thunderbird-Hilfe öffnen** muss die offizielle Anleitung im Standardbrowser erscheinen. Anschließend die nicht per Add-on auslesbare Auswahl **Jährliche archivierte Ordner** einmal manuell über den angezeigten Menüpfad kontrollieren.
38. Für einen klaren Newsletter mit List-Unsubscribe/List-ID oder sichtbarer Abmeldemöglichkeit **Werte korrigieren** ausführen. Der Spam-Wert darf nicht mehr im einstelligen Bereich bleiben und muss mindestens die lokale Untergrenze erreichen. Anschließend mehrere Newsletter desselben Absenders in der Bulk-Auswertung prüfen; eine höhere Absenderhäufigkeit muss die lokale Vorprüfung erhöhen. Eine häufige, aber ausdrücklich als erwünscht korrigierte Systemmail desselben Absenders erneut bewerten; die gespeicherte Absenderkorrektur muss Vorrang behalten.
39. Unter **Einstellungen → AI Assistant öffnen** die Modi für **Globale Posteingangsübersicht** und **Assistant für eine geöffnete E-Mail** unabhängig ändern und speichern. Für das Dashboard zunächst **Als kompaktes Overlay öffnen** speichern und fünfmal das globale Toolbar-Symbol verwenden. Beim fünften tatsächlichen Öffnen muss ein lokalisierter Hinweis mit **Später**, **Jetzt ausprobieren** und **Diesen Hinweis nicht mehr anzeigen** erscheinen. **Später** muss einen neuen Fünfer-Zyklus beginnen; **Jetzt ausprobieren** muss den dauerhaften Tab öffnen, ohne den Standard zu ändern. Anschließend dreimal das Vollbildsymbol im Overlay verwenden. Beim dritten Mal muss der geöffnete Tab anbieten, künftig immer direkt im Tab zu starten. **Immer im Tab öffnen** auswählen und prüfen, dass weitere Toolbar-Klicks ohne vorgeschaltetes Overlay direkt den vorhandenen Thunderbird-Tab fokussieren. Danach das Dashboard wieder auf Overlay stellen, die Einzelmail-Ansicht auf Tab stellen und eine geöffnete E-Mail über die Nachrichten-Toolbar aufrufen; sie muss direkt in einem eigenen Tab erscheinen. Einzelmail danach auf Overlay stellen, erneut öffnen und dort das Vollbildsymbol verwenden. Bei aktivierter Option **Diesen Hinweis nicht mehr anzeigen** darf der jeweilige Dashboard-Hinweis auch nach weiteren Öffnungen nicht zurückkehren.
40. An einer Dashboard-Mail **Als PDF exportieren** anklicken. Mit installiertem Thunderbird PDF Archiver 0.5.0 oder neuer muss dessen vorhandener Prüfdialog exakt diese E-Mail und ihre Anhänge laden; der AI Assistant erzeugt selbst keine PDF. Danach PDF Archiver testweise deaktivieren und die Aktion erneut ausführen. Nun muss ein lokalisierter Installationsdialog erscheinen, dessen GitHub-Schaltfläche die offizielle Projektseite in einem Thunderbird-Tab öffnet. Eine inkompatible Protokollversion muss denselben sicheren Aktualisierungspfad mit einem spezifischen Hinweis verwenden.
41. Das Dashboard als eigenen Tab öffnen und anschließend das Add-on aktualisieren, ohne diesen Tab vorher manuell zu schließen. Beim ersten Dashboard-Start nach dem Update müssen alle alten AI-Dashboard-Tabs geschlossen und genau ein frischer Tab geöffnet werden; normale Mail-, Kalender-, Einstellungen- und Verfassen-Tabs müssen unverändert bleiben. Danach das globale Toolbar-Symbol sowie das Vollbildsymbol erneut und rasch mehrfach verwenden. Der vorhandene frische Dashboard-Tab und sein Thunderbird-Fenster müssen fokussiert werden; es darf nur ein neuer Tab entstehen, falls der vorhandene Tab währenddessen geschlossen wurde oder Thunderbird die Erkennung nicht unterstützt. Im Einzelmail-Popup müssen die AI-Aktionen dieselbe blaue/violette Hierarchie wie das Dashboard verwenden. **Posteingangsübersicht** muss denselben vorhandenen Dashboard-Tab fokussieren. Die dauerhaft eingeblendete **Löschdiagnose** und ein zusätzliches Löschresultat im Dashboard-Status dürfen nicht erscheinen; technische Details bleiben im Ergebnisdialog einer Löschaktion verfügbar.
42. Nach mehreren Dashboard-Aktionen den Tab wechseln und das globale Toolbar-Symbol mindestens dreimal erneut verwenden. Ein hängender Thunderbird-Tabaufruf muss nach einem begrenzten Zeitlimit freigegeben werden, sodass der nächste Klick ohne Thunderbird-Neustart erneut versucht. Bei einem endgültigen Fehler muss eine lokalisierte Benachrichtigung mit Diagnosecode erscheinen. Unter **Einstellungen → AI Assistant öffnen → Support-Diagnose** müssen Add-on-/Thunderbird-Version, letzter Dashboard-Start und die letzten Hintergrund-/UI-Aktivitäten ohne E-Mail-Inhalte sichtbar und kopierbar sein. Ein absichtlich provozierter Fehler muss als fehlgeschlagener oder kontrolliert fehlgeschlagener Vorgang erscheinen.
43. Im Dashboard mehrere Nachrichten auswählen und bis unter die letzte angezeigte Nachricht scrollen. Dort muss dieselbe Bulk-Aktionsleiste wie oberhalb der Nachrichten erscheinen; Auswahlzahl, Aktivierungszustand und Aktionen müssen in beiden Leisten synchron bleiben. Danach Dashboard und Einzelmail-Ansicht nach unten scrollen: Rechts unten muss jeweils ein kleiner runder Pfeil erscheinen, der die sichtbare Scrollfläche nach oben bewegt und am Anfang wieder verschwindet.

Im Einzelmail-Popup wird die aktive Add-on-Version unter dem Betreff angezeigt. Nach einem Update muss dort **Version 3.0.0** stehen. Das Dashboard verwendet den Ungelesen-Status als Kandidatenfilter. Für die im Dashboard ausgewerteten Nachrichten bleiben die AI-Scores lokal gespeichert und erlauben den Filter **Nur nicht analysierte**; Nachrichten, die außerhalb des Dashboards analysiert wurden, erhalten dadurch jedoch keine Dashboard-Markierung.

Die Einstellungen enthalten eine **Support- und Speicherdiagnose**. Sie zeigt Hintergrundstart, Abhängigkeitsstatus, Laufzeiten und eine inhaltsfreie Prüfung lokaler Einstellungsdaten. API-Schlüssel werden ausschließlich als „vorhanden/nicht vorhanden“ gemeldet. Kann der Hintergrunddienst nicht starten, werden vorhandene Einstellungen lokal und schreibgeschützt dargestellt; Speichern und Zurücksetzen bleiben bis zu einem erfolgreichen Start deaktiviert.

## Technische Struktur

- `thunderbird-ai/`: Manifest, getrennte globale und nachrichtenbezogene Seiten, Styles und UI-Komponenten
- `common/`: Hintergrundskript sowie Storage-, Nachrichten- und OpenAI-Dienste
- `tests/`: Node-basierte Unit- und Workflow-Tests ohne zusätzliche Laufzeitabhängigkeiten
- `installer/windows/`: Inno-Setup-Build und Isolationstest
- `installer/macos/`: nativer macOS-Paketbuild, lokalisierte Installer-Texte und Isolationstest

Das Add-on verwendet globale Skripte statt ES-Modulen, da sie in der im Manifest festgelegten Reihenfolge geladen werden.

## Lizenz und Beiträge

Thunderbird AI Assistant ist freie Open-Source-Software unter der [GNU General Public License Version 3 oder neuer](LICENSE). Forks und Änderungen sind ausdrücklich erlaubt; Beiträge als [Pull Request](CONTRIBUTING.md) sind besonders willkommen. Für Sicherheitsmeldungen gilt die [Security Policy](SECURITY.md). Die für eine Veröffentlichung relevante Datenverarbeitung beschreibt die [Privacy Policy](PRIVACY.md).
