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
        this.busy = false;
    }

    /** Replace the dropdown options while preserving the supplied selection contract. */
    render(availableSenders, selectedSenderKeys) {
        this.availableSenders = availableSenders;
        this.selectedSenderKeys = selectedSenderKeys === null
            ? null
            : new Set(selectedSenderKeys);
        this.elements.options.replaceChildren();
        const selectedCount = this.selectionCount();
        const totalCount = this.availableSenders.length;
        this.elements.summary.textContent = this.selectedSenderKeys === null
            ? I18n.t('dashboardSenderAllSummary', { count: totalCount })
            : I18n.t('dashboardSenderSelectedSummary', {
                selected: selectedCount,
                count: totalCount
            });

        if (!totalCount) {
            this.elements.options.appendChild(this.textElement(
                'p',
                'dashboard-sender-empty',
                I18n.t('dashboardNoSenders')
            ));
            return;
        }

        const all = this.checkboxLabel(I18n.t('dashboardAllSenders'));
        all.input.checked = selectedCount === totalCount;
        all.input.indeterminate = selectedCount > 0 && selectedCount < totalCount;
        all.input.addEventListener('change', () => {
            this.emitSelection(all.input.checked ? null : new Set());
        });
        all.label.classList.add('dashboard-sender-all');
        this.elements.options.appendChild(all.label);

        for (const sender of this.availableSenders) {
            const option = this.checkboxLabel(sender.label);
            option.input.checked = this.selectedSenderKeys === null
                || this.selectedSenderKeys.has(sender.key);
            option.input.addEventListener('change', () => {
                this.emitSelection(this.selectionAfterToggle(sender.key, option.input.checked));
            });
            this.elements.options.appendChild(option.label);
        }
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
