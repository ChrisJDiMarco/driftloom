const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('driftloom', {
  saveWorld: (payload) => ipcRenderer.invoke('world:save', payload),
  loadWorld: () => ipcRenderer.invoke('world:load'),
  deleteWorld: () => ipcRenderer.invoke('world:delete'),
  saveSnapshot: (dataUrl) => ipcRenderer.invoke('snapshot:save', dataUrl)
});
