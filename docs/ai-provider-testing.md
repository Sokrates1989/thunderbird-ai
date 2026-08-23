# AI provider test matrix

> [Deutsche Version](ai-provider-testing.de.md)

This matrix separates automated protocol tests from real manual API tests.
Automated tests intentionally use no real keys and incur no provider charges. A
live test requires a key entered locally in Thunderbird.

## Current status

| Provider | Automated contract test | Manual live test | Status |
| --- | --- | --- | --- |
| OpenAI | Responses endpoint, Bearer authentication, model routing, and response parser | pending | Contract tested |
| Claude (Anthropic) | Messages endpoint, `x-api-key`, version header, model routing, and response parser | pending | Contract tested |
| Mistral | Chat Completions endpoint, Bearer authentication, model routing, and response parser | pending | Contract tested |
| DeepSeek | Chat Completions endpoint, Bearer authentication, disabled thinking mode, model routing, and response parser | API test and single-message analysis reported successful on 23 August 2026 | Smoke test successful; full acceptance pending |
| Custom endpoint | Three protocols, three authentication modes, exact host permission, and HTTP security boundary | depends on the service | Contract tested |

## Full manual acceptance

Run the [shared provider acceptance test](api-keys/README.md#shared-provider-acceptance-test)
for each built-in provider with **Automatic** model selection. The sequence
representatively covers:

- connection test and bulk analysis: fast model;
- single-message analysis: balanced model;
- summary, reply, and AI Chat: quality model;
- re-analysis: replacement of an existing local result; and
- Thunderbird restart: persistent provider-specific configuration.

Record full acceptance only after all nine steps pass. Keys, complete email
content, and personal results must never be added to this file.

## Automated verification

The protocol contracts are covered in
[`tests/ai-provider.test.mjs`](../tests/ai-provider.test.mjs). They verify request
URL, authentication headers, payload, response text, token usage, model roles,
and custom-endpoint security rules. Run them with the complete suite:

```bash
npm test
```
