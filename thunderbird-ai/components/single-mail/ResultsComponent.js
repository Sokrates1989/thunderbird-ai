/** Safely renders AI results and runs their follow-up actions. */
const ResultsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.resultsArea;
        this.elements = {
            title: document.getElementById('resultsTitle'),
            content: document.getElementById('resultsContent'),
            actions: document.getElementById('resultsActions')
        };
        this.currentResult = null;
    }

    initialize() {}

    showResults(result) {
        this.currentResult = result;
        this.elements.title.textContent = result?.title || I18n.t('resultsDefault');
        this.elements.content.textContent = result?.content || I18n.t('noResults');
        this.createActionButtons(result?.actions || []);
        this.container.style.display = 'block';
    }

    /** Render editable importance/spam scores and separate operator explanations. */
    showScoring(result) {
        this.currentResult = result;
        this.elements.title.textContent = result.title || I18n.t('singleScoreTitle');
        this.elements.content.replaceChildren();
        const summary = document.createElement('p');
        summary.className = 'score-ai-summary';
        summary.textContent = I18n.t('singleScoreAiResult', {
            importance: result.importanceScore,
            spam: result.spamScore,
            model: I18n.modelLabel(result.model)
        });
        this.elements.content.appendChild(summary);

        const archived = result.archivedFeedback;
        if (archived) {
            const notice = document.createElement('p');
            notice.className = 'score-archive-notice';
            notice.textContent = I18n.t('singleScoreArchiveLoaded');
            this.elements.content.appendChild(notice);
        }
        const initialScores = archived?.correctedScores || {
            importanceScore: result.importanceScore,
            spamScore: result.spamScore
        };
        this.scoreEditors = {
            importance: this.createScoreEditor(
                'importance',
                'dashboardFeedbackImportance',
                initialScores.importanceScore,
                archived?.reasons?.importance
            ),
            spam: this.createScoreEditor(
                'spam',
                'dashboardFeedbackSpam',
                initialScores.spamScore,
                archived?.reasons?.spam
            )
        };
        this.elements.content.append(
            this.scoreEditors.importance.root,
            this.scoreEditors.spam.root
        );
        const privacy = document.createElement('p');
        privacy.className = 'score-privacy';
        privacy.textContent = I18n.t('singleScorePrivacy');
        this.elements.content.appendChild(privacy);

        this.elements.actions.replaceChildren();
        const save = document.createElement('button');
        save.className = 'result-action-btn';
        save.textContent = I18n.t('singleScoreSaveReference');
        save.addEventListener('click', () => this.saveScoringFeedback(save));
        this.elements.actions.appendChild(save);
        this.container.style.display = 'block';
    }

    createScoreEditor(name, labelKey, score, reasons = {}) {
        const root = document.createElement('fieldset');
        root.className = 'score-editor';
        const legend = document.createElement('legend');
        legend.textContent = I18n.t(labelKey);
        root.appendChild(legend);

        const valueRow = document.createElement('label');
        valueRow.className = 'score-value-row';
        const range = document.createElement('input');
        range.type = 'range';
        range.min = '0';
        range.max = '100';
        range.value = String(score);
        range.setAttribute('aria-label', I18n.t(labelKey));
        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0';
        number.max = '100';
        number.value = String(score);
        range.addEventListener('input', () => { number.value = range.value; });
        number.addEventListener('input', () => {
            const normalized = this.normalizeScore(number.value);
            if (normalized !== null) {
                range.value = String(normalized);
            }
        });
        valueRow.append(range, number, document.createTextNode('%'));
        root.appendChild(valueRow);

        const prompt = document.createElement('p');
        prompt.className = 'score-reason-prompt';
        prompt.textContent = I18n.t(name === 'importance'
            ? 'singleScoreImportanceReason'
            : 'singleScoreSpamReason');
        root.appendChild(prompt);
        const categories = new Map();
        for (const category of CONFIG.OPENAI.SCORE_FEEDBACK_CATEGORIES) {
            const label = document.createElement('label');
            label.className = 'score-reason-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = reasons?.categories?.includes(category) || false;
            label.append(checkbox, document.createTextNode(I18n.t(`scoreReason${category[0].toUpperCase()}${category.slice(1)}`)));
            root.appendChild(label);
            categories.set(category, checkbox);
        }
        const text = document.createElement('textarea');
        text.rows = 3;
        text.maxLength = CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS;
        text.placeholder = I18n.t('singleScoreReasonPlaceholder');
        text.value = reasons?.text || '';
        root.appendChild(text);
        return { root, range, number, categories, text };
    }

    async saveScoringFeedback(button) {
        const importanceScore = this.normalizeScore(this.scoreEditors.importance.number.value);
        const spamScore = this.normalizeScore(this.scoreEditors.spam.number.value);
        if (importanceScore === null || spamScore === null) {
            this.manager.showError(I18n.t('dashboardFeedbackInvalid'));
            return;
        }
        button.disabled = true;
        button.textContent = I18n.t('dashboardFeedbackSaving');
        try {
            const response = await this.manager.sendToBackground(
                CONFIG.ACTIONS.DASHBOARD_SAVE_FEEDBACK,
                {
                    messageId: this.currentResult.messageId,
                    originalScores: {
                        importanceScore: this.currentResult.importanceScore,
                        spamScore: this.currentResult.spamScore
                    },
                    correctedScores: { importanceScore, spamScore },
                    reasons: {
                        importance: this.readReasons(this.scoreEditors.importance),
                        spam: this.readReasons(this.scoreEditors.spam)
                    },
                    sourceModel: this.currentResult.model
                }
            );
            if (!response?.success) {
                throw new Error(response?.error || I18n.t('dashboardFeedbackSaveFailed'));
            }
            this.manager.updateStatus(I18n.t('dashboardFeedbackSaved'), 'success');
            button.textContent = I18n.t('singleScoreReferenceSaved');
        } catch (error) {
            this.manager.showError(error.message || I18n.t('dashboardFeedbackSaveFailed'));
            button.textContent = I18n.t('singleScoreSaveReference');
        } finally {
            button.disabled = false;
        }
    }

    readReasons(editor) {
        return {
            categories: [...editor.categories]
                .filter(([_category, checkbox]) => checkbox.checked)
                .map(([category]) => category),
            text: editor.text.value.trim()
        };
    }

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    }

    createActionButtons(actions) {
        this.elements.actions.replaceChildren();
        for (const action of actions) {
            const button = document.createElement('button');
            button.className = 'result-action-btn';
            button.textContent = action.label || action;
            button.addEventListener('click', () => this.handleAction(action));
            this.elements.actions.appendChild(button);
        }
        for (const message of this.currentResult?.similarMessages || []) {
            const button = document.createElement('button');
            button.className = 'result-action-btn';
            button.textContent = `${I18n.t('openMessage')}: ${message.subject}`;
            button.addEventListener('click', () => this.handleAction({
                type: 'open-message',
                messageId: message.id
            }));
            this.elements.actions.appendChild(button);
        }
    }

    async handleAction(action) {
        try {
            const type = action.type || action;
            if (type === 'copy') {
                await navigator.clipboard.writeText(this.currentResult.content);
                this.manager.updateStatus(I18n.t('copied'), 'success');
            } else if (type === 'save') {
                const saved = await StorageManager.saveResult({
                    title: this.currentResult.title,
                    content: this.currentResult.content,
                    messageId: this.currentResult.messageId,
                    model: this.currentResult.model
                });
                if (!saved) {
                    throw new Error(I18n.t('resultSaveFailed'));
                }
                this.manager.updateStatus(I18n.t('saved'), 'success');
            } else if (type === 'reply') {
                const messageId = this.currentResult.messageId || this.manager.emailId;
                await browser.compose.beginReply(messageId, 'replyToSender', {
                    plainTextBody: this.currentResult.content
                });
                this.manager.updateStatus(I18n.t('replyOpened'), 'success');
            } else if (type === 'open-message') {
                await browser.messageDisplay.open({
                    messageId: action.messageId,
                    location: 'tab'
                });
            }
        } catch (error) {
            this.manager.showError(I18n.t('unknownError'));
        }
    }

    hide() {
        this.container.style.display = 'none';
    }

    clear() {
        this.currentResult = null;
        this.hide();
    }

    cleanup() {
        this.currentResult = null;
    }
};

if (typeof window !== 'undefined') {
    window.ResultsComponent = ResultsComponent;
}
