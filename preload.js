const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCapturedText: (callback) => {
    ipcRenderer.on('captured-text', (event, text) => callback(text));
  },
  hideWindow: () => {
    ipcRenderer.invoke('hide-window');
  },
  minimizeWindow: () => {
    ipcRenderer.invoke('minimize-window');
  },
  getApiKey: () => {
    return ipcRenderer.invoke('get-api-key');
  },
  copyToClipboard: (text) => {
    return ipcRenderer.invoke('copy-to-clipboard', text);
  }
});