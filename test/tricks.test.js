const {test}=require('node:test'),assert=require('node:assert/strict');
const GaelTricks=require('../renderer/tricks');
function setup(){
  const tasks=new Map(),shown=[];let id=0,allowed=true;
  const tricks=new GaelTricks({canRun:()=>allowed,show:x=>shown.push(x),random:()=>0,later:(fn,delay)=>{tasks.set(++id,{fn,delay});return id;},cancel:n=>tasks.delete(n)});
  return {tricks,tasks,shown,block:()=>allowed=false,run(){const [key,task]=tasks.entries().next().value;tasks.delete(key);task.fn();}};
}
test('idle scenes finish and the next random scene is different',()=>{const h=setup();h.tricks.schedule(8000);h.run();assert.equal(h.tricks.current,'butterfly');assert.equal([...h.tasks.values()][0].delay,7200);h.run();assert.equal(h.tricks.current,null);assert.equal([...h.tasks.values()][0].delay,18000);h.run();assert.equal(h.tricks.current,'katana');});
test('busy, muted, hidden or dragging guard prevents a scene',()=>{const h=setup();h.block();assert.equal(h.tricks.play('mask'),false);assert.deepEqual(h.shown,[]);assert.equal(h.tasks.size,1);});
test('interrupt removes the prop and cancels its old finish callback',()=>{const h=setup();h.tricks.play('katana');h.tricks.interrupt();assert.equal(h.tricks.current,null);assert.equal(h.shown.at(-1),null);assert.equal(h.tasks.size,1);assert.equal([...h.tasks.values()][0].delay,18000);});
test('manual scene selection validates names and does not overlap',()=>{const h=setup();assert.equal(h.tricks.play('invalid'),false);assert.equal(h.tasks.size,0);assert.equal(h.tricks.play('mask'),true);assert.equal(h.tricks.play('katana'),false);assert.equal(h.tricks.current,'mask');});
test('disposing clears timers and prevents restarting',()=>{const h=setup();h.tricks.play();h.tricks.dispose();h.tricks.schedule();h.tricks.play('mask');assert.equal(h.tasks.size,0);assert.equal(h.tricks.current,null);});
