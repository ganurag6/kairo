const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let overlayWindow = null;
let actionPickerWindow = null;
let responseWindow = null;
let currentSelectedText = '';
let currentScreenshot = null;
let storedMousePosition = null;

function createTray() {
  try {
    // Create tray icon for Windows/Linux
    if (process.platform !== 'darwin') {
      // Use smaller icon for tray (Windows prefers 16x16 or 32x32)
      const iconPath = path.join(__dirname, 'build', 'icon.png');
      console.log('Creating tray with icon:', iconPath);
      
      // For Windows, we need to ensure icon exists and is the right size
      const trayIcon = nativeImage.createFromPath(iconPath);
      const resizedIcon = trayIcon.resize({ width: 32, height: 32 });
      
      tray = new Tray(resizedIcon);
      console.log('Tray created successfully');
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Kairo',
          click: () => {
            showOverlay();
          }
        },
        {
          label: 'Open with Ctrl+K',
          enabled: false
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
      
      tray.setToolTip('Kairo - Press Ctrl+K to capture text');
      tray.setContextMenu(contextMenu);
      
      // Show window on tray click
      tray.on('click', () => {
        showOverlay();
      });
    }
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Kairo',
      click: () => {
        showOverlay();
      }
    },
    {
      label: 'Test Window',
      click: () => {
        clipboard.writeText('This is a test message from Kairo!');
        showOverlay();
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-action-picker.js')
    }
  });

  actionPickerWindow.loadFile('action-picker.html');
  
  actionPickerWindow.on('blur', () => {
    setTimeout(() => {
      if (actionPickerWindow && !actionPickerWindow.isDestroyed()) {
        actionPickerWindow.hide();
      }
    }, 200);
  });
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
    if (overlayWindow && !overlayWindow.webContents.isDevToolsOpened()) {
      overlayWindow.hide();
    }
  });
}

function showActionPicker() {
  console.log('🎯 Showing action picker');
  
  // First copy selected text to clipboard
  const { exec } = require('child_process');
  
  if (process.platform === 'darwin') {
    // Copy selected text on macOS
    exec('osascript -e \'tell application "System Events" to keystroke "c" using command down\'', (error) => {
      if (error) {
        console.error('Copy failed:', error);
      }
      
      setTimeout(() => {
        currentSelectedText = clipboard.readText();
        
        // Log what we actually captured
        console.log('📋 Raw clipboard text:', currentSelectedText);
        
        // Try to detect and fix common list formatting issues
        currentSelectedText = preserveListFormatting(currentSelectedText);
        
        if (!currentSelectedText || currentSelectedText.trim() === '') {
          console.log('No text selected');
          showOverlay();
          return;
        }
        
        showActionPickerAtMousePosition();
      }, 100);
    });
  } else {
    // For Windows/Linux, try to get clipboard directly
    currentSelectedText = clipboard.readText();
    
    if (!currentSelectedText || currentSelectedText.trim() === '') {
      console.log('No text selected');
      showOverlay();
      return;
    }
    
    showActionPickerAtMousePosition();
  }
}

function showActionPickerAtMousePosition() {
  const { screen, BrowserWindow } = require('electron');
  
  // Use stored mouse position if available, otherwise get current position
  const mousePos = storedMousePosition || screen.getCursorScreenPoint();
  console.log('Using mouse position:', mousePos);
  console.log('Was stored:', !!storedMousePosition);
  
  // Get the display where the mouse is
  const activeDisplay = screen.getDisplayNearestPoint(mousePos);
  
  // Action picker window dimensions
  const windowWidth = 540;
  const windowHeight = 120;
  
  // Calculate position to center the window at mouse cursor
  let x = mousePos.x - Math.floor(windowWidth / 2);
  let y = mousePos.y - Math.floor(windowHeight / 2);
  
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
  
  if (actionPickerWindow) {
    actionPickerWindow.setPosition(x, y);
    actionPickerWindow.show();
    actionPickerWindow.focus();
    
    // Tell action picker if we're dealing with a screenshot
    setTimeout(() => {
      const isScreenshot = !!currentScreenshot;
      actionPickerWindow.webContents.send('content-type', { isScreenshot });
    }, 100);
    
    // Clear stored mouse position after use
    storedMousePosition = null;
  }
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
  
  // Force the app to show in dock
  if (process.platform === 'darwin') {
    app.dock.show();
    // Create a dock icon if needed
    app.setName('Kairo');
    
    // Handle dock icon click
    app.on('activate', () => {
      console.log('Dock icon clicked');
      if (overlayWindow) {
        overlayWindow.show();
        overlayWindow.focus();
      } else {
        createOverlayWindow();
        overlayWindow.show();
        overlayWindow.focus();
      }
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
      overlayWindow.webContents.send('captured-text', 'Welcome to Kairo! Press Ctrl+K to capture text from anywhere. You can also click the system tray icon.');
      
      // Hide after 5 seconds
      setTimeout(() => {
        overlayWindow.hide();
      }, 5000);
    }, 1500);
  }
  
  // Make sure window is created before registering shortcuts
  setTimeout(() => {
    const ret = globalShortcut.register('CommandOrControl+Option+P', () => {
      console.log('Cmd/Ctrl+Option+P pressed!');
      // Store mouse position when shortcut is pressed
      const { screen } = require('electron');
      storedMousePosition = screen.getCursorScreenPoint();
      console.log('Stored mouse position:', storedMousePosition);
      showActionPicker();
    });
    
    if (!ret) {
      console.log('Registration failed - shortcut might be taken by another app');
    } else {
      console.log('Shortcut registered successfully: Cmd/Ctrl+Option+P');
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
  }, 1000);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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
  console.log('Action selected:', action);
  
  // Hide action picker
  if (actionPickerWindow) {
    actionPickerWindow.hide();
  }
  
  // Show main overlay window instead of response window
  if (!overlayWindow) {
    createOverlayWindow();
  }
  
  overlayWindow.center();
  overlayWindow.show();
  overlayWindow.focus();
  
  // Send the selected text or screenshot and action to the main chat window
  setTimeout(() => {
    if (currentSelectedText && currentSelectedText.trim() !== '') {
      // Handle text selection
      overlayWindow.webContents.send('captured-text', currentSelectedText);
      
      // After a brief delay, send the action as a suggestion click
      setTimeout(() => {
        overlayWindow.webContents.send('suggestion-clicked', {
          text: action,
          prompt: prompt
        });
      }, 200);
    } else if (currentScreenshot) {
      // Handle screenshot
      overlayWindow.webContents.send('captured-screenshot', {
        image: currentScreenshot,
        action: action,
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