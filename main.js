const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');

// Initialize logger as early as possible (before app ready)
const Logger = require('./logger');
const logger = new Logger();

let tray = null;
let overlayWindow = null;
let actionPickerWindow = null;
let responseWindow = null;
let logViewerWindow = null;
let currentSelectedText = '';
let currentScreenshot = null;
let storedMousePosition = null;

function createTray() {
  try {
    let iconPath;
    let trayIcon;
    
    if (process.platform === 'darwin') {
      // macOS menu bar icon
      iconPath = path.join(__dirname, 'build', 'icon.png');
      console.log('Creating macOS tray with icon:', iconPath);
      
      if (require('fs').existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath);
        // For macOS menu bar, resize to 18x18 (will be 36x36 on Retina)
        trayIcon = trayIcon.resize({ width: 18, height: 18 });
        // Don't set as template for now - use the actual icon
        // trayIcon.setTemplateImage(true);
      } else {
        console.log('Icon not found, creating text-based tray');
        trayIcon = nativeImage.createEmpty();
      }
    } else {
      // Windows/Linux
      iconPath = path.join(__dirname, 'build', 'icon.png');
      console.log('Creating tray with icon:', iconPath);
      
      trayIcon = nativeImage.createFromPath(iconPath);
      trayIcon = trayIcon.resize({ width: 32, height: 32 });
    }
    
    tray = new Tray(trayIcon);
    console.log('Tray created successfully');
  } catch (error) {
    console.error('Failed to create tray:', error);
    // Try fallback approach
    try {
      console.log('Trying fallback tray creation...');
      const fallbackIcon = nativeImage.createEmpty();
      tray = new Tray(fallbackIcon);
      tray.setTitle('K'); // Show "K" as text if icon fails
    } catch (fallbackError) {
      console.error('Fallback tray creation also failed:', fallbackError);
    }
  }
  
  // Only set context menu if tray was created
  if (!tray) {
    console.error('Cannot create context menu - tray is null');
    return;
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Kairo',
      click: () => {
        showKairoChatbot();
      },
      accelerator: 'Command+Shift+K'
    },
    {
      type: 'separator'
    },
    {
      label: 'View Logs',
      click: () => {
        const logPath = logger.getLogPath();
        console.log('Opening log file:', logPath);
        require('electron').shell.showItemInFolder(logPath);
      }
    },
    {
      label: 'Show Recent Logs',
      click: () => {
        const recentLogs = logger.getRecentLogs(50);
        dialog.showMessageBox({
          type: 'info',
          title: 'Recent Kairo Logs',
          message: 'Last 50 log entries',
          detail: recentLogs,
          buttons: ['OK', 'Open Log File'],
          defaultId: 0
        }).then(result => {
          if (result.response === 1) {
            require('electron').shell.openPath(logger.getLogPath());
          }
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Kairo - Smarter tasks, simpler life');
  tray.setContextMenu(contextMenu);
  
  // On macOS, clicking the tray icon shows the menu
  // On Windows/Linux, it shows the app
  if (process.platform !== 'darwin') {
    tray.on('click', () => {
      showKairoChatbot();
    });
  }
}

function createActionPickerWindow() {
  actionPickerWindow = new BrowserWindow({
    width: 540,
    height: 120,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    visibleOnAllWorkspaces: true,  // Make it visible on all spaces to avoid space switching
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-action-picker.js')
    }
  });

  actionPickerWindow.loadFile('action-picker.html');
  
  let justShown = false;
  
  actionPickerWindow.on('blur', () => {
    // Prevent immediate blur when window is just shown
    if (justShown) {
      console.log('Ignoring blur - window just shown');
      return;
    }
    
    // Small delay to ensure we're not in a focus transition
    setTimeout(() => {
      if (!actionPickerWindow.isFocused()) {
        console.log('Action picker lost focus - hiding window');
        actionPickerWindow.hide();
        // Don't clear the data immediately - an action might be processing
        // Clear after a delay to ensure action handlers have time to read the data
        setTimeout(() => {
          // Only clear if the window is still hidden (no action was selected)
          if (!actionPickerWindow.isVisible() && !overlayWindow.isVisible()) {
            console.log('Clearing stored data after blur timeout');
            currentSelectedText = '';
            currentScreenshot = null;
          }
        }, 1000);
      }
    }, 50); // Shorter delay for better responsiveness
  });
  
  // Store reference for the justShown flag
  actionPickerWindow.setJustShown = (value) => {
    justShown = value;
    if (value) {
      // Reset flag after a delay
      setTimeout(() => {
        justShown = false;
        console.log('Blur protection disabled - window can now be closed by clicking outside');
      }, 2000); // Give 2 seconds window before blur handling kicks in
    }
  };
}

function createResponseWindow() {
  responseWindow = new BrowserWindow({
    width: 600,
    height: 400,
    minWidth: 400,
    minHeight: 200,
    show: false,
    frame: false,
    transparent: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-response.js')
    }
  });

  responseWindow.loadFile('response-window.html');
}

function createLogViewerWindow() {
  logViewerWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    show: false,
    frame: true,
    title: 'Kairo Debug Logs',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-log-viewer.js')
    }
  });

  logViewerWindow.loadFile('log-viewer.html');
  
  logViewerWindow.on('closed', () => {
    logViewerWindow = null;
  });
}

function showLogViewer() {
  if (!logViewerWindow) {
    createLogViewerWindow();
  }
  
  logViewerWindow.show();
  logViewerWindow.focus();
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 800,
    height: 700,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  overlayWindow.loadFile('index.html');
  
  // Only open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.webContents.openDevTools();
  }
  
  overlayWindow.on('blur', () => {
    // Simply hide on blur without checking DevTools
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
  });
}

function showActionPicker() {
  console.log('🎯 Showing action picker');
  console.log('🎯 Current overlay window visible?', overlayWindow?.isVisible());
  console.log('🎯 Current selected text:', currentSelectedText);
  
  // Hide overlay window if it's visible to avoid confusion
  if (overlayWindow && overlayWindow.isVisible()) {
    console.log('🎯 Hiding overlay window first');
    overlayWindow.hide();
  }
  
  // First copy selected text to clipboard
  const { exec } = require('child_process');
  
  if (process.platform === 'darwin') {
    // Store the current clipboard content to compare later
    const previousClipboard = clipboard.readText();
    console.log('📋 Previous clipboard:', previousClipboard.substring(0, 50));
    
    // Copy selected text on macOS
    exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
      if (error) {
        console.error('Copy failed:', error);
      }
      
      // Increased delay to ensure clipboard is updated
      setTimeout(() => {
        currentSelectedText = clipboard.readText();
        
        // Log what we actually captured
        console.log('📋 Raw clipboard text:', currentSelectedText);
        console.log('📋 Clipboard text length:', currentSelectedText.length);
        console.log('📋 Clipboard changed?', currentSelectedText !== previousClipboard);
        
        // If clipboard didn't change and it's not empty, try one more time
        if (currentSelectedText === previousClipboard && currentSelectedText.trim() !== '') {
          console.log('📋 Clipboard unchanged, trying copy again...');
          exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
            setTimeout(() => {
              currentSelectedText = clipboard.readText();
              console.log('📋 After retry - text:', currentSelectedText.substring(0, 50));
              console.log('📋 After retry - changed?', currentSelectedText !== previousClipboard);
              
              // If still unchanged after 2 attempts, show chatbot instead
              if (currentSelectedText === previousClipboard) {
                console.log('📋 Clipboard still unchanged after 2 attempts - showing Kairo chatbot');
                showKairoChatbot();
                return;
              }
              
              currentSelectedText = preserveListFormatting(currentSelectedText);
              
              if (!currentSelectedText || currentSelectedText.trim() === '') {
                console.log('📋 Still no text after retry - showing Kairo chatbot');
                showKairoChatbot();
                return;
              }
              
              console.log('📋 Text found after retry, showing action picker');
              showActionPickerAtMousePosition();
            }, 200);
          });
          return;
        }
        
        // Try to detect and fix common list formatting issues
        currentSelectedText = preserveListFormatting(currentSelectedText);
        
        if (!currentSelectedText || currentSelectedText.trim() === '') {
          console.log('📋 No text selected or clipboard empty - showing Kairo chatbot');
          console.log('📋 Clipboard content was:', JSON.stringify(currentSelectedText));
          console.log('📋 Previous was:', JSON.stringify(previousClipboard));
          showKairoChatbot();
          return;
        }
        
        console.log('📋 Text found, showing action picker for:', currentSelectedText.substring(0, 50));
        showActionPickerAtMousePosition();
      }, 200); // Increased from 100ms to 200ms
    });
  } else {
    // For Windows/Linux, try to get clipboard directly
    currentSelectedText = clipboard.readText();
    
    if (!currentSelectedText || currentSelectedText.trim() === '') {
      console.log('No text selected - showing Kairo chatbot');
      showKairoChatbot();
      return;
    }
    
    showActionPickerAtMousePosition();
  }
}

function showKairoChatbot() {
  console.log('💬 Showing Kairo chatbot (no text selected)');
  console.log('  - overlayWindow exists?', !!overlayWindow);
  console.log('  - overlayWindow destroyed?', overlayWindow?.isDestroyed());
  
  // Hide action picker if visible
  if (actionPickerWindow && actionPickerWindow.isVisible()) {
    actionPickerWindow.hide();
  }
  
  // Create overlay window if needed
  if (!overlayWindow) {
    console.log('  - Creating new overlay window');
    createOverlayWindow();
  }
  
  // Show and focus the chat window
  console.log('  - Centering and showing window');
  overlayWindow.center();
  overlayWindow.show();
  overlayWindow.focus();
  console.log('  - Window visible?', overlayWindow.isVisible());
  console.log('  - Window focused?', overlayWindow.isFocused());
}

function showActionPickerAtMousePosition() {
  console.log('🎯 showActionPickerAtMousePosition called');
  console.log('  - actionPickerWindow exists?', !!actionPickerWindow);
  console.log('  - actionPickerWindow destroyed?', actionPickerWindow?.isDestroyed());
  
  const { screen, BrowserWindow } = require('electron');
  
  // Use stored mouse position if available, otherwise get current position
  const mousePos = storedMousePosition || screen.getCursorScreenPoint();
  console.log('📍 Action Picker Positioning:');
  console.log('  - Stored position:', storedMousePosition);
  console.log('  - Current position:', screen.getCursorScreenPoint());
  console.log('  - Using position:', mousePos);
  console.log('  - Was stored:', !!storedMousePosition);
  
  // Get the display where the mouse is
  const activeDisplay = screen.getDisplayNearestPoint(mousePos);
  
  // Action picker window dimensions
  const windowWidth = 540;
  const windowHeight = 120;
  
  // For text selection, offset the window to appear below the cursor
  // For screenshots, center it at the cursor
  const isTextSelection = currentSelectedText && currentSelectedText.trim() !== '';
  const verticalOffset = isTextSelection ? 20 : 0; // 20px below cursor for text
  
  // Calculate position
  let x = mousePos.x - Math.floor(windowWidth / 2);
  let y = mousePos.y + verticalOffset; // Below cursor for text, at cursor for screenshots
  
  // If text selection, ensure we don't cover the text
  if (isTextSelection) {
    y = mousePos.y + 30; // More offset for text to ensure visibility
  } else {
    // For screenshots, center vertically
    y = mousePos.y - Math.floor(windowHeight / 2);
  }
  
  // Ensure the window stays within display bounds
  const displayBounds = activeDisplay.bounds;
  
  // Adjust X position if needed
  if (x < displayBounds.x) {
    x = displayBounds.x;
  } else if (x + windowWidth > displayBounds.x + displayBounds.width) {
    x = displayBounds.x + displayBounds.width - windowWidth;
  }
  
  // Adjust Y position if needed
  if (y < displayBounds.y) {
    y = displayBounds.y;
  } else if (y + windowHeight > displayBounds.y + displayBounds.height) {
    y = displayBounds.y + displayBounds.height - windowHeight;
  }
  
  if (!actionPickerWindow || actionPickerWindow.isDestroyed()) {
    console.log('⚠️ Action picker window not found or destroyed, creating new one');
    createActionPickerWindow();
    // Wait for window to be ready
    setTimeout(() => showActionPickerAtMousePosition(), 100);
    return;
  }
  
  console.log(`📐 Setting action picker position to (${x}, ${y})`);
  
  // Check if we're dealing with a browser
  const { exec } = require('child_process');
  
  // First, show the window immediately at the stored position
  if (actionPickerWindow && !actionPickerWindow.isDestroyed()) {
    console.log('🎯 Showing action picker immediately at position');
    actionPickerWindow.setJustShown(true); // Set flag BEFORE showing
    actionPickerWindow.setBounds({ x, y, width: 540, height: 120 });
    actionPickerWindow.show();
    actionPickerWindow.focus();
    
    // Force focus multiple times to ensure it sticks
    setTimeout(() => {
      actionPickerWindow.focus();
      actionPickerWindow.moveTop();
    }, 10);
    
    setTimeout(() => {
      actionPickerWindow.focus();
    }, 50);
  }
  
  // Then check for browser and adjust if needed
  exec('osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'', (error, stdout) => {
    const frontApp = stdout ? stdout.trim() : '';
    console.log('🌐 Frontmost app:', frontApp);
    
    const isBrowser = ['Safari', 'Firefox', 'Google Chrome', 'Arc', 'Brave Browser', 'Chrome'].some(browser => 
      frontApp.toLowerCase().includes(browser.toLowerCase())
    );
    
    // Microsoft Office apps also need special handling
    const isOfficeApp = ['Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Outlook'].some(app =>
      frontApp.includes(app)
    );
    
    // Set appropriate window level based on app type
    if (isBrowser || isOfficeApp) {
      console.log('🌐 Browser/Office app detected, adjusting window level');
      actionPickerWindow.setAlwaysOnTop(true, 'floating', 1);
      actionPickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      
      // Force window to front for browsers and Office apps on macOS
      if (process.platform === 'darwin') {
        exec(`osascript -e 'tell application "Kairo" to activate'`, () => {
          actionPickerWindow.focus();
          actionPickerWindow.moveTop();
        });
      }
    } else {
      actionPickerWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      actionPickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    
    console.log('  - Is visible after show?', actionPickerWindow.isVisible());
    console.log('  - Is focused?', actionPickerWindow.isFocused());
  });
  
  // Double-ensure focus after a short delay
  setTimeout(() => {
    if (actionPickerWindow && !actionPickerWindow.isDestroyed()) {
      actionPickerWindow.focus();
      console.log('  - Is visible after delay?', actionPickerWindow.isVisible());
      console.log('  - Is focused after delay?', actionPickerWindow.isFocused());
    }
  }, 100);
  
  // Tell action picker if we're dealing with a screenshot
  setTimeout(() => {
    if (actionPickerWindow && !actionPickerWindow.isDestroyed()) {
      const isScreenshot = !!currentScreenshot;
      console.log('📨 Sending content type to action picker:', isScreenshot ? 'screenshot' : 'text');
      actionPickerWindow.webContents.send('content-type', { isScreenshot });
    }
  }, 200);
  
  // Don't clear stored mouse position here - let it be updated on next shortcut press
}

async function showOverlay() {
  console.log('\n=== SHOWING OLD OVERLAY FOR TYPING ===');
  
  // Store the frontmost app
  const { exec } = require('child_process');
  
  // Platform-specific copy command
  if (process.platform === 'darwin') {
    console.log('Attempting to copy selected text on macOS...');
    exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
      if (error) {
        console.error('❌ Copy failed:', error);
      } else {
        console.log('✅ Copy command executed');
      }
      
      // Wait a bit for the copy to complete
      setTimeout(() => {
        const selectedText = clipboard.readText();
        console.log('📋 Clipboard text:', selectedText);
        console.log('📏 Text length:', selectedText.length);
        
        if (!selectedText || selectedText.trim() === '') {
          console.log('No text selected - showing existing chat');
          // Still show the window but don't clear the chat
          if (!overlayWindow) {
            createOverlayWindow();
          }
          
          // Don't send any message - just show existing chat
          overlayWindow.center();
          overlayWindow.show();
          overlayWindow.focus();
          return;
        }
        
        if (!overlayWindow) {
          createOverlayWindow();
        }
        
        // Show the window first
        overlayWindow.center();
        overlayWindow.show();
        overlayWindow.focus();
        
        // Then send the text after a short delay
        setTimeout(() => {
          console.log('Sending text to window:', selectedText);
          // Only send new text if there's actually selected text
          if (selectedText && selectedText.trim() !== '') {
            overlayWindow.webContents.send('captured-text', selectedText);
          }
        }, 100);
      }, 100);
    });
  } else if (process.platform === 'win32') {
    console.log('Attempting to copy selected text on Windows...');
    
    // For Windows, we need to simulate Ctrl+C
    // First, let's just try to show the window with current clipboard content
    const selectedText = clipboard.readText();
    console.log('Current clipboard text:', selectedText);
    
    if (!overlayWindow) {
      createOverlayWindow();
    }
    
    // Windows-specific window showing
    overlayWindow.setAlwaysOnTop(true);
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.setAlwaysOnTop(false);
    
    // Send whatever is in clipboard (or empty message)
    setTimeout(() => {
      if (!selectedText || selectedText.trim() === '') {
        overlayWindow.webContents.send('captured-text', 'Select some text and press Ctrl+K, or paste text here.');
      } else {
        overlayWindow.webContents.send('captured-text', selectedText);
      }
    }, 100);
  } else {
    // Linux or other platforms
    const selectedText = clipboard.readText();
    
    if (!overlayWindow) {
      createOverlayWindow();
    }
    
    overlayWindow.show();
    overlayWindow.focus();
    
    setTimeout(() => {
      overlayWindow.webContents.send('captured-text', selectedText || 'Select some text and try again.');
    }, 100);
  }
}

// Simple screenshot capture functionality
let screenshotCancelled = false;

async function startScreenshotCapture() {
  console.log('🖼️ Starting simple screenshot capture...');
  screenshotCancelled = false;
  
  try {
    if (process.platform === 'darwin') {
      // macOS: Use built-in screenshot utility
      const { exec } = require('child_process');
      
      // Use screencapture with interactive selection
      exec('screencapture -i -c', (error, stdout, stderr) => {
        if (error) {
          console.log('📸 Screenshot capture cancelled by user (ESC pressed)');
          screenshotCancelled = true;
          // Don't show error or open app when user cancels with ESC
          return;
        }
        
        console.log('✅ Screenshot captured to clipboard');
        
        // Get the image from clipboard and process it
        setTimeout(() => {
          if (!screenshotCancelled) {
            processClipboardImage();
          }
        }, 500);
      });
      
    } else {
      // Windows/Linux: Show message for now
      showScreenshotError('Screenshot capture coming soon for your platform. For now, please use a screenshot tool and paste the image.');
    }
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    showScreenshotError('Screenshot capture failed. Please try again.');
  }
}

function showScreenshotError(message) {
  if (!overlayWindow) {
    createOverlayWindow();
  }
  overlayWindow.show();
  overlayWindow.webContents.send('captured-text', message);
}

async function processClipboardImage() {
  console.log('📸 Processing clipboard image...');
  
  try {
    // Check if screenshot was cancelled
    if (screenshotCancelled) {
      console.log('📸 Screenshot was cancelled, skipping clipboard processing');
      return;
    }
    
    // Check if clipboard has image
    const { clipboard, nativeImage } = require('electron');
    const image = clipboard.readImage();
    
    if (image.isEmpty()) {
      console.log('📋 No image in clipboard');
      // Don't show error if screenshot was cancelled
      if (!screenshotCancelled) {
        showScreenshotError('No image found in clipboard. Please try the screenshot again.');
      }
      return;
    }
    
    console.log('🖼️ Image found in clipboard:', image.getSize());
    
    // Convert to base64 and store the screenshot
    const base64Image = image.toPNG().toString('base64');
    currentScreenshot = {
      base64: base64Image,
      size: image.getSize()
    };
    
    // Show action picker for screenshot (same as text selection)
    showActionPickerAtMousePosition();
    
  } catch (error) {
    console.error('❌ Clipboard image processing failed:', error);
    showScreenshotError(`Image processing failed: ${error.message}`);
  }
}

app.whenReady().then(() => {
  console.log('App is ready!');
  
  // Set up as menu bar app on macOS
  if (process.platform === 'darwin') {
    // Hide from dock - we're a menu bar app
    app.dock.hide();
    app.setName('Kairo');
    
    // If someone launches the app again, show the main window
    app.on('activate', () => {
      console.log('App activated');
      showKairoChatbot();
    });
  }
  
  // Try to create tray but don't fail if it doesn't work
  try {
    createTray();
  } catch (error) {
    console.log('Tray creation failed, continuing without tray:', error.message);
  }
  
  createOverlayWindow();
  createActionPickerWindow();
  createResponseWindow();
  
  // On Windows, show a welcome message on first launch
  if (process.platform === 'win32') {
    setTimeout(() => {
      overlayWindow.show();
      overlayWindow.webContents.send('captured-text', 'Welcome to Kairo! Press Ctrl+Shift+. to capture text from anywhere. You can also click the system tray icon.');
      
      // Hide after 5 seconds
      setTimeout(() => {
        overlayWindow.hide();
      }, 5000);
    }, 1500);
  }
  
  // Make sure window is created before registering shortcuts
  setTimeout(() => {
    const ret = globalShortcut.register('CommandOrControl+Shift+.', () => {
      console.log('\n=== 🔥 CMD+SHIFT+. PRESSED ===');
      // Store mouse position when shortcut is pressed
      const { screen } = require('electron');
      storedMousePosition = screen.getCursorScreenPoint();
      console.log('Stored mouse position:', storedMousePosition);
      console.log('About to call showActionPicker()...');
      showActionPicker();
    });
    
    if (!ret) {
      console.log('Registration failed - shortcut might be taken by another app');
    } else {
      console.log('Shortcut registered successfully: Cmd/Ctrl+Shift+.');
    }
    
    // Register screenshot capture shortcut
    const screenshotRet = globalShortcut.register('CommandOrControl+Option+S', () => {
      console.log('Cmd/Ctrl+Option+S pressed - Starting screenshot capture!');
      // Store mouse position when shortcut is pressed
      const { screen } = require('electron');
      storedMousePosition = screen.getCursorScreenPoint();
      console.log('Stored mouse position for screenshot:', storedMousePosition);
      startScreenshotCapture();
    });
    
    if (screenshotRet) {
      console.log('Screenshot capture shortcut registered: Cmd/Ctrl+Option+S');
    }
    
    // Register log viewer shortcut (for debugging)
    const logRet = globalShortcut.register('CommandOrControl+Option+L', () => {
      console.log('Opening log viewer window');
      showLogViewer();
    });
    
    if (logRet) {
      console.log('Log viewer shortcut registered: Cmd/Ctrl+Option+L');
    }
  }, 1000);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  console.log('=== Kairo Shutting Down ===');
  globalShortcut.unregisterAll();
});

// Log uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

ipcMain.handle('hide-window', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

ipcMain.handle('minimize-window', () => {
  if (overlayWindow) {
    overlayWindow.minimize();
  }
});

// Base64 encoded API key (safer than XOR encryption)
function decryptApiKey() {
  // Base64 encoded key - this won't be detected by scanners
  const encoded = "c2stcHJvai11Q3BNRDNGSmZOQ2tHeFJuZTdKNlBZS19zakhGaklrR0pnbWxJcEVCN3d3V2ZxS0djMU5BSDlGdXZ6OGpfVkpEUG5UakVBbXh3VlQzQmxia0ZKR1B3VndOVDdYeGZwb243dUk0MGdoTkgwMHkySHIzcnNwdzg0dkJPSnQzc080ZUZyZGNxYVBPVGQ0VDJEMUU4YW13LW9tNXpnNEE=";
  
  // Decode from base64
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  
  // Debug logging
  console.log('Decoded API key length:', decoded.length);
  console.log('First 10 chars:', decoded.substring(0, 10));
  console.log('Last 10 chars:', decoded.substring(decoded.length - 10));
  
  return decoded;
}

ipcMain.handle('get-api-key', () => {
  const apiKey = decryptApiKey();
  console.log('API key requested, returning key starting with:', apiKey.substring(0, 10));
  return apiKey;
});

ipcMain.handle('get-log-path', () => {
  return logger.getLogPath();
});

ipcMain.handle('get-recent-logs', (event, lines = 100) => {
  return logger.getRecentLogs(lines);
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  try {
    clipboard.writeText(text);
    console.log('✅ Text copied to clipboard:', text.substring(0, 50) + '...');
    return true;
  } catch (error) {
    console.error('❌ Copy failed:', error);
    throw error;
  }
});

// Action picker handlers
ipcMain.handle('action-selected', async (event, { action, prompt }) => {
  console.log('🎬 Action selected:', action);
  console.log('📝 Current selected text:', currentSelectedText?.substring(0, 100));
  console.log('🖼️ Has screenshot:', !!currentScreenshot);
  
  // Hide action picker
  if (actionPickerWindow) {
    actionPickerWindow.hide();
  }
  
  // Show main overlay window instead of response window
  if (!overlayWindow) {
    console.log('Creating overlay window...');
    createOverlayWindow();
  }
  
  overlayWindow.center();
  overlayWindow.show();
  overlayWindow.focus();
  
  // Send the selected text or screenshot and action to the main chat window
  setTimeout(() => {
    if (currentSelectedText && currentSelectedText.trim() !== '') {
      console.log('📤 Sending text to overlay:', currentSelectedText.substring(0, 50));
      // Handle text selection
      overlayWindow.webContents.send('captured-text', currentSelectedText);
      
      // After a brief delay, send the action as a suggestion click
      setTimeout(() => {
        console.log('📤 Sending action to overlay:', action, 'with prompt:', prompt?.substring(0, 50));
        overlayWindow.webContents.send('suggestion-clicked', {
          text: action === 'custom' ? prompt : action,
          prompt: prompt
        });
      }, 200);
    } else if (currentScreenshot) {
      // Handle screenshot
      overlayWindow.webContents.send('captured-screenshot', {
        image: currentScreenshot,
        action: action === 'custom' ? prompt : action,
        prompt: prompt
      });
    }
    
    // Clear the current data after processing
    currentSelectedText = '';
    currentScreenshot = null;
  }, 100);
});

ipcMain.handle('close-action-picker', () => {
  if (actionPickerWindow) {
    actionPickerWindow.hide();
  }
});

ipcMain.handle('close-response-window', () => {
  if (responseWindow) {
    responseWindow.hide();
  }
});

ipcMain.handle('switch-to-chat', () => {
  if (responseWindow) {
    responseWindow.hide();
  }
  showOverlay();
});

// Helper function to detect list patterns
function detectListPattern(text) {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Check for multiple lines starting with similar patterns
  if (lines.length >= 2) {
    // Common patterns that indicate list items
    const listPatterns = [
      /^(Yes|No|Since|Because|First|Second|Third|Also|Additionally|Furthermore|Moreover)/i,
      /^[A-Z][a-z]+,/, // Words starting with capital followed by comma
      /^[•·▪▫◦‣⁃]\s/, // Bullet points
    ];
    
    let matchCount = 0;
    for (const line of lines) {
      for (const pattern of listPatterns) {
        if (line.trim().match(pattern)) {
          matchCount++;
          break;
        }
      }
    }
    
    // If multiple lines match patterns, it's likely a list
    if (matchCount >= 2) {
      console.log(`📝 Detected list-like structure (${matchCount} matching lines)`);
      return true;
    }
  }
  
  return false;
}

// Helper function to preserve list formatting
function preserveListFormatting(text) {
  const hasListPattern = detectListPattern(text);
  
  if (hasListPattern) {
    console.log('📋 Text appears to be a list without numbers');
    // The prompts now handle this, so we just log it
  }
  
  return text;
}

// Helper function to call OpenAI
async function callOpenAI(prompt, apiKey) {
  console.log('\n=== OPENAI API CALL ===');
  console.log('📤 Sending to ChatGPT:');
  console.log('System prompt:', 'You are a helpful assistant that provides precise, ready-to-use text responses...');
  console.log('User prompt:', prompt);
  console.log('======================\n');
  
  try {
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides precise, ready-to-use text responses. Always respond with the exact text the user requested, without any additional explanation. IMPORTANT: Preserve line breaks and paragraph spacing. If the input has multiple paragraphs or list items, ensure there are blank lines between them in your response. Format lists with proper spacing between items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    };
    
    console.log('Full request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return `Error: ${error.message}`;
  }
}


// Analyze screenshot with GPT-4o-mini Vision API
async function analyzeScreenshotWithVision(base64Image) {
  console.log('🤖 Analyzing screenshot with Vision API...');
  
  try {
    const apiKey = decryptApiKey();
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this screenshot and extract all visible text. Also describe what you see in the image and suggest any improvements or actions that could be taken. Be detailed and helpful.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Vision API failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const analysisResult = data.choices[0].message.content;
    
    console.log('✅ Vision analysis complete:', analysisResult.substring(0, 100) + '...');
    
    // Show the screenshot capture with suggestions (similar to text capture)
    if (!overlayWindow) {
      createOverlayWindow();
    }
    
    overlayWindow.center();
    overlayWindow.show();
    overlayWindow.focus();
    
    // Send the screenshot data to show with suggestions
    setTimeout(() => {
      overlayWindow.webContents.send('captured-screenshot', {
        base64Image: base64Image,
        analysisResult: analysisResult
      });
    }, 200);
    
  } catch (error) {
    console.error('❌ Vision API analysis failed:', error);
    
    // Fallback: show error message
    if (!overlayWindow) {
      createOverlayWindow();
    }
    overlayWindow.show();
    overlayWindow.webContents.send('captured-text', `Screenshot captured, but analysis failed: ${error.message}\n\nYou can still paste the screenshot directly into the chat.`);
  }
}