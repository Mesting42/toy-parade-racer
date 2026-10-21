import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TRACKS} from '../src/tracks.js';
import {freshProfile} from '../src/storage.js';
import {createRace,tickRace} from '../src/race.js';
import {ITEM_LIST,drawRandomItem} from '../src/items.js';
import {selectRocketTarget,createRocket,advanceRocket,ROCKET_BLAST_SECONDS,startWaveKnockback,advanceWaveKnockback,WAVE_PUSH_DISTANCE,WAVE_PUSH_SECONDS} from '../src/combat.js';
import {obstaclePose,obstacleContacts} from '../src/obstacles.js';
import {ItemEffectsSystem,updateRacerEffects} from '../src/item-effects.js';

const settings={sensitivity:1,effects:1};
const coast={steer:0,throttle:false,brake:false,drift:false,item:false};
const rocketItem=ITEM_LIST.find(item=>item.id==='rocket');
function makeRace(withBox=false){
  const track=TRACKS[0],point=track.at(130);
  const world={pickupViews:withBox?[{s:130,lane:0,kind:'box',group:{position:point,visible:true}}]:[],
    mountCars(){},buildPickups(){},setRace(){},setPickupActive(){},setObstaclePosition(){},burst(){},shieldEffect(){},addPuddle(){return {};}};
  const race=createRace(track,'quick','normal',freshProfile(),world);race.countdown=0;race.started=true;
  place(race.player,track,140);place(race.racers[1],track,172);
  race.racers.slice(2).forEach((racer,i)=>place(racer,track,90-i*20));
  return race;
}
function place(racer,track,s,lane=0){
  const p=track.at(s,lane);Object.assign(racer,{x:p.x,y:p.y,z:p.z,yaw:p.yaw,progress:s,nearestS:p.s,lastS:p.s,lateral:lane,vx:0,vz:0,speed:0,hitImmune:0});
}
function fireAndWait(race){
  race.player.item=rocketItem;tickRace(race,{...coast,item:true},.02,settings);
  for(let i=0;i<300&&race.projectiles.length;i++)tickRace(race,coast,.02,settings);
}

test('random boxes draw only existing items and all seven are reachable at every rank',()=>{
  for(let rank=1;rank<=6;rank++){
    const seen=new Set();
    for(let i=0;i<3000;i++){const item=drawRandomItem(rank,()=>i/3000);assert.ok(ITEM_LIST.includes(item));seen.add(item.id);}
    assert.deepEqual(seen,new Set(ITEM_LIST.map(item=>item.id)));
  }
  for(const value of [-1,1,NaN,Infinity])assert.ok(ITEM_LIST.includes(drawRandomItem(2,()=>value)));
});

test('rocket targets exactly the preceding active rank and first place fires without a target',()=>{
  const race=makeRace(),order=[...race.racers].sort((a,b)=>b.progress-a.progress);
  assert.equal(selectRocketTarget(race.racers,order[0]),null);
  for(let rank=1;rank<order.length;rank++)assert.equal(selectRocketTarget(race.racers,order[rank]),order[rank-1]);
  order[0].finished=true;assert.equal(selectRocketTarget(race.racers,order[1]),null);
});

test('player rocket hits the preceding racer, launches one full roll and holds speed at zero until landing',()=>{
  const race=makeRace(),target=race.racers[1];
  target.boost=2;
  race.player.item=rocketItem;tickRace(race,{...coast,item:true},.02,settings);
  assert.equal(race.projectiles[0].targetId,target.id);
  for(let i=0;i<300&&!(target.blastTime>0);i++)tickRace(race,coast,.02,settings);
  assert.ok(target.blastTime>0,'rocket must collide through the actual simulation');
  assert.equal(target.speed,0);assert.equal(target.vx,0);assert.equal(target.vz,0);assert.equal(target.boost,0);
  assert.equal(target.hitCount,1);assert.equal(race.projectiles.length,0);
  const before=target.progress;let maxHeight=0,steps=0,lastRoll=0;
  while(target.blastTime>0&&steps<100){tickRace(race,{...coast,throttle:true},.02,settings);maxHeight=Math.max(maxHeight,target.jumpY);assert.equal(target.speed,0);assert.ok(target.blastRoll>=lastRoll);lastRoll=target.blastRoll;steps++;}
  assert.ok(maxHeight>7.5);assert.ok(Math.abs(steps*.02-ROCKET_BLAST_SECONDS)<.03);
  assert.equal(target.jumpY,0);assert.ok(Math.abs(target.blastRoll-Math.PI*2)<1e-8);assert.equal(target.progress,before);
  tickRace(race,coast,.02,settings);assert.ok(target.speed>0,'AI can accelerate again after the landing frame');
});

test('shield consumes a rocket without launching the car or forcing its speed to zero',()=>{
  const race=makeRace(),target=race.racers[1];target.shield=4.5;
  fireAndWait(race);
  assert.equal(target.shield,0);assert.ok(target.shieldFlash>0);assert.ok(target.hitImmune>0);
  assert.ok(!(target.blastTime>0));assert.equal(target.hitCount,0);assert.ok(target.speed>0);
  assert.ok(race.effects.some(effect=>effect.type==='shield-impact'));
});

test('leading rocket follows bends across the finish seam and expires without retargeting',()=>{
  const race=makeRace();place(race.player,race.track,race.track.length-12);race.player.progress=race.track.length+50;
  const shot=createRocket(race,race.player);assert.equal(shot.targetId,null);
  for(let i=0;i<100;i++){advanceRocket(race,shot,.04);assert.ok(Number.isFinite(shot.x)&&Number.isFinite(shot.z));}
  assert.equal(shot.active,false);assert.ok(shot.travel>150&&shot.travel<230);
  assert.ok(race.racers.every(racer=>!racer.blastTime));
});

test('locked rocket crosses the finish seam, follows a distant lane and keeps its launch target',()=>{
  const race=makeRace(),target=race.racers[1],length=race.track.length;
  place(race.player,race.track,length-36,-6);place(target,race.track,24,6);target.progress=length+24;
  const shot=createRocket(race,race.player);assert.equal(shot.targetId,target.id);
  race.racers[2].progress=target.progress+100;
  let hit=null;
  for(let i=0;i<300&&!hit;i++)hit=advanceRocket(race,shot,.02);
  assert.equal(hit,target,'mid-flight rank changes must not redirect the missile');
  assert.equal(shot.active,false);assert.ok(shot.s>length);
});

test('a close target in another lane is intercepted without the rocket circling the track',()=>{
  const race=makeRace(),target=race.racers[1];
  place(race.player,race.track,140,-9);place(target,race.track,146,9);
  const shot=createRocket(race,race.player);let hit=null;
  for(let i=0;i<50&&!hit;i++)hit=advanceRocket(race,shot,.02);
  assert.equal(hit,target,'rocket must home onto the car rather than pass its route position');
  assert.ok(shot.travel<65,'a nearby rival must not require a whole lap to catch');
});

test('rockets intercept moving, changing-lane and jumping targets on every circuit',()=>{
  for(const track of TRACKS)for(const gap of [6,60,track.length*.7]){
    const owner={id:'owner',grid:1,progress:130,finished:false,...track.at(130,-9)};
    const target={id:'target',grid:0,progress:130+gap,finished:false,...track.at(130+gap,9),lateral:9};
    const race={track,racers:[owner,target]},shot=createRocket(race,owner),dt=.04;let time=0,hit=null;
    const limit=shot.ttl;
    while(time<limit&&shot.active&&!hit){
      time+=dt;const s=130+gap+27*time,lane=8*Math.cos(time*1.3),point=track.at(s,lane);
      Object.assign(target,point,{nearestS:point.s,lateral:lane,progress:s,jumpY:Math.max(0,Math.sin(time*2))*4});
      hit=advanceRocket(race,shot,dt);
    }
    assert.equal(hit,target,`${track.name}, gap ${gap.toFixed(1)}: moving car must be hit before rocket expires`);
    if(gap===6)assert.ok(time<1.3,'cross-lane close targets must be caught promptly');
  }
});

test('a rocket ends when its locked opponent finishes instead of continuing as an empty shot',()=>{
  const race=makeRace(),shot=createRocket(race,race.player);race.racers[1].finished=true;
  assert.equal(advanceRocket(race,shot,.04),null);assert.equal(shot.active,false);
});

test('a computer picks up a real random box and fires its rocket at the preceding player',()=>{
  const race=makeRace(true),ai=race.racers[1];place(race.player,race.track,163);place(ai,race.track,130);race.rng=()=>.9999;
  tickRace(race,coast,.02,settings);assert.equal(ai.item,rocketItem);
  let shot=null;
  for(let i=0;i<80&&!shot;i++){tickRace(race,coast,.02,settings);shot=race.projectiles.find(projectile=>projectile.ownerId===ai.id);}
  assert.ok(shot,'AI must release its picked-up item without player input');assert.equal(shot.targetId,race.player.id);assert.equal(ai.item,null);
  for(let i=0;i<200&&!(race.player.blastTime>0);i++)tickRace(race,{...coast,throttle:true},.02,settings);
  assert.ok(race.player.blastTime>0,'computer rocket must also damage a human-controlled target');
  tickRace(race,{...coast,throttle:true,steer:1,drift:true},.02,settings);
  assert.equal(race.player.speed,0);assert.ok(race.player.jumpY>0);assert.ok(race.itemMessage.text.includes('翻滚'));
});

test('shockwave pushes a driving opponent outward by about one car length instead of only slowing it',()=>{
  const run=fire=>{
    const race=makeRace(),target=race.racers[1];race.items=[];
    place(race.player,race.track,140,0);place(target,race.track,140,7);
    race.racers.slice(2).forEach(racer=>{racer.finished=true;});target.laneTarget=7;target.aiNoise=0;target.testDriver=true;
    const origin={x:target.x,z:target.z},dx=target.x-race.player.x,dz=target.z-race.player.z,length=Math.hypot(dx,dz),normal={x:dx/length,z:dz/length};
    if(fire)race.player.item=ITEM_LIST.find(item=>item.id==='wave');
    tickRace(race,{...coast,item:fire},.02,settings);
    const wasSlowed=target.slow>0;
    for(let i=0;i<23;i++)tickRace(race,coast,.02,settings);
    return {outward:(target.x-origin.x)*normal.x+(target.z-origin.z)*normal.z,wasSlowed,target};
  };
  const baseline=run(false),hit=run(true),displacement=hit.outward-baseline.outward;
  assert.ok(displacement>4.8&&displacement<7.5,`outward displacement was only ${displacement.toFixed(2)} units`);
  assert.equal(hit.wasSlowed,true);assert.equal(hit.target.jumpY,0);assert.ok(!hit.target.blastTime);
});

test('shockwave force moves outwards in every direction with consistent travel at different frame rates',()=>{
  for(const dt of [1/30,1/60,1/144])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const source={x:0,z:0,yaw:0},racer={grid:1,x:Math.cos(angle)*8,z:Math.sin(angle)*8};
    const origin={x:racer.x,z:racer.z};startWaveKnockback(racer,source);
    for(let time=0;time<WAVE_PUSH_SECONDS+.05;time+=dt){const push=advanceWaveKnockback(racer,dt);racer.x+=push.x;racer.z+=push.z;}
    assert.ok(Math.abs(Math.hypot(racer.x-origin.x,racer.z-origin.z)-WAVE_PUSH_DISTANCE)<1e-8);
    assert.ok((racer.x-origin.x)*origin.x+(racer.z-origin.z)*origin.z>0);
    assert.equal(racer.waveKnockback,null);
  }
});

test('shielded, immune and out-of-range opponents receive no shockwave force',()=>{
  for(const protection of ['shield','hitImmune','range']){
    const race=makeRace(),target=race.racers[1];place(race.player,race.track,140,0);place(target,race.track,protection==='range'?180:140,7);
    if(protection!=='range')target[protection]=4.5;
    race.player.item=ITEM_LIST.find(item=>item.id==='wave');tickRace(race,{...coast,item:true},.02,settings);
    assert.ok(!target.waveKnockback,protection+' should block the outward force');assert.equal(target.slow,0);assert.equal(target.hitCount,0);
    assert.ok(!race.player.waveKnockback,'the source cannot push itself');
    if(protection==='shield')assert.equal(target.shield,0);
  }
});

test('computer shockwaves push the player through the same movement pipeline',()=>{
  const race=makeRace(),ai=race.racers[1];race.items=[];place(ai,race.track,140,0);place(race.player,race.track,140,7);
  race.racers.slice(2).forEach(racer=>{racer.finished=true;});
  const origin={x:race.player.x,z:race.player.z};ai.item=ITEM_LIST.find(item=>item.id==='wave');ai.itemHeldFor=1;
  tickRace(race,coast,.02,settings);assert.equal(ai.item,null);assert.ok(race.player.waveKnockback);assert.ok(race.itemMessage.text.includes('推开'));
  for(let i=0;i<24;i++)tickRace(race,coast,.02,settings);
  assert.ok(Math.hypot(race.player.x-origin.x,race.player.z-origin.z)>5.8);
  assert.equal(race.player.jumpY,0);assert.ok(!race.player.blastTime);
});

test('shockwave outward movement remains blocked by the solid moving obstacle',()=>{
  const race=makeRace(),target=race.racers[1],s=race.track.length*race.track.obstacle;race.items=[];
  place(race.player,race.track,s,15);place(target,race.track,s,7);target.laneTarget=7;target.aiNoise=0;target.testDriver=true;
  race.racers.slice(2).forEach(racer=>{racer.finished=true;});race.player.item=ITEM_LIST.find(item=>item.id==='wave');
  tickRace(race,{...coast,item:true},.02,settings);assert.ok(target.waveKnockback);
  for(let i=0;i<26;i++){
    tickRace(race,coast,.02,settings);
    assert.equal(obstacleContacts(target,obstaclePose(race.track,race.elapsed)).length,0,'outward push must not embed the car in a solid obstacle');
  }
});

test('flames, shield shell, rockets and impacts remain distinct and clear on reset',()=>{
  const parent=new THREE.Group(),fx=new ItemEffectsSystem(parent),view=new THREE.Group();
  const racer={id:'test',x:0,y:0,z:0,yaw:0,speed:20,boost:2,shield:4.5,magnet:0};
  const data=updateRacerEffects(view,racer,1,{effects:.2,lowParticles:true,noFlash:true});
  assert.equal(data.boost.visible,true);assert.equal(data.flames.length,2);assert.equal(data.shield.visible,true);
  assert.equal(data.shell.material.uniforms.uImpact.value,0);
  const shot={x:0,y:2,z:10,yaw:0},effect={type:'explosion',x:0,y:2,z:0,ttl:.8,duration:.9};
  const race={elapsed:1,paused:false,finishFrozen:false,projectiles:[shot],effects:[effect]};
  fx.update(race,[{racer,view}],.016,{lowParticles:true,noFlash:true});
  assert.equal(fx.rockets.size,1);assert.equal(fx.impacts.size,1);assert.equal(fx.impacts.get(effect).userData.core.visible,false);
  assert.equal(fx.particleMesh.visible,false);fx.clear();assert.equal(fx.root.children.length,1);
  assert.equal(fx.rockets.size,0);assert.equal(fx.impacts.size,0);
  for(const value of fx.particleMesh.geometry.attributes.aAlpha.array)assert.equal(value,0);
});
