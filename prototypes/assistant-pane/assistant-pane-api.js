"use strict";

/**
 * Privileged prototype boundary that adds a fourth, resizable pane to about:3pane.
 * All email access and AI requests remain in the ordinary MailExtension context.
 */
(function registerAssistantPaneExperiment(exports) {
    const { ExtensionCommon } = ChromeUtils.importESModule(
        "resource://gre/modules/ExtensionCommon.sys.mjs"
    );

    const BUTTON_ID = "thunderbirdAiAssistantPaneButton";
    const PANE_ID = "thunderbirdAiAssistantPane";
    const SPLITTER_ID = "thunderbirdAiAssistantPaneSplitter";
    const STYLE_ID = "thunderbirdAiAssistantPaneStyle";
    const OPEN_CLASS = "thunderbird-ai-assistant-pane-open";
    const MIN_WIDTH = 280;
    const MAX_WIDTH = 720;
    const DEFAULT_WIDTH = 380;

    exports.aiAssistantPane = class extends ExtensionCommon.ExtensionAPI {
        /** Initialize state lazily because Thunderbird constructs Experiment APIs itself. */
        ensureState() {
            if (!this.panes) {
                this.panes = new Map();
            }
            if (!this.widthEmitter) {
                this.widthEmitter = new ExtensionCommon.EventEmitter();
            }
            if (!Number.isInteger(this.defaultWidth)) {
                this.defaultWidth = DEFAULT_WIDTH;
            }
        }

        /** Clamp a persisted or dragged width to the prototype's supported range. */
        normalizeWidth(width) {
            const numericWidth = Number(width);
            if (!Number.isFinite(numericWidth)) {
                return DEFAULT_WIDTH;
            }
            return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(numericWidth)));
        }

        /** Resolve a public mail-tab id to its privileged about:3pane window. */
        getMailTabWindow(context, tabId) {
            let nativeTab;
            try {
                ({ nativeTab } = context.extension.tabManager.get(tabId));
            } catch (_error) {
                return null;
            }
            if (nativeTab?.mode?.name !== "mail3PaneTab") {
                return null;
            }
            return nativeTab.chromeBrowser?.contentWindow || null;
        }

        /** Return a fresh record for the current about:3pane document. */
        ensureRecord(context, tabId) {
            this.ensureState();
            const about3Pane = this.getMailTabWindow(context, tabId);
            const document = about3Pane?.document;
            const body = document?.getElementById("paneLayout");
            const toolbar = document?.querySelector(
                "#threadPaneHeaderBar .list-header-bar-container-end"
            );
            if (!document || !body || !toolbar) {
                return null;
            }

            const existing = this.panes.get(tabId);
            if (existing?.document === document) {
                return existing;
            }
            if (existing) {
                this.removeRecord(existing);
            }

            const style = document.createElement("style");
            style.id = STYLE_ID;
            style.textContent = this.paneStyles();
            document.head.appendChild(style);

            const button = document.createElement("button");
            button.id = BUTTON_ID;
            button.type = "button";
            button.className = "button button-flat unified-toolbar-button";
            button.textContent = "AI";
            button.title = context.extension.localeData.localizeMessage(
                "assistantPaneButtonTitle"
            );
            button.setAttribute("aria-label", button.title);
            button.setAttribute("aria-pressed", "false");

            const record = {
                tabId,
                document,
                body,
                button,
                style,
                pane: null,
                splitter: null,
                width: this.defaultWidth,
                cleanupResize: null,
                onButtonClick: null
            };
            record.onButtonClick = () => {
                this.togglePane(context, record);
            };
            button.addEventListener("click", record.onButtonClick);
            toolbar.appendChild(button);
            this.panes.set(tabId, record);
            return record;
        }

        /** CSS overrides the three built-in grids only while the optional pane is open. */
        paneStyles() {
            return `
                #${BUTTON_ID} {
                    min-inline-size: 34px;
                    padding-inline: 8px;
                    border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
                    border-radius: 5px;
                    font-weight: 700;
                }
                #${BUTTON_ID}[aria-pressed="true"] {
                    color: var(--selected-item-text-color);
                    background-color: var(--selected-item-color);
                }
                body.${OPEN_CLASS}.layout-classic {
                    grid-template:
                        "folders folderPaneSplitter threads assistantPaneSplitter assistantPane" minmax(auto, 1fr)
                        "folders folderPaneSplitter messagePaneSplitter assistantPaneSplitter assistantPane" min-content
                        "folders folderPaneSplitter message assistantPaneSplitter assistantPane" minmax(auto, var(--messagePaneSplitter-height))
                        / minmax(auto, var(--folderPaneSplitter-width)) min-content minmax(300px, 1fr) 6px minmax(280px, var(--thunderbirdAiAssistantPaneWidth));
                }
                body.${OPEN_CLASS}.layout-vertical {
                    grid-template:
                        "folders folderPaneSplitter threads messagePaneSplitter message assistantPaneSplitter assistantPane" auto
                        / minmax(auto, var(--folderPaneSplitter-width)) min-content minmax(300px, 1fr) min-content minmax(300px, var(--messagePaneSplitter-width)) 6px minmax(280px, var(--thunderbirdAiAssistantPaneWidth));
                }
                body.${OPEN_CLASS}.layout-wide {
                    grid-template:
                        "folders folderPaneSplitter threads assistantPaneSplitter assistantPane" minmax(auto, 1fr)
                        "messagePaneSplitter messagePaneSplitter messagePaneSplitter assistantPaneSplitter assistantPane" min-content
                        "message message message assistantPaneSplitter assistantPane" minmax(auto, var(--messagePaneSplitter-height))
                        / minmax(auto, var(--folderPaneSplitter-width)) min-content minmax(300px, 1fr) 6px minmax(280px, var(--thunderbirdAiAssistantPaneWidth));
                }
                body.${OPEN_CLASS}.account-central {
                    grid-template:
                        "folders folderPaneSplitter account-central assistantPaneSplitter assistantPane" auto
                        / minmax(auto, var(--folderPaneSplitter-width)) min-content minmax(400px, 1fr) 6px minmax(280px, var(--thunderbirdAiAssistantPaneWidth));
                }
                #${SPLITTER_ID} {
                    grid-area: assistantPaneSplitter;
                    inline-size: 6px;
                    min-inline-size: 6px;
                    margin: 0;
                    padding: 0;
                    border: 0;
                    border-inline-start: 1px solid var(--splitter-color, var(--layout-border-color));
                    background: transparent;
                    cursor: ew-resize;
                    z-index: 2;
                }
                #${SPLITTER_ID}:hover,
                #${SPLITTER_ID}:focus-visible {
                    background-color: color-mix(in srgb, var(--selected-item-color) 28%, transparent);
                    outline: none;
                }
                #${PANE_ID} {
                    grid-area: assistantPane;
                    box-sizing: border-box;
                    min-inline-size: 280px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    contain: strict;
                    background-color: var(--layout-background-1);
                }
                #${PANE_ID} > browser {
                    flex: 1;
                    inline-size: 100%;
                    block-size: 100%;
                    border: 0;
                }
            `;
        }

        /** Open the pane without altering Thunderbird's native message document. */
        openPane(context, record) {
            if (record.pane) {
                return true;
            }
            const { document, body } = record;
            const splitter = document.createElement("hr");
            splitter.id = SPLITTER_ID;
            splitter.tabIndex = 0;
            splitter.setAttribute("role", "separator");
            splitter.setAttribute("aria-orientation", "vertical");
            splitter.title = context.extension.localeData.localizeMessage(
                "assistantPaneResizeTitle"
            );
            splitter.setAttribute("aria-label", splitter.title);

            const pane = document.createElement("section");
            pane.id = PANE_ID;
            pane.setAttribute("aria-label", context.extension.localeData.localizeMessage(
                "assistantPaneButtonTitle"
            ));
            const browser = document.createXULElement("browser");
            browser.setAttribute("type", "content");
            browser.setAttribute("remote", "true");
            browser.setAttribute("maychangeremoteness", "true");
            browser.setAttribute(
                "src",
                context.extension.baseURI.resolve("assistant-pane.html")
            );
            pane.appendChild(browser);

            record.pane = pane;
            record.splitter = splitter;
            body.style.setProperty(
                "--thunderbirdAiAssistantPaneWidth",
                `${this.normalizeWidth(record.width)}px`
            );
            body.classList.add(OPEN_CLASS);
            body.append(splitter, pane);
            record.button.setAttribute("aria-pressed", "true");
            this.installResizeHandlers(record);
            return true;
        }

        /** Add pointer and keyboard resizing while retaining a single persisted width. */
        installResizeHandlers(record) {
            const { splitter, pane, body } = record;
            const applyWidth = width => {
                record.width = this.normalizeWidth(width);
                body.style.setProperty(
                    "--thunderbirdAiAssistantPaneWidth",
                    `${record.width}px`
                );
                splitter.setAttribute("aria-valuemin", String(MIN_WIDTH));
                splitter.setAttribute("aria-valuemax", String(MAX_WIDTH));
                splitter.setAttribute("aria-valuenow", String(record.width));
            };
            const persistWidth = () => {
                this.defaultWidth = record.width;
                this.widthEmitter.emit("assistant-pane-width-changed", record.tabId, record.width);
            };
            const onPointerDown = event => {
                if (event.button !== 0) {
                    return;
                }
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = pane.getBoundingClientRect().width;
                splitter.setPointerCapture(event.pointerId);
                const onPointerMove = moveEvent => {
                    applyWidth(startWidth + startX - moveEvent.clientX);
                };
                const onPointerUp = upEvent => {
                    splitter.removeEventListener("pointermove", onPointerMove);
                    splitter.removeEventListener("pointerup", onPointerUp);
                    splitter.removeEventListener("pointercancel", onPointerUp);
                    if (splitter.hasPointerCapture(upEvent.pointerId)) {
                        splitter.releasePointerCapture(upEvent.pointerId);
                    }
                    persistWidth();
                };
                splitter.addEventListener("pointermove", onPointerMove);
                splitter.addEventListener("pointerup", onPointerUp);
                splitter.addEventListener("pointercancel", onPointerUp);
            };
            const onKeyDown = event => {
                const delta = event.key === "ArrowLeft"
                    ? 24
                    : (event.key === "ArrowRight" ? -24 : 0);
                if (!delta) {
                    return;
                }
                event.preventDefault();
                applyWidth(record.width + delta);
                persistWidth();
            };
            applyWidth(record.width);
            splitter.addEventListener("pointerdown", onPointerDown);
            splitter.addEventListener("keydown", onKeyDown);
            record.cleanupResize = () => {
                splitter.removeEventListener("pointerdown", onPointerDown);
                splitter.removeEventListener("keydown", onKeyDown);
            };
        }

        /** Toggle one registered pane and return its resulting open state. */
        togglePane(context, record) {
            if (record.pane) {
                this.closePane(record);
                return false;
            }
            this.openPane(context, record);
            return true;
        }

        /** Close pane content while retaining the lightweight toolbar registration. */
        closePane(record) {
            if (!record.pane) {
                return false;
            }
            record.cleanupResize?.();
            record.cleanupResize = null;
            record.splitter?.remove();
            record.pane.remove();
            record.splitter = null;
            record.pane = null;
            record.body.classList.remove(OPEN_CLASS);
            record.button.setAttribute("aria-pressed", "false");
            return true;
        }

        /** Remove every injected element and listener owned by one mail tab. */
        removeRecord(record) {
            this.closePane(record);
            record.button?.removeEventListener("click", record.onButtonClick);
            record.button?.remove();
            record.style?.remove();
        }

        getAPI(context) {
            this.ensureState();
            return {
                aiAssistantPane: {
                    onWidthChanged: new ExtensionCommon.EventManager({
                        context,
                        name: "aiAssistantPane.onWidthChanged",
                        register: fire => {
                            const listener = (_eventName, tabId, width) => {
                                return fire.async(tabId, width);
                            };
                            this.widthEmitter.on("assistant-pane-width-changed", listener);
                            return () => {
                                this.widthEmitter.off("assistant-pane-width-changed", listener);
                            };
                        }
                    }).api(),

                    initialize: async width => {
                        this.defaultWidth = this.normalizeWidth(width);
                    },

                    ensureButton: async tabId => {
                        return Boolean(this.ensureRecord(context, tabId));
                    },

                    toggle: async tabId => {
                        const record = this.ensureRecord(context, tabId);
                        return record ? this.togglePane(context, record) : false;
                    },

                    close: async tabId => {
                        const record = this.panes.get(tabId);
                        return record ? this.closePane(record) : false;
                    }
                }
            };
        }

        onShutdown(isAppShutdown) {
            if (isAppShutdown) {
                return;
            }
            this.ensureState();
            for (const record of this.panes.values()) {
                this.removeRecord(record);
            }
            this.panes.clear();
            Services.obs.notifyObservers(null, "startupcache-invalidate", null);
        }
    };
})(this);
