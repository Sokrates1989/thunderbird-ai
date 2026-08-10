#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [ValidateSet('auto', 'de', 'en')]
    [string]$InstallerLanguage = 'auto',

    [string]$OutputPath = 'thunderbird-ai.xpi'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
    [System.IO.Path]::GetFullPath($OutputPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
}
$temporaryZipPath = [System.IO.Path]::ChangeExtension($resolvedOutputPath, '.zip')

Write-Host "========================================"
Write-Host "Thunderbird AI Assistant - Dynamic Build"
Write-Host "========================================"
Write-Host

# Clean up previous builds
if (Test-Path -LiteralPath $resolvedOutputPath) {
    Write-Host "Removing old add-on package..."
    Remove-Item -LiteralPath $resolvedOutputPath
}
if (Test-Path -LiteralPath $temporaryZipPath) {
    Remove-Item -LiteralPath $temporaryZipPath
}

# Check required directories
Write-Host "Checking required directories..."

$requiredDirs = @("thunderbird-ai", "common")

foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "ERROR: $dir directory not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK: All required directories found" -ForegroundColor Green

# Validate manifest.json
Write-Host
Write-Host "Validating thunderbird-ai/manifest.json..."
try {
    $json = Get-Content 'thunderbird-ai/manifest.json' | ConvertFrom-Json
    Write-Host "OK: thunderbird-ai/manifest.json is valid JSON" -ForegroundColor Green
    Write-Host "  Name: $($json.name)"
    Write-Host "  Version: $($json.version)"
    Write-Host "  ID: $($json.browser_specific_settings.gecko.id)"
} catch {
    Write-Host "ERROR: thunderbird-ai/manifest.json is invalid: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create clean build
Write-Host
Write-Host "Creating clean add-on build..."

# Clean up
if (Test-Path 'temp_addon') { 
    Remove-Item 'temp_addon' -Recurse -Force 
}
New-Item -ItemType Directory -Path 'temp_addon' | Out-Null

# Function to copy files recursively and handle conflicts
function Copy-FilesRecursively {
    param(
        [string]$SourceDir,
        [string]$DestDir,
        [hashtable]$FileMap
    )
    
    $resolvedSourceDir = [System.IO.Path]::GetFullPath((Resolve-Path $SourceDir))
    $sourcePrefix = $resolvedSourceDir.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $files = Get-ChildItem -Path $resolvedSourceDir -Recurse -File
    $conflicts = @()
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($sourcePrefix.Length)
        if ($relativePath.StartsWith('_locales\', [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }
        $destPath = Join-Path $DestDir $file.Name
        
        if (Test-Path $destPath) {
            $conflicts += @{
                Source = $relativePath
                Destination = $file.Name
                ExistingSource = $FileMap[$file.Name]
            }
        } else {
            Copy-Item $file.FullName $destPath
            $FileMap[$file.Name] = $relativePath
            Write-Host "  Copied: $($file.Name)" -ForegroundColor Green
        }
    }
    
    return $conflicts
}

# Copy files from thunderbird-ai and common directories
Write-Host "Copying files from thunderbird-ai and common directories..."
$fileMap = @{}
$allConflicts = @()

# Copy from thunderbird-ai directory
Write-Host "Processing thunderbird-ai directory..."
$addonConflicts = Copy-FilesRecursively -SourceDir "thunderbird-ai" -DestDir "temp_addon" -FileMap $fileMap
$allConflicts += $addonConflicts

$localeSource = Join-Path 'thunderbird-ai' '_locales'
if (Test-Path -LiteralPath $localeSource -PathType Container) {
    Copy-Item -LiteralPath $localeSource -Destination (Join-Path 'temp_addon' '_locales') -Recurse
}

# Copy from common directory
Write-Host "Processing common directory..."
$commonConflicts = Copy-FilesRecursively -SourceDir "common" -DestDir "temp_addon" -FileMap $fileMap
$allConflicts += $commonConflicts

# Handle conflicts
if ($allConflicts.Count -gt 0) {
    Write-Host
    Write-Host "ERROR: File naming conflicts detected!" -ForegroundColor Red
    Write-Host "The following files would overwrite each other:"
    foreach ($conflict in $allConflicts) {
        Write-Host "  - $($conflict.Source) would overwrite $($conflict.Destination) (from $($conflict.ExistingSource))" -ForegroundColor Yellow
    }
    Write-Host
    Write-Host "Please rename conflicting files to have unique names and try again." -ForegroundColor Red
    Write-Host "Example: message-display.css -> message-display-styles.css, common.css -> common-styles.css"
    
    # Clean up
    Remove-Item 'temp_addon' -Recurse -Force
    exit 1
}

$installDefaults = [ordered]@{
    language = $InstallerLanguage
    version = [string]$json.version
} | ConvertTo-Json
[System.IO.File]::WriteAllText(
    (Join-Path (Resolve-Path 'temp_addon') 'install-defaults.json'),
    $installDefaults + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
)

# List all files in temp directory
Write-Host
Write-Host "Files in temp_addon:"
Get-ChildItem 'temp_addon' -Recurse -File | ForEach-Object { 
    $relativePath = $_.FullName.Replace((Get-Location).Path + '\temp_addon\', '')
    Write-Host "  $relativePath"
}

# Create ZIP package
Write-Host
Write-Host "Creating ZIP package..."
Compress-Archive -Path (Join-Path 'temp_addon' '*') -DestinationPath $temporaryZipPath -Force
Move-Item -LiteralPath $temporaryZipPath -Destination $resolvedOutputPath

# Clean up
Remove-Item 'temp_addon' -Recurse -Force

# Validate the created package
Write-Host
Write-Host "Validating package..."
if (Test-Path -LiteralPath $resolvedOutputPath) {
    $size = (Get-Item -LiteralPath $resolvedOutputPath).Length
    Write-Host "OK: Add-on package created successfully" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($size/1024, 2)) KB"
} else {
    Write-Host "ERROR: Package validation failed" -ForegroundColor Red
    exit 1
}

# Test package contents
Write-Host
Write-Host "Testing package contents..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($resolvedOutputPath)
Write-Host "OK: Package contents:" -ForegroundColor Green
$zip.Entries | ForEach-Object { 
    Write-Host "  $($_.FullName) ($($_.Length) bytes)" 
}
$zip.Dispose()

Write-Host
Write-Host "========================================"
Write-Host "Add-on build completed successfully!"
Write-Host "========================================"
Write-Host
Write-Host "Directory Structure:"
Write-Host "  thunderbird-ai/   - Main add-on files"
Write-Host "    manifest.json"
Write-Host "    css/message-display.css"
Write-Host "    css/common.css"
Write-Host "    html/message-display.html"
Write-Host "    js/message-display.js"
Write-Host "  common/           - Shared files"
Write-Host "    background.js"
Write-Host
Write-Host "Build Process:"
Write-Host "  1. All files from thunderbird-ai/ and common/ are flattened to temp directory"
Write-Host "  2. Naming conflicts are detected and reported"
Write-Host "  3. Files are copied maintaining unique names"
Write-Host "  4. Package is created with flattened structure"
Write-Host
Write-Host "You can now install $resolvedOutputPath in Thunderbird:"
Write-Host "1. Open Thunderbird"
Write-Host "2. Tools > Add-ons and Themes"
Write-Host "3. Gear icon > Install Add-on From File..."
Write-Host "4. Select $resolvedOutputPath"
Write-Host
Write-Host "This dynamic add-on should work immediately!"
