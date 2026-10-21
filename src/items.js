// The simulation, HUD and help share the same vocabulary.
export const ITEM_LIST=[
  {id:'spring',name:'弹簧推进器',category:'加速',target:'自身',shortHint:'喷火推进 2 秒，直道出弯更快',hint:'尾部喷火推进 2 秒；适合直道或出弯时使用。',color:'#efbd43'},
  {id:'bubble',name:'泡泡护罩',category:'防御',target:'自身',shortHint:'护身 4.5 秒，抵挡一次攻击',hint:'护身 4.5 秒，抵挡一次碰撞或攻击。',color:'#71b8b0'},
  {id:'glue',name:'黏胶团',category:'攻击',target:'后方',shortHint:'向后放胶，减慢驶过的对手',hint:'在身后放置黏胶，减慢驶过的对手。',color:'#e87758'},
  {id:'wave',name:'弹簧震荡波',category:'攻击',target:'周围',shortHint:'向外推开约一个车身并短暂减速',hint:'将周围近距离对手向外推开约一个车身，造成短暂减速；护罩可抵挡。',color:'#e87758'},
  {id:'decoy',name:'纸盒诱饵',category:'攻击',target:'后方',shortHint:'向后放假箱，碰到会短暂减速',hint:'在身后放置假箱，碰到的对手会短暂减速。',color:'#e87758'},
  {id:'magnet',name:'磁力吸附器',category:'收集',target:'齿轮币',shortHint:'吸来附近齿轮币，最多 5.2 秒',hint:'吸引附近齿轮币，最长持续 5.2 秒；收集后结束。',color:'#b4a0ce'},
  {id:'rocket',name:'追踪火箭',category:'攻击',target:'前一名',shortHint:'追击前一名，炸飞翻滚并停速',hint:'锁定前一名，命中后炸飞翻滚一圈并停速；护罩可抵挡。第一名向前空射后消失。',color:'#e65d43'},
];

// Every ticket refers to an authored item. Adding an item to the catalogue also
// adds it to the random boxes; every rank retains a non-zero chance of each one.
export function drawRandomItem(rank=1,rng=Math.random){
  const weights=ITEM_LIST.map(item=>item.id==='rocket'?(rank>1?1.5:.8):item.id==='spring'?(rank>=4?1.6:1):item.category==='防御'?(rank<=2?1.5:1):1);
  const total=weights.reduce((sum,value)=>sum+value,0),sample=Number(rng());
  let ticket=Math.max(0,Math.min(1-Number.EPSILON,Number.isFinite(sample)?sample:0))*total;
  for(let i=0;i<ITEM_LIST.length;i++){ticket-=weights[i];if(ticket<0)return ITEM_LIST[i];}
  return ITEM_LIST[ITEM_LIST.length-1];
}

export const itemSvg={
  spring:'<svg viewBox="0 0 40 40"><path d="M7 31h26M10 25l5-5 5 5 5-5 5 5M20 5v9m-5-4 5 5 5-5"/></svg>',
  bubble:'<svg viewBox="0 0 40 40"><path d="M20 4 32 9v9c0 8-5 14-12 18C13 32 8 26 8 18V9zM14 20l4 4 8-9"/></svg>',
  glue:'<svg viewBox="0 0 40 40"><path d="M9 25c2-8 7-4 9-11 1-4 8-5 11 1 4 7 6 13-1 17-8 4-21 1-19-7zM15 27h.1M24 29h.1"/></svg>',
  wave:'<svg viewBox="0 0 40 40"><path d="M20 4v8m0 16v8M4 20h8m16 0h8M9 9l6 6m10 10 6 6m0-22-6 6m-10 10-6 6"/><circle cx="20" cy="20" r="4"/></svg>',
  decoy:'<svg viewBox="0 0 40 40"><path d="m5 13 15-8 15 8v15l-15 9L5 28zM5 13l15 9 15-9M20 22v15M17 13c0-4 7-4 7 0 0 3-4 3-4 7m0 4v.1"/></svg>',
  magnet:'<svg viewBox="0 0 40 40"><path d="M10 7v13a10 10 0 0 0 20 0V7M10 7h7v10m13-10h-7v10M8 5h11M21 5h11M5 28l3 3 3-3m10 3 3 3 3-3"/></svg>',
  rocket:'<svg viewBox="0 0 40 40"><path d="M16 27 11 22C13 11 23 5 34 6c1 11-5 21-16 23l-2-2zM13 17l-7 1-2 8 8-1m11 3-1 7 8-2 1-8M11 29l-5 5m8-3-3 5m-2-10-5 3"/><circle cx="26" cy="14" r="3"/></svg>'
};
