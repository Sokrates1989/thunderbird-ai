/** Provider configuration, request formatting, and response normalization for AI APIs. */
const AIProviderService = {
    /** Return a supported provider ID without allowing persisted arbitrary object keys. */
    normalizeProviderId(value) {
        const providerId = String(value || '').trim().toLowerCase();
        return Object.hasOwn(CONFIG.AI.PROVIDERS, providerId)
            ? providerId
            : CONFIG.AI.DEFAULT_PROVIDER;
    },

    /** Normalize one provider configuration while keeping built-in endpoints immutable. */
    normalizeConfiguration(providerId, value = {}) {
        const normalizedProvider = this.normalizeProviderId(providerId);
        const definition = CONFIG.AI.PROVIDERS[normalizedProvider];
        const custom = normalizedProvider === 'custom';
        return {
            provider: normalizedProvider,
            protocol: custom
                ? this.normalizeProtocol(value.protocol)
                : definition.protocol,
            authMode: custom
                ? this.normalizeAuthMode(value.authMode)
                : definition.authMode,
            baseUrl: custom
                ? String(value.baseUrl || '').trim().replace(/\/+$/u, '')
                : definition.baseUrl,
            apiKey: String(value.apiKey || '').trim(),
            defaultModel: String(value.defaultModel || '').trim(),
            taskModels: this.normalizeTaskModels(value.taskModels)
        };
    },

    normalizeProtocol(value) {
        const supported = new Set(CONFIG.AI.PROTOCOLS.map(item => item.value));
        return supported.has(value) ? value : CONFIG.AI.PROVIDERS.custom.protocol;
    },

    normalizeAuthMode(value) {
        const supported = new Set(CONFIG.AI.AUTH_MODES.map(item => item.value));
        return supported.has(value) ? value : CONFIG.AI.PROVIDERS.custom.authMode;
    },

    normalizeTaskModels(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return Object.fromEntries(Object.entries(source).map(([task, model]) => [
            task,
            String(model || '').trim()
        ]));
    },

    /** Return the localized public provider name without exposing endpoint details. */
    providerLabel(providerId) {
        const normalizedProvider = this.normalizeProviderId(providerId);
        return I18n.t(CONFIG.AI.PROVIDERS[normalizedProvider].labelKey);
    },

    /** Resolve a task model from an explicit choice, provider default, or task role. */
    resolveModel(configuration, task, preferredModel = 'auto') {
        const preferred = String(preferredModel || '').trim();
        if (preferred && preferred !== 'auto') {
            return preferred;
        }
        if (configuration.defaultModel && configuration.defaultModel !== 'auto') {
            return configuration.defaultModel;
        }
        const profile = CONFIG.AI.TASK_PROFILES[task] || CONFIG.AI.TASK_PROFILES.summarize;
        const definition = CONFIG.AI.PROVIDERS[configuration.provider];
        return String(definition.modelRoles[profile.modelRole] || '').trim();
    },

    /** Check whether the selected provider has enough local configuration to run. */
    isConfigured(configuration, task = 'test') {
        const definition = CONFIG.AI.PROVIDERS[configuration.provider];
        if (definition.apiKeyRequired && !configuration.apiKey) {
            return false;
        }
        return Boolean(this.resolveModel(configuration, task))
            && Boolean(this.resolveEndpoint(configuration, false));
    },

    /** Validate and construct the protocol-specific request URL. */
    resolveEndpoint(configuration, throwOnInvalid = true) {
        const value = String(configuration.baseUrl || '').trim();
        let url;
        try {
            url = new URL(value);
        } catch (_error) {
            if (throwOnInvalid) {
                throw this.configurationError('providerEndpointInvalid');
            }
            return '';
        }
        const localHttp = url.protocol === 'http:'
            && this.isLocalNetworkHost(url.hostname);
        if (url.protocol !== 'https:' && !localHttp) {
            if (throwOnInvalid) {
                throw this.configurationError('providerEndpointInsecure');
            }
            return '';
        }
        url.search = '';
        url.hash = '';
        const suffix = {
            'openai-responses': '/responses',
            'openai-chat': '/chat/completions',
            'anthropic-messages': '/messages'
        }[configuration.protocol];
        const path = url.pathname.replace(/\/+$/u, '');
        if (!path.endsWith(suffix)) {
            url.pathname = `${path}${suffix}`;
        }
        return url.toString();
    },

    /** Allow HTTP only for literal private-use or loopback addresses whose scope is locally bounded. */
    isLocalNetworkHost(hostname) {
        if (hostname === 'localhost') {
            return true;
        }
        const ipv4 = this.parseIpv4Address(hostname);
        if (ipv4) {
            return ipv4[0] === 127
                || ipv4[0] === 10
                || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31)
                || (ipv4[0] === 192 && ipv4[1] === 168);
        }
        const ipv6 = this.parseIpv6Address(hostname);
        if (!ipv6) {
            return false;
        }
        const loopback = ipv6.slice(0, 7).every(part => part === 0) && ipv6[7] === 1;
        const uniqueLocal = (ipv6[0] & 0xfe00) === 0xfc00;
        const ipv4Mapped = ipv6.slice(0, 5).every(part => part === 0)
            && ipv6[5] === 0xffff;
        if (ipv4Mapped) {
            const mapped = [ipv6[6] >> 8, ipv6[6] & 0xff, ipv6[7] >> 8, ipv6[7] & 0xff];
            return mapped[0] === 127
                || mapped[0] === 10
                || (mapped[0] === 172 && mapped[1] >= 16 && mapped[1] <= 31)
                || (mapped[0] === 192 && mapped[1] === 168);
        }
        return loopback || uniqueLocal;
    },

    /** Parse a canonical dotted-decimal IPv4 hostname into four numeric octets. */
    parseIpv4Address(hostname) {
        if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname)) {
            return null;
        }
        const octets = hostname.split('.').map(Number);
        return octets.every(octet => octet <= 255) ? octets : null;
    },

    /** Expand a bracketed URL IPv6 hostname into its eight 16-bit address words. */
    parseIpv6Address(hostname) {
        if (!hostname.startsWith('[') || !hostname.endsWith(']')) {
            return null;
        }
        const address = hostname.slice(1, -1).toLowerCase();
        if (!/^[0-9a-f:]+$/u.test(address) || address.split('::').length > 2) {
            return null;
        }
        const [leftValue, rightValue] = address.split('::');
        const left = leftValue ? leftValue.split(':') : [];
        const right = rightValue ? rightValue.split(':') : [];
        const missing = 8 - left.length - right.length;
        if ((address.includes('::') && missing < 1) || (!address.includes('::') && missing !== 0)) {
            return null;
        }
        const words = [...left, ...Array(missing).fill('0'), ...right];
        if (words.length !== 8 || words.some(word => !/^[0-9a-f]{1,4}$/u.test(word))) {
            return null;
        }
        return words.map(word => Number.parseInt(word, 16));
    },

    /** Return the optional host permission pattern needed by a custom endpoint. */
    endpointPermission(configuration) {
        if (configuration.provider !== 'custom') {
            return '';
        }
        const endpoint = this.resolveEndpoint(configuration);
        const url = new URL(endpoint);
        return `${url.protocol}//${url.hostname}/*`;
    },

    /** Build headers and JSON body for one supported provider protocol. */
    createRequest(configuration, model, profile, payload) {
        if (!model) {
            throw this.configurationError('providerModelMissing');
        }
        const endpoint = this.resolveEndpoint(configuration);
        const headers = { 'Content-Type': 'application/json' };
        if (configuration.authMode === 'bearer' && configuration.apiKey) {
            headers.Authorization = `Bearer ${configuration.apiKey}`;
        } else if (configuration.authMode === 'x-api-key' && configuration.apiKey) {
            headers['x-api-key'] = configuration.apiKey;
        }
        let body;
        if (configuration.protocol === 'openai-responses') {
            body = {
                model,
                instructions: payload.instructions,
                input: payload.input,
                reasoning: { effort: profile.effort },
                text: { verbosity: profile.verbosity },
                max_output_tokens: profile.maxOutputTokens,
                store: false
            };
        } else if (configuration.protocol === 'anthropic-messages') {
            headers['anthropic-version'] = '2023-06-01';
            headers['anthropic-dangerous-direct-browser-access'] = 'true';
            body = {
                model,
                system: payload.instructions,
                messages: [{ role: 'user', content: payload.input }],
                max_tokens: profile.maxOutputTokens
            };
        } else {
            body = {
                model,
                messages: [
                    { role: 'system', content: payload.instructions },
                    { role: 'user', content: payload.input }
                ],
                max_tokens: profile.maxOutputTokens
            };
            if (configuration.provider === 'deepseek') {
                // DeepSeek V4 defaults to thinking mode, which can consume a bounded
                // output budget before the content-only contract receives an answer.
                body.thinking = { type: 'disabled' };
            }
        }
        return { endpoint, headers, body };
    },

    /** Extract text, returned model identity, and normalized token usage. */
    parseResponse(configuration, data, requestedModel) {
        let content = '';
        if (configuration.protocol === 'openai-responses') {
            content = this.extractResponsesText(data);
        } else if (configuration.protocol === 'anthropic-messages') {
            content = (data?.content || [])
                .filter(item => item?.type === 'text' && typeof item.text === 'string')
                .map(item => item.text)
                .join('\n')
                .trim();
        } else {
            const responseContent = data?.choices?.[0]?.message?.content;
            content = Array.isArray(responseContent)
                ? responseContent
                    .filter(item => item?.type === 'text' && typeof item.text === 'string')
                    .map(item => item.text)
                    .join('\n')
                    .trim()
                : String(responseContent || '').trim();
        }
        return {
            content,
            model: String(data?.model || requestedModel || '').trim(),
            usage: this.normalizeUsage(configuration.protocol, data?.usage)
        };
    },

    extractResponsesText(response) {
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
    },

    /** Convert provider-specific token fields to the existing local usage contract. */
    normalizeUsage(protocol, usage) {
        if (protocol === 'openai-responses') {
            return usage || {};
        }
        if (protocol === 'anthropic-messages') {
            return {
                input_tokens: usage?.input_tokens,
                input_tokens_details: { cached_tokens: usage?.cache_read_input_tokens },
                output_tokens: usage?.output_tokens
            };
        }
        return {
            input_tokens: usage?.prompt_tokens,
            input_tokens_details: { cached_tokens: usage?.prompt_tokens_details?.cached_tokens },
            output_tokens: usage?.completion_tokens
        };
    },

    configurationError(messageKey) {
        const error = new Error(I18n.t(messageKey));
        return Object.assign(error, { userFacing: true, retryable: false });
    }
};

if (typeof window !== 'undefined') {
    window.AIProviderService = AIProviderService;
}
if (typeof globalThis !== 'undefined') {
    globalThis.AIProviderService = AIProviderService;
}
