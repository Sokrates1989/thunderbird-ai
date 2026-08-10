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
        const importance = ScoreFeedbackEditor.create({
            name: 'importance',
            score: record.correctedScores.importanceScore,
            reasons: record.reasons?.importance,
            showRange: false,
            rootClass: 'score-archive-reasons'
        });
        const spam = ScoreFeedbackEditor.create({
            name: 'spam',
            score: record.correctedScores.spamScore,
            reasons: record.reasons?.spam,
            showRange: false,
            rootClass: 'score-archive-reasons'
        });
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

    async saveRecord(record, importance, spam, button, status) {
        const correctedScores = {
            importanceScore: ScoreFeedbackEditor.normalizeScore(importance.number.value),
            spamScore: ScoreFeedbackEditor.normalizeScore(spam.number.value)
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
                        importance: ScoreFeedbackEditor.readReasons(importance),
                        spam: ScoreFeedbackEditor.readReasons(spam)
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

    formatDate(value) {
        const date = new Date(value || '');
        return Number.isFinite(date.getTime()) ? date.toLocaleString(I18n.getLanguage()) : '-';
    }
};

if (typeof window !== 'undefined') {
    window.ScoringArchiveComponent = ScoringArchiveComponent;
}
