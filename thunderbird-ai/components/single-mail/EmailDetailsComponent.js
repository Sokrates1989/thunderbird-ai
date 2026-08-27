/**
 * EmailDetailsComponent - Manages email information display
 * 
 * Handles the display of email details such as sender, date, size, and status.
 * Updates the information when new email data is loaded.
 * 
 * @example
 * const emailDetails = new EmailDetailsComponent(manager);
 * emailDetails.initialize();
 */
const EmailDetailsComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference and element references.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const emailDetails = new EmailDetailsComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.emailInfo;
        this.emailData = null;
        
        // Store element references
        this.elements = {
            from: null,
            date: null,
            size: null,
            status: null
        };
    }

    /**
     * Initialize the component
     * 
     * Creates the UI structure and sets up initial state.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        this.createUI();
        this.attachElementReferences();
    }

    /**
     * Create the UI structure
     * 
     * Builds the HTML structure for displaying email details.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        this.container.replaceChildren(
            this.createInfoRow('emailFromLabel', 'emailFrom'),
            this.createInfoRow('emailDateLabel', 'emailDate'),
            this.createInfoRow('emailSizeLabel', 'emailSize'),
            this.createInfoRow('emailStatusLabel', 'emailStatus')
        );
    }

    /** Create one labeled email metadata row with a safe literal placeholder. */
    createInfoRow(labelKey, valueId) {
        const row = SafeDom.create('div', { className: 'info-row' });
        row.append(
            SafeDom.create('span', {
                className: 'info-label',
                text: `${I18n.t(labelKey)}:`
            }),
            SafeDom.create('span', {
                id: valueId,
                className: 'info-value',
                text: '-'
            })
        );
        return row;
    }

    /**
     * Attach element references
     * 
     * Stores references to the created DOM elements for easy access.
     * 
     * @example
     * this.attachElementReferences();
     */
    attachElementReferences() {
        this.elements.from = document.getElementById('emailFrom');
        this.elements.date = document.getElementById('emailDate');
        this.elements.size = document.getElementById('emailSize');
        this.elements.status = document.getElementById('emailStatus');
    }

    /**
     * Update email data
     * 
     * Updates the display with new email data.
     * 
     * @param {Object} emailData - Email data object
     * @param {string} emailData.from - Sender email address
     * @param {string} emailData.subject - Email subject
     * @param {string} emailData.date - Email date
     * @param {number} emailData.size - Email size in bytes
     * @param {string} emailData.status - Email status
     * @example
     * this.updateEmailData({ from: 'sender@example.com', subject: 'Test' });
     */
    updateEmailData(emailData) {
        this.emailData = emailData;
        this.updateDisplay();
    }

    /**
     * Update display
     * 
     * Updates all email detail fields with current data.
     * 
     * @example
     * this.updateDisplay();
     */
    updateDisplay() {
        if (!this.emailData) {
            this.clearDisplay();
            return;
        }

        // Update sender
        if (this.elements.from) {
            this.elements.from.textContent = this.formatSender(this.emailData.from);
        }

        // Update date
        if (this.elements.date) {
            this.elements.date.textContent = this.formatDate(this.emailData.date);
        }

        // Update size
        if (this.elements.size) {
            this.elements.size.textContent = this.formatSize(this.emailData.size);
        }

        // Update status
        if (this.elements.status) {
            this.elements.status.textContent = this.formatStatus(this.emailData.status);
        }
    }

    /**
     * Clear display
     * 
     * Clears all email detail fields.
     * 
     * @example
     * this.clearDisplay();
     */
    clearDisplay() {
        Object.values(this.elements).forEach(element => {
            if (element) {
                element.textContent = '-';
            }
        });
    }

    /**
     * Format sender information
     * 
     * Formats the sender information for display.
     * 
     * @param {string} from - Sender information
     * @returns {string} Formatted sender string
     * @example
     * const formatted = this.formatSender('John Doe <john@example.com>');
     */
    formatSender(from) {
        if (!from) return '-';
        
        // Extract name and email if in format "Name <email>"
        const match = from.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
            const name = match[1].trim();
            const email = match[2].trim();
            return `${name} (${email})`;
        }
        
        return from;
    }

    /**
     * Format date for display
     * 
     * Formats the email date for user-friendly display.
     * 
     * @param {string|Date} date - Email date
     * @returns {string} Formatted date string
     * @example
     * const formatted = this.formatDate('2024-01-15T10:30:00Z');
     */
    formatDate(date) {
        if (!date) return '-';
        
        try {
            const dateObj = new Date(date);
            
            // Check if date is valid
            if (isNaN(dateObj.getTime())) {
                return date; // Return original if invalid
            }
            
            const now = new Date();
            const diffTime = now - dateObj;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Format based on how recent the email is
            if (diffDays === 0) {
                // Today - show time
                const time = dateObj.toLocaleTimeString(I18n.getLanguage(), {
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                return I18n.t('todayAt', { time });
            } else if (diffDays === 1) {
                // Yesterday
                const time = dateObj.toLocaleTimeString(I18n.getLanguage(), {
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                return I18n.t('yesterdayAt', { time });
            } else if (diffDays < 7) {
                // This week - show day and time
                return dateObj.toLocaleDateString(I18n.getLanguage(), {
                    weekday: 'short' 
                }) + ', ' + dateObj.toLocaleTimeString(I18n.getLanguage(), {
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            } else {
                // Older - show full date
                return dateObj.toLocaleDateString(I18n.getLanguage(), {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            
        } catch (error) {
            console.error('Error formatting date:', error);
            return date; // Return original if formatting fails
        }
    }

    /**
     * Format file size
     * 
     * Formats the email size in bytes to human-readable format.
     * 
     * @param {number} size - Size in bytes
     * @returns {string} Formatted size string
     * @example
     * const formatted = this.formatSize(1024);
     */
    formatSize(size) {
        if (!size || size === 0) return '-';
        
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        let sizeValue = size;
        
        while (sizeValue >= 1024 && unitIndex < units.length - 1) {
            sizeValue /= 1024;
            unitIndex++;
        }
        
        return `${new Intl.NumberFormat(I18n.getLanguage(), { maximumFractionDigits: 1 }).format(sizeValue)} ${units[unitIndex]}`;
    }

    /**
     * Format status
     * 
     * Formats the email status for display.
     * 
     * @param {string} status - Email status
     * @returns {string} Formatted status string
     * @example
     * const formatted = this.formatStatus('unread');
     */
    formatStatus(status) {
        if (!status) return '-';
        
        const statusMap = {
            unread: 'statusUnread',
            read: 'statusRead',
            flagged: 'statusFlagged',
            spam: 'statusSpam',
            trash: 'statusTrash',
            draft: 'statusDraft',
            sent: 'statusSent'
        };
        
        const key = statusMap[status.toLowerCase()];
        return key ? I18n.t(key) : status;
    }

    /**
     * Get email data
     * 
     * Returns the current email data.
     * 
     * @returns {Object|null} Current email data
     * @example
     * const data = this.getEmailData();
     */
    getEmailData() {
        return this.emailData;
    }

    /**
     * Update specific field
     * 
     * Updates a specific email detail field.
     * 
     * @param {string} field - Field name (from, date, size, status)
     * @param {string} value - New value
     * @example
     * this.updateField('from', 'new@example.com');
     */
    updateField(field, value) {
        if (this.elements[field]) {
            switch (field) {
                case 'from':
                    this.elements.from.textContent = this.formatSender(value);
                    break;
                case 'date':
                    this.elements.date.textContent = this.formatDate(value);
                    break;
                case 'size':
                    this.elements.size.textContent = this.formatSize(value);
                    break;
                case 'status':
                    this.elements.status.textContent = this.formatStatus(value);
                    break;
            }
        }
    }

    /**
     * Show loading state
     * 
     * Shows a loading state for the email details.
     * 
     * @param {boolean} loading - Whether to show loading state
     * @example
     * this.showLoading(true);
     */
    showLoading(loading) {
        const elements = Object.values(this.elements);
        elements.forEach(element => {
            if (element) {
                if (loading) {
                    element.textContent = I18n.t('loading');
                    element.style.opacity = '0.6';
                } else {
                    element.style.opacity = '1';
                    // Restore original content if available
                    if (this.emailData) {
                        this.updateDisplay();
                    }
                }
            }
        });
    }

    /**
     * Cleanup component
     * 
     * Performs cleanup when the component is destroyed.
     * 
     * @example
     * this.cleanup();
     */
    cleanup() {
        this.emailData = null;
        this.elements = {};
    }
};

/**
 * Make EmailDetailsComponent available globally for non-module environments
 * 
 * This allows the EmailDetailsComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.EmailDetailsComponent = EmailDetailsComponent;
}
