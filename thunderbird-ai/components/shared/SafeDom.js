/**
 * Builds extension-owned UI through DOM APIs so localized and dynamic text is
 * never interpreted as HTML.
 */
const SafeDom = {
    /** Create one element with explicit properties, attributes, and child nodes. */
    create(tagName, options = {}, children = []) {
        const element = document.createElement(tagName);
        if (options.id) {
            element.id = options.id;
        }
        if (options.className) {
            element.className = options.className;
        }
        if (Object.hasOwn(options, 'text')) {
            element.textContent = String(options.text ?? '');
        }
        for (const [name, value] of Object.entries(options.attributes || {})) {
            element.setAttribute(name, String(value));
        }
        for (const [name, value] of Object.entries(options.properties || {})) {
            element[name] = value;
        }
        for (const [name, value] of Object.entries(options.dataset || {})) {
            element.dataset[name] = String(value);
        }
        for (const child of children) {
            if (child) {
                element.appendChild(child);
            }
        }
        return element;
    },

    /** Replace a control's contents with separate literal icon and label nodes. */
    setIconLabel(element, icon, label, labelClass = 'text') {
        const iconElement = this.create('span', {
            className: 'icon',
            text: icon,
            attributes: { 'aria-hidden': 'true' }
        });
        const labelElement = this.create('span', {
            className: labelClass,
            text: label
        });
        element.replaceChildren(iconElement, labelElement);
        return labelElement;
    }
};

globalThis.SafeDom = SafeDom;
