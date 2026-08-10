# Windows-Installer testen

Das primäre Windows-Artefakt heißt
`Thunderbird-AI-Setup-1.9.1-win-x64.exe`. Es installiert das Add-on nur für den
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
2. Im Sprachdialog **Deutsch** wählen und die Erklärung zum kontrollierten Thunderbird-Neustart bestätigen.
3. Prüfen, dass Thunderbird normal beendet und anschließend wieder gestartet
   wird. Der Installer darf den Prozess niemals erzwingen.
4. Eine mögliche einmalige Thunderbird-Rückfrage zur Aktivierung des seitlich
   installierten Add-ons bestätigen.
5. Prüfen, dass **Thunderbird AI Assistant** unter Add-ons erscheint und die
   vorhandenen API-Einstellungen erhalten geblieben sind.
6. Eine E-Mail öffnen, die Zusammenfassung ausführen und den API-Test in den
   Einstellungen aufrufen. Im Einzelmail-Popup muss **Version 1.9.1** stehen und die Oberfläche muss deutsch sein.
7. In den Einstellungen **English** wählen und speichern. Popup, Antworteditor und Hilfe müssen anschließend englisch erscheinen; nach einem Thunderbird-Neustart muss die Auswahl erhalten bleiben.
8. Den Installer erneut auf Englisch ausführen und kontrollieren, dass das Update ohne
   vorherige Deinstallation funktioniert.
9. Über Windows **Installierte Apps** deinstallieren und nach einem
   Thunderbird-Neustart prüfen, dass das Add-on entfernt wurde.

Der aktuelle Test-Build ist nicht Authenticode-signiert und kann deshalb eine
SmartScreen-Warnung auslösen. Vor einem öffentlichen Release sollte der
Installer signiert und seine SHA-256-Prüfsumme veröffentlicht werden.
