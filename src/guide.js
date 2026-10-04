'use strict';
const fs=require('node:fs'),net=require('node:net');
function publicUrl(value){try{const u=new URL(value),h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||net.isIP(h)||h.includes(':')||!h.includes('.')||!/^[a-z0-9.-]+$/.test(h)||/(^|\.)(localhost|local|internal|test|invalid)$/.test(h))return null;return u.href;}catch{return null;}}
function profile(v){if(!v||typeof v.game!=='string'||!v.game.trim()||v.game.length>150)throw new Error('Enter a game title (up to 150 characters).');const p={game:v.game.trim(),spoilers:v.spoilers===true};for(const [k,max]of [['platform',120],['progress',1600],['equipment',1600]]){if(v[k]!==undefined&&(typeof v[k]!=='string'||v[k].length>max))throw new Error(`Check the ${k} field.`);p[k]=(v[k]||'').trim();}return p;}
class GuideStore{
 constructor(file){this.file=file;this.data={active:'',games:Object.create(null)};try{const d=JSON.parse(fs.readFileSync(file,'utf8'));if(d.games&&typeof d.games==='object'&&!Array.isArray(d.games))for(const v of Object.values(d.games).slice(0,100)){try{const p=profile(v);this.data.games[this.key(p.game)]={...p,prepared:typeof v.prepared==='string'?v.prepared.slice(0,12000):'',sources:Array.isArray(v.sources)?v.sources.filter(s=>s&&publicUrl(s.url)).slice(0,20):[],history:Array.isArray(v.history)?v.history.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-12).map(m=>({role:m.role,content:m.content.slice(0,6000),sources:Array.isArray(m.sources)?m.sources.filter(s=>s&&publicUrl(s.url)).slice(0,20):[]})):[]};}catch{}}if(typeof d.active==='string'&&Object.hasOwn(this.data.games,d.active))this.data.active=d.active;}catch{}}
 key(game){return game.trim().toLowerCase();}
 current(){return this.data.games[this.data.active]||null;}
 write(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.data));fs.renameSync(this.file+'.tmp',this.file);}
 save(v){const p=profile(v),k=this.key(p.game);if(!Object.hasOwn(this.data.games,k)&&Object.keys(this.data.games).length>=100)throw new Error('Up to 100 games can be saved.');const old=this.data.games[k];this.data.games[k]={...old,...p,prepared:old?.prepared||'',sources:old?.sources||[],history:old?.history||[]};this.data.active=k;this.write();return this.current();}
 remember(history,prepared,sources){const g=this.current();if(!g)return;g.history=history.map((m,i)=>({...m,sources:m.role==='assistant'?(i===history.length-1?sources||[]:(g.history||[]).find(old=>old.role===m.role&&old.content===m.content)?.sources||[]):[]}));if(prepared!==undefined){g.prepared=prepared;g.sources=sources;}this.write();}
 forget(){delete this.data.games[this.data.active];this.data.active='';this.write();}
 list(){return Object.values(this.data.games).map(g=>g.game);}
}
module.exports={GuideStore,profile,publicUrl};
