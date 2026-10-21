import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportLayout,raceFraming} from '../src/display.js';
import {Input} from '../src/input.js';

test('phone rotation keeps mobile quality; tablets and desktop get their own framing',()=>{
  for(const [w,h] of [[390,844],[844,390],[360,800],[800,360]]){
    const layout=viewportLayout(w,h);assert.equal(layout.phone,true);assert.equal(layout.touch,true);assert.equal(layout.quality,'low');
    assert.equal(layout.portrait,h>w);assert.ok(raceFraming(layout).fov>=53);
  }
  assert.equal(viewportLayout(768,1024,true).phone,false);
  assert.equal(viewportLayout(1280,800,true).touch,true);
  assert.equal(viewportLayout(1440,900).touch,false);
  assert.equal(viewportLayout(1440,500).phone,false);
  assert.equal(viewportLayout(768,1024).quality,'medium');
  assert.ok(raceFraming(viewportLayout(390,844)).back>raceFraming(viewportLayout(844,390)).back);
});

function bus(){const listeners=new Map();return {hidden:false,addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(callback);},fire(name,event={}){for(const callback of listeners.get(name)||[])callback(event);}};}
function button(name,disabled=false){const classes=new Set();return {dataset:{control:name},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},getAttribute:key=>key==='aria-disabled'?String(disabled):null,setPointerCapture(){},closest(){return this;}};}

test('simultaneous throttle, steering and drift survive an unrelated release and clear on cancel/blur',()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document,nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const win=bus(),doc=bus();globalThis.window=win;globalThis.document=doc;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
  try{
    let active=true,pauses=0;const input=new Input(()=>pauses++,()=>active);
    const throttle=button('throttle'),left=button('left'),drift=button('drift');
    const down=(pointerId,target)=>doc.fire('pointerdown',{pointerId,target,pointerType:'touch',preventDefault(){}});
    down(1,throttle);down(2,left);down(3,drift);
    assert.equal(input.read().throttle,true);assert.equal(input.read().steer,1);assert.equal(input.read().drift,true);
    doc.fire('pointerup',{pointerId:2});assert.equal(input.read().steer,0);assert.equal(input.read().throttle,true);assert.equal(input.read().drift,true);
    doc.fire('pointercancel',{pointerId:3});assert.equal(input.read().drift,false);assert.equal(drift.classList.contains('pressed'),false);
    down(4,throttle);doc.fire('pointerup',{pointerId:1});assert.equal(input.read().throttle,true);
    win.fire('blur');assert.equal(input.read().throttle,false);assert.equal(input.pointers.size,0);assert.equal(throttle.classList.contains('pressed'),false);
    down(5,button('reset'));assert.equal(input.read().reset,true);doc.fire('lostpointercapture',{pointerId:5});assert.equal(input.read().reset,false);
    down(6,button('item',true));assert.equal(input.read().item,false);
    active=false;down(7,left);assert.equal(input.read().steer,0);
    let prevented=false;win.fire('keydown',{key:'ArrowUp',target:{matches:()=>false},preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.equal(input.read().throttle,false);
    active=true;win.fire('keydown',{key:'ArrowUp',target:{matches:()=>true},preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.equal(input.read().throttle,false);
    win.fire('keydown',{key:'Escape',target:{matches:()=>false}});assert.equal(pauses,1);
  }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;}
});
