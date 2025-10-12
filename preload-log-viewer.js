const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  getRecentLogs: (lines) => ipcRenderer.invoke('get-recent-logs', lines),
  openPath: (path) => shell.openPath(path)
});