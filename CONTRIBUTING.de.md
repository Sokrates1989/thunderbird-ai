# Mitwirken

> [English version](CONTRIBUTING.md)

Danke für Verbesserungen an AI Mail Assistant for Thunderbird. Das Repository
forken, einen fokussierten Branch erstellen und einen Pull Request gegen `main`
öffnen. Fehlerberichte und Feature-Vorschläge gehören vor breiten oder
kompatibilitätsbrechenden Arbeiten in GitHub Issues.

## Entwicklungsprüfungen

Vom Repository-Stamm mit Node.js 20 oder neuer:

```bash
node --test tests/*.test.mjs
./build-addon.sh
./installer/macos/test-setup.sh
```

Änderungen am Windows-Installer benötigen zusätzlich die PowerShell- und
Inno-Setup-Prüfungen aus [Windows-Installer testen](docs/windows-installer-testing.de.md).

Deutsche und englische UI-Texte sowie Dokumentation müssen synchron bleiben.
API-Schlüssel, Mailinhalte, Profildaten, erzeugte Installer und andere
personenbezogene Daten gehören nicht in Commits oder Test-Fixtures.

## Lizenz der Beiträge

Mit einem Beitrag stimmst du seiner Verteilung unter der
[GNU General Public License Version 3 oder neuer](LICENSE) zu und bestätigst,
dass du ihn selbst erstellt hast oder ihn unter diesen Bedingungen einreichen
darfst.
