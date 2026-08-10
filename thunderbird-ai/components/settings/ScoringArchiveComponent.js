/** Manages the bounded score-reference archive from the settings page. */
const ScoringArchiveComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('score-archive-section');
        this.records = [];
        this.initialize();
    }

    initialize() {
        this.container.replaceChildren();
        const title = document.createElement('h2');
        title.textContent = I18n.t('scoreArchiveTitle');
        const help = document.createElement('p');
        help.className = 'help-text';
        help.textContent = I18n.t('scoreArchiveHelp');
        this.count = document.createElement('p');
        this.count.className = 'score-archive-count';
        this.list = document.createElement('div');
        this.list.className = 'score-archive-list';
        const refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'btn secondary score-archive-refresh';
        refresh.textContent = I18n.t('refresh');
        refresh.addEventListener('click', () => this.loadArchive());
        this.container.append(title, help, refresh, this.count, this.list);
        this.loadArchive();
    }

    async loadArchive() {
        this.count.textContent = I18n.t('scoreArchiveLoading');
        try {
            const response = await this.settingsManager.sendToBackground(
                CONFIG.ACTIONS.GET_SCORE_ARCHIVE
            );
            if (!response?.success) {
                throw new Error(response?.error || I18n.t('scoreArchiveLoadFailed'));
            }
            this.records = response.data || [];
            this.render();
        } catch (error) {
            console.error('Could not load score archive:', error);
            this.count.textContent = I18n.t('scoreArchiveLoadFailed');
        }
    }

    render() {
        this.list.replaceChildren();
        this.count.textContent = I18n.t('scoreArchiveCount', { count: this.records.length });
        if (!this.records.length) {
            const empty = document.createElement('p');
            empty.textContent = I18n.t('scoreArchiveEmpty');
            this.list.appendChild(empty);
            return;
        }
        for (const record of this.records) {
            this.list.appendChild(this.createRecord(record));
        }
    }

    createRecord(record) {
        const details = document.createElement('details');
        details.className = 'score-archive-record';
        const summary = document.createElement('summary');
        summary.textContent = record.message.subject || I18n.t('dashboardNoSubject');
        const metadata = document.createElement('p');
        metadata.className = 'score-archive-metadata';
        metadata.textContent = `${record.message.author || '-'} · ${this.formatDate(record.message.date)}`;
        const content = document.createElement('pre');
        content.className = 'score-archive-content';
        content.textContent = record.message.content || I18n.t('emptyMessage');
        const editor = document.createElement('div');
        editor.className = 'score-archive-editor';
        const importance = this.createReasonSection(
            'importance',
            record.correctedScores.importanceScore,
            record.reasons?.importance
        );
        const spam = this.createReasonSection(
            'spam',
            record.correctedScores.spamScore,
            record.reasons?.spam
        );
        editor.append(importance.root, spam.root);

        const actions = document.createElement('div');
        actions.className = 'score-archive-actions';
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'btn primary';
        save.textContent = I18n.t('scoreArchiveSave');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn secondary';
        remove.textContent = I18n.t('scoreArchiveRemove');
        const status = document.createElement('span');
        status.className = 'score-archive-record-status';
        save.addEventListener('click', () => this.saveRecord(
            record,
            importance,
            spam,
            save,
            status
        ));
        remove.addEventListener('click', () => this.removeRecord(record, remove, status));
        actions.append(save, remove, status);
        details.append(summary, metadata, content, editor, actions);
        return details;
    }

    createReasonSection(name, score, reasons = {}) {
        const root = document.createElement('fieldset');
        root.className = 'score-archive-reasons';
        const legend = document.createElement('legend');
        legend.textContent = I18n.t(name === 'importance'
            ? 'dashboardFeedbackImportance'
            : 'dashboardFeedbackSpam');
        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0';
        number.max = '100';
        number.value = String(score);
        number.setAttribute('aria-label', legend.textContent);
        root.append(legend, number, document.createTextNode('%'));
        const categories = new Map();
        for (const category of CONFIG.OPENAI.SCORE_FEEDBACK_CATEGORIES) {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = reasons?.categories?.includes(category) || false;
            label.append(checkbox, document.createTextNode(I18n.t(
                `scoreReason${category[0].toUpperCase()}${category.slice(1)}`
            )));
            root.appendChild(label);
            categories.set(category, checkbox);
        }
        const text = document.createElement('textarea');
        text.rows = 3;
        text.maxLength = CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS;
        text.placeholder = I18n.t('singleScoreReasonPlaceholder');
        text.value = reasons?.text || '';
        root.appendChild(text);
        return { root, number, categories, text };
    }

    async saveRecord(record, importance, spam, button, status) {
        const correctedScores = {
            importanceScore: this.normalizeScore(importance.number.value),
            spamScore: this.normalizeScore(spam.number.value)
        };
        if (correctedScores.importanceScore === null || correctedScores.spamScore === null) {
            status.textContent = I18n.t('dashboardFeedbackInvalid');
            return;
        }
        button.disabled = true;
        status.textContent = I18n.t('dashboardFeedbackSaving');
        try {
            const response = await this.settingsManager.sendToBackground(
                CONFIG.ACTIONS.UPDATE_SCORE_ARCHIVE,
                {
                    storageKey: record.storageKey,
                    correctedScores,
                    reasons: {
                        importance: this.readReasons(importance),
                        spam: this.readReasons(spam)
                    }
                }
            );
            if (!response?.success) {
                throw new Error(response?.error);
            }
            status.textContent = I18n.t('scoreArchiveSaved');
        } catch (error) {
            console.error('Could not update score archive:', error);
            status.textContent = I18n.t('scoreArchiveSaveFailed');
        } finally {
            button.disabled = false;
        }
    }

    async removeRecord(record, button, status) {
        if (!confirm(I18n.t('scoreArchiveRemoveConfirm', {
            subject: record.message.subject || I18n.t('dashboardNoSubject')
        }))) {
            return;
        }
        button.disabled = true;
        try {
            const response = await this.settingsManager.sendToBackground(
                CONFIG.ACTIONS.REMOVE_SCORE_ARCHIVE,
                { storageKey: record.storageKey }
            );
            if (!response?.success) {
                throw new Error(response?.error);
            }
            await this.loadArchive();
            this.settingsManager.showStatus(I18n.t('scoreArchiveRemoved'), 'success');
        } catch (error) {
            console.error('Could not remove score archive record:', error);
            status.textContent = I18n.t('scoreArchiveRemoveFailed');
            button.disabled = false;
        }
    }

    readReasons(section) {
        return {
            categories: [...section.categories]
                .filter(([_category, checkbox]) => checkbox.checked)
                .map(([category]) => category),
            text: section.text.value.trim()
        };
    }

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    }

    formatDate(value) {
        const date = new Date(value || '');
        return Number.isFinite(date.getTime()) ? date.toLocaleString(I18n.getLanguage()) : '-';
    }
};

if (typeof window !== 'undefined') {
    window.ScoringArchiveComponent = ScoringArchiveComponent;
}
