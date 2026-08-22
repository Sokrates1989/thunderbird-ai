/** Coordinates protected bulk and single-message AI scoring from the dashboard. */
const DashboardAnalysisController = class {
    constructor(options) {
        this.getAccounts = options.getAccounts;
        this.getResults = options.getResults;
        this.setResults = options.setResults;
        this.getSelectedMessageIds = options.getSelectedMessageIds;
        this.rebuild = options.rebuild;
        this.setBusy = options.setBusy;
        this.setStatus = options.setStatus;
        this.confirm = options.confirm;
    }

    /** Analyze only selected messages without persisted scores. */
    async analyzeSelection() {
        const plan = this.createPlan(this.getSelectedMessageIds(), false);
        await this.execute(plan, false, 'selection');
    }

    /** Confirm and intentionally replace scores for every selected message. */
    async rescoreSelection() {
        const plan = this.createPlan(this.getSelectedMessageIds(), true);
        if (!plan.messageIds.length
            || !this.confirm(I18n.t('dashboardRescoreSelectedConfirm', {
                count: plan.messageIds.length
            }))) {
            return;
        }
        await this.execute(plan, true, 'selection');
    }

    /** Analyze one unscored row through the same protected bulk-scoring contract. */
    async analyzeMessage(message) {
        const plan = this.createPlan(new Set([message.id]), false);
        await this.execute(plan, false, 'message');
    }

    /** Confirm and intentionally replace the visible scores for one message. */
    async rescoreMessage(message) {
        const plan = this.createPlan(new Set([message.id]), true);
        if (!plan.messageIds.length
            || !this.confirm(I18n.t('dashboardReanalyzeOneConfirm', {
                subject: message.subject || I18n.t('dashboardNoSubject')
            }))) {
            return;
        }
        await this.execute(plan, true, 'message');
    }

    createPlan(messageIds, includeAnalyzed) {
        return DashboardAIService.createAnalysisPlan(
            this.getAccounts(),
            messageIds,
            includeAnalyzed
        );
    }

    /** Execute one prepared analysis plan and refresh the score-aware dashboard view. */
    async execute(plan, includeAnalyzed, scope) {
        if (!plan.selectedCount) {
            return;
        }
        if (!plan.messageIds.length) {
            const key = scope === 'message'
                ? 'dashboardAnalysisOneAlreadyScored'
                : 'dashboardAnalysisAllSkipped';
            this.setStatus(I18n.t(key, { count: plan.skippedCount }));
            return;
        }
        this.setBusy(true, I18n.t(this.progressKey(includeAnalyzed, scope), {
            count: plan.messageIds.length
        }));
        try {
            const data = await RuntimeDiagnosticService.run(
                'dashboard',
                `${includeAnalyzed ? 'rescore' : 'score'}-${scope}`,
                () => DashboardAIService.analyzePlan(plan)
            );
            const accounts = this.getAccounts();
            const results = await DashboardAIService.saveResults(
                this.getResults(),
                DashboardAIService.addStorageKeys(accounts, data.results),
                data.model,
                { preserveExisting: !includeAnalyzed }
            );
            this.setResults(results);
            DashboardAIService.attachResults(accounts, results);
            await this.rebuild();
            this.showResult(data, plan, includeAnalyzed, scope);
        } catch (error) {
            console.error(`Could not analyze dashboard ${scope}:`, error);
            this.setStatus(
                error?.userFacing === true
                    ? error.message
                    : I18n.t(scope === 'message'
                        ? 'dashboardAnalysisOneFailed'
                        : 'dashboardAnalysisFailed'),
                'error'
            );
        } finally {
            this.setBusy(false);
        }
    }

    progressKey(includeAnalyzed, scope) {
        if (scope === 'message') {
            return includeAnalyzed
                ? 'dashboardReanalysisOneInProgress'
                : 'dashboardAnalysisOneInProgress';
        }
        return includeAnalyzed
            ? 'dashboardRescoreInProgress'
            : 'dashboardAnalysisInProgress';
    }

    /** Present singular row results while preserving the established bulk summaries. */
    showResult(data, plan, includeAnalyzed, scope) {
        if (scope === 'message') {
            this.setStatus(I18n.t(
                data.failedCount
                    ? 'dashboardAnalysisOnePartial'
                    : 'dashboardAnalysisOneSuccess',
                { model: I18n.modelLabel(data.model) }
            ), data.failedCount ? 'warning' : 'success');
            return;
        }
        const skipped = includeAnalyzed ? 0 : plan.skippedCount;
        let statusKey;
        if (data.failedCount) {
            statusKey = skipped
                ? 'dashboardAnalysisPartialWithSkipped'
                : 'dashboardAnalysisPartial';
        } else {
            statusKey = skipped
                ? 'dashboardAnalysisSuccessWithSkipped'
                : 'dashboardAnalysisSuccess';
        }
        this.setStatus(I18n.t(statusKey, {
            count: data.results.length,
            failed: data.failedCount,
            skipped,
            model: I18n.modelLabel(data.model)
        }), data.failedCount ? 'warning' : 'success');
    }
};

if (typeof window !== 'undefined') {
    window.DashboardAnalysisController = DashboardAnalysisController;
}
