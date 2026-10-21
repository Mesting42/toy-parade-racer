export const CUP_DATA = [
  { id: 'blocks', name: '积木乐园杯', short: '积木', ribbon: '#e75d4c', stamp: 'WOOD', material: '彩漆榉木' },
  { id: 'paper', name: '纸板山谷杯', short: '纸谷', ribbon: '#398e9b', stamp: 'CARD', material: '牛皮纸板' },
  { id: 'workshop', name: '玩具工坊杯', short: '工坊', ribbon: '#8067a4', stamp: 'MADE', material: '布景工作台' },
];

const common = { laps: 3, width: 21 };
export const TRACK_DATA = [
  { id: 'plank-square', cup: 0, name: '积木广场', area: '方块大舞台', tagline: '四边长直道绕着彩木塔，最后一弯收得很紧。', surface: '彩漆榉木', theme: 'blocks', accent: '#efb93f', shortcut: { at: .38, label: '塔影内弯', risk: '窄口，走内线可省半个车身' }, jump: .72, obstacle: .2,
    points: [[-125,-80],[-120,120],[-55,205],[105,205],[175,125],[170,-25],[90,-95],[55,-170],[-40,-195],[-145,-145]] },
  { id: 'gear-garden', cup: 0, name: '齿轮花园', area: '铜齿轮苗圃', tagline: '宽弧接两段反向弯，藤蔓风车会轻轻摇摆。', surface: '木片与绿毡', theme: 'blocks', accent: '#6fae69', shortcut: { at: .57, label: '叶片小径', risk: '窄木桥出口有弹跳板' }, jump: .59, obstacle: .08,
    points: [[-190,-45],[-155,110],[-40,180],[90,150],[185,70],[210,-60],[150,-155],[25,-170],[-55,-105],[-110,-25],[-205,25],[-245,-30]] },
  { id: 'box-hill', cup: 0, name: '纸箱山坡', area: '快递箱山道', tagline: '爬上瓦楞纸坡，再从纸筒隧道旁的跳板落下。', surface: '压纹纸板', theme: 'blocks', accent: '#d98854', shortcut: { at: .73, label: '纸筒旁道', risk: '窄坡，落地前松开转向' }, jump: .48, obstacle: .86,
    points: [[-140,-150],[-55,-205],[100,-195],[220,-125],[245,-20],[190,60],[230,155],[140,220],[-5,205],[-100,135],[-205,150],[-245,45],[-205,-60]] },
  { id: 'cardboard-canyon', cup: 1, name: '纸板峡谷', area: '瓦楞纸峡谷', tagline: '纸岩层像舞台布景一样层层退远，长直路通向发卡弯。', surface: '瓦楞纸与帆布', theme: 'paper', accent: '#d7814d', shortcut: { at: .24, label: '峡口纸桥', risk: '桥面窄，撞上护栏会减速' }, jump: .5, obstacle: .68,
    points: [[-210,-110],[-170,35],[-75,155],[55,180],[165,125],[235,30],[210,-75],[125,-155],[25,-205],[-95,-190],[-195,-120],[-250,-35]] },
  { id: 'clay-volcano', cup: 1, name: '软陶火山口', area: '红陶熔岩园', tagline: '绕火山盆地连续降速，出弯后有一段顺风坡。', surface: '软陶压纹', theme: 'paper', accent: '#e85c43', shortcut: { at: .62, label: '熔岩内圈', risk: '更短但铺有软陶减速块' }, jump: .83, obstacle: .39,
    points: [[-155,-175],[-15,-215],[130,-175],[225,-70],[205,50],[140,160],[20,205],[-105,155],[-215,100],[-235,-15],[-185,-105]] },
  { id: 'marble-station', cup: 1, name: '弹珠车站', area: '玻璃弹珠转盘', tagline: '圆弧连成大回旋，滑动挡板需要提前看清。', surface: '纸板轨道与弹珠', theme: 'paper', accent: '#63b9bd', shortcut: { at: .42, label: '弹珠内环', risk: '路肩靠近滚珠，留心回弹' }, jump: .18, obstacle: .73,
    points: [[-195,-60],[-155,80],[-55,175],[80,180],[195,115],[235,5],[195,-105],[100,-170],[-20,-165],[-110,-95],[-205,-125],[-250,-40]] },
  { id: 'thread-workbench', cup: 2, name: '缝线工作台', area: '奶油布景台', tagline: '沿着彩线走大弯，绒布路肩会轻轻吸住轮胎。', surface: '绒布与缝线', theme: 'workshop', accent: '#d77286', shortcut: { at: .32, label: '缝纫尺捷线', risk: '短直道视野好，撞到布卷会掉速' }, jump: .65, obstacle: .1,
    points: [[-235,-100],[-175,30],[-70,135],[75,165],[205,110],[245,0],[205,-125],[85,-190],[-45,-185],[-150,-125],[-235,-165],[-300,-55]] },
  { id: 'button-lane', cup: 2, name: '纽扣街角', area: '钮扣盒迷宫', tagline: '一组紧凑折弯从蓝纽扣之间穿过，灵巧车更容易找线。', surface: '软木与纽扣', theme: 'workshop', accent: '#6e87bd', shortcut: { at: .77, label: '针脚捷径', risk: '入口紧、出口开阔' }, jump: .43, obstacle: .26,
    points: [[-175,-185],[-40,-205],[95,-155],[175,-65],[135,10],[230,60],[190,165],[55,195],[-75,155],[-200,105],[-235,5],[-165,-70],[-250,-115]] },
  { id: 'dinner-dash', cup: 2, name: '晚餐桌冲刺', area: '餐布终点线', tagline: '环绕餐布大弧冲刺，终点前的移动木偶横穿赛道。', surface: '棉布与餐桌木', theme: 'workshop', accent: '#77a761', shortcut: { at: .51, label: '餐盘之间', risk: '短道紧挨布卷障碍' }, jump: .87, obstacle: .57,
    points: [[-250,-75],[-210,85],[-105,185],[55,205],[195,145],[255,35],[210,-80],[105,-165],[-25,-205],[-165,-165],[-245,-95]] },
];

const mod = (n, m) => ((n % m) + m) % m;
const catmull = (p0,p1,p2,p3,t) => .5 * ((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);

export class Track {
  constructor(def) {
    Object.assign(this, {laps:3,width:21}, def);
    this.samples = [];
    const steps = 34, pts = def.points, n = pts.length;
    for (let i=0;i<n*steps;i++) {
      const k=Math.floor(i/steps), t=(i%steps)/steps;
      this.samples.push({x:catmull(pts[mod(k-1,n)][0],pts[k][0],pts[(k+1)%n][0],pts[(k+2)%n][0],t),z:catmull(pts[mod(k-1,n)][1],pts[k][1],pts[(k+1)%n][1],pts[(k+2)%n][1],t),s:0});
    }
    this.length=0;
    for(let i=0;i<this.samples.length;i++){
      const p=this.samples[i],q=this.samples[(i+1)%this.samples.length],dx=q.x-p.x,dz=q.z-p.z,seg=Math.hypot(dx,dz)||.001;
      p.s=this.length;p.seg=seg;p.tx=dx/seg;p.tz=dz/seg;p.yaw=Math.atan2(p.tx,p.tz);this.length+=seg;
    }
  }
  at(distance, offset=0){
    const s=mod(distance,this.length);let lo=0,hi=this.samples.length-1;
    while(lo<hi){const mid=(lo+hi+1)>>1;if(this.samples[mid].s<=s)lo=mid;else hi=mid-1;}
    const p=this.samples[lo],q=this.samples[(lo+1)%this.samples.length],t=(s-p.s)/p.seg,tx=p.tx+(q.tx-p.tx)*t,tz=p.tz+(q.tz-p.tz)*t,l=Math.hypot(tx,tz)||1;
    const nx=tz/l,nz=-tx/l;
    return {x:p.x+(q.x-p.x)*t+nx*offset,z:p.z+(q.z-p.z)*t+nz*offset,y:.08+Math.sin(s*.008+this.cup)*.12,yaw:Math.atan2(tx,tz),tx:tx/l,tz:tz/l,s};
  }
  nearest(x,z){
    let best=null,bestD=Infinity;const samples=this.samples,n=samples.length;
    for(let i=0;i<n;i++){
      const p=samples[i],q=samples[(i+1)%n],dx=x-p.x,dz=z-p.z,t=Math.max(0,Math.min(1,(dx*p.tx+dz*p.tz)/p.seg)),px=p.x+(q.x-p.x)*t,pz=p.z+(q.z-p.z)*t,d2=(x-px)**2+(z-pz)**2;
      if(d2<bestD){bestD=d2;const lateral=(x-px)*p.tz-(z-pz)*p.tx;best={x:px,z:pz,s:p.s+p.seg*t,lateral,distance:Math.sqrt(d2),tx:p.tx,tz:p.tz,yaw:p.yaw};}
    }
    return best;
  }
  curvature(s){const a=this.at(s-8).yaw,b=this.at(s+8).yaw;let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;return Math.abs(d)/16;}
}
export const TRACKS=TRACK_DATA.map(d=>new Track(d));
