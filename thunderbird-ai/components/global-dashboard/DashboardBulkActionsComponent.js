/** Renders and synchronizes reusable dashboard bulk-action toolbars. */
const DashboardBulkActionsComponent = class {
    constructor(options) {
        this.hosts = [...options.hosts];
        this.onToggleAll = options.onToggleAll;
        this.onAnalyze = options.onAnalyze;
        this.onRescore = options.onRescore;
        this.onMarkRead = options.onMarkRead;
        this.onArchive = options.onArchive;
        this.onTrash = options.onTrash;
        this.floatingHost = options.floatingHost || null;
        this.instances = [];
        this.floatingControls = null;
        this.selectedCount = 0;
        this.toolbarVisibility = new Map();
        this.visibilityObserver = null;
        this.actions = [
            {
                name: 'analyze',
                group: 'ai',
                textKey: 'dashboardAnalyzeSelected',
                iconText: '✨',
                className: 'dashboard-analyze-selected',
                callback: this.onAnalyze
            },
            {
                name: 'rescore',
                group: 'ai',
                textKey: 'dashboardRescoreSelected',
                iconText: '↻',
                className: 'dashboard-rescore-selected',
                callback: this.onRescore
            },
            {
                name: 'markRead',
                group: 'mail',
                textKey: 'dashboardMarkReadSelected',
                iconText: '✓',
                className: 'dashboard-mark-read',
                callback: this.onMarkRead
            },
            {
                name: 'archive',
                group: 'mail',
                textKey: 'dashboardArchiveSelected',
                iconText: '📦',
                className: 'dashboard-archive',
                callback: this.onArchive
            },
            {
                name: 'trash',
                group: 'mail',
                textKey: 'dashboardTrashSelected',
                iconText: '🗑️',
                className: 'dashboard-danger-action',
                callback: this.onTrash
            }
        ];
    }

    /** Render the shared bulk-action contract and begin viewport visibility tracking. */
    initialize() {
        this.instances = this.hosts.map(host => this.renderInto(host));
        if (this.floatingHost) {
            this.floatingControls = this.renderFloatingInto(this.floatingHost);
            this.initializeVisibilityTracking();
        }
    }

    /** Build one toolbar instance whose controls delegate to shared callbacks. */
    renderInto(host) {
        const root = document.createElement('div');
        root.className = 'dashboard-bulk-actions';
        const selection = document.createElement('div');
        selection.className = 'dashboard-bulk-selection';
        const selectionLabel = document.createElement('label');
        const selectAll = document.createElement('input');
        selectAll.type = 'checkbox';
        selectAll.className = 'dashboard-select-all';
        selectAll.addEventListener('change', () => this.onToggleAll(selectAll.checked));
        selectionLabel.append(selectAll, this.textElement('span', I18n.t('dashboardSelectAll')));
        const selectedCount = this.textElement('span', '');
        selectedCount.className = 'dashboard-selected-count';
        selection.append(selectionLabel, selectedCount);

        const actionGroups = document.createElement('div');
        actionGroups.className = 'dashboard-bulk-action-groups';
        const ai = this.actionGroup('dashboardAIActionsGroup', 'ai');
        const mail = this.actionGroup('dashboardMailActionsGroup', 'mail');
        const controls = {};
        for (const action of this.actions) {
            controls[action.name] = this.actionButton(action);
            (action.group === 'ai' ? ai : mail).appendChild(controls[action.name]);
        }
        actionGroups.append(ai, mail);
        root.append(selection, actionGroups);
        host.replaceChildren(root);
        return { root, selectAll, selectedCount, ...controls };
    }

    /** Render the compact action-only copy shown when both full toolbars are off screen. */
    renderFloatingInto(host) {
        const selectedCount = this.textElement('span', '');
        selectedCount.className = 'dashboard-floating-selection-count';
        const controls = {};
        const buttons = this.actions.map(action => {
            controls[action.name] = this.actionButton(action, true);
            return controls[action.name];
        });
        host.setAttribute('role', 'group');
        host.replaceChildren(selectedCount, ...buttons);
        return { selectedCount, ...controls };
    }

    /** Keep every rendered toolbar aligned with the manager-owned selection state. */
    update({ busy, total, selected }) {
        for (const controls of this.instances) {
            controls.selectAll.checked = total > 0 && selected === total;
            controls.selectAll.indeterminate = selected > 0 && selected < total;
            controls.selectAll.disabled = busy || total === 0;
            this.updateActionControls(controls, busy, selected);
            controls.selectedCount.textContent = I18n.t('dashboardSelectedCount', {
                count: selected
            });
        }
        if (this.floatingControls) {
            this.updateActionControls(this.floatingControls, busy, selected);
            this.floatingControls.selectedCount.textContent = I18n.t(
                'dashboardSelectedCount',
                { count: selected }
            );
            this.floatingHost.setAttribute('aria-label', I18n.t(
                'dashboardFloatingBulkActionsLabel',
                { count: selected }
            ));
        }
        this.selectedCount = selected;
        this.updateFloatingVisibility();
    }

    /** Apply the common enabled state to a regular or floating action set. */
    updateActionControls(controls, busy, selected) {
        for (const action of this.actions) {
            controls[action.name].disabled = busy || selected === 0;
        }
    }

    /** Observe whether either complete toolbar is directly visible in the viewport. */
    initializeVisibilityTracking() {
        this.toolbarVisibility = new Map(this.instances.map(instance => [
            instance.root,
            this.isToolbarInViewport(instance.root)
        ]));
        if (typeof globalThis.IntersectionObserver === 'function') {
            this.visibilityObserver = new globalThis.IntersectionObserver(entries => {
                for (const entry of entries) {
                    this.toolbarVisibility.set(entry.target, entry.isIntersecting === true);
                }
                this.updateFloatingVisibility();
            });
            for (const { root } of this.instances) {
                this.visibilityObserver.observe(root);
            }
        }
        this.updateFloatingVisibility();
    }

    /** Avoid a first-frame flash before IntersectionObserver reports initial geometry. */
    isToolbarInViewport(toolbar) {
        if (typeof toolbar?.getBoundingClientRect !== 'function') {
            return true;
        }
        const rectangle = toolbar.getBoundingClientRect();
        const viewportHeight = Number(globalThis.innerHeight)
            || Number(globalThis.document?.documentElement?.clientHeight);
        const viewportWidth = Number(globalThis.innerWidth)
            || Number(globalThis.document?.documentElement?.clientWidth);
        if (!viewportHeight || !viewportWidth) {
            return true;
        }
        return rectangle.bottom > 0
            && rectangle.top < viewportHeight
            && rectangle.right > 0
            && rectangle.left < viewportWidth;
    }

    /** Show floating actions only for a selection with both complete toolbars off screen. */
    updateFloatingVisibility() {
        if (!this.floatingHost) {
            return;
        }
        const toolbarVisible = [...this.toolbarVisibility.values()].some(Boolean);
        this.floatingHost.hidden = this.selectedCount === 0 || toolbarVisible;
    }

    /** Disconnect viewport tracking when a host explicitly tears down the dashboard. */
    destroy() {
        this.visibilityObserver?.disconnect();
        this.visibilityObserver = null;
    }

    /** Create one visibly and accessibly named action group. */
    actionGroup(titleKey, type) {
        const group = document.createElement('div');
        group.className = `dashboard-bulk-action-group ${type}`;
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', I18n.t(titleKey));
        const title = this.textElement('span', I18n.t(titleKey));
        title.className = 'dashboard-action-group-title';
        group.appendChild(title);
        return group;
    }

    /** Create one localized full-width or icon-only bulk button. */
    actionButton(action, floating = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = floating
            ? `floating-action dashboard-floating-bulk-action ${action.className}`
            : `dashboard-bulk-action ${action.className}`;
        const label = I18n.t(action.textKey);
        const icon = this.textElement('span', action.iconText);
        icon.className = 'dashboard-action-icon';
        if (floating) {
            icon.className = 'floating-action-icon';
        }
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
        if (floating) {
            button.setAttribute('aria-label', label);
            button.setAttribute('data-tooltip', label);
        } else {
            button.appendChild(this.textElement('span', label));
        }
        button.addEventListener('click', action.callback);
        return button;
    }

    textElement(tagName, text) {
        const element = document.createElement(tagName);
        element.textContent = text;
        return element;
    }
};

globalThis.DashboardBulkActionsComponent = DashboardBulkActionsComponent;
