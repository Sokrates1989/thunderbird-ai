/**
 * Renders the sender checkbox dropdown and reports a null selection as the
 * sentinel for "all current and future senders".
 */
const DashboardSenderFilterComponent = class {
    constructor({ details, summary, options, onSelectionChanged, onError }) {
        this.elements = { details, summary, options };
        this.onSelectionChanged = onSelectionChanged;
        this.onError = onError;
        this.availableSenders = [];
        this.selectedSenderKeys = null;
        this.searchQuery = '';
        this.busy = false;
    }

    /** Replace the dropdown options while preserving the supplied selection contract. */
    render(availableSenders, selectedSenderKeys) {
        this.availableSenders = availableSenders;
        this.selectedSenderKeys = selectedSenderKeys === null
            ? null
            : new Set(selectedSenderKeys);
        const totalCount = this.availableSenders.length;
        this.elements.summary.textContent = this.selectedSenderKeys === null
            ? I18n.t('dashboardSenderAllSummary', { count: totalCount })
            : I18n.t('dashboardSenderSelectedSummary', {
                selected: selectedCount,
                count: totalCount
            });

        this.renderOptions();
    }

    /** Rebuild the searchable dropdown while retaining the current query. */
    renderOptions() {
        this.elements.options.replaceChildren();
        const selectedCount = this.selectionCount();
        const totalCount = this.availableSenders.length;
        if (!totalCount) {
            this.elements.options.appendChild(this.textElement(
                'p',
                'dashboard-sender-empty',
                I18n.t('dashboardNoSenders')
            ));
            return;
        }

        const list = document.createElement('div');
        list.className = 'dashboard-sender-list';
        const search = this.searchField(() => {
            this.renderSenderList(list);
            this.updateAllToggle(all.input);
        });
        const all = this.checkboxLabel(I18n.t('dashboardAllSenders'));
        all.input.addEventListener('change', () => {
            this.emitSelection(this.selectionForFiltered(all.input.checked));
        });
        all.label.classList.add('dashboard-sender-all');
        this.elements.options.append(search.label, all.label, list);
        this.renderSenderList(list);
        this.updateAllToggle(all.input);
    }

    /** Render only matching senders; selection still belongs to the full sender set. */
    renderSenderList(list) {
        list.replaceChildren();
        const senders = this.filteredSenders();
        if (!senders.length) {
            list.appendChild(this.textElement(
                'p',
                'dashboard-sender-empty',
                I18n.t('dashboardSenderSearchEmpty')
            ));
            return;
        }
        for (const sender of senders) {
            const option = this.checkboxLabel(sender.label);
            option.input.checked = this.selectedSenderKeys === null
                || this.selectedSenderKeys.has(sender.key);
            option.input.addEventListener('change', () => {
                this.emitSelection(this.selectionAfterToggle(sender.key, option.input.checked));
            });
            list.appendChild(option.label);
        }
    }

    /** Filter labels and addresses case-insensitively without changing selection. */
    filteredSenders(query = this.searchQuery) {
        const normalized = String(query || '').trim().toLocaleLowerCase(I18n.getLanguage());
        if (!normalized) {
            return [...this.availableSenders];
        }
        return this.availableSenders.filter(sender => (
            `${sender.label} ${sender.key}`.toLocaleLowerCase(I18n.getLanguage()).includes(normalized)
        ));
    }

    /** Select or clear only the senders visible under the current search query. */
    selectionForFiltered(checked) {
        const availableKeys = this.availableSenders.map(sender => sender.key);
        const selected = this.selectedSenderKeys === null
            ? new Set(availableKeys)
            : new Set(this.selectedSenderKeys);
        for (const sender of this.filteredSenders()) {
            if (checked) {
                selected.add(sender.key);
            } else {
                selected.delete(sender.key);
            }
        }
        return availableKeys.every(key => selected.has(key)) ? null : selected;
    }

    /** Reflect selection state for the currently visible sender subset. */
    updateAllToggle(input) {
        const visible = this.filteredSenders();
        const selectedCount = visible.filter(sender => (
            this.selectedSenderKeys === null || this.selectedSenderKeys.has(sender.key)
        )).length;
        input.checked = visible.length > 0 && selectedCount === visible.length;
        input.indeterminate = selectedCount > 0 && selectedCount < visible.length;
        input.disabled = this.busy || visible.length === 0;
    }

    searchField(onInput) {
        const label = document.createElement('label');
        label.className = 'dashboard-sender-search';
        const text = document.createElement('span');
        text.className = 'visually-hidden';
        text.textContent = I18n.t('dashboardSenderSearchLabel');
        const input = document.createElement('input');
        input.type = 'search';
        input.value = this.searchQuery;
        input.disabled = this.busy;
        input.placeholder = I18n.t('dashboardSenderSearchPlaceholder');
        input.addEventListener('input', () => {
            this.searchQuery = input.value;
            onInput();
        });
        label.append(text, input);
        return { label, input };
    }

    /** Disable interaction while headers or previews are being refreshed. */
    setBusy(busy) {
        this.busy = busy;
        this.elements.details.classList.toggle('is-disabled', busy);
        this.elements.details.setAttribute('aria-disabled', String(busy));
        for (const input of this.elements.options.querySelectorAll('input')) {
            input.disabled = busy;
        }
    }

    /** Build the next explicit sender set, collapsing a complete set back to null. */
    selectionAfterToggle(senderKey, checked) {
        const availableKeys = this.availableSenders.map(sender => sender.key);
        const selected = this.selectedSenderKeys === null
            ? new Set(availableKeys)
            : new Set(this.selectedSenderKeys);
        if (checked) {
            selected.add(senderKey);
        } else {
            selected.delete(senderKey);
        }
        return availableKeys.every(key => selected.has(key)) ? null : selected;
    }

    /** Forward selection changes and keep asynchronous failures at the UI boundary. */
    emitSelection(selection) {
        this.onSelectionChanged(selection).catch(error => this.onError(error));
    }

    selectionCount() {
        if (this.selectedSenderKeys === null) {
            return this.availableSenders.length;
        }
        return this.availableSenders.filter(sender => this.selectedSenderKeys.has(sender.key)).length;
    }

    checkboxLabel(text) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.disabled = this.busy;
        const content = document.createElement('span');
        content.textContent = text;
        label.append(input, content);
        return { input, label };
    }

    textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardSenderFilterComponent = DashboardSenderFilterComponent;
}
