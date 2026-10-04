const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gael', {
  onVisibility:fn=>ipcRenderer.on('visibility',(_event,value)=>fn(value)),
  chat: () => ipcRenderer.send('chat:open'), onActivity: fn => ipcRenderer.on('activity', (_event, value) => fn(value)),
  ready: () => ipcRenderer.send('ready'), tip: () => ipcRenderer.send('tip'), menu: () => ipcRenderer.send('menu'),
  position: value => ipcRenderer.send('position', value), hitboxes: value => ipcRenderer.send('hitboxes', value), dragging: value => ipcRenderer.send('dragging', value),
  onState: fn => ipcRenderer.on('state', (_event, value) => fn(value)), onMessage: fn => ipcRenderer.on('message', (_event, value) => fn(value)),
  onTrick: fn => ipcRenderer.on('trick', (_event, value) => fn(value)),
  onClear: fn => ipcRenderer.on('clear', () => fn()), onBounds: fn => ipcRenderer.on('bounds', () => fn())
});
