# Thunderbird Add-ons reviewer build

This source archive corresponds to AI Mail Assistant for Thunderbird 3.1.0.
It contains the complete human-readable source used to build the submitted XPI.
The add-on does not minify, obfuscate, download, or execute remote code.

## Environment

- Linux or macOS;
- Bash;
- Node.js 20 or newer;
- `zip` and `unzip`.

No package-manager installation or network access is required to build the XPI.

## Build the submitted XPI

From the source-archive root:

```bash
mkdir -p artifacts
./build-addon.sh --output artifacts/thunderbird-ai-3.1.0.xpi
```

The build flattens the checked-in `thunderbird-ai/` and `common/` source trees
into the XPI root, copies the English and German locale catalogs, adds the GPL
license, and generates `install-defaults.json` for version 3.1.0.

## Validate

```bash
npm test
unzip -t artifacts/thunderbird-ai-3.1.0.xpi
unzip -p artifacts/thunderbird-ai-3.1.0.xpi manifest.json
```

The packaged manifest must report version `3.1.0`, extension ID
`thunderbird-ai@felicitas-wisdom.com`, Thunderbird 128.0 or newer, and the
`sensitiveDataUpload` permission.

## Runtime service disclosure

The user selects OpenAI, Claude (Anthropic), Mistral, DeepSeek, or a compatible
custom endpoint and supplies any required API key. Only an explicit AI action
sends selected mail data directly from Thunderbird to that service. Built-in
destinations are `https://api.openai.com/`, `https://api.anthropic.com/`,
`https://api.mistral.ai/`, and `https://api.deepseek.com/`. Custom services
must use HTTPS, except for HTTP loopback development endpoints, and require an
exact-host optional permission requested from a user action. The add-on has no
maintainer-operated service. Full data categories and retention boundaries are
documented in `PRIVACY.md` and the reviewer notes in
`docs/atn-submission.md`.
