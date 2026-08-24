# How to get your API Key

> [Deutsche Version](README.de.md)

Thunderbird AI Assistant connects directly to the selected AI provider. Each
built-in provider therefore needs its own API key. A consumer chat subscription
and API access are not automatically the same product.

## Provider guides

- [Create an OpenAI API key](openai/README.md)
- [Create a Claude/Anthropic API key](claude-anthropic/README.md)
- [Create a Mistral API key](mistral/README.md)
- [Create a DeepSeek API key](deepseek/README.md)
- [Configure a custom AI endpoint, including Hugging Face Inference Providers](custom-endpoint/README.md)

## Use keys safely

1. Create the key only on the provider's official website.
2. Paste it directly into **Thunderbird AI Assistant → Settings**. It does not
   need to be written to a configuration file.
3. Never place a key in Git, support messages, screenshots, or diagnostics.
4. Revoke and replace any key that may have been exposed.
5. Configure spending limits or alerts when the provider offers them.

The key is stored locally in the extension storage of the Thunderbird profile.
During an AI action, the add-on sends the email data described in the project's
[privacy section](../../README.md#privacy) directly to the selected provider.

## Shared provider acceptance test

Run the same short sequence after configuring each provider. Together, the
steps exercise the fast, balanced, and quality model routes:

1. Run **Test API connection** and expect visible response text.
2. Analyse one previously unanalysed email. Plausible importance, spam, and risk
   values must appear.
3. Summarise that email or another real message.
4. Generate a reply suggestion and refine it once with a short instruction.
5. Ask one message-related question in AI Chat, then ask a follow-up.
6. Select two or three unanalysed dashboard messages and run bulk analysis.
   Previously analysed messages must be skipped.
7. Re-analyse one existing result with **Re-analyse**.
8. Fully quit and reopen Thunderbird. Provider, models, and masked key must be
   retained, and the API test must still work.
9. Confirm usage statistics record provider and model without exposing the raw
   key in support diagnostics.

A provider is **fully manually tested** when all nine steps work with
**Automatic** model selection and no empty responses. Automated contract tests
and current live-test status are recorded in the
[AI provider test matrix](../ai-provider-testing.md).
