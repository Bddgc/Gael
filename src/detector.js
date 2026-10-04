'use strict';
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const { games } = require('./tips');
function parseCSV(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map(line => {
    const cells = []; let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
      else if (line[i] === ',' && !quoted) { cells.push(cell); cell = ''; } else cell += line[i];
    }
    cells.push(cell); return cells;
  });
}
function identify(rows, appId = 0) {
  const names = new Set(rows.map(r => r[0].toLowerCase()));
  const matches = [ ['lol', ['league of legends.exe']], ['valorant', ['valorant-win64-shipping.exe']], ['cs2', ['cs2.exe']], ['fortnite', ['fortniteclient-win64-shipping.exe']], ['cuphead', ['cuphead.exe']], ['roblox', ['robloxplayerbeta.exe']], ['minecraft', ['minecraft.windows.exe']] ];
  let key = matches.find(([, exes]) => exes.some(e => names.has(e)))?.[0];
  if (!key && rows.some(r => r[0].toLowerCase() === 'javaw.exe' && /minecraft/i.test(r.at(-1)))) key = 'minecraft';
  if (!key && appId > 0) key = appId === 730 ? 'cs2' : 'steam';
  if (!key && names.has('leagueclientux.exe')) key = 'lol';
  return key ? { key, ...games[key], appId: key === 'steam' ? appId : undefined } : null;
}
const cache = new Map();
async function detect() {
  if (process.platform !== 'win32') return null;
  const [processes, registry] = await Promise.allSettled([
    run('tasklist.exe', ['/FO', 'CSV', '/NH', '/V'], { windowsHide: true, timeout: 3500, maxBuffer: 8 * 1024 * 1024 }),
    run('reg.exe', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'RunningAppID'], { windowsHide: true, timeout: 2500 })
  ]);
  if (processes.status !== 'fulfilled') throw new Error('No se pudo consultar la lista de procesos.');
  const value = registry.status === 'fulfilled' ? registry.value.stdout.match(/RunningAppID\s+REG_DWORD\s+(0x[\da-f]+|\d+)/i)?.[1] : 0;
  const game = identify(parseCSV(processes.value.stdout), Number(value || 0));
  if (game?.key === 'steam') {
    let entry = cache.get(game.appId);
    if (!entry || entry.until < Date.now()) {
      let name = `Steam game ${game.appId}`;
      let ok = false;
      try {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${game.appId}&filters=basic`, { signal: AbortSignal.timeout(2500) });
        const data = (await response.json())[game.appId];
        if (data?.success && typeof data.data?.name === 'string') { name = data.data.name; ok = true; }
      } catch { /* Offline: retain detection by AppID. */ }
      entry = { name, until: Date.now() + (ok ? 86400000 : 60000) }; cache.set(game.appId, entry);
    }
    game.name = entry.name;
  }
  return game;
}
module.exports = { detect, identify, parseCSV };
