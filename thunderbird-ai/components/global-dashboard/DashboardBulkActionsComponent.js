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
        this.instances = [];
    }

    /** Render the same bulk-action contract into every configured host. */
    initialize() {
        this.instances = this.hosts.map(host => this.renderInto(host));
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
        const analyze = this.actionButton(
            'dashboardAnalyzeSelected',
            '✨',
            'dashboard-analyze-selected',
            this.onAnalyze
        );
        const rescore = this.actionButton(
            'dashboardRescoreSelected',
            '↻',
            'dashboard-rescore-selected',
            this.onRescore
        );
        ai.append(analyze, rescore);
        const mail = this.actionGroup('dashboardMailActionsGroup', 'mail');
        const markRead = this.actionButton(
            'dashboardMarkReadSelected',
            '✓',
            'dashboard-mark-read',
            this.onMarkRead
        );
        const archive = this.actionButton(
            'dashboardArchiveSelected',
            '📦',
            'dashboard-archive',
            this.onArchive
        );
        const trash = this.actionButton(
            'dashboardTrashSelected',
            '🗑️',
            'dashboard-danger-action',
            this.onTrash
        );
        mail.append(markRead, archive, trash);
        actionGroups.append(ai, mail);
        root.append(selection, actionGroups);
        host.replaceChildren(root);
        return { selectAll, selectedCount, analyze, rescore, markRead, archive, trash };
    }

    /** Keep every rendered toolbar aligned with the manager-owned selection state. */
    update({ busy, total, selected }) {
        for (const controls of this.instances) {
            controls.selectAll.checked = total > 0 && selected === total;
            controls.selectAll.indeterminate = selected > 0 && selected < total;
            controls.selectAll.disabled = busy || total === 0;
            for (const action of [
                controls.analyze,
                controls.rescore,
                controls.markRead,
                controls.archive,
                controls.trash
            ]) {
                action.disabled = busy || selected === 0;
            }
            controls.selectedCount.textContent = I18n.t('dashboardSelectedCount', {
                count: selected
            });
        }
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

    /** Create one localized icon-labelled bulk button. */
    actionButton(textKey, iconText, className, callback) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-bulk-action ${className}`;
        const icon = this.textElement('span', iconText);
        icon.className = 'dashboard-action-icon';
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, this.textElement('span', I18n.t(textKey)));
        button.addEventListener('click', callback);
        return button;
    }

    textElement(tagName, text) {
        const element = document.createElement(tagName);
        element.textContent = text;
        return element;
    }
};

globalThis.DashboardBulkActionsComponent = DashboardBulkActionsComponent;
