# Manual acceptance testing

> [Deutsche Version](manual-testing.de.md)

Use disposable messages and preserve drafts before installer or delete tests.
The automated suite remains the first validation layer; this checklist covers
Thunderbird behavior that mocks cannot prove.

## Dashboard loading and views

1. Open the global dashboard and confirm loading ends with supported accounts,
   newest unread mail first, and a grouped View panel whose open/closed state is
   retained.
2. Switch between per-account and combined latest-50 views. Confirm the global
   candidate limit, originating account labels, and persistent selection.
3. Test all date, participant, sender, count, score, and analysed-state filters
   and sorts, including global cross-account score sorting.
4. Confirm sender search preserves selections outside the current search result
   and date boundaries are inclusive.
5. Enable local previews, change the global line count, and confirm only the
   visible limited message slice loads content.

## Selection, bulk analysis, and corrections

6. Exercise individual selection and Select all; both top and bottom bulk bars
   must remain synchronized.
7. Analyse a mixed selection. Only unanalysed messages receive scores; normal
   analysis skips existing scores. Re-analysis requires confirmation and must
   not delete saved correction references.
8. Correct importance, spam, and risk independently with different reasons and
   notes. Confirm validation rejects a no-op, filters update immediately, and
   values survive reopening.
9. Delete the corrected source message and confirm its separate learning record
   remains manageable under Settings.

## Single-message actions

10. From the dashboard open Summary, Suggest reply, AI Chat, and single-message
    analysis. Equivalent workspaces for the same message/mode should focus an
    existing tab where Thunderbird supports tab detection.
11. Confirm three action columns and equivalent right-click actions: AI actions,
    reading options, and email actions. Switch between direct titled groups and
    grouped submenus; hover, click, and keyboard navigation must remain usable.
12. With global preview disabled, load only one message preview. `+` adds four
    visible lines up to 20, `−` resets, the expand icon opens the original mail
    in a tab, and `×` removes only that preview.
13. Mark one and several messages read. Successful messages disappear from the
    unread view while partial failures are reported without rolling back success.

## Reply workflow

14. Test plain-text and HTML summaries.
15. Generate a reply and confirm only the middle editor scrolls. Refine it once,
    edit it manually, and test copy plus native compose handoff.
16. Verify Reply All, original quote, and attachment options, their persisted
    defaults, safe HTML escaping, and identity selection from exact recipients
    before the source account default.
17. Force a compose failure and confirm the current draft is copied while it
    remains visible.

## Delete, archive, and PDF export

18. Cancel and confirm single and bulk deletion using disposable mail. Success
    appears only after refresh proves removal; background diagnostics contain no
    email content or internal message IDs.
19. Configure Thunderbird yearly archives and test messages from different
    years/accounts. Native account/identity settings must control each target.
20. Run **Check archive folders** and confirm only Thunderbird-designated
    archives appear. The help action must open official guidance without
    changing mail or settings.
21. With PDF Archiver enabled, export one dashboard message and confirm its
    review dialog receives exactly that message. Disabled or incompatible
    installations must show the safe GitHub installation/update path.

## Providers, scoring, and resilience

22. Complete the [provider acceptance test](api-keys/README.md#shared-provider-acceptance-test)
    for each available provider. Built-in URLs remain read-only; unsaved provider
    profiles remain separate; a custom host requests only its exact permission.
23. Test newsletter/bulk signals and sender frequency, then confirm an explicit
    wanted-sender correction overrides the local spam floor.
24. Trigger one temporary provider failure. The UI remains loading across
    bounded retries and eventually reports a specific network, timeout, rate,
    server, key, or credit error.
25. Trigger one transient local correction-save failure and confirm the stable
    message identity produces at most one archive entry.

## Language, persistence, and recovery

26. Switch the UI to English and German and verify dashboard, popup, reply
    editor, settings, help, errors, and accessibility text follow the selection
    after restart.
27. Confirm usage statistics show provider/model token counts and the dated,
    limited OpenAI USD estimate without exposing keys.
28. Test overlay/tab preferences independently. Exercise the fifth-open and
    repeated-fullscreen adoption prompts, Later cycles, permanent dismissal,
    and focus of an existing dashboard tab.
29. Update while a dashboard tab is open. The first launch must replace stale AI
    dashboard tabs with exactly one fresh tab without closing normal Thunderbird
    tabs. A stalled tab action must time out and allow a later retry.
30. Confirm support diagnostics show add-on/Thunderbird versions and bounded,
    content-free action boundaries, including a controlled failure.
31. Scroll dashboard and single-message views. The floating top button appears
    only away from the top and both bulk bars remain synchronized.

The single-message popup must show version 3.1.3. The dashboard uses unread
status only as its candidate filter; analysis performed outside the dashboard
does not automatically create a dashboard score record.
