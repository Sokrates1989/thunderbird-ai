# Individuellen AI-Endpunkt einrichten

> [English version](README.md)

Bei einem individuellen Endpunkt stellt nicht das Add-on, sondern der Betreiber
des gewählten Dienstes den API-Schlüssel und die Modell-ID bereit. Das gilt zum
Beispiel für selbst gehostete, lokale oder andere kompatible AI-Dienste.

Der Dienst muss eines dieser Protokolle anbieten:

- OpenAI Chat Completions
- OpenAI Responses
- Anthropic Messages

Eine nur ähnlich benannte proprietäre API ist nicht automatisch kompatibel.

## Zugangsdaten beschaffen

In der Dokumentation oder Administrationsoberfläche des konkreten Dienstes
werden benötigt:

1. die **API-Basis-URL**,
2. das unterstützte **Protokoll**,
3. die **Authentifizierung** (`Bearer`, `x-api-key` oder keine),
4. der **API-Schlüssel**, falls erforderlich,
5. mindestens eine exakte **Modell-ID**.

Der Schlüssel darf nur beim tatsächlichen Betreiber des Endpunkts angefordert
werden. Niemals einen OpenAI-, Anthropic-, Mistral- oder DeepSeek-Schlüssel an
einen unbekannten Drittanbieter-Endpunkt senden.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `Individueller Endpunkt` wählen.
3. Die Basis-URL als API-Wurzel eintragen. Das Add-on ergänzt je nach Protokoll
   `/chat/completions`, `/responses` oder `/messages`.
4. Protokoll und Authentifizierungsart passend zur Dokumentation des Dienstes
   auswählen.
5. Schlüssel und aufgabenspezifische Modell-IDs eintragen. Ein Endpunkt ohne
   Schlüssel muss ausdrücklich die Authentifizierung **Keine** verwenden.
6. Die von Thunderbird angeforderte Host-Berechtigung prüfen. Sie muss exakt
   auf den eingetragenen Host zeigen.
7. **API-Verbindung testen** und anschließend **Speichern** wählen.

Entfernte Endpunkte müssen HTTPS verwenden. Unverschlüsseltes HTTP wird nur für
`localhost` und `127.0.0.1` akzeptiert, damit ein lokaler Entwicklungsdienst
erreichbar bleibt.

## Häufige Fehler

- **404:** Die Basis-URL enthält wahrscheinlich bereits den vollständigen
  Operationspfad oder der Dienst verwendet einen anderen API-Pfad.
- **401/403:** Authentifizierungsart, Schlüssel und Berechtigungen stimmen nicht
  mit dem Dienst überein.
- **Kein Text:** Das ausgewählte Protokoll passt nicht zum Antwortformat des
  Dienstes oder der Dienst liefert keinen kompatiblen Textblock.
- **Modell nicht gefunden:** Die Modell-ID muss exakt der Kennung des Endpunkts
  entsprechen; **Automatisch** kann ohne Anbieter-Vorgaben keine unbekannte
  Modell-ID erraten.
- **Host-Berechtigung abgelehnt:** Den Test erneut starten und nur zustimmen,
  wenn der angezeigte Host der beabsichtigte Dienst ist.

Danach die [einheitliche Anbietertestfolge](../README.de.md#einheitlicher-anbietertest)
durchführen. Ein individueller Endpunkt gilt immer nur für die konkret getestete
Kombination aus Dienst, Protokoll, Authentifizierung und Modell als bestätigt.
