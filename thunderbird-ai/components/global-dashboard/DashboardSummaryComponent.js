/** Renders durable view metadata and contextual session-filter summaries. */
const DashboardSummaryComponent = class {
    constructor({ elements, getState, setStatus }) {
        this.elements = elements;
        this.getState = getState;
        this.setStatus = setStatus;
        this.filterDateFormatter = new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short'
        });
    }

    /** Count active narrowing groups without treating durable sort or layout as filters. */
    activeFilterCount() {
        const state = this.getState();
        return [
            state.includeRead === true,
            Boolean(state.dateFrom || state.dateTo),
            state.selectedSenderKeys !== null,
            state.aiStatusFilter !== 'all',
            state.importanceMinimum > 0,
            state.spamMinimum > 0,
            state.riskMinimum > 0
        ].filter(Boolean).length;
    }

    /** Describe only narrowing filters that currently affect the visible mailbox. */
    activeFilterSummaries() {
        const state = this.getState();
        const summaries = [];
        if (state.includeRead === true) {
            summaries.push(I18n.t('dashboardFilterSummaryIncludeRead'));
        }
        if (state.dateFrom && state.dateTo) {
            summaries.push(I18n.t('dashboardFilterSummaryDateRange', {
                from: this.formatFilterDate(state.dateFrom),
                to: this.formatFilterDate(state.dateTo)
            }));
        } else if (state.dateFrom) {
            summaries.push(I18n.t('dashboardFilterSummaryDateFrom', {
                date: this.formatFilterDate(state.dateFrom)
            }));
        } else if (state.dateTo) {
            summaries.push(I18n.t('dashboardFilterSummaryDateTo', {
                date: this.formatFilterDate(state.dateTo)
            }));
        }
        if (state.selectedSenderKeys !== null) {
            summaries.push(I18n.t('dashboardFilterSummarySenders', {
                count: state.selectedSenderKeys.size
            }));
        }
        if (state.aiStatusFilter !== 'all') {
            summaries.push(I18n.t('dashboardFilterSummaryAIStatus', {
                status: I18n.t(this.aiStatusTranslationKey(state.aiStatusFilter))
            }));
        }
        if (state.importanceMinimum > 0) {
            summaries.push(I18n.t('dashboardFilterSummaryImportance', {
                value: state.importanceMinimum
            }));
        }
        if (state.spamMinimum > 0) {
            summaries.push(I18n.t('dashboardFilterSummarySpam', {
                value: state.spamMinimum
            }));
        }
        if (state.riskMinimum > 0) {
            summaries.push(I18n.t('dashboardFilterSummaryRisk', {
                value: state.riskMinimum
            }));
        }
        return summaries;
    }

    /** Keep the contextual filter warning and reset affordance synchronized. */
    updateFilterStatus(busy = false) {
        const count = this.activeFilterCount();
        this.elements.activeFilters.textContent = I18n.t('dashboardActiveFilters', { count });
        this.elements.activeFilterSummary.textContent = this.activeFilterSummaries().join(' · ');
        this.elements.filterStatus.dataset.active = String(count > 0);
        this.elements.filterStatus.hidden = count === 0;
        this.elements.resetFilters.disabled = busy || count === 0;
    }

    /** Count rendered rows against the complete selected source snapshot. */
    viewCounts(accounts) {
        return accounts.reduce((counts, account) => {
            const messages = account.messages || [];
            const sourceCount = Number.isFinite(account.sourceCount)
                ? account.sourceCount
                : messages.length;
            counts.shown += messages.length;
            counts.total += sourceCount;
            return counts;
        }, { shown: 0, total: 0 });
    }

    /** Format one account's visible and complete source counts from the same contract. */
    shownCount(account) {
        const { shown, total } = this.viewCounts([account]);
        return I18n.t('dashboardShownCount', { shown, total });
    }

    /** Render loaded counts followed by the durable view and emphasized sort choice. */
    showLoadedStatus({ accounts, shown, total }) {
        const state = this.getState();
        this.setStatus(I18n.t(
            state.includeRead ? 'dashboardLoadedAll' : 'dashboardLoaded',
            { accounts, shown, total }
        ));
        const viewKey = state.viewMode === 'combined'
            ? 'dashboardViewSummaryCombined'
            : 'dashboardViewSummaryAccount';
        const sortValue = document.createElement('em');
        sortValue.className = 'dashboard-sort-summary-value';
        sortValue.textContent = I18n.t(this.sortOrderTranslationKey(state.sortOrder));
        this.elements.status.append(
            ' · ',
            `${I18n.t(viewKey)} · ${I18n.t('dashboardSortingSummary')} `,
            sortValue
        );
    }

    /** Resolve an AI-state filter to the same localized label used by its control. */
    aiStatusTranslationKey(status) {
        return {
            analyzed: 'dashboardAIStatusAnalyzed',
            unanalyzed: 'dashboardAIStatusUnanalyzed',
            'probably-spam': 'dashboardAIStatusProbablySpam',
            'probably-not-spam': 'dashboardAIStatusProbablyNotSpam',
            'probably-risky': 'dashboardAIStatusProbablyRisky',
            'probably-low-risk': 'dashboardAIStatusProbablyLowRisk'
        }[status] || 'dashboardAIStatusAll';
    }

    /** Format an ISO date-only filter without applying a timezone offset or time. */
    formatFilterDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
        if (!match) {
            return value;
        }
        return this.filterDateFormatter.format(new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        ));
    }

    /** Resolve the selected sort to the same localized label used by its control. */
    sortOrderTranslationKey(sortOrder) {
        return {
            'date-desc': 'dashboardSortNewest',
            'date-asc': 'dashboardSortOldest',
            'sender-asc': 'dashboardSortSenderAscending',
            'sender-desc': 'dashboardSortSenderDescending',
            'importance-desc': 'dashboardSortImportanceDescending',
            'importance-asc': 'dashboardSortImportanceAscending',
            'spam-desc': 'dashboardSortSpamDescending',
            'spam-asc': 'dashboardSortSpamAscending',
            'risk-desc': 'dashboardSortRiskDescending',
            'risk-asc': 'dashboardSortRiskAscending',
            'importance-global-desc': 'dashboardSortImportanceGlobalDescending',
            'importance-global-asc': 'dashboardSortImportanceGlobalAscending',
            'spam-global-desc': 'dashboardSortSpamGlobalDescending',
            'spam-global-asc': 'dashboardSortSpamGlobalAscending',
            'risk-global-desc': 'dashboardSortRiskGlobalDescending',
            'risk-global-asc': 'dashboardSortRiskGlobalAscending'
        }[sortOrder] || 'dashboardSortNewest';
    }
};

globalThis.DashboardSummaryComponent = DashboardSummaryComponent;
