# Test the Windows installer

> [Deutsche Version](windows-installer-testing.de.md)

The primary Windows artifact is
`Thunderbird-AI-Setup-3.3.1-win-x64.exe`. It installs only for the current user
and requires no administrator privileges.

## Automated isolation test

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\test-setup.ps1
```

The test uses only `%LOCALAPPDATA%\ThunderbirdAIInstallerTest` and
`HKCU\Software\ThunderbirdAIInstallerTest`. It verifies installation, valid XPI
paths for both language catalogs, replacement of a profile XPI, old-version
cleanup, a second setup run as update, both registry views, and complete
uninstallation. It does not read or modify a real Thunderbird profile and does
not quit or launch Thunderbird.

## Manual acceptance test

1. Save open drafts and start the installer without administrator rights.
2. Select **Deutsch**, accept the GPL, and confirm the controlled Thunderbird
   restart explanation. Setup must not continue without license acceptance.
3. Thunderbird must quit normally and restart afterwards. Setup must never
   force-terminate it.
4. Accept any one-time prompt enabling the side-loaded add-on and its message
   modification, movement, and deletion permissions.
5. Confirm the add-on appears and existing API settings remain present.
6. Select OpenAI, Claude, Mistral, DeepSeek, and the custom endpoint in settings;
   OpenAI must be the default. With an available key, summarise an email and run
   the API test. The popup must show **Version 3.3.1** and German UI.
7. Select **English**, save, and confirm popup, reply editor, and help switch to
   English and retain the choice after restart.
8. Run the English installer again and confirm an in-place update.
9. Leave the dashboard open in a tab before updating. The first dashboard start
   afterwards must replace old AI dashboard tabs with exactly one fresh tab and
   preserve normal Thunderbird tabs. Repeated toolbar clicks must focus the
   existing dashboard. Confirm independent overlay/tab preferences and
   content-free support diagnostics.
10. Uninstall through Windows **Installed apps**, restart Thunderbird, and
    confirm the add-on is removed.

The test build is not Authenticode-signed and can trigger SmartScreen. A public
release installer must pass the protected pipeline's publisher and timestamp
checks before upload. Verify the downloaded public release with
`Get-AuthenticodeSignature`; require `Status: Valid`, the expected publisher,
and a timestamp certificate. See [Windows code signing and
SmartScreen](windows-code-signing.md). Signing substantially improves trust but
does not guarantee immediate SmartScreen reputation for a new publisher.
