/** Owns visibility and independently sized dashboard message previews. */
const DashboardPreviewController = class {
    static LINE_STEP = 4;

    static MIN_LINES = 1;

    static MAX_LINES = 20;

    constructor(options) {
        this.getBaselineLines = options.getBaselineLines;
        this.isGlobalEnabled = options.isGlobalEnabled;
        this.loadPreview = options.loadPreview;
        this.persistDefaultLines = options.persistDefaultLines;
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

    /** Apply an explicitly entered global height to every currently open preview. */
    applyDefaultToOpenPreviews() {
        this.lineCounts.clear();
    }

    /** Provide the complete render state for one message without persisting mailbox data. */
    optionsFor(message) {
        const baseline = this.normalizeLines(this.getBaselineLines());
        const visible = !this.hiddenMessageIds.has(message.id)
            && (this.isGlobalEnabled() || this.expandedMessageIds.has(message.id));
        const storedLines = this.lineCounts.get(message.id);
        const lineCount = storedLines === undefined
            ? baseline
            : this.normalizeLines(storedLines);
        if (visible && storedLines === undefined) {
            this.lineCounts.set(message.id, lineCount);
        }
        return {
            previewVisible: visible,
            previewLineCount: lineCount,
            previewPreviousLineCount: Math.max(
                DashboardPreviewController.MIN_LINES,
                lineCount - DashboardPreviewController.LINE_STEP
            ),
            previewNextLineCount: Math.min(
                DashboardPreviewController.MAX_LINES,
                lineCount + DashboardPreviewController.LINE_STEP
            ),
            previewCanExpand: visible && lineCount < DashboardPreviewController.MAX_LINES,
            previewCanShrink: visible && lineCount > DashboardPreviewController.MIN_LINES
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

    /** Increase one preview and persist that height as the default for future previews. */
    async expand(message) {
        const options = this.optionsFor(message);
        if (!options.previewCanExpand) {
            return;
        }
        await this.resize(message, options.previewNextLineCount);
    }

    /** Reduce one preview and persist that height as the default for future previews. */
    async shrink(message) {
        const options = this.optionsFor(message);
        if (!options.previewCanShrink) {
            return;
        }
        await this.resize(message, options.previewPreviousLineCount);
    }

    /** Apply one bounded per-message height while updating the durable global default. */
    async resize(message, lineCount) {
        const normalizedLines = this.normalizeLines(lineCount);
        this.lineCounts.set(message.id, normalizedLines);
        const persistence = this.persistDefaultLines(normalizedLines);
        this.render();
        await persistence;
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
            ? Math.min(
                DashboardPreviewController.MAX_LINES,
                Math.max(DashboardPreviewController.MIN_LINES, lines)
            )
            : 3;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardPreviewController = DashboardPreviewController;
}
