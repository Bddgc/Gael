const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV, identify } = require('../src/detector');
const { games, TipBag } = require('../src/tips');
const { LiveTracker } = require('../src/lol-live');
test('Windows CSV supports commas and quotes in titles',()=>{assert.deepEqual(parseCSV('"javaw.exe","12","Minecraft, ""World"""\r\n'),[['javaw.exe','12','Minecraft, "World"']]);});
test('detects game processes without matching generic Java',()=>{
  for(const [exe,key] of [['League of Legends.exe','lol'],['LeagueClientUx.exe','lol'],['VALORANT-Win64-Shipping.exe','valorant'],['cs2.exe','cs2'],['FortniteClient-Win64-Shipping.exe','fortnite'],['RobloxPlayerBeta.exe','roblox'],['Minecraft.Windows.exe','minecraft']])assert.equal(identify([[exe]])?.key,key);
  assert.equal(identify([['javaw.exe','Editor']]),null);assert.equal(identify([['javaw.exe','Minecraft 1.21']]).key,'minecraft');
  assert.equal(identify([],730).key,'cs2');assert.equal(identify([],1234).appId,1234);assert.equal(identify([],0),null);
  assert.equal(identify([['LeagueClientUx.exe'],['cs2.exe']]).key,'cs2');
});
test('tips do not repeat within or across cycles',()=>{const bag=new TipBag(()=>0.3);for(const key of Object.keys(games)){const count=games[key].tips.length;const cycle=Array.from({length:count},()=>bag.next(key));assert.equal(new Set(cycle).size,count);assert.notEqual(bag.next(key),cycle.at(-1));}});
function sample(time,events=[],extra={}) {return {gameData:{gameTime:time,mapName:'Map11'},activePlayer:{riotId:'Gael#LAN',currentGold:0},allPlayers:[{riotId:'Gael#LAN',summonerName:'Gael',championName:'Ahri',isDead:false,...extra}],events:{Events:events}};}
test('joins mid-game without narrating old events',()=>{const t=new LiveTracker();const old={EventID:1,EventTime:10,EventName:'DragonKill',DragonType:'Fire'};assert.equal(t.update(sample(600,[old])).length,1);assert.deepEqual(t.update(sample(603,[old])),[]);const kill={EventID:2,EventTime:604,EventName:'Multikill',KillerName:'Gael#LAN',KillStreak:3};assert.match(t.update(sample(606,[old,kill]))[0].text,/Multikill/);assert.deepEqual(t.update(sample(609,[old,kill])),[]);});
test('death once, gold cooldown, and match reset',()=>{const t=new LiveTracker();t.update(sample(0));assert.match(t.update(sample(3,[],{isDead:true,respawnTimer:8}))[0].text,/8 s/);assert.deepEqual(t.update(sample(6,[],{isDead:true})),[]);let d=sample(121);d.activePlayer.currentGold=1400;assert.match(t.update(d)[0].text,/1300/);d=sample(124);d.activePlayer.currentGold=1400;assert.deepEqual(t.update(d),[]);assert.match(t.update(sample(0))[0].text,/Ahri/);});
test('objectives, game end, and victory are emitted once',()=>{const t=new LiveTracker();t.update(sample(260));assert.match(t.update(sample(271))[0].text,/4:30/);const events=['DragonKill','BaronKill','InhibKilled','Ace','GameEnd'].map((EventName,i)=>({EventName,EventID:i,EventTime:280,Result:'Win'}));const out=t.update(sample(281,events));assert.equal(out.length,5);assert.match(out.at(-1).text,/Victory/);assert.deepEqual(t.update(sample(285,events)),[]);});
test('incomplete data does not break the tracker',()=>{const t=new LiveTracker();assert.deepEqual(t.update({}),[]);assert.deepEqual(t.update({gameData:{gameTime:10},activePlayer:{},allPlayers:[]}),[]);});
