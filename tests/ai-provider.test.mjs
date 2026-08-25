import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadProviderService() {
    const context = createContext({ browser: { i18n: { getUILanguage: () => 'en-US' } } });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    return { config: context.CONFIG, service: context.AIProviderService };
}

const profile = {
    effort: 'low',
    verbosity: 'medium',
    maxOutputTokens: 321
};
const payload = { instructions: 'System rules', input: 'Email data' };

test('OpenAI remains the default provider and keeps its Responses API contract', () => {
    const { config, service } = loadProviderService();
    const configuration = service.normalizeConfiguration('unknown', {
        baseUrl: 'https://untrusted.example/v1',
        apiKey: 'sk-openai'
    });
    const request = service.createRequest(configuration, 'gpt-5.6-sol', profile, payload);

    assert.equal(config.AI.DEFAULT_PROVIDER, 'openai');
    assert.equal(configuration.provider, 'openai');
    assert.equal(configuration.baseUrl, 'https://api.openai.com/v1');
    assert.equal(request.endpoint, 'https://api.openai.com/v1/responses');
    assert.equal(request.headers.Authorization, 'Bearer sk-openai');
    assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {
        model: 'gpt-5.6-sol',
        instructions: 'System rules',
        input: 'Email data',
        reasoning: { effort: 'low' },
        text: { verbosity: 'medium' },
        max_output_tokens: 321,
        store: false
    });
});

test('Claude uses Anthropic Messages headers, payload, text, and usage fields', () => {
    const { service } = loadProviderService();
    const configuration = service.normalizeConfiguration('anthropic', {
        apiKey: 'anthropic-secret'
    });
    const request = service.createRequest(configuration, 'claude-sonnet-5', profile, payload);
    const parsed = service.parseResponse(configuration, {
        model: 'claude-sonnet-5',
        content: [
            { type: 'thinking', thinking: 'private' },
            { type: 'text', text: 'Claude result' }
        ],
        usage: {
            input_tokens: 40,
            cache_read_input_tokens: 10,
            output_tokens: 12
        }
    }, 'claude-sonnet-5');

    assert.equal(request.endpoint, 'https://api.anthropic.com/v1/messages');
    assert.equal(request.headers['x-api-key'], 'anthropic-secret');
    assert.equal(request.headers['anthropic-version'], '2023-06-01');
    assert.equal(request.headers['anthropic-dangerous-direct-browser-access'], 'true');
    assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {
        model: 'claude-sonnet-5',
        system: 'System rules',
        messages: [{ role: 'user', content: 'Email data' }],
        max_tokens: 321
    });
    assert.equal(parsed.content, 'Claude result');
    assert.deepEqual(JSON.parse(JSON.stringify(parsed.usage)), {
        input_tokens: 40,
        input_tokens_details: { cached_tokens: 10 },
        output_tokens: 12
    });
});

test('Mistral and DeepSeek use compatible chat requests with bounded DeepSeek output', () => {
    const { service } = loadProviderService();
    const expectedEndpoints = {
        mistral: 'https://api.mistral.ai/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/chat/completions'
    };

    for (const [provider, expectedEndpoint] of Object.entries(expectedEndpoints)) {
        const configuration = service.normalizeConfiguration(provider, { apiKey: `${provider}-key` });
        const request = service.createRequest(configuration, `${provider}-model`, profile, payload);
        const parsed = service.parseResponse(configuration, {
            choices: [{ message: { content: `${provider} result` } }],
            usage: { prompt_tokens: 7, completion_tokens: 3 }
        }, `${provider}-model`);

        assert.equal(request.endpoint, expectedEndpoint);
        assert.equal(request.headers.Authorization, `Bearer ${provider}-key`);
        assert.deepEqual(JSON.parse(JSON.stringify(request.body.messages)), [
            { role: 'system', content: 'System rules' },
            { role: 'user', content: 'Email data' }
        ]);
        if (provider === 'deepseek') {
            assert.deepEqual(JSON.parse(JSON.stringify(request.body.thinking)), {
                type: 'disabled'
            });
        } else {
            assert.equal(request.body.thinking, undefined);
        }
        assert.equal(parsed.content, `${provider} result`);
        assert.equal(parsed.usage.input_tokens, 7);
        assert.equal(parsed.usage.output_tokens, 3);
    }
});

test('custom endpoints support compatible protocols and request only their exact host', () => {
    const { service } = loadProviderService();
    const configuration = service.normalizeConfiguration('custom', {
        baseUrl: 'https://private-ai.example/api/v1/',
        protocol: 'openai-chat',
        authMode: 'none',
        defaultModel: 'private-model'
    });
    const request = service.createRequest(
        configuration,
        service.resolveModel(configuration, 'summarize'),
        profile,
        payload
    );

    assert.equal(request.endpoint, 'https://private-ai.example/api/v1/chat/completions');
    assert.equal(service.endpointPermission(configuration), 'https://private-ai.example/*');
    assert.equal(request.headers.Authorization, undefined);
    assert.equal(request.body.model, 'private-model');
});

test('connection tests leave enough output budget for reasoning-model answers', () => {
    const { config, service } = loadProviderService();
    const configuration = service.normalizeConfiguration('custom', {
        baseUrl: 'https://router.huggingface.co/v1',
        protocol: 'openai-chat',
        authMode: 'bearer',
        apiKey: 'hf-test-token',
        defaultModel: 'openai/gpt-oss-120b:cheapest'
    });
    const request = service.createRequest(
        configuration,
        service.resolveModel(configuration, 'test'),
        config.AI.TASK_PROFILES.test,
        payload
    );

    assert.equal(request.endpoint, 'https://router.huggingface.co/v1/chat/completions');
    assert.equal(request.body.max_tokens, 512);
});

test('custom endpoints reject insecure remote HTTP while allowing loopback development', () => {
    const { service } = loadProviderService();
    const insecure = service.normalizeConfiguration('custom', {
        baseUrl: 'http://private-ai.example/v1',
        defaultModel: 'private-model'
    });
    const loopback = service.normalizeConfiguration('custom', {
        baseUrl: 'http://127.0.0.1:11434/v1',
        defaultModel: 'local-model'
    });

    assert.throws(() => service.resolveEndpoint(insecure), /must use HTTPS/u);
    assert.equal(service.resolveEndpoint(loopback), 'http://127.0.0.1:11434/v1/chat/completions');
    assert.equal(service.endpointPermission(loopback), 'http://127.0.0.1/*');
});

test('automatic model routing follows each provider task quality role', () => {
    const { service } = loadProviderService();
    const anthropic = service.normalizeConfiguration('anthropic');
    const mistral = service.normalizeConfiguration('mistral');

    assert.equal(service.resolveModel(anthropic, 'bulkTriage'), 'claude-haiku-4-5-20251001');
    assert.equal(service.resolveModel(anthropic, 'summarize'), 'claude-sonnet-5');
    assert.equal(service.resolveModel(mistral, 'singleScore'), 'mistral-medium-latest');
    assert.equal(service.resolveModel(mistral, 'reply'), 'mistral-large-latest');
});
