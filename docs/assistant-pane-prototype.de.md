# Prototyp für eine dauerhafte AI-Assistentenleiste

Dieser Prototyp prüft, ob Thunderbird die ursprüngliche E-Mail und eine AI-Unterhaltung nebeneinander im normalen E-Mail-Tab anzeigen kann:

`Ordnerliste | Nachrichtenliste und E-Mail-Inhalt | AI-Assistent`

Er ist absichtlich vom normalen Release-Paket getrennt. Der Prototyp erweitert das interne `about:3pane`-Layout über eine Thunderbird Experiment API. Experiment APIs erhalten uneingeschränkte Thunderbird-Rechte und benötigen eine manuelle Prüfung. Für ein normales ATN-Release ist diese Lösung ungeeignet, solange Vorgehen und Prüfpfad nicht geklärt sind.

## Erstellen

Im Stammverzeichnis des Repositorys ausführen:

```powershell
.\build-assistant-pane-prototype.ps1
```

Der Build erstellt sowohl `artifacts/thunderbird-ai-assistant-pane-prototype-<version>.xpi` als auch ein entpacktes Verzeichnis mit demselben Namen. Das Quellmanifest und die Standardausgabe von `build-addon.ps1` bleiben unverändert.

## Sicher testen

Verwenden Sie ein Wegwerfprofil von Thunderbird. Eigene Experiment APIs benötigen für eine normale Installation eine privilegierte Signatur. Die XPI dient daher vor allem als reproduzierbares Prüfpaket. Für den lokalen Test wird der entpackte Build als temporäres Add-on geladen. Der Prototyp nutzt dieselbe Erweiterungs-ID wie das normale Add-on und sollte nicht in einem produktiv verwendeten Profil geladen werden.

1. Thunderbird mit der Profilverwaltung starten und ein eigenes Testprofil anlegen.
2. **Extras > Entwickler-Werkzeuge > Add-ons debuggen** öffnen (alternativ **Add-ons und Themes**, Zahnradmenü, **Add-ons debuggen**).
3. **Temporäres Add-on laden…** wählen und `manifest.json` im entpackten Prototyp-Verzeichnis öffnen.
4. Auf der Einstellungsseite des Add-ons einen AI-Anbieter konfigurieren.
5. Einen E-Mail-Tab öffnen und eine E-Mail auswählen.
6. Rechts in der Kopfzeile der Nachrichtenliste auf **AI** klicken.
7. Prüfen, dass die ursprüngliche E-Mail sichtbar bleibt und sich die Assistentenleiste rechts daneben öffnet.
8. Eine Frage stellen oder **Diese E-Mail zusammenfassen** auswählen.
9. Zu einer anderen E-Mail und danach zurück zur ersten wechseln. Jede E-Mail sollte ihre eigene Unterhaltung behalten, solange die Leiste existiert.
10. Die Trennlinie ziehen, die Leiste schließen und erneut öffnen. Die zuletzt verwendete Breite sollte wiederhergestellt werden. Für einen Thunderbird-Neustart das temporäre Add-on erneut laden und die gespeicherte Breite prüfen.

Bitte außerdem das klassische, vertikale und breite Thunderbird-Layout testen. Die Leiste folgt der angezeigten E-Mail und verändert ihren Inhalt nicht.

## Hilfreiche Debug-Informationen

Falls die Leiste nicht erscheint oder der Chat fehlschlägt, bitte Folgendes sammeln:

- Thunderbird-Version und Betriebssystem;
- ausgewähltes Thunderbird-Layout;
- ob die Schaltfläche **AI** erscheint;
- genaue Schritte vom Thunderbird-Start bis zum Fehler;
- einen Screenshot des vollständigen E-Mail-Tabs;
- Fehler aus **Extras > Entwickler-Werkzeuge > Fehlerkonsole**, die `assistant pane`, `aiAssistantPane` oder den ersten zugehörigen Stacktrace enthalten;
- ob die normale, separate AI-Ansicht für eine einzelne E-Mail mit denselben Anbietereinstellungen weiterhin funktioniert.

API-Schlüssel, Tokens, vollständige E-Mail-Inhalte und andere Geheimnisse dürfen nicht in Logs oder Screenshots enthalten sein.

## Derzeitige Einschränkungen

- Dies ist ein Machbarkeitsprototyp und kein produktives Release.
- Temporäre Add-ons werden beim Thunderbird-Neustart entfernt und müssen erneut geladen werden.
- Unterhaltungen bleiben nur erhalten, solange die eingebettete Leiste aktiv ist.
- Die Integration hängt von Thunderbirds internem Drei-Spalten-Dokument ab und kann bei zukünftigen Thunderbird-Versionen Anpassungen benötigen.
- Add-ons mit einer eigenen Experiment API benötigen erhöhtes Vertrauen und eine gesonderte Entscheidung zu Verteilung und Prüfung.
