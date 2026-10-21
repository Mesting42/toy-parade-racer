// One definition drives the visible toy and its physical collision volumes.
export const OBSTACLE_PARTS=Object.freeze([
  Object.freeze({id:'bar',x:0,y:1.5,z:0,width:4,height:2.2,length:16,yaw:.12}),
  Object.freeze({id:'wheel',x:5,y:2,z:0,width:1.4,height:5.4,length:5.4,yaw:0,radius:2,tube:.7}),
]);
export const KART_COLLIDER=Object.freeze({halfWidth:2.05,halfLength:3.075,height:3.7,bottom:.08});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=a=>((a+Math.PI*3)%(Math.PI*2))-Math.PI;

export function obstaclePose(track,elapsed=0){
  const phase=elapsed*1.5,lane=Math.sin(phase)*6.3,p=track.at(track.length*track.obstacle,lane);
  return {x:p.x,y:.35+Math.sin(phase)*.15,z:p.z,yaw:p.yaw+Math.sin(phase*1.3)*.35,lane};
}
function partBox(pose,part){
  const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw),yaw=pose.yaw+part.yaw;
  return {x:pose.x+c*part.x+s*part.z,z:pose.z-s*part.x+c*part.z,y:pose.y+part.y,
    halfWidth:part.width/2,halfLength:part.length/2,height:part.height,yaw,id:part.id};
}
function axes(yaw){return [{x:Math.cos(yaw),z:-Math.sin(yaw)},{x:Math.sin(yaw),z:Math.cos(yaw)}];}
function overlap(racer,x,z,box){
  const bottom=(racer.y||0)+(racer.jumpY||0)+KART_COLLIDER.bottom;
  if(bottom>=box.y+box.height/2||bottom+KART_COLLIDER.height<=box.y-box.height/2)return null;
  const a=axes(racer.yaw||0),b=axes(box.yaw),dx=x-box.x,dz=z-box.z;
  let depth=Infinity,normal=null;
  for(const axis of [...a,...b]){
    const dot=(u,v)=>u.x*v.x+u.z*v.z;
    const ra=KART_COLLIDER.halfWidth*Math.abs(dot(axis,a[0]))+KART_COLLIDER.halfLength*Math.abs(dot(axis,a[1]));
    const rb=box.halfWidth*Math.abs(dot(axis,b[0]))+box.halfLength*Math.abs(dot(axis,b[1]));
    const distance=dx*axis.x+dz*axis.z,penetration=ra+rb-Math.abs(distance);
    if(penetration<=0)return null;
    if(penetration<depth){depth=penetration;const sign=Math.abs(distance)>1e-7?Math.sign(distance):((racer.vx||0)*axis.x+(racer.vz||0)*axis.z>0?-1:1);normal={x:axis.x*sign,z:axis.z*sign};}
  }
  return {depth,normal,part:box.id};
}

export function obstacleContacts(racer,pose){
  return OBSTACLE_PARTS.map(part=>overlap(racer,racer.x,racer.z,partBox(pose,part))).filter(Boolean);
}

// Sweep both bodies in small steps; damage immunity never removes solid geometry.
export function resolveObstacleMotion(racer,pose,previousPose=pose,dt=1/30){
  const previousX=racer.previousX??racer.x,previousZ=racer.previousZ??racer.z;
  const travel=Math.hypot(racer.x-previousX,racer.z-previousZ),teleported=racer.recovery>0&&travel>8;
  let x=teleported?racer.x:previousX,z=teleported?racer.z:previousZ;
  const movement=Math.hypot(pose.x-previousPose.x,pose.z-previousPose.z)+Math.abs(wrap(pose.yaw-previousPose.yaw))*10;
  if(Math.hypot(racer.x-pose.x,racer.z-pose.z)>16+travel+movement)return {hit:false,impact:0,part:null};
  const steps=Math.max(1,Math.min(256,Math.ceil(((teleported?0:travel)+movement)/.3)));
  let mx=(racer.x-x)/steps,mz=(racer.z-z)/steps,hit=false,impact=0,part=null;
  const safeDt=Math.max(dt,.001),ox=clamp((pose.x-previousPose.x)/safeDt,-10,10),oz=clamp((pose.z-previousPose.z)/safeDt,-10,10);
  for(let i=1;i<=steps;i++){
    x+=mx;z+=mz;const t=i/steps,current={x:previousPose.x+(pose.x-previousPose.x)*t,y:previousPose.y+(pose.y-previousPose.y)*t,z:previousPose.z+(pose.z-previousPose.z)*t,yaw:previousPose.yaw+wrap(pose.yaw-previousPose.yaw)*t};
    for(let pass=0;pass<6;pass++){
      let touching=false;
      for(const definition of OBSTACLE_PARTS){
        const contact=overlap(racer,x,z,partBox(current,definition));if(!contact)continue;
        touching=true;hit=true;part=contact.part;const n=contact.normal;
        x+=n.x*(contact.depth+.015);z+=n.z*(contact.depth+.015);
        const motionDot=mx*n.x+mz*n.z;if(motionDot<0){mx-=n.x*motionDot;mz-=n.z*motionDot;}
        const velocityDot=((racer.vx||0)-ox)*n.x+((racer.vz||0)-oz)*n.z;
        if(velocityDot<0){impact=Math.max(impact,-velocityDot);racer.vx=(racer.vx||0)-n.x*velocityDot*1.08;racer.vz=(racer.vz||0)-n.z*velocityDot*1.08;}
      }
      if(!touching)break;
    }
  }
  racer.x=x;racer.z=z;
  if(hit){racer.speed=Math.max(0,(racer.vx||0)*Math.sin(racer.yaw)+(racer.vz||0)*Math.cos(racer.yaw));racer.slip=(racer.vx||0)*Math.cos(racer.yaw)-(racer.vz||0)*Math.sin(racer.yaw);}
  return {hit,impact,part};
}

export function obstaclePassLane(track,pose,preferred=0){
  const center=track.at(track.length*track.obstacle),normal={x:center.tz,z:-center.tx};let min=Infinity,max=-Infinity;
  for(const part of OBSTACLE_PARTS){const box=partBox(pose,part),a=axes(box.yaw),middle=(box.x-center.x)*normal.x+(box.z-center.z)*normal.z;
    const radius=box.halfWidth*Math.abs(a[0].x*normal.x+a[0].z*normal.z)+box.halfLength*Math.abs(a[1].x*normal.x+a[1].z*normal.z);min=Math.min(min,middle-radius);max=Math.max(max,middle+radius);}
  const limit=track.width/2-KART_COLLIDER.halfWidth-.45,margin=KART_COLLIDER.halfWidth+.8;
  const candidates=[min-margin,max+margin].filter(lane=>Math.abs(lane)<=limit);
  if(candidates.length)return candidates.sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred))[0];
  return min+track.width/2>track.width/2-max?-limit:limit;
}
