# Claude-/Anthropic-API-Schlüssel erstellen

Das Add-on verbindet sich direkt mit der Anthropic Messages API. Dafür ist ein
Anthropic-API-Schlüssel erforderlich; eine Anmeldung bei Claude.ai oder Claude
Code kann nicht als Schlüssel verwendet werden.

Offizielle Seiten:

- [API-Schlüssel in der Claude Console](https://platform.claude.com/settings/keys)
- [Claude API: Erste Schritte](https://platform.claude.com/docs/en/get-started)
- [Claude API: Authentifizierung](https://platform.claude.com/docs/en/manage-claude/authentication)
- [Claude API: Preise und Abrechnung](https://platform.claude.com/docs/en/about-claude/pricing)

## Schlüssel anlegen

1. In der [Claude Console](https://platform.claude.com/) anmelden oder ein Konto
   erstellen.
2. Abrechnung beziehungsweise vorhandenes API-Guthaben prüfen. Ein bezahltes
   Claude-App- oder Claude-Code-Abonnement ist kein Ersatz für API-Zugang.
3. Unter **Settings → API keys** einen neuen Schlüssel erstellen.
4. Wenn Workspaces verfügbar sind, einen eigenen Workspace für Thunderbird AI
   verwenden. Beim Erstellen eine sinnvolle Ablaufzeit festlegen.
5. Den Schlüssel sofort kopieren und sicher speichern.

Für dieses Add-on wird ein normaler API-Schlüssel benötigt, kein Admin-API-Key.
Normale Anthropic-Schlüssel werden vom Add-on als `x-api-key` an die Messages
API gesendet.

## Im Add-on eintragen

1. **Thunderbird AI Assistant → Einstellungen** öffnen.
2. Als **AI-Anbieter** `Claude (Anthropic)` wählen.
3. Den Schlüssel in **API-Schlüssel** einfügen. Die feste Basis-URL muss
   `https://api.anthropic.com/v1` anzeigen.
4. Die Modelle zunächst auf **Automatisch** lassen.
5. **API-Verbindung testen** und anschließend **Speichern** wählen.

## Häufige Fehler

- **Authentifizierung fehlgeschlagen / 401:** Schlüssel, Workspace und
  Ablaufdatum prüfen. Abgelaufene Schlüssel können nicht reaktiviert werden.
- **Guthaben oder Ausgabenlimit erreicht:** In der Claude Console unter
  **Settings → Billing** Guthaben, monatliches Ausgabenlimit und Nutzung prüfen.
- **Modell nicht verfügbar:** **Automatisch** verwenden oder eine Modell-ID
  eintragen, die im eigenen Anthropic-Workspace verfügbar ist.

Nach erfolgreichem Verbindungstest die
[einheitliche Anbietertestfolge](../README.md#einheitlicher-anbietertest)
durchführen. Anthropic empfiehlt, Schlüssel regelmäßig zu rotieren und einen
verdächtigen Schlüssel sofort zu widerrufen.
