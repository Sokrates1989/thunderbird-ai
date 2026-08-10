#Requires -Version 5.1
<#
.SYNOPSIS
Runs the Windows setup and uninstaller against isolated files and registry keys.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-CheckedProcess {
    <# Execute one installer process and fail immediately on a non-zero exit code. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Process '$Executable' failed with exit code $($process.ExitCode)."
    }
}

function Get-RegistryValueInView {
    <# Read one HKCU value from an explicit registry view. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$SubKey,

        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$ValueName,

        [Parameter(Mandatory = $true)]
        [Microsoft.Win32.RegistryView]$View
    )

    $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
        [Microsoft.Win32.RegistryHive]::CurrentUser,
        $View
    )
    try {
        $key = $baseKey.OpenSubKey($SubKey)
        if ($null -eq $key) {
            return $null
        }
        try {
            return $key.GetValue($ValueName, $null)
        }
        finally {
            $key.Dispose()
        }
    }
    finally {
        $baseKey.Dispose()
    }
}

function Test-RegistryKeyInView {
    <# Test whether one HKCU key exists in an explicit registry view. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$SubKey,

        [Parameter(Mandatory = $true)]
        [Microsoft.Win32.RegistryView]$View
    )

    $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
        [Microsoft.Win32.RegistryHive]::CurrentUser,
        $View
    )
    try {
        $key = $baseKey.OpenSubKey($SubKey)
        if ($null -eq $key) {
            return $false
        }
        $key.Dispose()
        return $true
    }
    finally {
        $baseKey.Dispose()
    }
}

function Remove-TestRegistryInView {
    <# Remove only the isolated installer-test registry root. #>
    param(
        [Parameter(Mandatory = $true)]
        [Microsoft.Win32.RegistryView]$View
    )

    $baseKey = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
        [Microsoft.Win32.RegistryHive]::CurrentUser,
        $View
    )
    try {
        $baseKey.DeleteSubKeyTree('Software\ThunderbirdAIInstallerTest', $false)
    }
    finally {
        $baseKey.Dispose()
    }
}

function Get-InstallerLanguageFromXpi {
    <# Read the bounded installer language hand-off from an XPI. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $archive.GetEntry('install-defaults.json')
        if ($null -eq $entry) {
            throw "XPI '$Path' omits install-defaults.json."
        }
        $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
        try {
            return (($reader.ReadToEnd() | ConvertFrom-Json).language)
        }
        finally {
            $reader.Dispose()
        }
    }
    finally {
        $archive.Dispose()
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$manifest = Get-Content -LiteralPath (
    Join-Path $repositoryRoot 'thunderbird-ai\manifest.json'
) -Raw -Encoding utf8 | ConvertFrom-Json
$version = [string]$manifest.version
$extensionId = [string]$manifest.browser_specific_settings.gecko.id
$testRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $env:LOCALAPPDATA 'ThunderbirdAIInstallerTest')
)
$localAppDataRoot = [System.IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\') + '\'
if (-not $testRoot.StartsWith($localAppDataRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The isolated installer-test directory escaped LOCALAPPDATA.'
}
$testRegistrySubKey = 'Software\ThunderbirdAIInstallerTest'
$registryViews = @(
    [Microsoft.Win32.RegistryView]::Registry32,
    [Microsoft.Win32.RegistryView]::Registry64
)
$testRegistryExists = $registryViews | Where-Object {
    Test-RegistryKeyInView -SubKey $testRegistrySubKey -View $_
}
if ((Test-Path -LiteralPath $testRoot) -or $testRegistryExists) {
    throw 'The isolated installer-test target already exists. Remove it before rerunning the test.'
}

$profileExtensionDirectory = Join-Path $testRoot 'Profiles\fixture.default\extensions'
New-Item -ItemType Directory -Path $profileExtensionDirectory -Force | Out-Null
$profileExtension = Join-Path $profileExtensionDirectory "$extensionId.xpi"
[System.IO.File]::WriteAllText($profileExtension, 'old fixture', [System.Text.Encoding]::UTF8)

try {
    $installer = & (Join-Path $PSScriptRoot 'build-setup.ps1') -TestMode
    $installer = [System.IO.Path]::GetFullPath(($installer | Select-Object -Last 1))
    Invoke-CheckedProcess -Executable $installer -Arguments @(
        '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/LANG=english'
    )

    $installDirectory = Join-Path $testRoot 'app'
    $installedExtension = Join-Path $installDirectory "thunderbird-ai-$version.xpi"
    if (-not (Test-Path -LiteralPath $installedExtension -PathType Leaf)) {
        throw "Installer omitted '$installedExtension'."
    }
    if ((Get-InstallerLanguageFromXpi -Path $installedExtension) -ne 'en') {
        throw 'The English setup selection was not handed to the installed extension.'
    }
    if ((Get-FileHash -LiteralPath $installedExtension -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $profileExtension -Algorithm SHA256).Hash) {
        throw 'The existing-profile XPI was not updated from the installer payload.'
    }

    $staleExtension = Join-Path $installDirectory 'thunderbird-ai-1.2.0.xpi'
    [System.IO.File]::WriteAllText($staleExtension, 'stale fixture', [System.Text.Encoding]::UTF8)
    Invoke-CheckedProcess -Executable $installer -Arguments @(
        '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/LANG=english'
    )
    if (Test-Path -LiteralPath $staleExtension) {
        throw 'Running setup as an update left a stale versioned XPI behind.'
    }
    if ((Get-FileHash -LiteralPath $installedExtension -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $profileExtension -Algorithm SHA256).Hash) {
        throw 'Running setup as an update changed the installed/profile XPI parity.'
    }

    $extensionRegistry = "$testRegistrySubKey\Thunderbird\Extensions"
    foreach ($view in $registryViews) {
        $registryValueParameters = @{
            SubKey = $extensionRegistry
            ValueName = $extensionId
            View = $view
        }
        if ((Get-RegistryValueInView @registryValueParameters) -ne $installedExtension) {
            throw "The $view extension registration does not target the installed XPI."
        }
    }

    $uninstaller = Join-Path $installDirectory 'unins000.exe'
    Invoke-CheckedProcess -Executable $uninstaller -Arguments @(
        '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'
    )
    if (Test-Path -LiteralPath $profileExtension) {
        throw 'The isolated uninstaller left the profile XPI behind.'
    }
    foreach ($view in $registryViews) {
        if (Test-RegistryKeyInView -SubKey $testRegistrySubKey -View $view) {
            throw "The isolated uninstaller left $view test registry state behind."
        }
    }
    Write-Output 'Isolated Thunderbird AI setup install/update/uninstall: PASS'
}
finally {
    foreach ($view in $registryViews) {
        Remove-TestRegistryInView -View $view
    }
    if (Test-Path -LiteralPath $testRoot) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
