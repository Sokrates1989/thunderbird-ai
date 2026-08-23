# AI-Anbieter-Testmatrix

Diese Matrix trennt automatisierte Protokolltests von echten manuellen
API-Tests. Automatisierte Tests verwenden absichtlich keine realen Schlüssel
und verursachen keine Anbieter-Kosten. Ein Live-Test kann nur mit einem lokal in
Thunderbird eingetragenen Schlüssel durchgeführt werden.

## Aktueller Stand

| Anbieter | Automatisierter Vertragstest | Manueller Live-Test | Status |
| --- | --- | --- | --- |
| OpenAI | Responses-Endpunkt, Bearer-Authentifizierung, Modellrouting und Antwortparser | noch offen | Vertrag getestet |
| Claude (Anthropic) | Messages-Endpunkt, `x-api-key`, Versionsheader, Modellrouting und Antwortparser | noch offen | Vertrag getestet |
| Mistral | Chat-Completions-Endpunkt, Bearer-Authentifizierung, Modellrouting und Antwortparser | noch offen | Vertrag getestet |
| DeepSeek | Chat-Completions-Endpunkt, Bearer-Authentifizierung, deaktivierter Denkmodus, Modellrouting und Antwortparser | API-Test und Einzelmail-Analyse am 23.08.2026 erfolgreich gemeldet | Smoke-Test erfolgreich; vollständige Abnahme offen |
| Individueller Endpunkt | drei Protokolle, drei Authentifizierungsarten, exakte Host-Berechtigung und HTTP-Sicherheitsgrenze | abhängig vom konkreten Dienst | Vertrag getestet |

## Vollständige manuelle Abnahme

Für jeden integrierten Anbieter wird die
[einheitliche Anbietertestfolge](api-keys/README.md#einheitlicher-anbietertest)
mit **Automatisch** als Modellauswahl durchgeführt. Damit werden repräsentativ
diese Pfade geprüft:

- Verbindungstest und Bulk-Analyse: schnelles Modell
- Einzelmail-Analyse: ausgewogenes Modell
- Zusammenfassung, Antwort und AI Chat: Qualitätsmodell
- Neu-Analyse: Aktualisierung vorhandener lokaler Ergebnisse
- Thunderbird-Neustart: persistente, anbieterspezifische Konfiguration

Die vollständige Abnahme eines Anbieters wird erst eingetragen, wenn alle neun
Schritte erfolgreich waren. Schlüssel, vollständige E-Mail-Inhalte und
personenbezogene Ergebnisse gehören nicht in diese Datei.

## Automatisierte Prüfung

Die Protokollverträge werden unter anderem in
[`tests/ai-provider.test.mjs`](../tests/ai-provider.test.mjs) geprüft. Sie decken
Request-URL, Authentifizierungsheader, Payload, Antworttext, Token-Nutzung,
Modellrollen und Sicherheitsregeln für individuelle Endpunkte ab. Sie können
mit dem vollständigen Testlauf ausgeführt werden:

```bash
npm test
```
