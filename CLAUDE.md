# Kairo App - Complete Technical Overview

## App Summary
Kairo is an Electron-based AI assistant that provides global text capture and processing. Users can select text anywhere on screen, press Cmd+K/Ctrl+K, and get AI-powered analysis, suggestions, and improvements through OpenAI's GPT-3.5-turbo.

## Core Architecture

### Multi-Window System
- **Main Overlay Window** (`index.html`): Primary chat interface with smart suggestions
- **Action Picker Window** (`action-picker.html`): Quick action buttons for captured text
- **Response Window** (`response-window.html`): *Currently unused after workflow change*
- **System Integration**: Tray icon, global shortcuts, clipboard management

### Key Files
- `main.js`: Electron main process, window management, IPC handlers
- `renderer.js`: Main chat interface logic and AI integration
- `textDetector.js`: Smart text analysis and contextual suggestion generation
- `action-picker.js`: Quick action button handlers
- `preload.js`: Secure bridge between main and renderer processes

## Complete Workflow

### 1. App Launch & Setup
```
Electron starts → Creates 3 windows (hidden) → Registers global shortcuts → System tray integration
```

### 2. Text Capture Methods

**Method A: Global Text Selection (Primary Flow)**
```
User selects text anywhere → Presses Cmd+K/Ctrl+K → App copies to clipboard → Shows action picker
```

**Method B: Direct Input**
```
User opens main window → Types/pastes text → Shows chat interface with smart suggestions
```

### 3. Updated Workflow (After Recent Changes)
```
Select text → Cmd+K → Action picker (10 buttons) → Click action → Full chat window opens → Continue conversation
```

**Key Change**: Actions now open the main chat window instead of a separate response window, enabling seamless conversation flow.

## Smart Text Detection System

### Text Type Detection (`textDetector.js`)
The app analyzes text and detects 7 different types with confidence scores:

1. **Email**: Keywords like "dear", "regards", "@", "subject:"
2. **Code**: Keywords like "function", "const", "import", "{}", "()"
3. **Academic**: Keywords like "therefore", "hypothesis", "research"
4. **Social**: Keywords like "#", "@", emojis, "lol", "check out"
5. **Business**: Keywords like "pursuant", "agreement", "stakeholder"
6. **Creative**: Keywords like "chapter", "character", "dialogue"
7. **Data**: Keywords like "•", "1.", "total", "percentage"

### Context-Aware Suggestions
Each text type gets specific AI-generated suggestions:
- **Email**: "Make more formal", "Add call-to-action"
- **Code**: "Explain code", "Find bugs", "Optimize"
- **Academic**: "Strengthen argument", "Add evidence"

## AI Integration Points

### 1. Action Picker Quick Actions
```javascript
// 10 preset actions in action-picker.html
Fix Grammar, Make Concise, Professional, Summarize, Explain, 
Translate, Expand, Simplify, Key Points, Custom
```

### 2. Smart Suggestions (Two Types)
```javascript
// Default suggestions - shown immediately
Fix Grammar, Make Concise, Professional Rewrite, Summarize, Explain Simply

// AI-generated suggestions - created dynamically based on text type
Generated via OpenAI API call analyzing text context
```

### 3. Chat Interface
```javascript
// Full conversational AI with:
- Conversation history maintenance
- Context-aware responses
- Copy-to-clipboard functionality
- System/user/assistant message types
```

## API Integration

### OpenAI Configuration
- **Model**: GPT-3.5-turbo
- **API Key**: Base64 encoded and stored in main.js (decryptApiKey function)
- **Temperature**: 0.7 for chat, 0.3 for quick actions
- **Max Tokens**: 1000 for chat, 500 for suggestions

### API Call Locations
1. **Quick Actions**: `main.js:505` - Direct prompt processing
2. **Smart Suggestions**: `textDetector.js:184` - Context analysis
3. **Chat Interface**: `renderer.js:482` - Conversation management

## Event Flow & IPC Communication

### Text Capture Flow
```
main.js:showActionPicker() → clipboard copy → showActionPickerAtMousePosition()
```

### Action Selection Flow
```
action-picker.js → IPC 'action-selected' → main.js handler → main chat window
```

### Chat Flow
```
renderer.js:sendMessage() → processMessage() → OpenAI API → addMessage()
```

## Key Features Implemented

### ✅ Context Awareness
- Smart text type detection with confidence scoring
- 7 different text categories with specific suggestions
- Pattern matching with weighted indicators

### ✅ AI-Powered Suggestions
- Dynamic suggestion generation via OpenAI
- Fallback to pattern-based suggestions if AI fails
- Real-time contextual analysis

### ✅ Unified Workflow
- Single chat interface for all interactions
- Seamless transition from quick actions to conversation
- Full conversation history and context maintenance

### ✅ Global Integration
- Works from any application via global shortcuts
- Clipboard integration for text capture
- System tray and dock integration

### ✅ Privacy & Security
- Direct OpenAI API calls (no middleman)
- Local conversation storage
- No data collection or transmission

## Window Management

### Window States & Positioning
```javascript
// Action Picker: 540x120, transparent, always on top, center screen
// Main Overlay: 800x700, resizable, always on top, center screen
// Auto-hide on blur (with DevTools exception)
```

### Platform-Specific Behavior
- **macOS**: Dock integration, osascript for text copying
- **Windows**: System tray, Ctrl+C simulation
- **Linux**: Basic tray support, clipboard fallback

## Error Handling

### API Failures
- Graceful fallback to pattern-based suggestions
- Error messages displayed in chat interface
- Retry mechanisms for network issues

### Text Capture Issues
- Fallback to existing clipboard content
- Empty text handling with helpful messages
- Platform-specific copy command variations

## Performance Optimizations

### Async Operations
```javascript
// Non-blocking AI suggestion generation
// Immediate default suggestions while AI processes
// Parallel window creation and shortcut registration
```

### Memory Management
```javascript
// Conversation history cleanup
// Window hiding instead of destruction
// Efficient DOM manipulation
```

## File Structure Overview
```
├── main.js                 # Electron main process
├── index.html              # Main chat interface
├── renderer.js             # Chat logic & AI integration
├── textDetector.js         # Smart text analysis
├── action-picker.html      # Quick action buttons
├── action-picker.js        # Action picker logic
├── response-window.html    # [Unused after workflow change]
├── preload.js              # IPC bridge
├── styles.css              # Main interface styling
├── action-picker.css       # Action picker styling
└── package.json            # Electron app configuration
```

## Recent Modifications (Latest Changes)

### Workflow Unification
- **Modified**: `main.js:466-497` - Action picker now opens main chat window
- **Added**: `renderer.js:306-318` - Handler for action picker suggestions
- **Updated**: `preload.js:7-9` - New IPC event for suggestion clicks

### Result
Users now get a unified experience where quick actions seamlessly transition into full conversational AI interface, eliminating window switching and maintaining conversation context.

---

*Last Updated: October 1, 2025*
*Version: 1.1.0*
*Architecture: Electron + OpenAI GPT-3.5-turbo*