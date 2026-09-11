/** Keeps bounded per-message assistant state for the current Thunderbird session. */
globalThis.SingleMailSessionService = {
    STORAGE_KEY: 'singleMailSessions',
    MAX_SESSIONS: 20,
    mutation: Promise.resolve(),

    /** Return the remembered result and chat history for one Thunderbird message. */
    async load(messageId) {
        const key = this.messageKey(messageId);
        if (key === null) {
            return null;
        }
        const stored = await browser.storage.session.get(this.STORAGE_KEY);
        return stored[this.STORAGE_KEY]?.[key] || null;
    },

    /** Merge a partial state update without allowing concurrent background writes to race. */
    async update(messageId, patch) {
        const key = this.messageKey(messageId);
        if (key === null) {
            throw new Error('A message ID is required to retain single-mail state.');
        }
        const operation = async () => {
            const stored = await browser.storage.session.get(this.STORAGE_KEY);
            const sessions = { ...(stored[this.STORAGE_KEY] || {}) };
            sessions[key] = {
                ...(sessions[key] || {}),
                ...patch,
                updatedAt: Date.now()
            };
            const oldestFirst = Object.entries(sessions)
                .sort((left, right) => (left[1]?.updatedAt || 0) - (right[1]?.updatedAt || 0));
            for (const [expiredKey] of oldestFirst.slice(0, -this.MAX_SESSIONS)) {
                delete sessions[expiredKey];
            }
            await browser.storage.session.set({ [this.STORAGE_KEY]: sessions });
            return sessions[key];
        };
        const pending = this.mutation.then(operation, operation);
        this.mutation = pending.then(() => undefined, () => undefined);
        return pending;
    },

    /** Remember the latest rendered result independently of the page that requested it. */
    async rememberResult(messageId, result, kind = 'standard') {
        return this.update(messageId, {
            result: { kind, data: result }
        });
    },

    /** Remember a completed chat conversation for the source message. */
    async rememberChat(messageId, history) {
        return this.update(messageId, {
            chatHistory: Array.isArray(history) ? history : []
        });
    },

    /** Forget chat only after the operator explicitly starts a fresh conversation. */
    async clearChat(messageId) {
        return this.update(messageId, { chatHistory: [] });
    },

    /** Convert a valid Thunderbird message identifier into its storage-map key. */
    messageKey(messageId) {
        if (messageId === undefined || messageId === null || messageId === '') {
            return null;
        }
        return String(messageId);
    }
};
