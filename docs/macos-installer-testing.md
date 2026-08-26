# Test the macOS installer

> [Deutsche Version](macos-installer-testing.de.md)

The primary macOS artifact is
`Thunderbird-AI-Setup-3.5.1-macos.pkg`. It uses only the current-user macOS
installation domain and requires no administrator privileges.

## Automated isolation test

From the repository root on macOS:

```bash
./installer/macos/test-setup.sh
```

The test uses only a directory created with `mktemp`. It builds the XPI and
native package, verifies the user installation domain, Thunderbird quit
request, embedded XPI path, automatic language handoff, and install/update in
two synthetic profiles. It neither reads nor modifies a real profile and does
not quit or launch Thunderbird; the packaged launch command is inspected
statically.

## Manual acceptance test

1. Start Thunderbird at least once, then open an email and an unsaved test
   draft.
2. Open `artifacts/Thunderbird-AI-Setup-3.5.1-macos.pkg`, read and accept the GPL,
   and confirm the localized current-user and safe-quit guidance. No
   administrator prompt may appear.
3. Continue while Thunderbird is open. macOS must request a normal quit. Save
   the draft; Thunderbird must never be force-terminated.
4. Thunderbird must open automatically after installation. Accept any one-time
   activation or permission prompt and confirm the add-on appears under
   **Add-ons and Themes**. A restored dashboard must either load unread mail or
   end with refresh re-enabled; loading must not remain indefinitely.
5. Select OpenAI, Claude, Mistral, DeepSeek, and the custom endpoint in settings;
   OpenAI must be the default. With an available test key, summarise an email
   and run the API test. The single-message popup must show **Version 3.5.1**.
6. Save a different UI language and confirm it survives a Thunderbird restart.
7. Run the installer again. It must update without prior removal and preserve
   API keys and settings.
8. If several profiles exist, confirm each detects the same add-on version.
9. Remove the add-on through Thunderbird, restart it, and confirm the add-on no
   longer loads in that profile.

The test package is not Apple Developer ID-signed or notarized. A public build
must be signed with a Developer ID Installer identity, notarized by Apple, and
published with its SHA-256 checksum.
