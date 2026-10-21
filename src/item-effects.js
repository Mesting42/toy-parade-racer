import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function addMesh(parent,geometry,material,name){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh;}
function glow(color,opacity=.8){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false});}
function dispose(root){root.removeFromParent();root.traverse(node=>{node.geometry?.dispose();if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])material.dispose();});}

function flameMaterial(core=false){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    uniforms:{uTime:{value:0},uOpacity:{value:core?.94:.75},uCore:{value:core?1:0}},
    vertexShader:`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*15.0-uTime*24.0)*uv.y*0.05;p.y+=cos(uv.y*12.0-uTime*21.0)*uv.y*0.04;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uOpacity;uniform float uCore;
      void main(){float turbulence=0.82+0.18*sin(vUv.y*24.0-uTime*28.0+vUv.x*18.0);float fade=(1.0-smoothstep(0.55,1.0,vUv.y))*turbulence;
      vec3 hot=mix(vec3(0.14,0.65,1.0),vec3(1.0,0.96,0.64),smoothstep(0.0,0.23,vUv.y));vec3 color=mix(hot,vec3(1.0,0.19,0.02),smoothstep(0.2,0.9,vUv.y)*(1.0-uCore*0.65));
      gl_FragColor=vec4(color,fade*uOpacity);}`});
}
function animateFlame(flame,time){flame.userData.outer.material.uniforms.uTime.value=time;flame.userData.inner.material.uniforms.uTime.value=time;}

function makeFlame(){
  const flame=new THREE.Group();flame.name='layered-exhaust-flame';
  const geometry=new THREE.ConeGeometry(.43,1,18,5,true);geometry.translate(0,.5,0);geometry.rotateX(-Math.PI/2);
  const outer=addMesh(flame,geometry,flameMaterial(false),'orange-flame-envelope');
  const inner=addMesh(flame,geometry.clone(),flameMaterial(true),'hot-flame-core');inner.scale.set(.55,.55,.73);
  const blue=addMesh(flame,new THREE.SphereGeometry(.28,12,8),glow('#66dfff',.85),'blue-exhaust-base');blue.scale.set(1,1,1.8);blue.position.z=-.2;
  flame.userData={outer,inner,blue};return flame;
}

function shieldMaterial(){
  return new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uImpact:{value:0}},
    vertexShader:`varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
      void main(){vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 vNormal; varying vec3 vView; varying vec2 vUv; uniform float uTime; uniform float uImpact;
      void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.2);
      float cells=pow(abs(sin(vUv.x*94.25+sin(vUv.y*62.83)*0.45)*sin(vUv.y*62.83)),16.0);
      float scan=pow(0.5+0.5*sin(vUv.y*31.4-uTime*2.8),12.0);
      vec3 color=mix(vec3(0.08,0.55,0.78),vec3(0.45,0.97,1.0),rim+uImpact*0.35);
      gl_FragColor=vec4(color,clamp(0.07+rim*0.64+cells*0.15+scan*0.08+uImpact*0.3,0.0,0.84));}`});
}

export function attachRacerEffects(view){
  if(view.userData.itemEffects)return view.userData.itemEffects;
  const root=new THREE.Group();root.name='vehicle-item-effects';view.add(root);
  const boost=new THREE.Group();boost.name='twin-boost-exhausts';root.add(boost);
  const flames=[];
  for(const side of [-1,1]){
    const nozzle=addMesh(boost,new THREE.TorusGeometry(.36,.1,8,16),new THREE.MeshStandardMaterial({color:'#485667',metalness:.7,roughness:.25}),'exhaust-nozzle');nozzle.position.set(side*.95,.7,-3.02);
    const flame=makeFlame();flame.position.set(side*.95,.7,-3.13);boost.add(flame);flames.push(flame);
  }
  const boostLight=new THREE.PointLight('#ff9d40',0,13,2);boostLight.position.set(0,1,-3.5);boost.add(boostLight);
  const shield=new THREE.Group();shield.name='protective-energy-shell';shield.position.y=1.1;root.add(shield);
  const shell=addMesh(shield,new THREE.SphereGeometry(1,32,24),shieldMaterial(),'fresnel-shield-shell');shell.scale.set(3.05,2.5,4.05);
  const shieldRings=[];
  for(const height of [-.7,.7]){const ring=addMesh(shield,new THREE.TorusGeometry(1,.012,6,64),glow('#75eaff',.58),'shield-energy-latitude');ring.rotation.x=Math.PI/2;ring.scale.set(2.95,3.9,1);ring.position.y=height;shieldRings.push(ring);}
  const magnet=new THREE.Group();magnet.name='magnetic-attraction-rings';root.add(magnet);
  for(let i=0;i<2;i++){const ring=addMesh(magnet,new THREE.TorusGeometry(1,.035,6,48),glow('#d2a4fa',.65),'magnetic-pulse');ring.rotation.x=Math.PI/2;ring.position.y=.25+i*.4;}
  boost.visible=shield.visible=magnet.visible=false;
  const data={root,boost,boostLight,flames,shield,shell,shieldRings,magnet};view.userData.itemEffects=data;return data;
}

export function updateRacerEffects(view,racer,time,settings={}){
  const fx=attachRacerEffects(view),intensity=Math.max(.35,settings.effects??1),blast=racer.blastTime>0;
  fx.boost.visible=racer.boost>0&&!blast;
  fx.boostLight.visible=!!racer.isPlayer&&!settings.noFlash;fx.boostLight.intensity=5*intensity;
  for(let i=0;i<fx.flames.length;i++){
    const flame=fx.flames[i],pulse=1+Math.sin(time*31+i*2)*.09+Math.sin(time*17+i)*.06;
    flame.scale.set(.85*pulse,.85*pulse,(3.6+Math.min(1,racer.speed/26))*pulse);
    animateFlame(flame,time);flame.userData.outer.material.uniforms.uOpacity.value=.6+intensity*.18;
    flame.userData.inner.scale.x=.52+Math.sin(time*21+i)*.035;
  }
  const flash=racer.shieldFlash||0;fx.shield.visible=racer.shield>0||flash>0;
  fx.shell.material.uniforms.uTime.value=time;
  fx.shell.material.uniforms.uImpact.value=settings.noFlash?0:clamp(flash*2,0,1);
  fx.shield.scale.setScalar(racer.shield>0?1:1+(1-flash/.5)*.18);
  for(let i=0;i<fx.shieldRings.length;i++)fx.shieldRings[i].material.opacity=.4+Math.sin(time*2+i)*.13;
  fx.magnet.visible=racer.magnet>0;
  fx.magnet.children.forEach((ring,i)=>{const phase=(time*.75+i*.5)%1;ring.scale.setScalar(2.5+phase*4);ring.material.opacity=(1-phase)*.64;});
  return fx;
}

export function makeRocketView(){
  const root=new THREE.Group();root.name='homing-rocket';
  const metal=new THREE.MeshStandardMaterial({color:'#f8ebcf',metalness:.42,roughness:.25});
  const red=new THREE.MeshStandardMaterial({color:'#e85436',metalness:.2,roughness:.32});
  const body=addMesh(root,new THREE.CylinderGeometry(.42,.42,2.15,16),metal,'rocket-fuselage');body.rotation.x=Math.PI/2;
  const nose=addMesh(root,new THREE.ConeGeometry(.43,.85,16),red,'rocket-nose');nose.rotation.x=Math.PI/2;nose.position.z=1.47;
  const band=addMesh(root,new THREE.CylinderGeometry(.433,.433,.32,16),new THREE.MeshStandardMaterial({color:'#edb941',metalness:.35,roughness:.3}),'rocket-warning-band');band.rotation.x=Math.PI/2;band.position.z=.4;
  for(let i=0;i<4;i++){const mount=new THREE.Group();mount.rotation.z=i*Math.PI/2;root.add(mount);const fin=addMesh(mount,new THREE.BoxGeometry(.13,.72,.8),red.clone(),'rocket-fin');fin.position.set(0,.57,-.77);fin.rotation.x=-.22;}
  const flame=makeFlame();flame.position.z=-1.13;flame.scale.set(.8,.8,2.4);root.add(flame);root.userData.flame=flame;
  return root;
}

function makeImpact(effect){
  const root=new THREE.Group();root.name=effect.type;
  if(effect.type==='wave'){
    for(let i=0;i<3;i++){const ring=addMesh(root,new THREE.TorusGeometry(1,.035,6,64),glow(i===1?'#fff0ac':'#f58d50',.8),'shockwave-ring');ring.rotation.x=Math.PI/2;ring.position.y=i*.45;}
  }else{
    const blocked=effect.type==='shield-impact';
    const core=addMesh(root,new THREE.SphereGeometry(1,16,12),glow(blocked?'#8ceeff':'#ffe68d',.95),'impact-core');root.userData.core=core;
    const ring=addMesh(root,new THREE.TorusGeometry(1,.065,6,64),glow(blocked?'#51dced':'#ff8e32',.9),'impact-pressure-ring');ring.rotation.x=Math.PI/2;root.userData.ring=ring;
    if(!blocked)for(let i=0;i<6;i++){
      const smoke=addMesh(root,new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:i%2?'#675d58':'#aa8f78',transparent:true,opacity:.68,depthWrite:false,roughness:1}),'explosion-smoke');
      smoke.userData.angle=i*TAU/6;smoke.userData.height=i%3;root.userData.smoke??=[];root.userData.smoke.push(smoke);
    }
  }
  root.position.set(effect.x,effect.y,effect.z);return root;
}

export class ItemEffectsSystem{
  constructor(parent){
    this.root=new THREE.Group();this.root.name='race-item-effects';parent.add(this.root);
    this.rockets=new Map();this.impacts=new Map();this.emitters=new Map();this.maxParticles=160;this.cursor=0;
    const geometry=new THREE.BufferGeometry();
    for(const [name,size] of [['position',3],['aColor',3],['aSize',1],['aAlpha',1]])geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(this.maxParticles*size),size));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},
      vertexShader:`attribute vec3 aColor; attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vAlpha;
        void main(){vColor=aColor;vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*650.0/max(1.0,-mv.z),1.0,76.0);}`,
      fragmentShader:`varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=(1.0-smoothstep(0.1,0.5,d))*vAlpha;if(a<0.01)discard;gl_FragColor=vec4(vColor,a);}`});
    this.particleMesh=new THREE.Points(geometry,material);this.particleMesh.name='exhaust-smoke-and-embers';this.particleMesh.frustumCulled=false;this.root.add(this.particleMesh);
    this.particles=Array.from({length:this.maxParticles},()=>({life:0}));
  }
  clear(){for(const view of this.rockets.values())dispose(view);for(const view of this.impacts.values())dispose(view);this.rockets.clear();this.impacts.clear();this.emitters.clear();for(const particle of this.particles)particle.life=0;this.updateParticles(0,{});}
  spawn(x,y,z,color,size,life,vx=0,vy=1,vz=0){
    const particle=this.particles[this.cursor++%this.maxParticles];Object.assign(particle,{x,y,z,color:new THREE.Color(color),size,life,total:life,vx,vy,vz});
  }
  updateParticles(dt,settings){
    const attributes=this.particleMesh.geometry.attributes;
    this.particles.forEach((p,i)=>{
      if(p.life>0){p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const fade=p.life/p.total;
        attributes.position.setXYZ(i,p.x,p.y,p.z);attributes.aColor.setXYZ(i,p.color.r,p.color.g,p.color.b);attributes.aSize.setX(i,p.size*(1+(1-fade)*1.8));attributes.aAlpha.setX(i,fade*.52);
      }else attributes.aAlpha.setX(i,0);
    });
    for(const attribute of Object.values(attributes))attribute.needsUpdate=true;
    this.particleMesh.visible=!settings.lowParticles;
  }
  update(race,actors,dt,settings={}){
    const active=!!race&&!race.paused&&!race.finishFrozen,step=active?dt:0,time=race?.elapsed||0;
    for(const {racer,view} of actors){
      updateRacerEffects(view,racer,time,settings);
      const timer=(this.emitters.get(racer.id)||0)+step;
      if(timer>.045&&racer.boost>0&&!racer.blastTime&&!settings.lowParticles){
        const sx=Math.sin(racer.yaw),cz=Math.cos(racer.yaw);
        this.spawn(racer.x-sx*3.8,racer.y+.98,racer.z-cz*3.8,'#a99c89',.8,.65,-sx*3,1.5,-cz*3);
        this.spawn(racer.x-sx*5.8,racer.y+.9,racer.z-cz*5.8,'#ffb347',.23,.28,-sx*5,.3,-cz*5);
      }
      this.emitters.set(racer.id,timer>.045?0:timer);
    }
    const liveRockets=new Set(race?.projectiles||[]);
    for(const [shot,view] of this.rockets)if(!liveRockets.has(shot)){dispose(view);this.rockets.delete(shot);}
    for(const shot of liveRockets){
      let view=this.rockets.get(shot);if(!view){view=makeRocketView();this.rockets.set(shot,view);this.root.add(view);}
      view.position.set(shot.x,shot.y,shot.z);view.rotation.set(shot.pitch||0,shot.yaw,0,'YXZ');view.userData.flame.scale.z=2.5+Math.sin(time*36)*.2;
      animateFlame(view.userData.flame,time);
      shot.fxTimer=(shot.fxTimer||0)+step;
      if(shot.fxTimer>.035&&!settings.lowParticles){shot.fxTimer=0;this.spawn(shot.x-Math.sin(shot.yaw)*2,shot.y,shot.z-Math.cos(shot.yaw)*2,'#dfd0b8',.7,.7,0,1.1,0);}
    }
    const liveImpacts=new Set(race?.effects||[]);
    for(const [effect,view] of this.impacts)if(!liveImpacts.has(effect)){dispose(view);this.impacts.delete(effect);}
    for(const effect of liveImpacts){
      let view=this.impacts.get(effect);
      if(!view){view=makeImpact(effect);this.impacts.set(effect,view);this.root.add(view);
        if(effect.type==='explosion'&&!settings.lowParticles)for(let i=0;i<15;i++){const angle=i*2.4;this.spawn(effect.x,effect.y,effect.z,i%3?'#ffac38':'#605854',.25+i%3*.3,.45+i%4*.13,Math.sin(angle)*8,3+i%5,Math.cos(angle)*8);}
      }
      const progress=clamp(1-effect.ttl/(effect.duration||.9),0,1),fade=1-progress;
      if(effect.type==='wave')view.children.forEach((ring,i)=>{const radius=Math.max(.2,20*progress-i*1.2);ring.scale.setScalar(radius);ring.material.opacity=fade*.75;});
      else{
        view.userData.core.visible=!settings.noFlash&&progress<.55;
        view.userData.core.scale.setScalar(1+Math.sin(Math.min(1,progress*1.8)*Math.PI)*3.7);
        view.userData.core.material.opacity=fade*.85;
        view.userData.ring.scale.setScalar(1+progress*9);view.userData.ring.material.opacity=fade*.75;
        for(const smoke of view.userData.smoke||[]){const angle=smoke.userData.angle,distance=progress*4.4;smoke.position.set(Math.sin(angle)*distance,progress*(2+smoke.userData.height),Math.cos(angle)*distance);smoke.scale.setScalar(.7+progress*2.1);smoke.material.opacity=fade*.7;}
      }
    }
    this.updateParticles(step,settings);
  }
}
