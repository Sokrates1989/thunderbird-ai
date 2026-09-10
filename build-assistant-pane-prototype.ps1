#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [ValidateSet('auto', 'de', 'en')]
    [string]$InstallerLanguage = 'auto',

    [string]$OutputPath = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$sourceManifestPath = Join-Path $repositoryRoot 'thunderbird-ai\manifest.json'
$prototypeSource = Join-Path $repositoryRoot 'prototypes\assistant-pane'
$sourceManifest = Get-Content -LiteralPath $sourceManifestPath -Raw | ConvertFrom-Json

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot (
        'artifacts\thunderbird-ai-assistant-pane-prototype-{0}.xpi' -f $sourceManifest.version
    )
}
$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutputPath
$outputExtension = [System.IO.Path]::GetExtension($resolvedOutputPath)
$unpackedOutputPath = $resolvedOutputPath.Substring(
    0,
    $resolvedOutputPath.Length - $outputExtension.Length
)
$workingDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
    'thunderbird-ai-pane-{0}' -f [guid]::NewGuid().ToString('N')
)
$basePackage = Join-Path $workingDirectory 'base.xpi'
$stagingDirectory = Join-Path $workingDirectory 'staging'

function Add-UniqueValue {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Values,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if ($Values -contains $Value) {
        return @($Values)
    }
    return @($Values) + $Value
}

function New-XpiPackage {
    <# Create an XPI whose entry names use WebExtension-compatible separators. #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceDirectory,

        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $resolvedSource = [System.IO.Path]::GetFullPath((Resolve-Path $SourceDirectory))
    $sourcePrefix = $resolvedSource.TrimEnd([System.IO.Path]::DirectorySeparatorChar) +
        [System.IO.Path]::DirectorySeparatorChar
    $archive = [System.IO.Compression.ZipFile]::Open(
        $DestinationPath,
        [System.IO.Compression.ZipArchiveMode]::Create
    )
    try {
        Get-ChildItem -LiteralPath $resolvedSource -Recurse -File |
            Sort-Object -Property FullName |
            ForEach-Object {
                $entryName = $_.FullName.Substring($sourcePrefix.Length).Replace('\', '/')
                [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive,
                    $_.FullName,
                    $entryName,
                    [System.IO.Compression.CompressionLevel]::Optimal
                )
            }
    }
    finally {
        $archive.Dispose()
    }
}

$prototypeFiles = @(
    'assistant-pane-api.js',
    'assistant-pane-bootstrap.js',
    'assistant-pane-entry.js',
    'assistant-pane-schema.json',
    'assistant-pane.css',
    'assistant-pane.html',
    'assistant-pane.js'
)

foreach ($fileName in $prototypeFiles) {
    $sourcePath = Join-Path $prototypeSource $fileName
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Prototype source file is missing: $sourcePath"
    }
}

New-Item -ItemType Directory -Path $workingDirectory | Out-Null
try {
    & (Join-Path $repositoryRoot 'build-addon.ps1') `
        -InstallerLanguage $InstallerLanguage `
        -OutputPath $basePackage
    if (-not $?) {
        throw 'Base add-on build failed.'
    }

    New-Item -ItemType Directory -Path $stagingDirectory | Out-Null
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($basePackage, $stagingDirectory)

    foreach ($fileName in $prototypeFiles) {
        Copy-Item -LiteralPath (Join-Path $prototypeSource $fileName) `
            -Destination (Join-Path $stagingDirectory $fileName)
    }

    $manifestPath = Join-Path $stagingDirectory 'manifest.json'
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $manifest.background.scripts = Add-UniqueValue `
        -Values @($manifest.background.scripts) `
        -Value 'assistant-pane-bootstrap.js'
    $manifest | Add-Member -MemberType NoteProperty -Name experiment_apis -Value ([pscustomobject]@{
        aiAssistantPane = [pscustomobject]@{
            schema = 'assistant-pane-schema.json'
            parent = [pscustomobject]@{
                scopes = @('addon_parent')
                paths = @(, @('aiAssistantPane'))
                script = 'assistant-pane-api.js'
                events = @('startup')
            }
        }
    }) -Force

    $resources = @($manifest.web_accessible_resources[0].resources)
    foreach ($resource in @(
            'assistant-pane.html',
            'assistant-pane.css',
            'assistant-pane.js',
            'assistant-pane-entry.js'
        )) {
        $resources = Add-UniqueValue -Values $resources -Value $resource
    }
    $manifest.web_accessible_resources[0].resources = $resources
    $manifestJson = $manifest | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText(
        $manifestPath,
        $manifestJson + [Environment]::NewLine,
        [System.Text.UTF8Encoding]::new($false)
    )

    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    if (Test-Path -LiteralPath $resolvedOutputPath) {
        Remove-Item -LiteralPath $resolvedOutputPath
    }
    if ((Split-Path -Parent $unpackedOutputPath) -ne $outputDirectory) {
        throw 'The unpacked prototype path escaped the selected output directory.'
    }
    if (Test-Path -LiteralPath $unpackedOutputPath) {
        Remove-Item -LiteralPath $unpackedOutputPath -Recurse -Force
    }
    Copy-Item -LiteralPath $stagingDirectory -Destination $unpackedOutputPath -Recurse
    New-XpiPackage -SourceDirectory $stagingDirectory -DestinationPath $resolvedOutputPath

    $archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutputPath)
    try {
        $entries = @($archive.Entries | ForEach-Object { $_.FullName })
        foreach ($requiredEntry in @('manifest.json') + $prototypeFiles) {
            if ($entries -notcontains $requiredEntry) {
                throw "Prototype XPI omits required entry '$requiredEntry'."
            }
        }
        if (@($entries | Where-Object { $_.Contains('\') }).Count -gt 0) {
            throw 'Prototype XPI contains invalid Windows path separators.'
        }
    }
    finally {
        $archive.Dispose()
    }

    $size = (Get-Item -LiteralPath $resolvedOutputPath).Length
    Write-Host "Prototype XPI created: $resolvedOutputPath"
    Write-Host "Temporary add-on directory: $unpackedOutputPath"
    Write-Host "Size: $([math]::Round($size / 1KB, 2)) KB"
    Write-Host 'The production manifest and normal release package were not modified.'
}
finally {
    if (Test-Path -LiteralPath $workingDirectory) {
        Remove-Item -LiteralPath $workingDirectory -Recurse -Force
    }
}
