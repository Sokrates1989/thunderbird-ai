import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadTrainingService() {
    const storage = {};
    const deleted = [];
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async key => ({ [key]: storage[key] }),
                set: async values => Object.assign(storage, values)
            } },
            messages: { delete: async (...parameters) => deleted.push(parameters) }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/message.js');
    loadScript(context, 'common/utils/dashboard-training.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailService.js');
    return { context, deleted, service: context.DashboardTrainingService, storage };
}

function email(overrides = {}) {
    return {
        id: 42,
        headerMessageId: 'invoice@example.test',
        accountId: 'work',
        subject: 'Monthly supplier invoice',
        author: 'Ada <ada@example.test>',
        date: new Date('2026-08-10T10:00:00Z'),
        content: 'x'.repeat(7000),
        attachments: [{ name: 'invoice.pdf' }],
        ...overrides
    };
}

test('corrected email is archived separately, bounded, and survives Thunderbird deletion', async () => {
    const { context, deleted, service, storage } = loadTrainingService();
    const message = email();

    await service.archiveFeedback(message, {
        originalScores: { importanceScore: 20, spamScore: 80 },
        correctedScores: { importanceScore: 95, spamScore: 3 },
        reason: 'Trusted supplier',
        sourceModel: 'gpt-5.6-luna'
    });
    await context.GlobalMailService.moveToTrash([message.id]);

    const archive = storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE];
    assert.equal(archive.length, 1);
    assert.equal(archive[0].message.content.length, 6000);
    assert.equal(archive[0].message.attachments[0].name, 'invoice.pdf');
    assert.equal(archive[0].reason, 'Trusted supplier');
    assert.deepEqual(Array.from(deleted[0][0]), [42]);
    assert.equal(deleted[0][1], false);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE].length, 1);
});

test('repeated corrections preserve the first AI baseline and rank relevant examples first', async () => {
    const { service } = loadTrainingService();
    await service.archiveFeedback(email(), {
        originalScores: { importanceScore: 20, spamScore: 80 },
        correctedScores: { importanceScore: 95, spamScore: 3 },
        reason: 'Known supplier'
    });
    await service.archiveFeedback(email(), {
        originalScores: { importanceScore: 95, spamScore: 3 },
        correctedScores: { importanceScore: 88, spamScore: 6 },
        reason: 'Still legitimate, but less urgent'
    });
    await service.archiveFeedback(email({
        headerMessageId: 'newsletter@example.test',
        subject: 'Weekly deals',
        author: 'Shop <shop@example.test>'
    }), {
        originalScores: { importanceScore: 40, spamScore: 30 },
        correctedScores: { importanceScore: 5, spamScore: 70 }
    });

    const archive = await service.loadArchive();
    const examples = await service.relevantExamples([email({ content: 'New invoice' })]);

    const invoice = archive.find(record => record.message.author.includes('ada@example.test'));
    assert.deepEqual(
        {
            originalImportance: invoice.originalScores.importanceScore,
            correctedImportance: invoice.correctedScores.importanceScore
        },
        { originalImportance: 20, correctedImportance: 88 }
    );
    assert.match(examples[0].message.author, /ada@example\.test/u);
});

test('feedback archive and operator reasons stay within their configured bounds', async () => {
    const { context, service, storage } = loadTrainingService();
    const key = context.CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE;
    const oldTimestamp = '2026-08-09T10:00:00.000Z';
    storage[key] = Array.from({ length: 250 }, (_value, index) => ({
        storageKey: `old-${index}`,
        message: service.messageSnapshot(email({ headerMessageId: `old-${index}` })),
        originalScores: { importanceScore: 50, spamScore: 50 },
        correctedScores: { importanceScore: 51, spamScore: 49 },
        reason: '',
        sourceModel: 'gpt-5.6-luna',
        createdAt: oldTimestamp,
        updatedAt: oldTimestamp
    }));

    await service.archiveFeedback(email({ headerMessageId: 'new@example.test' }), {
        originalScores: { importanceScore: 20, spamScore: 80 },
        correctedScores: { importanceScore: 90, spamScore: 5 },
        reason: 'r'.repeat(1200)
    });

    assert.equal(storage[key].length, 250);
    assert.equal(storage[key][0].reason.length, 1000);
    assert.equal(storage[key].filter(record => record.storageKey.startsWith('old-')).length, 249);
});

test('separate score reasons survive exact-message reuse, manual rescoring, and removal', async () => {
    const { service } = loadTrainingService();
    const message = email();
    const archived = await service.archiveFeedback(message, {
        originalScores: { importanceScore: 44, spamScore: 30 },
        correctedScores: { importanceScore: 92, spamScore: 4 },
        reasons: {
            importance: { categories: ['sender', 'requestedAction'], text: 'Invoice needs approval' },
            spam: { categories: ['addressStyle'], text: 'Known company domain' }
        },
        sourceModel: 'gpt-5.6-terra'
    });

    const exact = await service.findForMessage(message);
    assert.deepEqual(Array.from(exact.reasons.importance.categories), ['sender', 'requestedAction']);
    assert.equal(exact.reasons.spam.text, 'Known company domain');

    const updated = await service.updateArchivedFeedback(archived.storageKey, {
        correctedScores: { importanceScore: 80, spamScore: 7 },
        reasons: {
            importance: { categories: ['content'], text: 'Useful, but not urgent' },
            spam: { categories: ['previousExperience'], text: 'Repeated legitimate invoices' }
        }
    });
    assert.deepEqual(
        {
            importanceScore: updated.correctedScores.importanceScore,
            spamScore: updated.correctedScores.spamScore,
            importanceText: updated.reasons.importance.text
        },
        { importanceScore: 80, spamScore: 7, importanceText: 'Useful, but not urgent' }
    );

    assert.equal(await service.removeArchivedFeedback(archived.storageKey), true);
    assert.equal(await service.findForMessage(message), null);
});

test('legacy common reasons migrate into both score-specific explanation fields', async () => {
    const { context, service, storage } = loadTrainingService();
    const key = context.CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE;
    const timestamp = '2026-08-10T10:00:00.000Z';
    storage[key] = [{
        storageKey: 'legacy',
        message: service.messageSnapshot(email()),
        originalScores: { importanceScore: 20, spamScore: 80 },
        correctedScores: { importanceScore: 90, spamScore: 5 },
        reason: 'Trusted sender',
        createdAt: timestamp,
        updatedAt: timestamp
    }];

    const [record] = await service.loadArchive();
    assert.equal(record.reasons.importance.text, 'Trusted sender');
    assert.equal(record.reasons.spam.text, 'Trusted sender');
});
