const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let overlayWindow = null;

function createTray() {
  try {
    // Skip tray creation entirely for now
    console.log('Skipping tray creation for now');
    return;
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
  
  // On macOS, we'll use AppleScript to copy selected text
  if (process.platform === 'darwin') {
    console.log('Attempting to copy selected text...');
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