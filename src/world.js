import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {OBSTACLE_PARTS,obstaclePose} from './obstacles.js';
import {TOY_CAR_MODELS,TOY_CAR_LENGTH,TOY_CAR_PAINT_ROWS,updateToyCarWheels} from './car-models.js';
import {ItemEffectsSystem} from './item-effects.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {addToyCarDetails} from './car-details.js';
import {readViewportLayout,raceFraming} from './display.js';

const PALETTES={
  blocks:{sky:'#f8d98f',ground:'#93b867',road:'#d79d5f',edge:'#8c5a39',stripe:'#fff0b7',wood:'#a96840',green:'#5d9f64',flower:'#ed7862'},
  paper:{sky:'#cde9ec',ground:'#b48c60',road:'#c98552',edge:'#81563e',stripe:'#f6d77a',wood:'#b47c51',green:'#7aa66c',flower:'#e76c54'},
  workshop:{sky:'#ddd4ed',ground:'#d39a91',road:'#a68577',edge:'#70566e',stripe:'#f2d27b',wood:'#a36c4f',green:'#74a276',flower:'#e36a83'},
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function material(color,roughness=.72,metalness=0,extra={}){const Type=extra.clearcoat?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;return new Type({color,roughness,metalness,...extra});}
function canvasTexture(theme,kind='road'){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),p=PALETTES[theme];
  x.fillStyle=kind==='road'?p.road:kind==='board'?p.ground:p.edge;x.fillRect(0,0,512,512);
  let seed=theme.length*133+kind.length*311;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='road'){
    if(theme==='blocks'){
      for(let i=0;i<3800;i++){x.fillStyle=rand()>.5?'rgba(255,244,213,.13)':'rgba(107,72,48,.10)';const a=rand()*2+1;x.fillRect(rand()*512,rand()*512,a,rand()*2+1);}
      for(let i=0;i<22;i++){const xx=rand()*512;x.strokeStyle=i%3?'rgba(104,66,43,.10)':'rgba(255,238,193,.18)';x.lineWidth=1+rand()*2;x.beginPath();x.moveTo(xx,0);x.bezierCurveTo(xx-8,140,xx+12,360,xx-2,512);x.stroke();}
      for(let i=0;i<7;i++){const xx=rand()*512,yy=rand()*512;x.strokeStyle='rgba(94,60,40,.15)';x.beginPath();x.ellipse(xx,yy,4+rand()*5,1.5+rand()*2,0,0,Math.PI*2);x.stroke();}
    }else if(theme==='paper'){
      for(let y=0;y<512;y+=15){x.strokeStyle=y%45===0?'rgba(255,236,195,.20)':'rgba(89,58,39,.12)';x.lineWidth=y%45===0?2:1;x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
      for(let i=0;i<3000;i++){x.fillStyle=rand()>.5?'rgba(255,241,211,.16)':'rgba(95,60,39,.10)';x.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*2);}
    }else{
      for(let p=0;p<512;p+=10){x.strokeStyle='rgba(255,239,222,.16)';x.lineWidth=1;x.beginPath();x.moveTo(p,0);x.lineTo(p,512);x.stroke();x.strokeStyle='rgba(112,69,79,.10)';x.beginPath();x.moveTo(0,p);x.lineTo(512,p);x.stroke();}
      for(let i=0;i<2200;i++){x.fillStyle=rand()>.5?'rgba(255,244,231,.17)':'rgba(89,56,68,.09)';x.fillRect(rand()*512,rand()*512,1+rand()*2,1+rand()*3);}
    }
    x.strokeStyle='rgba(255,239,196,.20)';x.lineWidth=2;for(let y=0;y<512;y+=96){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
  } else if(kind==='board'&&theme==='blocks'){
    for(let i=0;i<9500;i++){x.fillStyle=rand()>.5?'rgba(244,235,195,.16)':'rgba(55,94,46,.12)';x.beginPath();x.ellipse(rand()*512,rand()*512,1+rand()*2,1+rand()*1.5,rand()*3,0,Math.PI*2);x.fill();}
    x.strokeStyle='rgba(245,233,190,.25)';x.lineWidth=2;for(let y=24;y<512;y+=112){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
  } else if(kind==='board'&&theme==='paper'){
    for(let i=0;i<110;i++){const y=rand()*512;x.strokeStyle=i%3?'rgba(91,58,36,.11)':'rgba(245,218,173,.22)';x.lineWidth=1+rand()*2;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(140,y-4,330,y+7,512,y-2);x.stroke();}
    for(let i=0;i<2400;i++){x.fillStyle=rand()>.5?'rgba(255,235,194,.13)':'rgba(88,60,44,.09)';x.fillRect(rand()*512,rand()*512,2+rand()*3,1+rand()*2);}
  } else if(kind==='board'&&theme==='workshop'){
    x.strokeStyle='rgba(255,239,220,.18)';x.lineWidth=1;for(let y=0;y<512;y+=9){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
    x.strokeStyle='rgba(108,66,80,.10)';for(let a=0;a<512;a+=11){x.beginPath();x.moveTo(a,0);x.lineTo(a,512);x.stroke();}
  } else {
    for(let i=0;i<200;i++){x.strokeStyle=`rgba(108,73,49,${.04+rand()*.07})`;x.lineWidth=1+rand()*2;x.beginPath();let y=rand()*512;x.moveTo(0,y);x.bezierCurveTo(140,y-12,330,y+16,512,y-4);x.stroke();}
    for(let i=0;i<1200;i++){x.fillStyle=rand()>.5?'rgba(255,244,215,.2)':'rgba(111,71,45,.1)';x.fillRect(rand()*512,rand()*512,2,1);}
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function disposeTree(root){root.traverse(o=>{if(!o.userData?.kenneySharedGeometry)o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m.userData?.kenneySharedMap)m.map?.dispose?.();m.dispose?.();}}});root.clear();}
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function terrainRelief(theme,wave,x,z){
  if(theme==='blocks')return 1.8+wave*5.6+Math.max(0,Math.sin(x*.009)*Math.cos(z*.012))*8.5;
  if(theme==='paper')return 2.8+Math.abs(wave)*8+Math.max(0,Math.sin(x*.011+z*.007))**2*19;
  return 1+wave*2.4+Math.sin(z*.015)*1.15;
}
function buildDioramaGround(track,width,depth,cx,cz){
  const segments=84,geo=new THREE.PlaneGeometry(width,depth,segments,segments);geo.rotateX(-Math.PI/2);geo.translate(cx,0,cz);
  const positions=geo.attributes.position,colors=[],palette=PALETTES[track.theme],low=new THREE.Color(palette.ground),high=new THREE.Color(track.theme==='blocks'?'#bed889':track.theme==='paper'?'#e1bd89':'#efc4b3');
  const route=track.samples.filter((_,i)=>i%4===0);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);let nearest=Infinity;
    for(const p of route){const dx=x-p.x,dz=z-p.z,d=dx*dx+dz*dz;if(d<nearest)nearest=d;}
    const distance=Math.sqrt(nearest),lift=smoothstep(track.width*.5+9,track.width*.5+82,distance);
    const wave=Math.sin(x*.021+z*.009)*Math.cos(z*.023-x*.006)+.42*Math.sin(x*.044-z*.031);
    const relief=terrainRelief(track.theme,wave,x,z),y=-.43+lift*Math.max(1.35,relief);positions.setY(i,y);
    const tint=clamp((y+.43)/(track.theme==='paper'?28:16),0,1);const c=low.clone().lerp(high,tint*.56);if(track.theme==='paper'&&Math.floor(y/3)%2===0)c.multiplyScalar(.91);colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}

export const CAR_DATA=[
  {id:'bee',name:'黄蜂冲锋',motto:'起步快，直线轻盈',color:'#f0bf37',secondary:'#e95a43',stats:{accel:1.18,max:23.4,turn:1.03,drift:1.08,resist:.92}},
  {id:'snail',name:'蘑菇慢邮',motto:'弯里稳，抗撞更从容',color:'#58a8a0',secondary:'#f0dcab',stats:{accel:.95,max:21.7,turn:1.19,drift:.96,resist:1.22}},
  {id:'acorn',name:'松果铁皮',motto:'耐撞稳，漂移蓄得快',color:'#b77a50',secondary:'#769654',stats:{accel:1.03,max:22.2,turn:.92,drift:1.2,resist:1.34}},
];
export const RACE_CAR_DATA=[...CAR_DATA,
  {...CAR_DATA[0],id:'drag',name:'流星长尾',color:'#dc6546',secondary:'#f2db9a'},
  {...CAR_DATA[2],id:'vintage',name:'复古银箭',color:'#8098c5',secondary:'#eee2c4'},
  {...CAR_DATA[1],id:'suv',name:'薄荷越野',color:'#65995d',secondary:'#eac354'},
];
export const PAINTS=[{id:'sun',name:'蜂蜜黄',color:'#f0bf37',cost:0},{id:'coral',name:'番茄红',color:'#e65d4c',cost:65},{id:'lagoon',name:'玻璃海',color:'#4e9fab',cost:65},{id:'plum',name:'桑葚紫',color:'#826ba4',cost:85},{id:'mint',name:'薄荷绿',color:'#84b87b',cost:85},{id:'berry',name:'莓果棕',color:'#b77a50',cost:0},{id:'cream',name:'奶油白',color:'#f3e4b6',cost:100}];

export class ToyWorld {
  constructor(canvas,settings){
    this.canvas=canvas;this.settings=settings;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f5e7c2');this.scene.fog=new THREE.Fog('#f5e7c2',300,950);
    this.camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.1,1800);this.camera.position.set(0,280,360);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(this.renderer);this.carEnvironment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight('#fff4dc','#7b805f',2.05));this.sun=new THREE.DirectionalLight('#fff0c8',3.4);this.sun.position.set(-140,250,110);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-410;this.sun.shadow.camera.right=410;this.sun.shadow.camera.top=410;this.sun.shadow.camera.bottom=-410;this.sun.shadow.bias=-.00035;this.scene.add(this.sun);
    this.trackRoot=new THREE.Group();this.scene.add(this.trackRoot);this.actorRoot=new THREE.Group();this.scene.add(this.actorRoot);this.particleRoot=new THREE.Group();this.scene.add(this.particleRoot);
    this.itemFx=new ItemEffectsSystem(this.scene);this.raceState=null;
    this.actors=[];this.pickupViews=[];this.obstacleView=null;this.playerView=null;this.particles=[];this.particleMesh=null;this.track=null;this.cameraMode='menu';this.cameraLook=new THREE.Vector3(0,0,0);this.lastTime=0;this.kitModels=new Map();this.kitTrackRoot=null;this.jumpView=null;this.currentPlayerPaint=CAR_DATA[0].color;this.showcaseConfig=null;
    this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.resize();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);this.loadKitModels();
  }
  applyQuality(q){const dpr=Math.min(devicePixelRatio||1,q==='low'?1.15:q==='high'?1.7:1.4);this.renderer.setPixelRatio(dpr);this.renderer.shadowMap.enabled=q!=='low';this.renderer.setSize(innerWidth,innerHeight,false);}
  resize(){if(!this.renderer)return;const layout=readViewportLayout();this.camera.aspect=innerWidth/innerHeight;this.camera.fov=raceFraming(layout).fov;this.camera.updateProjectionMatrix();this.applyQuality(this.settings.quality==='auto'?layout.quality:this.settings.quality);}
  setSettings(settings){this.settings=settings;this.resize();}
  async loadKitModels(){
    const loader=new GLTFLoader(),names=['roadStart','roadRamp','grandStand','gate-finish','track-wide-straight','track-wide-straight-bump-up','track-wide-straight-hill-complete','track-wide-corner-large-ramp','tree','tree-pine',...Object.values(TOY_CAR_MODELS).map(config=>config.asset)];
    await Promise.all(names.map(async name=>{
      try{
        const pack=name.startsWith('vehicle-')||name==='gate'||name==='gate-finish'||name.startsWith('track-')||name==='tree'||name==='tree-pine'?'kenney-toy-car-kit':name.startsWith('kart-')?'kenney-car-kit':'kenney-racing-kit';
        const gltf=await loader.loadAsync(`/assets/${pack}/${name}.glb`),scene=gltf.scene;
        const wheels=[];scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.userData.kenneySharedGeometry=true;if(/^(Mesh_wheel|wheel-)/.test(o.name))wheels.push(o);});
        // Collect first: reparenting during traverse would skip alternating wheels.
        for(const o of wheels){o.geometry.computeBoundingBox();const center=o.geometry.boundingBox.getCenter(new THREE.Vector3()),offset=center.clone().multiply(o.scale).applyQuaternion(o.quaternion),geometry=o.geometry.clone();geometry.translate(-center.x,-center.y,-center.z);o.geometry=geometry;const pivot=new THREE.Group(),parent=o.parent;pivot.name=`${o.name}-spinPivot`;pivot.userData.kenneyWheelPivot=true;const steering=new THREE.Group();steering.name=o.name+'-steeringPivot';parent.add(steering);parent.remove(o);steering.position.copy(o.position).add(offset);steering.add(pivot);pivot.add(o);o.position.set(0,0,0);}
        scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(scene),center=box.getCenter(new THREE.Vector3()),size=new THREE.Vector3();box.getSize(size);this.kitModels.set(name,{scene,box,center,size});
      }catch(error){console.warn(`Local Kenney model unavailable: ${name}`,error);}
    }));
    if(this.track)this.buildKitTrack(this.track);
    if(this.showcaseConfig)this.refreshShowcaseCar();
    if(this.actors.length)this.refreshActiveCars();
  }
  cloneKitModel(name,{theme=null,paint=null,ghost=false}={}){
    const asset=this.kitModels.get(name);if(!asset)return null;const model=asset.scene.clone(true),palette=theme?PALETTES[theme]:null;
    model.traverse(o=>{if(!o.isMesh)return;o.userData.kenneySharedGeometry=true;const mats=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.material=mats;
      for(const m of Array.isArray(mats)?mats:[mats]){if(m.map)m.userData.kenneySharedMap=true;if(paint&&(o.name==='Mesh_body_1'||o.name===name))m.color.set(paint);if(palette&&m.name==='road')m.color.set(palette.road);if(palette&&m.name==='grass')m.color.set(palette.ground);if(palette&&m.name==='grey')m.color.set('#f3e5c4');if(palette&&m.name==='red')m.color.set(palette.flower||palette.stripe);m.roughness=Math.max(m.roughness||0,.68);if(ghost){m.transparent=true;m.opacity=.34;m.depthWrite=false;}}
    });return model;
  }
  fitKitModel(name,model,sx,sy,sz,floor=0){const asset=this.kitModels.get(name);if(!asset)return;model.scale.set(sx,sy,sz);model.position.set(-asset.center.x*sx,-asset.box.min.y*sy+floor,-asset.center.z*sz);}
  buildKitTrack(track){
    if(this.kitTrackRoot){this.trackRoot.remove(this.kitTrackRoot);disposeTree(this.kitTrackRoot);}
    this.kitTrackRoot=new THREE.Group();this.trackRoot.add(this.kitTrackRoot);const add=(name,point,scale,yaw,theme=track.theme)=>{if(!this.kitModels.has(name))return null;const model=this.cloneKitModel(name,{theme});this.fitKitModel(name,model,...scale);const mount=new THREE.Group();mount.position.set(point.x,point.y,point.z);mount.rotation.y=yaw;mount.add(model);this.kitTrackRoot.add(mount);return mount;};
    const start=track.at(3),gateName=this.kitModels.has('gate-finish')?'gate-finish':'roadStart',gateAsset=this.kitModels.get(gateName);if(gateAsset){const model=this.cloneKitModel(gateName,{theme:track.theme}),scale=[track.width*.62/gateAsset.size.x,3.9/gateAsset.size.y,1.45/gateAsset.size.z];this.fitKitModel(gateName,model,...scale);const mount=new THREE.Group();mount.position.set(start.x,start.y,start.z);mount.rotation.y=start.yaw;mount.add(model);this.kitTrackRoot.add(mount);}
    // Local Kenney straight tiles become textured, low profile shoulders that follow each route.
    const tileName='track-wide-straight',tileAsset=this.kitModels.get(tileName);if(tileAsset){
      const tileWidth=2.4,template=this.cloneKitModel(tileName,{theme:track.theme,paint:track.accent});this.fitKitModel(tileName,template,tileWidth,.72,1,0);template.updateMatrixWorld(true);
      const tileCount=Math.ceil(track.length/4.1),step=track.length/tileCount,placement=new THREE.Object3D();
      template.traverse(part=>{if(!part.isMesh)return;const panels=new THREE.InstancedMesh(part.geometry,part.material,tileCount*2);panels.name='Kenney modular track shoulders';panels.castShadow=true;panels.receiveShadow=true;panels.userData.kenneySharedGeometry=true;let instance=0;
        for(let i=0;i<tileCount;i++){const distance=(i+.5)*step;for(const side of[-1,1]){const point=track.at(distance,side*(track.width*.5-tileWidth));placement.position.set(point.x,.255,point.z);placement.rotation.set(0,point.yaw,0);placement.scale.set(1,1,1);placement.updateMatrix();panels.setMatrixAt(instance++,placement.matrix.clone().multiply(part.matrixWorld));}}
        panels.instanceMatrix.needsUpdate=true;panels.computeBoundingSphere();this.kitTrackRoot.add(panels);
      });
      template.traverse(part=>{if(part.isMesh)part.material=null;});disposeTree(template);
    }
    const rampNames={blocks:'track-wide-straight-bump-up',paper:'track-wide-straight-hill-complete',workshop:'track-wide-corner-large-ramp'},rampName=this.kitModels.has(rampNames[track.theme])?rampNames[track.theme]:'roadRamp',rampAsset=this.kitModels.get(rampName),jump=track.at(track.length*track.jump);if(rampAsset){if(this.jumpView?.parent)this.jumpView.visible=false;const model=this.cloneKitModel(rampName,{theme:track.theme,paint:track.accent}),height=track.theme==='paper'?1.2:1.05,scale=[track.width*.78/rampAsset.size.x,height/rampAsset.size.y,(track.theme==='workshop'?10:8)/rampAsset.size.z];this.fitKitModel(rampName,model,...scale);const mount=new THREE.Group();mount.position.set(jump.x,jump.y,jump.z);mount.rotation.y=jump.yaw;mount.add(model);this.kitTrackRoot.add(mount);this.jumpKitView=mount;}
    const stand=track.at(track.length*.035,track.width/2+58);add('grandStand',stand,[7.7,7.7,7.7],stand.yaw+Math.PI/2);
    const treeName=track.theme==='paper'?'tree-pine':'tree',treeAsset=this.kitModels.get(treeName);if(treeAsset){for(let i=0;i<10;i++){const side=i%2?1:-1,a=track.at(track.length*(i+.35)/10,side*(track.width/2+48)),point={...a,y:this.groundHeightAt(a.x,a.z)},treeHeight=12+(i%3)*1.5,treeScale=treeHeight/treeAsset.size.y;add(treeName,point,[treeScale,treeScale,treeScale],a.yaw+(i%3-1)*.16);}}
  }
  makeKitCar(carId,color,secondary,index=0,ghost=false){
    const config=TOY_CAR_MODELS[carId]||TOY_CAR_MODELS.bee,assetName=config.asset;if(!this.kitModels.has(assetName))return null;
    // Toy Car Kit faces -Z; the game's forward direction is +Z.
    const model=this.cloneKitModel(assetName,{ghost}),asset=this.kitModels.get(assetName),scale=TOY_CAR_LENGTH/asset.size.z;
    this.fitKitModel(assetName,model,scale,scale,scale,-.4);
    const group=new THREE.Group(),shell=new THREE.Group();shell.rotation.y=Math.PI;shell.add(model);group.add(shell);
    group.userData={carId,ghost,index,kenneyAsset:true,kenneyWheels:[],wheelTravel:0};
    model.traverse(o=>{
      if(!o.isMesh)return;
      const wheel=/^wheel-/.test(o.name),old=o.material;
      if(wheel){o.scale.x*=1.23;old.roughness=.84;old.metalness=.06;return;}
      // Only repaint the original body-color atlas cells. Glass, lights and tires keep their own colors.
      const palette=document.createElement('canvas');palette.width=palette.height=512;const ctx=palette.getContext('2d');ctx.drawImage(old.map.image,0,0,512,512);
      const paint=new THREE.Color(color);
      for(const column of config.paintColumns||[config.paintColumn])for(const row of TOY_CAR_PAINT_ROWS){const shade=paint.clone().multiplyScalar(row===4?1.13:.91);ctx.fillStyle='#'+shade.getHexString();ctx.fillRect(column*64,row*64,64,64);}
      const map=new THREE.CanvasTexture(palette);map.colorSpace=THREE.SRGBColorSpace;map.flipY=old.map.flipY;map.magFilter=THREE.NearestFilter;map.minFilter=THREE.LinearMipmapLinearFilter;
      o.material=new THREE.MeshPhysicalMaterial({map,roughness:.29,metalness:.34,clearcoat:.95,clearcoatRoughness:.15,envMap:this.carEnvironment.texture,envMapIntensity:.62,transparent:ghost,opacity:ghost?.34:1,depthWrite:!ghost});old.dispose();
    });
    model.traverse(o=>{if(o.userData?.kenneyWheelPivot){o.userData.frontWheel=/wheel-f/.test(o.name);group.userData.kenneyWheels.push(o);}});
    addToyCarDetails(model,group,carId,secondary,this.carEnvironment.texture);
    // A small enamel number on the rear replaces the oversized character badge.
    const plateCanvas=document.createElement('canvas');plateCanvas.width=256;plateCanvas.height=128;const pc=plateCanvas.getContext('2d');pc.fillStyle='#fff0cf';pc.beginPath();pc.roundRect(0,0,256,128,22);pc.fill();pc.strokeStyle=secondary;pc.lineWidth=10;pc.stroke();pc.fillStyle='#254a42';pc.font='bold 92px sans-serif';pc.textAlign='center';pc.textBaseline='middle';pc.fillText(String(index||1).padStart(2,'0'),128,69);
    const plateMap=new THREE.CanvasTexture(plateCanvas);plateMap.colorSpace=THREE.SRGBColorSpace;const plate=mesh(new THREE.PlaneGeometry(.88,.44),new THREE.MeshStandardMaterial({map:plateMap,roughness:.38,transparent:true,opacity:ghost?.34:1,depthWrite:!ghost}),group,0,.75,-3.09);plate.rotation.y=Math.PI;plate.castShadow=false;
    return group;
  }
  refreshShowcaseCar(){if(!this.showcaseView||!this.showcaseConfig)return;const old=this.showcaseView,{carId,colorId}=this.showcaseConfig,car=CAR_DATA.find(c=>c.id===carId)||CAR_DATA[0],paint=PAINTS.find(p=>p.id===colorId)?.color||car.color,newView=this.makeKitCar(car.id,paint,car.secondary,0);if(!newView)return;newView.position.copy(old.position);newView.rotation.copy(old.rotation);newView.scale.copy(old.scale);this.actorRoot.remove(old);disposeTree(old);this.actorRoot.add(newView);this.showcaseView=newView;}
  refreshActiveCars(){
    for(const actor of this.actors){const {racer}=actor;if(actor.view.userData.kenneyAsset)continue;const data=RACE_CAR_DATA.find(c=>c.id===racer.carId)||CAR_DATA[0],paint=racer.isPlayer?this.currentPlayerPaint:data.color,newView=this.makeKitCar(racer.carId,paint,data.secondary,racer.grid+1);if(!newView)continue;newView.position.copy(actor.view.position);newView.rotation.copy(actor.view.rotation);newView.scale.copy(actor.view.scale);this.actorRoot.remove(actor.view);disposeTree(actor.view);this.actorRoot.add(newView);actor.view=newView;racer.view=newView;if(racer.isPlayer)this.playerView=newView;}
    if(this.ghostView&&!this.ghostView.userData.kenneyAsset){const old=this.ghostView,newView=this.makeKitCar('bee','#87abb0','#e7ddbb',0,true);if(newView){newView.position.copy(old.position);newView.rotation.copy(old.rotation);this.actorRoot.remove(old);disposeTree(old);this.actorRoot.add(newView);this.ghostView=newView;}}
  }
  clearTrack(){this.itemFx.clear();this.raceState=null;disposeTree(this.trackRoot);this.pickupViews=[];this.obstacleView=null;this.kitTrackRoot=null;this.jumpView=null;this.jumpKitView=null;this.track=null;}
  setRace(race){this.itemFx.clear();this.raceState=race;}
  setTrack(track){this.clearTrack();this.track=track;this.buildBoard(track);this.buildRoad(track);this.buildDecor(track);this.buildPickups(track);this.buildObstacle(track);this.buildKitTrack(track);this.cameraMode='menu';}
  buildBoard(track){
    const p=PALETTES[track.theme],xs=track.samples.map(s=>s.x),zs=track.samples.map(s=>s.z),w=Math.max(...xs)-Math.min(...xs),d=Math.max(...zs)-Math.min(...zs),cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2;
    const sizeX=Math.max(670,w+205),sizeZ=Math.max(600,d+200),groundMap=canvasTexture(track.theme,'board');groundMap.repeat.set(2,2);const groundMat=new THREE.MeshStandardMaterial({map:groundMap,vertexColors:true,roughness:.93,metalness:0});
    const board=mesh(new RoundedBoxGeometry(sizeX,3,sizeZ,3,2.5),material('#9b6841',.78),this.trackRoot,cx,-2,cz);board.receiveShadow=true;
    const groundGeo=buildDioramaGround(track,sizeX-8,sizeZ-8,cx,cz),top=mesh(groundGeo,groundMat,this.trackRoot);top.castShadow=false;top.receiveShadow=true;this.groundHeightAt=(x,z)=>{const near=track.nearest(x,z),distance=near?.distance||0,wave=Math.sin(x*.021+z*.009)*Math.cos(z*.023-x*.006)+.42*Math.sin(x*.044-z*.031);return -.43+smoothstep(track.width*.5+9,track.width*.5+82,distance)*Math.max(1.35,terrainRelief(track.theme,wave,x,z));};
    const rimMat=material('#f1cf83',.58);for(const z of[cz-sizeZ/2+2,cz+sizeZ/2-2]){const r=mesh(new THREE.BoxGeometry(sizeX,5,6),rimMat,this.trackRoot,cx,.1,z);r.castShadow=false;}
    for(const x of[cx-sizeX/2+2,cx+sizeX/2-2]){const r=mesh(new THREE.BoxGeometry(6,5,sizeZ),rimMat,this.trackRoot,x,.1,cz);r.castShadow=false;}
    this.scene.background.set(p.sky);this.scene.fog.color.set(p.sky);this.scene.fog.near=320;this.scene.fog.far=1020;
    const sunSticker=mesh(new THREE.CircleGeometry(21,48),material('#f4cd6c',.66),this.trackRoot,cx+sizeX*.34,95,cz-sizeZ*.34);sunSticker.rotation.x=-Math.PI/2;sunSticker.castShadow=false;
    // Painted maker's marks sit at the plywood frame corners instead of the racing line.
    const dotGeo=new THREE.SphereGeometry(1.2,10,8);for(let i=0;i<16;i++){const x=cx+(i%4-1.5)*sizeX*.22,z=cz+(Math.floor(i/4)-1.5)*sizeZ*.22,y=this.groundHeightAt(x,z)+.16,dot=mesh(dotGeo,material(i%3===0?'#e88765':i%3===1?'#79ad74':'#709bb1'),this.trackRoot,x,y,z);dot.scale.set(1,.25,1);dot.castShadow=false;}
  }
  buildRoad(track){
    const p=PALETTES[track.theme],s=track.samples,n=s.length,roadGeo=new THREE.BufferGeometry(),verts=[],uv=[],idx=[];
    for(let i=0;i<n;i++){const a=s[i],b=s[(i+1)%n],nx=a.tz,nz=-a.tx;for(const side of[-1,1]){const off=track.width*.5*side;verts.push(a.x+nx*off,.21,a.z+nz*off);uv.push((side+1)/2,a.s/track.length);}
      const k=i*2,j=((i+1)%n)*2;idx.push(k,k+1,j,k+1,j+1,j);
    }
    roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));roadGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));roadGeo.setIndex(idx);roadGeo.computeVertexNormals();const tex=canvasTexture(track.theme,'road');tex.repeat.set(1,track.length/26);const road=mesh(roadGeo,material('#ffffff',.92,0,{map:tex,side:THREE.DoubleSide}),this.trackRoot);road.receiveShadow=true;road.castShadow=false;
    const shoulderVerts=[],shoulderIdx=[];for(let i=0;i<n;i++){const a=s[i],nx=a.tz,nz=-a.tx;for(const side of[-1,1]){const base=shoulderVerts.length/3,inner=track.width*.5+.2,outer=track.width*.5+5.2;shoulderVerts.push(a.x+nx*inner*side,.09,a.z+nz*inner*side,a.x+nx*outer*side,.09,a.z+nz*outer*side);const next=((i+1)%n)*4+(side===1?2:0);if(side===-1)shoulderIdx.push(base,base+1,next,base+1,next+1,next);else shoulderIdx.push(base,base+1,next,base+1,next+1,next);}}
    const shoulderGeo=new THREE.BufferGeometry();shoulderGeo.setAttribute('position',new THREE.Float32BufferAttribute(shoulderVerts,3));shoulderGeo.setIndex(shoulderIdx);shoulderGeo.computeVertexNormals();mesh(shoulderGeo,material(p.edge,.84,0,{side:THREE.DoubleSide}),this.trackRoot).castShadow=false;
    const railPoints=track.samples.filter((_,i)=>i%3===0);for(const side of[-1,1]){const points=railPoints.map(a=>new THREE.Vector3(a.x+a.tz*(track.width*.5+3.7)*side,.78,a.z-a.tx*(track.width*.5+3.7)*side)),curve=new THREE.CatmullRomCurve3(points,true,'centripetal'),rail=mesh(new THREE.TubeGeometry(curve,points.length*3,.42,7,true),material(track.accent||p.edge,.48,.02,{clearcoat:.28}),this.trackRoot);rail.castShadow=true;}
    const dashMat=material(p.stripe,.68);const dashGeo=new THREE.BoxGeometry(.52,.11,5.4),dashes=new THREE.InstancedMesh(dashGeo,dashMat,Math.ceil(track.length/28)),dummy=new THREE.Object3D();let count=0;for(let s0=10;s0<track.length;s0+=28){const a=track.at(s0);dummy.position.set(a.x,.34,a.z);dummy.rotation.y=a.yaw;dummy.updateMatrix();dashes.setMatrixAt(count++,dummy.matrix);}dashes.count=count;dashes.castShadow=false;this.trackRoot.add(dashes);
    const edgeGeo=new THREE.BoxGeometry(2.4,.6,2.8),edges=new THREE.InstancedMesh(edgeGeo,new THREE.MeshStandardMaterial({roughness:.78}),Math.ceil(track.length/7)*2),tmpColor=new THREE.Color();count=0;
    for(let s0=0;s0<track.length;s0+=7){const a=track.at(s0);for(const side of[-1,1]){const pos=track.at(s0,side*(track.width/2+1.7));dummy.position.set(pos.x,.48,pos.z);dummy.rotation.y=a.yaw;dummy.scale.set(1,.7,1);dummy.updateMatrix();edges.setMatrixAt(count,dummy.matrix);tmpColor.set(Math.floor(s0/7)%2?p.edge:'#f5db9f');edges.setColorAt(count++,tmpColor);}}
    edges.count=count;edges.castShadow=true;this.trackRoot.add(edges);
    const start=track.at(3);for(let i=0;i<12;i++){const m=mesh(new THREE.BoxGeometry(track.width/12,.12,2),material(i%2?'#f4e5c6':'#e4654f'),this.trackRoot,start.x+start.tz*(i-5.5)*(track.width/12),.38,start.z-start.tx*(i-5.5)*(track.width/12));m.rotation.y=start.yaw;m.castShadow=false;}
    const jump=track.at(track.length*track.jump),jumpRoot=new THREE.Group();this.jumpView=jumpRoot;this.trackRoot.add(jumpRoot);const kicker=mesh(new THREE.BoxGeometry(track.width*.76,.55,5.2),material('#e9c34c',.58),jumpRoot,jump.x,.48,jump.z);kicker.rotation.y=jump.yaw;kicker.rotation.x=-.06;kicker.castShadow=true;for(let i=0;i<3;i++){const stripe=mesh(new THREE.BoxGeometry(track.width*.66,.1,.55),material(i%2?'#fff0c7':'#e16c4e'),jumpRoot,jump.x,jump.y+.78,jump.z+(i-1)*1.35);stripe.rotation.y=jump.yaw;stripe.castShadow=false;}
    const label=this.makeSign(track.name+'  /  '+track.area,p.ribbon||'#e65b4b');const pos=track.at(track.length*.06,track.width+14);label.position.set(pos.x,7,pos.z);label.rotation.y=pos.yaw;this.trackRoot.add(label);
    if(track.shortcut){const a=track.at(track.length*track.shortcut.at,track.width*.5+5);const sign=this.makeSign('捷徑  '+track.shortcut.label,'#5d8e60',.95);sign.position.set(a.x,5,a.z);sign.rotation.y=a.yaw;this.trackRoot.add(sign);const side=-1,from=track.at(track.length*(track.shortcut.at-.035),side*track.width*.34),to=track.at(track.length*(track.shortcut.at+.035),side*track.width*.34),midX=(from.x+to.x)/2,midZ=(from.z+to.z)/2,dx=to.x-from.x,dz=to.z-from.z,angle=Math.atan2(dx,dz);const shortcutMesh=mesh(new THREE.BoxGeometry(7,.07,Math.hypot(dx,dz)),material('#edd27e',.84),this.trackRoot,midX,.26,midZ);shortcutMesh.rotation.y=angle;shortcutMesh.castShadow=false;for(let k=0;k<4;k++){const mark=mesh(new THREE.BoxGeometry(.45,.1,3),material('#6d966b'),this.trackRoot,from.x+(to.x-from.x)*(k+1)/5,.34,from.z+(to.z-from.z)*(k+1)/5);mark.rotation.y=angle;mark.castShadow=false;}}
  }
  makeSign(text,color='#e65b4b',scale=1){const g=new THREE.Group(),post=mesh(new THREE.CylinderGeometry(.24,.34,5,8),material('#916143'),g,0,2.5,0),board=mesh(new THREE.BoxGeometry(17*scale,4.7*scale,.7),material(color,.7),g,0,5.5,0),can=document.createElement('canvas');can.width=512;can.height=128;const c=can.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,128);c.fillStyle='#fff5d5';c.font='bold 48px "ZCOOL KuaiLe", "Microsoft YaHei", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66);const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;const label=mesh(new THREE.PlaneGeometry(16.4*scale,4.1*scale),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}),g,0,5.5,.41);post.castShadow=true;board.castShadow=true;return g;}
  buildDecor(track){
    const p=PALETTES[track.theme],rng=(seed=>()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;})(937+track.id.length*41),treeTrunk=new THREE.CylinderGeometry(.72,.95,7,8),treeTop=new THREE.ConeGeometry(4.7,10,7),balloonGeo=new THREE.SphereGeometry(1,12,10);
    for(let s=12;s<track.length;s+=25){for(const side of[-1,1]){const offset=side*(track.width/2+18+rng()*20),a=track.at(s,offset),g=new THREE.Group();g.position.set(a.x,this.groundHeightAt(a.x,a.z),a.z);g.rotation.y=a.yaw;
      if(track.theme==='blocks'){
        mesh(treeTrunk,material('#8c6548'),g,0,3.5,0);const leaf=mesh(treeTop,material(rng()>.5?'#6a9a5b':'#79ab64'),g,0,11,0);leaf.rotation.z=(rng()-.5)*.1;
        if(rng()>.74){const cube=mesh(new THREE.BoxGeometry(5,4,5),material(['#f0bd43','#e56c54','#75a6b4'][Math.floor(rng()*3)]),g,(rng()-.5)*5,2,4);cube.rotation.y=rng()*1.2;}
      }else if(track.theme==='paper'){
        const rock=mesh(new THREE.ConeGeometry(5+rng()*5,12+rng()*9,6),material(rng()>.5?'#c78d60':'#dbab76'),g,0,6,0);rock.rotation.z=(rng()-.5)*.22;
        const flag=mesh(new THREE.BoxGeometry(6,2.6,.28),material(['#e66850','#eac756','#70a6a4'][Math.floor(rng()*3)]),g,0,14,0);flag.rotation.z=.15;
      }else{
        const spool=mesh(new THREE.CylinderGeometry(2.3,2.3,7,16),material(['#d88191','#78a5a5','#e7c257'][Math.floor(rng()*3)]),g,0,3.5,0);spool.rotation.x=Math.PI/2;
        mesh(new THREE.TorusGeometry(2.35,.18,6,18),material('#f3ead0'),g,0,3.5,0).rotation.x=Math.PI/2;
        if(rng()>.55){const pin=mesh(new THREE.SphereGeometry(1.5,10,8),material('#e77a5a'),g,4,7,0);pin.castShadow=false;}
      }
      if(rng()>.8){const flower=mesh(balloonGeo,material(p.flower),g,(rng()-.5)*8,15,(rng()-.5)*4);flower.scale.set(.9,1.25,.7);}
      this.trackRoot.add(g);
    }}
    // Readable hand-built elevation scenery stays outside the racing surface.
    for(let i=0;i<12;i++){const s=track.length*i/12,side=i%2?1:-1,a=track.at(s,side*(track.width/2+42)),stack=new THREE.Group();stack.position.set(a.x,this.groundHeightAt(a.x,a.z),a.z);stack.rotation.y=a.yaw;for(let j=0;j<3;j++){const c=mesh(new RoundedBoxGeometry(9-j*1.3,5.5,8-j,3,.5),material(j%2?p.wood:'#e4bd68'),stack,(j%2?1:-1)*1.2,j*4.3,0);c.rotation.y=(j%2)*.08;}this.trackRoot.add(stack);}
    this.buildLandmark(track);
  }
  buildLandmark(track){
    const s=track.length*.34,side=track.id==='gear-garden'||track.id==='clay-volcano'||track.id==='button-lane'?1:-1,p=track.at(s,side*(track.width*.5+71)),g=new THREE.Group(),groundY=this.groundHeightAt(p.x,p.z);g.position.set(p.x,groundY,p.z);g.rotation.y=p.yaw;
    const wood=material('#a76843',.73),cream=material('#f4dfad',.75),coral=material('#e76d53',.58),teal=material('#5e9da0',.56),gold=material('#e3b94f',.48),green=material('#6c9b5e',.88),dark=material('#634d45',.82);
    const rbox=(m,x,y,z,w,h,d,r=.55)=>mesh(new RoundedBoxGeometry(w,h,d,4,r),m,g,x,y,z);
    if(track.id==='plank-square'){
      rbox(wood,0,5,0,13,5,12);rbox(coral,-2,10,0,7,5,7);rbox(gold,3,14,0,6,4,6);rbox(teal,5,18,0,4,4,4);
      for(let z=-3;z<=3;z+=3)mesh(new THREE.BoxGeometry(13,.12,.12),cream,g,0,7.6,z);
    }else if(track.id==='gear-garden'){
      const ring=mesh(new THREE.TorusGeometry(8,.9,10,36),gold,g,0,10,0);ring.rotation.y=.1;mesh(new THREE.TorusGeometry(4.8,.45,8,28),cream,g,0,10,0);mesh(new THREE.CylinderGeometry(1.5,1.5,2,16),coral,g,0,10,0);
      for(let i=0;i<10;i++){const a=i*Math.PI/5,tooth=rbox(gold,Math.cos(a)*8.45,10+Math.sin(a)*8.45,0,2.8,2.2,2.4,.35);tooth.rotation.z=-a;}
    }else if(track.id==='box-hill'){
      const boxMat=material('#c38d61',.87);rbox(boxMat,-7,6,0,4,12,13);rbox(boxMat,7,6,0,4,12,13);rbox(boxMat,0,12,0,18,4,13);
      for(let y=2;y<15;y+=3)mesh(new THREE.BoxGeometry(18,.18,.16),cream,g,0,y,6.58);
      for(let x=-5;x<=5;x+=2.5){const tape=mesh(new THREE.BoxGeometry(.6,2.5,.2),coral,g,x,12.2,6.7);tape.rotation.z=(x%5)*.025;}
    }else if(track.id==='cardboard-canyon'){
      for(let i=0;i<5;i++){const width=18-i*2,height=3.3,layer=rbox(material(i%2?'#b97e52':'#d09a67',.9),0,2+i*3.1,0,width,height,12-i,.6);layer.rotation.y=(i%2)*.04;mesh(new THREE.BoxGeometry(width-.8,.13,12-i),cream,g,0,3.3+i*3.1,0);}
      const arch=mesh(new THREE.TorusGeometry(7,1.1,8,28,Math.PI),coral,g,0,11,0);arch.rotation.z=Math.PI;
    }else if(track.id==='clay-volcano'){
      for(let i=0;i<5;i++){const cone=mesh(new THREE.CylinderGeometry(11-i*1.9,13-i*1.9,2.7,12),material(['#b95242','#d25e45','#e9784c','#e9a14e','#f1c061'][i],.82),g,0,1.35+i*2.25,0);cone.scale.set(1,1,.9);}
      const crater=mesh(new THREE.TorusGeometry(3.2,.65,8,20),cream,g,0,12,0);crater.rotation.x=Math.PI/2;
    }else if(track.id==='marble-station'){
      const stand=mesh(new THREE.CylinderGeometry(8,10,2,24),teal,g,0,1,0);stand.position.y=1;for(let i=0;i<5;i++){const a=i*Math.PI*2/5,ball=mesh(new THREE.SphereGeometry(2.6,20,14),material(['#de7765','#7caabd','#e6c35b','#8c78ad','#83aa71'][i],.2,.08,{clearcoat:.65}),g,Math.cos(a)*5,4.3,Math.sin(a)*5);ball.scale.set(1,1,.92);}
      const carousel=mesh(new THREE.TorusGeometry(9,.4,8,32),gold,g,0,3,0);carousel.rotation.x=Math.PI/2;
    }else if(track.id==='thread-workbench'){
      const spool=mesh(new THREE.CylinderGeometry(5.4,5.4,10,24),coral,g,0,7,0);spool.rotation.z=Math.PI/2;for(let i=0;i<6;i++){const thread=mesh(new THREE.TorusGeometry(5.42,.22,8,32),material(i%2?'#f4dcae':'#efb8a6',.88),g,-3.5+i*1.4,7,0);thread.rotation.y=Math.PI/2;}
      mesh(new THREE.CylinderGeometry(6.4,6.4,.8,24),cream,g,-5.2,7,0).rotation.z=Math.PI/2;mesh(new THREE.CylinderGeometry(6.4,6.4,.8,24),cream,g,5.2,7,0).rotation.z=Math.PI/2;
    }else if(track.id==='button-lane'){
      mesh(new THREE.CylinderGeometry(9,9,2.5,32),teal,g,0,4,0);
      for(const [x,z]of[[-3,-3],[3,-3],[-3,3],[3,3]]){const hole=mesh(new THREE.CircleGeometry(1.15,16),dark,g,x,4,z);hole.rotation.x=-Math.PI/2;hole.position.y=5.29;}
      for(let i=0;i<3;i++){const stitch=mesh(new THREE.TorusGeometry(10.4+i*.7,.16,6,40),cream,g,0,4,0);stitch.rotation.x=Math.PI/2;}
    }else{
      const plate=mesh(new THREE.CylinderGeometry(11,11,1.3,40),cream,g,0,.65,0);const rim=mesh(new THREE.TorusGeometry(9.4,.7,10,40),gold,g,0,1.45,0);rim.rotation.x=Math.PI/2;
      rbox(material('#d77286',.86),0,2.7,0,9,.35,7,.8);const fork=mesh(new THREE.CylinderGeometry(.16,.16,.36,8),dark,g,-13,4,0);fork.rotation.z=Math.PI/2;for(let i=0;i<4;i++)mesh(new THREE.BoxGeometry(.12,1.2,.12),dark,g,-14.4,4.8,(i-1.5)*.35);
      const spoon=mesh(new THREE.SphereGeometry(1.35,14,10),teal,g,13,4,0);spoon.scale.set(.7,.26,1);const handle=mesh(new THREE.CylinderGeometry(.22,.22,5.6,10),teal,g,13,4,-3);handle.rotation.x=Math.PI/2;
    }
    const label=this.makeSign(track.name,PALETTES[track.theme].edge,.84);label.position.set(0,24,-1);g.add(label);this.trackRoot.add(g);
  }
  buildPickups(track){
    const boxMat=material('#efbd43',.4),trim=material('#31594f',.6),gold=material('#e1aa37',.33,.08,{metalness:.08});
    const face=document.createElement('canvas');face.width=face.height=256;const c=face.getContext('2d');c.fillStyle='#fff3d1';c.fillRect(0,0,256,256);c.strokeStyle='#31594f';c.lineWidth=12;c.strokeRect(10,10,236,236);c.lineWidth=23;c.lineCap='round';c.beginPath();c.moveTo(91,83);c.bezierCurveTo(91,35,179,38,174,86);c.bezierCurveTo(172,112,128,115,128,151);c.stroke();c.fillStyle='#31594f';c.beginPath();c.arc(128,193,13,0,Math.PI*2);c.fill();
    const faceMap=new THREE.CanvasTexture(face);faceMap.colorSpace=THREE.SRGBColorSpace;const faceMat=new THREE.MeshBasicMaterial({map:faceMap});
    this.pickupViews=[];
    for(let i=0;i<10;i++){const s=track.length*(.055+i*.094),lane=(i%2?1:-1)*6.8,p=track.at(s,lane),g=new THREE.Group();g.position.set(p.x,2.8,p.z);
      mesh(new RoundedBoxGeometry(3.15,3.15,3.15,2,.16),boxMat,g);
      mesh(new RoundedBoxGeometry(3.4,.35,3.4,2,.1),trim,g,0,1.48,0);
      for(let side=0;side<4;side++){const angle=side*Math.PI/2,pl=mesh(new THREE.PlaneGeometry(2.5,2.5),faceMat,g,Math.sin(angle)*1.59,-.06,Math.cos(angle)*1.59);pl.rotation.y=angle;pl.castShadow=false;}
      const ring=mesh(new THREE.TorusGeometry(2.2,.16,6,24),material('#fff3d1'),g,0,-2.4,0);ring.rotation.x=Math.PI/2;
      const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;const lc=labelCanvas.getContext('2d');lc.fillStyle='#31594f';lc.beginPath();lc.roundRect(0,0,512,128,22);lc.fill();lc.fillStyle='#fff3d1';lc.font='bold 76px "Microsoft YaHei",sans-serif';lc.textAlign='center';lc.textBaseline='middle';lc.fillText('随机道具',256,65);const labelMap=new THREE.CanvasTexture(labelCanvas);labelMap.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelMap,transparent:true,depthWrite:false}));label.position.y=3.3;label.scale.set(7.2,1.8,1);g.add(label);
      this.trackRoot.add(g);this.pickupViews.push({group:g,label,s,lane,active:true,kind:'box',rot:0});
    }
    for(let i=0;i<12;i++){const s=track.length*(.025+i*.079),lane=(i%3-1)*4.2,p=track.at(s,lane),g=new THREE.Group();g.position.set(p.x,2.5,p.z);const hoop=mesh(new THREE.TorusGeometry(.82,.22,8,14),gold,g);hoop.rotation.x=Math.PI/2;const hub=mesh(new THREE.CylinderGeometry(.18,.18,.2,10),material('#f5df8f',.4),g,0,0,0);g.rotation.x=Math.PI/2;this.trackRoot.add(g);this.pickupViews.push({group:g,s,lane,active:true,kind:'coin',rot:0});}
  }
  buildObstacle(track){
    const g=new THREE.Group(),barPart=OBSTACLE_PARTS[0],wheelPart=OBSTACLE_PARTS[1],barRoot=new THREE.Group();g.add(barRoot);barRoot.position.set(barPart.x,barPart.y,barPart.z);barRoot.rotation.y=barPart.yaw;
    mesh(new THREE.BoxGeometry(barPart.width,barPart.height,barPart.length),material('#e2af52'),barRoot);
    const warning=material('#fff1cf',.72,0,{side:THREE.DoubleSide});for(const side of[-1,1])for(const x of[-1.1,0,1.1]){const stripe=mesh(new THREE.PlaneGeometry(.5,1.65),warning,barRoot,x,0,side*(barPart.length/2+.018));stripe.rotation.z=-.35;stripe.castShadow=false;}
    const wheel=mesh(new THREE.TorusGeometry(wheelPart.radius,wheelPart.tube,12,24),material('#718c9b'),g,wheelPart.x,wheelPart.y,wheelPart.z);wheel.rotation.y=Math.PI/2;
    this.trackRoot.add(g);this.obstacleView={group:g,s:track.length*track.obstacle,theme:track.theme};this.setObstaclePosition(obstaclePose(track,0));
  }
  makeCar(carId,color,secondary,index=0,ghost=false){
    const data=RACE_CAR_DATA.find(c=>c.id===carId)||CAR_DATA[0],paint=color||data.color,kitCar=this.makeKitCar(carId,paint,secondary,index,ghost);if(kitCar)return kitCar;const g=new THREE.Group();g.userData={carId,ghost,index};const body=material(paint,.28,.05),bodyDark=material(secondary||data.secondary,.34,.02),tire=material('#393d36',.82),hub=material('#e3d4ae',.3,.16),windowMat=material('#8bbdc1',.18,.05,{transparent:true,opacity:.82}),black=material('#55483f',.54),light=material('#fff0b5',.21,0,{emissive:'#f1cd65',emissiveIntensity:.32});
    // Pressed toy chassis, separate bonnet, raised cabin and four rubber wheels.
    const chassis=mesh(new THREE.BoxGeometry(3.6,1.05,5.8),body,g,0,1.15,0);chassis.scale.set(.94,1,1);const front=mesh(new THREE.BoxGeometry(3.22,.62,1.7),bodyDark,g,0,1.3,1.52);front.rotation.x=-.055;
    const cabin=mesh(new THREE.BoxGeometry(2.48,1.28,2.4),bodyDark,g,0,2.1,-.32);cabin.scale.set(1,1,.92);
    const wind=mesh(new THREE.BoxGeometry(2.15,.93,.16),windowMat,g,0,2.2,.92);wind.rotation.x=-.32;
    const backGlass=mesh(new THREE.BoxGeometry(2.08,.85,.16),windowMat,g,0,2.18,-1.54);backGlass.rotation.x=.38;
    const roof=mesh(new THREE.BoxGeometry(2.28,.16,1.65),body,g,0,2.78,-.28);roof.rotation.z=.015;
    const nose=mesh(new THREE.BoxGeometry(2.25,.26,.58),body,g,0,1.48,2.76);nose.rotation.x=-.04;
    for(const x of[-1,1]){
      const fender=mesh(new THREE.SphereGeometry(.85,14,10),bodyDark,g,x*1.47,.9,1.3);fender.scale.set(.55,.56,1.07);
      const tail=mesh(new THREE.BoxGeometry(.45,.3,.2),light,g,x*.98,1.43,-2.95);
      const lamp=mesh(new THREE.SphereGeometry(.24,12,10),material('#fff2cb',.17,0,{emissive:'#ffdb73',emissiveIntensity:.8}),g,x*1.28,1.55,2.9);lamp.scale.z=.45;
      for(const z of[-1.65,1.55]){const w=mesh(new THREE.CylinderGeometry(.78,.78,.48,18),tire,g,x*1.77,.79,z);w.rotation.z=Math.PI/2;w.castShadow=true;const h=mesh(new THREE.CylinderGeometry(.39,.39,.5,14),hub,g,x*1.78,.79,z);h.rotation.z=Math.PI/2;const cap=mesh(new THREE.CylinderGeometry(.16,.16,.52,10),material('#8e7657',.32),g,x*1.79,.79,z);cap.rotation.z=Math.PI/2;}
    }
    const bumper=mesh(new THREE.BoxGeometry(2.7,.28,.42),black,g,0,.87,3.08);bumper.rotation.x=.03;const backB=mesh(new THREE.BoxGeometry(2.65,.24,.34),black,g,0,.88,-3.07);
    const sticker=mesh(new THREE.BoxGeometry(.15,.48,1.35),material('#fff1c9',.48),g,0,1.69,2.05);sticker.rotation.x=-.04;
    const number=new THREE.Group(),plate=mesh(new THREE.CircleGeometry(.63,18),material('#f7e9c4',.5),number,0,0,0);const nCan=document.createElement('canvas');nCan.width=nCan.height=128;const nc=nCan.getContext('2d');nc.fillStyle='#f7e9c4';nc.beginPath();nc.arc(64,64,60,0,Math.PI*2);nc.fill();nc.fillStyle='#315d55';nc.font='bold 76px sans-serif';nc.textAlign='center';nc.textBaseline='middle';nc.fillText(String(index+1),64,66);const nt=new THREE.CanvasTexture(nCan);nt.colorSpace=THREE.SRGBColorSpace;const num=mesh(new THREE.CircleGeometry(.55,18),new THREE.MeshBasicMaterial({map:nt,transparent:true,side:THREE.DoubleSide}),number,0,0,.04);number.position.set(0,1.85,-.3);number.rotation.x=-.08;g.add(number);
    const flag=mesh(new THREE.ConeGeometry(.22,.4,6),material(secondary||data.secondary),g,0,3.1,-.3);flag.rotation.z=Math.PI;const aerial=mesh(new THREE.CylinderGeometry(.035,.05,.7,6),black,g,0,3.35,-.3);aerial.rotation.z=.12;
    if(ghost){g.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.transparent=true;m.opacity=.35;m.depthWrite=false;});}});}
    return g;
  }
  mountCars(racers,playerPaint='sun',ghostData=null){this.itemFx.clear();this.raceState=null;this.showcaseView=null;this.showcaseConfig=null;while(this.actorRoot.children.length){const o=this.actorRoot.children[0];this.actorRoot.remove(o);disposeTree(o);}this.actors=[];this.playerView=null;const paint=PAINTS.find(p=>p.id===playerPaint)?.color||CAR_DATA[0].color;this.currentPlayerPaint=paint;
    for(const r of racers){const data=RACE_CAR_DATA.find(c=>c.id===r.carId)||CAR_DATA[0],view=this.makeCar(r.carId,r.isPlayer?paint:data.color,data.secondary,r.grid+1);r.view=view;this.actorRoot.add(view);this.actors.push({racer:r,view});if(r.isPlayer)this.playerView=view;}
    if(ghostData?.samples?.length){const gh=this.makeCar('bee','#87abb0','#e7ddbb',0,true),s=ghostData.samples[0];gh.position.set(s.x,.45,s.z);gh.rotation.y=s.yaw;this.actorRoot.add(gh);this.ghostView=gh;this.ghostData=ghostData;}else{this.ghostView=null;this.ghostData=null;}
  }
  showcaseCar(carId,colorId='sun'){this.itemFx.clear();this.raceState=null;while(this.actorRoot.children.length){const o=this.actorRoot.children[0];this.actorRoot.remove(o);disposeTree(o);}this.actors=[];this.ghostView=null;const car=CAR_DATA.find(c=>c.id===carId)||CAR_DATA[0],paint=PAINTS.find(p=>p.id===colorId)?.color||car.color,view=this.makeCar(car.id,paint,car.secondary,0);const p=this.track?.at((this.track.length||1)*.56,0)||{x:0,z:0,y:.2,yaw:0};view.position.set(p.x,.3,p.z);view.rotation.y=p.yaw+.28;view.scale.setScalar(1.4);this.actorRoot.add(view);this.showcaseView=view;this.showcaseConfig={carId:car.id,colorId};this.cameraMode='menu';}
  updateActors(dt,now){for(const {racer:r,view} of this.actors){const roll=r.blastRoll||0,pivotShift=1.1*Math.sin(roll);view.position.set(r.x+Math.cos(r.yaw)*pivotShift,r.y+.48+(r.jumpY||0)+1.1*(1-Math.cos(roll))+Math.sin(now*9+r.grid)*.045,r.z-Math.sin(r.yaw)*pivotShift);view.rotation.set(0,r.yaw,clamp(-r.slip*.045,-.16,.16)+roll);const shake=this.settings.reducedShake?0:(r.bump||0);view.position.y+=Math.sin(now*32+r.grid)*shake*.035;if(view.userData.kenneyWheels?.length){updateToyCarWheels(view,r);}else view.children.forEach(o=>{if(o.geometry?.type==='CylinderGeometry'&&o.position.x!==0&&Math.abs(o.position.y-.79)<.05)o.rotation.x=now*r.speed*.45;});}
    if(this.ghostView&&this.ghostData){const elapsed=this.ghostElapsed||0;const arr=this.ghostData.samples,idx=clamp(Math.floor(elapsed/this.ghostData.step),0,arr.length-1),g=arr[idx];if(g)this.ghostView.position.set(g.x,g.y+.5,g.z),this.ghostView.rotation.y=g.yaw;this.ghostElapsed=elapsed+dt;}
  }
  setGhostTime(time){this.ghostElapsed=time;}
  setPickupActive(index,active){const v=this.pickupViews[index];if(v){v.active=active;v.group.visible=active;}}
  addPuddle(x,z,yaw,decoy=false){const g=new THREE.Group();const blob=mesh(new THREE.SphereGeometry(1,18,12),material(decoy?'#edc94d':'#48b5a6',.22,0,{transparent:true,opacity:.86}),g,0,.2,0);blob.scale.set(decoy?1.3:2.6,.14,decoy?1.2:1.85);if(decoy){const c=mesh(new THREE.BoxGeometry(2.1,2.1,2.1),material('#edc94d'),g,0,1.2,0);c.rotation.y=Math.PI/4;for(const angle of [-.65,.65]){const tape=mesh(new THREE.BoxGeometry(.26,1.6,.08),material('#ce5038'),g,0,1.22,1.5);tape.rotation.z=angle;}}else for(let i=0;i<3;i++){const drop=mesh(new THREE.SphereGeometry(.23+i*.08,10,8),material('#88ded0',.18),g,(i-1)*.8,.26,i%2*.45);drop.scale.y=.48;}g.position.set(x,0,z);g.rotation.y=yaw;this.trackRoot.add(g);return g;}
  removeTrap(trap){if(trap){trap.removeFromParent();disposeTree(trap);}}
  shieldEffect(racer){racer.shieldFlash=.5;}
  setObstaclePosition(pose){if(!this.obstacleView||!pose)return;this.obstacleView.group.position.set(pose.x,pose.y,pose.z);this.obstacleView.group.rotation.y=pose.yaw;}
  createParticles(){const max=70,g=new THREE.BufferGeometry(),pos=new Float32Array(max*3);g.setAttribute('position',new THREE.BufferAttribute(pos,3));const m=new THREE.PointsMaterial({color:'#e9c869',size:.85,transparent:true,opacity:.86,depthWrite:false,sizeAttenuation:true});this.particleMesh=new THREE.Points(g,m);this.particleRoot.add(this.particleMesh);this.particles=Array.from({length:max},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));}
  burst(x,y,z,count=12){if(!this.particleMesh)this.createParticles();count=Math.ceil(count*Math.max(.25,this.settings.effects||1));for(let i=0;i<count;i++){const p=this.particles.find(q=>q.life<=0);if(!p)break;p.life=.38+Math.random()*.6;p.x=x;p.y=y;p.z=z;p.vx=(Math.random()-.5)*12;p.vy=2+Math.random()*9;p.vz=(Math.random()-.5)*12;}}
  updateParticles(dt){if(!this.particleMesh)return;const a=this.particleMesh.geometry.attributes.position;this.particles.forEach((p,i)=>{if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=15*dt;}a.setXYZ(i,p.x,p.y,p.z);});a.needsUpdate=true;this.particleMesh.visible=!this.settings.lowParticles&&this.settings.effects>.18;this.particleMesh.material.opacity=.35+.5*this.settings.effects;}
  animate(t){requestAnimationFrame(this.animate);const dt=Math.min(.05,(t-this.lastTime)/1000||.016);this.lastTime=t;const now=t/1000;if(this.track){for(const v of this.pickupViews){v.rot+=dt;v.group.rotation.y=v.kind==='coin'?v.rot*1.25:Math.sin(now*2+v.s)*.14;v.group.position.y=v.kind==='coin'?2.2+Math.sin(now*3+v.s)*.28:2.8+Math.sin(now*2+v.s)*.18;if(v.label){const distance=this.camera.position.distanceTo(v.group.position);v.label.visible=distance<85;v.label.material.opacity=clamp((85-distance)/20,0,1);const canvas=this.renderer.domElement,maxPixels=canvas.clientWidth<=700?124:150,unitsPerPixel=2*distance*Math.tan(this.camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight),scale=Math.min(1,maxPixels*unitsPerPixel/7.2);v.label.scale.set(7.2*scale,1.8*scale,1);}}if(this.showcaseView){this.showcaseView.rotation.y+=dt*.16;this.showcaseView.position.y=.3+Math.sin(now*2.2)*.18;}this.updateActors(dt,now);this.updateParticles(dt);this.updateCamera(dt);}
    this.itemFx.update(this.raceState,this.actors,dt,this.settings);this.renderer.render(this.scene,this.camera);
  }
  updateCamera(dt){if(this.cameraMode==='inspection')return;if(this.cameraMode==='menu'){const destination=new THREE.Vector3(0,390,475);this.camera.position.lerp(destination,Math.min(1,dt*.32));this.cameraLook.lerp(new THREE.Vector3(0,0,0),dt*.35);this.camera.lookAt(this.cameraLook);return;}
    const player=this.actors.find(a=>a.racer.isPlayer);if(!player)return;const {target,look}=this.raceCameraPose(player.racer);this.camera.position.lerp(target,Math.min(1,dt*3.3));this.cameraLook.lerp(look,Math.min(1,dt*4.2));this.camera.lookAt(this.cameraLook);
  }
  raceCameraPose(r){const f=raceFraming(readViewportLayout()),forward=new THREE.Vector3(Math.sin(r.yaw),0,Math.cos(r.yaw));return {target:new THREE.Vector3(r.x-forward.x*f.back,r.y+f.height+(r.speed>18?2:0),r.z-forward.z*f.back),look:new THREE.Vector3(r.x+forward.x*f.ahead,r.y+1.3+(r.jumpY||0),r.z+forward.z*f.ahead)};}
  snapRaceCamera(racer){const {target,look}=this.raceCameraPose(racer);this.camera.position.copy(target);this.cameraLook.copy(look);this.camera.lookAt(look);}
  render(){this.renderer.render(this.scene,this.camera);}
}
