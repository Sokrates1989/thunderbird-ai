# Thunderbird Add-ons submission sheet

This document contains copy-ready listing and reviewer information for the
first public submission of AI Mail Assistant for Thunderbird 3.0.1. Keep the
listing synchronized with `PRIVACY.md` whenever providers or data categories
change.

Official references:

- [Thunderbird Add-ons review policy](https://thunderbird.github.io/atn-review-policy/)
- [Thunderbird reviewer guide](https://addons-reviewer-guide.thunderbird.net/add-on-review-guide)
- [Source-code submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/)

## Listing identity

- Name: `AI Mail Assistant for Thunderbird`
- Extension ID: `thunderbird-ai@felicitas-wisdom.com`
- Version: `3.0.1`
- Minimum Thunderbird: `128.0`
- Recommended primary category: `Message and News Reading`
- Recommended secondary category, if available: `Message Composition`
- Homepage: `https://github.com/Sokrates1989/thunderbird-ai`
- Support: `https://github.com/Sokrates1989/thunderbird-ai/issues`
- License: `GNU General Public License v3.0 or later`

## English listing

### Summary

Summarize, draft replies, chat with, and triage selected email using your own
OpenAI API key. No mail is sent unless you start an AI action.

### Description

AI Mail Assistant for Thunderbird adds an assistant for one open email and a
dashboard for explicitly selected inbox messages. It can summarize mail, draft
and refine replies, answer message-scoped questions, translate and extract
information, and estimate importance, spam probability, and potential risk.
Results and user corrections are stored locally in the Thunderbird profile.

The add-on requires the user's own OpenAI API key. OpenAI API use may incur
charges billed by OpenAI; the add-on itself is free and open-source. An AI
request is made only after the user starts an AI action. Depending on that
action, the add-on sends the selected email subject, sender, readable message
text, attachment names, current reply draft and editing instruction, bounded
aggregate spam signals, and up to five explicitly stored correction examples
directly to OpenAI. The API key is also sent to OpenAI for authentication. The
add-on requests that OpenAI not store response data, but OpenAI controls its own
service processing under the user's account and terms. No data passes through a
server operated by the add-on maintainer.

Dashboard previews, searches for similar messages, settings, diagnostics, and
usage estimates remain local. The add-on does not automatically analyze opened
mail, show advertisements, sell data, or include telemetry.

Entry points: use the main toolbar button for the inbox dashboard, or the
message toolbar button for the currently open email. Open Add-ons Manager,
select the add-on, and open Settings to add the API key, choose models, inspect
privacy information, and manage locally stored results and corrections.

## German listing

### Kurzbeschreibung

Ausgewählte E-Mails mit dem eigenen OpenAI-API-Schlüssel zusammenfassen,
beantworten, besprechen und bewerten. Ohne gestartete AI-Aktion wird keine Mail
übertragen.

### Beschreibung

AI Mail Assistant for Thunderbird ergänzt einen Assistenten für eine geöffnete
E-Mail und ein Dashboard für ausdrücklich ausgewählte Posteingangsnachrichten.
Das Add-on kann E-Mails zusammenfassen, Antworten entwerfen und überarbeiten,
nachrichtenbezogene Fragen beantworten, übersetzen, Informationen extrahieren
und Wichtigkeit, Spam-Wahrscheinlichkeit sowie mögliche Risiken einschätzen.
Ergebnisse und Nutzerkorrekturen werden lokal im Thunderbird-Profil gespeichert.

Das Add-on benötigt einen eigenen OpenAI-API-Schlüssel. Die OpenAI-API kann
Kosten verursachen, die OpenAI berechnet; das Add-on selbst ist frei und Open
Source. Eine AI-Anfrage erfolgt nur nach einer ausdrücklichen Nutzeraktion. Je
nach Aktion sendet das Add-on Betreff, Absender, lesbaren Nachrichtentext,
Anhangnamen, den aktuellen Antwortentwurf und die Änderungsanweisung, begrenzte
aggregierte Spam-Signale sowie bis zu fünf ausdrücklich gespeicherte
Korrekturbeispiele direkt an OpenAI. Der API-Schlüssel wird zur Authentifizierung
ebenfalls an OpenAI gesendet. Das Add-on fordert OpenAI auf, Antwortdaten nicht
zu speichern; OpenAI bestimmt die Verarbeitung innerhalb des Nutzerkontos und
der dort geltenden Bedingungen selbst. Die Daten laufen nicht über einen Server
des Add-on-Maintainers.

Dashboard-Vorschauen, die Suche nach ähnlichen Nachrichten, Einstellungen,
Diagnosen und Nutzungsschätzungen bleiben lokal. Das Add-on analysiert geöffnete
E-Mails nicht automatisch, zeigt keine Werbung, verkauft keine Daten und enthält
keine Telemetrie.

Einstiegspunkte: Die Hauptsymbolleiste öffnet das Posteingangs-Dashboard; die
Nachrichten-Symbolleiste öffnet den Assistenten für die aktuell angezeigte Mail.
Unter Add-ons und Themes können in den Einstellungen API-Schlüssel und Modelle
gewählt, Datenschutzhinweise gelesen sowie lokal gespeicherte Ergebnisse und
Korrekturen verwaltet werden.

## Privacy-policy field

Paste the complete current contents of `PRIVACY.md` into the Thunderbird
Add-ons privacy-policy field. Do not submit only a link. The listing description
above already contains the required short data-collection summary.

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
| `sensitiveDataUpload` | Disclose and authorize the explicit transfer of selected message data directly to OpenAI. |
| `https://api.openai.com/*` | Limit remote requests to OpenAI's HTTPS API. |

## Reviewer notes

1. Upload `artifacts/thunderbird-ai-3.0.1.xpi` as the listed extension.
2. Attach `artifacts/thunderbird-ai-3.0.1-atn-source.zip` as source code.
3. The source archive contains `ATN_SOURCE_BUILD.md` with a no-network XPI build.
4. Test on Thunderbird 128 or newer with a synthetic email account and synthetic
   messages only.
5. Open Settings, enter the temporary reviewer API key supplied privately in
   the reviewer-only technical-details/Whiteboard field, choose a model, and run
   the API test.
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
3. settings showing the OpenAI disclosure and model controls;
4. German UI variant of either the dashboard or single-message view.

Upload screenshots through the dedicated Thunderbird Add-ons screenshot fields.
Do not embed external links in the public description; use the Homepage and
Support fields instead.
