/** Pure filtering, sorting, and limiting rules for the global mail dashboard. */
const GlobalMailViewService = {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
    DEFAULT_SORT_ORDER: 'date-desc',
    SORT_ORDERS: new Set(['date-desc', 'date-asc', 'sender-asc', 'sender-desc']),
    UNKNOWN_SENDER_KEY: '__unknown_sender__',

    /** Clamp a persisted or user-entered per-account limit to the supported range. */
    normalizeLimit(value) {
        const limit = Number.parseInt(value, 10);
        return Number.isFinite(limit)
            ? Math.min(this.MAX_LIMIT, Math.max(1, limit))
            : this.DEFAULT_LIMIT;
    },

    /** Resolve unknown persisted sort values to the newest-first default. */
    normalizeSortOrder(value) {
        return this.SORT_ORDERS.has(value) ? value : this.DEFAULT_SORT_ORDER;
    },

    /** Accept only native date-input values in the stable ISO calendar format. */
    normalizeDate(value) {
        return /^\d{4}-\d{2}-\d{2}$/u.test(String(value || '')) ? String(value) : '';
    },

    /** Produce a stable case-insensitive sender identity for filtering. */
    senderKey(message) {
        const author = String(message?.author || '').trim();
        return author ? author.toLocaleLowerCase() : this.UNKNOWN_SENDER_KEY;
    },

    /** Present the original sender header or its localized unknown value. */
    senderLabel(message) {
        return String(message?.author || '').trim() || I18n.t('dashboardUnknownSender');
    },

    /** Return unique sender choices in locale-aware alphabetical order. */
    availableSenders(accounts, language = I18n.getLanguage()) {
        const senders = new Map();
        for (const message of accounts.flatMap(account => account.messages || [])) {
            const key = this.senderKey(message);
            if (!senders.has(key)) {
                senders.set(key, this.senderLabel(message));
            }
        }
        const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' });
        return [...senders].map(([key, label]) => ({ key, label }))
            .sort((left, right) => collator.compare(left.label, right.label));
    },

    /** Apply every global view rule before any message body preview is requested. */
    apply(accounts, options = {}) {
        const limit = this.normalizeLimit(options.limit);
        const sortOrder = this.normalizeSortOrder(options.sortOrder);
        const selectedSenders = options.selectedSenders === null || options.selectedSenders === undefined
            ? null
            : new Set(options.selectedSenders);
        const fromDate = this.startOfDay(this.normalizeDate(options.fromDate));
        const toDate = this.endOfDay(this.normalizeDate(options.toDate));
        const collator = new Intl.Collator(options.language || I18n.getLanguage(), {
            numeric: true,
            sensitivity: 'base'
        });

        return accounts.map(account => {
            const matches = (account.messages || [])
                .filter(message => this.matchesSender(message, selectedSenders))
                .filter(message => this.matchesDate(message, fromDate, toDate))
                .sort((left, right) => this.compare(left, right, sortOrder, collator));
            return {
                ...account,
                sourceCount: (account.messages || []).length,
                matchingCount: matches.length,
                messages: matches.slice(0, limit)
            };
        });
    },

    /** Check one message against the optional explicit sender selection. */
    matchesSender(message, selectedSenders) {
        return selectedSenders === null || selectedSenders.has(this.senderKey(message));
    },

    /** Check one message against inclusive local-calendar boundaries. */
    matchesDate(message, fromDate, toDate) {
        if (!fromDate && !toDate) {
            return true;
        }
        const timestamp = this.dateValue(message.date);
        return timestamp !== null
            && (!fromDate || timestamp >= fromDate)
            && (!toDate || timestamp <= toDate);
    },

    /** Compare headers using the requested primary order and deterministic tie breakers. */
    compare(left, right, sortOrder, collator) {
        if (sortOrder === 'sender-asc' || sortOrder === 'sender-desc') {
            const senderResult = collator.compare(this.senderLabel(left), this.senderLabel(right));
            if (senderResult !== 0) {
                return sortOrder === 'sender-asc' ? senderResult : -senderResult;
            }
        }

        const dateDirection = sortOrder === 'date-asc' ? 1 : -1;
        const dateResult = this.compareDates(left.date, right.date, dateDirection);
        if (dateResult !== 0) {
            return dateResult;
        }
        return collator.compare(String(left.subject || ''), String(right.subject || ''));
    },

    /** Compare valid dates in either direction while always placing invalid dates last. */
    compareDates(left, right, direction) {
        const leftValue = this.dateValue(left);
        const rightValue = this.dateValue(right);
        if (leftValue === null) {
            return rightValue === null ? 0 : 1;
        }
        if (rightValue === null) {
            return -1;
        }
        return (leftValue - rightValue) * direction;
    },

    /** Convert a Thunderbird date value to milliseconds or null when invalid. */
    dateValue(value) {
        const date = value instanceof Date ? value : new Date(value || '');
        const timestamp = date.getTime();
        return Number.isFinite(timestamp) ? timestamp : null;
    },

    startOfDay(value) {
        if (!value) {
            return null;
        }
        const timestamp = new Date(`${value}T00:00:00`).getTime();
        return Number.isFinite(timestamp) ? timestamp : null;
    },

    endOfDay(value) {
        if (!value) {
            return null;
        }
        const timestamp = new Date(`${value}T23:59:59.999`).getTime();
        return Number.isFinite(timestamp) ? timestamp : null;
    }
};

if (typeof window !== 'undefined') {
    window.GlobalMailViewService = GlobalMailViewService;
}
