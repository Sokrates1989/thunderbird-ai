# AI Mail Assistant for Thunderbird

> **[The complete README is also available in German.](README.de.md)**

A Thunderbird 128+ MailExtension for summaries, reply drafting, configurable
email analysis, and inbox triage with a selectable AI provider.

## Downloads and releases

- [Latest release](https://github.com/Sokrates1989/thunderbird-ai/releases/latest)
- [Installer and version history](https://github.com/Sokrates1989/thunderbird-ai/releases)
- [Latest XPI](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/thunderbird-ai.xpi)
- [Latest macOS installer](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/Thunderbird-AI-Setup-macos.pkg)
- [Latest Windows installer](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/Thunderbird-AI-Setup-win-x64.exe)
- [SHA-256 checksums](https://github.com/Sokrates1989/thunderbird-ai/releases/latest/download/SHA256SUMS.txt)

Stable download names always select the latest GitHub release. Every release
also retains versioned installers and checksums for a traceable history.

**New to API setup?** The [API-key guide index](docs/api-keys/README.md) links
individual instructions for OpenAI, Claude (Anthropic), Mistral, DeepSeek, and
custom endpoints. The [AI provider test matrix](docs/ai-provider-testing.md)
separates automated protocol coverage from real-provider acceptance.

## Release 3.5.2 scope

Release 3.5.2 keeps the collapsed dashboard view understandable at a glance.
The message-result row now states whether accounts are separated or combined and
emphasizes the active sort order. The contextual filter card lists only active
sender, date, AI-status, and score-threshold values alongside its one-click reset.
Those narrowing filters remain limited to the current Thunderbird session.

## Features

- Summaries based on the decoded MIME message body, with safe Markdown formatting.
- Interactive reply editor with AI refinement, direct editing, native
  Thunderbird reply handoff, Reply All, quoting, and attachment options.
- Importance, spam, and risk scoring with editable percentages and separate
  correction reasons.
- Translation to German, English, French, or Spanish.
- Extraction of contacts, dates, amounts, references, and tasks.
- Message-related AI Chat and local search for similar messages.
- Selectable OpenAI, Claude (Anthropic), Mistral, DeepSeek, or compatible custom
  HTTPS/localhost endpoint.
- Per-task model routing with automatic fast, balanced, and quality roles.
- Local result storage, support diagnostics, usage counters, and an OpenAI-only
  token-based cost estimate with a disclosed price snapshot.
- Global unread-inbox dashboard with complete header pagination, account or
  combined latest-50 views, session-only sender/date/score filters, a prominent
  active-filter counter and reset action, durable sorting/layout preferences,
  bulk actions, and configurable local content previews.
- Single-message and bulk scoring through the same guarded workflow, including
  explicit re-analysis and a correction archive independent of message deletion.
- Local bounded spam precheck using sender frequency and structural newsletter
  or bulk-mail signals without transmitting other messages.
- Three clearly separated action groups: AI actions, reading options, and email
  actions. Available operations include preview, open in tab, mark read, PDF
  export, archive, and delete.
- Expandable previews in four-line increments up to 20 lines, reset, close, and
  open-original controls.
- Equivalent right-click context actions with direct titled groups or optional
  grouped submenus.
- Independent overlay/tab preferences for the global dashboard and
  single-message assistant.
- Wake-safe toolbar routing, stale-dashboard replacement after updates, bounded
  retries, and content-free support diagnostics.
- Complete English and German UI and documentation.
- Per-user Windows and macOS installers with controlled Thunderbird restart.

## AI providers and models

OpenAI remains the default and uses the Responses API with `store: false`.
Claude uses Anthropic Messages. Mistral and DeepSeek use compatible Chat
Completions APIs. Claude requires an Anthropic API key; a Claude app or Claude
Code subscription cannot be reused as add-on API authentication.

DeepSeek V4 enables thinking by default. The add-on sends `thinking: disabled`
because its email functions consume only final text and use bounded output.

Custom endpoints may use OpenAI Chat, OpenAI Responses, or Anthropic Messages
with Bearer, `x-api-key`, or no authentication. Remote endpoints must use HTTPS;
HTTP is allowed only for `localhost` and `127.0.0.1`. The service must actually
implement the selected JSON protocol.

**Automatic** model selection maps each task to the provider's fast, balanced,
or quality preset. For OpenAI these roles are:

- `gpt-5.6-luna` for cost-sensitive bulk analysis;
- `gpt-5.6-terra` for single-message scoring; and
- `gpt-5.6-sol` for summaries, replies, and AI Chat.

Every task model can also be set to any model ID supported by the selected
provider. Bulk requests contain at most eight messages with no more than two
requests in parallel.

The **spam score** estimates unwanted bulk, advertising, or stray mail. The
independent **risk score** estimates phishing, social engineering, fraud,
suspicious links or attachments, threats, potentially unlawful offers, and
unwanted contact. It is an AI estimate, not a malware scan or legal opinion.

Before scoring, the add-on counts messages with the same full sender address
locally, up to 1,000 matches, and caches the aggregate for ten minutes. It also
recognizes List-Unsubscribe/List-ID, bulk headers, automated senders,
unsubscribe wording, and campaign-link signals. Frequency alone is never proof
of spam, and saved sender corrections take precedence over the local floor.

Temporary network failures, timeouts, rate limits, and provider errors are
retried at most twice with bounded delays. `Retry-After` is honored up to ten
seconds. Invalid keys, exhausted credit, and permanent client errors fail
without pointless retries.

## Thunderbird archiving

**Archive** and **Archive selected** call Thunderbird's native archive action,
so account and identity settings determine the destination. To obtain
`Archive/<sent year>`, choose **Yearly archived folders** for the identity under
**Account Settings → Copies & Folders → Message Archives → Archive options**.
Services such as Gmail can impose a different server-side archive model.

Under **Settings → Thunderbird archiving**, **Check archive folders** shows only
folders Thunderbird marks as archives, direct year folders, and reported
subfolder capability. The check changes no mail or settings. MailExtensions
cannot deep-link to protected account settings or read the yearly-folder choice,
so the add-on provides the exact manual path and official Thunderbird help.

## Privacy

An AI action sends subject, sender, message text, and recognized attachment
names directly from Thunderbird to the selected provider or custom endpoint.
Reply refinement additionally sends the current draft and recent refinement
instructions. Normal bulk analysis sends only explicitly selected messages
without an existing dashboard score; re-analysis requires an explicit confirmed
action.

Uncorrected scores store a stable local message identity, percentages,
provider, model, and timestamp. Corrected scores also store separate importance,
spam, and risk reasons. At most 1,000 score records are retained. The local spam
precheck sends only aggregates—not other message bodies, raw headers, or URLs.

One action can send the same AI input up to three times after retryable failures,
which can incur additional provider cost. Token usage is counted by provider
and model. Only known OpenAI models receive a local USD estimate; other provider
calls are counted but not priced.

Explicit corrections are also stored in a separate archive of at most 250
records. Each can contain a message excerpt of up to 6,000 characters,
attachment names, original/corrected values, and reasons. Up to five relevant
examples may be sent as untrusted calibration examples during later scoring.
This is contextual example learning, not model fine-tuning. The archive is not
removed when Thunderbird messages are deleted and can be managed in Settings.

API keys and saved results live in the Thunderbird profile's local extension
storage. Protect the operating-system account and Thunderbird profile like any
other local credential store. See the full [privacy policy](PRIVACY.md).

## Install on Windows

1. Download and run `Thunderbird-AI-Setup-3.5.2-win-x64.exe`.
2. Select **Deutsch** or **English** and accept the GNU General Public License.
3. Save drafts and approve the controlled restart. Setup closes Thunderbird
   normally and restarts it by default after installation; the final restart
   option can be cleared.
4. Accept any one-time activation and message-permission prompt.
5. In Settings, select the provider, enter its API key, review task models, test
   the connection, and save.

The per-user installer needs no administrator rights and updates in place while
preserving settings through the stable extension ID. Public release installers
must pass the [Windows code-signing gate](docs/windows-code-signing.md). Local
test installers remain unsigned and can trigger SmartScreen.

## Install on macOS

1. Start Thunderbird once so a profile exists.
2. Open `Thunderbird-AI-Setup-3.5.2-macos.pkg`.
3. Accept the GPL, save drafts, and allow a normal Thunderbird quit.
4. Setup opens Thunderbird after installation. Accept any one-time activation
   or permission prompt.
5. Select the provider, enter the key, review models, test, and save.

The package installs without administrator rights into all existing profiles
for the current user and updates in place. It is not yet Developer ID-signed or
notarized. Public distribution requires signing, notarization, and a published
SHA-256 checksum.

Version 3.0.0 adopted the permanent ID
`thunderbird-ai@felicitas-wisdom.com`. Native setup removes the former private
`thunderbird-ai@example.com` identity. If a restored dashboard still shows no
unread mail shortly after installation, close the tab and reopen it through the
Thunderbird AI toolbar button.

## Development and release builds

Requirements: Node.js 20+, PowerShell 5.1+ and Inno Setup 6 on Windows, and
`pkgbuild`/`productbuild` on macOS.

```powershell
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-addon.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\build-setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\test-setup.ps1
```

On macOS:

```bash
./build-addon.sh
./installer/macos/build-setup.sh
./installer/macos/test-setup.sh
```

Current artifacts:

- `thunderbird-ai.xpi`
- `artifacts/Thunderbird-AI-Setup-3.5.2-win-x64.exe`
- `artifacts/Thunderbird-AI-Setup-3.5.2-macos.pkg`

Build the Thunderbird Add-ons reviewer source only from tracked files:

```bash
./scripts/build-atn-source.sh
```

See the [reviewer build guide](ATN_SOURCE_BUILD.md),
[Thunderbird Add-ons submission sheet](docs/atn-submission.md), and
[complete manual test checklist](docs/manual-testing.md). The one-time Azure,
OIDC, and protected-environment setup is in the
[Windows code-signing guide](docs/windows-code-signing.md).

## Automatic Windows and macOS release

A push to `main` in the official repository starts the
[release workflow](.github/workflows/release.yml). If the manifest version has
no release, native Ubuntu, macOS, and Windows jobs test and build the XPI,
reviewer source, `.pkg`, and `.exe`. The Windows job additionally requires a
valid timestamped Authenticode signature from the configured publisher.
Publication occurs only after the complete artifact set, signed Windows stable
alias, and checksums pass.

No cross-build or GitHub UI step is needed after the one-time Actions setup.
The repository must allow the final job's scoped `contents: write` permission.
Pushing a new manifest version is the external publication action. Unchanged
versions, pull requests, and forks publish nothing.

## Technical structure

- `thunderbird-ai/`: manifest, global and message pages, styles, and UI
  components;
- `common/`: background, storage, message, retry, and provider-neutral AI
  services;
- `tests/`: Node unit and workflow tests without added runtime dependencies;
- `installer/windows/`: Inno Setup build and isolation test; and
- `installer/macos/`: native package build, localized resources, and isolation
  test.

The add-on uses ordered global scripts instead of ES modules because that is
the loading model declared by the manifest.

## License and contributions

AI Mail Assistant for Thunderbird is free and open-source software under the
[GNU General Public License version 3 or later](LICENSE). Forks and changes are
welcome; [pull requests](CONTRIBUTING.md) are especially encouraged. See the
[security policy](SECURITY.md), [privacy policy](PRIVACY.md), and
[Thunderbird Add-ons submission sheet](docs/atn-submission.md) before
publication or reporting sensitive issues.
