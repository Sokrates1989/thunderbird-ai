# Reviewer-Build für Thunderbird Add-ons

> [English version](ATN_SOURCE_BUILD.md)

Dieses Quellarchiv gehört zu AI Mail Assistant for Thunderbird 3.3.4. Es
enthält den vollständigen menschenlesbaren Quellcode der eingereichten XPI. Das
Add-on minimiert oder verschleiert keinen Code und lädt keinen entfernten Code
herunter oder führt ihn aus.

## Umgebung

- Linux, macOS oder Windows 11 über WSL 2;
- Bash;
- Node.js 20 oder neuer;
- `zip` und `unzip`.

Für den XPI-Build sind weder Paketmanager-Installation noch Netzwerkzugriff
erforderlich. Unter Windows WSL öffnen, über den Pfad `/mnt/<laufwerk>/...` in
das Repository wechseln und dieselben folgenden Befehle ausführen. Das
Repository erzwingt für Shell-Skripte LF-Zeilenenden, damit der gestagte
Reviewer-Build auch von Windows reproduzierbar ist.

## Eingereichte XPI bauen

Vom Stamm des Quellarchivs:

```bash
mkdir -p artifacts
./build-addon.sh --output artifacts/thunderbird-ai-3.3.4.xpi
```

Der Build flacht die eingecheckten Verzeichnisse `thunderbird-ai/` und
`common/` in das XPI-Stammverzeichnis ab, kopiert die englischen und deutschen
Sprachkataloge, ergänzt die GPL-Lizenz und erzeugt `install-defaults.json` für
Version 3.3.4.

## Validieren

```bash
npm test
unzip -t artifacts/thunderbird-ai-3.3.4.xpi
unzip -p artifacts/thunderbird-ai-3.3.4.xpi manifest.json
```

Das gepackte Manifest muss Version `3.3.4`, die Erweiterungs-ID
`thunderbird-ai@felicitas-wisdom.com`, Thunderbird 128.0 oder neuer sowie die
Berechtigung `sensitiveDataUpload` melden.

## Offenlegung der Laufzeitdienste

Der Benutzer wählt OpenAI, Claude (Anthropic), Mistral, DeepSeek oder einen
kompatiblen individuellen Endpunkt und stellt den erforderlichen API-Schlüssel
bereit. Nur eine ausdrückliche AI-Aktion sendet ausgewählte Maildaten direkt aus
Thunderbird an diesen Dienst. Die integrierten Ziele sind
`https://api.openai.com/`, `https://api.anthropic.com/`,
`https://api.mistral.ai/` und `https://api.deepseek.com/`. Individuelle Dienste
müssen HTTPS verwenden; nur Loopback-Entwicklungsendpunkte dürfen HTTP nutzen
und benötigen eine aus einer Benutzeraktion angeforderte exakte
Host-Berechtigung. Das Add-on besitzt keinen vom Maintainer betriebenen Dienst.
Alle Datenkategorien und Aufbewahrungsgrenzen stehen in `PRIVACY.de.md` und den
Reviewer-Hinweisen unter `docs/atn-submission.de.md`.
