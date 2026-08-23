# DeepSeek-API-Schlüssel erstellen

Das Add-on verwendet DeepSeeks OpenAI-kompatible Chat-Completions-API. Für die
E-Mail-Funktionen wird der Denkmodus ausdrücklich deaktiviert, damit die
sichtbare Antwort innerhalb des vorgesehenen Ausgabelimits bleibt.

Offizielle Seiten:

- [DeepSeek Platform: API Keys](https://platform.deepseek.com/api_keys)
- [DeepSeek API-Dokumentation](https://api-docs.deepseek.com/)
- [DeepSeek API-Fehlercodes](https://api-docs.deepseek.com/quick_start/error_codes/)
- [DeepSeek Guthaben aufladen](https://platform.deepseek.com/top_up)

## Schlüssel anlegen

1. Bei der [DeepSeek Platform](https://platform.deepseek.com/) anmelden oder ein
   Konto erstellen.
2. Unter **API Keys** einen neuen Schlüssel anlegen.
3. Den Schlüssel sofort kopieren und sicher speichern.
4. Unter **Billing** beziehungsweise **Top Up** prüfen, ob ausreichend
   API-Guthaben vorhanden ist. Das Web-Chat-Produkt und die API-Abrechnung sind
   nicht als derselbe Zugang zu behandeln.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `DeepSeek` wählen.
3. Den Schlüssel in **API-Schlüssel** einfügen. Die feste Basis-URL muss
   `https://api.deepseek.com` anzeigen.
4. Die Modelle zunächst auf **Automatisch** lassen.
5. **API-Verbindung testen** und anschließend **Speichern** wählen.

## Häufige Fehler

- **401 Authentication Fails:** Schlüssel prüfen oder neu erstellen.
- **402 Insufficient Balance:** Kontostand prüfen und Guthaben aufladen.
- **429 Rate Limit Reached:** Anfragen kurz aussetzen und später erneut testen.
- **500 oder 503:** DeepSeek meldet einen temporären Serverfehler oder hohe
  Auslastung. Nach kurzer Wartezeit erneut versuchen.
- **Kein sichtbarer Text:** Mindestens Version 3.1.1 des Add-ons verwenden. Seit
  dieser Version wird DeepSeek V4 für die Add-on-Aufgaben ohne Denkmodus
  aufgerufen.

Nach erfolgreichem Verbindungstest die
[einheitliche Anbietertestfolge](../README.md#einheitlicher-anbietertest)
durchführen. Der am 23. August 2026 gemeldete Verbindungstest und die
Einzelmail-Analyse sind in der
[AI-Anbieter-Testmatrix](../../ai-provider-testing.md) als Smoke-Test erfasst.
