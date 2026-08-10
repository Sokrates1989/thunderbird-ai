# Thunderbird AI Assistant

Ein AI-gestützter E-Mail-Assistent für Thunderbird mit modularer Architektur und Thunderbird-Kompatibilität.

## 🚀 Schnellstart unter Windows

### Installation
1. `Thunderbird-AI-Setup-1.0.0-win-x64.exe` herunterladen und starten.
2. Offene Thunderbird-Entwürfe speichern und dem kontrollierten Neustart
   zustimmen. Der Installer beendet Thunderbird niemals erzwungen.
3. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung des Add-ons
   bestätigen.
4. API-Schlüssel und Modell in den Add-on-Einstellungen konfigurieren.

Der benutzerbezogene Installer benötigt keine Administratorrechte. Eine neuere
Setup-Datei wird direkt über die vorhandene Version installiert; eine vorherige
Deinstallation ist nicht nötig. Die feste Add-on-ID erhält vorhandene
Einstellungen. Zum Entfernen dient Windows **Installierte Apps**.

Der aktuelle Test-Installer ist noch nicht Authenticode-signiert. Windows
SmartScreen kann deshalb vor einem unbekannten Herausgeber warnen. Vor dem Start
sollte die veröffentlichte SHA-256-Prüfsumme verglichen werden.

### Testen
1. **E-Mail öffnen** in Thunderbird
2. **AI Assistant Button** klicken (in der E-Mail-Ansicht)
3. **🧪 Test Button** klicken
4. **Toast-Nachricht** sollte erscheinen: "🎉 Test erfolgreich! Das Add-on funktioniert!"

## 📁 Projektstruktur

### Main Add-on (Modulare Struktur)
```
Thunderbird-AI/
├── thunderbird-ai/           # Haupt-Add-on
│   ├── manifest.json         # Add-on Konfiguration
│   ├── components/           # UI Komponenten
│   │   ├── MessageDisplayComponent.js  # Popup Komponente
│   │   └── SettingsComponent.js       # Einstellungen Komponente
│   ├── config/              # Konfiguration
│   │   └── constants.js     # Konstanten und Konfiguration
│   ├── utils/               # Utility Module
│   │   ├── storage.js       # Speicher-Verwaltung
│   │   ├── openai.js        # OpenAI API Service
│   │   ├── message.js       # E-Mail Operationen
│   │   └── ui.js           # UI Utilities
│   ├── pages/               # HTML Templates
│   │   └── html/
│   │       └── message-display.html  # Haupt-Popup
│   ├── css/                 # Stylesheets
│   │   ├── message-display.css      # Popup Styling
│   │   └── common.css              # Gemeinsame Styles
│   └── js/                  # JavaScript Entry Points
│       ├── message-display.js      # Popup Entry Point
│       └── settingsEntry.js        # Einstellungen Entry Point
├── common/                  # Gemeinsame Dateien
│   ├── background.js        # Hintergrund-Script (non-module)
│   └── utils/              # Gemeinsame Utilities
│       ├── constants.js
│       ├── storage.js
│       ├── openai.js
│       ├── message.js
│       └── ui.js
├── test/                    # Test Add-on
│   ├── manifest.json        # Test Konfiguration
│   ├── css/
│   │   └── test.css        # Test Styling
│   ├── html/
│   │   └── test.html       # Test UI
│   └── js/
│       └── test.js         # Test JavaScript
├── build-addon.ps1         # Build-Script
└── thunderbird-ai.xpi      # Fertiges Add-on
```

## 🔧 Funktionen

### Aktuell implementiert:
- ✅ **Modulare Architektur** mit globalen Variablen
- ✅ **Thunderbird-Kompatibilität** ohne ES6 Module
- ✅ **Test-Button** mit Toast-Nachrichten
- ✅ **Background-Script Kommunikation**
- ✅ **Grundlegende UI** mit Buttons
- ✅ **E-Mail-Details Anzeige**
- ✅ **AI E-Mail-Zusammenfassung** mit intelligenter Analyse
- ✅ **OpenAI API Integration** mit Fallback-Modus

### Geplante Funktionen:
- ✍️ Antwortvorschläge
- 📂 Automatische Kategorisierung
- ⚡ Wichtigkeitsprüfung
- 💬 AI Chat

## 🛠️ Entwicklung

### Build-Prozess
```powershell
# Inno Setup einmalig installieren
winget install --id JRSoftware.InnoSetup --exact

# XPI und Ein-Klick-Installer erstellen
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\build-setup.ps1

# Installer isoliert prüfen
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\test-setup.ps1
```

Der Build erzeugt
`artifacts\Thunderbird-AI-Setup-1.0.0-win-x64.exe`. Der Isolationstest verwendet
nur eigene LocalAppData- und Registry-Ziele. Die bisherige einzelne XPI kann mit
`build-addon.ps1` weiterhin für Entwicklungsdiagnosen erzeugt und manuell über
Thunderbird installiert werden.

### Build-Prozess Details
1. **Dynamisches Kopieren:** Alle Dateien aus `thunderbird-ai/` und `common/` werden in ein temporäres Verzeichnis kopiert
2. **Namenskonflikte:** Werden automatisch erkannt und gemeldet
3. **Abgeflachte Struktur:** Alle Dateien erscheinen im Root-Verzeichnis des Add-ons
4. **Globale Variablen:** Alle Utilities verwenden globale Variablen statt ES6 Imports

### Debugging
- **Browser-Konsole** öffnen (F12) für JavaScript-Logs
- **Test-Button** verwenden um grundlegende Funktionalität zu prüfen
- **Background-Script** kommuniziert über `browser.runtime.sendMessage`

## 📝 Technische Details

### Manifest v3
- **Permissions:** messagesRead, compose, storage, notifications
- **Background:** Modularer Script mit globalen Utilities
- **Popup:** message-display.html mit Test-Funktionalität
- **Settings:** settings.html für API-Konfiguration

### Kommunikation
- **Popup ↔ Background:** `browser.runtime.sendMessage`
- **OpenAI API:** Direkte Integration für E-Mail-Analyse
- **Storage:** Lokale Speicherung von API-Schlüssel und Statistiken
- **Fallback:** Basis-Analyse wenn API nicht verfügbar

## 🏗️ Modulare Architektur

### **Globale Variablen statt ES6 Module**
```javascript
// ✅ Correct - Globale Variablen
const CONFIG = { /* ... */ };
const StorageManager = {
    async getSettings() { /* ... */ }
};
const MessageDisplay = class {
    constructor() {
        // Verwende globale Utilities
        StorageManager.getSettings();
        CONFIG.ACTIONS.SUMMARIZE;
    }
};

// Verfügbar machen
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.StorageManager = StorageManager;
    window.MessageDisplay = MessageDisplay;
}

// ❌ Incorrect - ES6 Module
import { CONFIG } from 'constants.js';
export class MessageDisplay { /* ... */ }
```

### **Script Loading Order**
```html
<!-- Utilities zuerst laden -->
<script src="constants.js"></script>
<script src="storage.js"></script>
<script src="openai.js"></script>
<script src="message.js"></script>
<script src="ui.js"></script>

<!-- Komponenten laden -->
<script src="MessageDisplayComponent.js"></script>

<!-- Entry Point zuletzt -->
<script src="message-display.js"></script>
```

### **Modulare Struktur**
- **Components:** UI-Komponenten (`MessageDisplayComponent.js`, `SettingsComponent.js`)
- **Utils:** Wiederverwendbare Funktionen (`storage.js`, `openai.js`, `message.js`, `ui.js`)
- **Config:** Zentrale Konfiguration (`constants.js`)
- **Entry Points:** Initialisierung (`message-display.js`, `settingsEntry.js`)

## 🤖 AI E-Mail-Zusammenfassung

### Funktionen
- **OpenAI Integration:** Echte KI-Analyse mit GPT-3.5/4 Modellen
- **Intelligente Analyse:** Automatische Erkennung von Ton, Dringlichkeit und Fragen
- **Metadaten-Extraktion:** Betreff, Absender, Datum, Wortanzahl, Anhänge
- **Sentiment-Analyse:** Positive, negative oder neutrale Stimmung
- **Aktionspunkte:** Automatische Erkennung erforderlicher Aktionen
- **Fallback-Modus:** Basis-Analyse wenn API nicht verfügbar

### Analyse-Features
- **Dringlichkeit:** Erkennung von "dringend", "sofort", "ASAP"
- **Formalität:** Erkennung geschäftlicher Kommunikation
- **Fragen:** Automatische Erkennung von Fragen und Antwortbedarf
- **Anhänge:** Prüfung auf Dateianhänge
- **Stimmung:** Analyse positiver/negativer Wörter
- **KI-Modell-Auswahl:** GPT-3.5 Turbo, GPT-4, GPT-4 Turbo

### Verwendung
1. **OpenAI API-Schlüssel konfigurieren:**
   - Einstellungen öffnen (⚙️ Button)
   - API-Schlüssel eingeben
   - API-Verbindung testen
   
2. **E-Mail analysieren:**
   - E-Mail öffnen in Thunderbird
   - AI Assistant Button klicken
   - "Zusammenfassen" Button klicken (oder Strg+Alt+S)
   
3. **Intelligente Zusammenfassung** wird angezeigt mit:
   - Metadaten (Absender, Datum, Wortanzahl)
   - Hauptpunkte der E-Mail
   - Erforderliche Aktionen
   - Stimmungsanalyse
   - Anhang-Informationen

### Beispiel-Ausgabe
```
📧 **E-Mail Zusammenfassung**

**Von:** max.mustermann@example.com
**Betreff:** Projekt-Update - Dringend
**Datum:** 15.12.2024
**Länge:** 245 Wörter

⚠️ **DRINGEND** - Diese E-Mail erfordert sofortige Aufmerksamkeit

📝 **Formeller Ton** - Geschäftliche Kommunikation

❓ **Enthält Fragen** - Antwort erforderlich

**Hauptpunkte:**
• Projekt-Deadline wurde auf nächste Woche verschoben
• Team-Meeting morgen um 10:00 Uhr
• Bitte bestätigen Sie Ihre Teilnahme

**Erforderliche Aktionen:**
• Antwort erforderlich
• Sofortige Bearbeitung

😊 **Positiver Ton** - E-Mail hat positive Stimmung
```

## ⚙️ Einstellungen & API-Konfiguration

### OpenAI API Setup
1. **API-Schlüssel erhalten:** [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Einstellungen öffnen:** ⚙️ Button im AI Assistant
3. **API-Schlüssel eingeben:** Sicherer Speicher im Add-on
4. **Verbindung testen:** 🔍 Button für API-Test
5. **Modell wählen:** GPT-3.5 Turbo (Standard) oder GPT-4

### Verfügbare Einstellungen
- **OpenAI API-Schlüssel:** Für KI-Analyse (erforderlich)
- **AI-Modell:** GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
- **Automatische Verarbeitung:** E-Mails automatisch analysieren
- **Statistiken:** Nutzungsdaten und API-Aufrufe

### Sicherheit
- **Lokale Speicherung:** API-Schlüssel nur lokal gespeichert
- **Keine externen Server:** Direkte OpenAI API-Kommunikation
- **Verschlüsselte Übertragung:** HTTPS für alle API-Aufrufe

## 🎯 Nächste Schritte

1. **E-Mail-Zugriff** implementieren
2. **OpenAI API** Integration
3. **Echte AI-Funktionen** hinzufügen
4. **UI-Verbesserungen** für bessere UX

## 📞 Support

Bei Problemen:
1. **Test-Button** verwenden um grundlegende Funktionalität zu prüfen
2. **Browser-Konsole** für Fehler-Logs prüfen
3. **Add-on neu installieren** falls nötig

---

**Status:** ✅ Modulare Architektur mit Thunderbird-Kompatibilität funktioniert
