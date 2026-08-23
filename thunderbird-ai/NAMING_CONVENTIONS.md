# AI Mail Assistant for Thunderbird - Naming Conventions & File Differences

> [Deutsche Version](NAMING_CONVENTIONS.de.md)

## 📁 File Differences

### **Background Scripts**

#### **`common/background.js`** (Non-Module)
- **Purpose**: Background script with embedded utilities for Thunderbird compatibility
- **Structure**: Single class with embedded utility functions (no ES6 imports)
- **Dependencies**: Embedded constants and utility functions
- **Use Case**: Thunderbird-compatible non-module approach

#### **`thunderbird-ai/background.js`** (Modular)
- **Purpose**: Modular background script that uses global utility functions
- **Structure**: Clean class that delegates to global services
- **Dependencies**: Uses global `CONFIG`, `StorageManager`, `OpenAIService`, `MessageService`
- **Use Case**: Maintainable, testable, scalable architecture with global variables

### **Settings Files**

#### **`thunderbird-ai/components/SettingsComponent.js`** (Component)
- **Purpose**: Settings page component with all UI logic
- **Structure**: Class with methods for settings management
- **Dependencies**: Uses global `CONFIG`, `UIUtils`
- **Use Case**: Reusable settings component

#### **`thunderbird-ai/js/settingsEntry.js`** (Entry Point)
- **Purpose**: Entry point that initializes the settings component
- **Structure**: Minimal file that instantiates component
- **Dependencies**: Uses global `SettingsComponent`
- **Use Case**: Clean separation between entry and component logic

## 🏷️ Naming Conventions

### **Component Files**
- **Pattern**: `ComponentNameComponent.js`
- **Examples**: 
  - `MessageDisplayComponent.js`
  - `SettingsComponent.js`
  - `ChatComponent.js` (future)

### **Entry Point Files**
- **Pattern**: `entryName.js`
- **Examples**:
  - `settingsEntry.js`
  - `messageDisplayEntry.js` (future)
  - `chatEntry.js` (future)

### **Utility Files**
- **Pattern**: `utilityName.js`
- **Examples**:
  - `storage.js`
  - `openai.js`
  - `message.js`
  - `ui.js`

### **Configuration Files**
- **Pattern**: `configName.js`
- **Examples**:
  - `constants.js`
  - `themes.js` (future)
  - `permissions.js` (future)

## 🔄 Global Variable Structure

### **No ES6 Imports/Exports**
Due to Thunderbird's non-module environment:

```javascript
// ✅ Correct - Global variables
const CONFIG = { /* ... */ };
const StorageManager = { /* ... */ };
const MessageDisplay = class { /* ... */ };

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

### **Script Loading Order**
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

### **Unique File Names**
Every file must have a unique name across the entire project to avoid conflicts when flattened:

- ✅ `SettingsComponent.js` (component)
- ✅ `settingsEntry.js` (entry point)
- ✅ `storage.js` (utility)
- ✅ `constants.js` (config)

## 📋 File Purpose Summary

| File | Type | Purpose | Dependencies |
|------|------|---------|--------------|
| `background.js` | Background Script | Main addon logic | Global utilities |
| `MessageDisplayComponent.js` | Component | Popup UI logic | Global utilities |
| `SettingsComponent.js` | Component | Settings UI logic | Global utilities |
| `message-display.js` | Entry Point | Popup initialization | Global MessageDisplay |
| `settingsEntry.js` | Entry Point | Settings initialization | Global SettingsComponent |
| `constants.js` | Configuration | Centralized config | None |
| `storage.js` | Utility | Storage operations | Global CONFIG |
| `openai.js` | Utility | AI API operations | Global CONFIG, StorageManager |
| `message.js` | Utility | Email operations | None |
| `ui.js` | Utility | UI helper functions | Global CONFIG |

## 🚀 Benefits of This Structure

### **Thunderbird Compatibility**
- No ES6 module syntax anywhere
- Global variables work in Thunderbird's environment
- Script tag loading instead of imports
- Compatible with build script flattening

### **Avoiding Conflicts**
- Each file has a unique, descriptive name
- Clear separation between components and entry points
- No naming collisions in flattened structure

### **Maintainability**
- Easy to identify file purposes
- Clear global variable relationships
- Modular architecture preserved

### **Scalability**
- Easy to add new components
- Consistent naming patterns
- Clear file organization

## 🔧 Global Variable Guidelines

### **Creating Global Variables**
```javascript
// Define the utility/component
const MyUtility = {
    method1() { /* ... */ },
    method2() { /* ... */ }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.MyUtility = MyUtility;
}
```

### **Using Global Variables**
```javascript
// In another file
const MyComponent = class {
    constructor() {
        // Use global utilities
        MyUtility.method1();
        CONFIG.SOME_VALUE;
    }
};
```

### **Dependency Management**
- Load dependencies first in HTML
- Use global variables instead of imports
- Maintain clear dependency order
- Test global variable availability

This naming convention ensures that when the build script flattens the directory structure, there are no naming conflicts and the modular architecture remains functional while being fully compatible with Thunderbird's non-module environment.
