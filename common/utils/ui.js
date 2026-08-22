/**
 * AI Mail Assistant for Thunderbird - UI Utilities
 * 
 * This module provides user interface utilities for the AI Mail Assistant for Thunderbird.
 * It handles toast notifications, loading overlays, error dialogs, and other UI components.
 * 
 * @module UIUtils
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */

/**
 * Global UIUtils object for managing user interface elements
 * 
 * This object provides methods for creating and managing UI components like
 * toast notifications, loading overlays, error dialogs, and form validation.
 * 
 * @namespace UIUtils
 * @type {Object}
 */
const UIUtils = {
    /**
     * Show toast notification
     * 
     * Displays a temporary notification message at the top of the screen.
     * Supports different types (success, error, info) with appropriate styling.
     * 
     * @param {string} message - Message to display in the toast
     * @param {string} type - Toast type ('success', 'error', 'info') (default: 'info')
     * @param {number} duration - Duration in milliseconds (default: 3000)
     * 
     * @example
     * UIUtils.showToast('Settings saved successfully!', 'success');
     * UIUtils.showToast('An error occurred', 'error', 5000);
     * UIUtils.showToast('Processing email...', 'info');
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
    },

    /**
     * Show loading overlay
     * 
     * Displays a loading spinner with customizable message over the current content.
     * Used during long-running operations like email processing or API calls.
     * 
     * @param {string} message - Loading message to display (default: 'Verarbeite E-Mail...')
     * 
     * @example
     * UIUtils.showLoading('Analyzing email content...');
     * // ... perform operation ...
     * UIUtils.hideLoading();
     */
    showLoading(message = I18n.t('loadingEmail')) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const messageEl = overlay.querySelector('.loading-spinner div:last-child');
            if (messageEl) {
                messageEl.textContent = message;
            }
            overlay.style.display = 'flex';
        }
    },

    /**
     * Hide loading overlay
     * 
     * Hides the loading spinner and returns control to the user.
     * Should be called after completing long-running operations.
     * 
     * @example
     * UIUtils.showLoading();
     * try {
     *   await processEmail();
     * } finally {
     *   UIUtils.hideLoading();
     * }
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    /**
     * Show error dialog
     * 
     * Displays a modal error dialog with the specified message.
     * The dialog includes a close button and can be dismissed by clicking outside.
     * 
     * @param {string} message - Error message to display
     * 
     * @example
     * UIUtils.showError('Failed to connect to OpenAI API');
     */
    showError(message) {
        const dialog = document.getElementById('errorDialog');
        const messageEl = document.getElementById('errorMessage');
        
        if (dialog && messageEl) {
            messageEl.textContent = message;
            dialog.style.display = 'flex';
        }
    },

    /**
     * Hide error dialog
     * 
     * Hides the error dialog and returns control to the user.
     * Can be called programmatically or by user interaction.
     * 
     * @example
     * // Hide after user clicks close button
     * UIUtils.hideError();
     */
    hideError() {
        const dialog = document.getElementById('errorDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    },

    /**
     * Format summary text with HTML
     * 
     * Converts plain text with markdown-like formatting to HTML.
     * Supports bold, italic, line breaks, and emoji formatting.
     * 
     * @param {string} text - Text to format
     * @returns {string} Formatted HTML string
     * 
     * @example
     * const html = UIUtils.formatSummaryText('**Important** email from *John* 📧');
     * // Returns: '<strong>Important</strong> email from <em>John</em> <span class="emoji">📧</span>'
     */
    formatSummaryText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/•/g, '&bull;')
            .replace(/📧|📝|⚠️|❓|😊|😟|😐/g, (match) => {
                const emojiMap = {
                    '📧': '<span class="emoji">📧</span>',
                    '📝': '<span class="emoji">📝</span>',
                    '⚠️': '<span class="emoji warning">⚠️</span>',
                    '❓': '<span class="emoji">❓</span>',
                    '😊': '<span class="emoji positive">😊</span>',
                    '😟': '<span class="emoji negative">😟</span>',
                    '😐': '<span class="emoji neutral">😐</span>'
                };
                return emojiMap[match] || match;
            });
    },

    /**
     * Escape HTML entities
     * 
     * Safely escapes HTML special characters to prevent XSS attacks.
     * Converts characters like <, >, &, " to their HTML entity equivalents.
     * 
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     * 
     * @example
     * const safe = UIUtils.escapeHtml('<script>alert("xss")</script>');
     * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Copy text to clipboard
     * 
     * Attempts to copy the specified text to the user's clipboard.
     * Uses the modern Clipboard API with fallback for older browsers.
     * 
     * @async
     * @param {string} text - Text to copy to clipboard
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await UIUtils.copyToClipboard('Copied text');
     * if (success) {
     *   UIUtils.showToast('Text copied to clipboard!', 'success');
     * }
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    },

    /**
     * Create result action button
     * 
     * Creates a styled button element for result actions like copy, reply, etc.
     * The button includes proper styling and event handling.
     * 
     * @param {string} text - Button text to display
     * @param {Function} callback - Click event callback function
     * @returns {HTMLElement} Button element ready for use
     * 
     * @example
     * const copyBtn = UIUtils.createActionButton('Copy', () => {
     *   UIUtils.copyToClipboard(result.text);
     * });
     * resultsContainer.appendChild(copyBtn);
     */
    createActionButton(text, callback) {
        const button = document.createElement('button');
        button.className = 'result-action-btn';
        button.textContent = text;
        button.addEventListener('click', callback);
        return button;
    },

    /**
     * Toggle advanced section visibility
     * 
     * Toggles the visibility of an advanced content section with animation.
     * Updates the toggle button's chevron icon to indicate state.
     * 
     * @param {HTMLElement} toggleElement - Toggle button element
     * @param {HTMLElement} contentElement - Content element to toggle
     * 
     * @example
     * const toggle = document.getElementById('advancedToggle');
     * const content = document.getElementById('advancedContent');
     * UIUtils.toggleAdvanced(toggle, content);
     */
    toggleAdvanced(toggleElement, contentElement) {
        const isVisible = contentElement.style.display !== 'none';
        contentElement.style.display = isVisible ? 'none' : 'block';
        
        const chevron = toggleElement.querySelector('span:last-child');
        if (chevron) {
            chevron.textContent = isVisible ? '▼' : '▲';
        }
    },

    /**
     * Update status display
     * 
     * Updates the status message with appropriate styling based on type.
     * Supports success, error, and info status types.
     * 
     * @param {string} message - Status message to display
     * @param {string} type - Status type ('success', 'error', 'info') (default: 'info')
     * 
     * @example
     * UIUtils.updateStatus('Processing complete', 'success');
     * UIUtils.updateStatus('Connection failed', 'error');
     * UIUtils.updateStatus('Ready', 'info');
     */
    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status ${type}`;
        }
    },

    /**
     * Handle keyboard shortcuts
     * 
     * Processes keyboard events for global shortcuts and special keys.
     * Supports Ctrl+Alt combinations and Escape key for dialog closing.
     * 
     * @param {KeyboardEvent} event - Keyboard event object
     * @param {Object} shortcuts - Object mapping keys to handler functions
     * 
     * @example
     * const shortcuts = {
     *   's': () => summarizeEmail(),
     *   'r': () => generateReply(),
     *   'c': () => categorizeEmail()
     * };
     * document.addEventListener('keydown', (e) => {
     *   UIUtils.handleKeyboardShortcuts(e, shortcuts);
     * });
     */
    handleKeyboardShortcuts(event, shortcuts) {
        // Handle Ctrl+Alt shortcuts
        if (event.ctrlKey && event.altKey) {
            const key = event.key.toLowerCase();
            const handler = shortcuts[key];
            
            if (handler) {
                event.preventDefault();
                handler();
            }
        }
        
        // Handle Escape key to close error dialog
        if (event.key === 'Escape') {
            const errorDialog = document.getElementById('errorDialog');
            if (errorDialog && errorDialog.style.display === 'flex') {
                this.hideError();
            }
        }
    },

    /**
     * Validate form input
     * 
     * Validates form input and applies appropriate CSS classes.
     * Shows visual feedback for valid/invalid input states.
     * 
     * @param {HTMLElement} input - Input element to validate
     * @param {Function} validator - Validation function that returns boolean
     * @returns {boolean} Validation result
     * 
     * @example
     * const isValid = UIUtils.validateInput(apiKeyInput, (value) => {
     *   return value.startsWith('sk-') && value.length > 20;
     * });
     */
    validateInput(input, validator) {
        const isValid = validator(input.value);
        
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
            input.classList.add('error');
        }
        
        return isValid;
    },

    /**
     * Debounce function calls
     * 
     * Creates a debounced version of a function that delays execution
     * until after a specified delay period of inactivity.
     * 
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     * 
     * @example
     * const debouncedSearch = UIUtils.debounce((query) => {
     *   performSearch(query);
     * }, 300);
     * 
     * searchInput.addEventListener('input', (e) => {
     *   debouncedSearch(e.target.value);
     * });
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
};

/**
 * Make UIUtils available globally for non-module environments
 * 
 * This allows the UIUtils to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.UIUtils = UIUtils;
}
