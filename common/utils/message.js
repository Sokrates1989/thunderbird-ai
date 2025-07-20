/**
 * Thunderbird AI Assistant - Message Service
 * 
 * This module provides email message handling utilities for the Thunderbird AI Assistant.
 * It handles message retrieval, content extraction, metadata processing, and message operations.
 * 
 * @module MessageService
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Global MessageService object for managing email message operations
 * 
 * This object provides methods for retrieving, processing, and manipulating email messages
 * using Thunderbird's messaging APIs. It handles both individual messages and message lists.
 * 
 * @namespace MessageService
 * @type {Object}
 */
const MessageService = {
    /**
     * Get current message from active tab
     * 
     * Retrieves the currently displayed message from the active Thunderbird tab.
     * Uses the messageDisplay API to get the message context.
     * 
     * @async
     * @param {number} tabId - ID of the tab to get message from
     * @returns {Promise<Object|null>} Current message object or null if none
     * 
     * @example
     * const message = await MessageService.getCurrentMessage(tabId);
     * if (message) {
     *   console.log('Subject:', message.subject);
     *   console.log('From:', message.author);
     * }
     */
    async getCurrentMessage(tabId) {
        try {
            const displayedMessages = await browser.messageDisplay.getDisplayedMessages(tabId);
            return displayedMessages.messages[0] || null;
        } catch (error) {
            console.error('Error getting current message:', error);
            return null;
        }
    },

    /**
     * Get full message content by ID
     * 
     * Retrieves complete message data including headers, body, and metadata.
     * Uses the messages API to fetch detailed message information.
     * 
     * @async
     * @param {string|number} messageId - ID of the message to retrieve
     * @returns {Promise<Object>} Complete message object with all properties
     * @throws {Error} If message cannot be retrieved or messageId is invalid
     * 
     * @example
     * const messageData = await MessageService.getFullMessage('msg123');
     * console.log('Subject:', messageData.subject);
     * console.log('Content:', messageData.content);
     * console.log('Attachments:', messageData.hasAttachments);
     */
    async getFullMessage(messageId) {
        if (!messageId) {
            throw new Error('Message ID is required');
        }

        try {
            const message = await browser.messages.get(messageId);
            
            if (!message) {
                throw new Error(`Message with ID ${messageId} not found`);
            }

            const content = await this.getMessageContent(messageId);
            
            return {
                id: message.id,
                subject: message.subject || 'Kein Betreff',
                author: message.author || 'Unbekannt',
                date: message.date ? new Date(message.date).toLocaleDateString('de-DE') : 'Unbekannt',
                content: content,
                wordCount: content ? content.split(/\s+/).length : 0,
                hasAttachments: message.hasAttachments || false,
                flagged: message.flagged || false,
                read: message.read || false,
                tags: message.tags || [],
                size: message.size || 0
            };
        } catch (error) {
            console.error('Error getting full message:', error);
            throw new Error(`Fehler beim Abrufen der E-Mail: ${error.message}`);
        }
    },

    /**
     * Get message content/body
     * 
     * Retrieves the text content of a message body, handling different content types.
     * Attempts to get plain text first, falls back to HTML if needed.
     * 
     * @async
     * @param {string|number} messageId - ID of the message to get content from
     * @returns {Promise<string>} Message content as text
     * 
     * @example
     * const content = await MessageService.getMessageContent('msg123');
     * console.log('Message content:', content.substring(0, 100) + '...');
     */
    async getMessageContent(messageId) {
        if (!messageId) {
            throw new Error('Message ID is required');
        }

        try {
            const message = await browser.messages.get(messageId);
            
            if (!message) {
                throw new Error(`Message with ID ${messageId} not found`);
            }

            // Try to get plain text content first
            let content = '';
            
            if (message.body && message.body.plain) {
                content = message.body.plain;
            } else if (message.body && message.body.html) {
                // Convert HTML to plain text if no plain text available
                content = this.htmlToText(message.body.html);
            } else {
                content = 'Kein Inhalt verfügbar';
            }

            return content.trim();
        } catch (error) {
            console.error('Error getting message content:', error);
            return 'Fehler beim Laden des Inhalts';
        }
    },

    /**
     * Extract metadata from message
     * 
     * Extracts and formats key metadata from a message object.
     * Returns a standardized object with common message properties.
     * 
     * @param {Object} message - Message object to extract metadata from
     * @returns {Object} Extracted metadata object
     * @returns {string} returns.author - Message author/sender
     * @returns {string} returns.date - Formatted date string
     * @returns {string} returns.subject - Message subject
     * @returns {number} returns.size - Message size in bytes
     * @returns {boolean} returns.hasAttachments - Whether message has attachments
     * @returns {boolean} returns.flagged - Whether message is flagged
     * @returns {boolean} returns.read - Whether message has been read
     * 
     * @example
     * const metadata = MessageService.extractMetadata(message);
     * console.log('From:', metadata.author);
     * console.log('Date:', metadata.date);
     * console.log('Size:', MessageService.formatFileSize(metadata.size));
     */
    extractMetadata(message) {
        return {
            author: message.author || 'Unbekannt',
            date: message.date ? new Date(message.date).toLocaleDateString('de-DE') : 'Unbekannt',
            subject: message.subject || 'Kein Betreff',
            size: message.size || 0,
            hasAttachments: message.hasAttachments || false,
            flagged: message.flagged || false,
            read: message.read || false
        };
    },

    /**
     * Format file size for display
     * 
     * Converts file size in bytes to human-readable format.
     * Supports KB, MB, GB with appropriate precision.
     * 
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size string
     * 
     * @example
     * console.log(MessageService.formatFileSize(1024)); // "1.0 KB"
     * console.log(MessageService.formatFileSize(1048576)); // "1.0 MB"
     * console.log(MessageService.formatFileSize(1234)); // "1.2 KB"
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Convert HTML to plain text
     * 
     * Strips HTML tags and converts HTML content to plain text.
     * Handles common HTML entities and preserves basic formatting.
     * 
     * @param {string} html - HTML content to convert
     * @returns {string} Plain text content
     * 
     * @example
     * const text = MessageService.htmlToText('<p>Hello <strong>world</strong>!</p>');
     * console.log(text); // "Hello world!"
     */
    htmlToText(html) {
        if (!html) return '';
        
        // Create temporary element to parse HTML
        const div = document.createElement('div');
        div.innerHTML = html;
        
        // Get text content and clean up
        let text = div.textContent || div.innerText || '';
        
        // Replace common HTML entities
        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    },

    /**
     * Update message tags
     * 
     * Adds or removes tags from a message using Thunderbird's messaging API.
     * Useful for categorizing and organizing emails.
     * 
     * @async
     * @param {string|number} messageId - ID of the message to update
     * @param {string[]} tags - Array of tags to apply to the message
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await MessageService.updateMessageTags('msg123', ['wichtig', 'geschäftlich']);
     * if (success) {
     *   console.log('Tags updated successfully');
     * }
     */
    async updateMessageTags(messageId, tags) {
        try {
            await browser.messages.update(messageId, { tags: tags });
            return true;
        } catch (error) {
            console.error('Error updating message tags:', error);
            return false;
        }
    },

    /**
     * Mark message as important
     * 
     * Flags a message as important using Thunderbird's flagging system.
     * This makes the message more visible in the message list.
     * 
     * @async
     * @param {string|number} messageId - ID of the message to flag
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await MessageService.markAsImportant('msg123');
     * if (success) {
     *   console.log('Message marked as important');
     * }
     */
    async markAsImportant(messageId) {
        try {
            await browser.messages.update(messageId, { flagged: true });
            return true;
        } catch (error) {
            console.error('Error marking message as important:', error);
            return false;
        }
    },

    /**
     * Get message attachments
     * 
     * Retrieves attachment information for a message.
     * Returns array of attachment objects with name, size, and type.
     * 
     * @async
     * @param {string|number} messageId - ID of the message to get attachments from
     * @returns {Promise<Array>} Array of attachment objects
     * 
     * @example
     * const attachments = await MessageService.getAttachments('msg123');
     * attachments.forEach(attachment => {
     *   console.log('Name:', attachment.name);
     *   console.log('Size:', MessageService.formatFileSize(attachment.size));
     * });
     */
    async getAttachments(messageId) {
        try {
            const message = await browser.messages.get(messageId);
            
            if (!message || !message.hasAttachments) {
                return [];
            }

            // Note: Thunderbird's API doesn't provide direct attachment access
            // This is a placeholder for future implementation
            return [];
        } catch (error) {
            console.error('Error getting attachments:', error);
            return [];
        }
    }
};

/**
 * Make MessageService available globally for non-module environments
 * 
 * This allows the MessageService to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.MessageService = MessageService;
} 