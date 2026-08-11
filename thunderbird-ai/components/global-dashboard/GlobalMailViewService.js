/** Pure filtering, sorting, and limiting rules for the global mail dashboard. */
const GlobalMailViewService = {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
    COMBINED_LIMIT: 50,
    DEFAULT_SORT_ORDER: 'date-desc',
    DEFAULT_VIEW_MODE: 'account',
    VIEW_MODES: new Set(['account', 'combined']),
    SORT_ORDERS: new Set([
        'date-desc',
        'date-asc',
        'sender-asc',
        'sender-desc',
        'importance-desc',
        'importance-asc',
        'spam-desc',
        'spam-asc',
        'risk-desc',
        'risk-asc',
        'importance-global-desc',
        'importance-global-asc',
        'spam-global-desc',
        'spam-global-asc',
        'risk-global-desc',
        'risk-global-asc'
    ]),
    AI_STATUS_FILTERS: new Set([
        'all',
        'analyzed',
        'unanalyzed',
        'probably-spam',
        'probably-not-spam',
        'probably-risky',
        'probably-low-risk'
    ]),
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

    normalizeViewMode(value) {
        return this.VIEW_MODES.has(value) ? value : this.DEFAULT_VIEW_MODE;
    },

    /** Global score variants flatten account groups even in account-separated mode. */
    isGlobalScoreSort(sortOrder) {
        return this.normalizeSortOrder(sortOrder).includes('-global-');
    },

    /** Combined mode and explicit global score sorts both render one account-neutral list. */
    combinesAccounts(viewMode, sortOrder) {
        return this.normalizeViewMode(viewMode) === 'combined' || this.isGlobalScoreSort(sortOrder);
    },

    baseSortOrder(sortOrder) {
        return this.normalizeSortOrder(sortOrder).replace('-global-', '-');
    },

    /** Resolve unknown persisted AI filters to the inclusive default. */
    normalizeAIStatusFilter(value) {
        return this.AI_STATUS_FILTERS.has(value) ? value : 'all';
    },

    /** Clamp score thresholds to an inclusive percentage range. */
    normalizePercentage(value) {
        const percentage = Number.parseInt(value, 10);
        return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
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
        const baseSortOrder = this.baseSortOrder(sortOrder);
        const viewMode = this.normalizeViewMode(options.viewMode);
        const selectedSenders = options.selectedSenders === null || options.selectedSenders === undefined
            ? null
            : new Set(options.selectedSenders);
        const fromDate = this.startOfDay(this.normalizeDate(options.fromDate));
        const toDate = this.endOfDay(this.normalizeDate(options.toDate));
        const aiStatusFilter = this.normalizeAIStatusFilter(options.aiStatusFilter);
        const importanceMinimum = this.normalizePercentage(options.importanceMinimum);
        const spamMinimum = this.normalizePercentage(options.spamMinimum);
        const riskMinimum = this.normalizePercentage(options.riskMinimum);
        const collator = new Intl.Collator(options.language || I18n.getLanguage(), {
            numeric: true,
            sensitivity: 'base'
        });

        const prepared = accounts.map(account => {
            const matches = (account.messages || [])
                .filter(message => this.matchesSender(message, selectedSenders))
                .filter(message => this.matchesDate(message, fromDate, toDate))
                .filter(message => this.matchesAI(
                    message,
                    aiStatusFilter,
                    importanceMinimum,
                    spamMinimum,
                    riskMinimum
                ));
            return {
                ...account,
                sourceCount: (account.messages || []).length,
                matchingCount: matches.length,
                messages: matches
            };
        });
        if (!accounts.length) {
            return [];
        }
        if (viewMode === 'combined') {
            return [this.combineNewest(prepared, baseSortOrder, collator)];
        }
        if (this.isGlobalScoreSort(sortOrder)) {
            return [this.combineByScore(prepared, baseSortOrder, collator)];
        }
        return prepared.map(account => ({
            ...account,
            messages: account.messages
                .sort((left, right) => this.compare(left, right, baseSortOrder, collator))
                .slice(0, limit)
        }));
    },

    /** Select the newest global candidate set before applying its display sorting. */
    combineNewest(accounts, sortOrder, collator) {
        const allMatches = this.flattenAccounts(accounts);
        const newest = allMatches
            .sort((left, right) => this.compare(left, right, 'date-desc', collator))
            .slice(0, this.COMBINED_LIMIT);
        return this.combinedAccount(
            accounts,
            newest.sort((left, right) => this.compare(left, right, sortOrder, collator)),
            allMatches.length
        );
    },

    /** Rank the complete filtered snapshot globally by one of the explicit AI score orders. */
    combineByScore(accounts, sortOrder, collator) {
        const allMatches = this.flattenAccounts(accounts);
        const messages = allMatches
            .sort((left, right) => this.compare(left, right, sortOrder, collator))
            .slice(0, this.COMBINED_LIMIT);
        return this.combinedAccount(accounts, messages, allMatches.length);
    },

    flattenAccounts(accounts) {
        return accounts.flatMap(account => (account.messages || []).map(message => {
            message.dashboardAccountId = account.accountId;
            message.dashboardAccountName = account.accountName;
            return message;
        }));
    },

    combinedAccount(accounts, messages, matchingCount) {
        return {
            accountId: '__all_accounts__',
            accountName: I18n.t('dashboardAllAccounts'),
            sourceCount: accounts.reduce((total, account) => total + account.sourceCount, 0),
            matchingCount,
            failedAccountCount: accounts.filter(account => account.failed).length,
            messages,
            failed: false,
            combined: true
        };
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

    /** Apply analysis state and score thresholds after local mailbox filters. */
    matchesAI(message, statusFilter, importanceMinimum, spamMinimum, riskMinimum) {
        const analysis = message.aiAnalysis;
        if (statusFilter === 'unanalyzed') {
            return !analysis;
        }
        if (!analysis) {
            return statusFilter === 'all'
                && importanceMinimum === 0
                && spamMinimum === 0
                && riskMinimum === 0;
        }
        if (statusFilter === 'probably-spam' && analysis.spamScore < 50) {
            return false;
        }
        if (statusFilter === 'probably-not-spam' && analysis.spamScore >= 50) {
            return false;
        }
        if (statusFilter === 'probably-risky'
            && (!Number.isFinite(analysis.riskScore) || analysis.riskScore < 50)) {
            return false;
        }
        if (statusFilter === 'probably-low-risk'
            && (!Number.isFinite(analysis.riskScore) || analysis.riskScore >= 50)) {
            return false;
        }
        const riskMatches = Number.isFinite(analysis.riskScore)
            ? analysis.riskScore >= riskMinimum
            : riskMinimum === 0;
        return analysis.importanceScore >= importanceMinimum
            && analysis.spamScore >= spamMinimum
            && riskMatches;
    },

    /** Compare headers using the requested primary order and deterministic tie breakers. */
    compare(left, right, sortOrder, collator) {
        if (sortOrder === 'sender-asc' || sortOrder === 'sender-desc') {
            const senderResult = collator.compare(this.senderLabel(left), this.senderLabel(right));
            if (senderResult !== 0) {
                return sortOrder === 'sender-asc' ? senderResult : -senderResult;
            }
        }

        if (sortOrder.startsWith('importance-')
            || sortOrder.startsWith('spam-')
            || sortOrder.startsWith('risk-')) {
            const scoreName = sortOrder.startsWith('importance-')
                ? 'importanceScore'
                : sortOrder.startsWith('spam-')
                    ? 'spamScore'
                    : 'riskScore';
            const direction = sortOrder.endsWith('-asc') ? 1 : -1;
            const scoreResult = this.compareAIScores(left, right, scoreName, direction);
            if (scoreResult !== 0) {
                return scoreResult;
            }
        }

        const dateDirection = sortOrder === 'date-asc' ? 1 : -1;
        const dateResult = this.compareDates(left.date, right.date, dateDirection);
        if (dateResult !== 0) {
            return dateResult;
        }
        return collator.compare(String(left.subject || ''), String(right.subject || ''));
    },

    /** Compare analyzed scores while consistently placing unanalysed messages last. */
    compareAIScores(left, right, scoreName, direction) {
        const leftScore = left.aiAnalysis?.[scoreName];
        const rightScore = right.aiAnalysis?.[scoreName];
        if (!Number.isFinite(leftScore)) {
            return Number.isFinite(rightScore) ? 1 : 0;
        }
        if (!Number.isFinite(rightScore)) {
            return -1;
        }
        return (leftScore - rightScore) * direction;
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
