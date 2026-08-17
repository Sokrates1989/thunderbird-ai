/** Presents opt-in guidance for switching between overlay and durable tab modes. */
const DashboardLaunchPromptComponent = class {
    constructor({ setStatus }) {
        this.setStatus = setStatus;
        this.activePrompt = null;
        this.elements = {
            dialog: document.getElementById('dashboardLaunchPromptDialog'),
            symbol: document.getElementById('dashboardLaunchPromptSymbol'),
            title: document.getElementById('dashboardLaunchPromptTitle'),
            message: document.getElementById('dashboardLaunchPromptMessage'),
            doNotShow: document.getElementById('dashboardLaunchPromptDoNotShow'),
            later: document.getElementById('dashboardLaunchPromptLater'),
            primary: document.getElementById('dashboardLaunchPromptPrimary')
        };
    }

    async initialize() {
        this.elements.dialog.addEventListener('close', () => {
            this.handleClose().catch(error => {
                console.error('Could not apply dashboard launch prompt choice:', error);
                this.setStatus(I18n.t('dashboardLaunchPreferenceFailed'), 'error');
            });
        });
        const prompt = await DashboardLaunchService.promptForOpen(window.location.search);
        if (prompt) {
            this.showWhenAvailable(prompt);
        }
    }

    showWhenAvailable(prompt) {
        const openDialog = document.querySelector('dialog[open]');
        if (openDialog && openDialog !== this.elements.dialog) {
            openDialog.addEventListener('close', () => this.show(prompt), { once: true });
            return;
        }
        this.show(prompt);
    }

    show(prompt) {
        const adoption = prompt === DashboardLaunchService.PROMPTS.ADOPT_TAB;
        this.activePrompt = prompt;
        this.elements.dialog.returnValue = 'later';
        this.elements.doNotShow.checked = false;
        this.elements.symbol.textContent = adoption ? '⛶' : '💡';
        this.elements.title.textContent = I18n.t(
            adoption ? 'dashboardLaunchAdoptionTitle' : 'dashboardLaunchDiscoveryTitle'
        );
        this.elements.message.textContent = I18n.t(
            adoption ? 'dashboardLaunchAdoptionMessage' : 'dashboardLaunchDiscoveryMessage'
        );
        this.elements.later.textContent = I18n.t(
            adoption ? 'dashboardLaunchKeepOverlay' : 'dashboardLaunchLater'
        );
        this.elements.primary.textContent = I18n.t(
            adoption ? 'dashboardLaunchAlwaysTab' : 'dashboardLaunchTryNow'
        );
        this.elements.dialog.showModal();
    }

    async handleClose() {
        const prompt = this.activePrompt;
        this.activePrompt = null;
        if (!prompt) {
            return;
        }
        await DashboardLaunchService.resolvePrompt(prompt, this.elements.doNotShow.checked);
        if (this.elements.dialog.returnValue !== 'primary') {
            return;
        }
        if (prompt === DashboardLaunchService.PROMPTS.DISCOVER_TAB) {
            await DashboardLaunchService.openExpanded('discovery-prompt');
            return;
        }
        const response = await RetryService.sendRuntimeMessage({
            action: CONFIG.ACTIONS.SET_DASHBOARD_OPEN_MODE,
            mode: DashboardLaunchService.MODES.TAB
        });
        if (!response?.success) {
            throw new Error('Could not persist dashboard tab launch mode.');
        }
        this.setStatus(I18n.t('dashboardLaunchTabModeSaved'), 'success');
    }
};

globalThis.DashboardLaunchPromptComponent = DashboardLaunchPromptComponent;
