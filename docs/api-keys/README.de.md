# So erhältst du deinen API-Schlüssel

> [English version](README.md)

Der Thunderbird AI Assistant verbindet sich direkt mit dem ausgewählten
AI-Anbieter. Für jeden integrierten Anbieter wird deshalb ein eigener
API-Schlüssel benötigt. Ein Chat-Abonnement und ein API-Zugang sind nicht
automatisch dasselbe Produkt.

## Anbieter-Anleitungen

- [OpenAI API-Schlüssel erstellen](openai/README.de.md)
- [Claude-/Anthropic-API-Schlüssel erstellen](claude-anthropic/README.de.md)
- [Mistral-API-Schlüssel erstellen](mistral/README.de.md)
- [DeepSeek-API-Schlüssel erstellen](deepseek/README.de.md)
- [Individuellen AI-Endpunkt einschließlich Hugging Face Inference Providers einrichten](custom-endpoint/README.de.md)

## Schlüssel sicher verwenden

1. Den Schlüssel ausschließlich auf der offiziellen Seite des Anbieters
   erstellen.
2. Den Schlüssel direkt unter **Thunderbird AI Assistant → Einstellungen**
   einfügen. Er muss nicht in eine Konfigurationsdatei geschrieben werden.
3. Den Schlüssel niemals in ein Git-Repository, eine Support-Nachricht, einen
   Screenshot oder einen Fehlerbericht kopieren.
4. Wenn ein Schlüssel versehentlich offengelegt wurde, ihn beim Anbieter sofort
   widerrufen und einen neuen erstellen.
5. Beim Anbieter ein Ausgabenlimit oder Benachrichtigungen aktivieren, soweit
   diese angeboten werden.

Der Schlüssel wird lokal im Extension-Speicher des Thunderbird-Profils
gespeichert. Bei einer AI-Aktion sendet das Add-on die in der
[Datenschutzerklärung des Projekts](../../README.de.md#datenschutz) beschriebenen
E-Mail-Daten direkt an den gewählten Anbieter.

## Einheitlicher Anbietertest

Nach der Einrichtung sollte jeder Anbieter mit derselben kurzen Testfolge
geprüft werden. Damit werden der schnelle, der ausgewogene und der
qualitätsorientierte Modellpfad abgedeckt:

1. **API-Verbindung testen** ausführen und sichtbaren Antworttext erwarten.
2. Eine noch nicht analysierte E-Mail einzeln analysieren. Drei plausible Werte
   für Wichtigkeit, Spam und Risiko müssen erscheinen.
3. Dieselbe oder eine andere echte E-Mail zusammenfassen.
4. Einen Antwortvorschlag erzeugen und einmal mit einer kurzen Anweisung
   überarbeiten.
5. Im AI Chat eine Frage zur Nachricht und anschließend eine Rückfrage stellen.
6. Zwei oder drei noch nicht analysierte Dashboard-Mails auswählen und die
   Bulk-Analyse ausführen. Bereits analysierte Nachrichten müssen dabei
   übersprungen werden.
7. Eine bereits analysierte E-Mail über **Neu analysieren** erneut bewerten.
8. Thunderbird vollständig beenden und neu öffnen. Anbieter, Modelle und der
   maskierte Schlüssel müssen erhalten bleiben; der API-Test muss erneut
   funktionieren.
9. In den Nutzungsstatistiken prüfen, dass Anbieter und Modell erfasst wurden,
   ohne dass der rohe API-Schlüssel in der Support-Diagnose erscheint.

Ein Anbieter gilt als **vollständig manuell getestet**, wenn alle neun Punkte
mit **Automatisch** als Modellauswahl funktionieren und keine leeren Antworten
auftreten. Die automatisierten Vertragstests und der aktuelle manuelle
Teststand werden in der
[AI-Anbieter-Testmatrix](../ai-provider-testing.de.md) dokumentiert.
