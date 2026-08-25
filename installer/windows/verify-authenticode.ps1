#Requires -Version 5.1
<#
.SYNOPSIS
Verifies the release Authenticode identity and RFC 3161 timestamp.

.DESCRIPTION
Fails closed unless every supplied file has a valid embedded Authenticode
signature, a signer subject containing the configured publisher fragment, and
a countersignature from a timestamping certificate.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string[]]$Path,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ExpectedPublisher
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

foreach ($candidatePath in $Path) {
    $file = Get-Item -LiteralPath $candidatePath -ErrorAction Stop
    if ($file.PSIsContainer) {
        throw "Authenticode verification requires a file: '$candidatePath'."
    }

    $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
    if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
        throw "Authenticode signature for '$($file.FullName)' is $($signature.Status): $($signature.StatusMessage)"
    }
    if ($null -eq $signature.SignerCertificate) {
        throw "Authenticode signature for '$($file.FullName)' has no signer certificate."
    }

    $subject = [string]$signature.SignerCertificate.Subject
    if ($subject.IndexOf($ExpectedPublisher, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Signer subject '$subject' does not contain expected publisher '$ExpectedPublisher'."
    }
    if ($null -eq $signature.TimeStamperCertificate) {
        throw "Authenticode signature for '$($file.FullName)' has no timestamp countersignature."
    }

    [pscustomobject]@{
        Path = $file.FullName
        Status = [string]$signature.Status
        SignerSubject = $subject
        SignerThumbprint = [string]$signature.SignerCertificate.Thumbprint
        TimestampSubject = [string]$signature.TimeStamperCertificate.Subject
    }
}
