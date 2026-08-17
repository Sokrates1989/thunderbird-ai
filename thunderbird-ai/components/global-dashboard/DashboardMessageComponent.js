/** Renders one dashboard message, its AI scores, and direct reusable actions. */
const DashboardMessageComponent = class {
    constructor(options) {
        this.formatDate = options.formatDate;
        this.onSelectionChanged = options.onSelectionChanged;
        this.onSummarize = options.onSummarize;
        this.onReply = options.onReply;
        this.onCorrectScores = options.onCorrectScores;
        this.onMarkRead = options.onMarkRead;
        this.onExportPdf = options.onExportPdf;
        this.onArchive = options.onArchive;
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
        const metadataKey = options.showAccount && message.dashboardAccountName
            ? 'dashboardMessageCombinedMeta'
            : 'dashboardMessageMeta';
        content.appendChild(this.textElement('div', 'dashboard-message-meta', I18n.t(metadataKey, {
            author: message.author || I18n.t('dashboardUnknownSender'),
            date: this.formatDate(message.date),
            account: message.dashboardAccountName || ''
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

    /** Render importance, spam, and risk classifications with legacy-score handling. */
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
        const scoreElements = [
            this.textElement('span', 'dashboard-ai-score importance', I18n.t('dashboardImportanceScore', {
                score: analysis.importanceScore,
                level: I18n.t(importanceLevel)
            })),
            this.textElement('span', `dashboard-ai-score spam${analysis.spamScore >= 50 ? ' likely' : ''}`, I18n.t('dashboardSpamScore', {
                score: analysis.spamScore,
                classification: I18n.t(spamClassification)
            }))
        ];
        if (Number.isFinite(analysis.riskScore)) {
            const riskLevel = analysis.riskScore >= 67
                ? 'dashboardRiskHigh'
                : analysis.riskScore >= 34
                    ? 'dashboardRiskMedium'
                    : 'dashboardRiskLow';
            scoreElements.push(this.textElement(
                'span',
                `dashboard-ai-score risk${analysis.riskScore >= 50 ? ' elevated' : ''}`,
                I18n.t('dashboardRiskScore', {
                    score: analysis.riskScore,
                    level: I18n.t(riskLevel)
                })
            ));
        } else {
            scoreElements.push(this.textElement(
                'span',
                'dashboard-ai-score risk unknown',
                I18n.t('dashboardRiskNotScored')
            ));
        }
        scores.append(...scoreElements);
        if (analysis.corrected) {
            scores.appendChild(this.textElement(
                'span',
                'dashboard-ai-score corrected',
                I18n.t('dashboardFeedbackCorrectedMarker')
            ));
        }
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

    /** Separate reusable AI workflows from ordinary Thunderbird mailbox actions. */
    actionButtons(message, subject, busy) {
        const actions = document.createElement('div');
        actions.className = 'dashboard-message-actions';
        const aiActions = this.actionGroup('dashboardAIActionsGroup', 'ai');
        aiActions.append(
            this.actionButton(
                'dashboardSummarizeOne',
                'dashboardSummarizeMessage',
                subject,
                busy,
                () => this.onSummarize(message),
                { icon: '📝' }
            ),
            this.actionButton(
                'dashboardReplyOne',
                'dashboardReplyMessage',
                subject,
                busy,
                () => this.onReply(message),
                { icon: '✍️' }
            )
        );
        if (message.aiAnalysis) {
            aiActions.appendChild(this.actionButton(
                'dashboardCorrectScores',
                'dashboardCorrectScoresMessage',
                subject,
                busy,
                () => this.onCorrectScores(message),
                { icon: '🎚️', className: 'feedback' }
            ));
        }
        const mailActions = this.actionGroup('dashboardMailActionsGroup', 'mail');
        mailActions.append(
            this.actionButton(
                'dashboardMarkReadOne',
                'dashboardMarkReadMessage',
                subject,
                busy,
                () => this.onMarkRead(message),
                { icon: '✓', className: 'mark-read' }
            ),
            this.actionButton(
                'dashboardExportPdfOne',
                'dashboardExportPdfMessage',
                subject,
                busy,
                () => this.onExportPdf(message),
                { icon: '📄', className: 'export-pdf' }
            ),
            this.actionButton(
                'dashboardArchiveOne',
                'dashboardArchiveMessage',
                subject,
                busy,
                () => this.onArchive(message),
                { icon: '📦', className: 'archive' }
            ),
            this.actionButton(
                'dashboardTrashOne',
                'dashboardTrashMessage',
                subject,
                busy,
                () => this.onTrash(message),
                { icon: '🗑️', className: 'danger' }
            )
        );
        actions.append(aiActions, mailActions);
        return actions;
    }

    /** Create one visibly labelled action group that also exposes an accessible name. */
    actionGroup(titleKey, type) {
        const group = document.createElement('div');
        group.className = `dashboard-message-action-group ${type}`;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', I18n.t(titleKey));
        group.appendChild(this.textElement(
            'span',
            'dashboard-action-group-title',
            I18n.t(titleKey)
        ));
        return group;
    }

    /** Build an icon-labelled button without placing decorative icons in its accessible name. */
    actionButton(textKey, labelKey, subject, busy, callback, options = {}) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-message-action ${options.className || ''}`.trim();
        button.disabled = busy;
        button.setAttribute('aria-label', I18n.t(labelKey, { subject }));
        const icon = this.textElement('span', 'dashboard-action-icon', options.icon || '');
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, this.textElement('span', 'dashboard-action-label', I18n.t(textKey)));
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
