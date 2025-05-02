const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startChats: (data) => ipcRenderer.send('start-chats', data),
  onLoadSavedData: (callback) => ipcRenderer.on('load-saved-data', (event, data) => callback(data))
});
