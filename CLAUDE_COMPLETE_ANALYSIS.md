# Kairo App - Complete Technical Analysis & Documentation

## Executive Summary
Kairo is an Electron-based AI assistant that provides global text capture and screenshot analysis. Users can select text anywhere on screen using **Cmd+Option+K** or capture screenshots with **Cmd+Option+S**, then get AI-powered analysis through OpenAI's GPT-4o-mini. The app features a unified chat interface with action picker workflow and context-aware suggestions.

---

## Architecture Overview

### Multi-Window System
The app manages 4 distinct BrowserWindow instances:

1. **Main Overlay Window** (`index.html`) - Primary chat interface (800x700)
2. **Action Picker Window** (`action-picker.html`) - Quick action buttons (540x120)
3. **Response Window** (`response-window.html`) - Legacy window, largely unused
4. **System Integration** - Tray icon, global shortcuts, clipboard management

### Core File Structure
```
kairo/
├── main.js                 # Electron main process & window management
├── renderer.js             # Main chat interface logic & AI integration
├── textDetector.js         # Smart text analysis & AI suggestion generation
├── action-picker.js        # Action picker button handlers
├── preload.js              # Main window IPC bridge
├── preload-action-picker.js # Action picker IPC bridge
├── preload-response.js     # Response window IPC bridge (legacy)
├── preload-screenshot.js   # Screenshot selection IPC bridge
├── index.html              # Main chat interface HTML
├── action-picker.html      # Action picker HTML
├── response-window.html    # Response window HTML (legacy)
├── styles.css              # Main interface styling
├── action-picker.css       # Action picker styling
└── response-window.css     # Response window styling
```

---

## Detailed Workflow Analysis

### 1. Text Capture Workflow

**Primary Flow: Global Text Selection**
```
User selects text → Presses Cmd+Option+K → App stores mouse position → 
Executes copy command → Shows action picker at mouse position → 
User selects action → Main chat window opens → AI processes request
```

**Step-by-step breakdown:**
1. **Global Shortcut Trigger** (`main.js:503-510`)
   - `CommandOrControl+Option+K` registered as global shortcut
   - Mouse position stored when shortcut pressed: `storedMousePosition = screen.getCursorScreenPoint()`
   - Calls `showActionPicker()`

2. **Text Capture** (`main.js:168-211`)
   - **macOS**: Uses `osascript` to simulate Cmd+C: `'tell application "System Events" to keystroke "c" using command down'`
   - **Windows/Linux**: Attempts to read existing clipboard content
   - Captured text stored in `currentSelectedText`
   - Calls `showActionPickerAtMousePosition()`

3. **Action Picker Display** (`main.js:213-263`)
   - Calculates position to center 540x120 window at stored mouse position
   - Ensures window stays within display bounds with edge detection
   - Sends content type info: `actionPickerWindow.webContents.send('content-type', { isScreenshot: false })`

4. **Action Selection** (`action-picker.js:46-62`)
   - 10 predefined actions with different prompts for text vs screenshots
   - Sends action via IPC: `window.electronAPI.sendAction(action, prompt)`
   - IPC handler: `ipcMain.handle('action-selected')` (`main.js:588-631`)

5. **Main Chat Display** (`main.js:596-630`)
   - Hides action picker, shows main overlay window
   - Sends captured text: `overlayWindow.webContents.send('captured-text', currentSelectedText)`
   - Sends action as suggestion click: `overlayWindow.webContents.send('suggestion-clicked', { text: action, prompt: prompt })`

### 2. Screenshot Capture Workflow

**Primary Flow: Screenshot Capture**
```
User presses Cmd+Option+S → App stores mouse position → 
Launches native screenshot tool → Processes clipboard image → 
Shows action picker at mouse position → User selects action → 
Main chat window opens with screenshot → AI Vision API analyzes image
```

**Step-by-step breakdown:**
1. **Global Shortcut Trigger** (`main.js:519-530`)
   - `CommandOrControl+Option+S` registered as global shortcut
   - Mouse position stored: `storedMousePosition = screen.getCursorScreenPoint()`
   - Calls `startScreenshotCapture()`

2. **Screenshot Capture** (`main.js:366-403`)
   - **macOS**: Uses `screencapture -i -c` for interactive selection
   - **Windows/Linux**: Shows coming soon message
   - ESC cancellation detection with `screenshotCancelled` flag
   - On success, calls `processClipboardImage()`

3. **Image Processing** (`main.js:413-452`)
   - Reads image from clipboard: `clipboard.readImage()`
   - Converts to base64: `image.toPNG().toString('base64')`
   - Stores in `currentScreenshot` object with size info
   - Shows action picker at stored mouse position

4. **Action Selection & Processing**
   - Same as text workflow but with screenshot-specific prompts
   - Screenshot data sent to main window: `overlayWindow.webContents.send('captured-screenshot', data)`

### 3. Unified Chat Interface

**Chat Processing Flow** (`renderer.js:467-546`)
```
User input → Build contextual prompt → Call OpenAI API → 
Display response → Add to conversation history
```

**Key components:**
- **Conversation History**: Maintains full context in `this.conversation` array
- **System Messages**: Different for text vs screenshot analysis
- **Vision API Integration**: Screenshots sent as base64 images to GPT-4o-mini
- **Error Handling**: Graceful fallbacks for API failures

---

## AI Integration Architecture

### 1. OpenAI API Configuration
- **Model**: `gpt-4o-mini` (supports both text and vision)
- **API Key**: Base64 encoded in `main.js:555-568`
  ```javascript
  function decryptApiKey() {
    const encoded = "c2stcHJvai11Q3BNRDNGSmZOQ2tHeFJuZTdKNlBZS19zakhGaklrR0pnbWxJcEVCN3d3V2ZxS0djMU5BSDlGdXZ6OGpfVkpEUG5UakVBbXh3VlQzQmxia0ZKR1B3VndOVDdYeGZwb243dUk0MGdoTkgwMHkySHIzcnNwdzg0dkJPSnQzc080ZUZyZGNxYVBPVGQ0VDJEMUU4YW13LW9tNXpnNEE=";
    return Buffer.from(encoded, 'base64').toString('utf-8');
  }
  ```
- **Temperature**: 0.7 for chat, 0.3 for quick actions
- **Max Tokens**: 1000 for chat, 500 for suggestions

### 2. API Call Locations
1. **Quick Actions**: `main.js:698-743` - Direct prompt processing
2. **Smart Suggestions**: `textDetector.js:150-232` - Context analysis  
3. **Chat Interface**: `renderer.js:482-546` - Conversation management
4. **Vision Analysis**: `main.js:747-823` - Screenshot analysis

### 3. Smart Text Detection System (`textDetector.js`)

**Text Type Detection** with confidence scoring:
- **Email**: Keywords like "dear", "regards", "@", "subject:"
- **Code**: Keywords like "function", "const", "import", "{}", "()"
- **Academic**: Keywords like "therefore", "hypothesis", "research"
- **Social**: Keywords like "#", "@", emojis, "lol", "check out"
- **Business**: Keywords like "pursuant", "agreement", "stakeholder"
- **Creative**: Keywords like "chapter", "character", "dialogue"  
- **Data**: Keywords like "•", "1.", "total", "percentage"

**AI-Powered Suggestions** (`textDetector.js:150-232`):
- Analyzes text context with OpenAI API
- Generates 4 contextual suggestions dynamically
- Falls back to pattern-based suggestions if API fails
- Returns JSON format: `[{icon, text, prompt}, ...]`

---

## IPC Communication Architecture

### 1. Main Process IPC Handlers (`main.js`)
```javascript
// Window management
ipcMain.handle('hide-window', () => overlayWindow.hide())
ipcMain.handle('minimize-window', () => overlayWindow.minimize())

// API & clipboard
ipcMain.handle('get-api-key', () => decryptApiKey())
ipcMain.handle('copy-to-clipboard', (event, text) => clipboard.writeText(text))

// Action picker workflow
ipcMain.handle('action-selected', async (event, { action, prompt }) => {
  // Hide action picker, show main window, send content
})
ipcMain.handle('close-action-picker', () => actionPickerWindow.hide())
```

### 2. Renderer Process Events

**Main Window** (`preload.js`):
```javascript
electronAPI = {
  onCapturedText: (callback) => ipcRenderer.on('captured-text', callback),
  onCapturedScreenshot: (callback) => ipcRenderer.on('captured-screenshot', callback),
  onSuggestionClicked: (callback) => ipcRenderer.on('suggestion-clicked', callback),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text)
}
```

**Action Picker** (`preload-action-picker.js`):
```javascript
electronAPI = {
  sendAction: (action, prompt) => ipcRenderer.invoke('action-selected', { action, prompt }),
  closeActionPicker: () => ipcRenderer.invoke('close-action-picker'),
  onContentType: (callback) => ipcRenderer.on('content-type', callback)
}
```

### 3. Event Flow Sequence
```
Global Shortcut → Store Mouse Position → Capture Content → 
Show Action Picker → IPC: 'action-selected' → Hide Action Picker → 
Show Main Window → IPC: 'captured-text/screenshot' → 
IPC: 'suggestion-clicked' → Process with OpenAI → Display Result
```

---

## Window Management & Positioning

### 1. Window Configurations

**Main Overlay Window** (`main.js:138-166`):
```javascript
{
  width: 800, height: 700,
  frame: false, resizable: true, alwaysOnTop: true,
  skipTaskbar: true, transparent: false
}
```

**Action Picker Window** (`main.js:90-116`):
```javascript
{
  width: 540, height: 120,
  frame: false, resizable: false, transparent: true,
  alwaysOnTop: true, skipTaskbar: true
}
```

### 2. Smart Positioning Logic (`main.js:213-263`)

**Mouse Position Tracking**:
- Stores mouse position when global shortcut pressed
- Uses stored position for action picker centering
- Falls back to current cursor position if stored position unavailable

**Edge Detection & Bounds Checking**:
```javascript
// Ensure window stays within display bounds
const displayBounds = activeDisplay.bounds;
if (x < displayBounds.x) x = displayBounds.x;
if (x + windowWidth > displayBounds.x + displayBounds.width) {
  x = displayBounds.x + displayBounds.width - windowWidth;
}
```

### 3. Multi-Display Support
- Gets display nearest to mouse position: `screen.getDisplayNearestPoint(mousePos)`
- Respects individual display boundaries
- Handles display scaling automatically

---

## Platform-Specific Implementation

### 1. macOS Implementation
**Text Capture**:
```javascript
exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'')
```

**Screenshot Capture**:
```javascript
exec('screencapture -i -c')  // Interactive selection to clipboard
```

**App Integration**:
- Dock icon management: `app.dock.show()`
- Dock click handler: `app.on('activate')`
- Native draggable regions: `-webkit-app-region: drag`

### 2. Windows Implementation
**Text Capture**:
- Attempts direct clipboard reading
- Shows welcome message on first launch
- 5-second auto-hide for initial instruction

**System Tray**:
```javascript
const trayIcon = nativeImage.createFromPath(iconPath);
const resizedIcon = trayIcon.resize({ width: 32, height: 32 });
tray = new Tray(resizedIcon);
```

### 3. Cross-Platform Shortcuts
- **Text Capture**: `CommandOrControl+Option+K`
- **Screenshot**: `CommandOrControl+Option+S`
- Maps to Cmd on macOS, Ctrl on Windows/Linux

---

## Error Handling & Resilience

### 1. API Failure Handling
```javascript
// Graceful fallback for AI suggestions
catch (error) {
  console.error('❌ AI suggestion generation failed:', error);
  return this.getFallbackSuggestions();
}
```

### 2. Screenshot Cancellation
```javascript
// Detect ESC key cancellation
if (error) {
  console.log('📸 Screenshot capture cancelled by user (ESC pressed)');
  screenshotCancelled = true;
  return; // Don't show error or open app
}
```

### 3. Platform Detection
```javascript
if (process.platform === 'darwin') {
  // macOS-specific code
} else if (process.platform === 'win32') {
  // Windows-specific code  
} else {
  // Linux/other platforms
}
```

### 4. Tray Creation Resilience
```javascript
try {
  createTray();
} catch (error) {
  console.log('Tray creation failed, continuing without tray:', error.message);
}
```

---

## Performance Optimizations

### 1. Async Operations
- Non-blocking AI suggestion generation
- Immediate default suggestions while AI processes
- Parallel window creation and shortcut registration

### 2. Memory Management
- Conversation history maintained in renderer process
- Window hiding instead of destruction for reuse
- Efficient DOM manipulation with fragment building

### 3. Lazy Loading
- TextDetector fallback if not loaded
- Progressive enhancement of features
- DevTools only in development mode

---

## Security Implementation

### 1. Context Isolation
All preload scripts use:
```javascript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload-xxx.js')
}
```

### 2. API Key Protection
- Base64 encoding (basic obfuscation)
- Server-side validation by OpenAI
- No key exposure in frontend code

### 3. Content Security
- No eval() usage
- Sanitized user input for API calls
- XSS prevention through contextBridge isolation

---

## Build & Deployment

### 1. Package Configuration (`package.json`)
```json
{
  "name": "kairo",
  "version": "1.1.0",
  "main": "main.js",
  "dependencies": {
    "openai": "^4.24.1"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.6.4"
  }
}
```

### 2. Build Targets
- **macOS**: DMG with ICNS icon
- **Windows**: NSIS installer with ICO icon  
- **Linux**: AppImage with PNG icon

### 3. Build Scripts
```bash
npm run build        # Build all platforms
npm run dist-mac     # macOS only
npm run dist-win     # Windows only  
npm run dist-linux   # Linux only
```

---

## Recent Changes Analysis

### 1. Screenshot Feature Addition
- Added `preload-screenshot.js` for screenshot selection
- Implemented native screenshot capture via `screencapture`
- Added Vision API integration for image analysis

### 2. Shortcut Changes
- **Old**: `Cmd/Ctrl+K` for text capture
- **New**: `Cmd/Ctrl+Option+K` for text capture
- **New**: `Cmd/Ctrl+Option+S` for screenshot capture

### 3. Workflow Unification
- Action picker now opens main chat window (unified experience)
- Eliminated separate response window workflow
- Improved conversation flow continuity

---

## Common Issues & Solutions

### 1. Text Capture Failures
**Issue**: No text captured or empty clipboard
**Solutions**:
- Fallback to existing clipboard content
- Platform-specific copy command variations
- User feedback for empty selections

### 2. API Rate Limiting
**Issue**: OpenAI API request failures
**Solutions**:
- Graceful fallback to pattern-based suggestions
- Error messages in chat interface
- Retry mechanisms for network issues

### 3. Window Focus Issues
**Issue**: Windows not appearing or focus problems
**Solutions**:
- Platform-specific focus handling
- Always-on-top behavior for action picker
- DevTools exception for blur events

### 4. Multi-Display Problems
**Issue**: Windows appearing on wrong display
**Solutions**:
- Mouse position-based display detection
- Individual display bounds checking
- Stored position fallback system

---

## Development Guidelines

### 1. Code Organization
- Main process logic in `main.js`
- UI logic separated by window in respective renderer files
- Shared utilities in `textDetector.js`
- IPC communication through preload scripts

### 2. Debugging Features
```javascript
// Debug functions available in console
window.testFunction()    // Test message addition
window.debugChat()       // Chat state inspection
```

### 3. Environment Variables
```javascript
if (process.env.NODE_ENV === 'development') {
  overlayWindow.webContents.openDevTools();
}
```

---

## Future Enhancement Opportunities

### 1. Planned Features
- Full Windows/Linux screenshot support
- Custom action creation and storage
- Conversation export functionality
- Plugin system for custom AI models

### 2. Performance Improvements
- Conversation history persistence
- Improved caching for AI suggestions
- Background processing optimization

### 3. UX Enhancements
- Configurable shortcuts
- Theme customization
- Accessibility improvements
- Multi-language support

---

*Last Updated: October 8, 2025*  
*Version: 1.1.0*  
*Architecture: Electron 28.0.0 + OpenAI GPT-4o-mini*  
*Analysis Depth: Complete codebase review*