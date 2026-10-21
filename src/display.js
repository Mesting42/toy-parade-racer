// Shared by the HUD, renderer and camera. Rotation never recreates a race.
export function viewportLayout(width,height,coarse=false){
  const phone=Math.min(width,height)<=600&&(coarse||Math.max(width,height)<=1100);
  return {width,height,phone,portrait:height>width,touch:coarse||width<=1024,quality:phone?'low':'medium'};
}
export function readViewportLayout(){return viewportLayout(innerWidth,innerHeight,matchMedia('(any-pointer: coarse)').matches);}
export function raceFraming(layout){
  if(layout.phone&&layout.portrait)return {back:28,height:14,ahead:12,fov:62};
  if(layout.portrait)return {back:25,height:13,ahead:15,fov:55};
  return {back:22,height:12,ahead:18,fov:53};
}
