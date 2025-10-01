const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onResponse: (callback) => {
    ipcRenderer.on('ai-response', (event, data) => callback(data));
  },
  copyToClipboard: (text) => {
    return ipcRenderer.invoke('copy-to-clipboard', text);
  },
  closeResponseWindow: () => {
    ipcRenderer.invoke('close-response-window');
  },
  sendFollowUp: (question) => {
    return ipcRenderer.invoke('send-follow-up', question);
  },
  switchToChat: () => {
    ipcRenderer.invoke('switch-to-chat');
  }
});