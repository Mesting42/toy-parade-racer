import test from 'node:test';
import assert from 'node:assert/strict';
import {OBSTACLE_PARTS,obstacleContacts,obstaclePose,resolveObstacleMotion} from '../src/obstacles.js';
import {TRACKS} from '../src/tracks.js';
import {createRace,tickRace} from '../src/race.js';
import {freshProfile} from '../src/storage.js';

const pose={x:0,y:.35,z:0,yaw:0};
const kart=(x,z,extra={})=>({x,z,y:.1,yaw:0,vx:0,vz:0,speed:0,jumpY:0,...extra});

test('the full yellow bar and separate blue wheel are solid beyond the old central circle',()=>{
  for(const point of [{x:2.8,z:7,part:'bar'},{x:6.2,z:0,part:'wheel'}]){
    const r=kart(point.x,point.z,{hitImmune:1});assert.ok(Math.hypot(r.x,r.z)>4.3);
    assert.ok(obstacleContacts(r,pose).some(c=>c.part===point.part));
    assert.equal(resolveObstacleMotion(r,pose).hit,true);
    assert.deepEqual(obstacleContacts(r,pose),[],'the kart must be separated from all visible parts');
  }
  assert.equal(OBSTACLE_PARTS[0].length,16);
});

test('rotated obstacle ends use the same transform as the rendered toy',()=>{
  const p={x:35,y:.4,z:-20,yaw:1.1},x=2.8,z=7,r=kart(p.x+Math.cos(p.yaw)*x+Math.sin(p.yaw)*z,p.z-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z,{yaw:p.yaw});
  assert.ok(obstacleContacts(r,p).length>0);resolveObstacleMotion(r,p);
  assert.deepEqual(obstacleContacts(r,p),[]);
});

test('swept collision prevents a fast kart from crossing the bar or wheel between frames',()=>{
  const r=kart(12,0,{previousX:-12,previousZ:0,vx:31});
  const hit=resolveObstacleMotion(r,pose,pose,.04);assert.equal(hit.hit,true);assert.ok(r.x<0,'stop on the approach side');assert.ok(r.vx<=0);assert.deepEqual(obstacleContacts(r,pose),[]);
  const wheel=kart(3,0,{previousX:10,previousZ:0,vx:-31});
  assert.equal(resolveObstacleMotion(wheel,pose,pose,.04).part,'wheel');assert.ok(wheel.x>7);assert.deepEqual(obstacleContacts(wheel,pose),[]);
});

test('a moving obstacle pushes a stationary kart without leaving it embedded',()=>{
  const r=kart(0,0),previous={...pose,x:-8},current={...pose,x:8};
  assert.equal(resolveObstacleMotion(r,current,previous,.04).hit,true);assert.ok(r.x>12);assert.deepEqual(obstacleContacts(r,current),[]);assert.ok(Math.hypot(r.vx,r.vz)<12);
});

test('clear routes and airborne karts outside the obstacle height are not blocked',()=>{
  for(const r of [kart(-8,0),kart(0,0,{jumpY:8})]){const before={x:r.x,z:r.z};assert.equal(resolveObstacleMotion(r,pose).hit,false);assert.equal(r.x,before.x);assert.equal(r.z,before.z);}
});

function collisionRace(){
  const world={pickupViews:[],mountCars(){},buildPickups(){},setObstaclePosition(p){this.pose=p;},burst(){},shieldEffect(){}};
  const race=createRace(TRACKS[0],'practice','normal',freshProfile(),world);race.countdown=0;race.started=true;
  const p=obstaclePose(race.track,.03);race.player.x=p.x;race.player.z=p.z;race.player.lastS=race.track.nearest(p.x,p.z).s;
  return race;
}
test('hit protection and a shield prevent repeated damage but cannot disable solid collision',()=>{
  for(const shield of [false,true]){
    const race=collisionRace(),r=race.player;r.hitImmune=shield?0:1;r.shield=shield?3:0;
    tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:false},.03,{sensitivity:1});
    assert.deepEqual(obstacleContacts(r,race.world.pose),[]);assert.equal(r.slow,0);assert.equal(r.shield,0);assert.ok(r.hitImmune>0);
  }
});
