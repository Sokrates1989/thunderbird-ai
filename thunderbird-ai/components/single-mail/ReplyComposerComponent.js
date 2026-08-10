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
        overlay.innerHTML = `
            <section class="reply-composer-dialog" role="dialog" aria-modal="true" aria-labelledby="replyComposerTitle">
                <div class="reply-composer-header">
                    <h2 id="replyComposerTitle">${I18n.t('replyComposerTitle')}</h2>
                    <button type="button" class="reply-composer-close" aria-label="${I18n.t('replyComposerClose')}">×</button>
                </div>
                <div class="reply-composer-messages" aria-live="polite"></div>
                <label class="reply-composer-label" for="replyComposerDraft">${I18n.t('replyDraftLabel')}</label>
                <textarea id="replyComposerDraft" class="reply-composer-draft" rows="9" maxlength="${CONFIG.OPENAI.MAX_REPLY_DRAFT_CHARACTERS}" placeholder="${I18n.t('replyDraftPlaceholder')}"></textarea>
                <label class="reply-composer-label" for="replyComposerInstruction">${I18n.t('replyRefinementLabel')}</label>
                <textarea id="replyComposerInstruction" class="reply-composer-instruction" rows="3" maxlength="${CONFIG.OPENAI.MAX_REPLY_INSTRUCTION_CHARACTERS}" placeholder="${I18n.t('replyRefinementPlaceholder')}"></textarea>
                <div class="reply-composer-refine-row">
                    <small>${I18n.t('replyRefineShortcut')}</small>
                    <button type="button" class="reply-composer-refine">${I18n.t('replyRefine')}</button>
                </div>
                <p class="reply-composer-status" role="status" aria-live="polite"></p>
                <div class="reply-composer-actions">
                    <button type="button" class="reply-composer-copy">${I18n.t('replyCopy')}</button>
                    <button type="button" class="reply-composer-prepare">${I18n.t('replyPrepare')}</button>
                </div>
            </section>`;
        document.body.appendChild(overlay);
        this.elements = {
            overlay,
            messages: overlay.querySelector('.reply-composer-messages'),
            draft: overlay.querySelector('.reply-composer-draft'),
            instruction: overlay.querySelector('.reply-composer-instruction'),
            refine: overlay.querySelector('.reply-composer-refine'),
            prepare: overlay.querySelector('.reply-composer-prepare'),
            copy: overlay.querySelector('.reply-composer-copy'),
            close: overlay.querySelector('.reply-composer-close'),
            status: overlay.querySelector('.reply-composer-status')
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
        document.addEventListener('keydown', this.keydownHandler);
    }

    /** Open a fresh session and fetch its initial reply without using the generic result panel. */
    async open() {
        const sessionId = ++this.sessionId;
        this.reset();
        this.elements.overlay.hidden = false;
        this.setStatus(I18n.t('replyComposerLoading'));
        this.setBusy(true);

        try {
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
        this.setBusy(true);
        try {
            await browser.compose.beginReply(this.manager.emailId, 'replyToSender', {
                plainTextBody: draft
            });
            if (sessionId === this.sessionId) {
                this.manager.updateStatus(I18n.t('replyOpened'), 'success');
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
        message.className = `reply-composer-message ${role}`;
        message.setAttribute('aria-label', I18n.t(role === 'assistant' ? 'replyAssistantLabel' : 'replyOperatorLabel'));
        message.textContent = content;
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
