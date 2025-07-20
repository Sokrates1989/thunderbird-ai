#!/usr/bin/env pwsh

Write-Host "========================================"
Write-Host "Thunderbird AI Assistant - Working Build"
Write-Host "========================================"
Write-Host

# Clean up previous builds
if (Test-Path "thunderbird-ai.xpi") {
    Write-Host "Removing old add-on package..."
    Remove-Item "thunderbird-ai.xpi"
}

# Check required files
Write-Host "Checking required files..."

$requiredFiles = @(
    "manifest.json",
    "background.js",
    "message-display.html",
    "message-display.js",
    "message-display.css"
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
Write-Host "Validating manifest.json..."
try {
    $json = Get-Content 'manifest.json' | ConvertFrom-Json
    Write-Host "OK: manifest.json is valid JSON" -ForegroundColor Green
    Write-Host "  Name: $($json.name)"
    Write-Host "  Version: $($json.version)"
    Write-Host "  ID: $($json.browser_specific_settings.gecko.id)"
} catch {
    Write-Host "ERROR: manifest.json is invalid: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create clean build
Write-Host
Write-Host "Creating clean build..."

# Clean up
if (Test-Path 'temp_addon') { 
    Remove-Item 'temp_addon' -Recurse -Force 
}
New-Item -ItemType Directory -Path 'temp_addon' | Out-Null

# Copy files
Write-Host "Copying files..."
Copy-Item 'manifest.json' 'temp_addon\'
Copy-Item 'background.js' 'temp_addon\'
Copy-Item 'message-display.html' 'temp_addon\'
Copy-Item 'message-display.js' 'temp_addon\'
Copy-Item 'message-display.css' 'temp_addon\'

# List all files
Write-Host
Write-Host "Files in temp_addon:"
Get-ChildItem 'temp_addon' -Recurse -File | ForEach-Object { 
    $relativePath = $_.FullName.Replace((Get-Location).Path + '\temp_addon\', '')
    Write-Host "  $relativePath"
}

# Create ZIP package
Write-Host
Write-Host "Creating ZIP package..."
cd temp_addon
Compress-Archive -Path * -DestinationPath '../thunderbird-ai.zip' -Force
cd ..
Rename-Item 'thunderbird-ai.zip' 'thunderbird-ai.xpi'

# Clean up
Remove-Item 'temp_addon' -Recurse -Force

# Validate the created package
Write-Host
Write-Host "Validating package..."
if (Test-Path 'thunderbird-ai.xpi') {
    $size = (Get-Item 'thunderbird-ai.xpi').Length
    Write-Host "OK: Package created successfully" -ForegroundColor Green
    Write-Host "  Size: $([math]::Round($size/1024, 2)) KB"
} else {
    Write-Host "ERROR: Package validation failed" -ForegroundColor Red
    exit 1
}

# Test package contents
Write-Host
Write-Host "Testing package contents..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('thunderbird-ai.xpi')
Write-Host "OK: Package contents:" -ForegroundColor Green
$zip.Entries | ForEach-Object { 
    Write-Host "  $($_.FullName) ($($_.Length) bytes)" 
}

# Check for required files specifically
$manifestFile = $zip.Entries | Where-Object { $_.FullName -eq 'manifest.json' }
$backgroundFile = $zip.Entries | Where-Object { $_.FullName -eq 'background.js' }
$htmlFile = $zip.Entries | Where-Object { $_.FullName -eq 'message-display.html' }
$jsFile = $zip.Entries | Where-Object { $_.FullName -eq 'message-display.js' }
$cssFile = $zip.Entries | Where-Object { $_.FullName -eq 'message-display.css' }

if ($manifestFile) {
    Write-Host "OK: manifest.json found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: manifest.json NOT found!" -ForegroundColor Red
}

if ($backgroundFile) {
    Write-Host "OK: background.js found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: background.js NOT found!" -ForegroundColor Red
}

if ($htmlFile) {
    Write-Host "OK: message-display.html found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: message-display.html NOT found!" -ForegroundColor Red
}

if ($jsFile) {
    Write-Host "OK: message-display.js found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: message-display.js NOT found!" -ForegroundColor Red
}

if ($cssFile) {
    Write-Host "OK: message-display.css found!" -ForegroundColor Green
} else {
    Write-Host "ERROR: message-display.css NOT found!" -ForegroundColor Red
}

$zip.Dispose()

Write-Host
Write-Host "========================================"
Write-Host "Build completed successfully!"
Write-Host "========================================"
Write-Host
Write-Host "You can now install thunderbird-ai.xpi in Thunderbird:"
Write-Host "1. Open Thunderbird"
Write-Host "2. Tools > Add-ons and Themes"
Write-Host "3. Gear icon > Install Add-on From File..."
Write-Host "4. Select thunderbird-ai.xpi"
Write-Host
Write-Host "The add-on now uses a simplified background script that should work!" 