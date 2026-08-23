# Einreichungsblatt für Thunderbird Add-ons

> [English version](atn-submission.md)

Dieses Dokument enthält direkt verwendbare Listing- und Reviewer-Informationen
für die erste öffentliche Einreichung von AI Mail Assistant for Thunderbird
3.1.3. Bei Änderungen an Anbietern oder Datenkategorien muss es mit
`PRIVACY.de.md` synchron bleiben.

Offizielle Referenzen:

- [Thunderbird Add-ons Review Policy](https://thunderbird.github.io/atn-review-policy/)
- [Thunderbird Reviewer Guide](https://addons-reviewer-guide.thunderbird.net/add-on-review-guide)
- [Anforderungen an Quellcode-Einreichungen](https://extensionworkshop.com/documentation/publish/source-code-submission/)

## Listing-Identität

- Name: `AI Mail Assistant for Thunderbird`
- Erweiterungs-ID: `thunderbird-ai@felicitas-wisdom.com`
- Version: `3.1.3`
- Minimales Thunderbird: `128.0`
- Empfohlene Hauptkategorie: `Message and News Reading`
- Empfohlene Nebenkategorie, falls verfügbar: `Message Composition`
- Homepage: `https://github.com/Sokrates1989/thunderbird-ai`
- Support: `https://github.com/Sokrates1989/thunderbird-ai/issues`
- Lizenz: `GNU General Public License v3.0 or later`

## Englisches Listing

### Kurzbeschreibung

Summarize, draft replies, chat with, and triage selected email through OpenAI,
Claude, Mistral, DeepSeek, or your compatible endpoint. No mail is sent unless
you start an AI action.

### Beschreibung

AI Mail Assistant for Thunderbird adds an assistant for one open email and a
dashboard for explicitly selected inbox messages. It can summarize mail, draft
and refine replies, answer message-scoped questions, translate and extract
information, and estimate importance, spam probability, and potential risk.
Results and user corrections are stored locally in the Thunderbird profile.

The user selects OpenAI (the default), Claude through Anthropic, Mistral,
DeepSeek, or a custom OpenAI-/Anthropic-compatible endpoint and supplies any
required API key. Provider API use may incur charges billed by that provider;
the add-on itself is free and open-source. A Claude app or Claude Code
subscription does not provide the separate Anthropic API key required here.

An AI request is made only after the user starts an AI action. Depending on the
action, selected message data, current reply content, bounded spam aggregates,
and up to five explicitly stored correction examples are sent directly to the
selected provider. Keys are sent only in the configured authentication header.
OpenAI requests set `store: false`; providers control their own processing,
retention, terms, and charges. No maintainer server proxies the data.

Dashboard previews, similar-message search, settings, diagnostics, and usage
estimates remain local. The add-on performs no automatic mail analysis,
advertising, data sale, or telemetry. Use the main toolbar for the inbox
dashboard and the message toolbar for the open-mail assistant. Provider, key,
models, privacy details, and local results are managed in Settings.

## Deutsches Listing

### Kurzbeschreibung

Ausgewählte E-Mails über OpenAI, Claude, Mistral, DeepSeek oder einen
kompatiblen eigenen Endpunkt zusammenfassen, beantworten, besprechen und
bewerten. Ohne gestartete AI-Aktion wird keine Mail übertragen.

### Beschreibung

AI Mail Assistant for Thunderbird ergänzt einen Assistenten für eine geöffnete
E-Mail und ein Dashboard für ausdrücklich ausgewählte Posteingangsnachrichten.
Das Add-on kann E-Mails zusammenfassen, Antworten entwerfen und überarbeiten,
nachrichtenbezogene Fragen beantworten, übersetzen, Informationen extrahieren
und Wichtigkeit, Spam-Wahrscheinlichkeit sowie mögliche Risiken einschätzen.
Ergebnisse und Nutzerkorrekturen werden lokal im Thunderbird-Profil gespeichert.

Der Nutzer wählt OpenAI (Standard), Claude über Anthropic, Mistral, DeepSeek
oder einen OpenAI-/Anthropic-kompatiblen individuellen Endpunkt und stellt den
gegebenenfalls erforderlichen API-Schlüssel bereit. Die Anbieter-API kann Kosten
verursachen; das Add-on selbst ist frei und Open Source. Claude-App oder Claude
Code liefern nicht den erforderlichen separaten Anthropic-API-Schlüssel.

Eine AI-Anfrage erfolgt nur nach ausdrücklicher Nutzeraktion. Je nach Aktion
werden ausgewählte Nachrichtendaten, der aktuelle Antwortinhalt, begrenzte
Spam-Aggregate und bis zu fünf ausdrücklich gespeicherte Korrekturbeispiele
direkt an den Anbieter gesendet. Schlüssel werden nur im konfigurierten Header
übertragen. OpenAI setzt `store: false`; Anbieter bestimmen Verarbeitung,
Aufbewahrung, Bedingungen und Kosten. Es gibt keinen Maintainer-Proxy.

Dashboard-Vorschauen, Ähnlichkeitssuche, Einstellungen, Diagnosen und
Nutzungsschätzungen bleiben lokal. Es gibt keine automatische Mailanalyse,
Werbung, Datenverkäufe oder Telemetrie. Hauptsymbolleiste und
Nachrichten-Symbolleiste öffnen die beiden Ansichten; Anbieter, Schlüssel,
Modelle, Datenschutz und lokale Ergebnisse werden in Einstellungen verwaltet.

## Feld für die Datenschutzerklärung

Den vollständigen aktuellen Inhalt von `PRIVACY.de.md` in das Datenschutzfeld
von Thunderbird Add-ons kopieren, nicht nur verlinken. Die Listing-Beschreibung
enthält bereits die kurze Datenerfassungszusammenfassung.

## Berechtigungserklärungen

| Berechtigung | Begründung |
| --- | --- |
| `messagesRead` | Nur Nachrichten für geöffnete Ansicht, Dashboard, ausgewählte AI-Aktion sowie lokale Vorschau/Suche lesen. |
| `messagesUpdate` | Ausgewählte Nachrichten als gelesen markieren und Flags oder Tags aktualisieren. |
| `messagesMove` | Thunderbirds native Archivierung für ausdrückliche Archivaktionen verwenden. |
| `messagesDelete` | Ausgewählte Nachrichten gemäß Thunderbird-/Kontoverhalten löschen oder in den Papierkorb verschieben. |
| `compose` | Nach Bestätigung einen bearbeitbaren Thunderbird-Antwortentwurf öffnen. |
| `accountsRead` | Konten und Ordner auflisten und Identität sowie Archivziel bewahren. |
| `notifications` | Begrenzte Startfehler melden, wenn das Dashboard nicht öffnet. |
| `storage` | Einstellungen, Ergebnisse, lokale Statistik und Korrekturreferenzen im Profil speichern. |
| `menus` | Nachrichten- und Dashboard-Kontextmenüs bereitstellen. |
| `tabs` | Add-on-Tabs finden, fokussieren, erstellen und schließen. |
| `clipboardWrite` | Generierten Text nach Benutzeraktion oder Compose-Fehler kopieren. |
| `sensitiveDataUpload` | Die ausdrückliche Übertragung ausgewählter Nachrichtendaten an den gewählten Anbieter offenlegen und autorisieren. |
| `https://api.openai.com/*` | OpenAI erst nach ausdrücklicher AI-Aktion erreichen. |
| `https://api.anthropic.com/*` | Claude/Anthropic erst nach ausdrücklicher AI-Aktion erreichen. |
| `https://api.mistral.ai/*` | Mistral erst nach ausdrücklicher AI-Aktion erreichen. |
| `https://api.deepseek.com/*` | DeepSeek erst nach ausdrücklicher AI-Aktion erreichen. |
| Optional `https://*/*` | Nur den exakt konfigurierten individuellen HTTPS-Host nach Nutzeraktion anfordern. |
| Optional `http://localhost/*`, `http://127.0.0.1/*` | Einen ausdrücklich konfigurierten Loopback-Entwicklungsdienst erlauben; anderes HTTP wird abgewiesen. |

## Reviewer-Hinweise

1. `artifacts/thunderbird-ai-3.1.3.xpi` als Erweiterung hochladen.
2. `artifacts/thunderbird-ai-3.1.3-atn-source.zip` als Quellcode anhängen.
3. Das Quellarchiv enthält `ATN_SOURCE_BUILD.de.md` mit einem netzwerkfreien
   XPI-Build.
4. Thunderbird 128 oder neuer mit synthetischem Konto und Nachrichten verwenden.
5. Anbieter in Einstellungen prüfen; OpenAI ist Standard. Einen temporären
   Reviewer-Schlüssel nur im privaten Reviewer-Feld bereitstellen, API-Test und
   getrennte Anbieterprofile prüfen.
6. Mit einer synthetischen Mail Zusammenfassung, Antwort und Chat prüfen. Das
   bloße Öffnen einer Mail darf keine Anfrage auslösen.
7. Im Dashboard eine synthetische ungelesene Mail analysieren; Vorschau und
   Ähnlichkeitssuche bleiben lokal.
8. Das Add-on nutzt keine Experiments, entfernten Code, Telemetrie, Werbung,
   Maintainer-Server oder native Begleitkomponente.

Keine echten oder langlebigen Schlüssel in Repository, Quellarchiv, Listing,
Screenshots oder normale Reviewer-Hinweise aufnehmen. Einen temporären
OpenAI-Projektschlüssel mit niedrigem Limit unmittelbar vor dem Review erstellen,
nur privat bereitstellen und danach widerrufen.

## Screenshot-Checkliste

Nur synthetische Nachrichten ohne Adressen, Schlüssel oder persönliche Daten:

1. Dashboard mit Score-Spalten und gruppierten Aktionen;
2. Einzelmail-Assistent mit Zusammenfassung oder bearbeitbarer Antwort;
3. Einstellungen mit Anbieter, Datenübertragung und Modellen;
4. deutsche Variante von Dashboard oder Einzelmail-Ansicht.

Screenshots in die vorgesehenen Thunderbird-Add-ons-Felder hochladen. Externe
Links gehören nicht in die öffentliche Beschreibung; dafür Homepage und Support
verwenden.
