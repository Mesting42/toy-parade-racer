// Player and opponent bodies are distinct complete, driverless CC0 shells.
export const TOY_CAR_MODELS=Object.freeze({
  bee:Object.freeze({asset:'vehicle-racer-low',paintColumn:4}),
  snail:Object.freeze({asset:'vehicle-racer',paintColumn:1}),
  acorn:Object.freeze({asset:'vehicle-speedster',paintColumn:4}),
  drag:Object.freeze({asset:'vehicle-drag-racer',paintColumn:3,minPaintCoverage:.3}),
  vintage:Object.freeze({asset:'vehicle-vintage-racer',paintColumn:7,paintColumns:[6,7],minPaintCoverage:.25}),
  suv:Object.freeze({asset:'vehicle-suv',paintColumn:7,minPaintCoverage:.4}),
});
export const TOY_CAR_LENGTH=6.15;
export const TOY_CAR_PAINT_ROWS=Object.freeze([4,5]);

export function raceCarLineup(playerCarId){
  const player=Object.hasOwn(TOY_CAR_MODELS,playerCarId)?playerCarId:'bee';
  return [player,...Object.keys(TOY_CAR_MODELS).filter(id=>id!==player)];
}

export function updateToyCarWheels(view,racer){
  const data=view.userData,previous=data.wheelPosition;
  // Render and simulation can both refresh a view; count each movement once.
  if(previous)data.wheelTravel=(data.wheelTravel||0)+Math.min(3,Math.hypot(racer.x-previous.x,racer.z-previous.z))/.88;
  data.wheelPosition={x:racer.x,z:racer.z};
  for(const wheel of data.kenneyWheels){
    wheel.rotation.x=-(data.wheelTravel||0);
    wheel.parent.rotation.y=wheel.userData.frontWheel?(racer.steerInput||0)*.3:0;
  }
}
