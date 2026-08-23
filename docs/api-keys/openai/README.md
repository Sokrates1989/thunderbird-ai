# Create an OpenAI API key

> [Deutsche Version](README.de.md)

OpenAI is the add-on's default provider. The add-on uses the OpenAI Responses
API and sends requests with `store: false`.

## Before you start

ChatGPT Free, Plus, Pro, Business, or Enterprise access does not automatically
include API credit. ChatGPT and the OpenAI API use separate billing systems.
The add-on needs a key from the **OpenAI API Platform**.

Official pages:

- [OpenAI API keys](https://platform.openai.com/api-keys)
- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)
- [Manage API billing](https://platform.openai.com/settings/organization/billing/overview)
- [Why ChatGPT and API billing are separate](https://help.openai.com/en/articles/9039756-managing-billing-settings-on-chatgpt-web-and-platform)

## Create the key

1. Sign in to or create an account on the
   [OpenAI API Platform](https://platform.openai.com/).
2. If required, configure an API payment method or credit under **Billing**.
   An existing ChatGPT subscription is not sufficient.
3. Open **API keys**.
4. Select **Create new secret key**. If projects are available, use a dedicated
   Thunderbird AI project and restrict the key as narrowly as practical.
5. Copy the new key immediately and store it securely. The complete value may
   not be shown again.

## Configure the add-on

1. Open **Thunderbird AI Assistant → Settings**.
2. Select `OpenAI` as **AI provider**.
3. Paste the key into **API key**. The fixed base URL must show
   `https://api.openai.com/v1`.
4. Leave task models on **Automatic** initially.
5. Select **Test API connection**, then **Save**.

## Common errors

- **Authentication failed / 401:** The key is incorrect, revoked, or does not
  belong to the active project.
- **No credit or quota / 402 or 429:** Check API billing, project limits, and
  usage limits. A ChatGPT subscription does not change these limits.
- **Model unavailable:** Start with **Automatic**. A manually entered model ID
  must be enabled for the selected API project.

After the connection succeeds, complete the
[shared provider acceptance test](../README.md#shared-provider-acceptance-test).
Revoke and replace a potentially exposed key on the API-key page.
