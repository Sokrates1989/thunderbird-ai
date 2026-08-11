/** OpenAI Responses API client and task-specific email prompts. */
const OpenAIService = {
    async getSettings() {
        const settings = await StorageManager.getSettings();
        return {
            apiKey: settings.openaiApiKey,
            model: settings.model,
            taskModels: settings.taskModels || {},
            baseUrl: CONFIG.OPENAI.BASE_URL
        };
    },

    resolveModel(task, preferredModel = CONFIG.OPENAI.DEFAULT_MODEL) {
        const supported = CONFIG.OPENAI.AVAILABLE_MODELS.map(item => item.value);
        if (preferredModel !== 'auto' && supported.includes(preferredModel)) {
            return preferredModel;
        }
        return CONFIG.OPENAI.TASK_PROFILES[task]?.model || 'gpt-5.6-terra';
    },

    async testConnection(apiKey, preferredModel = CONFIG.OPENAI.DEFAULT_MODEL) {
        try {
            const settings = await this.getSettings();
            const key = String(apiKey || settings.apiKey || '').trim();
            if (!key) {
                return { success: false, message: I18n.t('apiKeyMissing') };
            }
            if (!key.startsWith('sk-')) {
                return { success: false, message: I18n.t('apiKeyInvalid') };
            }

            const result = await this.request('test', {
                instructions: I18n.t('testPrompt'),
                input: I18n.t('testPrompt')
            }, { apiKey: key, preferredModel });
            return {
                success: true,
                message: I18n.t('apiTestSuccess', { model: result.model }),
                model: result.model
            };
        } catch (error) {
            console.error('OpenAI connection test failed:', error);
            return {
                success: false,
                message: error?.userFacing === true
                    ? error.message
                    : I18n.t('apiTestFailed')
            };
        }
    },

    async generateSummary(message) {
        const settings = await this.getSettings();
        if (!settings.apiKey) {
            return {
                content: this.generateFallbackSummary(message),
                usedApi: false,
                model: null
            };
        }
        return this.runEmailTask('summarize', message, I18n.t('summaryPrompt'));
    },

    async generateReply(message, context = {}) {
        const tone = context.tone || I18n.t('defaultReplyTone');
        return this.runEmailTask('reply', message, I18n.t('replyPrompt', { tone }));
    },

    /** Revise the current operator-edited draft while keeping the original email as context. */
    async refineReply(message, currentDraft, instruction, history = []) {
        if (!message?.content) {
            throw new Error(I18n.t('emptyMessage'));
        }
        const draft = String(currentDraft || '').trim();
        const requestedChange = String(instruction || '').trim();
        if (!draft) {
            throw new Error(I18n.t('replyEmptyDraft'));
        }
        if (!requestedChange) {
            throw new Error(I18n.t('replyRefinementRequired'));
        }

        const clippedDraft = draft.slice(0, CONFIG.OPENAI.MAX_REPLY_DRAFT_CHARACTERS);
        const clippedInstruction = requestedChange.slice(0, CONFIG.OPENAI.MAX_REPLY_INSTRUCTION_CHARACTERS);
        const previousRequests = history
            .filter(entry => entry?.role === 'user' && typeof entry.content === 'string')
            .slice(-4)
            .map(entry => entry.content.trim().slice(0, 1000))
            .filter(Boolean);
        return this.request('replyRefine', {
            instructions: this.baseInstructions(I18n.t('replyRefinePrompt')),
            input: [
                this.formatEmailContext(message),
                previousRequests.length
                    ? `<previous-operator-requests>\n${previousRequests.join('\n')}\n</previous-operator-requests>`
                    : '',
                `<current-reply-draft>\n${clippedDraft}\n</current-reply-draft>`,
                `<latest-operator-request>\n${clippedInstruction}\n</latest-operator-request>`
            ].filter(Boolean).join('\n\n')
        });
    },

    async categorizeEmail(message) {
        return this.runEmailTask('categorize', message, I18n.t('categoryPrompt'));
    },

    async checkImportance(message) {
        return this.runEmailTask('importance', message, I18n.t('importancePrompt'));
    },

    async translateMessage(message, targetLanguage) {
        const targetKey = {
            de: 'translateGerman',
            en: 'translateEnglish',
            fr: 'translateFrench',
            es: 'translateSpanish'
        }[targetLanguage] || 'translateGerman';
        return this.runEmailTask('translate', message, I18n.t('translationPrompt', {
            target: I18n.t(targetKey)
        }));
    },

    async extractInfo(message) {
        return this.runEmailTask('extract', message, I18n.t('extractPrompt'));
    },

    async checkSpam(message) {
        return this.runEmailTask('spam', message, I18n.t('spamPrompt'));
    },

    /** Classify several messages in bounded Luna batches and retain successful partial batches. */
    async analyzeBulkTriage(messages, feedbackExamples = []) {
        const batches = [];
        for (let index = 0; index < messages.length; index += CONFIG.OPENAI.BULK_TRIAGE_BATCH_SIZE) {
            batches.push(messages.slice(index, index + CONFIG.OPENAI.BULK_TRIAGE_BATCH_SIZE));
        }
        const results = new Array(batches.length);
        const failures = [];
        let nextBatch = 0;
        const worker = async () => {
            while (nextBatch < batches.length) {
                const batchIndex = nextBatch;
                nextBatch += 1;
                const batch = batches[batchIndex];
                try {
                    results[batchIndex] = await this.analyzeBulkTriageBatch(batch, feedbackExamples);
                } catch (error) {
                    failures.push({ batchIndex, count: batch.length, error });
                }
            }
        };
        const workerCount = Math.min(CONFIG.OPENAI.BULK_TRIAGE_CONCURRENCY, batches.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        const scores = results.filter(Boolean).flat();
        if (!scores.length && messages.length) {
            throw failures[0]?.error || new Error(I18n.t('bulkTriageInvalidResponse'));
        }
        return {
            scores,
            failedCount: failures.reduce((total, failure) => total + failure.count, 0),
            apiCalls: results.filter(Boolean).reduce(
                (total, result) => total + (result.apiCalls || 1),
                0
            ),
            model: results.find(Boolean)?.model || null
        };
    },

    /** Request one strict importance, spam, and risk score set per message. */
    async analyzeBulkTriageBatch(messages, feedbackExamples = []) {
        const messageInput = messages.map((message, index) => [
            `<bulk-email index="${index}">`,
            this.formatEmailContext(message, CONFIG.OPENAI.BULK_TRIAGE_EMAIL_CHARACTERS),
            '</bulk-email>'
        ].join('\n')).join('\n\n');
        const feedbackInput = this.formatBulkFeedbackExamples(feedbackExamples);
        const response = await this.request('bulkTriage', {
            instructions: this.baseInstructions(I18n.t('bulkTriagePrompt')),
            input: [feedbackInput, messageInput].filter(Boolean).join('\n\n')
        });
        const scores = this.parseBulkTriageScores(response.content, messages);
        this.applySpamPrecheckMinimum(scores, messages, feedbackExamples);
        scores.model = response.model;
        scores.apiCalls = 1 + response.retryCount;
        return scores;
    },

    /** Score one email with Terra by default and reuse the shared three-score contract. */
    async analyzeSingleScore(message, feedbackExamples = []) {
        const messageInput = [
            '<bulk-email index="0">',
            this.formatEmailContext(message, CONFIG.OPENAI.BULK_TRIAGE_EMAIL_CHARACTERS),
            '</bulk-email>'
        ].join('\n');
        const feedbackInput = this.formatBulkFeedbackExamples(feedbackExamples);
        const response = await this.request('singleScore', {
            instructions: this.baseInstructions(I18n.t('singleScorePrompt')),
            input: [feedbackInput, messageInput].filter(Boolean).join('\n\n')
        });
        const scores = this.parseBulkTriageScores(response.content, [message]);
        this.applySpamPrecheckMinimum(scores, [message], feedbackExamples);
        const [score] = scores;
        return {
            ...score,
            model: response.model,
            usedApi: true,
            retryCount: response.retryCount
        };
    },

    /** Format bounded operator corrections as examples, never as executable instructions. */
    formatBulkFeedbackExamples(examples) {
        if (!Array.isArray(examples) || !examples.length) {
            return '';
        }
        const rows = examples.slice(0, CONFIG.OPENAI.BULK_TRIAGE_FEEDBACK_EXAMPLES)
            .map((example, index) => [
                `<operator-feedback-example index="${index}">`,
                JSON.stringify({
                    email: example.message,
                    originalScores: example.originalScores,
                    correctedScores: example.correctedScores,
                    operatorReason: String(example.reason || ''),
                    scoreReasons: example.reasons || {}
                }),
                '</operator-feedback-example>'
            ].join('\n'));
        return ['<operator-feedback-examples>', ...rows, '</operator-feedback-examples>'].join('\n');
    },

    /** Validate untrusted model output and map its local indices back to Thunderbird IDs. */
    parseBulkTriageScores(content, messages) {
        const normalized = String(content || '').trim()
            .replace(/^```(?:json)?\s*/iu, '')
            .replace(/\s*```$/u, '');
        let rows;
        try {
            rows = JSON.parse(normalized);
        } catch (_error) {
            throw new Error(I18n.t('bulkTriageInvalidResponse'));
        }
        if (!Array.isArray(rows) || rows.length !== messages.length) {
            throw new Error(I18n.t('bulkTriageInvalidResponse'));
        }
        const byIndex = new Map(rows.map(row => [Number(row?.index), row]));
        return messages.map((message, index) => {
            const row = byIndex.get(index);
            const importanceScore = this.normalizeScore(row?.importanceScore);
            const spamScore = this.normalizeScore(row?.spamScore);
            const riskScore = this.normalizeScore(row?.riskScore);
            if (!row || importanceScore === null || spamScore === null || riskScore === null) {
                throw new Error(I18n.t('bulkTriageInvalidResponse'));
            }
            return { messageId: message.id, importanceScore, spamScore, riskScore };
        });
    },

    /** Accept finite percentage values only and round them to stable integer scores. */
    normalizeScore(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    },

    /** Keep strong local evidence from being erased by an under-calibrated model response. */
    applySpamPrecheckMinimum(scores, messages, feedbackExamples = []) {
        scores.forEach((score, index) => {
            const message = messages[index];
            const suggestedMinimum = this.normalizeScore(message?.spamPrecheck?.suggestedSpamMinimum);
            if (suggestedMinimum === null || this.hasExactSenderSpamFeedback(message, feedbackExamples)) {
                return;
            }
            score.spamScore = Math.max(score.spamScore, suggestedMinimum);
        });
    },

    /** Explicit operator corrections for the exact sender take precedence over heuristics. */
    hasExactSenderSpamFeedback(message, feedbackExamples) {
        const sender = this.normalizeSender(message?.author);
        if (!sender) {
            return false;
        }
        return feedbackExamples.some(example => (
            this.normalizeScore(example?.correctedScores?.spamScore) !== null
            && this.normalizeSender(example?.message?.author) === sender
        ));
    },

    normalizeSender(author) {
        const value = String(author || '').trim().toLowerCase();
        const bracketed = value.match(/<([^<>\s]+@[^<>\s]+)>/u);
        const plain = value.match(/([^\s<>,;]+@[^\s<>,;]+)/u);
        return String(bracketed?.[1] || plain?.[1] || value);
    },

    async processChat(query, message, history = []) {
        const trimmedQuery = String(query || '').trim();
        if (!trimmedQuery) {
            throw new Error(I18n.t('chatQuestionRequired'));
        }
        const transcript = history.slice(-6).map(entry => (
            `${I18n.t(entry.role === 'assistant' ? 'assistantRole' : 'userRole')}: ${entry.content}`
        )).join('\n');
        const emailContext = this.formatEmailContext(message);
        return this.request('chat', {
            instructions: this.baseInstructions(I18n.t('chatPrompt')),
            input: [
                emailContext,
                transcript ? `${I18n.t('previousChat')}:\n${transcript}` : '',
                `${I18n.t('currentQuestion')}:\n${trimmedQuery}`
            ].filter(Boolean).join('\n\n')
        });
    },

    async improveText(text, type = 'general') {
        const content = String(text || '').trim();
        if (!content) {
            throw new Error(I18n.t('improveTextMissing'));
        }
        return this.request('improve', {
            instructions: this.baseInstructions(I18n.t('improvePrompt', {
                kind: I18n.t(type === 'reply' ? 'improveKindReply' : 'improveKindGeneral')
            })),
            input: content
        });
    },

    async runEmailTask(task, message, taskInstructions) {
        if (!message?.content) {
            throw new Error(I18n.t('emptyMessage'));
        }
        return this.request(task, {
            instructions: this.baseInstructions(taskInstructions),
            input: this.formatEmailContext(message)
        });
    },

    baseInstructions(taskInstructions) {
        return [
            I18n.t('systemRole'),
            I18n.t('systemLanguage'),
            I18n.t('systemUntrusted'),
            I18n.t('systemIgnoreInstructions'),
            taskInstructions
        ].join('\n');
    },

    formatEmailContext(message, maximum = CONFIG.OPENAI.MAX_EMAIL_CHARACTERS) {
        const content = String(message.content || '');
        const clipped = content.length > maximum
            ? `${content.slice(0, maximum)}\n\n${I18n.t('contentTruncated', { maximum })}`
            : content;
        const spamPrecheck = message?.spamPrecheck
            ? [
                '<local-spam-precheck>',
                JSON.stringify(message.spamPrecheck),
                '</local-spam-precheck>'
            ].join('\n')
            : '';
        return [
            '<email>',
            `${I18n.t('emailContextSubject')}: ${message.subject || ''}`,
            `${I18n.t('emailContextFrom')}: ${message.author || ''}`,
            `${I18n.t('emailContextDate')}: ${message.formattedDate || message.date || ''}`,
            `${I18n.t('emailContextAttachments')}: ${(message.attachments || []).map(item => item.name).join(', ') || I18n.t('noAttachments')}`,
            spamPrecheck,
            '<body>',
            clipped,
            '</body>',
            '</email>'
        ].filter(Boolean).join('\n');
    },

    generateFallbackSummary(message) {
        const sentences = String(message.content || '')
            .split(/(?<=[.!?])\s+/u)
            .map(sentence => sentence.trim())
            .filter(Boolean);
        const excerpt = sentences.slice(0, 3).join(' ').slice(0, 700) || I18n.t('emptyMessage');
        return [
            I18n.t('fallbackFrom', { author: message.author }),
            I18n.t('fallbackSubject', { subject: message.subject }),
            '',
            excerpt,
            '',
            I18n.t('fallbackNotice')
        ].join('\n');
    },

    /** Send one stateless request with bounded retries for classified transient failures. */
    async request(task, payload, overrides = {}) {
        const settings = await this.getSettings();
        const apiKey = String(overrides.apiKey || settings.apiKey || '').trim();
        if (!apiKey) {
            throw this.createRequestError('apiKeyMissing');
        }

        const profile = CONFIG.OPENAI.TASK_PROFILES[task] || CONFIG.OPENAI.TASK_PROFILES.summarize;
        const preferredModel = overrides.preferredModel
            || settings.taskModels?.[task]
            || settings.model;
        const model = this.resolveModel(task, preferredModel);
        let attempts = 0;
        const result = await RetryService.run(
            async attempt => {
                attempts = attempt;
                return this.performRequest(settings, apiKey, model, profile, payload);
            },
            {
                maxAttempts: CONFIG.OPENAI.REQUEST_MAX_ATTEMPTS,
                shouldRetry: error => this.shouldRetryRequest(error),
                delayMs: (error, attempt) => this.requestRetryDelay(error, attempt),
                onRetry: (error, attempt, delayMs) => {
                    console.warn('Retrying transient OpenAI request.', {
                        attempt,
                        delayMs,
                        status: error.status || null,
                        reason: error.reason || 'network'
                    });
                }
            }
        );
        return { ...result, retryCount: Math.max(0, attempts - 1) };
    },

    /** Perform exactly one Responses API attempt with its own timeout controller. */
    async performRequest(settings, apiKey, model, profile, payload) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.UI.LOADING_TIMEOUT);

        try {
            let response;
            try {
                response = await fetch(`${settings.baseUrl}/responses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        model,
                        instructions: payload.instructions,
                        input: payload.input,
                        reasoning: { effort: profile.effort },
                        text: { verbosity: profile.verbosity },
                        max_output_tokens: profile.maxOutputTokens,
                        store: false
                    })
                });
            } catch (error) {
                if (error?.name === 'AbortError') {
                    throw this.createRequestError('apiTimeout', {}, {
                        retryable: true,
                        reason: 'timeout'
                    });
                }
                throw this.createRequestError('apiNetworkFailed', {}, {
                    retryable: true,
                    reason: 'network'
                });
            }
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw this.createHttpError(response, errorBody);
            }

            const data = await response.json().catch(() => null);
            const content = this.extractOutputText(data);
            if (!content) {
                throw this.createRequestError('apiNoOutput');
            }
            try {
                await StorageManager.recordApiUsage(model, data.usage);
            } catch (error) {
                console.error('Could not record OpenAI token usage:', error);
            }
            return { content, usedApi: true, model };
        } finally {
            clearTimeout(timeout);
        }
    },

    /** Convert an HTTP failure into a localized error and retry classification. */
    createHttpError(response, errorBody) {
        const status = Number(response.status) || 0;
        const apiError = errorBody?.error || {};
        const code = String(apiError.code || '');
        const type = String(apiError.type || '');
        const retryAfterMs = this.parseRetryAfter(response.headers?.get?.('retry-after'));
        const quotaError = [
            'credit_balance_exhausted',
            'insufficient_quota',
            'billing_hard_limit_reached',
            'organization_spend_limit_exceeded',
            'project_spend_limit_exceeded',
            'organization_usage_limit_exceeded'
        ].includes(code) || type === 'insufficient_quota';
        if (status === 401 || status === 403) {
            return this.createRequestError('apiAuthenticationFailed', {}, { status, code });
        }
        if (status === 429 && quotaError) {
            return this.createRequestError('apiQuotaFailed', {}, { status, code });
        }
        if (status === 429 && retryAfterMs > CONFIG.OPENAI.RETRY_MAX_DELAY_MS) {
            return this.createRequestError('apiRateLimitLongWait', {}, {
                status,
                code,
                retryAfterMs,
                reason: 'rate-limit'
            });
        }
        if (status === 429) {
            return this.createRequestError('apiRateLimitFailed', {}, {
                status,
                code,
                retryable: true,
                retryAfterMs,
                reason: 'rate-limit'
            });
        }
        if ([500, 502, 503, 504].includes(status)) {
            return this.createRequestError('apiServiceUnavailable', {}, {
                status,
                code,
                retryable: true,
                retryAfterMs,
                reason: 'server'
            });
        }
        return this.createRequestError('apiRequestFailed', { status }, { status, code });
    },

    /** Mark localized request errors so the background may safely present them. */
    createRequestError(messageKey, replacements = {}, metadata = {}) {
        const error = new Error(I18n.t(messageKey, replacements));
        return Object.assign(error, {
            userFacing: true,
            retryable: false,
            retryAfterMs: null,
            ...metadata
        });
    },

    /** Retry only bounded transient errors whose server delay can be honored. */
    shouldRetryRequest(error) {
        if (error?.retryable !== true) {
            return false;
        }
        return error.retryAfterMs === null
            || error.retryAfterMs <= CONFIG.OPENAI.RETRY_MAX_DELAY_MS;
    },

    /** Prefer Retry-After; otherwise use exponential backoff with jitter. */
    requestRetryDelay(error, failedAttempt) {
        if (Number.isFinite(error?.retryAfterMs)) {
            return error.retryAfterMs;
        }
        return RetryService.exponentialDelay(failedAttempt, {
            baseDelayMs: CONFIG.OPENAI.RETRY_BASE_DELAY_MS,
            maxDelayMs: CONFIG.OPENAI.RETRY_MAX_DELAY_MS
        });
    },

    /** Parse Retry-After seconds or an HTTP date into a non-negative delay. */
    parseRetryAfter(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.round(seconds * 1000);
        }
        const date = Date.parse(String(value));
        return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
    },

    extractOutputText(response) {
        if (typeof response?.output_text === 'string' && response.output_text.trim()) {
            return response.output_text.trim();
        }
        return (response?.output || [])
            .filter(item => item.type === 'message')
            .flatMap(item => item.content || [])
            .filter(item => item.type === 'output_text' && typeof item.text === 'string')
            .map(item => item.text)
            .join('\n')
            .trim();
    }
};

if (typeof window !== 'undefined') {
    window.OpenAIService = OpenAIService;
}
if (typeof globalThis !== 'undefined') {
    globalThis.OpenAIService = OpenAIService;
}
