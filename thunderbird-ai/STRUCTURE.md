# Thunderbird AI Assistant - Code Structure

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
│   ├── openai.js            # OpenAI API service
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

- `GlobalDashboardManager.js` coordinates refreshes, selection, and mailbox actions.
- `GlobalMailService.js` owns Thunderbird header pagination, previews, and deletion.
- `GlobalMailViewService.js` applies sender/date/AI filters, per-account limits, the combined newest-50 candidate scope, and explicit cross-account score sorting before previews are loaded.
- `DashboardViewPreferences.js` owns persisted view controls, including the account-separated/combined layout switch.
- `DashboardSenderFilterComponent.js`, `DashboardMessageComponent.js`, and `DashboardFeedbackComponent.js` render their focused UI areas without injecting mailbox HTML.
- `DashboardAIService.js` opens the existing single-message workspaces, plans protected first-time versus explicit re-score bulk operations, and persists bounded importance/spam score metadata keyed by RFC Message-ID instead of Thunderbird's restart-volatile numeric ID.
- `dashboard-training.js` owns the separate bounded archive of explicit operator corrections. It stores a clipped message snapshot, separate importance/spam reasons, and selects at most five relevant examples; Thunderbird deletion never accesses its storage key.
- Bulk and single-email score bodies cross to `background.js`, which retrieves normalized messages through `MessageService`, selects relevant corrections through `DashboardTrainingService`, and calls the shared OpenAI score formatting and parser. Bulk defaults to Luna, single scoring defaults to Terra, and both honor their independent saved model preference.
- `ScoringArchiveComponent.js` exposes the local reference archive in Settings for manual rescoring, reason editing, and removal without touching Thunderbird messages.

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
- **`storage.js`**: Browser storage operations and settings management (global `StorageManager`)
- **`openai.js`**: OpenAI API integration and AI services (global `OpenAIService`)
- **`message.js`**: Email message operations and data extraction (global `MessageService`)
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
  - Data persistence
  - Error handling
- **Dependencies**: Uses global `CONFIG`

### **OpenAI Service**
- **Purpose**: AI integration
- **Responsibilities**:
  - API communication
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
5. Background script calls `OpenAIService` to generate summary
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
