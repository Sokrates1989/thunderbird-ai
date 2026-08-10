/** Renders one dashboard message, its AI scores, and direct reusable actions. */
const DashboardMessageComponent = class {
    constructor(options) {
        this.formatDate = options.formatDate;
        this.onSelectionChanged = options.onSelectionChanged;
        this.onSummarize = options.onSummarize;
        this.onReply = options.onReply;
        this.onTrash = options.onTrash;
    }

    /** Build one accessible message row without injecting untrusted HTML. */
    render(message, options) {
        const subject = message.subject || I18n.t('dashboardNoSubject');
        const item = document.createElement('li');
        item.className = 'dashboard-message';
        const checkbox = this.selectionCheckbox(message, subject, options);
        const content = document.createElement('div');
        content.className = 'dashboard-message-content';
        content.appendChild(this.textElement('div', 'dashboard-message-subject', subject));
        content.appendChild(this.textElement('div', 'dashboard-message-meta', I18n.t('dashboardMessageMeta', {
            author: message.author || I18n.t('dashboardUnknownSender'),
            date: this.formatDate(message.date)
        })));
        if (message.aiAnalysis) {
            content.appendChild(this.analysisScores(message.aiAnalysis));
        }
        if (options.previewEnabled) {
            content.appendChild(this.preview(message, options.previewLineCount));
        }
        item.append(checkbox, content, this.actionButtons(message, subject, options.busy));
        return item;
    }

    /** Create the selection checkbox while leaving selection ownership to the manager. */
    selectionCheckbox(message, subject, options) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'dashboard-message-select';
        checkbox.checked = options.selected;
        checkbox.disabled = options.busy;
        checkbox.setAttribute('aria-label', I18n.t('dashboardSelectMessage', { subject }));
        checkbox.addEventListener('change', () => this.onSelectionChanged(message.id, checkbox.checked));
        return checkbox;
    }

    /** Render both percentage classifications with human-readable categories. */
    analysisScores(analysis) {
        const scores = document.createElement('div');
        scores.className = 'dashboard-ai-scores';
        const importanceLevel = analysis.importanceScore >= 67
            ? 'dashboardImportanceHigh'
            : analysis.importanceScore >= 34
                ? 'dashboardImportanceMedium'
                : 'dashboardImportanceLow';
        const spamClassification = analysis.spamScore >= 50
            ? 'dashboardProbablySpam'
            : 'dashboardProbablyNotSpam';
        scores.append(
            this.textElement('span', 'dashboard-ai-score importance', I18n.t('dashboardImportanceScore', {
                score: analysis.importanceScore,
                level: I18n.t(importanceLevel)
            })),
            this.textElement('span', `dashboard-ai-score spam${analysis.spamScore >= 50 ? ' likely' : ''}`, I18n.t('dashboardSpamScore', {
                score: analysis.spamScore,
                classification: I18n.t(spamClassification)
            }))
        );
        return scores;
    }

    /** Render a scrollable, line-bounded local body preview. */
    preview(message, previewLineCount) {
        const preview = this.textElement(
            'div',
            'dashboard-message-preview',
            message.previewFailed
                ? I18n.t('dashboardPreviewUnavailable')
                : message.preview || I18n.t('dashboardPreviewEmpty')
        );
        preview.style.setProperty('--dashboard-preview-lines', String(previewLineCount));
        if (message.previewFailed) {
            preview.dataset.type = 'error';
        }
        return preview;
    }

    /** Create direct actions that delegate to existing summary, reply, and trash workflows. */
    actionButtons(message, subject, busy) {
        const actions = document.createElement('div');
        actions.className = 'dashboard-message-actions';
        actions.append(
            this.actionButton('dashboardSummarizeOne', 'dashboardSummarizeMessage', subject, busy, () => this.onSummarize(message)),
            this.actionButton('dashboardReplyOne', 'dashboardReplyMessage', subject, busy, () => this.onReply(message)),
            this.actionButton('dashboardTrashOne', 'dashboardTrashMessage', subject, busy, () => this.onTrash(message), 'danger')
        );
        return actions;
    }

    actionButton(textKey, labelKey, subject, busy, callback, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-message-action ${className}`.trim();
        button.textContent = I18n.t(textKey);
        button.disabled = busy;
        button.setAttribute('aria-label', I18n.t(labelKey, { subject }));
        button.addEventListener('click', callback);
        return button;
    }

    textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardMessageComponent = DashboardMessageComponent;
}
