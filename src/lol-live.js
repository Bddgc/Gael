'use strict';
const https = require('node:https');
function readLive() {
  return new Promise((resolve, reject) => {
    // TLS exception limited to this loopback request: Riot uses a local certificate.
    const request = https.get({ hostname: '127.0.0.1', port: 2999, path: '/liveclientdata/allgamedata', rejectUnauthorized: false, timeout: 2000 }, response => {
      let body = '';
      if (response.statusCode !== 200) { response.resume(); reject(new Error('Partida no disponible')); return; }
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; if (body.length > 4e6) request.destroy(new Error('Response demasiado grande')); });
      response.on('error', reject);
      response.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    request.on('timeout', () => request.destroy(new Error('Tiempo de espera agotado')));
    request.on('error', reject);
  });
}
class LiveTracker {
  constructor() { this.reset(); }
  reset() { this.time = null; this.seen = new Set(); this.goldAt = -Infinity; this.dead = false; this.ended = false; }
  update(data) {
    const time = data?.gameData?.gameTime;
    if (!Number.isFinite(time) || !data.activePlayer || !Array.isArray(data.allPlayers)) return [];
    if (this.time !== null && time < this.time - 10) this.reset();
    const active = data.activePlayer;
    const aliases = [active.riotId, active.summonerName].filter(Boolean);
    const me = data.allPlayers.find(p => aliases.includes(p.riotId) || aliases.includes(p.summonerName));
    if (!me) return [];
    const isMe = name => Boolean(name) && [me.riotId, me.summonerName, ...aliases].includes(name);
    const events = data.events?.Events || [];
    const out = [], say = (text, mood = 'alert') => out.push({ text, mood });
    if (this.time === null) {
      events.forEach(e => this.seen.add(e.EventID)); this.time = time; this.dead = Boolean(me.isDead); this.goldAt = time;
      this.ended = events.some(e => e.EventName === 'GameEnd');
      if (!this.ended) say(`You're playing ${me.championName || 'your champion'}. Let us go!`, 'happy');
      return out;
    }
    if (this.ended) return [];
    if (data.gameData.mapName === 'Map11' && this.time < 270 && time >= 270 && time < 300) say('4:30. Check the dragon timer and river vision.');
    if (me.isDead && !this.dead) say(`Take a breath. You respawn in about ${Math.ceil(me.respawnTimer || 0)} s; check the shop and map.`);
    if (!me.isDead && active.currentGold >= 1300 && time - this.goldAt >= 120) { say('You have at least 1300 gold. Consider shopping when it is safe.'); this.goldAt = time; }
    for (const e of events) {
      if (this.seen.has(e.EventID)) continue;
      this.seen.add(e.EventID);
      if (e.EventTime < this.time - 5) continue;
      if (e.EventName === 'FirstBlood' && isMe(e.Recipient)) say('First blood is yours!', 'happy');
      if (e.EventName === 'Multikill' && isMe(e.KillerName)) say(`Multikill of ${e.KillStreak}! Well played.`, 'happy');
      if (e.EventName === 'ChampionKill' && isMe(e.KillerName)) say('Nice takedown! Breathe and check your position.', 'happy');
      if (e.EventName === 'DragonKill') say(`${e.DragonType || ''} dragon defeated. Check the timer for the next one.`);
      if (e.EventName === 'BaronKill') say('Baron defeated. Check who has the buff and the lane states.');
      if (e.EventName === 'InhibKilled') say('An inhibitor fell. Check wave pressure.');
      if (e.EventName === 'Ace') say('Ace! Check the map and respawn times.');
      if (e.EventName === 'GameEnd') { say(e.Result === 'Win' ? 'Victory! Good game, team.' : 'Game over. Take a break and remember something you learned.', e.Result === 'Win' ? 'happy' : 'talk'); this.ended = true; }
    }
    this.time = time; this.dead = Boolean(me.isDead); return out;
  }
}
module.exports = { readLive, LiveTracker };
