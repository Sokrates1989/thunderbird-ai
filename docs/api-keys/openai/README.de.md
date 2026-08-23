# OpenAI API-Schlüssel erstellen

> [English version](README.md)

OpenAI ist der Standardanbieter des Add-ons. Das Add-on verwendet die OpenAI
Responses API und sendet Anfragen mit `store: false`.

## Vor dem Start

Ein ChatGPT-Free-, Plus-, Pro-, Business- oder Enterprise-Zugang enthält nicht
automatisch API-Guthaben. ChatGPT und die OpenAI API besitzen getrennte
Abrechnungssysteme. Für das Add-on wird ein Schlüssel der **OpenAI API
Platform** benötigt.

Offizielle Seiten:

- [OpenAI API-Schlüssel](https://platform.openai.com/api-keys)
- [OpenAI API Quickstart](https://developers.openai.com/api/docs/quickstart)
- [API-Abrechnung verwalten](https://platform.openai.com/settings/organization/billing/overview)
- [Warum ChatGPT- und API-Abrechnung getrennt sind](https://help.openai.com/en/articles/9039756-managing-billing-settings-on-chatgpt-web-and-platform)

## Schlüssel anlegen

1. Bei der [OpenAI API Platform](https://platform.openai.com/) anmelden oder ein
   Konto erstellen.
2. Falls erforderlich, unter **Billing** eine Zahlungsmethode oder API-Guthaben
   einrichten. Ein vorhandenes ChatGPT-Abonnement reicht dafür nicht aus.
3. Die Seite **API keys** öffnen.
4. **Create new secret key** wählen. Wenn Projekte angeboten werden, ein eigenes
   Projekt für Thunderbird AI verwenden und den Schlüssel möglichst eng darauf
   beschränken.
5. Den neuen Schlüssel sofort kopieren und sicher speichern. Der vollständige
   Wert wird später möglicherweise nicht noch einmal angezeigt.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `OpenAI` wählen.
3. Den Schlüssel in **API-Schlüssel** einfügen. Die feste Basis-URL muss
   `https://api.openai.com/v1` anzeigen.
4. Die aufgabenspezifischen Modelle zunächst auf **Automatisch** lassen.
5. **API-Verbindung testen** und anschließend **Speichern** wählen.

## Häufige Fehler

- **Authentifizierung fehlgeschlagen / 401:** Der Schlüssel ist falsch,
  widerrufen oder gehört nicht zum aktiven Projekt.
- **Guthaben oder Kontingent fehlt / 402 oder 429:** API-Abrechnung, Projektlimit
  und Nutzungsgrenzen in der API Platform prüfen. Ein ChatGPT-Abo ändert diese
  Grenzen nicht.
- **Modell nicht verfügbar:** Zunächst **Automatisch** verwenden. Manuell
  eingetragene Modell-IDs müssen für das gewählte API-Projekt freigeschaltet
  sein.

Nach erfolgreichem Verbindungstest die
[einheitliche Anbietertestfolge](../README.de.md#einheitlicher-anbietertest)
durchführen. Den Schlüssel bei einem Verdacht auf Offenlegung auf der
API-Schlüsselseite widerrufen und ersetzen.
