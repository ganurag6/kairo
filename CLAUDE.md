# Kairo App - Complete Technical Documentation

## App Summary
Kairo is an advanced Electron-based AI assistant that provides global text capture and screenshot analysis. Users can select text anywhere on screen, press Cmd+Option+K/Ctrl+Alt+K, or capture screenshots with Cmd+Option+S/Ctrl+Alt+S, and get AI-powered analysis, suggestions, and improvements through OpenAI's GPT-4o-mini.

## 🏗️ Core Architecture

### Multi-Window System
- **Main Overlay Window** (`index.html`): Primary chat interface with AI conversation
- **Action Picker Window** (`action-picker.html`): Quick action buttons for captured content
- **Response Window** (`response-window.html`): *Legacy - unused after workflow unification*
- **System Integration**: Tray icon, global shortcuts, clipboard management

### Global State Variables
```javascript
let tray = null;                    // System tray instance
let overlayWindow = null;           // Main chat window
let actionPickerWindow = null;      // Action selection window
let responseWindow = null;          // Legacy response window
let currentSelectedText = '';       // Currently captured text
let currentScreenshot = null;       // Currently captured screenshot (base64)
let storedMousePosition = null;     // Mouse position when shortcut pressed
let screenshotCancelled = false;    // Screenshot cancellation flag
```

## ⌨️ Global Shortcuts (Updated)

### Current Shortcuts
- **Text Selection**: `Cmd+Option+P` (macOS) / `Ctrl+Alt+P` (Windows/Linux)
- **Screenshot Capture**: `Cmd+Option+S` (macOS) / `Ctrl+Alt+S` (Windows/Linux)

### Shortcut Registration Logic
```javascript
// main.js:503-530
const ret = globalShortcut.register('CommandOrControl+Option+P', () => {
  const { screen } = require('electron');
  storedMousePosition = screen.getCursorScreenPoint(); // Store position immediately
  showActionPicker();
});
```

## 🔄 Complete Application Workflows

### 1. Text Selection Workflow
```
User selects text → Presses Cmd+Option+P → stores mouse position → copies text to clipboard 
→ shows action picker at stored position → user selects action → opens main chat window 
→ sends text + action to renderer → processes with OpenAI API → displays response
```

**Detailed Flow:**
1. `main.js:503` - Global shortcut triggered
2. `main.js:216` - Store mouse cursor position
3. `main.js:182` - Execute clipboard copy (platform-specific)
4. `main.js:186` - Process and preserve text formatting
5. `main.js:208` - Show action picker at stored mouse position
6. `action-picker.js:57` - User selects action
7. `main.js:575-600` - IPC handler processes selection
8. `renderer.js:283-302` - Handle suggestion from action picker
9. `renderer.js:467-546` - Process message with OpenAI API

### 2. Screenshot Workflow (Updated)
```
User presses Cmd+Option+S → stores mouse position → native screenshot tool → image to clipboard 
→ process base64 image → show action picker → user selects action → main chat window 
→ sends screenshot + action → Vision API analysis → displays response
```

**Detailed Flow:**
1. `main.js:519` - Screenshot shortcut triggered
2. `main.js:519` - Store mouse cursor position
3. `main.js:353` - Execute native screenshot (`screencapture -i -c` on macOS)
4. `main.js:416-424` - Process clipboard image, convert to base64
5. `main.js:424` - Show action picker at stored position
6. `action-picker.js:57` - User selects screenshot-specific action
7. `main.js:588-595` - Send screenshot + action to renderer
8. `renderer.js:232-253` - Handle screenshot with action
9. `renderer.js:578-599` - Build Vision API message with image

## 🧠 Smart Text Detection System

### Text Type Classification (`textDetector.js`)
The app analyzes text and detects 7 different types with confidence scores:

```javascript
const textTypes = {
  email: ['dear', 'regards', '@', 'subject:', 'sincerely'],
  code: ['function', 'const', 'import', '{}', '()', 'class'],
  academic: ['therefore', 'hypothesis', 'research', 'study'],
  social: ['#', '@', '😀', 'lol', 'check out'],
  business: ['pursuant', 'agreement', 'stakeholder', 'revenue'],
  creative: ['chapter', 'character', 'dialogue', 'story'],
  data: ['•', '1.', 'total', 'percentage', 'analysis']
};
```

### Context-Aware Action Prompts
Each content type gets specific prompts in `action-picker.js`:

**Text Actions:**
```javascript
const textActions = {
  'fix-grammar': 'Fix all grammar and spelling mistakes in this text.',
  'summarize': 'Create a clear, concise summary of this text.',
  'explain': 'Explain this text in simple terms that anyone can understand.'
  // ... more actions
};
```

**Screenshot Actions:**
```javascript
const screenshotActions = {
  'fix-grammar': 'Analyze the screenshot and fix any grammar or spelling mistakes in the visible text.',
  'summarize': 'Analyze the screenshot and create a clear summary of what is shown.',
  'explain': 'Analyze the screenshot and explain what is shown in simple terms.'
  // ... more actions
};
```

## 🔌 IPC Communication Architecture

### Main Process → Renderer
- `captured-text` - Send selected text to chat window
- `captured-screenshot` - Send screenshot data with action
- `suggestion-clicked` - Action picker selection result

### Renderer → Main Process
- `action-selected` - Action picker button clicked
- `close-action-picker` - Close action picker window
- `get-api-key` - Retrieve OpenAI API key

### Action Picker → Main Process
- `action-selected` - Forward action selection
- `close-action-picker` - Close picker window

### Content Type Detection
- `content-type` - Tell action picker if content is text or screenshot

## 🖼️ Window Management & Positioning

### Action Picker Positioning Logic
```javascript
// main.js:213-262
function showActionPickerAtMousePosition() {
  const mousePos = storedMousePosition || screen.getCursorScreenPoint();
  
  // Calculate centered position
  let x = mousePos.x - Math.floor(windowWidth / 2);
  let y = mousePos.y - Math.floor(windowHeight / 2);
  
  // Bounds checking for multiple displays
  const displayBounds = activeDisplay.bounds;
  if (x < displayBounds.x) x = displayBounds.x;
  if (x + windowWidth > displayBounds.x + displayBounds.width) {
    x = displayBounds.x + displayBounds.width - windowWidth;
  }
  // Similar for Y bounds...
}
```

### Window Specifications
- **Action Picker**: 540x120px, transparent, always on top, no frame
- **Main Overlay**: 800x700px, resizable, always on top, with frame
- **Multi-display Support**: Automatic display detection and bounds checking

## 🤖 AI Integration

### OpenAI API Configuration
```javascript
model: 'gpt-4o-mini',           // Vision-capable model
temperature: 0.7,               // Chat responses
max_tokens: 1000,              // Response length limit
```

### API Call Points
1. **Quick Actions** (`main.js:505`) - Direct prompt processing
2. **Smart Suggestions** (`textDetector.js:184`) - Context analysis  
3. **Chat Interface** (`renderer.js:482-546`) - Conversation management
4. **Vision Analysis** (`renderer.js:578-599`) - Screenshot analysis

### Vision API Message Format
```javascript
{
  role: 'user',
  content: [
    { type: 'text', text: userPrompt },
    { 
      type: 'image_url', 
      image_url: { url: `data:image/png;base64,${screenshot}` }
    }
  ]
}
```

## 📁 File Structure & Responsibilities

### Core Files
```
├── main.js                 # Electron main process, window management, shortcuts
├── renderer.js             # Chat UI, AI integration, conversation management
├── action-picker.js        # Action selection logic with content-aware prompts
├── textDetector.js         # Smart text analysis and suggestion generation
├── preload.js              # Main window IPC bridge
├── preload-action-picker.js # Action picker IPC bridge
├── index.html              # Main chat interface
├── action-picker.html      # Action selection interface
├── styles.css              # Main interface styling
└── action-picker.css       # Action picker styling
```

### Preload Scripts
- **preload.js**: Main window IPC (captured-text, suggestion-clicked)
- **preload-action-picker.js**: Action picker IPC (action-selected, content-type)
- **preload-response.js**: Legacy response window
- **preload-screenshot.js**: Screenshot-specific handlers

## 🛠️ Platform-Specific Implementations

### macOS
- Native screenshot: `screencapture -i -c`
- Text copy: `osascript -e 'tell application "System Events" to keystroke "c" using command down'`
- Dock integration and app icon management
- Full feature support

### Windows
- Basic tray support with context menu
- Ctrl+C simulation for text copy
- Screenshot: "Coming soon" message
- Limited but functional

### Linux
- Basic tray support
- Standard clipboard operations
- AppImage distribution
- Basic functionality

## ⚡ Performance Optimizations

### Async Operations
- Non-blocking AI suggestion generation
- Immediate default suggestions while AI processes
- Parallel window creation and shortcut registration

### Memory Management
- Conversation history cleanup
- Window hiding instead of destruction
- Efficient DOM manipulation
- Screenshot data cleanup after use

### Caching Strategy
- Base64 API key decoding cache
- Window position calculations
- Display bounds caching

## 🔒 Security Measures

### API Key Protection
```javascript
function decryptApiKey() {
  const encodedKey = 'c2stcHJvai11Q3...'; // Base64 encoded
  return Buffer.from(encodedKey, 'base64').toString('utf-8');
}
```

### Context Bridge Security
- Isolated renderer processes
- Controlled IPC exposure via contextBridge
- No direct Node.js access in renderers

### Content Security
- No sensitive data logging
- Secure screenshot handling
- Memory cleanup of sensitive data

## 🏗️ Build & Deployment

### Build Scripts
```json
{
  "build": "electron-builder",
  "dist": "electron-builder --publish=never",
  "dist-mac": "electron-builder --mac",
  "dist-win": "electron-builder --win",
  "dist-linux": "electron-builder --linux"
}
```

### Distribution Configuration
- **macOS**: DMG package with productivity category
- **Windows**: NSIS installer with user directory choice
- **Linux**: AppImage for universal compatibility

### Build Requirements
- Icon files in `/build` directory
- Code signing for macOS distribution
- Accessibility permissions for global shortcuts

## 🐛 Known Issues & Solutions

### Global Shortcuts Not Working
**Symptoms**: Shortcuts don't trigger on packaged app
**Causes**: 
- Missing accessibility permissions (macOS)
- Conflicting shortcuts with other apps
- Code signing issues

**Solutions**:
1. Grant accessibility permissions in System Settings
2. Check for shortcut conflicts
3. Run from terminal to see error messages
4. Rebuild app with `npm run dist-mac`

### Action Picker Positioning Issues
**Symptoms**: Action picker appears in wrong location
**Causes**:
- Multiple display configurations
- Mouse position not stored correctly
- Display bounds calculation errors

**Solutions**:
- Mouse position now stored when shortcut pressed
- Bounds checking for all displays
- Fallback to current cursor position

### Screenshot Feature Problems
**Symptoms**: Screenshots not captured or processed
**Causes**:
- Platform-specific screenshot tools
- Clipboard access permissions
- Image processing failures

**Solutions**:
- Platform detection with appropriate tools
- Error handling for cancelled screenshots
- Base64 conversion validation

### Vision API Failures
**Symptoms**: Screenshot analysis fails or gives wrong results
**Causes**:
- API rate limits
- Invalid image format
- Network connectivity issues

**Solutions**:
- Proper error handling and user feedback
- Image format validation
- Fallback to text-based analysis

## 📊 Recent Major Changes

### Shortcut Updates (October 2024)
- **Old**: `Cmd+K` → `Cmd+Option+K` (still conflicted with browser inspector)
- **New**: `Cmd+Option+P` for text, `Cmd+Option+S` for screenshots
- **Reason**: Avoid ALL conflicts including browser inspector (Cmd+Option+K)

### Screenshot Workflow Unification
- **Old**: Direct Vision API analysis
- **New**: Action picker → choice → analysis
- **Benefit**: Consistent UX across text and screenshots

### Mouse Position Storage
- **Problem**: Action picker appeared at terminal/focused window
- **Solution**: Store cursor position when shortcut pressed
- **Result**: Action picker appears at selection location

### Vision API Integration
- **Added**: Screenshot support in renderer conversation
- **Format**: Multi-part messages with text + image
- **Model**: GPT-4o-mini for vision capabilities

## 🔍 Debugging & Development

### Console Logging
Extensive console logging throughout for debugging:
- Shortcut registration status
- Mouse position tracking
- IPC message flow
- API call details
- Error conditions

### Development Mode
```bash
npm start           # Development with full logging
npm run dev         # Alternative development command
```

### Common Debug Commands
```bash
# Check running processes
ps aux | grep Kairo

# Clear app data
rm -rf ~/Library/Application\ Support/Kairo

# Check permissions
sudo spctl --assess --verbose /Applications/Kairo.app
```

## 📈 Future Improvements

### Planned Features
- Windows/Linux screenshot support
- Custom shortcut configuration
- Multiple AI model support
- Plugin system for actions
- Cloud sync for conversations

### Technical Debt
- Remove legacy response window code
- Consolidate preload scripts
- Improve error handling consistency
- Add comprehensive test suite

---

*Last Updated: October 8, 2024*  
*Version: 1.1.0*  
*Architecture: Electron + OpenAI GPT-4o-mini Vision*  
*Supported Platforms: macOS (full), Windows (partial), Linux (basic)*

## 🎯 Quick Reference

### For Developers
- Main entry: `main.js`
- UI logic: `renderer.js`
- Actions: `action-picker.js`
- Text analysis: `textDetector.js`

### For Users
- Text: `Cmd+Option+P` / `Ctrl+Alt+P`
- Screenshot: `Cmd+Option+S` / `Ctrl+Alt+S`
- Permissions: System Settings → Accessibility

### For Troubleshooting
- Check console logs
- Verify permissions
- Rebuild app after code changes
- Clear app data cache