# Windows-Installer testen

> [English version](windows-installer-testing.md)

Das primäre Windows-Artefakt heißt
`Thunderbird-AI-Setup-3.3.3-win-x64.exe`. Es installiert das Add-on nur für den
aktuellen Benutzer und benötigt keine Administratorrechte.

## Automatisierter Isolationstest

Vom Repository-Stamm aus:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\test-setup.ps1
```

Der Test verwendet ausschließlich
`%LOCALAPPDATA%\ThunderbirdAIInstallerTest` und
`HKCU\Software\ThunderbirdAIInstallerTest`. Er prüft Installation, gültige
XPI-Pfade für beide Sprachkataloge, Aktualisierung einer vorhandenen Profil-XPI,
Bereinigung veralteter XPI-Versionen, eine zweite Setup-Ausführung als Update,
beide Registry-Ansichten und die vollständige Deinstallation. Ein echtes
Thunderbird-Profil wird weder gelesen noch verändert und Thunderbird wird nicht
beendet oder gestartet.

## Manueller Abnahmetest

1. Offene Entwürfe speichern und den Installer ohne Administratorrechte starten.
2. Im Sprachdialog **Deutsch** wählen, die GPL-Lizenzseite bestätigen und prüfen,
   dass der Hinweis das normale automatische Beenden sowie den standardmäßigen
   Neustart nach der Installation erklärt. Ohne Lizenzbestätigung darf Setup
   nicht fortfahren.
3. Prüfen, dass Thunderbird normal beendet und anschließend wieder gestartet
   wird. Der Installer darf den Prozess niemals erzwingen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung des seitlich
   installierten Add-ons und zu den Berechtigungen zum Ändern, Verschieben und Löschen von Nachrichten bestätigen.
5. Prüfen, dass **AI Mail Assistant for Thunderbird** unter Add-ons erscheint und die
   vorhandenen API-Einstellungen erhalten geblieben sind.
6. In den Einstellungen OpenAI, Claude, Mistral, DeepSeek und den individuellen
   Endpunkt auswählen; OpenAI muss der Standard sein. Mit einem verfügbaren
   Testschlüssel eine E-Mail öffnen, die Zusammenfassung ausführen und den
   API-Test aufrufen. Im Einzelmail-Popup muss **Version 3.3.3** stehen und die
   Oberfläche muss deutsch sein.
7. In den Einstellungen **English** wählen und speichern. Popup, Antworteditor und Hilfe müssen anschließend englisch erscheinen; nach einem Thunderbird-Neustart muss die Auswahl erhalten bleiben.
8. Den Installer erneut auf Englisch ausführen und kontrollieren, dass das Update ohne
   vorherige Deinstallation funktioniert.
9. Das Dashboard vor der zweiten Setup-Ausführung in einem eigenen Tab geöffnet lassen. Beim ersten Dashboard-Start nach dem Update müssen alle alten AI-Dashboard-Tabs geschlossen werden und genau ein frischer Dashboard-Tab entstehen. Normale Thunderbird-Tabs dürfen nicht geschlossen werden. Das globale Toolbar-Symbol danach erneut anklicken: Der frische Tab muss aktiviert werden; es darf kein zweiter Dashboard-Tab entstehen. Nach einigen Dashboard-Aktionen erneut klicken und prüfen, dass der Tab weiterhin fokussiert wird. Unter **Einstellungen → AI Assistant öffnen** müssen Dashboard und Einzelmail-Ansicht unabhängig zwischen Overlay und Tab wechseln. Unter **Support-Diagnose** müssen der letzte Start und die letzten inhaltsfreien Aktivitätsgrenzen nachvollziehbar und kopierbar sein.
10. Über Windows **Installierte Apps** deinstallieren und nach einem
   Thunderbird-Neustart prüfen, dass das Add-on entfernt wurde.

Der aktuelle Test-Build ist nicht Authenticode-signiert und kann deshalb eine
SmartScreen-Warnung auslösen. Ein öffentlicher Release-Installer muss vor dem
Upload die Herausgeber- und Zeitstempelprüfung der geschützten Pipeline
bestehen. Beim heruntergeladenen öffentlichen Release muss
`Get-AuthenticodeSignature` den Status `Valid`, den erwarteten Herausgeber und
ein Zeitstempelzertifikat zeigen. Details stehen unter
[Windows-Codesignatur und SmartScreen](windows-code-signing.de.md). Eine
Signatur verbessert das Vertrauen erheblich, garantiert bei einem neuen
Herausgeber aber nicht sofortige SmartScreen-Reputation.
