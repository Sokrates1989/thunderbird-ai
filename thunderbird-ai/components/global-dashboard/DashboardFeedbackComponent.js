/** Owns the score-correction dialog and its exact slider/number synchronization. */
const DashboardFeedbackComponent = class {
    constructor(options) {
        this.onSave = options.onSave;
        this.dialog = document.getElementById('dashboardFeedbackDialog');
        this.form = document.getElementById('dashboardFeedbackForm');
        this.subject = document.getElementById('dashboardFeedbackSubject');
        this.importanceRange = document.getElementById('dashboardFeedbackImportanceRange');
        this.importanceNumber = document.getElementById('dashboardFeedbackImportanceNumber');
        this.spamRange = document.getElementById('dashboardFeedbackSpamRange');
        this.spamNumber = document.getElementById('dashboardFeedbackSpamNumber');
        this.reason = document.getElementById('dashboardFeedbackReason');
        this.status = document.getElementById('dashboardFeedbackStatus');
        this.cancel = document.getElementById('dashboardFeedbackCancel');
        this.submit = document.getElementById('dashboardFeedbackSubmit');
        this.message = null;
        this.bindEvents();
    }

    bindEvents() {
        this.syncPair(this.importanceRange, this.importanceNumber);
        this.syncPair(this.spamRange, this.spamNumber);
        this.cancel.addEventListener('click', () => this.dialog.close());
        this.form.addEventListener('submit', event => {
            event.preventDefault();
            this.save().catch(error => this.showError(error));
        });
    }

    syncPair(range, number) {
        range.addEventListener('input', () => { number.value = range.value; });
        number.addEventListener('input', () => {
            const score = this.normalizeScore(number.value);
            if (score !== null) {
                range.value = String(score);
            }
        });
    }

    open(message) {
        this.message = message;
        this.subject.textContent = message.subject || I18n.t('dashboardNoSubject');
        this.setScore(this.importanceRange, this.importanceNumber, message.aiAnalysis.importanceScore);
        this.setScore(this.spamRange, this.spamNumber, message.aiAnalysis.spamScore);
        this.reason.value = '';
        this.status.textContent = '';
        this.setBusy(false);
        this.dialog.showModal();
    }

    async save() {
        const importanceScore = this.normalizeScore(this.importanceNumber.value);
        const spamScore = this.normalizeScore(this.spamNumber.value);
        if (importanceScore === null || spamScore === null) {
            throw new Error(I18n.t('dashboardFeedbackInvalid'));
        }
        if (importanceScore === this.message.aiAnalysis.importanceScore
            && spamScore === this.message.aiAnalysis.spamScore) {
            throw new Error(I18n.t('dashboardFeedbackNoChange'));
        }
        this.setBusy(true);
        this.message.correctedImportanceScore = importanceScore;
        this.message.correctedSpamScore = spamScore;
        await this.onSave(this.message, this.reason.value.trim());
        this.dialog.close();
    }

    showError(error) {
        console.error('Could not save dashboard score feedback:', error);
        this.status.textContent = error.message || I18n.t('dashboardFeedbackSaveFailed');
        this.setBusy(false);
    }

    setBusy(busy) {
        for (const element of [
            this.importanceRange,
            this.importanceNumber,
            this.spamRange,
            this.spamNumber,
            this.reason,
            this.cancel,
            this.submit
        ]) {
            element.disabled = busy;
        }
        this.submit.textContent = I18n.t(busy ? 'dashboardFeedbackSaving' : 'dashboardFeedbackSave');
    }

    setScore(range, number, value) {
        const score = this.normalizeScore(value) ?? 0;
        range.value = String(score);
        number.value = String(score);
    }

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardFeedbackComponent = DashboardFeedbackComponent;
}
