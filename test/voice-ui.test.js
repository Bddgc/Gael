const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../renderer/chat.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function harness(getMedia){
  const elements=new Map(),events={},calls={stops:0,transcriptions:0,questions:0,permissions:[]};
  const make=()=>({value:'',checked:true,hidden:false,textContent:'',classList:{toggle(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},append(){},replaceChildren(){},focus(){}});
  const el=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
  const stream={getTracks:()=>[{stop(){calls.stops++;}}]};
  class Recorder{static isTypeSupported(){return true;}constructor(){this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob([new Uint8Array(500)])});this.onstop();}}
  const bridge={config:async()=>({ok:true,value:{hasKey:true,model:'gpt-4.1-mini'}}),microphone:async value=>{calls.permissions.push(value);return{ok:true};},activity(){},cancel(){},reset(){},onStop(fn){events.stop=fn;},transcribe:async()=>{calls.transcriptions++;return{ok:true,value:'Question transcrita'};},ask:async()=>{calls.questions++;return{ok:true,value:'Response'};}};
  const context={window:{conversation:bridge,addEventListener:(name,fn)=>events[name]=fn},document:{getElementById:el,createElement:make,createTextNode:()=>make()},navigator:{mediaDevices:{getUserMedia:getMedia||(async()=>stream)}},MediaRecorder:Recorder,speechSynthesis:{cancel(){},getVoices:()=>[],speak(){}},SpeechSynthesisUtterance:class{},Uint8Array,Blob,setTimeout,clearTimeout};
  vm.runInNewContext(source,context);await tick();return{el,calls,events,stream};
}
test('finishing recording closes the microphone and permits review before asking',async()=>{const h=await harness();await h.el('record').listeners.click();assert.equal(h.el('status').textContent.includes('Listening'),true);h.el('record').listeners.click();await tick();assert.ok(h.calls.stops>0);assert.equal(h.calls.permissions.at(-1),false);assert.equal(h.calls.transcriptions,1);assert.equal(h.calls.questions,0);assert.equal(h.el('prompt').value,'Question transcrita');});
test('cancelling and closing discard audio without transcription',async()=>{for(const action of ['cancel','pagehide']){const h=await harness();await h.el('record').listeners.click();if(action==='cancel')h.el('cancel').listeners.click();else h.events.pagehide();await tick();assert.ok(h.calls.stops>0);assert.equal(h.calls.transcriptions,0);assert.equal(h.calls.permissions.at(-1),false);}});
test('cancelling pending permission closes the stream when it arrives',async()=>{let release;const pending=new Promise(resolve=>{release=resolve;});const h=await harness(()=>pending);const started=h.el('record').listeners.click();await tick();h.el('cancel').listeners.click();release(h.stream);await started;assert.ok(h.calls.stops>0);assert.equal(h.calls.transcriptions,0);});
