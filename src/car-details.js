import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Coordinates belong to the original unscaled shells: front = -Z. Each car
// keeps its own silhouette, wheelbase and cabin, rather than sharing a new shell.
const FIT={
  bee:{hood:[-.345,-.145],lamp:[.172,.179,.026],grille:[.145,.165,.043],side:[[.334,-.105],[.370,-.078],[.370,.10],[.334,.10]],wind:[.155,.332,.380],door:[.245,.012],rear:[.168,.172],spokes:5},
  snail:{hood:[-.345,-.15],lamp:[.172,.179,.026],grille:[.145,.165,.043],side:[[.337,-.104],[.410,-.079],[.423,.098],[.337,.098]],wind:[.125,.331,.397],door:[.25,.015],rear:[.168,.172],spokes:6},
  acorn:{hood:[-.30,-.085],lamp:[.207,.108,.014],grille:null,door:[.20,.10],rear:[.084,.185],spokes:6},
  drag:{hood:[-.53,-.07],lamp:[.19,.108,.014],grille:null,door:[.22,.10],rear:[.077,.20],spokes:5},
  vintage:{hood:[-.35,-.145],lamp:[.156,.235,.027],grille:[.17,.112,.082],door:[.185,.17],rear:[.078,.175],spokes:10},
  suv:{hood:[-.345,-.245],lamp:[.173,.178,.029],grille:[.145,.165,.043],side:[[.337,-.204],[.410,-.180],[.423,.004],[.337,.004]],wind:[.125,.331,.397],door:[.25,-.09],rear:[.168,.178],spokes:7},
};

function batch(parent){
  const parts=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
  return {
    add(geometry,mat,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){
      q.setFromEuler(new THREE.Euler(...rotation));matrix.compose(new THREE.Vector3(...position),q,new THREE.Vector3(...scale));geometry.applyMatrix4(matrix);
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      // One draw per material, even for the small rim bolts and grille slats.
      if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(geometry.index?geometry.toNonIndexed():geometry);if(geometry.index)geometry.dispose();
    },
    finish(){for(const [mat,geometries] of parts){const merged=mergeGeometries(geometries,false);geometries.forEach(geometry=>geometry.dispose());const mesh=new THREE.Mesh(merged,mat);mesh.name='Alloy toy detail batch';mesh.receiveShadow=true;parent.add(mesh);}}
  };
}
function rounded(w,h,d,r=.003){return new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3));}
function line(builder,points,mat,r=.002){if(points.length<2)return;builder.add(new THREE.TubeGeometry(new THREE.LineCurve3(points[0],points[1]),1,r,5,false),mat);}
function segment(builder,a,b,mat,r=.002){line(builder,[a,b],mat,r);}

export function addToyCarDetails(model,view,carId,secondary,envMap){
  const fit=FIT[carId]||FIT.bee,ghost=view.userData.ghost;
  const physical=(color,roughness,metalness,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,envMap,envMapIntensity:.65,clearcoat:.6,clearcoatRoughness:.18,transparent:ghost,opacity:ghost?.34:1,depthWrite:!ghost,...extra});
  const mat={chrome:physical('#bdc8ce',.24,.8),dark:physical('#242e34',.56,.12),glass:physical('#173746',.12,.3,{clearcoat:1,envMapIntensity:1.3,side:THREE.DoubleSide}),rubber:physical('#252b2c',.91,0,{clearcoat:0}),accent:physical(secondary,.31,.32),cream:physical('#f3e2bc',.34,.24),lamp:physical('#f9ecc8',.16,.18,{emissive:'#f5cf79',emissiveIntensity:.5}),red:physical('#b62325',.2,.25,{emissive:'#e94726',emissiveIntensity:.35})};
  const detailRoot=new THREE.Group();detailRoot.name='Fitted alloy body details';model.add(detailRoot);const bodyBatch=batch(detailRoot);
  let body;model.traverse(node=>{if(!body&&node.isMesh&&!/^wheel-/.test(node.name))body=node;});
  // Raycast against a local identity proxy: decorations hug the actual shell,
  // independent of the game-world fit/rotation and without hitting other details.
  const proxy=new THREE.Mesh(body.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster();proxy.updateMatrixWorld(true);
  function surface(axis,a,b,side=1,offset=.0016){
    const origin=axis==='x'?new THREE.Vector3(2*side,a,b):axis==='y'?new THREE.Vector3(a,2,b):new THREE.Vector3(a,b,2*side);
    const direction=axis==='x'?new THREE.Vector3(-side,0,0):axis==='y'?new THREE.Vector3(0,-1,0):new THREE.Vector3(0,0,-side);
    ray.set(origin,direction);const hit=ray.intersectObject(proxy,false)[0];if(!hit)return null;
    const normal=hit.face.normal.clone();if(normal.dot(direction)>0)normal.negate();return hit.point.addScaledVector(normal,offset);
  }
  function panel(axis,points,side,material,frame=true){
    const vertices=points.map(p=>surface(axis,p[0],p[1],side));if(vertices.some(p=>!p))return;
    const positions=[],outward=axis==='x'?new THREE.Vector3(side,0,0):axis==='y'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,side);
    function triangle(a,b,c){if(!a||!b||!c)return;const items=[a,b,c],normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.dot(outward)<0)items.reverse();for(const p of items)positions.push(...p);}
    if(!frame&&points.length===4){
      // Cooling slots cross rounded side pods. Sample their interiors too,
      // otherwise a flat quad would disappear inside the curved shell.
      const sample=(u,v)=>surface(axis,THREE.MathUtils.lerp(THREE.MathUtils.lerp(points[0][0],points[1][0],u),THREE.MathUtils.lerp(points[3][0],points[2][0],u),v),THREE.MathUtils.lerp(THREE.MathUtils.lerp(points[0][1],points[1][1],u),THREE.MathUtils.lerp(points[3][1],points[2][1],u),v),side,.002);
      for(let u=0;u<8;u++)for(let v=0;v<2;v++){const a=sample(u/8,v/2),b=sample((u+1)/8,v/2),c=sample((u+1)/8,(v+1)/2),d=sample(u/8,(v+1)/2);triangle(a,b,c);triangle(a,c,d);}
    }else for(let i=1;i<vertices.length-1;i++)triangle(vertices[0],vertices[i],vertices[i+1]);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();bodyBatch.add(geometry,material);
    if(frame)for(let i=0;i<vertices.length;i++)segment(bodyBatch,vertices[i],vertices[(i+1)%vertices.length],mat.dark,.0024);
  }
  // Replace the original pale windshield faces with tinted physical glass.
  // Material groups preserve the source geometry and its exact pane outline.
  if(fit.wind||carId==='acorn'||carId==='vintage'){
    const geometry=body.geometry.clone(),uv=geometry.attributes.uv,index=geometry.index;
    geometry.clearGroups();let start=0,last=-1;for(let k=0;k<index.count;k+=3){const vertex=index.getX(k),column=Math.floor(uv.getX(vertex)*8),row=Math.floor(uv.getY(vertex)*8),type=((fit.wind||carId==='vintage')&&column===6&&(row===4||row===5))||(column===4&&(row===6||row===7))?1:0;
      if(type!==last&&last!==-1){geometry.addGroup(start,k-start,last);start=k;}last=type;
    }geometry.addGroup(start,index.count-start,last);body.geometry=geometry;body.userData.kenneySharedGeometry=false;body.material=[body.material,mat.glass];
  }
  if(carId==='vintage')panel('z',[[-.075,.274],[.075,.274],[.072,.314],[-.072,.314]],-1,mat.glass);
  if(fit.wind){
    const [w,bottom,top]=fit.wind;panel('z',[[-w,bottom],[w,bottom],[w*.9,top],[-w*.9,top]],-1,mat.glass);
    // Wiper mounted at the lower edge, sized for these tiny toy windscreens.
    const a=surface('z',-.075,bottom+.006,-1,.004),b=surface('z',.045,bottom+.015,-1,.004);if(a&&b)segment(bodyBatch,a,b,mat.dark,.0017);
    for(const side of[-1,1]){
      panel('x',fit.side,side,mat.glass);
      const middle=(fit.side[0][1]+fit.side[3][1])*.5;
      const a=surface('x',fit.side[0][0]+.003,middle,side,.004),b=surface('x',fit.side[1][0]-.003,middle,side,.004);if(a&&b)segment(bodyBatch,a,b,mat.chrome,.0018);
    }
    if(carId!=='suv')panel('y',[[-.119,.14],[.119,.14],[.135,carId==='bee'?.235:.263],[-.135,carId==='bee'?.235:.263]],1,mat.glass);
  }
  // Two fine enamel stripes follow the hood's changing height, including bevels.
  for(const center of[-.026,.026]){
    const positions=[];let previous=null;for(let i=0;i<=20;i++){const z=THREE.MathUtils.lerp(...fit.hood,i/20),a=surface('y',center-.008,z),b=surface('y',center+.008,z);if(a&&b&&previous){for(const p of[previous[0],a,previous[1],previous[1],a,b])positions.push(...p);}previous=a&&b?[a,b]:null;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();bodyBatch.add(geo,mat.cream);
  }
  // Round recessed projectors and red segmented rear lenses.
  for(const side of[-1,1]){
    const [x,y,r]=fit.lamp;let point=surface('z',side*x,y,-1,.003);
    if(carId==='vintage'){
      point=new THREE.Vector3(side*x,y,-.414);
      segment(bodyBatch,new THREE.Vector3(side*.09,.175,-.36),point,mat.chrome,.005);
    }
    if(point){
      bodyBatch.add(new THREE.CylinderGeometry(r*1.15,r*1.15,.013,24),mat.dark,point.toArray(),[Math.PI/2,0,0]);
      bodyBatch.add(new THREE.TorusGeometry(r*.9,r*.12,6,24),mat.chrome,[point.x,point.y,point.z-.008]);
      bodyBatch.add(new THREE.SphereGeometry(r*.79,20,12),mat.lamp,[point.x,point.y,point.z-.009],[0,0,0],[1,1,.26]);
      // A lens divider makes the small light readable without a bloom effect.
      segment(bodyBatch,new THREE.Vector3(point.x-r*.52,point.y,point.z-.015),new THREE.Vector3(point.x+r*.52,point.y,point.z-.015),mat.chrome,.0012);
    }
    const rear=surface('z',side*fit.rear[0],fit.rear[1],1,.004);
    if(rear){bodyBatch.add(rounded(.061,.026,.009),mat.dark,rear.toArray());bodyBatch.add(rounded(.049,.016,.006),mat.red,[rear.x,rear.y,rear.z+.006]);for(let i=-1;i<=1;i++)bodyBatch.add(new THREE.BoxGeometry(.002,.015,.002),mat.chrome,[rear.x+i*.012,rear.y,rear.z+.010]);}
    // Body seams and metal door handles below the window, clear of the tires.
    const [doorY,doorZ]=fit.door,handle=surface('x',.314,doorZ+.046,side,.004);
    if(handle&&fit.side){bodyBatch.add(rounded(.006,.008,.030),mat.chrome,handle.toArray());const seamA=surface('x',.225,fit.side[3][1]+.011,side,.0018),seamB=surface('x',.322,fit.side[3][1]+.011,side,.0018);if(seamA&&seamB)segment(bodyBatch,seamA,seamB,mat.dark,.0011);}
  }
  if(fit.grille){
    const [y,w,h]=fit.grille,point=surface('z',0,y,-1,.003);if(point){bodyBatch.add(rounded(w,h,.008),mat.dark,point.toArray());
      for(let i=-3;i<=3;i++)bodyBatch.add(rounded(.003,h*.78,.003,.0008),mat.chrome,[point.x+i*w/9,point.y,point.z-.006]);
      bodyBatch.add(rounded(w*.92,.0025,.003,.0008),mat.chrome,[0,point.y,point.z-.007]);}
  }
  // Small race roundels distinguish every driver at close range.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#eee3c6';ctx.beginPath();ctx.arc(64,64,60,0,Math.PI*2);ctx.fill();ctx.strokeStyle=secondary;ctx.lineWidth=6;ctx.stroke();ctx.fillStyle='#253e40';ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(view.userData.index||1).padStart(2,'0'),64,69);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const decal=physical('#ffffff',.45,.1,{map,transparent:true,alphaTest:.1,side:THREE.DoubleSide});
  for(const side of fit.side?[-1,1]:[1]){
    const axis=fit.side?'x':'y',y=fit.side?.29:0,z=fit.side?fit.door[1]+.027:fit.hood[0]+(fit.hood[1]-fit.hood[0])*.62,r=fit.side?.023:.032,center=surface(axis,y,z,side,.003),positions=[],uvs=[];
    if(center)for(let i=0;i<24;i++){
      const a=i*Math.PI/12,b=(i+1)*Math.PI/12,pa=surface(axis,y+Math.cos(a)*r,z+Math.sin(a)*r,side,.003),pb=surface(axis,y+Math.cos(b)*r,z+Math.sin(b)*r,side,.003);
      if(!pa||!pb)continue;for(const p of[center,pa,pb])positions.push(...p);
      if(axis==='y')uvs.push(.5,.5,.5-Math.cos(a)*.5,.5+Math.sin(a)*.5,.5-Math.cos(b)*.5,.5+Math.sin(b)*.5);
      else uvs.push(.5,.5,.5+Math.sin(a)*.5,.5+Math.cos(a)*.5,.5+Math.sin(b)*.5,.5+Math.cos(b)*.5);
    }
    if(positions.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();bodyBatch.add(geometry,decal);}
  }
  if(carId==='suv'){
    // Brushed rails sit on the existing rear roll bar; no roof is invented.
    for(const x of[-.145,.145])segment(bodyBatch,new THREE.Vector3(x,.477,.03),new THREE.Vector3(x,.477,.102),mat.chrome,.006);
    for(const side of[-1,1]){const p=surface('x',.20,.21,side,.003);if(p)for(let i=0;i<4;i++)bodyBatch.add(rounded(.004,.007,.13),mat.dark,[p.x,.19+i*.015,.21]);}
  }else if(carId==='acorn'||carId==='drag'){
    const y=carId==='drag'?.358:.344,width=carId==='drag'?.13:.07,intake=surface('z',0,y,-1,.004);
    if(intake){bodyBatch.add(rounded(width,.038,.005),mat.dark,intake.toArray());for(let i=-2;i<=2;i++)bodyBatch.add(rounded(.003,.032,.003,.0008),mat.chrome,[intake.x+i*width/7,intake.y,intake.z-.004]);}
    // Side cooling fins accent the long engine bay and the speedster's pods.
    for(const side of[-1,1])for(let i=0;i<4;i++)panel('x',[[.185,.05+i*.026],[.218,.05+i*.026],[.218,.056+i*.026],[.185,.056+i*.026]],side,mat.dark,false);
  }else if(carId==='vintage'){
    for(const side of[-1,1])for(let i=0;i<5;i++)panel('x',[[.175,-.005+i*.020],[.21,-.005+i*.020],[.21,.001+i*.020],[.175,.001+i*.020]],side,mat.dark,false);
  }
  bodyBatch.finish();proxy.material.dispose();

  // Smooth rubber shoulders, machined rims, spoke openings and individual bolts.
  // Everything is mounted on the existing spin pivots, below steering pivots.
  for(const pivot of view.userData.kenneyWheels){
    const tire=pivot.children.find(child=>child.isMesh);if(!tire)continue;tire.geometry.computeBoundingBox();const bounds=tire.geometry.boundingBox,size=bounds.getSize(new THREE.Vector3()),r=size.y/2,half=size.x*.5*1.23;
    const profile=[[.58,-.92],[.75,-1],[.91,-.96],[.985,-.75],[1,-.45],[1,.45],[.985,.75],[.91,.96],[.75,1],[.58,.92],[.58,-.92]].map(([radial,axial])=>new THREE.Vector2(radial*r,axial*half));
    tire.geometry=new THREE.LatheGeometry(profile,40).rotateZ(Math.PI/2);tire.scale.x=1;tire.userData.kenneySharedGeometry=false;tire.material.dispose();tire.material=mat.rubber.clone();
    const wheelGroup=new THREE.Group();wheelGroup.name='Machined rotating alloy rim';pivot.add(wheelGroup);const wb=batch(wheelGroup),side=pivot.parent.position.x<0?-1:1,face=side*(half+.0005),rotation=[0,Math.PI/2,0];
    wb.add(new THREE.CylinderGeometry(r*.67,r*.67,.004,32),mat.dark,[face,0,0],[0,0,Math.PI/2]);
    wb.add(new THREE.TorusGeometry(r*.69,r*.047,6,32),mat.chrome,[face+side*.002,0,0],rotation);
    wb.add(new THREE.TorusGeometry(r*.57,r*.021,5,32),mat.chrome,[face+side*.003,0,0],rotation);
    for(let i=0;i<fit.spokes;i++){
      const angle=i*Math.PI*2/fit.spokes,a=new THREE.Vector3(face+side*.004,Math.cos(angle)*r*.19,Math.sin(angle)*r*.19),b=new THREE.Vector3(face+side*.003,Math.cos(angle+.12)*r*.64,Math.sin(angle+.12)*r*.64);
      segment(wb,a,b,mat.chrome,r*(carId==='vintage'?.023:.050));
    }
    wb.add(new THREE.CylinderGeometry(r*.19,r*.19,.008,20),mat.accent,[face+side*.007,0,0],[0,0,Math.PI/2]);
    for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;wb.add(new THREE.SphereGeometry(r*.026,6,4),mat.chrome,[face+side*.012,Math.cos(angle)*r*.12,Math.sin(angle)*r*.12]);}
    // Fine sidewall rings and shallow tread grooves use geometry, no bitmap download.
    wb.add(new THREE.TorusGeometry(r*.86,r*.007,4,40),mat.dark,[side*half*.98,0,0],rotation);
    for(let i=0;i<32;i++){const angle=i*Math.PI/16;for(const shoulder of[-1,1]){
      const a=new THREE.Vector3(shoulder*half*.58,Math.cos(angle)*r*1.001,Math.sin(angle)*r*1.001),b=new THREE.Vector3(0,Math.cos(angle+.055)*r*1.001,Math.sin(angle+.055)*r*1.001);segment(wb,a,b,mat.dark,r*.006);
    }}wb.finish();
  }
  // These materials are templates only if their category was unused. Dispose
  // unused templates immediately; mounted materials are disposed with the car.
  const used=new Set();model.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])used.add(m);});for(const m of Object.values(mat))if(!used.has(m))m.dispose();if(!used.has(decal)){map.dispose();decal.dispose();}
}
