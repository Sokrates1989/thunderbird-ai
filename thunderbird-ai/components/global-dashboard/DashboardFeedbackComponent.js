/** Owns the score-correction dialog and its score-specific operator reasons. */
const DashboardFeedbackComponent = class {
    constructor(options) {
        this.onSave = options.onSave;
        this.dialog = document.getElementById('dashboardFeedbackDialog');
        this.form = document.getElementById('dashboardFeedbackForm');
        this.subject = document.getElementById('dashboardFeedbackSubject');
        this.editorsContainer = document.getElementById('dashboardFeedbackEditors');
        this.status = document.getElementById('dashboardFeedbackStatus');
        this.cancel = document.getElementById('dashboardFeedbackCancel');
        this.submit = document.getElementById('dashboardFeedbackSubmit');
        this.message = null;
        this.bindEvents();
    }

    bindEvents() {
        this.cancel.addEventListener('click', () => this.dialog.close());
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            this.save().catch(error => this.showError(error));
        });
    }

    open(message) {
        this.message = message;
        this.subject.textContent = message.subject || I18n.t('dashboardNoSubject');
        this.editors = {
            importance: ScoreFeedbackEditor.create({
                name: 'importance',
                score: message.aiAnalysis.importanceScore,
                reasons: message.aiAnalysis.reasons?.importance,
                rootClass: 'dashboard-feedback-editor'
            }),
            spam: ScoreFeedbackEditor.create({
                name: 'spam',
                score: message.aiAnalysis.spamScore,
                reasons: message.aiAnalysis.reasons?.spam,
                rootClass: 'dashboard-feedback-editor'
            })
        };
        this.editorsContainer.replaceChildren(
            this.editors.importance.root,
            this.editors.spam.root
        );
        this.status.textContent = '';
        this.setBusy(false);
        this.dialog.showModal();
    }

    async save() {
        const importanceScore = ScoreFeedbackEditor.normalizeScore(
            this.editors.importance.number.value
        );
        const spamScore = ScoreFeedbackEditor.normalizeScore(this.editors.spam.number.value);
        if (importanceScore === null || spamScore === null) {
            throw new Error(I18n.t('dashboardFeedbackInvalid'));
        }
        const reasons = {
            importance: ScoreFeedbackEditor.readReasons(this.editors.importance),
            spam: ScoreFeedbackEditor.readReasons(this.editors.spam)
        };
        if (!this.hasChanges(importanceScore, spamScore, reasons)) {
            throw new Error(I18n.t('dashboardFeedbackNoChange'));
        }
        this.setBusy(true);
        this.message.correctedImportanceScore = importanceScore;
        this.message.correctedSpamScore = spamScore;
        await this.onSave(this.message, reasons);
        this.dialog.close();
    }

    showError(error) {
        console.error('Could not save dashboard score feedback:', error);
        this.status.textContent = error.message || I18n.t('dashboardFeedbackSaveFailed');
        this.setBusy(false);
    }

    setBusy(busy) {
        for (const editor of Object.values(this.editors || {})) {
            ScoreFeedbackEditor.setDisabled(editor, busy);
        }
        this.cancel.disabled = busy;
        this.submit.disabled = busy;
        this.submit.textContent = I18n.t(busy ? 'dashboardFeedbackSaving' : 'dashboardFeedbackSave');
    }

    hasChanges(importanceScore, spamScore, reasons) {
        const analysis = this.message.aiAnalysis;
        if (importanceScore !== analysis.importanceScore || spamScore !== analysis.spamScore) {
            return true;
        }
        return JSON.stringify(reasons) !== JSON.stringify({
            importance: analysis.reasons?.importance || { categories: [], text: '' },
            spam: analysis.reasons?.spam || { categories: [], text: '' }
        });
    }
};

if (typeof window !== 'undefined') {
    window.DashboardFeedbackComponent = DashboardFeedbackComponent;
}
