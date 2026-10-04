'use strict';
const ease=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
function sampleJourney(origin,width,height,size,seconds,variant=0){
 const maxX=Math.max(0,width-size),maxY=Math.max(0,height-size);
 const center={x:maxX/2,y:maxY/2};
 const corners=[{x:0,y:maxY},{x:0,y:0},{x:maxX,y:0},{x:maxX,y:maxY}];
 if(variant>=.5)corners.reverse();
 const leg=(a,b,t,smooth=false)=>({x:mix(a.x,b.x,smooth?ease(t):t),y:mix(a.y,b.y,smooth?ease(t):t),scale:1,tilt:0,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI});
 let result;
 if(seconds<.45)result={...leg(origin,corners[0],Math.max(0,seconds)/.45,true),phase:'launch'};
 else if(seconds<3.05){const t=(seconds-.45)/.65,i=Math.min(3,Math.floor(t));result={...leg(corners[i],corners[(i+1)%4],t-i),phase:'dash'};}
 else if(seconds<3.85){result={...leg(corners[0],center,(seconds-3.05)/.8,true),phase:'approach'};}
 else if(seconds<5.35){const t=(seconds-3.85)/1.5;result={...center,scale:1+1.25*Math.sin(Math.PI*t)**2,tilt:Math.sin(t*Math.PI*6)*5,angle:0,phase:'escape'};}
 else if(seconds<7){result={...leg(center,origin,(seconds-5.35)/1.65,true),phase:'return'};}
 else return {...origin,scale:1,tilt:0,phase:'home',done:true};
 return {...result,done:false};
}
class GaelJourney {
 constructor({canRun,origin,viewport,show,home,random=Math.random,later=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id),frame=fn=>requestAnimationFrame(fn),unframe=id=>cancelAnimationFrame(id),now=()=>performance.now()}){Object.assign(this,{canRun,origin,viewport,show,home,random,later,cancel,frame,unframe,now});this.timer=null;this.raf=null;this.running=false;this.disposed=false;this.variant=0;}
 schedule(delay=20000){this.cancel(this.timer);if(!this.disposed)this.timer=this.later(()=>this.start(),delay);}
 start(){if(this.disposed||this.running)return false;if(!this.canRun()){this.schedule();return false;}this.cancel(this.timer);this.anchor={...this.origin()};this.variant=this.random();this.started=this.now();this.running=true;this.tick();return true;}
 tick(){if(!this.running||this.disposed)return;if(!this.canRun()){this.interrupt();return;}const v=this.viewport(),p=sampleJourney(this.anchor,v.width,v.height,v.size,(this.now()-this.started)/1000,this.variant);if(p.done){this.running=false;this.home(this.anchor);this.schedule();return;}this.show(p);this.raf=this.frame(()=>this.tick());}
 interrupt(){this.cancel(this.timer);this.unframe(this.raf);const was=this.running;this.running=false;if(was)this.home(this.anchor);if(!this.disposed)this.schedule();}
 dispose(){this.disposed=true;this.cancel(this.timer);this.unframe(this.raf);this.running=false;}
}
if(typeof module!=='undefined')module.exports={GaelJourney,sampleJourney};else window.GaelJourney=GaelJourney;
