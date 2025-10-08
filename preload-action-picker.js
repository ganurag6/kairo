const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendAction: (action, prompt) => {
    ipcRenderer.invoke('action-selected', { action, prompt });
  },
  closeActionPicker: () => {
    ipcRenderer.invoke('close-action-picker');
  },
  onContentType: (callback) => {
    ipcRenderer.on('content-type', (event, data) => callback(data));
  }
});