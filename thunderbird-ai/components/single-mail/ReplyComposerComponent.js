/**
 * Owns the iterative reply-drafting dialog and its safe hand-off to Thunderbird.
 * AI output remains editable, and compose failures fall back to the clipboard.
 */
const ReplyComposerComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.history = [];
        this.elements = {};
        this.sessionId = 0;
        this.busy = false;
        this.keydownHandler = event => {
            if (event.key === 'Escape' && !this.elements.overlay?.hidden) {
                this.close();
            }
        };
    }

    /** Create the modal once and bind every user action to an error-handled promise. */
    initialize() {
        const overlay = document.createElement('div');
        overlay.className = 'reply-composer-overlay';
        overlay.hidden = true;
        const title = SafeDom.create('h2', {
            id: 'replyComposerTitle',
            text: I18n.t('replyComposerTitle')
        });
        const close = SafeDom.create('button', {
            className: 'reply-composer-close',
            text: '×',
            properties: { type: 'button' },
            attributes: { 'aria-label': I18n.t('replyComposerClose') }
        });
        const header = SafeDom.create('div', { className: 'reply-composer-header' }, [
            title,
            close
        ]);
        const messages = SafeDom.create('div', {
            className: 'reply-composer-messages',
            attributes: { 'aria-live': 'polite' }
        });
        const draft = SafeDom.create('textarea', {
            id: 'replyComposerDraft',
            className: 'reply-composer-draft',
            properties: {
                rows: 9,
                maxLength: CONFIG.AI.MAX_REPLY_DRAFT_CHARACTERS,
                placeholder: I18n.t('replyDraftPlaceholder')
            }
        });
        const instruction = SafeDom.create('textarea', {
            id: 'replyComposerInstruction',
            className: 'reply-composer-instruction',
            properties: {
                rows: 3,
                maxLength: CONFIG.AI.MAX_REPLY_INSTRUCTION_CHARACTERS,
                placeholder: I18n.t('replyRefinementPlaceholder')
            }
        });
        const refine = SafeDom.create('button', {
            className: 'reply-composer-refine',
            text: I18n.t('replyRefine'),
            properties: { type: 'button' }
        });
        const refineRow = SafeDom.create('div', {
            className: 'reply-composer-refine-row'
        }, [
            SafeDom.create('small', { text: I18n.t('replyRefineShortcut') }),
            refine
        ]);
        const status = SafeDom.create('p', {
            className: 'reply-composer-status',
            attributes: { role: 'status', 'aria-live': 'polite' }
        });
        const includeOriginal = this.createReplyOption(
            'reply-include-original',
            'replyIncludeOriginal',
            true
        );
        const replyToAll = this.createReplyOption('reply-to-all', 'replyToAll', true);
        const includeAttachments = this.createReplyOption(
            'reply-include-attachments',
            'replyIncludeAttachments',
            false
        );
        const options = SafeDom.create('fieldset', { className: 'reply-composer-options' }, [
            SafeDom.create('legend', { text: I18n.t('replyOptionsHeading') }),
            includeOriginal.label,
            replyToAll.label,
            includeAttachments.label
        ]);
        const scroll = SafeDom.create('div', { className: 'reply-composer-scroll' }, [
            messages,
            SafeDom.create('label', {
                className: 'reply-composer-label',
                text: I18n.t('replyDraftLabel'),
                attributes: { for: 'replyComposerDraft' }
            }),
            draft,
            SafeDom.create('label', {
                className: 'reply-composer-label',
                text: I18n.t('replyRefinementLabel'),
                attributes: { for: 'replyComposerInstruction' }
            }),
            instruction,
            refineRow,
            status,
            options
        ]);
        const copy = SafeDom.create('button', {
            className: 'reply-composer-copy',
            text: I18n.t('replyCopy'),
            properties: { type: 'button' }
        });
        const prepare = SafeDom.create('button', {
            className: 'reply-composer-prepare',
            text: I18n.t('replyPrepare'),
            properties: { type: 'button' }
        });
        const actions = SafeDom.create('div', { className: 'reply-composer-actions' }, [
            copy,
            prepare
        ]);
        const dialog = SafeDom.create('section', {
            className: 'reply-composer-dialog',
            attributes: {
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'replyComposerTitle'
            }
        }, [header, scroll, actions]);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this.elements = {
            overlay,
            messages,
            draft,
            instruction,
            refine,
            prepare,
            copy,
            close,
            status,
            includeOriginal: includeOriginal.input,
            replyToAll: replyToAll.input,
            includeAttachments: includeAttachments.input
        };
        this.elements.close.addEventListener('click', () => this.close());
        this.elements.refine.addEventListener('click', () => {
            this.refine().catch(error => this.reportUnexpected(error, 'replyRefineFailed'));
        });
        this.elements.prepare.addEventListener('click', () => {
            this.prepare().catch(error => this.reportUnexpected(error, 'replyComposeAndCopyFailed'));
        });
        this.elements.copy.addEventListener('click', () => {
            this.copy().catch(error => this.reportUnexpected(error, 'replyCopyFailed'));
        });
        this.elements.instruction.addEventListener('keydown', event => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.refine().catch(error => this.reportUnexpected(error, 'replyRefineFailed'));
            }
        });
        for (const option of this.replyOptionElements()) {
            option.addEventListener('change', () => {
                this.saveReplyPreferences().catch(error => {
                    this.reportUnexpected(error, 'replyPreferencesSaveFailed');
                });
            });
        }
        document.addEventListener('keydown', this.keydownHandler);
    }

    /** Create one checkbox option with a literal localized label. */
    createReplyOption(className, labelKey, checked) {
        const input = SafeDom.create('input', {
            className,
            properties: { type: 'checkbox', checked }
        });
        const label = SafeDom.create('label', {}, [
            input,
            SafeDom.create('span', { text: I18n.t(labelKey) })
        ]);
        return { input, label };
    }

    /** Open a fresh session and fetch its initial reply without using the generic result panel. */
    async open() {
        const sessionId = ++this.sessionId;
        this.reset();
        this.elements.overlay.hidden = false;
        this.setStatus(I18n.t('replyComposerLoading'));
        this.setBusy(true);

        try {
            await this.loadReplyPreferences();
            const response = await this.manager.sendToBackground(CONFIG.ACTIONS.REPLY, {
                messageId: this.manager.emailId
            });
            if (sessionId !== this.sessionId) {
                return;
            }
            if (!response?.success || !String(response.data?.content || '').trim()) {
                throw new Error(response?.error || I18n.t('replyInitialFailed'));
            }
            const draft = response.data.content.trim();
            this.elements.draft.value = draft;
            this.history.push({ role: 'assistant', content: draft });
            this.appendMessage('assistant', draft);
            this.setStatus(I18n.t('replyDraftReady'), 'success');
            this.manager.updateStatus(I18n.t('replyDraftReady'), 'success');
            this.elements.draft.focus();
        } catch (error) {
            if (sessionId === this.sessionId) {
                this.reportFailure(error, 'replyInitialFailed');
            }
        } finally {
            if (sessionId === this.sessionId) {
                this.setBusy(false);
            }
        }
    }

    close() {
        this.sessionId += 1;
        this.elements.overlay.hidden = true;
        this.setBusy(false);
    }

    /** Ask the background service to revise the operator's current, possibly hand-edited draft. */
    async refine() {
        if (this.busy) {
            return;
        }
        const instruction = this.elements.instruction.value.trim();
        const currentDraft = this.elements.draft.value.trim();
        if (!currentDraft) {
            this.setStatus(I18n.t('replyEmptyDraft'), 'error');
            this.elements.draft.focus();
            return;
        }
        if (!instruction) {
            this.setStatus(I18n.t('replyRefinementRequired'), 'error');
            this.elements.instruction.focus();
            return;
        }

        const sessionId = this.sessionId;
        const history = this.history.slice(-6);
        this.appendMessage('user', instruction);
        this.history.push({ role: 'user', content: instruction });
        this.elements.instruction.value = '';
        this.setStatus(I18n.t('processing'));
        this.setBusy(true);

        try {
            const response = await this.manager.sendToBackground(CONFIG.ACTIONS.REFINE_REPLY, {
                messageId: this.manager.emailId,
                currentDraft,
                instruction,
                history
            });
            if (sessionId !== this.sessionId) {
                return;
            }
            if (!response?.success || !String(response.data?.content || '').trim()) {
                throw new Error(response?.error || I18n.t('replyRefineFailed'));
            }
            const revisedDraft = response.data.content.trim();
            this.elements.draft.value = revisedDraft;
            this.history.push({ role: 'assistant', content: revisedDraft });
            this.appendMessage('assistant', revisedDraft);
            this.setStatus(I18n.t('replyRefined'), 'success');
            this.manager.updateStatus(I18n.t('replyRefined'), 'success');
        } catch (error) {
            if (sessionId === this.sessionId) {
                this.reportFailure(error, 'replyRefineFailed');
            }
        } finally {
            if (sessionId === this.sessionId) {
                this.setBusy(false);
                this.elements.instruction.focus();
            }
        }
    }

    /** Open Thunderbird's native reply composer, copying the draft if that API rejects. */
    async prepare() {
        if (this.busy) {
            return;
        }
        const draft = this.elements.draft.value.trim();
        if (!draft) {
            this.setStatus(I18n.t('replyEmptyDraft'), 'error');
            this.elements.draft.focus();
            return;
        }

        const sessionId = this.sessionId;
        const preferences = this.getReplyPreferences();
        this.setBusy(true);
        try {
            const attachmentResult = await ReplyPreparationService.prepare(
                this.manager.emailId,
                draft,
                preferences,
                message => this.manager.log(message, 'error')
            );
            if (sessionId === this.sessionId) {
                const attachmentsFailed = attachmentResult.failed === null;
                const attachmentsIncomplete = attachmentsFailed || attachmentResult.failed > 0;
                const status = attachmentsFailed
                    ? I18n.t('replyAttachmentsFailed')
                    : attachmentResult.failed > 0
                        ? I18n.t('replyAttachmentsPartial', { failed: attachmentResult.failed })
                        : I18n.t('replyOpened');
                this.manager.updateStatus(status, attachmentsIncomplete ? 'warning' : 'success');
                this.close();
            }
        } catch (composeError) {
            this.manager.log(`Could not open Thunderbird reply composer: ${composeError.message}`, 'error');
            try {
                await navigator.clipboard.writeText(draft);
                if (sessionId === this.sessionId) {
                    this.setStatus(I18n.t('replyComposeFallback'), 'warning');
                    this.manager.updateStatus(I18n.t('replyComposeFallback'), 'warning');
                }
            } catch (clipboardError) {
                this.manager.log(`Could not copy reply fallback: ${clipboardError.message}`, 'error');
                if (sessionId === this.sessionId) {
                    this.setStatus(I18n.t('replyComposeAndCopyFailed'), 'error');
                }
            }
        } finally {
            if (sessionId === this.sessionId) {
                this.setBusy(false);
            }
        }
    }

    getReplyPreferences() {
        return {
            includeOriginal: this.elements.includeOriginal.checked,
            replyToAll: this.elements.replyToAll.checked,
            includeAttachments: this.elements.includeAttachments.checked
        };
    }

    replyOptionElements() {
        return [
            this.elements.includeOriginal,
            this.elements.replyToAll,
            this.elements.includeAttachments
        ].filter(Boolean);
    }

    async loadReplyPreferences() {
        const keys = [
            CONFIG.STORAGE_KEYS.REPLY_INCLUDE_ORIGINAL,
            CONFIG.STORAGE_KEYS.REPLY_TO_ALL,
            CONFIG.STORAGE_KEYS.REPLY_INCLUDE_ATTACHMENTS
        ];
        const stored = await StorageManager.getMultiple(keys);
        this.elements.includeOriginal.checked = typeof stored[keys[0]] === 'boolean'
            ? stored[keys[0]]
            : true;
        this.elements.replyToAll.checked = typeof stored[keys[1]] === 'boolean'
            ? stored[keys[1]]
            : true;
        this.elements.includeAttachments.checked = typeof stored[keys[2]] === 'boolean'
            ? stored[keys[2]]
            : false;
    }

    async saveReplyPreferences() {
        const preferences = this.getReplyPreferences();
        const saved = await StorageManager.setMultiple({
            [CONFIG.STORAGE_KEYS.REPLY_INCLUDE_ORIGINAL]: preferences.includeOriginal,
            [CONFIG.STORAGE_KEYS.REPLY_TO_ALL]: preferences.replyToAll,
            [CONFIG.STORAGE_KEYS.REPLY_INCLUDE_ATTACHMENTS]: preferences.includeAttachments
        });
        if (!saved) {
            throw new Error('Could not persist reply preferences.');
        }
    }

    async copy() {
        const draft = this.elements.draft.value.trim();
        if (!draft) {
            this.setStatus(I18n.t('replyEmptyDraft'), 'error');
            return;
        }
        await navigator.clipboard.writeText(draft);
        this.setStatus(I18n.t('copied'), 'success');
        this.manager.updateStatus(I18n.t('copied'), 'success');
    }

    appendMessage(role, content) {
        const message = document.createElement('div');
        message.className = `reply-composer-message ${role}${role === 'assistant'
            ? ' markdown-content'
            : ''}`;
        message.setAttribute('aria-label', I18n.t(role === 'assistant' ? 'replyAssistantLabel' : 'replyOperatorLabel'));
        if (role === 'assistant') {
            MarkdownRenderer.renderInto(message, content);
        } else {
            message.textContent = content;
        }
        this.elements.messages.appendChild(message);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    setBusy(busy) {
        this.busy = busy;
        const hasDraft = Boolean(this.elements.draft?.value.trim());
        this.elements.draft.disabled = busy;
        this.elements.instruction.disabled = busy || !hasDraft;
        this.elements.refine.disabled = busy || !hasDraft;
        this.elements.prepare.disabled = busy || !hasDraft;
        this.elements.copy.disabled = busy || !hasDraft;
        for (const option of this.replyOptionElements()) {
            option.disabled = busy;
        }
    }

    setStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.dataset.type = type;
    }

    reset() {
        this.history = [];
        this.elements.messages.replaceChildren();
        this.elements.draft.value = '';
        this.elements.instruction.value = '';
        this.setStatus('');
    }

    reportFailure(error, messageKey) {
        this.manager.log(`${messageKey}: ${error.message}`, 'error');
        const message = I18n.t(messageKey);
        this.setStatus(message, 'error');
    }

    reportUnexpected(error, messageKey) {
        this.manager.log(`Unexpected reply composer error: ${error.message}`, 'error');
        this.setStatus(I18n.t(messageKey), 'error');
    }

    cleanup() {
        this.sessionId += 1;
        document.removeEventListener('keydown', this.keydownHandler);
        this.elements.overlay?.remove();
        this.history = [];
    }
};

if (typeof window !== 'undefined') {
    window.ReplyComposerComponent = ReplyComposerComponent;
}
