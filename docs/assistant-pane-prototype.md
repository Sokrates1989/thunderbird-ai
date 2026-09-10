# Persistent AI assistant pane prototype

This prototype tests whether Thunderbird can display the original email and an AI conversation side by side in the main mail tab:

`folder list | message list and email body | AI assistant`

It is intentionally separate from the normal release package. The prototype uses a Thunderbird Experiment API to extend the internal `about:3pane` layout. Experiment APIs receive unrestricted Thunderbird privileges and require manual review. They are unsuitable for a normal ATN release until the approach and review path have been agreed.

## Build

From the repository root, run:

```powershell
.\build-assistant-pane-prototype.ps1
```

The build produces both `artifacts/thunderbird-ai-assistant-pane-prototype-<version>.xpi` and an unpacked directory with the same name. The source manifest and the standard `build-addon.ps1` output remain unchanged.

## Test safely

Use a disposable Thunderbird profile. Custom Experiment APIs require privileged signing for normal installation, so the XPI is primarily a reproducible package for inspection. Load the unpacked build as a temporary add-on for local testing. The prototype has the same extension ID as the regular add-on and should not be loaded over a profile you rely on.

1. Start Thunderbird with the Profile Manager and create a dedicated test profile.
2. Open **Tools > Developer Tools > Debug Add-ons** (or open **Add-ons and Themes**, select the gear menu, and choose **Debug Add-ons**).
3. Select **Load Temporary Add-on…** and choose `manifest.json` inside the unpacked prototype directory.
4. Configure an AI provider on the add-on settings page.
5. Open a mail tab and select an email.
6. Select the **AI** button at the right end of the message-list header.
7. Confirm that the source email remains visible while the assistant pane opens to its right.
8. Ask a question or select **Summarize this email**.
9. Select another email, then return to the first one. Each email should retain its own conversation for the lifetime of the pane.
10. Drag the divider, close the pane, and open it again. The most recently used width should be restored. To test a Thunderbird restart, load the temporary add-on again and verify the stored width.

Also test Thunderbird's classic, vertical, and wide layouts. The pane follows the displayed email and never rewrites the message body.

## Useful debugging information

If the pane does not appear or chat fails, collect:

- Thunderbird version and operating system;
- selected Thunderbird layout;
- whether the **AI** button appears;
- exact steps from Thunderbird startup to the failure;
- a screenshot of the complete mail tab;
- errors from **Tools > Developer Tools > Error Console** containing `assistant pane`, `aiAssistantPane`, or the first related stack trace;
- whether the standard detached single-email AI view still works with the same provider settings.

Do not include API keys, tokens, full email content, or other secrets in logs or screenshots.

## Current limitations

- This is a feasibility prototype, not a production release.
- Temporary add-ons are removed from Thunderbird on restart and must be loaded again.
- Conversations are kept only while the embedded pane remains alive.
- The integration depends on Thunderbird's internal three-pane document and may need compatibility updates for future Thunderbird versions.
- Add-ons using a custom Experiment API require elevated trust and a separate distribution/review decision.
