/** Renders one dashboard message, its AI scores, and direct reusable actions. */
const DashboardMessageComponent = class {
    constructor(options) {
        this.formatDate = options.formatDate;
        this.onSelectionChanged = options.onSelectionChanged;
        this.onSummarize = options.onSummarize;
        this.onReply = options.onReply;
        this.onChat = options.onChat;
        this.onAnalyze = options.onAnalyze;
        this.onReanalyze = options.onReanalyze;
        this.onCorrectScores = options.onCorrectScores;
        this.onShowPreview = options.onShowPreview;
        this.onExpandPreview = options.onExpandPreview;
        this.onResetPreview = options.onResetPreview;
        this.onHidePreview = options.onHidePreview;
        this.onOpenInTab = options.onOpenInTab;
        this.onMarkRead = options.onMarkRead;
        this.onMarkUnread = options.onMarkUnread;
        this.onExportPdf = options.onExportPdf;
        this.onArchive = options.onArchive;
        this.onTrash = options.onTrash;
        this.onContextMenu = options.onContextMenu;
    }

    /** Build one accessible message row without injecting untrusted HTML. */
    render(message, options) {
        const subject = message.subject || I18n.t('dashboardNoSubject');
        const item = document.createElement('li');
        item.className = `dashboard-message${message.read === true ? ' is-read' : ''}`;
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
        const selectionArea = document.createElement('label');
        selectionArea.className = 'dashboard-message-selection-area';
        selectionArea.append(checkbox, content);
        const messageMain = document.createElement('div');
        messageMain.className = 'dashboard-message-main';
        messageMain.appendChild(selectionArea);
        if (options.previewVisible) {
            messageMain.appendChild(this.preview(message, subject, options));
        }
        const actionGroups = this.actionGroups(message, subject, options);
        item.tabIndex = 0;
        item.setAttribute('aria-label', I18n.t('dashboardMessageContextLabel', { subject }));
        item.addEventListener('contextmenu', event => {
            this.onContextMenu(event, actionGroups);
        });
        item.addEventListener('keydown', event => {
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                this.onContextMenu(event, actionGroups);
            }
        });
        item.append(messageMain, this.actionButtons(actionGroups));
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

    /** Render one independently resizable preview with direct reading controls. */
    preview(message, subject, options) {
        const panel = document.createElement('div');
        panel.className = 'dashboard-message-preview-panel';
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-label', I18n.t('dashboardPreviewPanelLabel', { subject }));
        const previewContent = this.textElement(
            'div',
            'dashboard-message-preview',
            message.previewFailed
                ? I18n.t('dashboardPreviewUnavailable')
                : message.preview || I18n.t('dashboardPreviewEmpty')
        );
        previewContent.style.setProperty(
            '--dashboard-preview-lines',
            String(options.previewLineCount)
        );
        if (message.previewFailed) {
            previewContent.dataset.type = 'error';
        }
        const close = this.previewControl(
            '×',
            I18n.t('dashboardPreviewClose', { subject }),
            () => this.onHidePreview(message),
            'close'
        );
        const controls = document.createElement('div');
        controls.className = 'dashboard-preview-controls';
        if (options.previewCanReset) {
            controls.appendChild(this.previewControl(
                '−',
                I18n.t('dashboardPreviewReset', {
                    subject,
                    lines: options.previewBaselineLineCount
                }),
                () => this.onResetPreview(message),
                'reset'
            ));
        }
        if (options.previewCanExpand && !message.previewFailed) {
            controls.appendChild(this.previewControl(
                '+',
                I18n.t('dashboardPreviewExpand', {
                    subject,
                    lines: options.previewNextLineCount
                }),
                () => this.onExpandPreview(message),
                'expand'
            ));
        }
        controls.appendChild(this.previewControl(
            '⛶',
            I18n.t('dashboardOpenInTabMessage', { subject }),
            () => this.onOpenInTab(message),
            'open-tab'
        ));
        panel.append(previewContent, close, controls);
        return panel;
    }

    /** Create an icon-only preview control with a complete accessible label. */
    previewControl(icon, label, callback, type) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-preview-control ${type}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.textContent = icon;
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            callback();
        });
        return button;
    }

    /** Define the shared row and right-click actions in their visible column order. */
    actionGroups(message, subject, options) {
        const action = (textKey, labelKey, execute, actionOptions = {}) => ({
            textKey,
            labelKey,
            subject,
            execute,
            disabled: options.busy,
            ...actionOptions
        });
        const aiActions = [
            action('dashboardSummarizeOne', 'dashboardSummarizeMessage', () => {
                this.onSummarize(message);
            }, { icon: '📝' }),
            action('dashboardReplyOne', 'dashboardReplyMessage', () => {
                this.onReply(message);
            }, { icon: '✍️' }),
            action('dashboardChatOne', 'dashboardChatMessage', () => {
                this.onChat(message);
            }, { icon: '💬' })
        ];
        if (message.aiAnalysis) {
            aiActions.push(action(
                'dashboardCorrectScores',
                'dashboardCorrectScoresMessage',
                () => this.onCorrectScores(message),
                { icon: '🎚️', className: 'feedback' }
            ));
            aiActions.push(action(
                'dashboardReanalyzeOne',
                'dashboardReanalyzeMessage',
                () => this.onReanalyze(message),
                { icon: '↻', className: 'reanalyze', contextOnly: true }
            ));
        } else {
            aiActions.push(action(
                'dashboardAnalyzeOne',
                'dashboardAnalyzeMessage',
                () => this.onAnalyze(message),
                { icon: '✨', className: 'analyze' }
            ));
        }
        return [
            {
                titleKey: 'dashboardAIActionsGroup',
                type: 'ai',
                actions: aiActions
            },
            {
                titleKey: 'dashboardReadActionsGroup',
                type: 'read',
                actions: [
                    action(
                        'dashboardShowPreviewOne',
                        'dashboardShowPreviewMessage',
                        () => this.onShowPreview(message),
                        {
                            icon: '👁',
                            className: 'show-preview',
                            hidden: options.previewVisible
                        }
                    ),
                    action(
                        'dashboardOpenInTabOne',
                        'dashboardOpenInTabMessage',
                        () => this.onOpenInTab(message),
                        { icon: '↗', className: 'open-message' }
                    ),
                    message.read === true
                        ? action(
                            'dashboardMarkUnreadOne',
                            'dashboardMarkUnreadMessage',
                            () => this.onMarkUnread(message),
                            { icon: '✉', className: 'mark-unread' }
                        )
                        : action(
                            'dashboardMarkReadOne',
                            'dashboardMarkReadMessage',
                            () => this.onMarkRead(message),
                            { icon: '✓', className: 'mark-read' }
                        )
                ]
            },
            {
                titleKey: 'dashboardMailActionsGroup',
                type: 'mail',
                actions: [
                    action(
                        'dashboardExportPdfOne',
                        'dashboardExportPdfMessage',
                        () => this.onExportPdf(message),
                        { icon: '📄', className: 'export-pdf' }
                    ),
                    action(
                        'dashboardArchiveOne',
                        'dashboardArchiveMessage',
                        () => this.onArchive(message),
                        { icon: '📦', className: 'archive' }
                    ),
                    action(
                        'dashboardTrashOne',
                        'dashboardTrashMessage',
                        () => this.onTrash(message),
                        { icon: '🗑️', className: 'danger' }
                    )
                ]
            }
        ];
    }

    /** Render every non-hidden action descriptor into its matching column. */
    actionButtons(groups) {
        const actions = document.createElement('div');
        actions.className = 'dashboard-message-actions';
        for (const group of groups) {
            const actionGroup = this.actionGroup(group.titleKey, group.type);
            for (const action of group.actions.filter(candidate => (
                !candidate.hidden && !candidate.contextOnly
            ))) {
                actionGroup.appendChild(this.actionButton(action));
            }
            actions.appendChild(actionGroup);
        }
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
    actionButton(action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-message-action ${action.className || ''}`.trim();
        button.disabled = action.disabled;
        button.setAttribute('aria-label', I18n.t(action.labelKey, { subject: action.subject }));
        const icon = this.textElement('span', 'dashboard-action-icon', action.icon || '');
        icon.setAttribute('aria-hidden', 'true');
        button.append(
            icon,
            this.textElement('span', 'dashboard-action-label', I18n.t(action.textKey))
        );
        button.addEventListener('click', action.execute);
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
