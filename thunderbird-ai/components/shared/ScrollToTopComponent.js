/** Controls one floating scroll-to-top button across one or more scroll containers. */
const ScrollToTopComponent = class {
    constructor({ button, scrollTargets, threshold = 24 }) {
        this.button = button;
        this.scrollTargets = [...new Set(scrollTargets)].filter(Boolean);
        this.threshold = threshold;
        this.handleScroll = () => this.updateVisibility();
        this.handleClick = () => this.scrollToTop();
    }

    /** Bind every scroll source and establish the initial hidden state. */
    initialize() {
        this.button.addEventListener('click', this.handleClick);
        for (const target of this.scrollTargets) {
            target.addEventListener('scroll', this.handleScroll, { passive: true });
        }
        this.updateVisibility();
    }

    /** Remove listeners when a host page explicitly tears down the controller. */
    destroy() {
        this.button.removeEventListener('click', this.handleClick);
        for (const target of this.scrollTargets) {
            target.removeEventListener('scroll', this.handleScroll);
        }
    }

    /** Show the button only after at least one observed surface has moved down. */
    updateVisibility() {
        this.button.hidden = !this.scrollTargets.some(
            target => this.scrollPosition(target) > this.threshold
        );
    }

    /** Return the effective vertical offset for a Window or element target. */
    scrollPosition(target) {
        if (target === globalThis.window) {
            return Math.max(
                Number(globalThis.window.scrollY) || 0,
                Number(globalThis.document.scrollingElement?.scrollTop) || 0,
                Number(globalThis.document.documentElement?.scrollTop) || 0
            );
        }
        return Number(target.scrollTop) || 0;
    }

    /** Scroll every observed surface to its start with reduced-motion support. */
    scrollToTop() {
        const reduceMotion = globalThis.window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        ).matches === true;
        const options = { top: 0, behavior: reduceMotion ? 'auto' : 'smooth' };
        for (const target of this.scrollTargets) {
            if (typeof target.scrollTo === 'function') {
                target.scrollTo(options);
            } else {
                target.scrollTop = 0;
            }
        }
    }
};

globalThis.ScrollToTopComponent = ScrollToTopComponent;
