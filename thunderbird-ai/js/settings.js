class SettingsManager {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        // Form elements
        this.openaiApiKeyInput = document.getElementById('openaiApiKey');
        this.modelSelect = document.getElementById('model');
        this.autoProcessCheckbox = document.getElementById('autoProcess');
        
        // Buttons
        this.saveBtn = document.getElementById('saveBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.testApiBtn = document.getElementById('testApiBtn');
        
        // Status and results
        this.status = document.getElementById('status');
        this.testResult = document.getElementById('testResult');
        
        // Statistics
        this.emailsAnalyzed = document.getElementById('emailsAnalyzed');
        this.apiCalls = document.getElementById('apiCalls');
        this.lastUsed = document.getElementById('lastUsed');
    }

    attachEventListeners() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.resetBtn.addEventListener('click', () => this.resetSettings());
        this.closeBtn.addEventListener('click', () => this.closeSettings());
        this.testApiBtn.addEventListener('click', () => this.testApiConnection());
    }

    async loadSettings() {
        try {
            const settings = await this.sendToBackground('getSettings');
            
            if (settings) {
                this.openaiApiKeyInput.value = settings.openaiApiKey || '';
                this.modelSelect.value = settings.model || 'gpt-3.5-turbo';
                this.autoProcessCheckbox.checked = settings.autoProcess || false;
            }
            
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Fehler beim Laden der Einstellungen', 'error');
        }
    }

    async saveSettings() {
        try {
            const settings = {
                openaiApiKey: this.openaiApiKeyInput.value.trim(),
                model: this.modelSelect.value,
                autoProcess: this.autoProcessCheckbox.checked
            };

            const result = await this.sendToBackground('saveSettings', settings);
            
            if (result.success) {
                this.showStatus('Einstellungen erfolgreich gespeichert!', 'success');
            } else {
                this.showStatus('Fehler beim Speichern: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Fehler beim Speichern der Einstellungen', 'error');
        }
    }

    async resetSettings() {
        if (confirm('Möchten Sie wirklich alle Einstellungen zurücksetzen?')) {
            try {
                this.openaiApiKeyInput.value = '';
                this.modelSelect.value = 'gpt-3.5-turbo';
                this.autoProcessCheckbox.checked = false;
                
                const result = await this.sendToBackground('saveSettings', {
                    openaiApiKey: '',
                    model: 'gpt-3.5-turbo',
                    autoProcess: false
                });
                
                if (result.success) {
                    this.showStatus('Einstellungen zurückgesetzt!', 'success');
                } else {
                    this.showStatus('Fehler beim Zurücksetzen: ' + result.error, 'error');
                }
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showStatus('Fehler beim Zurücksetzen der Einstellungen', 'error');
            }
        }
    }

    async testApiConnection() {
        const apiKey = this.openaiApiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showTestResult('Bitte geben Sie zuerst einen API-Schlüssel ein.', 'error');
            return;
        }

        this.testApiBtn.disabled = true;
        this.testApiBtn.innerHTML = '<span class="icon">⏳</span> Teste Verbindung...';
        
        try {
            const result = await this.sendToBackground('testApiConnection', { apiKey });
            
            if (result.success) {
                this.showTestResult('✅ API-Verbindung erfolgreich! OpenAI ist verfügbar.', 'success');
            } else {
                this.showTestResult('❌ API-Verbindung fehlgeschlagen: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('API test error:', error);
            this.showTestResult('❌ Fehler beim Testen der API-Verbindung: ' + error.message, 'error');
        } finally {
            this.testApiBtn.disabled = false;
            this.testApiBtn.innerHTML = '<span class="icon">🔍</span> API-Verbindung testen';
        }
    }

    async loadStatistics() {
        try {
            const stats = await this.sendToBackground('getStatistics');
            
            if (stats) {
                this.emailsAnalyzed.textContent = stats.emailsAnalyzed || 0;
                this.apiCalls.textContent = stats.apiCalls || 0;
                this.lastUsed.textContent = stats.lastUsed || 'Nie';
            }
            
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    closeSettings() {
        window.close();
    }

    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        
        setTimeout(() => {
            this.status.style.display = 'none';
        }, 5000);
    }

    showTestResult(message, type) {
        this.testResult.textContent = message;
        this.testResult.className = `test-result ${type}`;
    }

    async sendToBackground(action, data = {}) {
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ action, ...data })
                .then(resolve)
                .catch(reject);
        });
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
}); 