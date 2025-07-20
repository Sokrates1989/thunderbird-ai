#!/usr/bin/env pwsh

Write-Host "========================================"
Write-Host "Thunderbird AI Test - Simple Build"
Write-Host "========================================"
Write-Host

# Clean up previous builds
if (Test-Path "thunderbird-ai-test.xpi") {
    Write-Host "Removing old test package..."
    Remove-Item "thunderbird-ai-test.xpi"
}

# Check required files
Write-Host "Checking required files..."

$requiredFiles = @(
    "test-manifest.json",
    "background.js",
    "test.html",
    "test.js",
    "test.css"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "ERROR: $file not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "OK: All required files found" -ForegroundColor Green

# Validate manifest.json
Write-Host
Write-Host "Validating test-manifest.json..."
try {
    $json = Get-Content 'test-manifest.json' | ConvertFrom-Json
    Write-Host "OK: test-manifest.json is valid JSON" -ForegroundColor Green
    Write-Host "  Name: $($json.name)"
    Write-Host "  Version: $($json.version)"
    Write-Host "  ID: $($json.browser_specific_settings.gecko.id)"
} catch {
    Write-Host "ERROR: test-manifest.json is invalid: $($_.Exception.Message)" -ForegroundColor Red
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

# Copy files
Write-Host "Copying files..."
Copy-Item 'test-manifest.json' 'temp_test\manifest.json'
Copy-Item 'background.js' 'temp_test\'
Copy-Item 'test.html' 'temp_test\'
Copy-Item 'test.js' 'temp_test\'
Copy-Item 'test.css' 'temp_test\'

# List all files
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
Write-Host "You can now install thunderbird-ai-test.xpi in Thunderbird:"
Write-Host "1. Open Thunderbird"
Write-Host "2. Tools > Add-ons and Themes"
Write-Host "3. Gear icon > Install Add-on From File..."
Write-Host "4. Select thunderbird-ai-test.xpi"
Write-Host
Write-Host "This simple test add-on should work immediately!" 