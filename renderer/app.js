'use strict';
const api = window.gael;
const pet = document.querySelector('#pet'), bubble = document.querySelector('#bubble'), text = document.querySelector('#text');
let petSize=80; let pos={x:innerWidth-104,y:innerHeight-120}, muted=false, gameKey=null, queue=[], active=false, typing, dismiss, drag=null, moved=false;
let assistantActivity='idle',adventures=true;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const journey=new window.GaelJourney({canRun:()=>adventures&&!muted&&!active&&!drag&&assistantActivity==='idle'&&pet.dataset.hidden!=='true'&&!document.hidden&&!motion.matches,origin:()=>pos,viewport:()=>({width:innerWidth,height:innerHeight,size:petSize}),show:p=>{pet.dataset.journey=p.phase;pet.style.setProperty('--flight-angle',p.angle+'deg');pet.style.left=p.x+'px';pet.style.top=p.y+'px';pet.style.transform=`scale(${p.scale}) rotate(${p.tilt}deg)`;boxes();},home:()=>{delete pet.dataset.journey;pet.style.transform='';layout();}});
journey.schedule(20000);
motion.addEventListener('change',()=>journey.interrupt());
document.addEventListener('visibilitychange',()=>{if(document.hidden)journey.interrupt();});

const cosmos=new window.GaelCosmos(pet.querySelector('.cosmos'),{host:pet});
api?.onVisibility(value=>{pet.dataset.hidden=String(value===false);if(value===false)journey.interrupt();});
let form=0,morphTimer;
function transmute(){form=(form+1+Math.floor(Math.random()*3))%4;pet.dataset.form=String(form);pet.classList.remove('transmuting');void pet.offsetWidth;pet.classList.add('transmuting');clearTimeout(morphTimer);morphTimer=setTimeout(()=>pet.classList.remove('transmuting'),1250);}
window.addEventListener('pagehide',()=>{journey.dispose();cosmos.dispose();clearTimeout(morphTimer);clearInterval(typing);clearTimeout(dismiss);});
api?.onTrick(name=>{if(assistantActivity!=='idle'||muted||drag)return;if(name==='journey'){journey.start();return;}clear();transmute();});
const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
function rect(el){const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}
function boxes(){api?.hitboxes([rect(pet),...(!bubble.hidden?[rect(bubble)]:[])]);}
function layout(){
  pos.x=clamp(pos.x,0,innerWidth-petSize);pos.y=clamp(pos.y,0,innerHeight-petSize);pet.style.left=pos.x+'px';pet.style.top=pos.y+'px';
  if(!bubble.hidden){bubble.style.width=Math.min(300,innerWidth-16)+'px';const b=bubble.getBoundingClientRect();const below=pos.y-b.height-14<8;const x=clamp(pos.x+petSize/2-b.width+35,8,innerWidth-b.width-8);bubble.style.left=x+'px';bubble.style.top=clamp(below?pos.y+petSize+14:pos.y-b.height-14,8,innerHeight-b.height-8)+'px';bubble.classList.toggle('below',below);bubble.style.setProperty('--tail',clamp(pos.x+petSize/2-x,20,b.width-25)+'px');}boxes();
}
function clear(){journey.interrupt();clearInterval(typing);clearTimeout(dismiss);queue=[];active=false;bubble.hidden=true;pet.dataset.mood=muted?'sleep':'idle';boxes();}
function next(){
  if(active||!queue.length||muted)return;
  journey.interrupt();const message=queue.shift();active=true;pet.dataset.mood=message.mood||'talk';bubble.hidden=false;
  const chars=Array.from(String(message.text).slice(0,450));let n=0;text.textContent=chars.join('');layout();const height=bubble.getBoundingClientRect().height;bubble.style.minHeight=height+'px';text.textContent='';
  typing=setInterval(()=>{text.textContent=chars.slice(0,++n).join('');if(n>=chars.length)clearInterval(typing);},22);
  dismiss=setTimeout(close,clamp(chars.length*55,5000,14000));
}
function close(){clearInterval(typing);clearTimeout(dismiss);bubble.hidden=true;bubble.style.minHeight='';active=false;pet.dataset.mood=muted?'sleep':'idle';boxes();journey.schedule();next();}
bubble.addEventListener('click',close);
pet.addEventListener('pointerdown',e=>{if(e.button!==0)return;journey.interrupt();pet.dataset.dragging='true';drag={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y};moved=false;pet.setPointerCapture(e.pointerId);api?.dragging(true);});
pet.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;pos={x:drag.px+dx,y:drag.py+dy};layout();});
function stop(){if(!drag)return;drag=null;pet.dataset.dragging='false';api?.dragging(false);api?.position(pos);journey.schedule();}
pet.addEventListener('pointerup',stop);pet.addEventListener('pointercancel',stop);pet.addEventListener('lostpointercapture',stop);window.addEventListener('blur',stop);
pet.addEventListener('dblclick',()=>{if(!moved){journey.interrupt();transmute();api?.chat();}});
api?.onActivity(value=>{if(value!=='idle')journey.interrupt();if(value==='thinking'&&assistantActivity!=='thinking')transmute();assistantActivity=value;if(value==='idle')journey.schedule();pet.dataset.mood=muted?'sleep':value==='talk'?'talk':value==='listening'?'happy':'idle';document.querySelector('#badge').textContent=value==='listening'?'LISTENING':value==='thinking'?'THINKING':'GAEL';});
document.addEventListener('contextmenu',e=>{e.preventDefault();journey.interrupt();api?.menu();});
window.addEventListener('resize',()=>{journey.interrupt();layout();});
api?.onState(state=>{journey.interrupt();adventures=state.adventures!==false;petSize=[64,80,96].includes(state.size)?state.size:80;document.documentElement.style.setProperty('--pet-size',petSize+'px');const changed=gameKey!==state.game.key;gameKey=state.game.key;muted=state.muted;if(muted||changed)clear();document.documentElement.style.setProperty('--accent',state.game.color);document.documentElement.style.setProperty('--dark',`color-mix(in srgb, ${state.game.color} 40%, #111527)`);document.querySelector('#game').textContent=state.game.name.toUpperCase();document.querySelector('#context').textContent=state.demo?'DEMO MODE':'BY YOUR SIDE';pet.dataset.mood=muted?'sleep':active?pet.dataset.mood:'idle';pos=state.position||{x:innerWidth-petSize-24,y:innerHeight-petSize-40};layout();});
api?.onMessage(message=>{if(muted)return;if(queue.length>=4)queue.shift();queue.push(message);next();});api?.onClear(clear);api?.onBounds(()=>{journey.interrupt();layout();});api?.ready();layout();
if(!api){queue.push({text:'I am Gael. Your tiny lightning companion. Drag me anywhere and double-click to talk.',mood:'happy'});next();}
