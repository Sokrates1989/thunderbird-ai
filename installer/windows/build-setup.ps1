#Requires -Version 5.1
<#
.SYNOPSIS
Builds the Thunderbird AI XPI and compiles its per-user Windows setup.
#>
[CmdletBinding()]
param(
    [switch]$SkipAddonBuild,
    [switch]$TestMode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-InnoSetupCompiler {
    <# Resolve an explicitly configured or standard Inno Setup 6 compiler. #>
    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:INNO_SETUP_COMPILER)) {
        $candidates += $env:INNO_SETUP_COMPILER
    }
    $command = Get-Command 'ISCC.exe' -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        $candidates += $command.Source
    }
    $candidates += @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
        (Join-Path $env:ProgramFiles 'Inno Setup 6\ISCC.exe')
    )
    foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and
            (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return [System.IO.Path]::GetFullPath($candidate)
        }
    }
    throw 'Inno Setup 6 was not found. Install JRSoftware.InnoSetup or set INNO_SETUP_COMPILER.'
}

function Get-PackagedManifest {
    <# Validate Thunderbird package paths and read the packaged manifest. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackagePath
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)
    try {
        $entryNames = @($archive.Entries | ForEach-Object { $_.FullName })
        $invalidEntryNames = @($entryNames | Where-Object { $_.Contains('\') })
        if ($invalidEntryNames.Count -gt 0) {
            throw "The package '$PackagePath' contains invalid Windows-style entry names."
        }
        foreach ($locale in @('de', 'en')) {
            $localeEntry = "_locales/$locale/messages.json"
            if ($entryNames -notcontains $localeEntry) {
                throw "The package '$PackagePath' omits '$localeEntry'."
            }
        }
        $entry = $archive.GetEntry('manifest.json')
        if ($null -eq $entry) {
            throw "The package '$PackagePath' does not contain manifest.json."
        }
        $stream = $entry.Open()
        try {
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
            try {
                return $reader.ReadToEnd() | ConvertFrom-Json
            }
            finally {
                $reader.Dispose()
            }
        }
        finally {
            $stream.Dispose()
        }
    }
    finally {
        $archive.Dispose()
    }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$sourceManifestPath = Join-Path $repositoryRoot 'thunderbird-ai\manifest.json'
$sourceManifest = Get-Content -LiteralPath $sourceManifestPath -Raw -Encoding utf8 |
    ConvertFrom-Json
$version = [string]$sourceManifest.version
$extensionId = [string]$sourceManifest.browser_specific_settings.gecko.id
if ($version -notmatch '^\d+\.\d+\.\d+$') {
    throw "Manifest version '$version' is not a three-part semantic version."
}
if ($extensionId -ne 'thunderbird-ai@felicitas-wisdom.com') {
    throw "Manifest extension ID '$extensionId' does not match the installer update identity."
}

if (-not $SkipAddonBuild) {
    $powerShellExecutable = (Get-Process -Id $PID).Path
    Push-Location $repositoryRoot
    try {
        & $powerShellExecutable -NoProfile -ExecutionPolicy Bypass -File (
            Join-Path $repositoryRoot 'build-addon.ps1'
        )
        $addonBuildExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    if ($addonBuildExitCode -ne 0) {
        throw "Add-on build failed with exit code $addonBuildExitCode."
    }

    foreach ($language in @('de', 'en')) {
        $languagePackage = Join-Path $repositoryRoot "thunderbird-ai-$language.xpi"
        & $powerShellExecutable -NoProfile -ExecutionPolicy Bypass -File (
            Join-Path $repositoryRoot 'build-addon.ps1'
        ) -InstallerLanguage $language -OutputPath $languagePackage
        if ($LASTEXITCODE -ne 0) {
            throw "Add-on build for language '$language' failed with exit code $LASTEXITCODE."
        }
    }
}

$packagePaths = @(
    (Join-Path $repositoryRoot 'thunderbird-ai.xpi'),
    (Join-Path $repositoryRoot 'thunderbird-ai-de.xpi'),
    (Join-Path $repositoryRoot 'thunderbird-ai-en.xpi')
)
foreach ($packagePath in $packagePaths) {
    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
        throw "Required XPI not found at '$packagePath'."
    }
    $packagedManifest = Get-PackagedManifest -PackagePath $packagePath
    if ([string]$packagedManifest.version -ne $version -or
        [string]$packagedManifest.browser_specific_settings.gecko.id -ne $extensionId) {
        throw "The packaged XPI '$packagePath' does not match the source manifest."
    }
}

$compiler = Find-InnoSetupCompiler
$setupSource = Join-Path $PSScriptRoot 'setup.iss'
$arguments = @("/DAppVersion=$version")
if ($TestMode) {
    $testOutput = Join-Path $repositoryRoot 'build\installer-test'
    New-Item -ItemType Directory -Path $testOutput -Force | Out-Null
    $arguments += '/DTestMode=1'
    $arguments += "/O$testOutput"
}
$arguments += $setupSource

& $compiler @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Inno Setup compilation failed with exit code $LASTEXITCODE."
}

if ($TestMode) {
    Write-Output (Join-Path $testOutput "Thunderbird-AI-Setup-$version-test.exe")
}
else {
    $versionedSetup = Join-Path $repositoryRoot "artifacts\Thunderbird-AI-Setup-$version-win-x64.exe"
    $stableSetup = Join-Path $repositoryRoot 'artifacts\Thunderbird-AI-Setup-win-x64.exe'
    Copy-Item -LiteralPath $versionedSetup -Destination $stableSetup -Force
    Write-Output $versionedSetup
    Write-Output $stableSetup
}
