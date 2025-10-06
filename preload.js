const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCapturedText: (callback) => {
    ipcRenderer.on('captured-text', (event, text) => callback(text));
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
  },
  // Task management
  saveTask: (taskData) => {
    return ipcRenderer.invoke('save-task', taskData);
  },
  getTasks: () => {
    return ipcRenderer.invoke('get-tasks');
  },
  updateTask: (id, updates) => {
    return ipcRenderer.invoke('update-task', id, updates);
  },
  completeTask: (id) => {
    return ipcRenderer.invoke('complete-task', id);
  },
  deleteTask: (id) => {
    return ipcRenderer.invoke('delete-task', id);
  },
  onTaskSaved: (callback) => {
    ipcRenderer.on('task-saved', (event, task) => callback(task));
  }
});