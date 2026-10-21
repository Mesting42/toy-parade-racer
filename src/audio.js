const SCALE=[0,2,4,7,9,12,14,16,19,21];
export class AudioEngine {
  constructor(settings){this.settings=settings;this.ctx=null;this.musicTimer=0;this.step=0;this.engine=null;this.engineGain=null;}
  unlock(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.startMusic();const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='triangle';osc.frequency.value=75;gain.gain.value=0;osc.connect(gain).connect(this.ctx.destination);osc.start();this.engine=osc;this.engineGain=gain;}catch{this.ctx=null;}
  }
  configure(settings){this.settings=settings;}
  tone(freq,duration,volume=.09,type='sine',slide=1){if(!this.ctx||!this.settings.sfx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+duration);g.gain.setValueAtTime(Math.max(.0001,volume*this.settings.sfx),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration+.01);}
  event(name){
    if(!this.ctx)this.unlock();
    if(name==='rocket'){this.tone(150,.52,.12,'sawtooth',4.2);this.noise(.32,.1,1200);return;}
    if(name==='explosion'){this.tone(95,.58,.2,'sine',.32);this.noise(.65,.22,700);return;}
    const events={click:[520,.07,.04,'triangle',1.2],countdown:[250,.18,.09,'square',1],go:[490,.42,.13,'triangle',2.1],drift:[340,.25,.08,'triangle',1.75],boost:[180,.55,.12,'sawtooth',3.4],pickup:[650,.24,.11,'sine',1.8],hit:[125,.25,.15,'triangle',.48],collision:[105,.16,.1,'square',.62],lap:[430,.4,.1,'sine',1.6],pass:[710,.17,.06,'triangle',1.3],finish:[470,.78,.13,'triangle',2.2],shield:[360,.42,.08,'sine',2.7],jump:[220,.3,.08,'triangle',2.4],coin:[790,.15,.07,'sine',1.35]};
    const e=events[name];if(e)this.tone(...e);
  }
  noise(duration,volume,frequency){if(!this.ctx||!this.settings.sfx)return;const count=Math.floor(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,count,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<count;i++)data[i]=(Math.random()*2-1)*(1-i/count);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),time=this.ctx.currentTime;source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(frequency,time);filter.frequency.exponentialRampToValueAtTime(90,time+duration);gain.gain.setValueAtTime(volume*this.settings.sfx,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);source.connect(filter).connect(gain).connect(this.ctx.destination);source.start();}
  startMusic(){if(!this.ctx||this.musicTimer)return;this.musicTimer=window.setInterval(()=>this.musicStep(),180);}
  musicStep(){if(!this.ctx||this.ctx.state!=='running'||this.settings.music<=.001)return;const t=this.ctx.currentTime+.018,bar=Math.floor(this.step/8)%4,n=SCALE[(this.step*3+bar*2)%SCALE.length],freq=196*Math.pow(2,n/12),o=this.ctx.createOscillator(),g=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();o.type=this.step%8===0?'triangle':'sine';o.frequency.value=freq;filter.type='lowpass';filter.frequency.value=1000;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.027*this.settings.music,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(filter).connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+.2);if(this.step%4===0){const b=this.ctx.createOscillator(),bg=this.ctx.createGain();b.type='triangle';b.frequency.value=70+bar*8;bg.gain.setValueAtTime(.035*this.settings.music,t);bg.gain.exponentialRampToValueAtTime(.0001,t+.15);b.connect(bg).connect(this.ctx.destination);b.start(t);b.stop(t+.16);}this.step++;}
  updateEngine(speed,active){if(!this.engine||!this.ctx)return;const t=this.ctx.currentTime,amount=active?Math.min(.016,Math.max(0,speed/24)*.013*this.settings.sfx):0;this.engine.frequency.setTargetAtTime(65+speed*5.2,t,.12);this.engineGain.gain.setTargetAtTime(amount,t,.15);}
  close(){clearInterval(this.musicTimer);this.ctx?.close();}
}
