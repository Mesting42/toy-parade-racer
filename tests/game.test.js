import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS} from '../src/tracks.js';
import {createRace,tickRace,ITEM_LIST,autopilotInput} from '../src/race.js';
import {freshProfile} from '../src/storage.js';
import {aggregateStandings,raceStandings} from '../src/championship.js';
import {steerFromControls} from '../src/input.js';
import {itemSvg} from '../src/items.js';
import {TOY_CAR_MODELS} from '../src/car-models.js';

const settings={sensitivity:1,effects:1,lowParticles:false,reducedShake:false};

test('left and right controls match the chase-camera screen direction',()=>{
  assert.equal(steerFromControls(true,false),1,'left input turns toward screen-left');
  assert.equal(steerFromControls(false,true),-1,'right input turns toward screen-right');
  assert.equal(steerFromControls(true,true),0,'holding both directions cancels steering');
});

function mockWorld(track){
  const pickupViews=[];
  for(let i=0;i<10;i++){const s=track.length*(.055+i*.094),lane=(i%2?1:-1)*6.8,p=track.at(s,lane);pickupViews.push({group:{position:{x:p.x,y:2.8,z:p.z},visible:true},s,lane,kind:'box'});}
  for(let i=0;i<12;i++){const s=track.length*(.025+i*.079),lane=(i%3-1)*4.2,p=track.at(s,lane);pickupViews.push({group:{position:{x:p.x,y:2.5,z:p.z},visible:true},s,lane,kind:'coin'});}
  return {pickupViews,actors:[],mountCars(r){this.actors=r;},setPickupActive(i,active){this.pickupViews[i].group.visible=active;},setObstaclePosition(){},burst(){},shieldEffect(){},addPuddle(x,z,yaw,decoy){const g={x,z,yaw,decoy,parent:{remove(){}}};return g;}};
}
function makeRace(track,mode='practice',difficulty='expert'){
  const world=mockWorld(track),race=createRace(track,mode,difficulty,freshProfile(),world);race.countdown=0;race.started=true;race.player.maxSkill=.96;race.player.laneTarget=0;race.player.testDriver=true;return race;
}

test('nine circuits have separate closed layouts, three laps and stable nearest-point projection',()=>{
  assert.equal(TRACKS.length,9);
  assert.equal(new Set(TRACKS.map(t=>t.id)).size,9);
  assert.equal(new Set(TRACKS.map(t=>t.points.map(p=>p.join(',')).join('|'))).size,9);
  for(const track of TRACKS){
    assert.equal(track.laps,3);assert.ok(track.length>650,`${track.name} should be long enough for a three-lap race`);
    for(const fraction of[.03,.21,.48,.77,.96]){const p=track.at(track.length*fraction,3),n=track.nearest(p.x,p.z);let delta=Math.abs(n.s-track.length*fraction);delta=Math.min(delta,track.length-delta);assert.ok(delta<.4,`${track.name} projection jumped ${delta}`);assert.ok(Math.abs(n.lateral-3)<.22,`${track.name} lateral offset mismatch`);}
  }
});

for(const track of TRACKS)test(`autopilot completes three physical laps on ${track.name}`,()=>{
  const race=makeRace(track),r=race.player,dt=1/30;let steps=0,maxSpeed=0,recoveries=0,lastRecovery=0;
  while(r.progress<track.length*3&&steps<100000){const state=tickRace(race,autopilotInput(r,race,dt),dt,settings);maxSpeed=Math.max(maxSpeed,r.speed);if(r.recovery>0&&lastRecovery<=0)recoveries++;lastRecovery=r.recovery;steps++;assert.equal(state?.result,undefined);}
  assert.ok(r.progress>=track.length*3,`${track.name} stopped at ${r.progress.toFixed(1)} / ${(track.length*3).toFixed(1)} after ${steps} steps`);
  assert.equal(r.lap,3,`${track.name} lap display should stop at the final race lap`);
  assert.ok(maxSpeed>10,`${track.name} never accelerated`);
  assert.ok(recoveries<5,`${track.name} caused repeated off-road recoveries`);
});

test('quick race starts six racers and freezes its state after the player finishes',()=>{
  const track=TRACKS[0],race=makeRace(track,'quick');assert.equal(race.racers.length,6);
  race.player.progress=track.length*3+.1;race.player.lastS=race.player.nearestS;
  const result=tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:false},.04,settings);
  assert.ok(result?.result);assert.equal(result.result.standings.length,6);assert.equal(result.result.standings.reduce((sum,row)=>sum+row.points,0),28);assert.equal(result.result.standings.find(row=>row.driverId==='player').points,result.result.points);assert.equal(race.finishFrozen,true);const clock=race.elapsed;assert.equal(tickRace(race,{},.04,settings),null);assert.equal(race.elapsed,clock);
});

test('quick and championship mount six unique models for every player selection',()=>{
  for(const mode of ['quick','championship'])for(const selectedCar of ['bee','snail','acorn']){
    const profile=freshProfile();profile.selectedCar=selectedCar;
    const race=createRace(TRACKS[0],mode,'normal',profile,mockWorld(TRACKS[0]));
    assert.equal(race.player.carId,selectedCar);
    assert.equal(new Set(race.racers.map(racer=>TOY_CAR_MODELS[racer.carId].asset)).size,6);
    assert.ok(race.racers.slice(1).every(racer=>racer.driver.carId===racer.carId));
  }
});

test('five computer drivers complete clean three-lap races at every difficulty',()=>{
  const track=TRACKS[0],dt=.04,coast={steer:0,throttle:false,brake:false,drift:false,item:false};
  for(const difficulty of ['easy','normal','expert']){
    const race=makeRace(track,'quick',difficulty),rivals=race.racers.slice(1);race.countdown=0;let steps=0;
    while(rivals.some(r=>!r.finished)&&steps<30000){tickRace(race,coast,dt,settings);for(const r of rivals){assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.z)&&Number.isFinite(r.speed));assert.ok(r.speed<=r.stats.max+8.5,`${difficulty} ${r.driver.name} exceeded the kart's speed limit`);}steps++;}
    assert.ok(rivals.every(r=>r.finished),`${difficulty} computer drivers did not finish`);
    assert.ok(rivals.every(r=>r.progress>=track.length*3),`${difficulty} computer driver was marked finished before completing three laps`);
  }
});

test('all seven authored items activate their actual simulation effect',()=>{
  const track=TRACKS[0];
  for(const item of ITEM_LIST){
    const race=makeRace(track,'quick');race.player.item=item;
    const rival=race.racers[1];rival.x=race.player.x+7;rival.z=race.player.z;rival.lastS=race.player.lastS;rival.hitImmune=0;
    tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:true},.03,settings);
    assert.equal(race.player.item,null,`${item.name} should leave inventory when used`);
    assert.ok(race.itemMessage.text.includes(item.id==='rocket'?'火箭':item.name));if(item.id!=='rocket')assert.ok(race.itemMessage.text.includes(item.hint));assert.ok(race.itemMessage.until>race.elapsed);
    if(item.id==='spring')assert.ok(race.player.boost>0);
    if(item.id==='bubble')assert.ok(race.player.shield>0);
    if(item.id==='glue'||item.id==='decoy')assert.equal(race.traps.length,1);
    if(item.id==='wave')assert.ok(rival.slow>0,'shockwave briefly slows a nearby rival');
    if(item.id==='magnet')assert.ok(race.player.magnet>0);
    if(item.id==='rocket')assert.equal(race.projectiles.length,1);
  }
});

test('item boxes fill one inventory slot and shields absorb one hit',()=>{
  const track=TRACKS[0],race=makeRace(track,'quick'),box=race.items.find(i=>i.kind==='box'),view=race.world.pickupViews[box.viewIndex];
  race.player.x=view.group.position.x;race.player.z=view.group.position.z;race.player.vx=0;race.player.vz=0;race.player.lastS=box.s;race.player.nearestS=box.s;
  tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:false},.03,settings);assert.ok(race.player.item);assert.equal(race.pickupsEarned,1);assert.ok(race.itemMessage.text.includes(race.player.item.category));assert.ok(race.itemMessage.text.includes(race.player.item.target));
  race.player.item=ITEM_LIST.find(i=>i.id==='bubble');race.racers.slice(1).forEach(r=>{r.x+=500;r.z+=500;});
  tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:true},.03,settings);assert.equal(race.player.shield>0,true);
  race.racers[1].x=race.player.x+1;race.racers[1].z=race.player.z;
  tickRace(race,{steer:0,throttle:false,brake:false,drift:false,item:false},.03,settings);assert.equal(race.player.shield,0);assert.equal(race.player.slow,0);assert.ok(race.player.hitImmune>0);
});

test('championship standings total six-racer points across multiple races',()=>{
  const first=raceStandings([{driverId:'peach',name:'桃桃汽水'},{driverId:'player',name:'你'},{driverId:'blue',name:'蓝莓船长'},{driverId:'chestnut',name:'栗子队长'},{driverId:'bean',name:'小豆包'},{driverId:'wood',name:'木木师傅'}]);
  const second=raceStandings([{driverId:'blue',name:'蓝莓船长'},{driverId:'peach',name:'桃桃汽水'},{driverId:'player',name:'你'},{driverId:'chestnut',name:'栗子队长'},{driverId:'bean',name:'小豆包'},{driverId:'wood',name:'木木师傅'}]);
  const table=aggregateStandings([{standings:first},{standings:second}]);
  assert.equal(table[0].driverId,'peach');assert.equal(table[0].points,17);assert.equal(table[0].races,2);
  assert.equal(table.find(row=>row.driverId==='player').points,12);assert.equal(table.find(row=>row.driverId==='player').wins,0);
  assert.equal(new Set(table.map(row=>row.driverId)).size,6);
});

test('all random outcomes have a clear category, target, purpose and authored icon',()=>{
  assert.equal(ITEM_LIST.length,7);
  assert.deepEqual(new Set(ITEM_LIST.map(item=>item.category)),new Set(['加速','防御','攻击','收集']));
  for(const item of ITEM_LIST){assert.ok(item.target);assert.ok(item.shortHint.length<=18);assert.ok(item.hint);assert.match(itemSvg[item.id],/^<svg/);}
  assert.equal(ITEM_LIST.filter(item=>item.category==='攻击').length,4);
});
