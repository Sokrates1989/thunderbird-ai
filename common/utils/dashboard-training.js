/**
 * Owns the bounded local archive of explicit operator score corrections.
 * Normal Thunderbird delete operations never access this storage key.
 */
const DashboardTrainingService = {
    /** Archive or update one correction while preserving the first AI score as baseline. */
    async archiveFeedback(message, feedback) {
        const correctedScores = this.normalizeScores(feedback?.correctedScores);
        const submittedOriginalScores = this.normalizeScores(feedback?.originalScores);
        if (!correctedScores || !submittedOriginalScores) {
            throw new Error(I18n.t('dashboardFeedbackInvalid'));
        }
        const reason = String(feedback?.reason || '').trim()
            .slice(0, CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS);
        const reasons = this.normalizeReasons(feedback?.reasons, feedback?.reasons ? '' : reason);
        const storageKey = MessageService.messageIdentity(message);
        const records = await this.loadArchive();
        const existing = records.find(record => record.storageKey === storageKey);
        const now = new Date().toISOString();
        const record = {
            storageKey,
            message: this.messageSnapshot(message),
            originalScores: existing?.originalScores || submittedOriginalScores,
            correctedScores,
            reason: reason || this.reasonSummary(reasons),
            reasons,
            sourceModel: String(feedback?.sourceModel || existing?.sourceModel || ''),
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };
        const bounded = [record, ...records.filter(item => item.storageKey !== storageKey)]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .slice(0, CONFIG.OPENAI.DASHBOARD_FEEDBACK_ARCHIVE_LIMIT);
        await browser.storage.local.set({
            [CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE]: bounded
        });
        return record;
    },

    /** Return the existing correction for this exact message, if one was archived. */
    async findForMessage(message) {
        const storageKey = MessageService.messageIdentity(message);
        return (await this.loadArchive()).find(record => record.storageKey === storageKey) || null;
    },

    /** Update operator scores and per-score explanations without requiring the live email. */
    async updateArchivedFeedback(storageKey, feedback) {
        const records = await this.loadArchive();
        const existing = records.find(record => record.storageKey === String(storageKey || ''));
        const correctedScores = this.normalizeScores(feedback?.correctedScores);
        if (!existing || !correctedScores) {
            throw new Error(I18n.t('dashboardFeedbackInvalid'));
        }
        const reasons = this.normalizeReasons(
            feedback?.reasons,
            feedback?.reasons ? '' : existing.reason
        );
        const updated = {
            ...existing,
            correctedScores,
            reasons,
            reason: feedback?.reasons ? this.reasonSummary(reasons) : existing.reason,
            updatedAt: new Date().toISOString()
        };
        const sorted = [updated, ...records.filter(record => record.storageKey !== updated.storageKey)]
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        await browser.storage.local.set({
            [CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE]: sorted
        });
        return updated;
    },

    /** Remove one learning reference without touching its Thunderbird message. */
    async removeArchivedFeedback(storageKey) {
        const records = await this.loadArchive();
        const remaining = records.filter(record => record.storageKey !== String(storageKey || ''));
        await browser.storage.local.set({
            [CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE]: remaining
        });
        return remaining.length !== records.length;
    },

    /** Load only records that still satisfy the private feedback archive contract. */
    async loadArchive() {
        const stored = await browser.storage.local.get(
            CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE
        );
        const value = stored[CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE];
        return Array.isArray(value)
            ? value.map(record => this.normalizeRecord(record)).filter(Boolean)
            : [];
    },

    /** Select a tiny relevant set; exact senders and subject overlap rank first. */
    async relevantExamples(messages) {
        const records = await this.loadArchive();
        const authors = new Set(messages.map(message => this.normalizeAuthor(message.author)));
        const subjectTokens = new Set(
            messages.flatMap(message => [...MessageService.subjectTokens(message.subject)])
        );
        return records
            .map(record => ({ record, relevance: this.relevance(record, authors, subjectTokens) }))
            .sort((left, right) => (
                right.relevance - left.relevance
                || right.record.updatedAt.localeCompare(left.record.updatedAt)
            ))
            .slice(0, CONFIG.OPENAI.BULK_TRIAGE_FEEDBACK_EXAMPLES)
            .map(item => item.record);
    },

    relevance(record, authors, subjectTokens) {
        const authorScore = authors.has(this.normalizeAuthor(record.message.author)) ? 50 : 0;
        const overlap = [...MessageService.subjectTokens(record.message.subject)]
            .filter(token => subjectTokens.has(token)).length;
        return authorScore + overlap * 5;
    },

    messageSnapshot(message) {
        return {
            subject: String(message?.subject || ''),
            author: String(message?.author || ''),
            date: this.normalizeDate(message?.date),
            content: String(message?.content || '')
                .slice(0, CONFIG.OPENAI.BULK_TRIAGE_EMAIL_CHARACTERS),
            attachments: (message?.attachments || [])
                .map(attachment => ({
                    name: String(typeof attachment === 'string' ? attachment : attachment?.name || '')
                }))
                .filter(attachment => attachment.name)
                .slice(0, 50)
        };
    },

    normalizeRecord(record) {
        const originalScores = this.normalizeScores(record?.originalScores);
        const correctedScores = this.normalizeScores(record?.correctedScores);
        const updatedAt = this.normalizeDate(record?.updatedAt);
        const createdAt = this.normalizeDate(record?.createdAt);
        if (!record?.storageKey || !originalScores || !correctedScores || !updatedAt || !createdAt) {
            return null;
        }
        return {
            storageKey: String(record.storageKey),
            message: this.messageSnapshot(record.message),
            originalScores,
            correctedScores,
            reason: String(record.reason || '')
                .slice(0, CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS),
            reasons: this.normalizeReasons(record.reasons, record.reason),
            sourceModel: String(record.sourceModel || ''),
            createdAt,
            updatedAt
        };
    },

    normalizeScores(scores) {
        const importanceScore = this.normalizeScore(scores?.importanceScore);
        const spamScore = this.normalizeScore(scores?.spamScore);
        return importanceScore === null || spamScore === null
            ? null
            : { importanceScore, spamScore };
    },

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    },

    normalizeReasons(reasons, legacyReason = '') {
        return {
            importance: this.normalizeReasonSection(reasons?.importance, legacyReason),
            spam: this.normalizeReasonSection(reasons?.spam, legacyReason)
        };
    },

    normalizeReasonSection(section, legacyReason = '') {
        const allowed = new Set(CONFIG.OPENAI.SCORE_FEEDBACK_CATEGORIES);
        const categories = Array.isArray(section?.categories)
            ? [...new Set(section.categories.map(String).filter(category => allowed.has(category)))]
            : [];
        const text = String(section?.text || legacyReason || '').trim()
            .slice(0, CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS);
        return { categories, text };
    },

    reasonSummary(reasons) {
        return [reasons?.importance?.text, reasons?.spam?.text]
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .filter((value, index, values) => values.indexOf(value) === index)
            .join(' | ')
            .slice(0, CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS);
    },

    normalizeAuthor(value) {
        return String(value || '').trim().toLocaleLowerCase();
    },

    normalizeDate(value) {
        const timestamp = new Date(value || '').getTime();
        return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
    }
};

if (typeof globalThis !== 'undefined') {
    globalThis.DashboardTrainingService = DashboardTrainingService;
}
