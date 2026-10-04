'use strict';
const {app,BrowserWindow,ipcMain,safeStorage,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {Assistant}=require('./assistant');
const {GuideStore,publicUrl}=require('./guide');
function installConversation({getGame,onActivity,onAnswer}) {
  let chat=null,microphoneUntil=0,key='',model='gpt-4.1-mini';
  const page=path.join(__dirname,'../renderer/chat.html'),url=pathToFileURL(page).href;
  const file=path.join(app.getPath('userData'),'assistant.json');
  const validModel=value=>typeof value==='string'&&/^[a-zA-Z0-9._:-]{1,80}$/.test(value);
  try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(validModel(data.model))model=data.model;if(data.key&&safeStorage.isEncryptionAvailable())key=safeStorage.decryptString(Buffer.from(data.key,'base64'));}catch{/* No valid settings. */}
  const guides=new GuideStore(path.join(app.getPath('userData'),'guides.json'));
  const assistant=new Assistant({getKey:()=>key,getModel:()=>model,getGame,getGuide:()=>guides.current()});
  assistant.history=(guides.current()?.history||[]).map(({role,content})=>({role,content}));
  function trusted(event){return chat&&!chat.isDestroyed()&&event.sender===chat.webContents&&event.senderFrame===chat.webContents.mainFrame&&event.senderFrame.url===url;}
  function handle(name,fn){ipcMain.handle(`chat:${name}`,async(event,value)=>{if(!trusted(event))return{ok:false,error:'Unauthorized window.'};try{return{ok:true,value:await fn(value)};}catch(error){return{ok:false,error:error.message};}});}
  function write(nextKey,nextModel){
    if(nextKey&&!safeStorage.isEncryptionAvailable())throw new Error('Windows cannot encrypt the key right now.');
    const data={model:nextModel,key:nextKey?safeStorage.encryptString(nextKey).toString('base64'):''};
    fs.writeFileSync(file+'.tmp',JSON.stringify(data));fs.renameSync(file+'.tmp',file);
    key=nextKey;model=nextModel;
  }
  handle('config',()=>({hasKey:Boolean(key),model,guide:guides.current(),games:guides.list(),detectedGame:getGame()||''}));
  handle('guide-save',value=>{if(assistant.controller)throw new Error('Wait for the current request to finish.');const old=guides.data.active;const guide=guides.save(value);if(old!==guides.data.active){assistant.reset();assistant.history=(guide.history||[]).map(({role,content})=>({role,content}));}return {guide,games:guides.list()};});
  handle('guide-select',value=>{if(assistant.controller)throw new Error('Wait for the current request to finish.');const k=typeof value==='string'?guides.key(value):'';if(!Object.hasOwn(guides.data.games,k))return null;guides.data.active=k;guides.write();assistant.reset();assistant.history=(guides.current().history||[]).map(({role,content})=>({role,content}));return guides.current();});
  handle('guide-forget',()=>{if(assistant.controller)throw new Error('Wait for the current request to finish.');guides.forget();assistant.reset();return true;});
  handle('open-source',async value=>{const url=publicUrl(value);if(!url)throw new Error('Only public HTTPS source links are allowed.');await shell.openExternal(url);return true;});
  handle('save',value=>{if(!validModel(value?.model)||typeof value?.key!=='string'||value.key.length>512||/[\r\n\s]/.test(value.key))throw new Error('Check the model and API key.');if(assistant.controller)throw new Error('Wait for the request to finish.');write(value.key||key,value.model);assistant.reset();return true;});
  handle('forget',()=>{assistant.reset();write('',model);return true;});
  handle('microphone',enabled=>{microphoneUntil=enabled===true?Date.now()+45000:0;return true;});
  async function answer(value,prepare=false){const text=await assistant.ask(value,{prepare});let saveWarning='';try{guides.remember(assistant.history,prepare?text:undefined,assistant.lastSources);}catch{saveWarning='The answer is ready, but could not be saved locally.';}onAnswer(text);return{text,sources:assistant.lastSources,saveWarning};}
  handle('ask',value=>answer(value));
  handle('prepare',()=>{if(!guides.current())throw new Error('Save a game profile first.');return answer('Prepare my walkthrough for this game using my current progress and equipment.',true);});
  handle('transcribe',value=>assistant.transcribe(value));
  ipcMain.on('chat:cancel',event=>{if(trusted(event)){microphoneUntil=0;assistant.cancel();onActivity('idle');}});
  ipcMain.on('chat:reset',event=>{if(trusted(event)){assistant.reset();try{guides.remember([]);}catch{}}});
  ipcMain.on('chat:activity',(event,value)=>{if(trusted(event)&&['idle','talk','thinking','listening'].includes(value))onActivity(value);});
  function stop(){microphoneUntil=0;assistant.cancel();if(chat&&!chat.isDestroyed())chat.webContents.send('chat:stop');onActivity('idle');}
  function open(){
    if(chat&&!chat.isDestroyed()){chat.show();chat.focus();return;}
    chat=new BrowserWindow({width:540,height:820,minWidth:410,minHeight:600,title:'Gael · Your gaming companion',backgroundColor:'#090e1c',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'../chat-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'gael-conversation'}});
    const allowed=wc=>wc===chat?.webContents&&wc.getURL()===url&&Date.now()<microphoneUntil;
    chat.webContents.session.setPermissionCheckHandler((wc,permission,_origin,details)=>permission==='media'&&allowed(wc)&&details.mediaType==='audio');
    chat.webContents.session.setPermissionRequestHandler((wc,permission,callback,details)=>callback(permission==='media'&&allowed(wc)&&details.mediaTypes?.length===1&&details.mediaTypes[0]==='audio'));
    chat.webContents.setWindowOpenHandler(()=>({action:'deny'}));chat.webContents.on('will-navigate',event=>event.preventDefault());
    chat.on('close',stop);chat.on('closed',()=>{chat=null;assistant.reset();assistant.history=(guides.current()?.history||[]).map(({role,content})=>({role,content}));});
    chat.webContents.on('render-process-gone',stop);
    chat.loadFile(page);
  }
  app.on('before-quit',stop);
  return{open,stop};
}
module.exports={installConversation};
