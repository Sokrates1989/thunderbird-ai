/**
 * Coordinates bounded retries without deciding which domain errors are transient.
 * Callers own classification; runtime retries are limited to messages not delivered.
 */
const RetryService = {
    DEFAULT_MAX_ATTEMPTS: 3,
    DEFAULT_BASE_DELAY_MS: 250,
    DEFAULT_MAX_DELAY_MS: 2000,

    /** Run an asynchronous operation until it succeeds or its retry policy stops. */
    async run(operation, options = {}) {
        const maxAttempts = this.normalizeAttempts(options.maxAttempts);
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await operation(attempt);
            } catch (error) {
                const shouldRetry = attempt < maxAttempts
                    && options.shouldRetry?.(error, attempt) === true;
                if (!shouldRetry) {
                    throw error;
                }
                const delayMs = this.resolveDelay(options, error, attempt);
                options.onRetry?.(error, attempt, delayMs);
                await this.wait(delayMs);
            }
        }
        throw new Error('Retry loop ended without a result.');
    },

    /** Retry a runtime message only when Thunderbird confirms it was not delivered. */
    async sendRuntimeMessage(message, options = {}) {
        return this.run(
            () => browser.runtime.sendMessage(message),
            {
                maxAttempts: options.maxAttempts || this.DEFAULT_MAX_ATTEMPTS,
                shouldRetry: error => this.isUndeliveredRuntimeMessage(error),
                delayMs: (_error, attempt) => this.exponentialDelay(attempt, {
                    baseDelayMs: 100,
                    maxDelayMs: 500
                }),
                onRetry: options.onRetry
            }
        );
    },

    /** Recognize startup failures where Thunderbird had no receiving background listener. */
    isUndeliveredRuntimeMessage(error) {
        const message = String(error?.message || error || '');
        return /receiving end does not exist|could not establish connection|no matching message handler/iu
            .test(message);
    },

    /** Calculate bounded exponential backoff with positive jitter. */
    exponentialDelay(failedAttempt, options = {}) {
        const baseDelayMs = this.normalizeDelay(
            options.baseDelayMs,
            this.DEFAULT_BASE_DELAY_MS
        );
        const maxDelayMs = this.normalizeDelay(
            options.maxDelayMs,
            this.DEFAULT_MAX_DELAY_MS
        );
        const random = typeof options.random === 'function' ? options.random : Math.random;
        const exponential = baseDelayMs * (2 ** Math.max(0, failedAttempt - 1));
        const jitter = Math.floor(baseDelayMs * 0.25 * random());
        return Math.min(maxDelayMs, exponential + jitter);
    },

    resolveDelay(options, error, attempt) {
        const configured = typeof options.delayMs === 'function'
            ? options.delayMs(error, attempt)
            : options.delayMs;
        return this.normalizeDelay(
            configured,
            this.exponentialDelay(attempt)
        );
    },

    normalizeAttempts(value) {
        const attempts = Number(value);
        return Number.isInteger(attempts) && attempts > 0
            ? attempts
            : this.DEFAULT_MAX_ATTEMPTS;
    },

    normalizeDelay(value, fallback) {
        const delay = Number(value);
        return Number.isFinite(delay) && delay >= 0 ? Math.round(delay) : fallback;
    },

    wait(delayMs) {
        return new Promise(resolve => setTimeout(resolve, delayMs));
    }
};

if (typeof globalThis !== 'undefined') {
    globalThis.RetryService = RetryService;
}
