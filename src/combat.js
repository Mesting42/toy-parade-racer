export const ROCKET_SPEED=64;
export const ROCKET_BLAST_SECONDS=1.2;
export const WAVE_PUSH_DISTANCE=6.15;
export const WAVE_PUSH_SECONDS=.48;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function selectRocketTarget(racers,owner){
  const order=racers.filter(racer=>!racer.finished).sort((a,b)=>b.progress-a.progress||a.grid-b.grid);
  const rank=order.indexOf(owner);
  return rank>0?order[rank-1]:null;
}

export function createRocket(race,owner){
  const target=selectRocketTarget(race.racers,owner),near=race.track.nearest(owner.x,owner.z),s=near.s+3.9;
  const point=race.track.at(s,near.lateral);
  return {ownerId:owner.id,targetId:target?.id||null,s,lane:near.lateral,x:point.x,y:point.y+1.65,z:point.z,yaw:point.yaw,
    ttl:target?Math.max(10,race.track.length/(ROCKET_SPEED-34)+4):3.5,travel:0,active:true,warned:false,homing:false,pitch:0};
}

function segmentDistanceSquared(a,b,target){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,denom=dx*dx+dy*dy+dz*dz;
  const t=denom?clamp(((target.x-a.x)*dx+(target.y-a.y)*dy+(target.z-a.z)*dz)/denom,0,1):0;
  return (a.x+dx*t-target.x)**2+(a.y+dy*t-target.y)**2+(a.z+dz*t-target.z)**2;
}

// Follow the route at long range, then latch onto the actual car position.
// A route-only missile can pass a nearby car before crossing to its lane;
// once that happens, a wrapped route distance sends it around another lap.
export function advanceRocket(race,rocket,dt){
  if(!rocket.active)return null;
  rocket.ttl-=dt;
  if(rocket.ttl<=0){rocket.active=false;return null;}
  const target=race.racers.find(racer=>racer.id===rocket.targetId&&!racer.finished);
  if(rocket.targetId&&!target){rocket.active=false;return null;}
  const steps=Math.max(1,Math.ceil(ROCKET_SPEED*dt/1.1)),stepTime=dt/steps;
  for(let i=0;i<steps;i++){
    const previous={x:rocket.x,y:rocket.y,z:rocket.z};
    const wrapped=((rocket.s%race.track.length)+race.track.length)%race.track.length;
    const targetNear=target?race.track.nearest(target.x,target.z):null;
    const ahead=target?((targetNear.s-wrapped+race.track.length)%race.track.length):Infinity;
    const center=target?{x:target.x,y:target.y+1.45+(target.jumpY||0),z:target.z}:null;
    const distance=center?Math.hypot(center.x-rocket.x,center.y-rocket.y,center.z-rocket.z):Infinity;
    if(target&&distance<60&&(ahead<75||ahead>race.track.length-12))rocket.homing=true;
    if(rocket.homing&&center){
      const dx=center.x-rocket.x,dy=center.y-rocket.y,dz=center.z-rocket.z,step=Math.min(distance,ROCKET_SPEED*stepTime),fraction=distance>1e-8?step/distance:1;
      rocket.x+=dx*fraction;rocket.y+=dy*fraction;rocket.z+=dz*fraction;rocket.travel+=step;
      rocket.yaw=Math.atan2(dx,dz);rocket.pitch=-Math.atan2(dy,Math.hypot(dx,dz));
      const projected=race.track.nearest(rocket.x,rocket.z);rocket.s+=step;rocket.lane=projected.lateral;
      if(segmentDistanceSquared(previous,rocket,center)<=3.4**2){rocket.active=false;return target;}
      continue;
    }
    const lane=target&&ahead<90?target.lateral:0;
    rocket.lane+=clamp(lane-rocket.lane,-22*stepTime,22*stepTime);
    rocket.s+=ROCKET_SPEED*stepTime;rocket.travel+=ROCKET_SPEED*stepTime;
    const point=race.track.at(rocket.s,rocket.lane);
    rocket.x=point.x;rocket.z=point.z;rocket.y=point.y+1.65;rocket.yaw=point.yaw;rocket.pitch=0;
    if(target){
      if(segmentDistanceSquared(previous,rocket,center)<=3.4**2){rocket.active=false;return target;}
    }
  }
  return null;
}

export function startRocketBlast(racer){
  racer.waveKnockback=null;
  racer.vx=0;racer.vz=0;racer.speed=0;racer.slip=0;racer.steerInput=0;
  racer.boost=0;racer.driftTime=0;racer.driftCharge=0;racer.driftBoost=0;
  racer.jumpV=0;racer.jumpY=0;racer.blastTime=ROCKET_BLAST_SECONDS;racer.blastRoll=0;
  racer.blastRecovering=true;
}

export function startWaveKnockback(target,source){
  const dx=target.x-source.x,dz=target.z-source.z,length=Math.hypot(dx,dz);
  const fallback=source.yaw+(target.grid%2?Math.PI/2:-Math.PI/2);
  target.waveKnockback={x:length>1e-6?dx/length:Math.sin(fallback),z:length>1e-6?dz/length:Math.cos(fallback),elapsed:0};
}

// Integrate a short outward force independently of tyre grip and engine slow.
// Its displacement still enters the normal swept obstacle/collision pipeline.
export function advanceWaveKnockback(racer,dt){
  const push=racer.waveKnockback;
  if(!push)return {x:0,z:0};
  const before=clamp(push.elapsed/WAVE_PUSH_SECONDS,0,1);
  push.elapsed=Math.min(WAVE_PUSH_SECONDS,push.elapsed+dt);
  const after=push.elapsed/WAVE_PUSH_SECONDS;
  const distance=WAVE_PUSH_DISTANCE*((1-before)**3-(1-after)**3);
  if(push.elapsed>=WAVE_PUSH_SECONDS)racer.waveKnockback=null;
  return {x:push.x*distance,z:push.z*distance};
}

export function advanceRocketBlast(racer,dt){
  if(!(racer.blastTime>0))return false;
  racer.blastTime=Math.max(0,racer.blastTime-dt);
  const t=clamp(1-racer.blastTime/ROCKET_BLAST_SECONDS,0,1),eased=t*t*(3-2*t);
  racer.jumpY=4*t*(1-t)*8;racer.blastRoll=Math.PI*2*eased;
  racer.vx=0;racer.vz=0;racer.speed=0;racer.slip=0;racer.steerInput=0;
  racer.blastRecovering=true;
  return true;
}

export function shouldAiUseItem(racer,race){
  if(!racer.item||racer.blastTime>0||racer.blastRecovering||racer.itemHeldFor<.65)return false;
  const others=race.racers.filter(other=>other!==racer&&!other.finished);
  const distance=other=>Math.hypot(other.x-racer.x,other.z-racer.z);
  switch(racer.item.id){
    case 'rocket':return !!selectRocketTarget(race.racers,racer)||racer.itemHeldFor>1.7;
    case 'wave':return others.some(other=>distance(other)<19);
    case 'glue':case 'decoy':return others.some(other=>other.progress<racer.progress&&distance(other)<38)||racer.itemHeldFor>5;
    case 'bubble':return (race.projectiles||[]).some(shot=>shot.targetId===racer.id&&distance(shot)<100)||others.some(other=>distance(other)<11)||racer.itemHeldFor>3;
    case 'spring':return race.track.curvature(racer.nearestS+20)<.018||racer.itemHeldFor>3.2;
    case 'magnet':return racer.itemHeldFor>2;
    default:return false;
  }
}
