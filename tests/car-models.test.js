import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TOY_CAR_MODELS,TOY_CAR_LENGTH,TOY_CAR_PAINT_ROWS,updateToyCarWheels,raceCarLineup} from '../src/car-models.js';
import {KART_COLLIDER} from '../src/obstacles.js';

test('six distinct local diecast shells have no characters and retain four separate wheels',()=>{
  assert.equal(new Set(Object.values(TOY_CAR_MODELS).map(c=>c.asset)).size,6);
  assert.deepEqual(TOY_CAR_PAINT_ROWS,[4,5]);
  for(const config of Object.values(TOY_CAR_MODELS)){
    const bytes=fs.readFileSync(new URL(`../public/assets/kenney-toy-car-kit/${config.asset}.glb`,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'glTF');
    const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.ok(!json.nodes.some(n=>/character|helmet|pilot/i.test(n.name)));
    const wheels=json.nodes.filter(n=>/^wheel-/.test(n.name));assert.equal(wheels.length,4);
    assert.ok(wheels.filter(n=>/wheel-f/.test(n.name)).every(n=>n.translation[2]<0),'source model faces -Z');
    const body=json.accessors[json.meshes[0].primitives[0].attributes.POSITION],scale=TOY_CAR_LENGTH/(body.max[2]-body.min[2]);
    assert.ok((body.max[0]-body.min[0])*scale<KART_COLLIDER.halfWidth*2);
    assert.ok(body.max[1]*scale<KART_COLLIDER.height);
    assert.equal(TOY_CAR_LENGTH,KART_COLLIDER.halfLength*2);
    const uv=json.accessors[json.meshes[0].primitives[0].attributes.TEXCOORD_0],bufferView=json.bufferViews[uv.bufferView],binaryStart=28+bytes.readUInt32LE(12);let painted=0;
    for(let i=0;i<uv.count;i++){
      const offset=binaryStart+(bufferView.byteOffset||0)+(uv.byteOffset||0)+i*(bufferView.byteStride||8),column=Math.floor(bytes.readFloatLE(offset)*8),row=Math.floor(bytes.readFloatLE(offset+4)*8);
      if((config.paintColumns||[config.paintColumn]).includes(column)&&TOY_CAR_PAINT_ROWS.includes(row))painted++;
    }
    assert.ok(painted>uv.count*(config.minPaintCoverage||.45),`${config.asset}: paint cells must cover the actual body UVs`);
    for(const image of json.images)assert.ok(fs.existsSync(new URL(`../public/assets/kenney-toy-car-kit/${image.uri}`,import.meta.url)));
  }
  assert.match(fs.readFileSync(new URL('../public/assets/kenney-toy-car-kit/License.txt',import.meta.url),'utf8'),/CC0/);
});

test('each selectable player car leaves five different opponent model assets',()=>{
  for(const player of ['bee','snail','acorn']){
    const lineup=raceCarLineup(player);assert.equal(lineup[0],player);assert.equal(lineup.length,6);
    assert.equal(new Set(lineup.map(id=>TOY_CAR_MODELS[id].asset)).size,6);
    assert.ok(lineup.slice(1).every(id=>TOY_CAR_MODELS[id].asset!==TOY_CAR_MODELS[player].asset));
  }
});

test('wheels roll with actual travel, steer at a separate pivot and stop rolling when stationary',()=>{
  const wheels=[true,true,false,false].map(frontWheel=>({userData:{frontWheel},rotation:{x:0},parent:{rotation:{y:0}}})),view={userData:{kenneyWheels:wheels,wheelTravel:0}},racer={x:0,z:0,steerInput:1};
  updateToyCarWheels(view,racer);racer.z=.88;updateToyCarWheels(view,racer);
  assert.ok(wheels.every(w=>Math.abs(w.rotation.x+1)<1e-10));
  assert.deepEqual(wheels.map(w=>w.parent.rotation.y),[.3,.3,0,0]);
  updateToyCarWheels(view,racer);assert.ok(wheels.every(w=>Math.abs(w.rotation.x+1)<1e-10),'duplicate refresh must not double rotation');
  racer.steerInput=-1;updateToyCarWheels(view,racer);assert.deepEqual(wheels.map(w=>w.parent.rotation.y),[-.3,-.3,0,0]);
  racer.z=1000;updateToyCarWheels(view,racer);assert.ok(view.userData.wheelTravel<5,'reset should not cause a wild spin');
});
