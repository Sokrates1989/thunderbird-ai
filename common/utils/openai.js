/** OpenAI Responses API client and task-specific email prompts. */
const OpenAIService = {
    async getSettings() {
        const settings = await StorageManager.getSettings();
        return {
            apiKey: settings.openaiApiKey,
            model: settings.model,
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
            return { success: false, message: I18n.t('apiTestFailed') };
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
    async analyzeBulkTriage(messages) {
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
                    results[batchIndex] = await this.analyzeBulkTriageBatch(batch);
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
            apiCalls: results.filter(Boolean).length,
            model: CONFIG.OPENAI.BULK_TRIAGE_MODEL
        };
    },

    /** Request one strict score pair per message while forcing the low-cost Luna model. */
    async analyzeBulkTriageBatch(messages) {
        const input = messages.map((message, index) => [
            `<bulk-email index="${index}">`,
            this.formatEmailContext(message, CONFIG.OPENAI.BULK_TRIAGE_EMAIL_CHARACTERS),
            '</bulk-email>'
        ].join('\n')).join('\n\n');
        const response = await this.request('bulkTriage', {
            instructions: this.baseInstructions(I18n.t('bulkTriagePrompt')),
            input
        }, { preferredModel: CONFIG.OPENAI.BULK_TRIAGE_MODEL });
        return this.parseBulkTriageScores(response.content, messages);
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
            if (!row || importanceScore === null || spamScore === null) {
                throw new Error(I18n.t('bulkTriageInvalidResponse'));
            }
            return { messageId: message.id, importanceScore, spamScore };
        });
    },

    /** Accept finite percentage values only and round them to stable integer scores. */
    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
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
        return [
            '<email>',
            `${I18n.t('emailContextSubject')}: ${message.subject || ''}`,
            `${I18n.t('emailContextFrom')}: ${message.author || ''}`,
            `${I18n.t('emailContextDate')}: ${message.formattedDate || message.date || ''}`,
            `${I18n.t('emailContextAttachments')}: ${(message.attachments || []).map(item => item.name).join(', ') || I18n.t('noAttachments')}`,
            '<body>',
            clipped,
            '</body>',
            '</email>'
        ].join('\n');
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

    /** Send one stateless request; email content is not retained by this client (`store: false`). */
    async request(task, payload, overrides = {}) {
        const settings = await this.getSettings();
        const apiKey = String(overrides.apiKey || settings.apiKey || '').trim();
        if (!apiKey) {
            throw new Error(I18n.t('apiKeyMissing'));
        }

        const profile = CONFIG.OPENAI.TASK_PROFILES[task] || CONFIG.OPENAI.TASK_PROFILES.summarize;
        const preferredModel = overrides.preferredModel || settings.model;
        const model = this.resolveModel(task, preferredModel);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.UI.LOADING_TIMEOUT);

        try {
            const response = await fetch(`${settings.baseUrl}/responses`, {
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
            if (!response.ok) {
                await response.json().catch(() => ({}));
                throw new Error(I18n.t('apiRequestFailed', { status: response.status }));
            }

            const data = await response.json();
            const content = this.extractOutputText(data);
            if (!content) {
                throw new Error(I18n.t('apiNoOutput'));
            }
            return { content, usedApi: true, model };
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(I18n.t('apiTimeout'));
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    },

    extractOutputText(response) {
        if (typeof response.output_text === 'string' && response.output_text.trim()) {
            return response.output_text.trim();
        }
        return (response.output || [])
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
