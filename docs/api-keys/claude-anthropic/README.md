# Create a Claude/Anthropic API key

> [Deutsche Version](README.de.md)

The add-on connects directly to the Anthropic Messages API. It requires an
Anthropic API key; a Claude.ai or Claude Code sign-in cannot be used as the key.

Official pages:

- [API keys in the Claude Console](https://platform.claude.com/settings/keys)
- [Claude API getting started](https://platform.claude.com/docs/en/get-started)
- [Claude API authentication](https://platform.claude.com/docs/en/manage-claude/authentication)
- [Claude API pricing and billing](https://platform.claude.com/docs/en/about-claude/pricing)

## Create the key

1. Sign in to or create an account in the
   [Claude Console](https://platform.claude.com/).
2. Check billing or available API credit. A paid Claude app or Claude Code
   subscription is not a substitute for API access.
3. Create a key under **Settings → API keys**.
4. If workspaces are available, use a dedicated Thunderbird AI workspace and
   choose an appropriate expiration period.
5. Copy the key immediately and store it securely.

The add-on needs a normal API key, not an Admin API key. It sends normal
Anthropic keys to the Messages API as `x-api-key`.

## Configure the add-on

1. Open **Thunderbird AI Assistant → Settings**.
2. Select `Claude (Anthropic)` as **AI provider**.
3. Paste the key into **API key**. The fixed base URL must show
   `https://api.anthropic.com/v1`.
4. Leave the models on **Automatic** initially.
5. Select **Test API connection**, then **Save**.

## Common errors

- **Authentication failed / 401:** Check the key, workspace, and expiration.
  Expired keys cannot be reactivated.
- **Credit or spending limit reached:** Check credit, usage, and the monthly
  spend limit under **Settings → Billing** in the Claude Console.
- **Model unavailable:** Use **Automatic** or enter a model ID available to the
  current Anthropic workspace.

After the connection succeeds, complete the
[shared provider acceptance test](../README.md#shared-provider-acceptance-test).
Anthropic recommends regular rotation and immediate revocation of suspicious
keys.
