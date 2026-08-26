# Manueller Abnahmetest

> [English version](manual-testing.md)

Für Installer- und Löschtests nur entbehrliche Nachrichten verwenden und offene
Entwürfe vorher speichern. Die automatisierte Suite bleibt die erste
Prüfebene; diese Liste deckt Thunderbird-Verhalten ab, das Mocks nicht belegen.

## Dashboard-Laden und Ansichten

1. Das globale Dashboard öffnen und prüfen, dass der Ladezustand mit den
   unterstützten Konten, neuesten ungelesenen Nachrichten zuerst und einem
   gruppierten Ansichtsbereich endet, dessen Zustand erhalten bleibt.
2. Zwischen Kontoansicht und kombinierter Neueste-50-Ansicht wechseln. Globale
   Kandidatengrenze, Herkunftskonten und Auswahl müssen korrekt bleiben.
3. Alle Datums-, Beteiligten-, Absender-, Mengen-, Score- und Analysestatus-
   Filter sowie Sortierungen einschließlich kontenübergreifender Scores testen.
4. Die Absendersuche muss nicht sichtbare Auswahlen behalten; **Alle** darf nur
   sichtbare Treffer aus- oder abwählen. Datumsgrenzen sind einschließlich.
5. Lokale Vorschauen aktivieren, die globale Zeilenzahl ändern und prüfen, dass
   nur der sichtbare begrenzte Nachrichtenausschnitt Inhalte lädt.

## Auswahl, Bulk-Analyse und Korrekturen

6. Einzelauswahl und **Alle auswählen** prüfen; obere und untere Bulk-Leiste
   müssen synchron bleiben.
7. Eine gemischte Auswahl analysieren. Nur unanalysierte Nachrichten erhalten
   Scores; normale Analyse überspringt vorhandene Werte. Neu-Analyse verlangt
   Bestätigung und darf Korrekturreferenzen nicht löschen.
8. Wichtigkeit, Spam und Risiko mit getrennten Gründen und Notizen korrigieren.
   Eine Änderung ist Pflicht; Filter müssen sofort reagieren und Werte nach dem
   erneuten Öffnen erhalten bleiben.
9. Die korrigierte Quellnachricht löschen und prüfen, dass ihr separates
   Lernarchiv unter Einstellungen erhalten und verwaltbar bleibt.

## Einzelmail-Aktionen

10. Vom Dashboard Zusammenfassung, Antwortvorschlag, AI Chat und Einzelanalyse
    öffnen. Gleiche Workspaces derselben Nachricht und desselben Modus sollen
    nach Möglichkeit den vorhandenen Tab fokussieren.
11. Drei Aktionsspalten und identische Rechtsklick-Aktionen prüfen: AI-Aktionen,
    Leseoptionen und E-Mail-Aktionen. Direkte Titelgruppen und Untermenüs müssen
    per Hover, Klick und Tastatur benutzbar bleiben.
12. Bei global ausgeschalteter Vorschau nur eine Mail laden. `+` ergänzt vier
    sichtbare Zeilen bis 20, `−` setzt zurück, das Vollbildsymbol öffnet die
    Originalmail im Tab und `×` entfernt nur diese Vorschau.
13. Eine und mehrere Nachrichten als gelesen markieren. Erfolge verschwinden
    aus der Ansicht; Einzelfehler dürfen andere Erfolge nicht zurücknehmen.

## Antwortablauf

14. Zusammenfassungen für Text- und HTML-Mails testen.
15. Einen Antwortentwurf erzeugen; nur der mittlere Editor darf scrollen. Einmal
    überarbeiten, zusätzlich manuell ändern sowie Kopieren und native Übergabe
    testen.
16. **Allen antworten**, Originalzitat und Anhänge samt gespeicherten Vorgaben,
    sicherem HTML-Escaping und Identitätswahl über exakte Empfänger vor dem
    Standardkonto prüfen.
17. Einen Compose-Fehler provozieren; der aktuelle Entwurf muss sichtbar bleiben
    und in die Zwischenablage kopiert werden.

## Löschen, Archivieren und PDF-Export

18. Einzel- und Mehrfachlöschen zunächst abbrechen und danach mit entbehrlichen
    Mails bestätigen. Erfolg erst nach nachgewiesener Entfernung anzeigen;
    Diagnosen enthalten keine Mail-Inhalte oder internen IDs.
19. Jährliche Thunderbird-Archive konfigurieren und Mails verschiedener Jahre
    und Konten prüfen. Konto- und Identitätseinstellungen bestimmen jedes Ziel.
20. **Archivordner prüfen** darf nur von Thunderbird gekennzeichnete Archive
    anzeigen. Die Hilfe öffnet die offizielle Anleitung ohne Änderungen.
21. Mit aktivem PDF Archiver eine Dashboard-Mail exportieren und genau diese im
    Prüfdialog erwarten. Fehlende oder inkompatible Installationen müssen den
    sicheren GitHub-Installations-/Aktualisierungspfad zeigen.

## Anbieter, Scoring und Robustheit

22. Den [Anbieter-Abnahmetest](api-keys/README.de.md#einheitlicher-anbietertest)
    für jeden verfügbaren Anbieter ausführen. Integrierte URLs bleiben
    schreibgeschützt; Anbieterprofile getrennt; ein individueller Host fordert
    nur seine exakte Berechtigung an. Beim ersten Öffnen der Einstellungen
    müssen Anbieter- und Thunderbird-Archivkonfiguration eingeklappt sein. Die
    Anbieterzusammenfassung zeigt den konfigurierten Anbieter oder bei
    unvollständiger Pflichtkonfiguration einen roten Warnhinweis. Für jeden
    Anbieter die API-Schlüssel-Hilfe öffnen und drei lokalisierte Schritte,
    offiziellen Zugangslink, anbieterspezifische Vollanleitung,
    Anbieterübersicht, Tastaturfokus, Schließen per Escape und modalen
    Hintergrund prüfen.
23. Newsletter-/Bulk-Signale und Absenderhäufigkeit testen; eine ausdrückliche
    Korrektur als erwünschter Absender muss die lokale Spam-Untergrenze schlagen.
24. Einen temporären Anbieterfehler auslösen. Die UI bleibt während begrenzter
    Wiederholungen im Ladezustand und meldet danach Netzwerk, Zeitlimit, Rate,
    Server, Schlüssel oder Guthaben konkret.
25. Einen kurzzeitigen lokalen Fehler beim Speichern einer Korrektur auslösen;
    die stabile Nachrichtenidentität darf höchstens einen Archiveintrag erzeugen.

## Sprache, Persistenz und Wiederherstellung

26. Zwischen Englisch und Deutsch wechseln. Dashboard, Popup, Antworteditor,
    Einstellungen, Hilfe, Fehler und Accessibility-Texte müssen der Auswahl
    auch nach Neustart folgen.
27. Nutzungsstatistiken müssen Anbieter-/Modell-Tokens und die datierte,
    begrenzte OpenAI-USD-Schätzung ohne Schlüssel anzeigen.
28. Overlay-/Tab-Vorgaben unabhängig testen, einschließlich Fünfter-Öffnung-
    Hinweis, Vollbildübernahme, Später-Zyklus, dauerhafter Ablehnung und Fokus
    eines vorhandenen Dashboard-Tabs. Beide Auswahlen zur Öffnungsart ohne den
    globalen Speichern-Knopf ändern, ein Installer-Update ausführen und danach
    prüfen, dass beide Werte ausgewählt bleiben.
29. Bei geöffnetem Dashboard-Tab aktualisieren. Der erste Start ersetzt alte
    AI-Tabs durch genau einen frischen Tab, ohne normale Thunderbird-Tabs zu
    schließen. Eine hängende Tab-Aktion muss zeitlich begrenzt sein.
30. Support-Diagnosen müssen Add-on-/Thunderbird-Versionen und begrenzte,
    inhaltsfreie Aktionsgrenzen einschließlich kontrolliertem Fehler zeigen.
    Der Supportbereich muss der letzte Einstellungsabschnitt sein und sein
    technischer Bericht anfangs eingeklappt bleiben.
31. Dashboard und Einzelmail-Ansicht scrollen. Der Nach-oben-Button erscheint
    nur unterhalb des Anfangs; beide Bulk-Leisten bleiben synchron.
32. Eine synthetische AI-Antwort mit Überschrift, Hervorhebung, verschachtelter
    Liste, Aufgabenliste, Tabelle, Zitat, Code, Weblink, rohem HTML,
    `javascript:`-Link und Markdown-Bild verwenden. Aktionsergebnisse, AI Chat,
    AI-Antwortverlauf und das gespeicherte Ergebnis müssen dieselbe gut lesbare
    Formatierung zeigen. Rohes HTML bleibt sichtbarer Text, der ausführbare Link
    ist nicht anklickbar und das Bild erscheint als Link ohne externen Abruf.
    Nutzernachrichten und der bearbeitbare Antwortentwurf behalten exakt ihren
    unveränderten Text.
33. Prüfen, dass die globale Dashboard-Aktion in der Toolbar **AI Mail
    Assistant** heißt. Die nachrichtenbezogene Aktion bleibt **AI Assistant**;
    Thunderbird zeigt in der Add-on-Verwaltung weiterhin **AI Mail Assistant
    for Thunderbird** an.
34. Hugging Face Inference Providers wie dokumentiert mit
    `openai/gpt-oss-120b:cheapest` einrichten und den API-Verbindungstest nur
    mit synthetischen Eingaben ausführen. Er muss erfolgreich sein und darf
    keinen Fehler wegen leerer Ausgabe melden.
35. AI Chat im Einzelmail-Popup öffnen. Der Chat muss einen erweiterten
    Thunderbird-Tab öffnen oder fokussieren. Nutzer- und Assistentennachrichten
    müssen entgegengesetzt ausgerichtete Sprechblasen und unterschiedliche
    Avatare haben. Enter muss senden, Umschalt+Enter einen Zeilenumbruch
    einfügen. Bis zur Markdown-formatierten Antwort muss eine Assistentenblase
    wiederholt ein bis vier Punkte anzeigen und anschließend an Ort und Stelle
    durch die Antwort ersetzt werden.
36. Bei einem offiziellen GitHub-Windows-Release für versionierten Installer
    und stabilen Alias `Get-AuthenticodeSignature` ausführen. Beide müssen
    `Valid`, den konfigurierten Herausgeber und ein Zeitstempelzertifikat melden;
    ihre SHA-256-Prüfsummen müssen gleich sein. Lokale Test-Builds bleiben
    absichtlich unsigniert.
37. Im Dashboard einen Absenderfilter, einen Datumszeitraum, einen AI-Statusfilter
    und Mindestwerte aktivieren. Unterhalb der Ergebnisstatuszeile muss eine
    Anzeige erscheinen, den Datumszeitraum als eine Filtergruppe zählen und nur
    die aktive Absenderanzahl, Datumswerte, AI-Auswertung und Mindestwerte ungleich
    null zusammenfassen. **Filter zurücksetzen** muss alle Eingrenzungen löschen,
    ohne Darstellung, Sortierung, Nachrichtenlimit, Vorschau oder
    ein-/ausgeklappte Bereiche zu verändern. Innerhalb derselben
    Thunderbird-Sitzung müssen die Filter Aktualisierungen sowie den Wechsel
    zwischen Overlay und Tab überstehen. Nach einem vollständigen
    Thunderbird-Neustart muss die Anzeige verschwinden, während diese dauerhaften
    Ansichtseinstellungen erhalten bleiben. Ohne aktive Filter muss sie ebenfalls
    ausgeblendet bleiben. Ein Update von einer älteren Version muss deren zuvor
    dauerhaft gespeicherte
    Filterwerte ignorieren und entfernen.
38. **Ansicht** einklappen und zwischen getrennter sowie kombinierter Kontenansicht
    und mehreren Sortierungen wechseln. Die Ergebnisstatuszeile muss nach den
    Anzahlen die aktuelle Ansicht nennen und die genaue lokalisierte Sortierung
    hervorgehoben anzeigen. Einen Absenderfilter anwenden, durch den weniger
    Nachrichten sichtbar sind als im ungelesenen Ausgangsbestand. Ergebnisstatus
    und Kontenüberschrift müssen dieselben sichtbaren und vollständigen Anzahlen
    vergleichen, zum Beispiel **Angezeigt: 4 von 15**.

Das Einzelmail-Popup muss Version 3.5.3 anzeigen. Das Dashboard verwendet den
Ungelesen-Status nur als Kandidatenfilter; Analysen außerhalb des Dashboards
erzeugen nicht automatisch einen Dashboard-Score.
