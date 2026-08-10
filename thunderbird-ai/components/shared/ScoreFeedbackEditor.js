/** Builds and reads the shared, score-specific operator feedback editor. */
const ScoreFeedbackEditor = {
    create(options) {
        const name = options.name === 'spam' ? 'spam' : 'importance';
        const labelKey = name === 'importance'
            ? 'dashboardFeedbackImportance'
            : 'dashboardFeedbackSpam';
        const root = document.createElement('fieldset');
        root.className = ['score-feedback-editor', options.rootClass]
            .filter(Boolean)
            .join(' ');

        const legend = document.createElement('legend');
        legend.textContent = I18n.t(labelKey);
        root.appendChild(legend);

        const valueRow = document.createElement('label');
        valueRow.className = 'score-feedback-value-row';
        const range = options.showRange === false ? null : document.createElement('input');
        if (range) {
            range.type = 'range';
            range.min = '0';
            range.max = '100';
            range.step = '1';
            range.setAttribute('aria-label', legend.textContent);
            valueRow.appendChild(range);
        } else {
            valueRow.classList.add('number-only');
        }
        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0';
        number.max = '100';
        number.step = '1';
        number.inputMode = 'numeric';
        number.setAttribute('aria-label', legend.textContent);
        valueRow.append(number, document.createTextNode('%'));
        root.appendChild(valueRow);

        const prompt = document.createElement('p');
        prompt.className = 'score-feedback-reason-prompt';
        prompt.textContent = I18n.t(name === 'importance'
            ? 'singleScoreImportanceReason'
            : 'singleScoreSpamReason');
        root.appendChild(prompt);

        const categories = new Map();
        for (const category of CONFIG.OPENAI.SCORE_FEEDBACK_CATEGORIES) {
            const label = document.createElement('label');
            label.className = 'score-feedback-reason-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = options.reasons?.categories?.includes(category) || false;
            label.append(checkbox, document.createTextNode(I18n.t(
                `scoreReason${category[0].toUpperCase()}${category.slice(1)}`
            )));
            root.appendChild(label);
            categories.set(category, checkbox);
        }

        const text = document.createElement('textarea');
        text.rows = 3;
        text.maxLength = CONFIG.OPENAI.DASHBOARD_FEEDBACK_REASON_CHARACTERS;
        text.placeholder = I18n.t('singleScoreReasonPlaceholder');
        text.value = options.reasons?.text || '';
        root.appendChild(text);

        const editor = { root, range, number, categories, text };
        this.setScore(editor, options.score);
        if (range) {
            range.addEventListener('input', () => { number.value = range.value; });
            number.addEventListener('input', () => {
                const score = this.normalizeScore(number.value);
                if (score !== null) {
                    range.value = String(score);
                }
            });
        }
        return editor;
    },

    readReasons(editor) {
        return {
            categories: [...editor.categories]
                .filter(([_category, checkbox]) => checkbox.checked)
                .map(([category]) => category),
            text: editor.text.value.trim()
        };
    },

    setScore(editor, value) {
        const score = this.normalizeScore(value) ?? 0;
        editor.number.value = String(score);
        if (editor.range) {
            editor.range.value = String(score);
        }
    },

    setDisabled(editor, disabled) {
        for (const element of [
            editor.range,
            editor.number,
            ...editor.categories.values(),
            editor.text
        ].filter(Boolean)) {
            element.disabled = disabled;
        }
    },

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    }
};

if (typeof globalThis !== 'undefined') {
    globalThis.ScoreFeedbackEditor = ScoreFeedbackEditor;
}
