const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('conversation',{
  saveGuide:value=>ipcRenderer.invoke('chat:guide-save',value), selectGuide:value=>ipcRenderer.invoke('chat:guide-select',value), forgetGuide:()=>ipcRenderer.invoke('chat:guide-forget'), prepare:()=>ipcRenderer.invoke('chat:prepare'), openSource:value=>ipcRenderer.invoke('chat:open-source',value),
  config:()=>ipcRenderer.invoke('chat:config'), save:value=>ipcRenderer.invoke('chat:save',value), forget:()=>ipcRenderer.invoke('chat:forget'),
  ask:value=>ipcRenderer.invoke('chat:ask',value), transcribe:value=>ipcRenderer.invoke('chat:transcribe',value),
  cancel:()=>ipcRenderer.send('chat:cancel'), reset:()=>ipcRenderer.send('chat:reset'),
  microphone:value=>ipcRenderer.invoke('chat:microphone',value),
  activity:value=>ipcRenderer.send('chat:activity',value),
  onStop:fn=>ipcRenderer.on('chat:stop',()=>fn())
});
