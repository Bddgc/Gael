'use strict';
// A bounded, live plasma renderer. The atlas is deformed in small scanlines;
// procedural filaments and particles flow independently around its silhouette.
class GaelCosmos {
  constructor(canvas,{host=canvas.parentElement}={}) {
    this.canvas=canvas;this.host=host;this.ctx=canvas.getContext('2d',{alpha:true});
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.form=Number(host.dataset.form)||0;this.previous=this.form;
    this.time=0;this.morph=2;this.last=0;this.raf=0;this.lastPaint=0;this.speed=1;this.disposed=false;
    this.image=new Image();this.image.onload=()=>this.sync();this.image.src='../assets/gael-energy-atlas.png';
    this.onChange=()=>this.sync();this.onVisibility=()=>this.sync();
    this.motion.addEventListener('change',this.onChange);document.addEventListener('visibilitychange',this.onVisibility);
    this.observer=new MutationObserver(()=>{const next=Number(host.dataset.form)||0;if(next!==this.form){this.previous=this.form;this.form=next;this.morph=0;}this.sync();});
    this.observer.observe(host,{attributes:true,attributeFilter:['data-form','data-mood','data-dragging','data-hidden']});
    this.resizeObserver=new ResizeObserver(()=>this.sync());this.resizeObserver.observe(canvas);
  }
  moving(){return !this.motion.matches&&!document.hidden&&this.host.dataset.hidden!=='true'&&this.host.dataset.mood!=='sleep'&&this.host.dataset.dragging!=='true';}
  sync(){if(this.disposed||!this.image.complete||!this.image.naturalWidth)return;cancelAnimationFrame(this.raf);this.raf=0;this.last=0;this.lastPaint=0;if(!this.moving()){this.morph=2;this.paint();return;}this.raf=requestAnimationFrame(t=>this.frame(t));}
  frame(now){if(this.disposed||!this.moving())return;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;const mood=this.host.dataset.mood;const target=mood==='talk'?1.5:mood==='happy'?1.2:1;this.speed+=(target-this.speed)*Math.min(1,dt*4);this.time+=dt*this.speed;this.morph+=dt;
    if(now-this.lastPaint>=1000/30){this.paint();this.lastPaint=now;}
    this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  paint(){const box=this.canvas.getBoundingClientRect(),size=Math.max(1,this.canvas.clientWidth||box.width),ratio=Math.min(devicePixelRatio||1,2);const pixels=Math.round(size*ratio);if(this.canvas.width!==pixels||this.canvas.height!==pixels){this.canvas.width=pixels;this.canvas.height=pixels;}
    const ctx=this.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);if(!size)return;
    const live=this.moving(),t=this.time,s=size/80,c=size/2,phase=live?Math.sin(t*.83):0;
    ctx.save();ctx.translate(c,c);ctx.scale(s,s);ctx.globalAlpha=this.host.dataset.mood==='sleep'?.4:1;
    const halo=ctx.createRadialGradient(0,0,4,0,0,36);halo.addColorStop(0,'rgba(104,123,255,.12)');halo.addColorStop(.5,'rgba(55,173,255,.075)');halo.addColorStop(1,'rgba(20,40,90,0)');ctx.fillStyle=halo;ctx.fillRect(-40,-40,80,80);
    const blend=this.motion.matches||!live?1:Math.min(1,this.morph/1.25),smooth=blend*blend*(3-2*blend);
    if(smooth<1)this.sprite(this.previous,1-smooth,t,live,-1);
    this.sprite(this.form,smooth,t,live,1);
    ctx.globalCompositeOperation='screen';
    for(let k=0;k<3;k++){
      ctx.beginPath();for(let j=0;j<=45;j++){const a=j/45*Math.PI*1.55+t*(.33+k*.08)+k*2.1;const r=24+3*Math.sin(a*2+t*.85+k);const x=Math.cos(a)*r,y=Math.sin(a)*r*.53+phase*2;const rot=.55+k*.82;const px=x*Math.cos(rot)-y*Math.sin(rot),py=x*Math.sin(rot)+y*Math.cos(rot);j?ctx.lineTo(px,py):ctx.moveTo(px,py);}
      ctx.strokeStyle=k%2?'rgba(166,112,255,.32)':'rgba(88,226,255,.3)';ctx.lineWidth=.55;ctx.stroke();
    }
    for(let k=0;k<14;k++){const a=t*(.28+(k%4)*.075)+k*2.39996,r=25+(k%4)*2;const x=Math.cos(a)*r,y=Math.sin(a)*r*.67;const pulse=.35+.35*(.5+.5*Math.sin(t*1.4+k));ctx.fillStyle=k%3?'rgba(109,223,255,'+pulse+')':'rgba(201,155,255,'+pulse+')';ctx.beginPath();ctx.arc(x,y,k%5===0?1:.55,0,Math.PI*2);ctx.fill();}
    if(smooth<1){ctx.strokeStyle='rgba(171,226,255,'+Math.sin(smooth*Math.PI)*.35+')';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,0,8+smooth*26,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  sprite(form,alpha,t,live,direction){if(alpha<=0)return;const ctx=this.ctx,w=this.image.naturalWidth/2,h=this.image.naturalHeight/2,sx=(form%2)*w,sy=Math.floor(form/2)*h;
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(live?Math.sin(t*.67)*1.6:0,live?Math.cos(t*.83)*1.8:0);ctx.rotate(live?Math.sin(t*.43)*.035:0);const breathe=live?1+Math.sin(t*1.35)*.018:1;ctx.scale(breathe,breathe);
    const count=48,span=65;
    for(let i=0;i<count;i++){const y=i/count*span-span/2;const wave=live?(Math.sin(y*.14+t*1.75)+Math.sin(y*.065-t*1.12))*.65:0;const dissolve=this.morph<1.25&&live?(1-alpha)*Math.sin(y*.12-t*2)*3*direction:0;ctx.drawImage(this.image,sx,sy+i/count*h,w,h/count,-span/2+wave+dissolve,y,span,span/count+.2);}
    ctx.restore();
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.image.onload=null;this.observer.disconnect();this.resizeObserver.disconnect();this.motion.removeEventListener('change',this.onChange);document.removeEventListener('visibilitychange',this.onVisibility);}
}
window.GaelCosmos=GaelCosmos;
