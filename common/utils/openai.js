/**
 * Thunderbird AI Assistant - OpenAI Service
 * 
 * This module provides OpenAI API integration for the Thunderbird AI Assistant.
 * It handles API communication, content generation, and fallback processing.
 * 
 * @module OpenAIService
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Global OpenAIService object for managing OpenAI API interactions
 * 
 * This object provides methods for communicating with OpenAI's API to generate
 * email summaries, replies, categorizations, and other AI-powered features.
 * 
 * @namespace OpenAIService
 * @type {Object}
 */
const OpenAIService = {
    /**
     * Get current API settings
     * 
     * Retrieves the current OpenAI API configuration from storage.
     * Returns API key, model selection, and other settings.
     * 
     * @async
     * @returns {Promise<Object>} Current API settings
     * @returns {string} returns.apiKey - OpenAI API key
     * @returns {string} returns.model - Selected AI model
     * @returns {string} returns.baseUrl - API base URL
     * 
     * @example
     * const settings = await OpenAIService.getSettings();
     * console.log('Model:', settings.model);
     * console.log('API Key configured:', !!settings.apiKey);
     */
    async getSettings() {
        const settings = await StorageManager.getSettings();
        return {
            apiKey: settings.openaiApiKey,
            model: settings.model || CONFIG.OPENAI.DEFAULT_MODEL,
            baseUrl: CONFIG.OPENAI.BASE_URL
        };
    },

    /**
     * Test OpenAI API connection
     * 
     * Validates the provided API key by making a simple test request.
     * Used to verify API credentials before processing emails.
     * 
     * @async
     * @param {string} apiKey - OpenAI API key to test
     * @returns {Promise<Object>} Test result object
     * @returns {boolean} returns.success - Whether test was successful
     * @returns {string} returns.message - Success or error message
     * 
     * @example
     * const result = await OpenAIService.testConnection('sk-...');
     * if (result.success) {
     *   console.log('API connection successful');
     * } else {
     *   console.error('API test failed:', result.message);
     * }
     */
    async testConnection(apiKey) {
        try {
            if (!apiKey || !apiKey.startsWith('sk-')) {
                return {
                    success: false,
                    message: 'Ungültiger API-Schlüssel. Bitte überprüfen Sie den Schlüssel.'
                };
            }

            const response = await this.makeRequest({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say "Hello" in German.' }
                ],
                max_tokens: 10
            }, apiKey);

            return {
                success: true,
                message: 'API-Verbindung erfolgreich!'
            };
        } catch (error) {
            console.error('API test failed:', error);
            return {
                success: false,
                message: `API-Test fehlgeschlagen: ${error.message}`
            };
        }
    },

    /**
     * Generate email summary using OpenAI
     * 
     * Creates an AI-generated summary of an email using OpenAI's API.
     * Includes key points, action items, and sentiment analysis.
     * 
     * @async
     * @param {string} subject - Email subject line
     * @param {string} author - Email sender/author
     * @param {string} date - Email date
     * @param {string} content - Email body content
     * @returns {Promise<string>} Generated summary text
     * @throws {Error} If API request fails or API key is not configured
     * 
     * @example
     * const summary = await OpenAIService.generateSummary(
     *   'Meeting Tomorrow',
     *   'john@example.com',
     *   '2024-01-15',
     *   'Hi team, we have a meeting tomorrow at 2 PM...'
     * );
     * console.log('Summary:', summary);
     */
    async generateSummary(subject, author, date, content) {
        const settings = await this.getSettings();
        
        if (!settings.apiKey) {
            throw new Error('OpenAI API-Schlüssel nicht konfiguriert. Bitte in den Einstellungen hinzufügen.');
        }

        const prompt = `Fasse diese E-Mail zusammen:

Betreff: ${subject}
Von: ${author}
Datum: ${date}
Inhalt: ${content}

Erstelle eine prägnante Zusammenfassung mit:
• Hauptpunkten der E-Mail
• Wichtigen Informationen
• Eventuellen Handlungsaufforderungen
• Stimmung/Ton der Nachricht

Antworte auf Deutsch und verwende Aufzählungspunkte für bessere Übersichtlichkeit.`;

        const response = await this.makeRequest({
            model: settings.model,
            messages: [
                { role: 'system', content: 'Du bist ein hilfreicher Assistent für E-Mail-Zusammenfassungen. Antworte immer auf Deutsch.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
        }, settings.apiKey);

        return response.choices[0].message.content;
    },

    /**
     * Generate fallback summary without API
     * 
     * Creates a basic summary when OpenAI API is not available.
     * Uses simple text analysis and keyword extraction.
     * 
     * @param {string} subject - Email subject line
     * @param {string} author - Email sender/author
     * @param {string} date - Email date
     * @param {string} content - Email body content
     * @returns {string} Basic summary text
     * 
     * @example
     * const summary = OpenAIService.generateFallbackSummary(
     *   'Project Update',
     *   'manager@company.com',
     *   '2024-01-15',
     *   'The project is progressing well...'
     * );
     */
    generateFallbackSummary(subject, author, date, content) {
        const wordCount = content.split(/\s+/).length;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const firstSentence = sentences[0] || 'Kein Inhalt verfügbar';
        
        let summary = `📧 **E-Mail Zusammenfassung**\n\n`;
        summary += `**Von:** ${author}\n`;
        summary += `**Betreff:** ${subject}\n`;
        summary += `**Datum:** ${date}\n\n`;
        
        if (wordCount > 0) {
            summary += `**Inhalt:** ${firstSentence.substring(0, 200)}${firstSentence.length > 200 ? '...' : ''}\n\n`;
            summary += `**Statistiken:**\n`;
            summary += `• Wörter: ${wordCount}\n`;
            summary += `• Sätze: ${sentences.length}\n`;
            summary += `• Zeichen: ${content.length}\n\n`;
        }
        
        summary += `⚠️ **Hinweis:** Diese Zusammenfassung wurde ohne KI-API erstellt. Für bessere Ergebnisse konfigurieren Sie Ihren OpenAI API-Schlüssel in den Einstellungen.`;
        
        return summary;
    },

    /**
     * Generate email reply suggestion
     * 
     * Creates an AI-generated reply suggestion based on the original email.
     * Considers context, tone, and common reply patterns.
     * 
     * @async
     * @param {string} subject - Original email subject
     * @param {string} author - Original email sender
     * @param {string} content - Original email content
     * @returns {Promise<string>} Generated reply text
     * @throws {Error} If API request fails or API key is not configured
     * 
     * @example
     * const reply = await OpenAIService.generateReply(
     *   'Meeting Request',
     *   'colleague@company.com',
     *   'Can we meet tomorrow to discuss the project?'
     * );
     * console.log('Reply suggestion:', reply);
     */
    async generateReply(subject, author, content) {
        const settings = await this.getSettings();
        
        if (!settings.apiKey) {
            throw new Error('OpenAI API-Schlüssel nicht konfiguriert. Bitte in den Einstellungen hinzufügen.');
        }

        const prompt = `Erstelle eine professionelle Antwort auf diese E-Mail:

Betreff: ${subject}
Von: ${author}
Inhalt: ${content}

Die Antwort sollte:
• Höflich und professionell sein
• Auf die wichtigsten Punkte eingehen
• Einen angemessenen Ton haben
• Auf Deutsch verfasst sein

Erstelle nur den Antworttext, ohne Grußformel oder Signatur.`;

        const response = await this.makeRequest({
            model: settings.model,
            messages: [
                { role: 'system', content: 'Du bist ein professioneller E-Mail-Assistent. Erstelle höfliche und angemessene Antworten.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.8
        }, settings.apiKey);

        return response.choices[0].message.content;
    },

    /**
     * Categorize email content
     * 
     * Analyzes email content and assigns appropriate categories.
     * Uses AI to determine the type and importance of the email.
     * 
     * @async
     * @param {string} subject - Email subject
     * @param {string} content - Email content
     * @returns {Promise<Object>} Categorization result
     * @returns {string} returns.category - Assigned category
     * @returns {number} returns.confidence - Confidence score (0-1)
     * @returns {string} returns.reasoning - Reasoning for categorization
     * 
     * @example
     * const result = await OpenAIService.categorizeEmail(
     *   'Invoice #12345',
     *   'Please find attached invoice...'
     * );
     * console.log('Category:', result.category);
     * console.log('Confidence:', result.confidence);
     */
    async categorizeEmail(subject, content) {
        const settings = await this.getSettings();
        
        if (!settings.apiKey) {
            return {
                category: 'ungelesen',
                confidence: 0.5,
                reasoning: 'Keine API-Konfiguration verfügbar'
            };
        }

        const prompt = `Kategorisiere diese E-Mail in eine der folgenden Kategorien:
- geschäftlich (Business/Work related)
- persönlich (Personal/Private)
- newsletter (Newsletter/Marketing)
- rechnung (Invoice/Billing)
- support (Support/Help)
- spam (Spam/Unwanted)
- wichtig (Important/Urgent)
- archiv (Archive/Reference)

Betreff: ${subject}
Inhalt: ${content}

Antworte nur mit der Kategorie und einer kurzen Begründung.`;

        try {
            const response = await this.makeRequest({
                model: settings.model,
                messages: [
                    { role: 'system', content: 'Du bist ein E-Mail-Kategorisierungs-Assistent.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100,
                temperature: 0.3
            }, settings.apiKey);

            const result = response.choices[0].message.content;
            const category = result.split('\n')[0].toLowerCase();
            
            return {
                category: category,
                confidence: 0.8,
                reasoning: result
            };
        } catch (error) {
            console.error('Categorization failed:', error);
            return {
                category: 'ungelesen',
                confidence: 0.3,
                reasoning: 'Kategorisierung fehlgeschlagen'
            };
        }
    },

    /**
     * Make HTTP request to OpenAI API
     * 
     * Handles the actual HTTP communication with OpenAI's API.
     * Includes proper error handling and response processing.
     * 
     * @async
     * @param {Object} requestBody - Request body for OpenAI API
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<Object>} API response object
     * @throws {Error} If API request fails
     * 
     * @example
     * const response = await OpenAIService.makeRequest({
     *   model: 'gpt-3.5-turbo',
     *   messages: [{ role: 'user', content: 'Hello' }]
     * }, 'sk-...');
     */
    async makeRequest(requestBody, apiKey) {
        const settings = await this.getSettings();
        
        const response = await fetch(`${settings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API-Fehler ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        return await response.json();
    }
};

/**
 * Make OpenAIService available globally for non-module environments
 * 
 * This allows the OpenAIService to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.OpenAIService = OpenAIService;
}

// Also make it available globally for background script context
if (typeof globalThis !== 'undefined') {
    globalThis.OpenAIService = OpenAIService;
}

// Fallback for older environments
if (typeof global !== 'undefined') {
    global.OpenAIService = OpenAIService;
} 