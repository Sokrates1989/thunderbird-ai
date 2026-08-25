# Individuellen AI-Endpunkt einrichten

> [English version](README.md)

Bei einem individuellen Endpunkt stellt nicht das Add-on, sondern der Betreiber
des gewählten Dienstes den API-Schlüssel und die Modell-ID bereit. Das gilt zum
Beispiel für selbst gehostete, lokale oder andere kompatible AI-Dienste.

Der Dienst muss eines dieser Protokolle anbieten:

- OpenAI Chat Completions
- OpenAI Responses
- Anthropic Messages

Eine nur ähnlich benannte proprietäre API ist nicht automatisch kompatibel.

## Zugangsdaten beschaffen

In der Dokumentation oder Administrationsoberfläche des konkreten Dienstes
werden benötigt:

1. die **API-Basis-URL**,
2. das unterstützte **Protokoll**,
3. die **Authentifizierung** (`Bearer`, `x-api-key` oder keine),
4. der **API-Schlüssel**, falls erforderlich,
5. mindestens eine exakte **Modell-ID**.

Der Schlüssel darf nur beim tatsächlichen Betreiber des Endpunkts angefordert
werden. Niemals einen OpenAI-, Anthropic-, Mistral- oder DeepSeek-Schlüssel an
einen unbekannten Drittanbieter-Endpunkt senden.

## Gehostetes Beispiel: Hugging Face Inference Providers

Hugging Face kann ohne eigene Modellbereitstellung verwendet werden. Der Hub
katalogisiert Modellgewichte und Metadaten, während die
[Inference Providers](https://huggingface.co/docs/inference-providers/index)
kompatible Anfragen an Hugging Face oder einen beteiligten Rechenanbieter
weiterleiten. Davon unterscheidet sich ein dedizierter Inference Endpoint, der
reservierte Infrastruktur für ein einzelnes Konto bereitstellt.

Ein Modell mit offenen Gewichten bedeutet nicht, dass die API unbegrenzt
kostenlos nutzbar ist. Hugging Face kann ein kleines monatliches
Inference-Guthaben enthalten; zusätzliche Nutzung erfordert bezahltes Guthaben.
Vor dem Test die aktuelle Seite zu
[Preisen und Abrechnung](https://huggingface.co/docs/inference-providers/pricing)
prüfen.

### Token erstellen

1. Bei Hugging Face anmelden und [User Access Tokens](https://huggingface.co/settings/tokens)
   öffnen.
2. Einen eigenen **Fine-grained**-Token für Thunderbird erstellen.
3. **Make calls to Inference Providers** aktivieren. Ohne anderweitigen Bedarf
   keinen Schreibzugriff auf Repositories gewähren.
4. Den `hf_...`-Token direkt in Thunderbird kopieren. Niemals in Git,
   Screenshots, Support-Nachrichten oder den Shell-Verlauf übernehmen.

Im [Hugging Face Playground](https://huggingface.co/playground) lässt sich vor
der Thunderbird-Einrichtung prüfen, ob Konto, Modell und verfügbares Guthaben
funktionieren.

### Hugging-Face-Konfiguration eintragen

Für den ersten Test diese Werte verwenden:

| Thunderbird-Einstellung | Wert |
| --- | --- |
| AI-Anbieter | `Individueller Endpunkt` |
| API-Basis-URL | `https://router.huggingface.co/v1` |
| Protokoll | `OpenAI Chat Completions` |
| Authentifizierung | `Bearer` |
| API-Schlüssel | Der eigene `hf_...`-Token |
| Standard-Modell-ID | `openai/gpt-oss-120b:cheapest` |
| Aufgabenspezifische Modelle | `Automatisch` |

Das Add-on ergänzt `/chat/completions`. Die resultierende Anfrage-URL lautet
deshalb `https://router.huggingface.co/v1/chat/completions`. Als API-Basis weder
eine Modellseite noch die ältere Text-Generation-URL verwenden.

Das Suffix steuert das Routing:

- `:cheapest` wählt den derzeit günstigsten Anbieter für dieses Modell,
- `:fastest` wählt den Anbieter mit dem derzeit höchsten Durchsatz und
- ein Anbieter-Suffix wie `:cerebras` bindet die Anfrage an diesen Anbieter.

Modellverfügbarkeit, Routing und Preise können sich ändern. Im Playground ein
aktuell angebotenes Chat-Completion-Modell auswählen. Für einen reproduzierbaren
Abnahmetest einen Anbieter festlegen und die exakte Modell-/Anbieter-Kombination
dokumentieren, statt sich auf `:cheapest` oder `:fastest` zu verlassen.

Hugging Face kann die Anfrage an den ausgewählten Rechenanbieter weiterleiten.
Beim ersten Test ausschließlich synthetische E-Mails verwenden. Vor realen oder
vertraulichen Nachrichten die Datenschutz- und Aufbewahrungsbedingungen von
Hugging Face und dem ausgewählten Anbieter prüfen.

### Hugging Face unter Windows unabhängig prüfen

Diese optionale PowerShell-Anfrage trennt Fehler bei Hugging-Face-Konto, Token,
Modell oder Guthaben von Thunderbird-Konfigurationsfehlern. Der Token wird
sicher abgefragt und nicht in den Befehlsverlauf geschrieben:

```powershell
$secureToken = Read-Host "Hugging Face token" -AsSecureString
$hfToken = [System.Net.NetworkCredential]::new('', $secureToken).Password
try {
    $headers = @{ Authorization = "Bearer $hfToken" }
    $body = @{
        model = 'openai/gpt-oss-120b:cheapest'
        messages = @(@{ role = 'user'; content = 'Reply with OK only.' })
        max_tokens = 512
    } | ConvertTo-Json -Depth 5

    $response = Invoke-RestMethod `
        -Uri 'https://router.huggingface.co/v1/chat/completions' `
        -Method Post `
        -Headers $headers `
        -ContentType 'application/json' `
        -Body $body

    $response.choices[0].message.content
} finally {
    Remove-Variable hfToken, secureToken, headers, body, response `
        -ErrorAction SilentlyContinue
}
```

Der letzte Befehl sollte eine kurze Antwort wie `OK` ausgeben. `gpt-oss` ist ein
Reasoning-Modell. Ein sehr kleines Ausgabelimit kann deshalb aufgebraucht sein,
bevor die sichtbare Antwort beginnt. Hugging Face kann dann HTTP 200 mit leerem
`message.content` zurückgeben; für diesen Diagnosetest 512
Ausgabetokens verwenden. Danach in
Thunderbird **API-Verbindung testen** auswählen, ausschließlich
`https://router.huggingface.co/*` freigeben, speichern und mit einer
synthetischen E-Mail fortfahren.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `Individueller Endpunkt` wählen.
3. Die Basis-URL als API-Wurzel eintragen. Das Add-on ergänzt je nach Protokoll
   `/chat/completions`, `/responses` oder `/messages`.
4. Protokoll und Authentifizierungsart passend zur Dokumentation des Dienstes
   auswählen.
5. Schlüssel und aufgabenspezifische Modell-IDs eintragen. Ein Endpunkt ohne
   Schlüssel muss ausdrücklich die Authentifizierung **Keine** verwenden.
6. Die von Thunderbird angeforderte Host-Berechtigung prüfen. Sie muss exakt
   auf den eingetragenen Host zeigen.
7. **API-Verbindung testen** und anschließend **Speichern** wählen.

Entfernte Endpunkte müssen HTTPS verwenden. Unverschlüsseltes HTTP wird nur für
`localhost` und `127.0.0.1` akzeptiert, damit ein lokaler Entwicklungsdienst
erreichbar bleibt.

## Häufige Fehler

- **404:** Die Basis-URL enthält wahrscheinlich bereits den vollständigen
  Operationspfad oder der Dienst verwendet einen anderen API-Pfad.
- **401/403:** Authentifizierungsart, Schlüssel und Berechtigungen stimmen nicht
  mit dem Dienst überein.
- **Hugging-Face-Zahlungs- oder Guthabenfehler:** Das verfügbare monatliche
  Guthaben ist aufgebraucht oder das Konto benötigt bezahltes Guthaben.
- **Hugging-Face-Anbieter nicht verfügbar:** Ein aktuell im Playground
  angebotenes Modell auswählen, die Routing-Regel ändern oder einen anderen
  aufgeführten Anbieter festlegen.
- **Kein Text:** Das ausgewählte Protokoll passt möglicherweise nicht zum
  Antwortformat. Bei einem Reasoning-Modell kann außerdem das Ausgabelimit
  verbraucht sein, bevor die sichtbare Antwort beginnt. Version 3.2.2 und neuer
  reserviert 512 Tokens für den Verbindungstest; in älteren Versionen für diese
  Prüfung ein aktuell verfügbares Chat-Modell ohne Reasoning verwenden.
- **Modell nicht gefunden:** Die Modell-ID muss exakt der Kennung des Endpunkts
  entsprechen; **Automatisch** kann ohne Anbieter-Vorgaben keine unbekannte
  Modell-ID erraten.
- **Host-Berechtigung abgelehnt:** Den Test erneut starten und nur zustimmen,
  wenn der angezeigte Host der beabsichtigte Dienst ist.

Danach die [einheitliche Anbietertestfolge](../README.de.md#einheitlicher-anbietertest)
durchführen. Ein individueller Endpunkt gilt immer nur für die konkret getestete
Kombination aus Dienst, Protokoll, Authentifizierung und Modell als bestätigt.
