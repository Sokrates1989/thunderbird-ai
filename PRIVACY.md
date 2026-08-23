# Privacy Policy

> [Deutsche Version](PRIVACY.de.md)

Last updated: 23 August 2026

AI Mail Assistant for Thunderbird does not automatically analyze opened email. Network processing begins only when the user explicitly starts an AI action or explicitly selects messages for dashboard analysis.

## Data sent to the selected AI provider

Depending on the chosen action, the add-on sends the email subject, sender, readable message text, attachment names, the current reply draft, and the user's editing instruction directly from Thunderbird to the AI provider selected in Settings. Dashboard scoring can additionally send bounded aggregate spam signals and up to five locally stored correction examples. The supported built-in providers and destinations are:

- OpenAI at `https://api.openai.com/` using the Responses API with `store: false`;
- Claude at `https://api.anthropic.com/` using the Anthropic Messages API;
- Mistral at `https://api.mistral.ai/` using its Chat Completions API;
- DeepSeek at `https://api.deepseek.com/` using its Chat Completions API; or
- a custom HTTPS endpoint, or an HTTP loopback endpoint on `localhost` or `127.0.0.1`, using a user-selected compatible protocol.

The add-on maintainer does not proxy these requests. Each provider or custom-endpoint operator independently controls service-side processing, retention, account terms, and charges. OpenAI's `store: false` request field does not govern another provider or a custom endpoint. Users must review and trust the selected service before sending email data.

API keys are supplied by the user, stored in Thunderbird's local extension storage, and sent only to the selected endpoint in the configured authentication header. A Claude app or Claude Code subscription is not reused; Claude requires a separate Anthropic API key. Keys are never included in support diagnostics. Thunderbird requests access to a custom endpoint's exact host only when the user saves or tests that endpoint.

## Local data

Settings, AI results, usage estimates, dashboard scores, and explicitly saved correction references are stored in the local Thunderbird profile. Correction references may contain a bounded email excerpt and attachment names. Dashboard previews and searches for similar messages operate locally. The settings page provides controls to inspect or remove stored correction references and related local data.

The add-on does not sell personal data, display advertising, or upload email automatically. Native installers copy the add-on into existing Thunderbird profiles but do not transmit profile contents.

## Retention and deletion

Local data remains until the user removes it through the add-on settings, clears Thunderbird extension data, or removes the relevant Thunderbird profile. Service-side retention is governed by the selected provider's or custom-endpoint operator's current policies and the user's account or deployment configuration.

## Contact

Privacy questions can be sent to `thunderbird-ai@felicitas-wisdom.com` or reported through the repository's GitHub Issues without including private email content or credentials.
