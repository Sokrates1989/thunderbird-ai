<#
.SYNOPSIS
Creates local synthetic email messages for Thunderbird Add-ons screenshots.

.DESCRIPTION
Writes standalone .eml files that use only reserved example identities and
URLs. The script never connects to a mail server and never sends email.

.PARAMETER Count
Number of messages to create. The default is 50.

.PARAMETER OutputDirectory
Optional destination. When omitted, a timestamped directory is created below
the repository's ignored artifacts directory.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\New-AtnSyntheticMessages.ps1
#>

[CmdletBinding()]
param(
    [ValidateRange(1, 500)]
    [int] $Count = 50,

    [string] $OutputDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutputDirectory = Join-Path $repositoryRoot "artifacts\atn-synthetic-messages-$timestamp"
}

$absoluteOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $absoluteOutputDirectory) {
    $existingItem = Get-ChildItem -LiteralPath $absoluteOutputDirectory -Force |
        Select-Object -First 1
    if ($null -ne $existingItem) {
        throw "Output directory is not empty: $absoluteOutputDirectory"
    }
} else {
    New-Item -ItemType Directory -Path $absoluteOutputDirectory -Force | Out-Null
}

$scenarios = @(
    [pscustomobject]@{
        Category = 'Project update'
        SenderName = 'Alex Morgan'
        SenderAddress = 'alex.morgan@example.com'
        Subject = 'Orion project status and next steps'
        Body = @'
Hello team,

The Orion migration remains on schedule. The staging environment passed the
first acceptance checks, and the documentation review is planned for Thursday.

Please review the three open decisions before our 10:00 meeting:
- final archive retention period;
- owner for the support handover;
- date of the production rehearsal.

No urgent action is needed today.
'@
    },
    [pscustomobject]@{
        Category = 'Meeting'
        SenderName = 'Priya Shah'
        SenderAddress = 'priya.shah@example.com'
        Subject = 'Agenda for the quarterly planning workshop'
        Body = @'
Hi,

Here is the proposed agenda for Friday's planning workshop:
1. Review the previous quarter.
2. Select the next customer research themes.
3. Confirm owners and delivery dates.

Please send optional agenda additions by Wednesday afternoon.
'@
    },
    [pscustomobject]@{
        Category = 'Customer request'
        SenderName = 'Jordan Lee'
        SenderAddress = 'jordan.lee@example.com'
        Subject = 'Question about exporting archived results'
        Body = @'
Hello support,

Could you explain whether archived analysis results can be exported as CSV?
We need a readable report for an internal review next week. A short set of
instructions would be sufficient; this is not blocking our current work.

Thank you.
'@
    },
    [pscustomobject]@{
        Category = 'Important deadline'
        SenderName = 'Marta Fischer'
        SenderAddress = 'marta.fischer@example.com'
        Subject = 'Approval required by 16:00: release notes'
        Body = @'
Guten Morgen,

die finalen Versionshinweise sind bereit. Bitte pruefe heute bis 16:00 Uhr die
Abschnitte Datenschutz und bekannte Einschraenkungen. Ohne Freigabe verschiebt
sich die geplante Veroeffentlichung auf naechste Woche.

Viele Gruesse
Marta
'@
    },
    [pscustomobject]@{
        Category = 'Travel'
        SenderName = 'Example Travel Desk'
        SenderAddress = 'travel@example.com'
        Subject = 'Draft itinerary for the Berlin workshop'
        Body = @'
Hello,

Your synthetic workshop itinerary is ready for review. The train arrives in
Berlin at 09:12, hotel check-in begins at 15:00, and the workshop starts the
following morning at 09:30.

Please confirm the itinerary by the end of the week.
'@
    },
    [pscustomobject]@{
        Category = 'Newsletter'
        SenderName = 'Example Product Bulletin'
        SenderAddress = 'bulletin@example.com'
        Subject = 'August product bulletin: accessibility improvements'
        Body = @'
This month's fictional product bulletin covers keyboard navigation, clearer
status messages, and improved high-contrast styling. The full demonstration is
available at https://example.com/product-bulletin.

This is an informational newsletter. No response is requested.
'@
    },
    [pscustomobject]@{
        Category = 'Invoice'
        SenderName = 'Example Accounts'
        SenderAddress = 'accounts@example.com'
        Subject = 'Invoice EX-1042 available for review'
        Body = @'
Hello,

The fictional invoice EX-1042 for EUR 128.40 is ready for review. The stated
payment date is 15 September. Please compare it with purchase order PO-7781
before marking it approved.

No payment link or real financial information is included in this test email.
'@
    },
    [pscustomobject]@{
        Category = 'Suspicious message'
        SenderName = 'Example Security Notice'
        SenderAddress = 'security-notice@example.com'
        Subject = 'URGENT: mailbox access expires today'
        Body = @'
Your mailbox access will allegedly expire in two hours. The message asks you to
verify your password immediately at https://example.com/synthetic-login and to
ignore normal support procedures.

This is a deliberately suspicious synthetic message. Do not follow links or
enter credentials. It exists only to demonstrate risk and spam analysis.
'@
    },
    [pscustomobject]@{
        Category = 'Positive feedback'
        SenderName = 'Taylor Kim'
        SenderAddress = 'taylor.kim@example.com'
        Subject = 'Feedback from the assistant usability session'
        Body = @'
Hi team,

The test participants found the new summary layout easier to scan. They liked
the clearer headings and the distinction between user and assistant messages.
The main remaining suggestion is to make the empty state more explanatory.

Great progress overall.
'@
    },
    [pscustomobject]@{
        Category = 'Low priority reminder'
        SenderName = 'Example Office Team'
        SenderAddress = 'office@example.com'
        Subject = 'Optional office survey closes next Friday'
        Body = @'
Hello,

The optional fictional office survey closes next Friday. It contains five
questions about meeting rooms and quiet working areas. Participation is useful
but not required.
'@
    }
)

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
$manifest = [System.Collections.Generic.List[object]]::new()
$baseDate = Get-Date

for ($index = 1; $index -le $Count; $index += 1) {
    $scenario = $scenarios[($index - 1) % $scenarios.Count]
    $series = [Math]::Floor(($index - 1) / $scenarios.Count) + 1
    $messageDate = $baseDate.AddMinutes(-47 * ($index - 1))
    $subject = if ($series -eq 1) {
        $scenario.Subject
    } else {
        "$($scenario.Subject) - follow-up $series"
    }
    $messageId = "atn-synthetic-{0:D3}-{1}@example.com" -f $index, $baseDate.ToString('yyyyMMddHHmmss')
    $rfcTimeZone = $messageDate.ToString('zzz').Replace(':', '')
    $body = @(
        $scenario.Body.Trim()
        ''
        '---'
        'Synthetic ATN review message. All people, addresses, events, amounts, and URLs are fictional.'
    ) -join "`r`n"
    $message = @(
        "From: $($scenario.SenderName) <$($scenario.SenderAddress)>"
        'To: ATN Screenshot Account <reviewer@example.invalid>'
        "Date: $($messageDate.ToString('ddd, dd MMM yyyy HH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture)) $rfcTimeZone"
        "Subject: $subject"
        "Message-ID: <$messageId>"
        'MIME-Version: 1.0'
        'Content-Type: text/plain; charset=UTF-8'
        'Content-Transfer-Encoding: 8bit'
        'X-ATN-Synthetic: true'
        "X-ATN-Category: $($scenario.Category)"
        ''
        $body
        ''
    ) -join "`r`n"

    $fileName = 'atn-synthetic-{0:D3}.eml' -f $index
    $filePath = Join-Path $absoluteOutputDirectory $fileName
    [System.IO.File]::WriteAllText($filePath, $message, $utf8WithoutBom)
    $manifest.Add([pscustomobject]@{
        File = $fileName
        Date = $messageDate.ToString('yyyy-MM-dd HH:mm:ss zzz')
        Category = $scenario.Category
        From = "$($scenario.SenderName) <$($scenario.SenderAddress)>"
        Subject = $subject
    })
}

$manifestPath = Join-Path $absoluteOutputDirectory 'manifest.csv'
$manifest | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8

$instructions = @"
ATN synthetic Thunderbird messages
==================================

These $Count messages are local test data. No email was sent.

Import on Windows:
1. In Thunderbird, create a subfolder named "ATN Synthetic Mail" directly under Local Folders.
2. In File Explorer, select all .eml files in this directory.
3. Drag them onto the "ATN Synthetic Mail" folder in Thunderbird's folder pane.
4. Use only this folder for screenshots and reviewer testing.

Cleanup:
- Delete the "ATN Synthetic Mail" folder in Thunderbird.
- Delete this generated directory when it is no longer needed.

If bulk drag-and-drop does not import every file, repeat with smaller groups.
"@
[System.IO.File]::WriteAllText(
    (Join-Path $absoluteOutputDirectory 'README.txt'),
    $instructions.Trim() + "`r`n",
    $utf8WithoutBom
)

Write-Output "Created $Count local synthetic messages."
Write-Output "Directory: $absoluteOutputDirectory"
Write-Output 'No email was sent and no network connection was used.'
