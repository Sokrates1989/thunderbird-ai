# Windows-Codesignatur und SmartScreen

> [English version](windows-code-signing.md)

Öffentliche Windows-Releases verwenden Microsoft Artifact Signing (früher
Trusted Signing) aus der geschützten GitHub-Umgebung
`windows-code-signing`. Der Release-Job lädt keinen unsignierten Installer
hoch. Lokale Entwickler-Builds bleiben unsignierte Testartefakte.

Eine Codesignatur weist den verifizierten Herausgeber nach und ermöglicht,
Herausgeber-Reputation auf spätere Releases zu übertragen. Sie garantiert
nicht, dass SmartScreen niemals warnt: Ein neuer Herausgeber oder eine neue
Datei kann zunächst Reputation aufbauen müssen. Nur die Verteilung über den
Microsoft Store vermeidet SmartScreen-Downloadwarnungen laut Microsoft
grundsätzlich. Für die bestehende GitHub-/Inno-Setup-Verteilung ist
durchgängiges Artifact Signing der empfohlene Weg.

Offizielle Referenzen:

- [SmartScreen-Reputation für Windows-Anwendungen](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft Artifact Signing einrichten](https://learn.microsoft.com/azure/artifact-signing/quickstart)
- [Artifact-Signing-GitHub-Action](https://github.com/Azure/artifact-signing-action)
- [GitHub Actions per OIDC an Azure anmelden](https://learn.microsoft.com/azure/developer/github/connect-from-azure-openid-connect)

## Einmalige Microsoft-Konfiguration

1. Ein Azure-Abonnement erstellen oder auswählen, dessen Abrechnungsidentität
   zur gewünschten Zertifikatsidentität passt. Den Ressourcenanbieter
   `Microsoft.CodeSigning` registrieren.
2. In einer unterstützten Region ein Artifact-Signing-Konto anlegen. Für dieses
   Release-Volumen genügt der Basic-Tarif.
3. Eine **öffentliche** Identitätsprüfung abschließen. Soll Windows einen
   Firmennamen anzeigen, Organisations-/DBA-Prüfung verwenden; bei individueller
   Prüfung erscheint der verifizierte bürgerliche Name. Vor Abschluss die
   Vorschau des Zertifikatssubjekts kontrollieren.
4. Für die bestätigte Identität ein **Public Trust**-Zertifikatsprofil anlegen.
5. Eine eigene Microsoft-Entra-Anwendung mit Dienstprinzipal ausschließlich für
   Release-Signaturen erstellen. Nur die Rolle **Artifact Signing Certificate
   Profile Signer** auf Ebene des Zertifikatsprofils zuweisen.
6. Für diese Anwendung einen föderierten GitHub-Identitätsnachweis mit Aussteller
   `https://token.actions.githubusercontent.com`, Zielgruppe
   `api://AzureADTokenExchange` und folgendem Subjekt anlegen:

   ```text
   repo:Sokrates1989/thunderbird-ai:environment:windows-code-signing
   ```

Dasselbe Artifact-Signing-Konto und Zertifikatsprofil können PDF Archiver
signieren. Dafür einen separaten föderierten Nachweis für dessen Repository
anlegen und keinen gemeinsamen Client-Schlüssel verwenden.

## Einmalige GitHub-Konfiguration

Im offiziellen Repository eine Umgebung namens `windows-code-signing`
anlegen. Ihre Deployment-Branches auf `main` beschränken und, sofern verfügbar,
eine Maintainer-Freigabe verlangen. Folgende Umgebungs-Secrets hinzufügen:

| Secret | Wert |
| --- | --- |
| `AZURE_CLIENT_ID` | Client-ID der Entra-Anwendung. |
| `AZURE_TENANT_ID` | Microsoft-Entra-Verzeichnis-/Mandanten-ID. |
| `AZURE_SUBSCRIPTION_ID` | Abonnement mit Artifact Signing. |
| `AZURE_ARTIFACT_SIGNING_ENDPOINT` | Regionaler Endpunkt, etwa `https://weu.codesigning.azure.net`. |
| `AZURE_ARTIFACT_SIGNING_ACCOUNT` | Name des Artifact-Signing-Kontos. |
| `AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE` | Name des Public-Trust-Zertifikatsprofils. |
| `WINDOWS_SIGNING_SUBJECT` | Eindeutiger, ohne Beachtung der Großschreibung geprüfter Ausschnitt der Zertifikatssubjekt-Vorschau, etwa `CN=<verifizierter rechtlicher Name>`. |

Diese Kennungen liegen als geschützte Umgebungs-Secrets an einer einheitlichen
Konfigurationsgrenze. Weder PFX/privater Schlüssel noch Azure-Client-Schlüssel,
Hardware-Token-PIN oder andere Signaturzugangsdaten liegen in GitHub.

## Erzwungener Release-Ablauf

Der Release-Workflow des offiziellen `main`-Branches:

1. baut und prüft das unsignierte Test-Setup isoliert;
2. baut den endgültigen versionierten Installer;
3. meldet sich mit einem kurzlebigen GitHub-OIDC-Token an Azure an;
4. signiert den versionierten Installer per Authenticode mit SHA-256 und dem
   Microsoft-RFC-3161-Zeitstempeldienst;
5. prüft gültige Signatur, erwarteten Herausgeber und Zeitstempel;
6. erzeugt danach den stabilen Alias und beweist die Byte-Gleichheit; und
7. lädt die signierten Dateien erst nach allen erfolgreichen Prüfungen hoch.

Artifact-Signing-Zertifikate sind absichtlich kurzlebig. Daher ist der
Zeitstempel nötig, damit die Signatur nach Zertifikatsablauf gültig bleibt. Eine
signierte Datei darf anschließend nicht verändert werden.

## Heruntergeladenes Release unter Windows prüfen

```powershell
$setup = '.\Thunderbird-AI-Setup-win-x64.exe'
Get-AuthenticodeSignature -LiteralPath $setup |
    Format-List Status, StatusMessage, SignerCertificate, TimeStamperCertificate
Get-FileHash -Algorithm SHA256 -LiteralPath $setup
```

Erforderlich sind `Status: Valid`, der erwartete verifizierte Herausgeber, ein
Zeitstempelzertifikat und eine mit `SHA256SUMS.txt` übereinstimmende Prüfsumme.
Frühe Releases einer neuen Herausgeberidentität können weiterhin einen
SmartScreen-Reputationshinweis zeigen. Die Identität muss stabil bleiben und
jeder Release signiert werden, damit Reputation aufgebaut wird.
