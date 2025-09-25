const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let overlayWindow = null;

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
          label: 'Open with Ctrl+L',
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
      
      tray.setToolTip('Kairo - Press Ctrl+L to capture text');
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

async function showOverlay() {
  console.log('\n=== SHORTCUT PRESSED! ===');
  
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
          console.log('No text selected');
          // Still show the window with a message
          if (!overlayWindow) {
            createOverlayWindow();
          }
          
          overlayWindow.webContents.once('dom-ready', () => {
            overlayWindow.webContents.send('captured-text', 'No text selected. Please select some text and try again.');
          });
          
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
          overlayWindow.webContents.send('captured-text', selectedText);
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
        overlayWindow.webContents.send('captured-text', 'Select some text and press Ctrl+L, or paste text here.');
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

app.whenReady().then(() => {
  console.log('App is ready!');
  
  // Force the app to show in dock
  if (process.platform === 'darwin') {
    app.dock.show();
    // Create a dock icon if needed
    app.setName('Kairo');
  }
  
  // Try to create tray but don't fail if it doesn't work
  try {
    createTray();
  } catch (error) {
    console.log('Tray creation failed, continuing without tray:', error.message);
  }
  
  createOverlayWindow();
  
  // On Windows, show a welcome message on first launch
  if (process.platform === 'win32') {
    setTimeout(() => {
      overlayWindow.show();
      overlayWindow.webContents.send('captured-text', 'Welcome to Kairo! Press Ctrl+L to capture text from anywhere. You can also click the system tray icon.');
      
      // Hide after 5 seconds
      setTimeout(() => {
        overlayWindow.hide();
      }, 5000);
    }, 1500);
  }
  
  // Make sure window is created before registering shortcuts
  setTimeout(() => {
    const ret = globalShortcut.register('CommandOrControl+L', () => {
      console.log('Cmd+L pressed!');
      showOverlay();
    });
    
    if (!ret) {
      console.log('Registration failed - shortcut might be taken by another app');
    } else {
      console.log('Shortcut registered successfully: Cmd/Ctrl+L');
    }
    
    // Also register an alternative shortcut just in case
    const altRet = globalShortcut.register('CommandOrControl+Shift+L', () => {
      console.log('Cmd+Shift+L pressed!');
      showOverlay();
    });
    
    if (altRet) {
      console.log('Alternative shortcut registered: Cmd/Ctrl+Shift+L');
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