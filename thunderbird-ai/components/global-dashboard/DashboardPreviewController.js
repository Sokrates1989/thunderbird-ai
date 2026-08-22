/** Owns session-local visibility and viewport size for dashboard message previews. */
const DashboardPreviewController = class {
    static LINE_STEP = 4;

    static MAX_LINES = 20;

    constructor(options) {
        this.getBaselineLines = options.getBaselineLines;
        this.isGlobalEnabled = options.isGlobalEnabled;
        this.loadPreview = options.loadPreview;
        this.render = options.render;
        this.setBusy = options.setBusy;
        this.setStatus = options.setStatus;
        this.expandedMessageIds = new Set();
        this.hiddenMessageIds = new Set();
        this.lineCounts = new Map();
    }

    /** Restore the global preview control as the visible default when explicitly enabled. */
    setGlobalEnabled(enabled) {
        if (enabled) {
            this.hiddenMessageIds.clear();
        }
    }

    /** Provide the complete render state for one message without persisting mailbox data. */
    optionsFor(message) {
        const baseline = this.normalizeLines(this.getBaselineLines());
        const storedLines = this.lineCounts.get(message.id) || baseline;
        const lineCount = Math.max(
            baseline,
            Math.min(storedLines, DashboardPreviewController.MAX_LINES)
        );
        const visible = !this.hiddenMessageIds.has(message.id)
            && (this.isGlobalEnabled() || this.expandedMessageIds.has(message.id));
        return {
            previewVisible: visible,
            previewLineCount: lineCount,
            previewBaselineLineCount: baseline,
            previewNextLineCount: Math.min(
                DashboardPreviewController.MAX_LINES,
                lineCount + DashboardPreviewController.LINE_STEP
            ),
            previewCanExpand: visible && lineCount < DashboardPreviewController.MAX_LINES,
            previewCanReset: visible && lineCount > baseline
        };
    }

    /** Load and reveal only the explicitly targeted message body in this dashboard. */
    async show(message) {
        if (this.optionsFor(message).previewVisible) {
            return;
        }
        this.setBusy(true, I18n.t('dashboardPreviewOneLoading'));
        try {
            const loaded = message.preview === undefined
                ? await this.loadPreview(message)
                : message.previewFailed !== true;
            this.hiddenMessageIds.delete(message.id);
            this.expandedMessageIds.add(message.id);
            this.render();
            this.setStatus(
                I18n.t(loaded ? 'dashboardPreviewOneLoaded' : 'dashboardPreviewOneFailed'),
                loaded ? 'success' : 'warning'
            );
        } finally {
            this.setBusy(false);
        }
    }

    /** Increase one preview by the bounded four-line step. */
    expand(message) {
        const options = this.optionsFor(message);
        if (!options.previewCanExpand) {
            return;
        }
        this.lineCounts.set(
            message.id,
            Math.min(
                DashboardPreviewController.MAX_LINES,
                options.previewLineCount + DashboardPreviewController.LINE_STEP
            )
        );
        this.render();
    }

    /** Return one enlarged preview directly to its configured initial height. */
    reset(message) {
        if (this.lineCounts.delete(message.id)) {
            this.render();
        }
    }

    /** Remove one preview and discard its transient size override. */
    hide(message) {
        this.expandedMessageIds.delete(message.id);
        this.hiddenMessageIds.add(message.id);
        this.lineCounts.delete(message.id);
        this.render();
    }

    /** Return manually revealed messages that still need previews after a view rebuild. */
    expandedMessages(messages) {
        return messages.filter(message => (
            this.expandedMessageIds.has(message.id)
            && !this.hiddenMessageIds.has(message.id)
        ));
    }

    normalizeLines(value) {
        const lines = Number.parseInt(value, 10);
        return Number.isFinite(lines)
            ? Math.min(DashboardPreviewController.MAX_LINES, Math.max(1, lines))
            : 3;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardPreviewController = DashboardPreviewController;
}
