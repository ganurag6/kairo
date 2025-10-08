// Preload script for screenshot selection window
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureSelection: (selection) => {
    console.log('📸 Selection captured:', selection);
    ipcRenderer.invoke('capture-screenshot-selection', selection);
  }
});