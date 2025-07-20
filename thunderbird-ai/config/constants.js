// Thunderbird AI Assistant - Constants and Configuration

const CONFIG = {
    // Addon Information
    ADDON_NAME: 'Thunderbird AI Assistant',
    ADDON_VERSION: '1.0.0',
    ADDON_ID: 'thunderbird-ai@example.com',
    
    // OpenAI Configuration
    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        DEFAULT_MODEL: 'gpt-3.5-turbo',
        AVAILABLE_MODELS: [
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Schnell & Günstig)' },
            { value: 'gpt-4', label: 'GPT-4 (Besser & Teurer)' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Beste Qualität)' }
        ],
        MAX_TOKENS: 500,
        TEMPERATURE: 0.7
    },
    
    // Storage Keys
    STORAGE_KEYS: {
        OPENAI_API_KEY: 'openaiApiKey',
        MODEL: 'model',
        AUTO_PROCESS: 'autoProcess',
        EMAILS_ANALYZED: 'emailsAnalyzed',
        API_CALLS: 'apiCalls',
        LAST_USED: 'lastUsed'
    },
    
    // UI Configuration
    UI: {
        POPUP_WIDTH: 450,
        POPUP_HEIGHT: 600,
        TOAST_DURATION: 3000,
        LOADING_TIMEOUT: 30000
    },
    
    // Message Actions
    ACTIONS: {
        SUMMARIZE: 'summarizeMessage',
        REPLY: 'suggestReply',
        CATEGORIZE: 'categorizeMessage',
        IMPORTANCE: 'checkImportance',
        IMPROVE_TEXT: 'improveText',
        CHAT: 'processChatQuery',
        TEST: 'testConnection',
        GET_SETTINGS: 'getSettings',
        SAVE_SETTINGS: 'saveSettings',
        TEST_API: 'testApiConnection',
        GET_STATISTICS: 'getStatistics',
        TRANSLATE: 'translateMessage',
        EXTRACT_INFO: 'extractInfo',
        CHECK_SPAM: 'checkSpam',
        FIND_SIMILAR: 'findSimilar'
    },
    
    // Keyboard Shortcuts
    SHORTCUTS: {
        SUMMARIZE: 'Ctrl+Alt+S',
        REPLY: 'Ctrl+Alt+R',
        CATEGORIZE: 'Ctrl+Alt+C',
        IMPORTANCE: 'Ctrl+Alt+I'
    },
    
    // Error Messages
    ERRORS: {
        API_KEY_MISSING: 'OpenAI API-Schlüssel nicht konfiguriert. Bitte in den Einstellungen hinzufügen.',
        API_CONNECTION_FAILED: 'OpenAI API-Verbindung fehlgeschlagen',
        MESSAGE_NOT_FOUND: 'E-Mail nicht gefunden',
        SETTINGS_LOAD_FAILED: 'Fehler beim Laden der Einstellungen',
        SETTINGS_SAVE_FAILED: 'Fehler beim Speichern der Einstellungen'
    },
    
    // Success Messages
    SUCCESS: {
        SETTINGS_SAVED: 'Einstellungen erfolgreich gespeichert!',
        API_TEST_SUCCESS: 'API-Verbindung erfolgreich! OpenAI ist verfügbar.',
        SUMMARY_GENERATED: 'E-Mail-Zusammenfassung erfolgreich erstellt'
    }
};

const PROMPTS = {
    EMAIL_SUMMARY: (subject, author, date, content) => `Analysiere diese E-Mail und erstelle eine strukturierte Zusammenfassung auf Deutsch:

E-Mail Details:
- Betreff: ${subject}
- Von: ${author}
- Datum: ${date}
- Inhalt: ${content}

Erstelle eine Zusammenfassung mit folgenden Elementen:
1. Metadaten (Absender, Betreff, Datum, Wortanzahl)
2. Dringlichkeit (hoch/mittel/niedrig) mit Begründung
3. Ton der E-Mail (formell/informell) mit Begründung
4. Enthält Fragen? (ja/nein) mit Details
5. Hauptpunkte (3-5 wichtigste Punkte)
6. Erforderliche Aktionen
7. Stimmungsanalyse (positiv/negativ/neutral) mit Begründung
8. Anhänge erwähnt? (ja/nein)

Formatiere die Antwort mit Emojis und klarer Struktur.`,

    SYSTEM_PROMPT: 'Du bist ein E-Mail-Assistent, der E-Mails analysiert und strukturierte Zusammenfassungen auf Deutsch erstellt. Verwende Emojis und klare Formatierung.'
};

const SENTIMENT_WORDS = {
    POSITIVE: ['danke', 'freut', 'gut', 'toll', 'super', 'großartig', 'excellent', 'wonderful', 'amazing'],
    NEGATIVE: ['problem', 'fehler', 'schlecht', 'enttäuscht', 'unzufrieden', 'terrible', 'awful', 'disappointed'],
    URGENT: ['dringend', 'sofort', 'asap', 'urgent', 'immediately', 'critical'],
    FORMAL: ['sehr geehrte', 'mit freundlichen grüßen', 'hochachtungsvoll', 'yours sincerely', 'best regards']
};

// Make available globally for non-module environments
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.PROMPTS = PROMPTS;
    window.SENTIMENT_WORDS = SENTIMENT_WORDS;
} 