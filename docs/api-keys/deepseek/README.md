# Create a DeepSeek API key

> [Deutsche Version](README.de.md)

The add-on uses DeepSeek's OpenAI-compatible Chat Completions API. It explicitly
disables thinking mode for email actions so the visible answer remains within
the intended output budget.

Official pages:

- [DeepSeek Platform API keys](https://platform.deepseek.com/api_keys)
- [DeepSeek API documentation](https://api-docs.deepseek.com/)
- [DeepSeek API error codes](https://api-docs.deepseek.com/quick_start/error_codes/)
- [Top up DeepSeek credit](https://platform.deepseek.com/top_up)

## Create the key

1. Sign in to or create an account on the
   [DeepSeek Platform](https://platform.deepseek.com/).
2. Create a key under **API Keys**.
3. Copy the key immediately and store it securely.
4. Check available API credit under **Billing** or **Top Up**. Do not assume
   that the web-chat product and API billing are the same access.

## Configure the add-on

1. Open **Thunderbird AI Assistant → Settings**.
2. Select `DeepSeek` as **AI provider**.
3. Paste the key into **API key**. The fixed base URL must show
   `https://api.deepseek.com`.
4. Leave the models on **Automatic** initially.
5. Select **Test API connection**, then **Save**.

## Common errors

- **401 Authentication Fails:** Check or replace the key.
- **402 Insufficient Balance:** Check the account balance and add credit.
- **429 Rate Limit Reached:** Pause requests briefly and retry later.
- **500 or 503:** DeepSeek reports a temporary server error or high load. Retry
  after a short wait.
- **No visible text:** Use add-on version 3.1.1 or newer. These versions call
  DeepSeek V4 without thinking mode for add-on tasks.

After the connection succeeds, complete the
[shared provider acceptance test](../README.md#shared-provider-acceptance-test).
The connection test and single-message analysis reported on 23 August 2026 are
recorded as a smoke test in the
[AI provider test matrix](../../ai-provider-testing.md).
