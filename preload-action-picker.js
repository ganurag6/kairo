const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendAction: (action, prompt) => {
    ipcRenderer.invoke('action-selected', { action, prompt });
  },
  closeActionPicker: () => {
    ipcRenderer.invoke('close-action-picker');
  },
  saveTask: (taskData) => {
    return ipcRenderer.invoke('save-task', taskData);
  }
});