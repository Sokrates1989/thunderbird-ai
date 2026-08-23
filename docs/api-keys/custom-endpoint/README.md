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
