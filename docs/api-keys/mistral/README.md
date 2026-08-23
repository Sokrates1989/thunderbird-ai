# Create a Mistral API key

> [Deutsche Version](README.de.md)

The add-on uses Mistral's OpenAI-compatible Chat Completions API.

Official pages:

- [Mistral Studio API keys](https://console.mistral.ai/api-keys)
- [Activate Studio and generate an API key](https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key)
- [Send the first Mistral API request](https://docs.mistral.ai/getting-started/quickstarts/developer/first-api-request)

## Create the key

1. Create or sign in to a [Mistral account](https://console.mistral.ai/).
2. Open **Studio**. According to the current Mistral documentation, limited
   Free Mode is enabled without a credit card; separate pay-as-you-go billing
   can provide higher limits.
3. Select **API Keys** in the sidebar.
4. Select **Create new key**, use a clear name such as `Thunderbird AI`, and set
   an expiration date where practical.
5. Copy the key immediately and store it securely. It is shown in full only
   once.

Use a Studio API key for regular API automation. Credentials or quotas from
another Mistral product are not automatically the same API access.

## Configure the add-on

1. Open **Thunderbird AI Assistant → Settings**.
2. Select `Mistral` as **AI provider**.
3. Paste the key into **API key**. The fixed base URL must show
   `https://api.mistral.ai/v1`.
4. Leave the models on **Automatic** initially.
5. Select **Test API connection**, then **Save**.

## Common errors

- **401 Unauthorized:** The key was copied incorrectly, revoked, or expired.
- **402 Payment Required:** Check billing mode or payment method in Mistral's
  administration panel.
- **429 Too Many Requests:** Free Mode or the current usage tier is exhausted.
  Wait briefly or review the API usage tier.
- **Model unavailable:** Use **Automatic** or a model ID enabled for the current
  workspace.

After the connection succeeds, complete the
[shared provider acceptance test](../README.md#shared-provider-acceptance-test).
Delete and replace expired or exposed keys in Mistral Studio.
