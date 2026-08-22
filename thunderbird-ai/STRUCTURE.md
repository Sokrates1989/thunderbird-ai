# AI Mail Assistant for Thunderbird - Code Structure

## 📁 Directory Structure

```
thunderbird-ai/
├── manifest.json              # Addon manifest
├── background.js              # Main background script (modular)
├── components/               # UI Components
│   ├── MessageDisplayComponent.js  # Message display component
│   └── SettingsComponent.js       # Settings component
├── config/                   # Configuration
│   └── constants.js         # Constants and configuration
├── utils/                    # Utility modules
│   ├── storage.js           # Storage management
│   ├── ai-provider.js       # AI provider request/response adapters
│   ├── openai.js            # Provider-independent AI task service
│   ├── message.js           # Message operations
│   └── ui.js               # UI utilities
├── pages/                    # Page components (future)
├── styles/                   # Style modules (future)
├── html/                     # HTML templates
│   ├── message-display.html # Main popup
│   └── settings.html        # Settings page
├── css/                      # Stylesheets
│   ├── message-display.css  # Main popup styles
│   ├── settings.css         # Settings styles
│   └── common.css          # Common styles
└── js/                       # JavaScript entry points
    ├── message-display.js   # Message display entry
    └── settingsEntry.js     # Settings entry
```

**Note**: The build script flattens this structure, so all utilities use global variables instead of imports.

### Current dashboard boundaries

- `GlobalDashboardManager.js` coordinates refreshes, selection, and mailbox actions while coalescing concurrent refresh requests into one mailbox scan. `DashboardAnalysisController.js` routes bulk and per-message first-time or explicit repeat scoring through one protected result-storage and view-refresh workflow.
- `GlobalMailService.js` owns bounded-concurrency Thunderbird header pagination, previews, native account-aware archiving, and fault-isolated read-state updates. `DashboardDeleteComponent.js` keeps destructive confirmation and the prominent persisted result dialog inside the dashboard without reserving permanent main-view space for diagnostics. The actual version-compatible deletion runs through `dashboard-mailbox.js` in the background, where it survives popup lifecycle changes and persists a content-free diagnostic. The dashboard verifies deletion against briefly retried unread snapshots instead of reporting an unconfirmed success.
- `GlobalMailViewService.js` applies sender/date/AI filters, per-account limits, the combined newest-50 candidate scope, and explicit cross-account score sorting before previews are loaded.
- `DashboardViewPreferences.js` owns persisted view controls and session-bound selected message IDs, including the account-separated/combined layout switch, the direct-versus-submenu message context-menu style, and the collapsed/expanded state of the organized view-options panel. This state is shared by the toolbar popup and the durable expanded Thunderbird tab, while volatile Thunderbird IDs are discarded when Thunderbird exits.
- `LaunchModeService.js` owns normalized overlay/tab preferences and transient popup routing. Startup-critical shared services attach directly to `globalThis` so Thunderbird's generated background page cannot expose a cross-script lexical binding in its temporal dead zone. Neither toolbar declares a static manifest popup: synchronous background listeners wake the event page, read the relevant persisted mode, assign an overlay only for that click, and clear it immediately afterward. Every popup API call is bounded, and dashboard and single-message mode are stored independently.
- `DashboardLaunchService.js` focuses an existing durable dashboard tab before creating a fallback and coalesces concurrent launches. Every Thunderbird tab/window API call is bounded so a pending promise cannot block future toolbar clicks until restart. The service persists only the latest content-free launch diagnostic. `SupportDiagnosticsComponent.js` combines that record with bounded runtime events, background startup health, dependency presence, and a secret-free direct local-storage audit. If the background fails, Settings displays locally persisted values read-only and disables Save/Reset rather than presenting writable defaults. The single-message footer reuses the launch boundary. `DashboardLaunchPromptComponent.js` maintains the local three-use/five-open guidance counters and presents optional prompts without interrupting an already open dashboard dialog.
- `SingleMailWorkspaceService.js` is the shared tab boundary for the message toolbar, the single-mail fullscreen control, dashboard actions, context-menu actions, reply preparation, and dashboard AI Chat. It focuses an existing message-and-mode workspace before creating a new tab and bounds Thunderbird tab calls independently from AI processing.
- `PdfArchiverIntegrationService.js` owns the optional protocol-v1 message hand-off to the fixed PDF Archiver for Thunderbird extension ID. `PdfArchiverIntegrationComponent.js` translates unavailable, incompatible, and failed states and provides the official GitHub installation path; PDF content and native-host access remain exclusively inside the companion add-on.
- `DashboardSenderFilterComponent.js`, `DashboardMessageComponent.js`, and `DashboardFeedbackComponent.js` render their focused UI areas without injecting mailbox HTML. `DashboardMessageComponent.js` owns one shared three-group action description for the visible columns and right-click surface plus the accessible per-message preview controls; `DashboardMessageContextMenuComponent.js` renders actions as direct titled groups or keyboard-accessible submenus. `DashboardPreviewController.js` keeps preview visibility and four-line viewport growth session-local to the targeted message. `DashboardBulkActionsComponent.js` renders the same synchronized bulk controls into the hosts above and below the message list, keeping markup and behavior in one implementation.
- `ScrollToTopComponent.js` owns the shared floating scroll shortcut for dashboard and single-message pages. Each entry point supplies its actual scroll surfaces so popup-internal lists and durable Thunderbird tabs use the same behavior.
- `ScoreFeedbackEditor.js` and `score-feedback-editor.css` provide the shared importance, spam, and risk correction fields, score-specific reason categories, and separate free-text explanations used by the dashboard, single-message scoring, and Settings archive.
- `DashboardAIService.js` delegates summaries, replies, and AI Chat to the shared single-message workspace, plans protected first-time versus explicit re-score operations for both single messages and selections, and persists bounded importance/spam/risk score metadata keyed by RFC Message-ID instead of Thunderbird's restart-volatile numeric ID. Legacy two-score metadata remains attached with a null risk score until explicit rescoring or correction.
- `dashboard-training.js` owns the separate bounded archive of explicit operator corrections. It stores a clipped message snapshot, separate importance/spam/risk reasons, and selects at most five relevant examples; Thunderbird deletion never accesses its storage key. Legacy records remain loadable with an empty risk field.
- `spam-precheck.js` owns the local sender-history calibration used before single and bulk scoring. It scans exact sender addresses across Thunderbird in bounded pages, caches aggregate counts briefly, combines them with safe newsletter signal names, and never retains other messages or raw MIME-header values.
- Bulk and single-email score bodies cross to `background.js`, which retrieves normalized messages through `MessageService`, selects relevant corrections through `DashboardTrainingService`, and calls the provider-independent task client. `ai-provider.js` formats and parses OpenAI Responses, Anthropic Messages, and OpenAI-compatible Chat Completions without changing the shared scoring contract. Each provider supplies fast, balanced, and quality defaults, and every task honors its independent saved model preference.
- `ScoringArchiveComponent.js` exposes the local reference archive in Settings for manual rescoring, reason editing, and removal without touching Thunderbird messages.
- `ArchiveSettingsGuideComponent.js` performs a read-only scan of Thunderbird archive-folder markers and capabilities, then presents the protected native configuration path and official help without guessing folders by localized names.
- `retry.js` owns bounded backoff and promise-timeout mechanics. Domain services still decide whether an error is safe to retry: the AI task client classifies transient HTTP/network failures, while UI runtime messages retry only when Thunderbird confirms that no background listener received the request. Read-only Settings requests are time-limited so a stalled background switches to the protected local read-only view; mutating requests are never repeated after an ambiguous timeout. Background localization, action-router cleanup, and context-menu setup are isolated startup steps whose exact failure stage is retained in support diagnostics. Score-feedback writes are idempotent upserts under the stable message identity.

## 🏗️ Architecture Overview

### **Modular Design Principles**

1. **Separation of Concerns**: Each module has a single responsibility
2. **Reusability**: Common functionality is extracted into utility modules
3. **Maintainability**: Clear structure makes code easy to understand and modify
4. **Testability**: Modular code is easier to test in isolation
5. **Thunderbird Compatibility**: No ES6 modules, uses global variables

### **Core Modules**

#### **Configuration (`config/`)**
- **`constants.js`**: Centralized configuration, constants, and message definitions
- Contains all configuration values, action types, error messages, and prompts
- Available globally as `CONFIG`

#### **Utilities (`utils/`)**
- **`storage.js`**: Browser storage operations, strict persistence-critical reads, provider-profile migration, serialized provider/model token accounting, and dated OpenAI cost estimation (global `StorageManager`)
- **`retry.js`**: Shared bounded retry and Thunderbird runtime-delivery backoff (global `RetryService`)
- **`ai-provider.js`**: Provider configuration, endpoint validation, request formatting, response parsing, and normalized usage (global `AIProviderService`)
- **`openai.js`**: Provider-independent prompts, AI workflows, retries, and error classification; the historical global name remains `OpenAIService` for compatibility
- **`message.js`**: Email message operations and data extraction (global `MessageService`)
- **`spam-precheck.js`**: Bounded sender-frequency and newsletter-signal aggregation for scoring (global `SpamPrecheckService`)
- **`ui.js`**: Common UI utilities and helper functions (global `UIUtils`)

#### **Components (`components/`)**
- **`MessageDisplayComponent.js`**: Main popup interface component (global `MessageDisplay`)
- **`SettingsComponent.js`**: Settings page component (global `SettingsComponent`)
- Each component is self-contained with its own initialization and event handling

#### **Entry Points (`js/`)**
- **`message-display.js`**: Entry point for main popup
- **`settingsEntry.js`**: Entry point for settings page
- Minimal files that instantiate components using global variables

## 🔧 Module Responsibilities

### **Background Script (`background.js`)**
- **Purpose**: Main addon logic and message handling
- **Responsibilities**:
  - Event listener setup
  - Message routing
  - Menu management
  - Notification handling
- **Dependencies**: Uses global utilities (`CONFIG`, `StorageManager`, `OpenAIService`, `MessageService`)

### **MessageDisplay Component**
- **Purpose**: Main popup interface
- **Responsibilities**:
  - UI initialization
  - Event handling
  - Message loading and display
  - Action processing
  - Results presentation
- **Dependencies**: Uses global utilities (`CONFIG`, `UIUtils`, `MessageService`)

### **Settings Component**
- **Purpose**: Settings page interface
- **Responsibilities**:
  - Settings form management
  - API key validation
  - Statistics display
  - Settings persistence
- **Dependencies**: Uses global utilities (`CONFIG`, `UIUtils`)

### **Storage Manager**
- **Purpose**: Browser storage operations
- **Responsibilities**:
  - Settings storage/retrieval
  - Statistics tracking
  - Per-model input, cached-input, and output token accounting
  - Dated USD cost estimation for the settings statistics
  - Data persistence
  - Error handling
- **Dependencies**: Uses global `CONFIG`

### **AI Provider and Task Services**
- **Purpose**: AI integration
- **Responsibilities**:
  - Provider selection and API communication
  - Compatible OpenAI Responses, OpenAI Chat Completions, and Anthropic Messages adapters
  - Prompt management
  - Error handling
  - Fallback mechanisms
- **Dependencies**: Uses global `CONFIG` and `StorageManager`

### **Message Service**
- **Purpose**: Email operations
- **Responsibilities**:
  - Message retrieval
  - Metadata extraction
  - Attachment handling
  - Message updates
- **Dependencies**: None (standalone utility)

### **UI Utilities**
- **Purpose**: Common UI operations
- **Responsibilities**:
  - Toast notifications
  - Loading states
  - Error dialogs
  - Text formatting
  - Keyboard shortcuts
- **Dependencies**: Uses global `CONFIG`

## 🔄 Data Flow

```
User Action → Component → Background Script → Service → API/Storage → Response → UI Update
```

### **Example: Email Summarization**
1. User clicks "Zusammenfassen" button
2. `MessageDisplay` component handles click
3. Sends message to background script
4. Background script calls `MessageService` to get email data
5. Background script calls the provider-independent `OpenAIService` task client to generate the summary
6. Background script updates statistics via `StorageManager`
7. Response returned to component
8. Component updates UI with results

## 🎯 Benefits of This Structure

### **Thunderbird Compatibility**
- No ES6 module syntax anywhere
- Global variables work in Thunderbird's environment
- Script tag loading instead of imports
- Compatible with build script flattening

### **Maintainability**
- Clear separation of concerns
- Easy to locate specific functionality
- Modular updates without affecting other parts

### **Reusability**
- Common utilities can be used across components
- Services can be reused for different features
- Configuration is centralized

### **Testability**
- Each module can be tested independently
- Clear interfaces between modules
- Mock services for testing

### **Scalability**
- Easy to add new components
- Simple to extend existing functionality
- Clear patterns for new features

### **Debugging**
- Clear error boundaries
- Isolated functionality
- Easy to trace issues

## 📝 Development Guidelines

### **Adding New Features**
1. Create new component in `components/`
2. Add utility functions to appropriate `utils/` module
3. Update constants in `config/constants.js`
4. Create entry point in `js/`
5. Add styles in `css/`

### **Modifying Existing Features**
1. Identify the responsible module
2. Make changes within that module
3. Update related constants if needed
4. Test the specific functionality

### **Error Handling**
- Each module handles its own errors
- Errors are logged with context
- User-friendly error messages
- Graceful fallbacks where possible

### **Code Style**
- Consistent naming conventions
- Clear documentation
- Global variable patterns
- Separation of concerns

## 📦 Global Variable Structure

### **No ES6 Module System**
Due to Thunderbird's non-module environment, all utilities use global variables:

```javascript
// ✅ Correct - Global variables
const CONFIG = { /* ... */ };
const StorageManager = {
    async getSettings() { /* ... */ },
    async saveSettings(settings) { /* ... */ }
};
const MessageDisplay = class {
    constructor() {
        // Use global utilities
        StorageManager.getSettings();
        CONFIG.ACTIONS.SUMMARIZE;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.StorageManager = StorageManager;
    window.MessageDisplay = MessageDisplay;
}

// ❌ Incorrect - ES6 modules
import { CONFIG } from 'constants.js';
export class MessageDisplay { /* ... */ }
```

### **Script Loading Guidelines**
HTML files must load scripts in correct dependency order:

```html
<!-- Load utility modules first -->
<script src="constants.js"></script>
<script src="retry.js"></script>
<script src="storage.js"></script>
<script src="openai.js"></script>
<script src="message.js"></script>
<script src="ui.js"></script>

<!-- Load components -->
<script src="MessageDisplayComponent.js"></script>

<!-- Load entry point last -->
<script src="message-display.js"></script>
```

### **File Naming Convention**
To avoid conflicts in the flattened structure:
- **Components**: `ComponentNameComponent.js` (e.g., `MessageDisplayComponent.js`)
- **Entry Points**: `entryName.js` (e.g., `settingsEntry.js`)
- **Utilities**: `utilityName.js` (e.g., `storage.js`, `openai.js`)
- **Configuration**: `configName.js` (e.g., `constants.js`)

## 🚀 Future Enhancements

### **Planned Modules**
- **`components/Chat.js`**: AI chat interface
- **`utils/analytics.js`**: Usage analytics
- **`utils/security.js`**: Security utilities
- **`styles/themes.js`**: Theme management

### **Potential Improvements**
- TypeScript integration
- Unit testing framework
- Automated build process
- Performance monitoring
- Accessibility improvements

This modular structure makes the codebase much more maintainable, testable, and scalable while preserving all existing functionality and being fully compatible with Thunderbird's non-module environment.
