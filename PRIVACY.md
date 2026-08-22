# Privacy Policy

Last updated: 22 August 2026

Thunderbird AI Assistant does not automatically analyze opened email. Network processing begins only when the user explicitly starts an AI action or explicitly selects messages for dashboard analysis.

## Data sent to OpenAI

Depending on the chosen action, the add-on sends the email subject, sender, readable message text, attachment names, the current reply draft, and the user's editing instruction directly from Thunderbird to the OpenAI API. Dashboard scoring can additionally send bounded aggregate spam signals and up to five locally stored correction examples. The add-on requests `store: false`; OpenAI independently controls its service-side processing under the user's OpenAI account and applicable OpenAI terms.

The OpenAI API key is supplied by the user and stored in Thunderbird's local extension storage. It is sent only to OpenAI for authenticated API requests and is never included in support diagnostics.

No other AI provider is implemented in version 3.0.0. This policy and the add-on's disclosures must be updated before another provider is enabled.

## Local data

Settings, AI results, usage estimates, dashboard scores, and explicitly saved correction references are stored in the local Thunderbird profile. Correction references may contain a bounded email excerpt and attachment names. Dashboard previews and searches for similar messages operate locally. The settings page provides controls to inspect or remove stored correction references and related local data.

The add-on does not sell personal data, display advertising, or upload email automatically. Native installers copy the add-on into existing Thunderbird profiles but do not transmit profile contents.

## Retention and deletion

Local data remains until the user removes it through the add-on settings, clears Thunderbird extension data, or removes the relevant Thunderbird profile. Service-side retention by OpenAI is governed by the user's OpenAI plan and OpenAI's current policies.

## Contact

Privacy questions can be sent to `thunderbird-ai@felicitas-wisdom.com` or reported through the repository's GitHub Issues without including private email content or credentials.
