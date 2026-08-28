# AI Mail Assistant for Thunderbird – Code-Struktur

> [English version](STRUCTURE.md)

## Verzeichnisstruktur

```text
thunderbird-ai/
├── manifest.json
├── background.js
├── components/
├── config/
├── utils/
├── html/
├── css/
└── js/
```

Der Build flacht diesen Baum zusammen mit `common/` ab. Deshalb verwenden alle
Skripte eindeutige Dateinamen und globale Bindungen statt ES-Modulimporten.

## Aktuelle Dashboard-Grenzen

- `GlobalDashboardManager.js` koordiniert Aktualisierung, Auswahl und
  Mailbox-Aktionen; `DashboardAnalysisController.js` vereinheitlicht Erst- und
  Neu-Scoring.
- `GlobalMailService.js` besitzt begrenzte Posteingangs-Header-Paginierung,
  standardmäßig nur für ungelesene und sitzungsgebunden optional auch für
  gelesene Nachrichten, Vorschauen, native Archivierung und Lesestatus.
  Löschungen laufen über den persistenten Hintergrund und werden gegen neue
  Snapshots des gewählten Bestands bestätigt.
- `GlobalMailViewService.js` wendet Absender-, Datums- und AI-Filter,
  Kontogrenzen, Neueste-50-Auswahl und globale Score-Sortierung vor Vorschauen an.
- `DashboardViewPreferences.js` speichert Ansicht und Kontextmenü-Stil getrennt
  von sitzungsgebundenen Filtern, einschließlich der Option für gelesene
  Nachrichten, und der Sitzungs-Auswahl. `LaunchModeService.js` trennt
  Overlay-/Tab-Vorgaben und räumt temporäre Popups nach jedem Klick auf.
- `DashboardLaunchService.js` fokussiert vorhandene Tabs, begrenzt alle
  Thunderbird-Tab-/Fensteraufrufe und speichert nur inhaltsfreie Diagnosen.
- `SingleMailWorkspaceService.js` vereinheitlicht Nachrichten-Toolbar,
  Vollbild, Dashboard-Aktionen, Antwort und Chat je Nachricht/Modus.
- `PdfArchiverIntegrationService.js` besitzt ausschließlich die versionierte
  Übergabe an die feste PDF-Archiver-ID; PDF-Daten bleiben im Begleit-Add-on.
- Nachrichten-, Kontextmenü-, Vorschau-, Bulk- und Nach-oben-Komponenten besitzen
  jeweils nur ihre UI-Grenze und teilen eine einzige Aktionsbeschreibung.
- `SafeDom.js` baut dynamische Einstellungen und Einzelmail-UI aus ausdrücklichen
  DOM-Knoten auf; übersetzte Beschriftungen und Laufzeit-Metadaten werden als
  reiner Text statt als HTML eingefügt. `MarkdownRenderer.js`,
  `MarkdownInlineRenderer.js` und `markdown-content.css` formatieren nicht
  vertrauenswürdige AI-Ausgaben in Aktionsergebnissen, Chat, Antwortverlauf und
  gespeicherten Ergebnissen ohne rohes HTML, ausführbare Links oder externe
  Bildabrufe. Bearbeitbare Entwürfe und Nutzernachrichten bleiben reiner Text.
- `ScoreFeedbackEditor.js`, `dashboard-training.js` und
  `ScoringArchiveComponent.js` besitzen getrennte Score-Begründungen und das
  löschunabhängige Korrekturarchiv.
- `spam-precheck.js` berechnet nur begrenzte lokale Absenderaggregate und sichere
  Newsletter-Signalnamen.
- `ai-provider.js` formatiert OpenAI Responses, Anthropic Messages und kompatible
  Chat Completions; der aufgabenorientierte Client behält den historischen
  globalen Namen `OpenAIService`.
- `retry.js` besitzt Backoff und Promise-Zeitlimits; Domänendienste entscheiden,
  ob eine Wiederholung sicher ist.

## Kernmodule

### Konfiguration

`config/constants.js` bündelt Version, Aktionen, Anbieter, Modellrollen,
Speicherschlüssel und Grenzen und steht global als `CONFIG` bereit.

### Dienste

- `storage.js`: strikte Reads, Migration von Anbieterprofilen, Statistik und
  datierte OpenAI-Kostenschätzung.
- `retry.js`: begrenzte Wiederholung und Laufzeit-Zeitlimits.
- `ai-provider.js`: Anbieter-Normalisierung, Endpunktvalidierung, Request- und
  Response-Adapter.
- `openai.js`: anbieterneutrale Aufgaben, Prompts und Fehlerklassifikation.
- `message.js`: Nachrichtenzugriff, MIME-Normalisierung und Anhänge.
- `spam-precheck.js`: Absenderhäufigkeit und strukturelle Spam-Signale.
- `ui.js`: gemeinsame Darstellung, Ladezustände und Dialoge.

### Komponenten und Einstiegspunkte

Komponenten besitzen ihre UI und Ereignisse. Dateien unter `js/` bleiben kleine
Einstiegspunkte, welche globale Komponenten initialisieren. Der Hintergrund
registriert Listener, routet Nachrichten, verwaltet Menüs und Benachrichtigungen
und delegiert Domänenarbeit an Dienste.

## Datenfluss

```text
Benutzeraktion → Komponente → Hintergrund → Dienst → API/Speicher → Antwort → UI
```

Bei einer Zusammenfassung lädt `MessageService` die normalisierte Mail, der
anbieterneutrale Task-Client ruft den gewählten Anbieter auf, `StorageManager`
aktualisiert die Statistik und die Komponente stellt das Ergebnis dar.

## Entwicklungsregeln

1. Neue UI in einer fokussierten Komponente ergänzen.
2. Gemeinsame Logik dem passenden Dienst zuordnen.
3. Konfiguration und Lokalisierung zentral aktualisieren.
4. Einen kleinen Einstiegspunkt und die erforderlichen Styles ergänzen.
5. Fehler an der zuständigen Grenze mit lokalisierten Benutzerhinweisen und
   inhaltsfreien technischen Diagnosen behandeln.
6. Geänderte Dienste, Bindungen, Skriptreihenfolge und Workflows testen.

## Globale Skriptreihenfolge

```html
<script src="constants.js"></script>
<script src="retry.js"></script>
<script src="storage.js"></script>
<script src="openai.js"></script>
<script src="message.js"></script>
<script src="ui.js"></script>
<script src="MessageDisplayComponent.js"></script>
<script src="message-display.js"></script>
```

Komponenten heißen `ComponentNameComponent.js`, Einstiegspunkte `entryName.js`,
Dienste `utilityName.js` und Konfigurationen `configName.js`. Diese Grenzen
erhalten Thunderbird-Kompatibilität, Testbarkeit und eine konfliktfreie XPI.
