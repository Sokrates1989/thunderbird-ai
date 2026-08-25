# Windows code signing and SmartScreen

> [Deutsche Version](windows-code-signing.de.md)

Public Windows releases use Microsoft Artifact Signing (formerly Trusted
Signing) from the protected `windows-code-signing` GitHub environment. The
release job refuses to upload an unsigned installer. Local developer builds
remain unsigned test artifacts.

Code signing proves the verified publisher and lets publisher reputation carry
across releases. It does not guarantee that SmartScreen will never warn: a new
publisher or file can still need reputation. Microsoft Store distribution is
the only Microsoft-documented route that avoids SmartScreen download warnings
by design. For the existing GitHub/Inno Setup distribution, consistent
Artifact Signing is the recommended path.

Official references:

- [SmartScreen reputation for Windows app developers](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)
- [Set up Microsoft Artifact Signing](https://learn.microsoft.com/azure/artifact-signing/quickstart)
- [Artifact Signing GitHub Action](https://github.com/Azure/artifact-signing-action)
- [Authenticate GitHub Actions to Azure with OIDC](https://learn.microsoft.com/azure/developer/github/connect-from-azure-openid-connect)

## One-time Microsoft configuration

1. Create or select an Azure subscription whose billing identity matches the
   intended certificate identity. Register the `Microsoft.CodeSigning` resource
   provider.
2. Create an Artifact Signing account in a supported region. The Basic tier is
   sufficient for this release volume.
3. Complete **Public** identity validation. Use organization/DBA validation if
   the Windows publisher should be a business name; individual validation shows
   the verified legal individual name. Review the certificate subject preview
   before accepting it.
4. Create a **Public Trust** certificate profile for that completed identity.
5. Create one dedicated Microsoft Entra application/service principal for
   release signing. Assign only the **Artifact Signing Certificate Profile
   Signer** role at the certificate-profile scope.
6. Add a GitHub federated identity credential to that application with issuer
   `https://token.actions.githubusercontent.com`, audience
   `api://AzureADTokenExchange`, and subject:

   ```text
   repo:Sokrates1989/thunderbird-ai:environment:windows-code-signing
   ```

The same Artifact Signing account and certificate profile can sign the PDF
Archiver project. Give its repository a separate federated credential rather
than sharing a client secret.

## One-time GitHub configuration

In the official repository, create an environment named
`windows-code-signing`. Restrict its deployment branches to `main` and, where
available, require a maintainer approval. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Entra application client ID. |
| `AZURE_TENANT_ID` | Microsoft Entra directory/tenant ID. |
| `AZURE_SUBSCRIPTION_ID` | Subscription containing Artifact Signing. |
| `AZURE_ARTIFACT_SIGNING_ENDPOINT` | Regional endpoint, for example `https://weu.codesigning.azure.net`. |
| `AZURE_ARTIFACT_SIGNING_ACCOUNT` | Artifact Signing account name. |
| `AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE` | Public Trust certificate profile name. |
| `WINDOWS_SIGNING_SUBJECT` | Unique case-insensitive fragment from the certificate subject preview, such as `CN=<verified legal name>`. |

These identifiers are stored as protected environment secrets for one
consistent configuration boundary. There is no PFX, private key, Azure client
secret, hardware-token PIN, or signing credential in GitHub.

## Enforced release sequence

The official `main`-branch release workflow:

1. builds and isolation-tests the unsigned test setup;
2. builds the final versioned installer;
3. authenticates to Azure with a short-lived GitHub OIDC token;
4. Authenticode-signs the versioned installer with SHA-256 and the Microsoft
   RFC 3161 timestamp service;
5. verifies `Valid` signature status, expected publisher, and timestamp;
6. copies the verified file to the stable alias and proves both files are
   byte-identical; and
7. uploads the signed files only after every check passes.

Artifact Signing certificates are intentionally short lived, so the timestamp
is required for the signature to remain valid after certificate expiry. Never
modify an installer after signing it.

## Verify a downloaded release on Windows

```powershell
$setup = '.\Thunderbird-AI-Setup-win-x64.exe'
Get-AuthenticodeSignature -LiteralPath $setup |
    Format-List Status, StatusMessage, SignerCertificate, TimeStamperCertificate
Get-FileHash -Algorithm SHA256 -LiteralPath $setup
```

Require `Status: Valid`, the expected verified publisher, a timestamp
certificate, and a hash matching the release's `SHA256SUMS.txt`. Early releases
under a new publisher identity can still display a SmartScreen reputation
prompt; keep the signing identity stable and sign every release so reputation
can accumulate.
