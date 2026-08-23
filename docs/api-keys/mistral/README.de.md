# Mistral-API-Schlüssel erstellen

> [English version](README.md)

Das Add-on verwendet Mistrals OpenAI-kompatible Chat-Completions-API.

Offizielle Seiten:

- [Mistral Studio: API Keys](https://console.mistral.ai/api-keys)
- [Studio aktivieren und API-Schlüssel erzeugen](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key)
- [Erste Mistral-API-Anfrage](https://docs.mistral.ai/getting-started/quickstarts/developer/first-api-request)

## Schlüssel anlegen

1. Ein [Mistral-Konto](https://console.mistral.ai/) erstellen oder anmelden.
2. **Studio** öffnen. Der begrenzte Free Mode ist nach aktueller
   Mistral-Dokumentation standardmäßig ohne Kreditkarte verfügbar; für höhere
   Limits kann eine getrennte Pay-as-you-go-Abrechnung aktiviert werden.
3. In der linken Seitenleiste **API Keys** wählen.
4. **Create new key** anklicken, einen verständlichen Namen wie
   `Thunderbird AI` vergeben und möglichst ein Ablaufdatum setzen.
5. Den Schlüssel direkt nach der Erstellung kopieren und sicher speichern. Er
   wird nur einmal vollständig angezeigt.

Für die normale API-Automatisierung einen Studio-API-Schlüssel verwenden. Ein
Schlüssel oder Kontingent eines anderen Mistral-Produkts ist nicht automatisch
derselbe API-Zugang.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `Mistral` wählen.
3. Den Schlüssel in **API-Schlüssel** einfügen. Die feste Basis-URL muss
   `https://api.mistral.ai/v1` anzeigen.
4. Die Modelle zunächst auf **Automatisch** lassen.
5. **API-Verbindung testen** und anschließend **Speichern** wählen.

## Häufige Fehler

- **401 Unauthorized:** Schlüssel wurde falsch kopiert, widerrufen oder ist
  abgelaufen.
- **402 Payment Required:** Abrechnungsmodus beziehungsweise Zahlungsmethode im
  Mistral Admin Panel prüfen.
- **429 Too Many Requests:** Das Limit des Free Mode oder der aktuellen
  Nutzungsklasse wurde erreicht. Kurz warten oder die API-Nutzungsklasse prüfen.
- **Modell nicht verfügbar:** **Automatisch** verwenden oder eine aktuell für
  den Workspace freigeschaltete Modell-ID eintragen.

Nach erfolgreichem Verbindungstest die
[einheitliche Anbietertestfolge](../README.de.md#einheitlicher-anbietertest)
durchführen. Abgelaufene oder offengelegte Schlüssel in Mistral Studio löschen
und ersetzen.
