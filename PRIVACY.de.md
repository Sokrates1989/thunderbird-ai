# Datenschutzerklärung

> [English version](PRIVACY.md)

Zuletzt aktualisiert: 23. August 2026

AI Mail Assistant for Thunderbird analysiert geöffnete E-Mails nicht
automatisch. Netzwerkverarbeitung beginnt nur nach einer ausdrücklich gestarteten
AI-Aktion oder einer expliziten Dashboard-Auswahl.

## An den ausgewählten AI-Anbieter gesendete Daten

Je nach Aktion sendet das Add-on Betreff, Absender, lesbaren Nachrichtentext,
Anhangnamen, den aktuellen Antwortentwurf und die Bearbeitungsanweisung direkt
aus Thunderbird an den in Einstellungen gewählten Anbieter. Dashboard-Scoring
kann zusätzlich begrenzte aggregierte Spam-Signale und bis zu fünf lokal
gespeicherte Korrekturbeispiele senden. Unterstützte Ziele sind:

- OpenAI unter `https://api.openai.com/` mit Responses API und `store: false`;
- Claude unter `https://api.anthropic.com/` mit Anthropic Messages API;
- Mistral unter `https://api.mistral.ai/` mit Chat Completions;
- DeepSeek unter `https://api.deepseek.com/` mit Chat Completions; oder
- ein individueller HTTPS-Endpunkt beziehungsweise HTTP-Loopback auf
  `localhost` oder `127.0.0.1` mit kompatiblem gewählten Protokoll.

Der Maintainer leitet diese Anfragen nicht über einen eigenen Dienst. Anbieter
oder Endpunktbetreiber bestimmen serverseitige Verarbeitung, Aufbewahrung,
Kontobedingungen und Kosten selbst. OpenAIs `store: false` gilt nicht für andere
Anbieter. Benutzer müssen den Dienst vor dem Senden von Maildaten prüfen.

API-Schlüssel werden vom Benutzer bereitgestellt, im lokalen Extension-Speicher
gespeichert und nur im konfigurierten Authentifizierungsheader an das gewählte
Ziel gesendet. Claude benötigt einen separaten Anthropic-API-Schlüssel.
Support-Diagnosen enthalten keine Schlüssel. Die Berechtigung für einen
individuellen Host wird erst beim Speichern oder Testen dieses Endpunkts
angefordert.

## Lokale Daten

Einstellungen, AI-Ergebnisse, Nutzungsschätzungen, Dashboard-Scores und
ausdrücklich gespeicherte Korrekturreferenzen liegen im lokalen
Thunderbird-Profil. Referenzen können einen begrenzten Mailauszug und
Anhangnamen enthalten. Vorschauen und die Suche ähnlicher Nachrichten laufen
lokal. Einstellungen bieten Kontrollen zum Einsehen und Entfernen.

Das Add-on verkauft keine personenbezogenen Daten, zeigt keine Werbung und lädt
Mails nicht automatisch hoch. Native Installer kopieren das Add-on in vorhandene
Profile, übertragen aber keine Profilinhalte.

## Aufbewahrung und Löschung

Lokale Daten bleiben erhalten, bis der Benutzer sie in den Einstellungen
entfernt, Thunderbirds Extension-Daten löscht oder das Profil entfernt.
Serverseitige Aufbewahrung richtet sich nach den aktuellen Regeln des gewählten
Anbieters beziehungsweise der individuellen Bereitstellung.

## Kontakt

Datenschutzfragen können ohne private Mailinhalte oder Zugangsdaten an
`thunderbird-ai@felicitas-wisdom.com` oder über GitHub Issues gemeldet werden.
