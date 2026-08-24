# Configure a custom AI endpoint

> [Deutsche Version](README.de.md)

For a custom endpoint, the chosen service operator—not the add-on—supplies the
API key and model ID. This applies to self-hosted, local, and other compatible
AI services.

The service must implement one of these protocols:

- OpenAI Chat Completions
- OpenAI Responses
- Anthropic Messages

A similarly named proprietary API is not automatically compatible.

## Obtain the connection details

The service documentation or administration interface must provide:

1. the **API base URL**;
2. the supported **protocol**;
3. the authentication mode (`Bearer`, `x-api-key`, or none);
4. the **API key**, when required; and
5. at least one exact **model ID**.

Request the key only from the actual endpoint operator. Never send an OpenAI,
Anthropic, Mistral, or DeepSeek key to an unknown third-party endpoint.

## Hosted example: Hugging Face Inference Providers

Hugging Face can be used without deploying a model. The Hub catalogs model
weights and metadata, while [Inference Providers](https://huggingface.co/docs/inference-providers/index)
routes compatible requests to Hugging Face or a participating compute provider.
This differs from a dedicated Inference Endpoint, which deploys reserved
infrastructure for one account.

An open-weight model does not imply unlimited free API usage. Hugging Face may
include a small monthly inference credit, while additional usage requires paid
credit. Check the current [pricing and billing page](https://huggingface.co/docs/inference-providers/pricing)
before testing.

### Create the token

1. Sign in to Hugging Face and open [User Access Tokens](https://huggingface.co/settings/tokens).
2. Create a separate **fine-grained** token for Thunderbird.
3. Enable **Make calls to Inference Providers**. Do not grant write access to
   repositories when it is not otherwise required.
4. Copy the `hf_...` token directly into Thunderbird. Never put it in Git,
   screenshots, support messages, or shell history.

The [Hugging Face Playground](https://huggingface.co/playground) can verify that
the account, model, and available credit work before configuring Thunderbird.

### Enter the Hugging Face configuration

Use these values for the first test:

| Thunderbird setting | Value |
| --- | --- |
| AI provider | `Custom endpoint` |
| API base URL | `https://router.huggingface.co/v1` |
| Protocol | `OpenAI Chat Completions` |
| Authentication | `Bearer` |
| API key | The dedicated `hf_...` token |
| Default model ID | `openai/gpt-oss-120b:cheapest` |
| Task-specific models | `Automatic` |

The add-on appends `/chat/completions`, so the resulting request URL is
`https://router.huggingface.co/v1/chat/completions`. Do not use a model page URL
or the legacy text-generation URL as the API base.

The suffix controls routing:

- `:cheapest` selects the currently cheapest provider for that model;
- `:fastest` selects the provider with the highest current throughput; and
- a provider suffix such as `:cerebras` pins the request to that provider.

Model availability, routing, and prices can change. Select a currently served
chat-completion model in the Playground. For a reproducible acceptance test,
pin a provider and record the exact model/provider combination rather than
relying on `:cheapest` or `:fastest`.

Hugging Face routing can forward the request to the selected compute provider.
Use only synthetic email during the first test and review the privacy and
retention terms of both Hugging Face and the selected provider before sending
real or confidential messages.

### Verify Hugging Face independently on Windows

This optional PowerShell request separates Hugging Face account, token, model,
and credit errors from Thunderbird configuration errors. The token is prompted
securely instead of being placed in command history:

```powershell
$secureToken = Read-Host "Hugging Face token" -AsSecureString
$hfToken = [System.Net.NetworkCredential]::new('', $secureToken).Password
try {
    $headers = @{ Authorization = "Bearer $hfToken" }
    $body = @{
        model = 'openai/gpt-oss-120b:cheapest'
        messages = @(@{ role = 'user'; content = 'Reply with OK only.' })
        max_tokens = 32
    } | ConvertTo-Json -Depth 5

    $response = Invoke-RestMethod `
        -Uri 'https://router.huggingface.co/v1/chat/completions' `
        -Method Post `
        -Headers $headers `
        -ContentType 'application/json' `
        -Body $body

    $response.choices[0].message.content
} finally {
    Remove-Variable hfToken, secureToken, headers, body, response `
        -ErrorAction SilentlyContinue
}
```

The final command should print a short answer such as `OK`. After that succeeds,
select **Test API connection** in Thunderbird, approve only
`https://router.huggingface.co/*`, save, and continue with a synthetic email.

## Configure the add-on

1. Open **Thunderbird AI Assistant → Settings**.
2. Select `Custom endpoint` as **AI provider**.
3. Enter the base URL as the API root. Depending on the protocol, the add-on
   appends `/chat/completions`, `/responses`, or `/messages`.
4. Select the protocol and authentication mode documented by the service.
5. Enter the key and task-specific model IDs. An endpoint without a key must
   explicitly use **None** authentication.
6. Review Thunderbird's requested host permission. It must match the configured
   host exactly.
7. Select **Test API connection**, then **Save**.

Remote endpoints must use HTTPS. Plain HTTP is accepted only for `localhost`
and `127.0.0.1`, allowing a local development service.

## Common errors

- **404:** The base URL may already include the complete operation path, or the
  service uses a different API path.
- **401/403:** Authentication mode, key, or permissions do not match the
  service.
- **Hugging Face payment or credit error:** Available monthly credit is
  exhausted or the account needs paid credit.
- **Hugging Face provider unavailable:** Select a model currently offered in
  the Playground, change the routing policy, or pin another listed provider.
- **No text:** The selected protocol does not match the response format, or the
  service did not return a compatible text block.
- **Model not found:** The model ID must match exactly. **Automatic** cannot
  invent an unknown provider model ID.
- **Host permission rejected:** Retry only when the displayed host is the
  intended service.

Then complete the
[shared provider acceptance test](../README.md#shared-provider-acceptance-test).
A custom endpoint is confirmed only for the tested combination of service,
protocol, authentication, and model.
