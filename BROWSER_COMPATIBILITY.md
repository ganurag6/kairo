# Browser Compatibility for Kairo

## The Problem
Safari and Firefox have enhanced security that prevents external applications from drawing windows over them. When you use the keyboard shortcut (Cmd+Option+H) while in these browsers, macOS may move the Kairo action picker to a different desktop/space instead of showing it on top.

## Solutions Implemented

1. **Enhanced Window Levels**: Using `floating` window level for browsers
2. **Force Activation**: Using AppleScript to bring Kairo to front
3. **Visible on All Workspaces**: Preventing space switching

## Alternative Solutions If Issues Persist

### Option 1: Use Kairo as a Menu Bar App
- Click the Kairo icon in the menu bar
- Then select your text and use the shortcut

### Option 2: Use Different Browsers
- Google Chrome tends to work better with overlay windows
- Arc browser also has better compatibility

### Option 3: Accessibility Settings
1. System Settings → Privacy & Security → Accessibility
2. Ensure Kairo has full permissions
3. Also add your browser to accessibility permissions

### Option 4: Use Copy-First Workflow
1. Select text in browser
2. Copy it (Cmd+C)
3. Switch to any other app (like Finder)
4. Use Kairo shortcut (Cmd+Option+H)

## Technical Details

Browsers implement security features that:
- Prevent clickjacking by blocking overlay windows
- Restrict window drawing in their render area
- May trigger macOS Mission Control space switching

The app now detects when a browser is frontmost and uses different window management strategies to work around these limitations.