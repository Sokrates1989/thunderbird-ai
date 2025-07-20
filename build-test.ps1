#!/usr/bin/env pwsh

Write-Host "========================================"
Write-Host "Thunderbird AI Test - Dynamic Build"
Write-Host "========================================"
Write-Host

# Clean up previous builds
if (Test-Path "thunderbird-ai-test.xpi") {
    Write-Host "Removing old test package..."
    Remove-Item "thunderbird-ai-test.xpi"
}

# Check required directories
Write-Host "Checking required directories..."

$requiredDirs = @("test", "common")

foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "ERROR: $dir directory not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK: All required directories found" -ForegroundColor Green

# Validate manifest.json
Write-Host
Write-Host "Validating test/manifest.json..."
try {
    $json = Get-Content 'test/manifest.json' | ConvertFrom-Json
    Write-Host "OK: test/manifest.json is valid JSON" -ForegroundColor Green
    Write-Host "  Name: $($json.name)"
    Write-Host "  Version: $($json.version)"
    Write-Host "  ID: $($json.browser_specific_settings.gecko.id)"
} catch {
    Write-Host "ERROR: test/manifest.json is invalid: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create clean build
Write-Host
Write-Host "Creating clean test build..."

# Clean up
if (Test-Path 'temp_test') { 
    Remove-Item 'temp_test' -Recurse -Force 
}
New-Item -ItemType Directory -Path 'temp_test' | Out-Null

# Function to copy files recursively and handle conflicts
function Copy-FilesRecursively {
    param(
        [string]$SourceDir,
        [string]$DestDir,
        [hashtable]$FileMap
    )
    
    $files = Get-ChildItem -Path $SourceDir -Recurse -File
    $conflicts = @()
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($SourceDir, '').TrimStart('\')
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

# Copy files from test and common directories
Write-Host "Copying files from test and common directories..."
$fileMap = @{}
$allConflicts = @()

# Copy from test directory
Write-Host "Processing test directory..."
$testConflicts = Copy-FilesRecursively -SourceDir "test" -DestDir "temp_test" -FileMap $fileMap
$allConflicts += $testConflicts

# Copy from common directory
Write-Host "Processing common directory..."
$commonConflicts = Copy-FilesRecursively -SourceDir "common" -DestDir "temp_test" -FileMap $fileMap
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
    Write-Host "Example: test.css -> test-styles.css, common.css -> common-styles.css"
    
    # Clean up
    Remove-Item 'temp_test' -Recurse -Force
    exit 1
}

# List all files in temp directory
Write-Host
Write-Host "Files in temp_test:"
Get-ChildItem 'temp_test' -Recurse -File | ForEach-Object { 
    $relativePath = $_.FullName.Replace((Get-Location).Path + '\temp_test\', '')
    Write-Host "  $relativePath"
}

# Create ZIP package
Write-Host
Write-Host "Creating ZIP package..."
cd temp_test
Compress-Archive -Path * -DestinationPath '../thunderbird-ai-test.zip' -Force
cd ..
Rename-Item 'thunderbird-ai-test.zip' 'thunderbird-ai-test.xpi'

# Clean up
Remove-Item 'temp_test' -Recurse -Force

# Validate the created package
Write-Host
Write-Host "Validating package..."
if (Test-Path 'thunderbird-ai-test.xpi') {
    $size = (Get-Item 'thunderbird-ai-test.xpi').Length
    Write-Host "OK: Test package created successfully" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($size/1024, 2)) KB"
} else {
    Write-Host "ERROR: Package validation failed" -ForegroundColor Red
    exit 1
}

# Test package contents
Write-Host
Write-Host "Testing package contents..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('thunderbird-ai-test.xpi')
Write-Host "OK: Package contents:" -ForegroundColor Green
$zip.Entries | ForEach-Object { 
    Write-Host "  $($_.FullName) ($($_.Length) bytes)" 
}
$zip.Dispose()

Write-Host
Write-Host "========================================"
Write-Host "Test build completed successfully!"
Write-Host "========================================"
Write-Host
Write-Host "Directory Structure:"
Write-Host "  test/           - Test-specific files"
Write-Host "    manifest.json"
Write-Host "    css/test.css"
Write-Host "    html/test.html"
Write-Host "    js/test.js"
Write-Host "  common/         - Shared files"
Write-Host "    background.js"
Write-Host
Write-Host "Build Process:"
Write-Host "  1. All files from test/ and common/ are flattened to temp directory"
Write-Host "  2. Naming conflicts are detected and reported"
Write-Host "  3. Files are copied maintaining unique names"
Write-Host "  4. Package is created with flattened structure"
Write-Host
Write-Host "You can now install thunderbird-ai-test.xpi in Thunderbird:"
Write-Host "1. Open Thunderbird"
Write-Host "2. Tools > Add-ons and Themes"
Write-Host "3. Gear icon > Install Add-on From File..."
Write-Host "4. Select thunderbird-ai-test.xpi"
Write-Host
Write-Host "This dynamic test add-on should work immediately!" 
