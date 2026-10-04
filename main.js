'use strict';
const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { detect } = require('./src/detector');
const { games, TipBag } = require('./src/tips');
const { readLive, LiveTracker } = require('./src/lol-live');
const { installConversation } = require('./src/conversation-window');
let conversation;
const demo = process.argv.includes('--demo');
let win, tray, configPath, settings = { muted: false, frequency: 6, position: null, size:80, adventures:true }, current = null;
let hidden = false, closing = false, greetingTimer, detectionTimer, liveTimer, lastTip = Date.now(), breakAt = Date.now(), misses = 0, liveFailures = 0;
let hitBoxes = [], dragging = false, ignore = true;
const timers = [], bag = new TipBag(), tracker = new LiveTracker();
const id = game => game ? `${game.key}:${game.appId || ''}` : '';
const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };
function save() { try { fs.writeFileSync(configPath + '.tmp', JSON.stringify(settings)); fs.renameSync(configPath + '.tmp', configPath); } catch (e) { console.error('Could not save settings:', e.message); } }
function state() { return { game: current || { key: 'idle', ...games.idle }, muted: settings.muted, position: settings.position, size:settings.size, adventures:settings.adventures, demo }; }
function speak(text, mood = 'talk') { if (!settings.muted && !hidden) send('message', { text, mood }); }
function tip() { speak(bag.next(current?.key || 'idle')); lastTip = Date.now(); }
function mute() { settings.muted = !settings.muted; if(settings.muted)conversation?.stop(); save(); send('state', state()); refreshMenu(); }
function toggleHidden() { hidden = !hidden; send('clear'); if (hidden) win.hide(); else win.showInactive(); refreshMenu(); }
function corner() { settings.position = null; save(); send('state', state()); }
function loginOptions() { return { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: [] }; }
function menuItems() {
  return [ { label: 'Gael · gaming companion' + (demo ? ' · DEMO' : ''), enabled: false }, { type: 'separator' },
    { label: 'Talk to Gael', accelerator: 'Ctrl+Shift+G', click: () => conversation?.open() },
    {label:'Desktop adventures',type:'checkbox',checked:settings.adventures,click:item=>{settings.adventures=item.checked;save();send('state',state());refreshMenu();}},
    {label:'Try a desktop adventure',enabled:!settings.muted&&settings.adventures,click:()=>send('trick','journey')},
    { label: 'Transform', enabled: !settings.muted, click:()=>send('trick','energy') },
    {label:'Companion size',submenu:[64,80,96].map(n=>({label:`${n} px`,type:'radio',checked:settings.size===n,click:()=>{settings.size=n;save();send('state',state());refreshMenu();}}))},
    { label: 'Give me a tip', accelerator: 'Ctrl+Shift+T', click: tip },
    { label: settings.muted ? 'Wake up' : 'Mute', accelerator: 'Ctrl+Shift+M', click: mute },
    { label: hidden ? 'Show' : 'Hide', accelerator: 'Ctrl+Shift+H', click: toggleHidden },
    { label: 'Automatic tips', submenu: [3, 6, 10, 15].map(n => ({ label: `${n} minutes`, type: 'radio', checked: settings.frequency === n, click: () => { settings.frequency = n; lastTip = Date.now(); save(); refreshMenu(); } })) },
    { label: 'Start with Windows', type: 'checkbox', enabled: app.isPackaged, checked: app.getLoginItemSettings(loginOptions()).openAtLogin, click: item => { app.setLoginItemSettings({ ...loginOptions(), openAtLogin: item.checked }); refreshMenu(); } },
    { label: 'Return to corner', click: corner },
    ...(demo ? [{ label: 'Demo game', submenu: Object.keys(games).filter(k => k !== 'idle').map(key => ({ label: games[key].name, click: () => changeGame({ key, ...games[key] }) })) }, { label: 'Preview state', submenu: ['idle', 'talk', 'happy', 'alert', 'sleep'].map(mood => ({ label: mood, click: () => send('message', { text: `This is my ${mood} state.`, mood }) })) }] : []),
    { type: 'separator' }, { label: 'About Gael', click: () => dialog.showMessageBox({ title: 'Gael 0.6.1 · @bcgnn', message: 'Your gaming companion', detail: 'Use borderless windowed mode. Not certified by Vanguard or EAC. No memory reading or code injection.\n\nGael is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.' }) },
    { label: 'Quit', click: () => app.quit() } ];
}
function refreshMenu() { tray?.setContextMenu(Menu.buildFromTemplate(menuItems())); }
function changeGame(game) {
  if (id(game) === id(current)) return;
  clearTimeout(greetingTimer); send('clear'); const previous = current; current = game; tracker.reset(); liveFailures = 0;
  lastTip = Date.now(); breakAt = Date.now(); send('state', state());
  if (game) { speak(`Let us play ${game.name}! I am here if you need a tip.`, 'happy'); greetingTimer = setTimeout(tip, 9000); }
  else if (previous) speak(`Nice session of ${previous.name}. Time for a break?`, 'happy');
}
async function detectionLoop() {
  if (closing) return;
  try { const game = await detect(); if (game) { misses = 0; changeGame(game); } else if (++misses >= 2) changeGame(null); } catch (e) { console.error(e.message); }
  if (!closing) detectionTimer = setTimeout(detectionLoop, 4000);
}
async function liveLoop() {
  if (closing) return;
  if (current?.key === 'lol' && !demo) {
    const gameId = id(current);
    try { const data = await readLive(); if (gameId === id(current)) { liveFailures = 0; for (const message of tracker.update(data)) speak(message.text, message.mood); } }
    catch { if (++liveFailures >= 5) tracker.reset(); }
  }
  if (!closing) liveTimer = setTimeout(liveLoop, 3000);
}
function setBounds() { const display = screen.getPrimaryDisplay(); win.setBounds(display.bounds); hitBoxes = []; send('bounds'); }
function trusted(event) { return event.sender === win?.webContents && event.senderFrame?.url === pathToFileURL(path.join(__dirname, 'renderer/index.html')).href; }
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { hidden = false; win.showInactive(); refreshMenu(); } });
  app.whenReady().then(() => {
    configPath = path.join(app.getPath('userData'), 'settings.json');
    conversation=installConversation({getGame:()=>current?.name,onActivity:value=>send('activity',value),onAnswer:answer=>{send('clear');speak(answer,'talk');}});
    try { const data = JSON.parse(fs.readFileSync(configPath, 'utf8')); settings.muted = data.muted === true;settings.adventures=data.adventures!==false; if([64,80,96].includes(data.size))settings.size=data.size; if ([3,6,10,15].includes(data.frequency)) settings.frequency = data.frequency; if (Number.isFinite(data.position?.x) && Number.isFinite(data.position?.y)) settings.position = data.position; } catch { /* First run. */ }
    win = new BrowserWindow({ ...screen.getPrimaryDisplay().bounds, transparent: true, frame: false, resizable: false, movable: false, focusable: false, skipTaskbar: true, hasShadow: false, show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
    win.setAlwaysOnTop(true, 'screen-saver'); win.setIgnoreMouseEvents(true, { forward: true }); win.setMenu(null);
    win.on('hide',()=>send('visibility',false));win.on('show',()=>send('visibility',true));
    win.on('minimize',()=>send('visibility',false));win.on('restore',()=>send('visibility',!hidden));
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    win.webContents.on('did-finish-load', () => { send('state', state()); win.showInactive(); if (demo) changeGame({ key: 'lol', ...games.lol }); else { speak('I am Gael. Drag me anywhere and open a game.', 'happy'); detectionLoop(); } liveLoop(); });
    ipcMain.on('ready', event => { if (trusted(event)) send('state', state()); });
    ipcMain.on('tip', event => { if (trusted(event)) tip(); });
    ipcMain.on('chat:open', event => { if (trusted(event)) conversation.open(); });
    ipcMain.on('menu', event => { if (trusted(event)) Menu.buildFromTemplate(menuItems()).popup({ window: win }); });
    ipcMain.on('position', (event, value) => { if (trusted(event) && Number.isFinite(value?.x) && Number.isFinite(value?.y)) { settings.position = { x: Math.round(value.x), y: Math.round(value.y) }; save(); } });
    ipcMain.on('hitboxes', (event, boxes) => { if (trusted(event) && Array.isArray(boxes) && boxes.length <= 2 && boxes.every(b => ['x','y','width','height'].every(k => Number.isFinite(b[k])) && b.width >= 0 && b.height >= 0)) hitBoxes = boxes; });
    ipcMain.on('dragging', (event, value) => { if (trusted(event)) dragging = value === true; });
    const pixels = Buffer.alloc(16 * 16 * 4); for (let y=0;y<16;y++) for(let x=0;x<16;x++) { const i=(y*16+x)*4; const inside=(x-7.5)**2+(y-7.5)**2<55; pixels[i]=255; pixels[i+1]=92; pixels[i+2]=124; pixels[i+3]=inside?255:0; if(y>=6&&y<=8&&(x===5||x===10)) pixels.fill(255,i,i+4); }
    tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 16, height: 16 })); tray.setToolTip('Gael · double-click to show'); tray.on('double-click', () => { hidden = false; win.showInactive(); refreshMenu(); }); refreshMenu();
    const failed = []; for (const [key, fn] of [['T',tip],['M',mute],['H',toggleHidden],['G',()=>conversation.open()]]) if (!globalShortcut.register(`CommandOrControl+Shift+${key}`, fn)) failed.push(key);
    if (failed.length) console.warn('Atajos ocupados:', failed.join(', '));
    timers.push(setInterval(() => { if (current && Date.now()-lastTip >= settings.frequency*60000) tip(); if (current && Date.now()-breakAt >= 3600000) { speak('It has been an hour. Drink some water, stretch and look into the distance for a moment.', 'alert'); breakAt=Date.now(); } },1000));
    timers.push(setInterval(() => {
      if (hidden || win.isDestroyed()) return;
      const point=screen.getCursorScreenPoint(), b=win.getBounds(), x=point.x-b.x, y=point.y-b.y;
      const next=!(dragging || hitBoxes.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height));
      if (ignore!==next) { ignore=next; win.setIgnoreMouseEvents(ignore,{forward:true}); }
    },30));
    screen.on('display-metrics-changed',setBounds); screen.on('display-removed',setBounds);
    win.loadFile(path.join(__dirname,'renderer/index.html'));
  });
  app.on('before-quit',()=>{closing=true;clearTimeout(greetingTimer);clearTimeout(detectionTimer);clearTimeout(liveTimer);timers.forEach(clearTimeout);globalShortcut.unregisterAll();tray?.destroy();});
  app.on('window-all-closed',()=>app.quit());
}
