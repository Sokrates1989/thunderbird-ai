# Thunderbird Add-ons submission sheet

> [Deutsche Version](atn-submission.de.md)

This document contains copy-ready listing and reviewer information for the
first public submission of AI Mail Assistant for Thunderbird 3.3.4. Keep the
listing synchronized with `PRIVACY.md` whenever providers or data categories
change.

Official references:

- [Thunderbird Add-ons review policy](https://thunderbird.github.io/atn-review-policy/)
- [Thunderbird reviewer guide](https://addons-reviewer-guide.thunderbird.net/add-on-review-guide)
- [Source-code submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/)

## Listing identity

- Name: `AI Mail Assistant for Thunderbird`
- Extension ID: `thunderbird-ai@felicitas-wisdom.com`
- Version: `3.3.4`
- Minimum Thunderbird: `128.0`
- Recommended primary category: `Message and News Reading`
- Recommended secondary category, if available: `Message Composition`
- Homepage: `https://github.com/Sokrates1989/thunderbird-ai`
- Support: `https://github.com/Sokrates1989/thunderbird-ai/issues`
- License: `GNU General Public License v3.0 or later`

## English listing

### Summary

Summarize, draft replies, chat with, and triage selected email through OpenAI,
Claude, Mistral, DeepSeek, or your compatible endpoint. No mail is sent unless
you start an AI action.

### Description

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

An AI request is made only after the user starts an AI action. Depending on that
action, the add-on sends the selected email subject, sender, readable message
text, attachment names, current reply draft and editing instruction, bounded
aggregate spam signals, and up to five explicitly stored correction examples
directly to the selected provider. The API key is sent only in that endpoint's
configured authentication header. OpenAI requests set `store: false`; all
providers and custom-endpoint operators control their own service processing,
retention, account terms, and charges. No data passes through a server operated
by the add-on maintainer.

Dashboard previews, searches for similar messages, settings, diagnostics, and
usage estimates remain local. The add-on does not automatically analyze opened
mail, show advertisements, sell data, or include telemetry.

Entry points: use the main toolbar button for the inbox dashboard, or the
message toolbar button for the currently open email. Open Add-ons Manager,
select the add-on, and open Settings to select the provider, add its API key,
choose models, inspect privacy information, and manage locally stored results
and corrections.

## German listing

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
verursachen; das Add-on selbst ist frei und Open Source. Ein Claude-App- oder
Claude-Code-Abonnement stellt nicht den hier erforderlichen separaten
Anthropic-API-Schlüssel bereit.

Eine AI-Anfrage erfolgt nur nach einer ausdrücklichen Nutzeraktion. Je nach
Aktion sendet das Add-on Betreff, Absender, lesbaren Nachrichtentext,
Anhangnamen, den aktuellen Antwortentwurf und die Änderungsanweisung, begrenzte
aggregierte Spam-Signale sowie bis zu fünf ausdrücklich gespeicherte
Korrekturbeispiele direkt an den ausgewählten Anbieter. Der API-Schlüssel wird
nur im konfigurierten Authentifizierungs-Header an diesen Endpunkt gesendet.
OpenAI-Anfragen setzen `store: false`; alle Anbieter und Betreiber individueller
Endpunkte bestimmen Verarbeitung, Aufbewahrung, Kontobedingungen und Kosten
selbst. Die Daten laufen nicht über einen Server des Add-on-Maintainers.

Dashboard-Vorschauen, die Suche nach ähnlichen Nachrichten, Einstellungen,
Diagnosen und Nutzungsschätzungen bleiben lokal. Das Add-on analysiert geöffnete
E-Mails nicht automatisch, zeigt keine Werbung, verkauft keine Daten und enthält
keine Telemetrie.

Einstiegspunkte: Die Hauptsymbolleiste öffnet das Posteingangs-Dashboard; die
Nachrichten-Symbolleiste öffnet den Assistenten für die aktuell angezeigte Mail.
Unter Add-ons und Themes können in den Einstellungen Anbieter, API-Schlüssel
und Modelle gewählt, Datenschutzhinweise gelesen sowie lokal gespeicherte
Ergebnisse und Korrekturen verwaltet werden.

## Privacy-policy field

Paste the complete current contents of `PRIVACY.md` into the Thunderbird
Add-ons privacy-policy field. Do not submit only a link. The listing description
above already contains the required short data-collection summary.

## First-listing operator sequence

Thunderbird Add-ons (ATN) distributes and signs the XPI. It does not distribute
the Windows or macOS installer; those remain optional GitHub alternatives for
this add-on. The submission can be completed from Windows, macOS, or Linux, but
perform the final functional check in a disposable Thunderbird profile on every
advertised platform.

1. Complete the current manual checklist with synthetic mail. Confirm the
   permanent extension ID, version, minimum Thunderbird version, permission
   prompts, English/German UI, and privacy disclosures.
2. Let the official release workflow produce the versioned XPI and reviewer
   source archive. Confirm the GitHub release is complete and its Windows
   installer is signed and timestamped; do not upload that installer to ATN.
3. Sign in to the Thunderbird Add-ons Developer Hub, start a new **listed**
   extension submission, accept the current distribution agreement, and upload
   `artifacts/thunderbird-ai-3.3.4.xpi`.
4. Copy the listing identity, English/German descriptions, categories, license,
   homepage, and support values from this sheet. Paste the complete current
   `PRIVACY.md` text into ATN's privacy-policy field rather than supplying only
   a link.
5. Upload the four synthetic-data screenshots from the checklist below. Do not
   expose account addresses, message content, or provider credentials.
6. Attach `artifacts/thunderbird-ai-3.3.4-atn-source.zip` and the build
   instructions from `ATN_SOURCE_BUILD.md`, even though this XPI does not contain
   minified or bundled third-party code.
7. Put the functional test notes below and a temporary low-limit reviewer API
   key only in ATN's reviewer-only technical-details/Whiteboard field. Never put
   the key in the public listing or source archive.
8. Submit for review, monitor the account email, and answer reviewer questions
   promptly; the current policy can reject an unanswered request after ten days.
9. After approval, install once from the public listing in a clean profile,
   verify update identity and core actions, then revoke the temporary key.

## Permission explanations

| Permission | Why it is required |
| --- | --- |
| `messagesRead` | Read only the messages needed for the open-mail view, dashboard, selected AI action, and local preview/search. |
| `messagesUpdate` | Mark a user-selected message as read and update message flags or tags. |
| `messagesMove` | Use Thunderbird's native archive behavior for explicit archive actions. |
| `messagesDelete` | Move explicitly selected messages to trash or delete according to Thunderbird/account behavior. |
| `compose` | Open and populate an editable Thunderbird reply draft after user confirmation. |
| `accountsRead` | List accounts/folders and preserve the correct identity and archive destination. |
| `notifications` | Report bounded launch failures when the dashboard cannot open. |
| `storage` | Store settings, results, local statistics, and explicit correction references in the Thunderbird profile. |
| `menus` | Provide message and dashboard context-menu actions. |
| `tabs` | Find, focus, create, and close the add-on's dashboard, settings, help, and message tabs. |
| `clipboardWrite` | Copy generated text when the user selects copy or when opening a draft fails. |
| `sensitiveDataUpload` | Disclose and authorize the explicit transfer of selected message data directly to the user-selected AI provider. |
| `https://api.openai.com/*` | Reach the built-in OpenAI HTTPS API only after an explicit AI action. |
| `https://api.anthropic.com/*` | Reach the built-in Claude/Anthropic HTTPS API only after an explicit AI action. |
| `https://api.mistral.ai/*` | Reach the built-in Mistral HTTPS API only after an explicit AI action. |
| `https://api.deepseek.com/*` | Reach the built-in DeepSeek HTTPS API only after an explicit AI action. |
| Optional `https://*/*` | Declare the bounded capability needed for custom HTTPS endpoints; the add-on requests only the exact configured host when the user saves or tests it. |
| Optional `http://localhost/*`, `http://127.0.0.1/*` | Permit an explicitly configured loopback development endpoint; non-loopback plain HTTP is rejected. |

## Reviewer notes

1. Upload `artifacts/thunderbird-ai-3.3.4.xpi` as the listed extension.
2. Attach `artifacts/thunderbird-ai-3.3.4-atn-source.zip` as source code.
3. The source archive contains `ATN_SOURCE_BUILD.md` with a no-network XPI build.
4. Test on Thunderbird 128 or newer with a synthetic email account and synthetic
   messages only.
5. Open Settings and verify the provider choices. OpenAI must be selected by
   default. Enter the temporary OpenAI reviewer key supplied privately in the
   reviewer-only technical-details/Whiteboard field, choose a model, and run
   the API test. Switching providers must not expose one provider's key in
   another provider's configuration.
6. Open a synthetic message, click the message-toolbar action, and test summary,
   reply draft, and chat. Verify that no request occurs merely by opening mail.
7. Open the main-toolbar dashboard, select a synthetic unread message, and run a
   single-message analysis. Preview and similar-message search remain local.
8. The add-on uses no Experiments, remote code, telemetry, advertising,
   maintainer-operated server, or native companion.

Never place a real or long-lived API key in this repository, the source archive,
the public listing, screenshots, or ordinary reviewer notes. Create a temporary
low-limit OpenAI project key immediately before review, provide it only through
the reviewer-only field, and revoke it when review ends.

## Screenshot checklist

Capture screenshots with synthetic messages and no account addresses, API keys,
or personal data:

1. dashboard with score columns and grouped actions;
2. single-message assistant with summary or editable reply;
3. settings showing provider selection, data-transfer disclosure, and model controls;
4. German UI variant of either the dashboard or single-message view.

Upload screenshots through the dedicated Thunderbird Add-ons screenshot fields.
Do not embed external links in the public description; use the Homepage and
Support fields instead.
