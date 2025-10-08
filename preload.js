const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCapturedText: (callback) => {
    ipcRenderer.on('captured-text', (event, text) => callback(text));
  },
  onCapturedScreenshot: (callback) => {
    ipcRenderer.on('captured-screenshot', (event, data) => callback(data));
  },
  onSuggestionClicked: (callback) => {
    ipcRenderer.on('suggestion-clicked', (event, suggestion) => callback(suggestion));
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