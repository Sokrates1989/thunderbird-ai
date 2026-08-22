# macOS-Installer testen

Das primäre macOS-Artefakt heißt
`Thunderbird-AI-Setup-3.0.1-macos.pkg`. Es verwendet ausschließlich die
macOS-Installationsdomäne des aktuellen Benutzerverzeichnisses und benötigt
keine Administratorrechte.

## Automatisierter Isolationstest

Vom Repository-Stamm auf macOS aus:

```bash
./installer/macos/test-setup.sh
```

Der Test verwendet ausschließlich ein mit `mktemp` erzeugtes Verzeichnis. Er
baut die XPI und das native Paket, prüft die Benutzer-Installationsdomäne, die
Thunderbird-Schließanforderung, den enthaltenen XPI-Pfad, die automatische
Sprachübergabe sowie Installation und Aktualisierung in zwei künstlichen
Profilen. Während dieses Isolationstests wird ein echtes Thunderbird-Profil
weder gelesen noch verändert und Thunderbird nicht beendet oder gestartet; der
enthaltene automatische Startbefehl wird stattdessen statisch geprüft.

## Manueller Abnahmetest

1. Thunderbird mindestens einmal starten und anschließend eine E-Mail sowie
   einen ungespeicherten Testentwurf öffnen.
2. `artifacts/Thunderbird-AI-Setup-3.0.1-macos.pkg` öffnen. Die GPL-Lizenzseite lesen und bestätigen. Im
   Installationsprogramm muss der lokalisierte Hinweis zur benutzerbezogenen
   Installation und zum sicheren Thunderbird-Beenden erscheinen. Es darf keine
   Administratorabfrage geben.
3. Die Installation zunächst mit geöffnetem Thunderbird fortsetzen. macOS muss
   zum normalen Beenden auffordern. Den Entwurf speichern und fortfahren;
   Thunderbird darf nicht erzwungen beendet werden.
4. Nach erfolgreicher Installation muss Thunderbird automatisch geöffnet werden.
   Eine mögliche einmalige Aktivierungs- oder Berechtigungsabfrage bestätigen.
   **AI Mail Assistant for Thunderbird** muss unter
   **Add-ons und Themes** erscheinen.
   Ein beim Start wiederhergestelltes Dashboard muss den E-Mail-Zugriff bei noch
   nicht bereitem Thunderbird begrenzt wiederholen und anschließend entweder die
   ungelesenen Nachrichten anzeigen oder mit wieder aktivierter Aktualisieren-
   Schaltfläche enden; der Ladezustand darf nicht dauerhaft sichtbar bleiben.
5. Eine E-Mail öffnen, die Zusammenfassung ausführen und den API-Test in den
   Einstellungen aufrufen. Im Einzelmail-Popup muss **Version 3.0.1** stehen.
6. Eine abweichende Sprache unter **Einstellungen** speichern und nach einem
   Thunderbird-Neustart prüfen, dass sie erhalten bleibt.
7. Den Installer erneut ausführen. Die vorhandene Installation muss ohne
   vorherige Deinstallation aktualisiert werden; API-Schlüssel und gespeicherte
   Einstellungen müssen erhalten bleiben.
8. Wenn mehrere Thunderbird-Profile vorhanden sind, jedes Profil starten und
   prüfen, dass dieselbe Add-on-Version erkannt wird.
9. Das Add-on über Thunderbirds Add-on-Verwaltung entfernen und Thunderbird
   neu starten. Es darf in diesem Profil nicht mehr geladen werden.

Das aktuelle Testpaket ist nicht mit einer Apple Developer ID signiert und
nicht notarisiert. Vor einem öffentlichen Release muss das Paket mit einer
Developer-ID-Installer-Identität gebaut, von Apple notarisiert und zusammen mit
seiner SHA-256-Prüfsumme veröffentlicht werden.
