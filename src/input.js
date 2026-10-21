const KEYS = { w:'throttle', arrowup:'throttle', s:'brake', arrowdown:'brake', a:'left', arrowleft:'left', d:'right', arrowright:'right', shift:'drift', ' ':'item', spacebar:'item', r:'reset' };

// The chase camera looks forward along the car from behind. In this coordinate
// system a positive yaw turns toward screen-left, so left input uses positive steer.
export function steerFromControls(left,right){return (left?1:0)-(right?1:0);}

export class Input {
  constructor(onPause,isActive=()=>true) {
    this.keys=new Set();this.pointers=new Map();this.onPause=onPause;this.gamepad={};
    window.addEventListener('keydown',e=>{
      const key=e.key.toLowerCase();
      if(e.target?.matches?.('input,select,textarea,[contenteditable=true]'))return;
      if(key==='escape'){if(!e.repeat)this.onPause();return;}
      if(!isActive())return;
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
      if(KEYS[key])this.keys.add(KEYS[key]);
    });
    window.addEventListener('keyup',e=>this.keys.delete(KEYS[e.key.toLowerCase()]));
    window.addEventListener('blur',()=>this.clear());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear();});
    document.addEventListener('pointerdown',e=>{
      const el=e.target.closest('[data-control]');if(!el||!isActive()||el.disabled||el.getAttribute('aria-disabled')==='true'||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();el.setPointerCapture?.(e.pointerId);el.classList.add('pressed');this.pointers.set(e.pointerId,{name:el.dataset.control,el});
    },{passive:false});
    const release=e=>{const item=this.pointers.get(e.pointerId);if(item){item.el.classList.remove('pressed');this.pointers.delete(e.pointerId);}};
    document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);document.addEventListener('lostpointercapture',release);
  }
  clear(){this.keys.clear();for(const p of this.pointers.values())p.el.classList.remove('pressed');this.pointers.clear();}
  read(){
    let left=this.keys.has('left'),right=this.keys.has('right'),throttle=this.keys.has('throttle'),brake=this.keys.has('brake'),drift=this.keys.has('drift'),item=this.keys.has('item'),reset=this.keys.has('reset');
    for(const p of this.pointers.values()){if(p.name==='left')left=true;else if(p.name==='right')right=true;else if(p.name==='throttle')throttle=true;else if(p.name==='brake')brake=true;else if(p.name==='drift')drift=true;else if(p.name==='item')item=true;else if(p.name==='reset')reset=true;}
    const pads=navigator.getGamepads?.()||[];let connected=false;
    for(const pad of pads){if(!pad?.connected)continue;connected=true;const ax=pad.axes?.[0]||0;left ||= ax<-.22;right ||= ax>.22;throttle ||= (pad.buttons?.[0]?.pressed||false)||(pad.buttons?.[7]?.value||0)>.18;brake ||= (pad.buttons?.[1]?.pressed||false)||(pad.buttons?.[6]?.value||0)>.18;drift ||= pad.buttons?.[4]?.pressed||false;item ||= pad.buttons?.[2]?.pressed||false;}
    return {steer:steerFromControls(left,right),throttle,brake,drift,item,reset,gamepad:connected};
  }
}
