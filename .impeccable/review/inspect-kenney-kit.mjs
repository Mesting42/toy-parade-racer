import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:5175/',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const loader=new GLTFLoader();
    const names=['raceCarRed','raceCarOrange','raceCarGreen','raceCarWhite','roadStart','roadCurved','roadRamp','grandStand','bannerTowerRed'];
    const out=[];
    document.body.innerHTML='';document.body.style='margin:0;background:#f7efd9;font:16px sans-serif;color:#31594f';
    const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(3,360px);gap:14px;padding:16px';document.body.append(grid);
    for(const name of names){
      const gltf=await loader.loadAsync(`/assets/kenney-racing-kit/${name}.glb`);
      const box=new THREE.Box3().setFromObject(gltf.scene),size=new THREE.Vector3();box.getSize(size);
      const card=document.createElement('section'),title=document.createElement('strong'),canvas=document.createElement('canvas');card.style='width:360px;height:270px;background:#fff8e8;border:1px solid #bca57b;padding:8px;box-sizing:border-box';title.textContent=name;title.style='display:block;height:22px';canvas.width=344;canvas.height=230;canvas.style='width:344px;height:230px';card.append(title,canvas);grid.append(card);
      const scene=new THREE.Scene();scene.background=new THREE.Color('#fff8e8');scene.add(new THREE.HemisphereLight('#fff7e6','#7b805f',2));const light=new THREE.DirectionalLight('#fff0c8',3);light.position.set(-3,6,5);scene.add(light);
      const sizeMax=Math.max(size.x,size.y,size.z),scale=2.5/sizeMax;gltf.scene.scale.setScalar(scale);const center=box.getCenter(new THREE.Vector3());gltf.scene.position.set(-center.x*scale,-center.y*scale,-center.z*scale);scene.add(gltf.scene);
      const camera=new THREE.PerspectiveCamera(43,canvas.width/canvas.height,.01,100);camera.position.set(3.5,2.6,4.2);camera.lookAt(0,.18,0);
      const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.render(scene,camera);
      out.push({name,size:size.toArray().map(v=>Number(v.toFixed(2))),center:center.toArray().map(v=>Number(v.toFixed(2)))});renderer.dispose();
    }
    return out;
  });
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const output=fileURLToPath(new URL('./screenshots/',import.meta.url));await mkdir(output,{recursive:true});await page.screenshot({path:join(output,'kenney-assets.png'),fullPage:true});
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
