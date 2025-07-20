# Thunderbird AI Assistant

Ein AI-gestützter E-Mail-Assistent für Thunderbird mit Test-Funktionalität.

## 🚀 Schnellstart

### Installation
1. **Build-Script ausführen:**
   ```powershell
   powershell -ExecutionPolicy Bypass -File build-addon-working.ps1
   ```

2. **Add-on in Thunderbird installieren:**
   - Thunderbird öffnen
   - Tools > Add-ons and Themes
   - Zahnrad-Icon > Install Add-on From File...
   - `thunderbird-ai.xpi` auswählen

### Testen
1. **E-Mail öffnen** in Thunderbird
2. **AI Assistant Button** klicken (in der E-Mail-Ansicht)
3. **🧪 Test Button** klicken
4. **Alert-Nachricht** sollte erscheinen: "🎉 Test erfolgreich! Das Add-on funktioniert!"

## 📁 Projektstruktur

### Test Add-on (Neue Struktur)
```
Thunderbird-AI/
├── test/                     # Test-spezifische Dateien
│   ├── manifest.json         # Test Add-on Konfiguration
│   ├── css/
│   │   └── test.css         # Test Styling
│   ├── html/
│   │   └── test.html        # Test UI
│   └── js/
│       └── test.js          # Test JavaScript
├── common/                   # Gemeinsame Dateien
│   └── background.js         # Hintergrund-Script (gemeinsam)
├── build-test-simple.ps1    # Dynamisches Test Build-Script
└── thunderbird-ai-test.xpi  # Fertiges Test Add-on
```

### Main Add-on (Bestehende Struktur)
```
Thunderbird-AI/
├── manifest.json              # Add-on Konfiguration
├── background.js       # Hintergrund-Script (vereinfacht)
├── popup/
│   ├── message-display.html   # Haupt-Popup UI
│   ├── css/
│   │   └── common.css        # Styling
│   └── js/
│       └── message-display.js # Popup JavaScript
├── build-addon-working.ps1    # Build-Script
└── thunderbird-ai.xpi        # Fertiges Add-on
```

## 🔧 Funktionen

### Aktuell implementiert:
- ✅ **Test-Button** mit Alert-Nachricht
- ✅ **Background-Script Kommunikation**
- ✅ **Toast-Nachrichten**
- ✅ **Grundlegende UI** mit Buttons
- ✅ **E-Mail-Details Anzeige**

### Geplante Funktionen:
- 📄 E-Mail Zusammenfassung
- ✍️ Antwortvorschläge
- 📂 Automatische Kategorisierung
- ⚡ Wichtigkeitsprüfung
- 💬 AI Chat

## 🛠️ Entwicklung

### Test Add-on Build
```powershell
# Test Add-on erstellen (dynamisch)
powershell -ExecutionPolicy Bypass -File build-test-simple.ps1
```

### Main Add-on Build
```powershell
# Main Add-on erstellen
powershell -ExecutionPolicy Bypass -File build-addon-working.ps1
```

### Build-Prozess für Test Add-on
1. **Dynamisches Kopieren:** Alle Dateien aus `test/` und `common/` werden in ein temporäres Verzeichnis kopiert
2. **Namenskonflikte:** Werden automatisch erkannt und gemeldet
3. **Abgeflachte Struktur:** Alle Dateien erscheinen im Root-Verzeichnis des Add-ons
4. **Import-Pfade:** Müssen ohne Ordnerhierarchie verwendet werden (z.B. `background.js` statt `common/background.js`)

### Debugging
- **Browser-Konsole** öffnen (F12) für JavaScript-Logs
- **Test-Button** verwenden um grundlegende Funktionalität zu prüfen
- **Background-Script** kommuniziert über `browser.runtime.sendMessage`

## 📝 Technische Details

### Manifest v3
- **Permissions:** messagesRead, compose, storage, notifications
- **Background:** Vereinfachtes Script ohne ES6-Module
- **Popup:** message-display.html mit Test-Funktionalität

### Kommunikation
- **Popup ↔ Background:** `browser.runtime.sendMessage`
- **Test-Funktion:** `testConnection` Action
- **Mock-Responses:** Für grundlegende Tests

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

**Status:** ✅ Grundlegende Funktionalität funktioniert mit Test-Button 