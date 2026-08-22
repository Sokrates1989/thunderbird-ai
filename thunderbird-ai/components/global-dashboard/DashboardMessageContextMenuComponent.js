/**
 * Presents the actions of one dashboard message as an accessible custom menu.
 * The menu stays inside the extension page so it can target the exact row and
 * switch between direct titled groups and nested submenus without background state.
 */
const DashboardMessageContextMenuComponent = class {
    static STYLES = new Set(['headings', 'submenus']);

    constructor(options) {
        this.onStyleChanged = options.onStyleChanged;
        this.onError = options.onError;
        this.menu = null;
        this.origin = null;
        this.currentStyle = 'headings';
        this.boundOutsidePointer = event => this.handleOutsidePointer(event);
        this.boundWindowResize = () => this.close();
    }

    /** Normalize persisted values to the faster direct-action layout. */
    static normalizeStyle(value) {
        return this.STYLES.has(value) ? value : 'headings';
    }

    /** Replace any open menu with the actions belonging to the clicked row. */
    open(event, groups, style) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        const visibleGroups = this.visibleGroups(groups);
        if (!visibleGroups.length) {
            return;
        }

        this.origin = event.currentTarget?.focus ? event.currentTarget : document.activeElement;
        this.currentStyle = DashboardMessageContextMenuComponent.normalizeStyle(style);
        const menu = document.createElement('div');
        menu.className = 'dashboard-message-context-menu';
        menu.dataset.style = this.currentStyle;
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', I18n.t('dashboardContextMenuLabel'));
        menu.addEventListener('keydown', keyEvent => this.handleKeydown(keyEvent));
        const content = document.createElement('div');
        content.className = 'dashboard-context-menu-content';

        if (this.currentStyle === 'submenus') {
            for (const group of visibleGroups) {
                content.appendChild(this.submenuGroup(group));
            }
        } else {
            for (const group of visibleGroups) {
                content.appendChild(this.headingGroup(group));
            }
        }
        menu.append(
            content,
            this.separator(),
            this.layoutSubmenu()
        );

        document.body.appendChild(menu);
        this.menu = menu;
        this.positionMenu(event);
        this.bindDismissalListeners();
        this.menuItems(menu)[0]?.focus();
    }

    /** Remove hidden actions and any groups left empty by the current row state. */
    visibleGroups(groups) {
        return groups.map(group => ({
            ...group,
            actions: group.actions.filter(action => !action.hidden)
        })).filter(group => group.actions.length > 0);
    }

    /** Render a non-interactive title followed by immediately visible actions. */
    headingGroup(group) {
        const section = document.createElement('div');
        section.className = 'dashboard-context-menu-group';
        section.setAttribute('role', 'group');
        const title = this.textElement(
            'div',
            'dashboard-context-menu-title',
            I18n.t(group.titleKey)
        );
        title.setAttribute('role', 'presentation');
        section.appendChild(title);
        for (const action of group.actions) {
            section.appendChild(this.actionButton(action));
        }
        return section;
    }

    /** Render one action group behind a hoverable, clickable, and keyboard submenu. */
    submenuGroup(group) {
        return this.submenu(
            I18n.t(group.titleKey),
            group.actions.map(action => this.actionButton(action))
        );
    }

    /** Create one menu action while preserving its row-button state and icon. */
    actionButton(action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dashboard-context-menu-item ${action.className || ''}`.trim();
        button.disabled = action.disabled === true;
        button.setAttribute('role', 'menuitem');
        button.setAttribute('aria-label', I18n.t(action.labelKey, {
            subject: action.subject
        }));
        const icon = this.textElement(
            'span',
            'dashboard-context-menu-icon',
            action.icon || ''
        );
        icon.setAttribute('aria-hidden', 'true');
        button.append(
            icon,
            this.textElement('span', 'dashboard-context-menu-label', I18n.t(action.textKey))
        );
        button.addEventListener('click', clickEvent => {
            clickEvent.stopPropagation();
            this.close();
            try {
                Promise.resolve(action.execute()).catch(error => this.onError(error));
            } catch (error) {
                this.onError(error);
            }
        });
        return button;
    }

    /** Keep both layout choices inside a dedicated radio submenu. */
    layoutSubmenu() {
        return this.submenu(I18n.t('dashboardContextMenuLayout'), [
            this.styleButton('headings', 'dashboardContextMenuHeadings'),
            this.styleButton('submenus', 'dashboardContextMenuSubmenus')
        ], { settings: true });
    }

    /** Create one persisted context-menu layout choice. */
    styleButton(style, textKey) {
        const button = document.createElement('button');
        const selected = style === this.currentStyle;
        button.type = 'button';
        button.className = 'dashboard-context-menu-item dashboard-context-menu-radio';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', String(selected));
        button.append(
            this.textElement(
                'span',
                'dashboard-context-menu-check',
                selected ? '✓' : ''
            ),
            this.textElement('span', 'dashboard-context-menu-label', I18n.t(textKey))
        );
        button.addEventListener('click', clickEvent => {
            clickEvent.stopPropagation();
            this.close();
            Promise.resolve(this.onStyleChanged(style)).catch(error => this.onError(error));
        });
        return button;
    }

    /** Build a reusable submenu shell for action groups and menu preferences. */
    submenu(title, items, options = {}) {
        const parent = document.createElement('div');
        parent.className = 'dashboard-context-menu-parent';
        if (options.settings) {
            parent.classList.add('settings');
        }
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'dashboard-context-menu-item dashboard-context-menu-trigger';
        trigger.dataset.submenuTrigger = 'true';
        trigger.setAttribute('role', 'menuitem');
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.append(
            this.textElement('span', 'dashboard-context-menu-label', title),
            this.textElement('span', 'dashboard-context-menu-arrow', '›')
        );
        const submenu = document.createElement('div');
        submenu.className = 'dashboard-context-submenu';
        submenu.setAttribute('role', 'menu');
        submenu.setAttribute('aria-label', title);
        submenu.hidden = true;
        submenu.append(...items);
        parent.append(trigger, submenu);
        parent.addEventListener('pointerenter', () => this.setSubmenuOpen(parent, true));
        parent.addEventListener('pointerleave', () => {
            if (!parent.contains(document.activeElement)) {
                this.setSubmenuOpen(parent, false);
            }
        });
        parent.addEventListener('focusout', focusEvent => {
            if (!parent.contains(focusEvent.relatedTarget)) {
                this.setSubmenuOpen(parent, false);
            }
        });
        trigger.addEventListener('focus', () => this.closeSiblingSubmenus(parent));
        trigger.addEventListener('click', clickEvent => {
            clickEvent.stopPropagation();
            this.setSubmenuOpen(parent, true);
        });
        return parent;
    }

    /** Show one submenu, close its siblings, and flip it away from viewport overflow. */
    setSubmenuOpen(parent, open) {
        if (open) {
            this.closeSiblingSubmenus(parent);
        }
        parent.dataset.open = String(open);
        const trigger = parent.querySelector('[data-submenu-trigger]');
        trigger?.setAttribute('aria-expanded', String(open));
        const submenu = parent.querySelector('.dashboard-context-submenu');
        submenu.hidden = !open;
        if (open) {
            const parentBounds = parent.getBoundingClientRect();
            parent.classList.toggle(
                'opens-left',
                parentBounds.right + submenu.offsetWidth > window.innerWidth - 8
            );
            const stacksVertically = window.matchMedia('(max-width: 430px)').matches;
            const submenuTop = stacksVertically
                ? parentBounds.bottom + 4
                : parentBounds.top;
            parent.classList.toggle(
                'opens-up',
                submenuTop + submenu.offsetHeight > window.innerHeight - 8
            );
        }
    }

    /** Ensure only one submenu at the same menu level is expanded. */
    closeSiblingSubmenus(parent) {
        for (const sibling of parent.parentElement?.children || []) {
            if (sibling !== parent && sibling.classList?.contains('dashboard-context-menu-parent')) {
                this.setSubmenuOpen(sibling, false);
            }
        }
    }

    separator() {
        const separator = document.createElement('div');
        separator.className = 'dashboard-context-menu-separator';
        separator.setAttribute('role', 'separator');
        return separator;
    }

    /** Clamp the menu to the current dashboard viewport for mouse and keyboard opens. */
    positionMenu(event) {
        const originBounds = event.currentTarget?.getBoundingClientRect?.();
        const clientX = Number(event.clientX);
        const clientY = Number(event.clientY);
        const keyboardOpen = !Number.isFinite(clientX)
            || !Number.isFinite(clientY)
            || (clientX === 0 && clientY === 0);
        const requestedLeft = keyboardOpen && originBounds ? originBounds.left + 12 : clientX;
        const requestedTop = keyboardOpen && originBounds ? originBounds.top + 12 : clientY;
        this.menu.style.left = '0px';
        this.menu.style.top = '0px';
        const bounds = this.menu.getBoundingClientRect();
        const left = Math.max(8, Math.min(requestedLeft, window.innerWidth - bounds.width - 8));
        const top = Math.max(8, Math.min(requestedTop, window.innerHeight - bounds.height - 8));
        this.menu.style.left = `${left}px`;
        this.menu.style.top = `${top}px`;
    }

    /** Provide roving arrow-key navigation across each menu level. */
    handleKeydown(event) {
        const item = event.target.closest?.('[role="menuitem"], [role="menuitemradio"]');
        if (!item) {
            return;
        }
        const currentMenu = item.closest('[role="menu"]');
        const items = this.menuItems(currentMenu);
        const currentIndex = items.indexOf(item);
        let nextIndex = null;
        if (event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % items.length;
        } else if (event.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + items.length) % items.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = items.length - 1;
        } else if (event.key === 'ArrowRight' && item.dataset.submenuTrigger === 'true') {
            const parent = item.parentElement;
            this.setSubmenuOpen(parent, true);
            this.menuItems(parent.querySelector('.dashboard-context-submenu'))[0]?.focus();
            event.preventDefault();
            return;
        } else if (event.key === 'ArrowLeft' && currentMenu !== this.menu) {
            const parent = currentMenu.parentElement;
            this.setSubmenuOpen(parent, false);
            parent.querySelector('[data-submenu-trigger]')?.focus();
            event.preventDefault();
            return;
        } else if (event.key === 'Escape') {
            this.close(true);
            event.preventDefault();
            return;
        } else if (event.key === 'Tab') {
            this.close();
            return;
        }
        if (nextIndex !== null && items[nextIndex]) {
            items[nextIndex].focus();
            event.preventDefault();
        }
    }

    /** Return enabled items owned by one menu rather than nested descendant menus. */
    menuItems(menu) {
        if (!menu) {
            return [];
        }
        return [...menu.querySelectorAll('[role="menuitem"], [role="menuitemradio"]')]
            .filter(item => !item.disabled && item.closest('[role="menu"]') === menu);
    }

    /** Dismiss the menu when interaction leaves it or its viewport changes. */
    bindDismissalListeners() {
        document.addEventListener('pointerdown', this.boundOutsidePointer, true);
        window.addEventListener('resize', this.boundWindowResize);
    }

    handleOutsidePointer(event) {
        if (this.menu && !this.menu.contains(event.target)) {
            this.close();
        }
    }

    /** Remove the transient menu and optionally return keyboard focus to its row. */
    close(restoreFocus = false) {
        document.removeEventListener('pointerdown', this.boundOutsidePointer, true);
        window.removeEventListener('resize', this.boundWindowResize);
        this.menu?.remove();
        this.menu = null;
        if (restoreFocus) {
            this.origin?.focus?.();
        }
        this.origin = null;
    }

    textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardMessageContextMenuComponent = DashboardMessageContextMenuComponent;
}
