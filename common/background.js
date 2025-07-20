// Thunderbird AI Assistant - Simple Background Script
class ThunderbirdAI {
    constructor() {
        this.setupEventListeners();
        this.initializeMenus();
    }

    async setupEventListeners() {
        try {
            // Message display action clicked
            if (browser.messageDisplayAction) {
                browser.messageDisplayAction.onClicked.addListener(async (tab) => {
                    await this.handleMessageDisplayAction(tab);
                });
            }

            // Compose action clicked  
            if (browser.composeAction) {
                browser.composeAction.onClicked.addListener(async (tab) => {
                    await this.handleComposeAction(tab);
                });
            }

            // Context menu clicks - only if menus API is available
            if (browser.menus) {
                browser.menus.onClicked.addListener(async (info, tab) => {
                    await this.handleMenuClick(info, tab);
                });
            }

            // Runtime messages from popups/content scripts
            browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
                return await this.handleMessage(request, sender);
            });

            // Extension startup
            browser.runtime.onStartup.addListener(() => {
                console.log('Thunderbird AI Assistant started');
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    async initializeMenus() {
        try {
            // Only create menus if the API is available
            if (!browser.menus) {
                console.log('Menus API not available, skipping menu creation');
                return;
            }

            // Remove existing menus first to avoid conflicts
            try {
                await browser.menus.removeAll();
                console.log('Removed existing menus');
            } catch (error) {
                console.log('No existing menus to remove');
            }

            // Create new menus with proper error handling
            const menuItems = [
                {
                    id: "ai-summarize",
                    title: "Zusammenfassen mit KI",
                    contexts: ["message_list"]
                },
                {
                    id: "ai-categorize", 
                    title: "Kategorisieren mit KI",
                    contexts: ["message_list"]
                },
                {
                    id: "ai-suggest-reply",
                    title: "Antwort vorschlagen",
                    contexts: ["message_list"]
                },
                {
                    id: "ai-chat",
                    title: "Mit KI über E-Mails chatten",
                    contexts: ["message_list", "folder_pane"]
                }
            ];

            for (const menuItem of menuItems) {
                try {
                    await browser.menus.create(menuItem);
                    console.log('Created menu:', menuItem.id);
                } catch (error) {
                    console.log('Menu already exists or creation failed:', menuItem.id, error.message);
                }
            }

            console.log('Menu initialization completed');
        } catch (error) {
            console.error('Error initializing menus:', error);
        }
    }

    async handleMessageDisplayAction(tab) {
        try {
            const displayedMessages = await browser.messageDisplay.getDisplayedMessages(tab.id);
            if (displayedMessages.messages.length === 0) {
                await this.showNotification("Keine E-Mail ausgewählt", "Bitte wählen Sie eine E-Mail aus.");
                return;
            }

            const message = displayedMessages.messages[0];
            await browser.sessions.setTabValue(tab.id, 'currentMessage', message);
        } catch (error) {
            console.error('Error handling message display action:', error);
            await this.showNotification("Fehler", "Fehler beim Laden der E-Mail.");
        }
    }

    async handleComposeAction(tab) {
        try {
            const composeDetails = await browser.compose.getComposeDetails(tab.id);
            await browser.sessions.setTabValue(tab.id, 'composeDetails', composeDetails);
        } catch (error) {
            console.error('Error handling compose action:', error);
            await this.showNotification("Fehler", "Fehler beim Laden der Compose-Daten.");
        }
    }

    async handleMenuClick(info, tab) {
        try {
            const selectedMessages = await browser.mailTabs.getSelectedMessages();
            
            switch (info.menuItemId) {
                case 'ai-summarize':
                    await this.summarizeMessages(selectedMessages.messages);
                    break;
                case 'ai-categorize':
                    await this.categorizeMessages(selectedMessages.messages);
                    break;
                case 'ai-suggest-reply':
                    await this.suggestReply(selectedMessages.messages);
                    break;
                case 'ai-chat':
                    await this.openAIChat(selectedMessages);
                    break;
            }
        } catch (error) {
            console.error('Error handling menu click:', error);
            await this.showNotification("Fehler", `Fehler bei ${info.menuItemId}: ${error.message}`);
        }
    }

    async handleMessage(request, sender) {
        try {
            console.log('Background received message:', request);
            
            switch (request.action) {
                case 'summarizeMessage':
                    return await this.summarizeMessage(request.messageId);
                case 'suggestReply':
                    return await this.generateReply(request.messageId, request.context);
                case 'categorizeMessage':
                    return await this.categorizeMessage(request.messageId);
                case 'checkImportance':
                    return await this.checkImportance(request.messageId);
                case 'improveText':
                    return await this.improveText(request.text, request.type);
                case 'processChatQuery':
                    return await this.processChatQuery(request.query, request.context);
                case 'testConnection':
                    return await this.testConnection(request.message);
                case 'getSettings':
                    return await this.getSettings();
                case 'saveSettings':
                    return await this.saveSettings(request);
                case 'testApiConnection':
                    return await this.testApiConnection(request.apiKey);
                case 'getStatistics':
                    return await this.getStatistics();
                case 'translateMessage':
                    return await this.translateMessage(request.messageId, request.targetLanguage);
                case 'extractInfo':
                    return await this.extractInfo(request.messageId);
                case 'checkSpam':
                    return await this.checkSpam(request.messageId);
                case 'findSimilar':
                    return await this.findSimilar(request.messageId);
                default:
                    console.log('Unknown action:', request.action);
                    return { success: false, error: `Unknown action: ${request.action}` };
            }
        } catch (error) {
            console.error('Error handling message:', error);
            return { success: false, error: error.message };
        }
    }

    // Simple AI functions that return mock responses for now
    async summarizeMessage(messageId) {
        try {
            console.log('Summarizing message:', messageId);
            
            // Get the full message content
            const message = await browser.messages.get(messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            
            // Get message body
            const body = await browser.messages.getFull(messageId);
            const emailContent = body.body || message.snippet || 'Kein Inhalt verfügbar';
            
            // Extract key information
            const subject = message.subject || 'Kein Betreff';
            const author = message.author || 'Unbekannter Absender';
            const date = message.date ? new Date(message.date).toLocaleDateString('de-DE') : 'Unbekanntes Datum';
            
            // Create a more intelligent summary based on content analysis
            const summary = await this.generateAISummary(subject, author, date, emailContent);
            
            return {
                success: true,
                summary: summary,
                metadata: {
                    subject: subject,
                    author: author,
                    date: date,
                    wordCount: emailContent.split(' ').length,
                    hasAttachments: message.hasAttachments || false
                }
            };
        } catch (error) {
            console.error('Error summarizing message:', error);
            return {
                success: false,
                error: `Fehler beim Zusammenfassen: ${error.message}`,
                summary: "E-Mail konnte nicht zusammengefasst werden. Bitte versuchen Sie es erneut."
            };
        }
    }

    async generateAISummary(subject, author, date, content) {
        try {
            // Get API key and model from storage
            const settings = await this.getSettings();
            const apiKey = settings.openaiApiKey;
            const model = settings.model || 'gpt-3.5-turbo';
            
            if (!apiKey) {
                throw new Error('OpenAI API-Schlüssel nicht konfiguriert. Bitte in den Einstellungen hinzufügen.');
            }
            
            // Prepare the prompt for OpenAI
            const prompt = `Analysiere diese E-Mail und erstelle eine strukturierte Zusammenfassung auf Deutsch:

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

Formatiere die Antwort mit Emojis und klarer Struktur.`;

            // Call OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'Du bist ein E-Mail-Assistent, der E-Mails analysiert und strukturierte Zusammenfassungen auf Deutsch erstellt. Verwende Emojis und klare Formatierung.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API Fehler: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const summary = data.choices[0].message.content;

            // Update statistics
            await this.updateStatistics('api');
            await this.updateStatistics('email');

            return summary;
            
        } catch (error) {
            console.error('OpenAI API Error:', error);
            
            // Fallback to basic summary if API fails
            return this.generateFallbackSummary(subject, author, date, content);
        }
    }

    generateFallbackSummary(subject, author, date, content) {
        // Fallback summary when OpenAI API is not available
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const wordCount = content.split(' ').length;
        
        let summary = `📧 **E-Mail Zusammenfassung (Basis-Analyse)**\n\n`;
        summary += `**Von:** ${author}\n`;
        summary += `**Betreff:** ${subject}\n`;
        summary += `**Datum:** ${date}\n`;
        summary += `**Länge:** ${wordCount} Wörter\n\n`;
        
        // Basic analysis
        const isUrgent = content.toLowerCase().includes('dringend') || 
                         content.toLowerCase().includes('sofort') ||
                         content.toLowerCase().includes('asap');
        
        const isQuestion = content.includes('?') || 
                          content.toLowerCase().includes('können sie') ||
                          content.toLowerCase().includes('könnt ihr');
        
        if (isUrgent) {
            summary += `⚠️ **DRINGEND** - Diese E-Mail erfordert Aufmerksamkeit\n\n`;
        }
        
        if (isQuestion) {
            summary += `❓ **Enthält Fragen** - Antwort erforderlich\n\n`;
        }
        
        // Extract first few meaningful lines
        const keyPoints = lines.slice(0, Math.min(3, lines.length))
            .filter(line => line.trim().length > 20)
            .map(line => `• ${line.trim()}`)
            .join('\n');
        
        if (keyPoints) {
            summary += `**Hauptpunkte:**\n${keyPoints}\n\n`;
        }
        
        summary += `ℹ️ **Hinweis:** OpenAI API nicht verfügbar. Verwenden Sie die Einstellungen, um Ihren API-Schlüssel zu konfigurieren.`;
        
        return summary;
    }

    async generateReply(messageId, context = {}) {
        console.log('Generating reply for message:', messageId);
        return {
            success: true,
            reply: "Vielen Dank für Ihre E-Mail.\n\nIch habe Ihre Nachricht erhalten und werde mich zeitnah bei Ihnen melden.\n\nMit freundlichen Grüßen\n[Ihr Name]"
        };
    }

    async categorizeMessage(messageId) {
        console.log('Categorizing message:', messageId);
        return {
            success: true,
            category: "geschäftlich",
            confidence: 0.85
        };
    }

    async checkImportance(messageId) {
        console.log('Checking importance for message:', messageId);
        return {
            success: true,
            importance: "normal",
            confidence: 0.75
        };
    }

    async improveText(text, type = 'general') {
        console.log('Improving text:', text, type);
        return {
            success: true,
            improvedText: "Verbesserter Text basierend auf Ihrer Eingabe."
        };
    }

    async processChatQuery(query, context = {}) {
        console.log('Processing chat query:', query);
        return {
            success: true,
            response: "Ich bin Ihr AI-Assistent für E-Mails. Wie kann ich Ihnen helfen?"
        };
    }

    async translateMessage(messageId, targetLanguage) {
        console.log('Translating message:', messageId, 'to', targetLanguage);
        return {
            success: true,
            translatedText: "Übersetzter Text der E-Mail.",
            originalLanguage: "englisch",
            targetLanguage: targetLanguage
        };
    }

    async extractInfo(messageId) {
        console.log('Extracting info from message:', messageId);
        return {
            success: true,
            extractedInfo: {
                sender: "max.mustermann@example.com",
                date: "2024-01-15",
                subject: "Wichtige Information",
                keywords: ["Meeting", "Projekt", "Deadline"],
                sentiment: "neutral"
            }
        };
    }

    async checkSpam(messageId) {
        console.log('Checking spam for message:', messageId);
        return {
            success: true,
            isSpam: false,
            confidence: 0.95,
            reasons: ["Legitimer Absender", "Normale E-Mail-Struktur"]
        };
    }

    async findSimilar(messageId) {
        console.log('Finding similar messages for:', messageId);
        return {
            success: true,
            similarMessages: [
                { id: "msg1", subject: "Ähnliche E-Mail 1", date: "2024-01-10" },
                { id: "msg2", subject: "Ähnliche E-Mail 2", date: "2024-01-05" }
            ]
        };
    }

    async testConnection(message) {
        console.log('Test connection received:', message);
        return {
            success: true,
            message: 'Background script is working!',
            timestamp: new Date().toISOString()
        };
    }

    async getSettings() {
        try {
            const result = await browser.storage.local.get(['openaiApiKey', 'autoProcess', 'model']);
            return {
                openaiApiKey: result.openaiApiKey || '',
                autoProcess: result.autoProcess || false,
                model: result.model || 'gpt-3.5-turbo'
            };
        } catch (error) {
            console.error('Error getting settings:', error);
            return {
                openaiApiKey: '',
                autoProcess: false,
                model: 'gpt-3.5-turbo'
            };
        }
    }

    async saveSettings(settings) {
        try {
            await browser.storage.local.set(settings);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testApiConnection(apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.ok) {
                return { success: true, message: 'API-Verbindung erfolgreich' };
            } else {
                const errorData = await response.json();
                return { 
                    success: false, 
                    error: errorData.error?.message || 'API-Verbindung fehlgeschlagen' 
                };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getStatistics() {
        try {
            const stats = await browser.storage.local.get(['emailsAnalyzed', 'apiCalls', 'lastUsed']);
            return {
                emailsAnalyzed: stats.emailsAnalyzed || 0,
                apiCalls: stats.apiCalls || 0,
                lastUsed: stats.lastUsed || 'Nie'
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                emailsAnalyzed: 0,
                apiCalls: 0,
                lastUsed: 'Nie'
            };
        }
    }

    async updateStatistics(type) {
        try {
            const stats = await this.getStatistics();
            
            if (type === 'email') {
                stats.emailsAnalyzed++;
            } else if (type === 'api') {
                stats.apiCalls++;
            }
            
            stats.lastUsed = new Date().toLocaleDateString('de-DE');
            
            await browser.storage.local.set({
                emailsAnalyzed: stats.emailsAnalyzed,
                apiCalls: stats.apiCalls,
                lastUsed: stats.lastUsed
            });
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    // Menu action handlers
    async summarizeMessages(messages) {
        try {
            console.log('Summarizing messages:', messages);
            await this.showNotification("Zusammenfassung", "E-Mails werden zusammengefasst...");
        } catch (error) {
            console.error('Error summarizing messages:', error);
            await this.showNotification("Fehler", "Fehler beim Zusammenfassen der E-Mails.");
        }
    }

    async categorizeMessages(messages) {
        try {
            console.log('Categorizing messages:', messages);
            await this.showNotification("Kategorisierung", "E-Mails werden kategorisiert...");
        } catch (error) {
            console.error('Error categorizing messages:', error);
            await this.showNotification("Fehler", "Fehler beim Kategorisieren der E-Mails.");
        }
    }

    async suggestReply(messages) {
        try {
            console.log('Suggesting reply for messages:', messages);
            await this.showNotification("Antwortvorschlag", "Antwortvorschlag wird generiert...");
        } catch (error) {
            console.error('Error suggesting reply:', error);
            await this.showNotification("Fehler", "Fehler beim Generieren des Antwortvorschlags.");
        }
    }

    async openAIChat(context) {
        try {
            console.log('Opening AI chat with context:', context);
            await this.showNotification("AI Chat", "AI Chat wird geöffnet...");
        } catch (error) {
            console.error('Error opening AI chat:', error);
            await this.showNotification("Fehler", "Fehler beim Öffnen des AI Chats.");
        }
    }

    async showNotification(title, message) {
        try {
            await browser.notifications.create({
                type: "basic",
                iconUrl: "icons/ai-32.png",
                title: title,
                message: message
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
}

// Initialize the background script
const thunderbirdAI = new ThunderbirdAI();
console.log('Thunderbird AI Assistant background script loaded'); 