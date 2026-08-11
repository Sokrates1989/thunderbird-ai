/** Shows Thunderbird's recognized archive folders and the manual configuration path. */
const ArchiveSettingsGuideComponent = class {
    static HELP_URL = 'https://support.mozilla.org/kb/archived-messages';

    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('archive-settings-section');
        this.elements = {};
        this.onRefresh = () => this.loadArchiveStatus();
        this.onOpenHelp = () => this.openHelp();
        this.createUI();
        this.attachEventListeners();
    }

    /** Build the guide without implying that protected Thunderbird settings can be deep-linked. */
    createUI() {
        this.container.innerHTML = `
            <h2>${I18n.t('archiveSettingsTitle')}</h2>
            <p class="archive-settings-introduction">${I18n.t('archiveSettingsIntroduction')}</p>
            <div class="archive-settings-path">
                <strong>${I18n.t('archiveSettingsPathLabel')}</strong>
                <span>${I18n.t('archiveSettingsPath')}</span>
            </div>
            <p class="help-text">${I18n.t('archiveSettingsProtectedNote')}</p>
            <div class="archive-settings-actions">
                <button type="button" id="archiveSettingsRefresh" class="btn secondary">
                    <span aria-hidden="true">🔍</span>
                    <span>${I18n.t('archiveSettingsRefresh')}</span>
                </button>
                <button type="button" id="archiveSettingsHelp" class="btn">
                    <span aria-hidden="true">↗</span>
                    <span>${I18n.t('archiveSettingsOpenHelp')}</span>
                </button>
            </div>
            <div id="archiveSettingsFeedback" class="archive-settings-feedback" role="status" aria-live="polite"></div>
            <div id="archiveSettingsResults" class="archive-settings-results" aria-live="polite">
                <p class="archive-settings-placeholder">${I18n.t('archiveSettingsNotChecked')}</p>
            </div>
        `;

        this.elements.refresh = document.getElementById('archiveSettingsRefresh');
        this.elements.help = document.getElementById('archiveSettingsHelp');
        this.elements.feedback = document.getElementById('archiveSettingsFeedback');
        this.elements.results = document.getElementById('archiveSettingsResults');
    }

    attachEventListeners() {
        this.elements.refresh.addEventListener('click', this.onRefresh);
        this.elements.help.addEventListener('click', this.onOpenHelp);
    }

    /** Inspect folder metadata exposed by Thunderbird without changing any account. */
    async inspectAccounts() {
        const accounts = await browser.accounts.list(true);
        const relevantAccounts = accounts.filter(account =>
            !['nntp', 'rss'].includes(account.type)
        );
        return Promise.all(relevantAccounts.map(async account => {
            const archiveFolders = this.findArchiveFolders(account.rootFolder);
            const inspectedFolders = await Promise.all(archiveFolders.map(async folder => {
                let canAddSubfolders = null;
                try {
                    const capabilities = await browser.folders.getFolderCapabilities(folder.id);
                    canAddSubfolders = typeof capabilities.canAddSubfolders === 'boolean'
                        ? capabilities.canAddSubfolders
                        : null;
                } catch (_error) {
                    // Folder recognition remains useful if a server omits capability details.
                }
                return {
                    name: folder.name,
                    path: folder.path,
                    yearFolders: this.existingYearNames(folder),
                    canAddSubfolders
                };
            }));
            return {
                name: account.name,
                archiveFolders: inspectedFolders
            };
        }));
    }

    /** Find only folders Thunderbird marks for archive use; folder names are not guessed. */
    findArchiveFolders(rootFolder) {
        const matches = [];
        const visit = folder => {
            if (!folder) {
                return;
            }
            if (Array.isArray(folder.specialUse) && folder.specialUse.includes('archives')) {
                matches.push(folder);
            }
            for (const child of folder.subFolders || []) {
                visit(child);
            }
        };
        visit(rootFolder);
        return matches;
    }

    existingYearNames(archiveFolder) {
        return (archiveFolder.subFolders || [])
            .map(folder => String(folder.name || ''))
            .filter(name => /^\d{4}$/u.test(name))
            .sort((left, right) => Number(left) - Number(right));
    }

    async loadArchiveStatus() {
        this.setBusy(true);
        this.setFeedback('');
        this.elements.results.replaceChildren(
            this.textElement('p', 'archive-settings-placeholder', I18n.t('archiveSettingsChecking'))
        );
        try {
            this.renderReport(await this.inspectAccounts());
        } catch (error) {
            console.error('Could not inspect Thunderbird archive folders:', error);
            this.elements.results.replaceChildren(
                this.textElement('p', 'archive-settings-placeholder error', I18n.t('archiveSettingsScanFailed'))
            );
        } finally {
            this.setBusy(false);
        }
    }

    renderReport(accounts) {
        const folderCount = accounts.reduce(
            (total, account) => total + account.archiveFolders.length,
            0
        );
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.textElement(
            'p',
            'archive-settings-summary',
            I18n.t('archiveSettingsScanSummary', {
                accounts: accounts.length,
                folders: folderCount
            })
        ));

        const list = document.createElement('div');
        list.className = 'archive-account-list';
        for (const account of accounts) {
            list.appendChild(this.renderAccount(account));
        }
        fragment.appendChild(list);
        fragment.appendChild(this.textElement(
            'p',
            'archive-settings-manual-check',
            I18n.t('archiveSettingsManualCheck')
        ));
        this.elements.results.replaceChildren(fragment);
    }

    renderAccount(account) {
        const card = document.createElement('section');
        card.className = `archive-account-status${account.archiveFolders.length ? ' found' : ' missing'}`;
        card.appendChild(this.textElement('h3', '', account.name));
        if (!account.archiveFolders.length) {
            card.appendChild(this.textElement('p', '', I18n.t('archiveSettingsNoFolder')));
            return card;
        }

        for (const folder of account.archiveFolders) {
            const details = document.createElement('div');
            details.className = 'archive-folder-details';
            details.append(
                this.textElement('p', 'archive-folder-path', I18n.t('archiveSettingsFolderFound', {
                    path: folder.path || folder.name
                })),
                this.textElement('p', 'archive-folder-years', folder.yearFolders.length
                    ? I18n.t('archiveSettingsYears', { years: folder.yearFolders.join(', ') })
                    : I18n.t('archiveSettingsNoYears')),
                this.textElement('p', 'archive-folder-capability', I18n.t(
                    folder.canAddSubfolders === true
                        ? 'archiveSettingsSubfoldersSupported'
                        : folder.canAddSubfolders === false
                            ? 'archiveSettingsSubfoldersUnsupported'
                            : 'archiveSettingsSubfoldersUnknown'
                ))
            );
            card.appendChild(details);
        }
        return card;
    }

    async openHelp() {
        this.elements.help.disabled = true;
        try {
            if (typeof browser.windows?.openDefaultBrowser === 'function') {
                await browser.windows.openDefaultBrowser(ArchiveSettingsGuideComponent.HELP_URL);
            } else {
                await browser.tabs.create({ url: ArchiveSettingsGuideComponent.HELP_URL });
            }
            this.setFeedback(I18n.t('archiveSettingsHelpOpened'), 'success');
        } catch (error) {
            console.error('Could not open Thunderbird archive help:', error);
            this.setFeedback(I18n.t('archiveSettingsHelpFailed'), 'error');
        } finally {
            this.elements.help.disabled = false;
        }
    }

    setBusy(busy) {
        this.elements.refresh.disabled = busy;
        const label = this.elements.refresh.querySelector('span:last-child');
        label.textContent = I18n.t(busy ? 'archiveSettingsRefreshing' : 'archiveSettingsRefresh');
    }

    setFeedback(message, type = '') {
        this.elements.feedback.textContent = message;
        this.elements.feedback.className = `archive-settings-feedback${type ? ` ${type}` : ''}`;
    }

    textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }

    cleanup() {
        this.elements.refresh.removeEventListener('click', this.onRefresh);
        this.elements.help.removeEventListener('click', this.onOpenHelp);
    }
};

if (typeof window !== 'undefined') {
    window.ArchiveSettingsGuideComponent = ArchiveSettingsGuideComponent;
}
