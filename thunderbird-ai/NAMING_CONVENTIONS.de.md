# AI Mail Assistant for Thunderbird – Namenskonventionen und Dateiunterschiede

> [English version](NAMING_CONVENTIONS.md)

## Dateiunterschiede

### Hintergrundskripte

- `common/background.js` ist der nicht-modulare, Thunderbird-kompatible
  Hintergrund mit eingebetteten oder global bereitgestellten Diensten.
- `thunderbird-ai/background.js` delegiert an globale Dienste wie `CONFIG`,
  `StorageManager`, `OpenAIService` und `MessageService` und hält die
  Hintergrundkoordination wartbar und testbar.

### Einstellungen

- `components/SettingsComponent.js` besitzt UI, Ereignisse und
  Einstellungsverwaltung.
- `js/settingsEntry.js` ist nur der Einstiegspunkt, der die Komponente
  initialisiert.

## Namensmuster

| Typ | Muster | Beispiele |
| --- | --- | --- |
| Komponente | `ComponentNameComponent.js` | `MessageDisplayComponent.js`, `SettingsComponent.js` |
| Einstiegspunkt | `entryName.js` | `settingsEntry.js`, `message-display.js` |
| Dienst/Hilfsmodul | `utilityName.js` | `storage.js`, `openai.js`, `message.js`, `ui.js` |
| Konfiguration | `configName.js` | `constants.js` |

Jeder Basisdateiname muss im gesamten Build eindeutig sein, weil das
Build-Skript `thunderbird-ai/` und `common/` in das XPI-Stammverzeichnis
abflacht.

## Globale Variablen statt ES-Modulen

Thunderbirds deklarierte Skript-Ladereihenfolge verwendet globale Objekte:

```javascript
const MyUtility = {
    method() { /* ... */ }
};

if (typeof window !== 'undefined') {
    window.MyUtility = MyUtility;
}
```

ES-Importe oder -Exporte sind in dieser Struktur falsch:

```javascript
import { CONFIG } from 'constants.js';
export class MessageDisplay { /* ... */ }
```

HTML lädt zuerst Konfiguration und Dienste, danach Komponenten und zuletzt den
Einstiegspunkt:

```html
<script src="constants.js"></script>
<script src="storage.js"></script>
<script src="openai.js"></script>
<script src="message.js"></script>
<script src="ui.js"></script>
<script src="MessageDisplayComponent.js"></script>
<script src="message-display.js"></script>
```

## Globale Abhängigkeiten

- Abhängigkeiten in HTML vor ihren Nutzern laden.
- Globale Namen eindeutig halten und ausdrücklich über `window` oder
  `globalThis` bereitstellen.
- Komponenten greifen auf vorhandene Dienste zu, statt sie zu duplizieren.
- Tests müssen Verfügbarkeit und Reihenfolge der globalen Bindungen prüfen.

Diese Konvention verhindert Kollisionen im abgeflachten XPI und erhält zugleich
eine modulare, nachvollziehbare Architektur im Quellbaum.
