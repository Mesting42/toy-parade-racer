import {CAR_DATA,RACE_CAR_DATA} from './world.js';
import {raceCarLineup} from './car-models.js';
import {raceStandings} from './championship.js';
import {obstaclePose,obstaclePassLane,resolveObstacleMotion} from './obstacles.js';

import {ITEM_LIST,drawRandomItem} from './items.js';
import {createRocket,advanceRocket,startRocketBlast,advanceRocketBlast,shouldAiUseItem,startWaveKnockback,advanceWaveKnockback} from './combat.js';
export {ITEM_LIST} from './items.js';
export const DRIVER_DATA=[
  {name:'栗子队长',carId:'acorn',style:'稳稳走线',lane:-3.7,skill:.88},
  {name:'桃桃汽水',carId:'bee',style:'爱抢内弯',lane:4.2,skill:.83},
  {name:'蓝莓船长',carId:'snail',style:'贴边巡航',lane:-6,skill:.8},
  {name:'小豆包',carId:'bee',style:'偶尔贪快',lane:6.3,skill:.7},
  {name:'木木师傅',carId:'acorn',style:'慢热耐撞',lane:1.8,skill:.74},
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrapAngle=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function colorPaint(profile,id){return profile.paint?.[id]||null;}
function racerFrom(id,track,s,lane,profile,isPlayer,grid,driver,difficulty){
  const car=RACE_CAR_DATA.find(c=>c.id===id)||CAR_DATA[0],p=track.at(s,lane),stats=car.stats;
  return {id:`r${grid}`,carId:id,isPlayer,grid,driver,difficulty,x:p.x,z:p.z,y:p.y,yaw:p.yaw,vx:0,vz:0,speed:0,progress:0,nearestS:p.s,lastS:p.s,lateral:lane,slip:0,lap:1,checkpoint:0,item:null,boost:0,slow:0,shield:0,hitImmune:0,magnet:0,driftTime:0,driftCharge:0,driftBoost:0,offRoad:0,jumpY:0,jumpV:0,bump:0,finishTime:null,finished:false,paint:isPlayer?colorPaint(profile,id):null,stats:{...stats},recovery:0,shortcutLap:-1,hitCount:0,trailTime:0,lastRank:grid};
}
export function createRace(track,mode,difficulty,profile,world){
  let seed=(Date.now()^track.id.length*9187)>>>0;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const lineup=raceCarLineup(profile.selectedCar),racers=[];racers.push(racerFrom(lineup[0],track,track.length-7,-1.8,profile,true,0,null,difficulty));
  if(mode==='quick'||mode==='championship')for(let i=0;i<5;i++){const d={...DRIVER_DATA[i],carId:lineup[i+1]},s=track.length-12-i*5,lane=(i%2?1:-1)*(3.2+Math.floor(i/2)*3.4),ai=racerFrom(d.carId,track,s,lane,profile,false,i+1,d,difficulty);ai.maxSkill=d.skill;ai.laneTarget=d.lane*(rng()>.5?1:.8);ai.aiNoise=rng()*.4;racers.push(ai);}
  const ghost=(mode==='time'?profile.ghosts?.[track.id]:null)||null;
  world.mountCars(racers,profile.paint?.[profile.selectedCar],ghost);
  if(world.pickupViews.length===0)world.buildPickups(track);
  const race={track,mode,difficulty,racers,player:racers[0],countdown:3.4,elapsed:0,started:false,finished:false,finishTime:0,result:null,items:world.pickupViews.map((v,i)=>({viewIndex:i,s:v.s,lane:v.lane,kind:v.kind,active:true,respawn:0,usedBy:new Set()})),traps:[],effects:[],projectiles:[],lapEvents:[],passCount:0,rng,world,progressSamples:[],ghostTime:0,lapElapsed:0,lapRecords:[],currentLapSamples:[{x:racers[0].x,y:racers[0].y,z:racers[0].z,yaw:racers[0].yaw}],lapSampleTimer:0,pickupsEarned:0,coinsEarned:0,shortcutFlash:0,rank:racers.length,previousRank:racers.length,stall:0,paused:false,finishFrozen:false};
  world.setRace?.(race);return race;
}
function decayStatus(r,dt){for(const key of ['boost','slow','shield','hitImmune','magnet','recovery','shieldFlash'])r[key]=Math.max(0,(r[key]||0)-dt);r.bump=Math.max(0,r.bump-dt*2.8);}
function accelCar(r,input,track,dt,sensitivity){
  r.blastRecovering=false;
  if(advanceRocketBlast(r,dt)){r.previousX=r.x;r.previousZ=r.z;decayStatus(r,dt);return track.nearest(r.x,r.z);}
  r.blastRoll=0;
  const fwd={x:Math.sin(r.yaw),z:Math.cos(r.yaw)},side={x:Math.cos(r.yaw),z:-Math.sin(r.yaw)},long=r.vx*fwd.x+r.vz*fwd.z,lat=r.vx*side.x+r.vz*side.z;
  const difficulty= r.driver?(r.difficulty==='easy'?.78:r.difficulty==='expert'?.94:.86):1;
  const max=r.isPlayer?r.stats.max:Math.min(r.stats.max, (r.stats.max*difficulty*(.96+(r.maxSkill||.8)*.05)));
  let nextLong=long;
  if(input.throttle)nextLong+=16.5*r.stats.accel*dt;else nextLong-=4.3*dt;
  if(r.boost>0)nextLong+=24*dt;
  if(input.brake)nextLong-=21*dt;
  nextLong=clamp(nextLong,0,max+(r.boost>0?8:0));
  r.steerInput=clamp(input.steer,-1,1);const steer=r.steerInput,grip=(r.driftTime>0?1.8:10.5)*r.stats.turn*(track.nearest(r.x,r.z).distance>track.width*.47?.56:1);
  const speedRatio=clamp(nextLong/Math.max(1,max),0,1);r.yaw+=steer*(.32+speedRatio*1.25)*sensitivity*r.stats.turn*dt;
  const turnSlip=steer*nextLong*(r.driftTime>0?.21:.055);
  let sideVelocity=lat+turnSlip*dt*7;sideVelocity*=Math.max(0,1-grip*dt);
  nextLong*=Math.max(.01,1-(r.boost>0?.18:.38)*dt);
  r.vx=Math.sin(r.yaw)*nextLong+Math.cos(r.yaw)*sideVelocity;r.vz=Math.cos(r.yaw)*nextLong-Math.sin(r.yaw)*sideVelocity;
  r.speed=Math.max(0,r.vx*fwd.x+r.vz*fwd.z);r.slip=sideVelocity;
  const knockback=advanceWaveKnockback(r,dt);
  r.previousX=r.x;r.previousZ=r.z;r.x+=r.vx*dt+knockback.x;r.z+=r.vz*dt+knockback.z;
  const n=track.nearest(r.x,r.z);r.lateral=n.lateral;r.nearestS=n.s;r.y=.08+Math.sin(n.s*.008+track.cup)*.12;
  if(Math.abs(n.lateral)>track.width*.5){r.vx*=.975;r.vz*=.975;}
  if(Math.abs(n.lateral)>track.width*.5+8)r.offRoad+=dt;else r.offRoad=Math.max(0,r.offRoad-dt*2.2);
  if(r.offRoad>1.25){r.recovery=1.1;r.offRoad=0;r.x=n.x+n.tz*clamp(n.lateral,-track.width*.3,track.width*.3);r.z=n.z-n.tx*clamp(n.lateral,-track.width*.3,track.width*.3);r.yaw=n.yaw;r.vx=Math.sin(r.yaw)*Math.min(7,r.speed*.45);r.vz=Math.cos(r.yaw)*Math.min(7,r.speed*.45);r.speed=Math.min(r.speed,7);r.hitImmune=1.2;}
  r.driftReleased=false;
  if(input.drift&&Math.abs(steer)>.38&&r.speed>5){r.driftTime+=dt;r.driftCharge=clamp(r.driftCharge+dt*.36*r.stats.drift,0,1);r.driftBoost=0;}
  else if(r.driftTime>0){const release=r.driftTime>=.62&&r.driftCharge>.12;r.driftTime=0;if(release){r.driftBoost=.68+1.15*r.driftCharge;r.boost=Math.max(r.boost,r.driftBoost);r.driftCharge=0;r.driftBoost=0;r.driftReleased=true;}}
  decayStatus(r,dt);
  if(r.slow>0){r.vx*=Math.max(.7,1-1.1*dt);r.vz*=Math.max(.7,1-1.1*dt);r.speed*=Math.max(.7,1-1.1*dt);}
  if(r.jumpV||r.jumpY){r.jumpV-=18*dt;r.jumpY+=r.jumpV*dt;if(r.jumpY<=0){r.jumpY=0;r.jumpV=0;r.bump=.35;}}
  return n;
}
function aiInput(r,race,dt){
  const t=race.track,n=t.nearest(r.x,r.z),speed=r.speed,skill=r.maxSkill||.8;
  const look=clamp(14+speed*.7,23,50),lane=r.laneTarget;
  const hazardS=t.length*t.obstacle,ahead=((hazardS-n.s+t.length*1.5)%t.length)-t.length/2;
  const avoidance=ahead>-22&&ahead<85?obstaclePassLane(t,obstaclePose(t,race.elapsed+Math.max(0,ahead)/Math.max(speed,10)*.18),lane):lane;
  r.obstacleLane??=lane;r.obstacleLane+=(avoidance-r.obstacleLane)*Math.min(1,dt*5);
  const target=t.at(n.s+look,r.obstacleLane),wanted=Math.atan2(target.x-r.x,target.z-r.z),error=wrapAngle(wanted-r.yaw);
  const curve=t.curvature(n.s+look),cap=r.stats.max*(race.difficulty==='easy'?.76:race.difficulty==='expert'?.96:.87)*clamp(1-curve*6.5,.55,.98);
  const steering=clamp(error*(1.25+skill*.8)+(r.aiNoise||0)*.12,-1,1);
  const drift=curve>.021&&Math.abs(steering)>.4&&r.speed>8;
  if(!r.testDriver&&Math.random()<dt*.06)r.laneTarget=clamp(r.laneTarget+(Math.random()-.5)*2.2,-7,7);
  r.itemHeldFor=r.item?(r.itemHeldFor||0)+dt:0;
  return {steer:steering,throttle:r.speed<cap,brake:r.speed>cap+3,drift,item:shouldAiUseItem(r,race)};
}
export function autopilotInput(racer,race,dt=1/30){racer.laneTarget??=0;racer.maxSkill=Math.max(racer.maxSkill||0,.94);racer.testDriver=true;return aiInput(racer,race,dt);}
function rankRacers(race){return [...race.racers].sort((a,b)=>b.progress-a.progress);}
function applyShieldOrHit(race,target,kind){
  if(target.hitImmune>0)return false;
  if(target.shield>0){target.shield=0;target.shieldFlash=.5;target.hitImmune=1.8;target.bump=.7;race.world.burst(target.x,target.y+1,target.z,9);race.world.shieldEffect(target);race.onEvent?.('shield');return false;}
  if(kind==='rocket'){startRocketBlast(target);target.hitImmune=2.8;target.hitCount++;race.onEvent?.('explosion');return true;}
  target.slow=Math.max(target.slow,kind==='glue'?1.65:.72);target.hitImmune=2.8;target.vx*=.7;target.vz*=.7;target.bump=1;target.hitCount++;race.world.burst(target.x,target.y+1,target.z,12);race.onEvent?.('hit');return true;
}
function useItem(race,r,input){
  const item=r.item;if(!item||!input.item||r.blastTime>0||r.blastRecovering)return false;r.item=null;r.itemHeldFor=0;if(r.isPlayer)race.itemMessage={text:'已使用'+item.name+' · '+item.hint,until:race.elapsed+3.2};const w=race.world,forward={x:Math.sin(r.yaw),z:Math.cos(r.yaw)};
  if(item.id==='spring'){r.boost=Math.max(r.boost,2);const impulse=Math.min(4.5,Math.max(0,r.stats.max+8-r.speed));r.vx+=forward.x*impulse;r.vz+=forward.z*impulse;r.speed=Math.max(0,r.vx*forward.x+r.vz*forward.z);race.onEvent?.('boost');}
  else if(item.id==='bubble'){r.shield=4.5;race.onEvent?.('shield');}
  else if(item.id==='rocket'){
    const rocket=createRocket(race,r);race.projectiles.push(rocket);race.onEvent?.('rocket');
    if(r.isPlayer){const target=race.racers.find(other=>other.id===rocket.targetId);race.itemMessage={text:target?'火箭锁定前一名：'+(target.isPlayer?'你':target.driver?.name||'玩具车手'):'前方无人，火箭沿赛道向前飞行。',until:race.elapsed+3.2};}
  }
  else if(item.id==='glue'){const x=r.x-forward.x*9,z=r.z-forward.z*9,g=w.addPuddle(x,z,r.yaw,false);race.traps.push({kind:'glue',x,z,yaw:r.yaw,ttl:10,mesh:g,owner:r.id});}
  else if(item.id==='wave'){
    const effect={type:'wave',x:r.x,y:r.y+.6,z:r.z,ttl:.6,duration:.6,targets:[]};race.effects.push(effect);
    for(const other of race.racers){
      if(other===r||other.finished||dist(r,other)>20)continue;
      if(applyShieldOrHit(race,other,'wave')){startWaveKnockback(other,r);effect.targets.push({id:other.id,x:other.x,z:other.z,dx:other.waveKnockback.x,dz:other.waveKnockback.z});}
    }
    if(!r.isPlayer&&effect.targets.some(target=>target.id===race.player.id))race.itemMessage={text:'被震荡波推开！短暂减速，稳住方向继续驾驶。',until:race.elapsed+2.5};
    w.burst(r.x,r.y+1,r.z,20);race.onEvent?.('hit');
  }
  else if(item.id==='decoy'){const x=r.x-forward.x*10,z=r.z-forward.z*10,g=w.addPuddle(x,z,r.yaw,true);race.traps.push({kind:'decoy',x,z,yaw:r.yaw,ttl:11,mesh:g,owner:r.id});}
  else if(item.id==='magnet'){r.magnet=5.2;race.onEvent?.('pickup');}
  return true;
}
function updatePickups(race,dt){
  const sorted=rankRacers(race);
  for(const item of race.items){
    if(!item.active){item.respawn-=dt;if(item.respawn<=0){item.active=true;item.usedBy.clear();race.world.setPickupActive(item.viewIndex,true);}continue;}
    const view=race.world.pickupViews[item.viewIndex];if(!view)continue;
    for(const r of race.racers){if(r.finished||r.blastRecovering||item.usedBy.has(r.id))continue;
      if(item.kind==='box'&&r.item)continue;
      if(dist(r,view.group.position)<(item.kind==='box'?3.4:4.6)&&Math.abs(r.jumpY||0)<2.6){item.usedBy.add(r.id);race.onEvent?.(item.kind==='coin'?'coin':'pickup');race.world.burst(r.x,r.y+1,r.z,item.kind==='coin'?5:10);
        if(item.kind==='coin'){if(r.isPlayer){race.coinsEarned+=1;race.pickupsEarned++;}if(r.magnet>0)r.magnet=0;}
        else if(r.isPlayer){const rank=sorted.indexOf(r)+1;r.item=drawRandomItem(rank,race.rng);r.itemHeldFor=0;race.pickupsEarned++;race.itemMessage={text:'获得'+r.item.name+' · '+r.item.category+' · '+r.item.target,until:race.elapsed+3.2};}
        else{r.item=drawRandomItem(sorted.indexOf(r)+1,race.rng);r.itemHeldFor=0;}
        item.active=false;item.respawn=8.5;race.world.setPickupActive(item.viewIndex,false);break;
      }
    }
  }
  for(const r of race.racers){if(r.magnet<=0||r.finished)continue;for(const item of race.items){if(item.kind!=='coin'||!item.active)continue;const v=race.world.pickupViews[item.viewIndex];if(v&&dist(r,v.group.position)<17){v.group.position.x+=(r.x-v.group.position.x)*Math.min(1,dt*2.8);v.group.position.z+=(r.z-v.group.position.z)*Math.min(1,dt*2.8);}}}
}
function updateTraps(race,dt){
  for(const trap of race.traps){trap.ttl-=dt;for(const r of race.racers){if(r.id===trap.owner||r.finished||r.hitImmune>0||r.jumpY>2.6)continue;if(dist(r,trap)<3.4){applyShieldOrHit(race,r,trap.kind);trap.ttl=0;break;}}if(trap.ttl<=0){if(race.world.removeTrap)race.world.removeTrap(trap.mesh);else trap.mesh?.parent?.remove(trap.mesh);}}
  race.traps=race.traps.filter(t=>t.ttl>0);
}
function updateProjectiles(race,dt){
  for(const shot of race.projectiles){
    const target=advanceRocket(race,shot,dt);
    if(target){
      const shielded=target.shield>0,hit=applyShieldOrHit(race,target,'rocket');
      race.effects.push({type:shielded?'shield-impact':'explosion',x:shot.x,y:shot.y,z:shot.z,ttl:.9,duration:.9});
      if(target.isPlayer)race.itemMessage={text:shielded?'护罩挡住了追踪火箭！':hit?'被火箭击中！翻滚一圈，落地后重新起步。':'受击保护挡住了火箭。',until:race.elapsed+3};
      else if(shot.ownerId===race.player.id)race.itemMessage={text:shielded?'对手的护罩挡住了火箭。':'火箭'+(hit?'命中':'被挡住')+' · '+(target.driver?.name||'玩具车手'),until:race.elapsed+2.6};
    }else if(shot.active&&shot.targetId===race.player.id&&!shot.warned&&dist(shot,race.player)<100){shot.warned=true;race.itemMessage={text:'火箭来袭！泡泡护罩可以挡住攻击。',until:race.elapsed+2.6};}
  }
  race.projectiles=race.projectiles.filter(shot=>shot.active);
}
function collisions(race){const racers=race.racers.filter(r=>!r.finished&&!r.blastRecovering&&r.jumpY<2.6);
  for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){
    const a=racers[i],b=racers[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>4.8||d<.01)continue;
    if(a.shield>0&&a.hitImmune<=0)applyShieldOrHit(race,a,'collision');if(b.shield>0&&b.hitImmune<=0)applyShieldOrHit(race,b,'collision');
    const nx=dx/d,nz=dz/d,push=(4.8-d)*.48;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;
    const rel=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(rel>0){a.vx-=nx*rel*.23;a.vz-=nz*rel*.23;b.vx+=nx*rel*.23;b.vz+=nz*rel*.23;}
    a.bump=Math.max(a.bump,.5);b.bump=Math.max(b.bump,.5);if(Math.random()<.04)race.onEvent?.('collision');
  }
}
function obstacle(race,dt){
  const pose=obstaclePose(race.track,race.elapsed),previous=obstaclePose(race.track,Math.max(0,race.elapsed-dt));race.world.setObstaclePosition(pose);
  for(const r of race.racers){
    if(r.finished)continue;const contact=resolveObstacleMotion(r,pose,previous,dt);if(!contact.hit||r.hitImmune>0)continue;
    r.hitImmune=.8;r.bump=.9;
    if(r.shield>0){r.shield=0;race.world.shieldEffect(r);race.onEvent?.('shield');}
    else{r.slow=Math.max(r.slow,.38);race.onEvent?.('collision');}
    race.world.burst(r.x,r.y+1,r.z,6);
  }
}
function updateProgress(race,r){
  const t=race.track,n=t.nearest(r.x,r.z),deltaS=n.s-r.lastS;let delta=deltaS;if(delta< -t.length/2)delta+=t.length;if(delta>t.length/2)delta-=t.length;
  const forward=Math.sin(r.yaw)*n.tx+Math.cos(r.yaw)*n.tz;
  if(Math.abs(n.lateral)<t.width*.5+3&&forward>-.25&&delta>-5)r.progress+=Math.max(0,delta);
  r.lastS=n.s;r.nearestS=n.s;r.lateral=n.lateral;
  const lap=Math.floor(r.progress/t.length)+1;if(lap!==r.lap&&lap<=t.laps){r.lap=lap;if(r.isPlayer){race.lapEvents.push(lap);race.onEvent?.('lap');}}
  const cp=Math.floor((r.progress%t.length)/t.length*12);r.checkpoint=Math.max(r.checkpoint,cp);
  if(race.mode!=='practice'&&!r.finished&&r.progress>=t.length*t.laps){r.finished=true;r.finishTime=race.elapsed;r.speed=Math.min(r.speed,7);r.vx*=.82;r.vz*=.82;}
}
function rewards(race){const order=rankRacers(race),rank=order.indexOf(race.player)+1;race.rank=rank;const points=[10,7,5,3,2,1][rank-1],finishOrder=order.map(r=>({driverId:r.isPlayer?'player':r.driver?.name||`grid-${r.grid}`,name:r.isPlayer?'你':r.driver?.name||'玩具车手',carId:r.carId,progress:r.progress,finishTime:r.finishTime}));race.result={rank,points,coins:Math.max(8,42-(rank-1)*6)+race.coinsEarned,elapsed:race.elapsed,pickups:race.pickupsEarned,order:finishOrder,standings:raceStandings(finishOrder)};race.finishFrozen=true;race.finished=true;race.player.finishTime=race.elapsed;return race.result;}

export function tickRace(race,input,dt,settings){
  if(!race||race.paused||race.finishFrozen)return null;dt=Math.min(.04,dt);
  if(race.countdown>0){race.countdown=Math.max(0,race.countdown-dt);if(race.countdown===0){race.started=true;race.onEvent?.('go');}return {countdown:race.countdown,started:race.started};}
  race.elapsed+=dt;
  for(const effect of race.effects)effect.ttl-=dt;race.effects=race.effects.filter(effect=>effect.ttl>0);
  const control={...input};if(race.mode==='practice'&&race.player.offRoad>0){};
  const human=race.player;
  if(!race.started){race.started=true;}
  if(human.finished)return null;
  if(input.reset&&!(human.blastTime>0)&&Math.abs(human.lateral)>race.track.width*.45){const n=race.track.nearest(human.x,human.z),lane=clamp(n.lateral,-race.track.width*.24,race.track.width*.24);human.x=n.x+n.tz*lane;human.z=n.z-n.tx*lane;human.yaw=n.yaw;human.vx=Math.sin(n.yaw)*5;human.vz=Math.cos(n.yaw)*5;human.speed=5;human.hitImmune=1.2;human.offRoad=0;human.recovery=.75;}
  accelCar(human,control,race.track,dt,settings.sensitivity||1);
  if(human.driftReleased){race.onEvent?.('drift');race.world.burst(human.x,human.y+.5,human.z,8);}
  if(control.item)useItem(race,human,control);
  for(const item of race.racers.slice(1)){
    if(item.finished)continue;const ai=aiInput(item,race,dt);accelCar(item,ai,race.track,dt,1);if(item.driftReleased)race.onEvent?.('drift');if(item.item&&ai.item)useItem(race,item,ai);
  }
  collisions(race);obstacle(race,dt);
  for(const r of race.racers){if(r.recovery>0||r.blastRecovering){if(r.blastRecovering){r.vx=0;r.vz=0;r.speed=0;r.lastS=race.track.nearest(r.x,r.z).s;}continue;}updateProgress(race,r);const jumpAt=race.track.length*race.track.jump;if(r.jumpLap!==r.lap&&Math.abs(((r.nearestS-jumpAt+race.track.length*1.5)%race.track.length)-race.track.length/2)<2.5&&Math.abs(r.lateral)<race.track.width*.38){r.jumpV=7.8;r.jumpLap=r.lap;race.onEvent?.('jump');race.world.burst(r.x,r.y+1,r.z,8);}}
  updatePickups(race,dt);updateTraps(race,dt);updateProjectiles(race,dt);
  if(race.mode==='time'){race.ghostTime+=dt;if(!race.lastGhostRecord||race.ghostTime-race.lastGhostRecord>=.12){race.lastGhostRecord=race.ghostTime;race.progressSamples.push({x:human.x,y:human.y,z:human.z,yaw:human.yaw});}}
  const rank=rankRacers(race).indexOf(human)+1;if(rank!==race.previousRank){if(rank<race.previousRank)race.onEvent?.('pass');race.previousRank=rank;}
  const shortcutS=race.track.length*race.track.shortcut.at;if(!human.blastRecovering&&!(human.blastTime>0)&&human.shortcutLap!==human.lap&&Math.abs(((human.nearestS-shortcutS+race.track.length*1.5)%race.track.length)-race.track.length/2)<3&&human.lateral< -race.track.width*.25&&human.lateral> -race.track.width*.48){human.shortcutLap=human.lap;human.boost=Math.max(human.boost,.55);race.shortcutFlash=.8;race.onEvent?.('boost');}
  race.shortcutFlash=Math.max(0,race.shortcutFlash-dt);
  if(race.mode==='practice')return {countdown:0,started:true,rank,practice:true};
  if(human.finished||(race.mode!=='practice'&&human.progress>=race.track.length*race.track.laps)){return {countdown:0,started:true,result:rewards(race)};}
  return {countdown:0,started:true,rank};
}
export function timeText(seconds){if(!Number.isFinite(seconds))return '--:--.---';const m=Math.floor(seconds/60),s=seconds%60;return `${String(m).padStart(2,'0')}:${s.toFixed(3).padStart(6,'0')}`;}
