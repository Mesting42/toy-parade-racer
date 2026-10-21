const KEY='toy-parade-race-save-v1';
export const DEFAULT_SETTINGS={quality:'auto',effects:1,music:0.35,sfx:0.7,sensitivity:1,reducedShake:false,lowParticles:false,noFlash:false,controlMode:'keyboard'};
export function freshProfile(){return {version:1,coins:45,selectedCar:'bee',unlockedCars:['bee','snail','acorn'],unlockedPaints:['bee:sun','snail:mint','acorn:berry'],paint:{bee:'sun',snail:'mint',acorn:'berry'},rims:'cream',decoration:'flag',settings:{...DEFAULT_SETTINGS},best:{},ghosts:{},championship:{cup:0,track:0,results:[],complete:false,started:false},tutorialSeen:false,totalRaces:0};}
export function loadProfile(){
  try{const raw=localStorage.getItem(KEY);if(!raw)return {profile:freshProfile(),recovered:false};const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||parsed.version!==1)throw new Error('Unsupported save');const p={...freshProfile(),...parsed};p.settings={...DEFAULT_SETTINGS,...(parsed.settings||{})};p.championship={...freshProfile().championship,...(parsed.championship||{})};if(!Array.isArray(p.unlockedCars)||!Array.isArray(p.unlockedPaints))throw new Error('Incomplete save');return {profile:p,recovered:false};}
  catch{return {profile:freshProfile(),recovered:true};}
}
export function saveProfile(profile){try{localStorage.setItem(KEY,JSON.stringify(profile));return true;}catch{return false;}}
export function eraseProfile(){try{localStorage.removeItem(KEY);return true;}catch{return false;}}
export function bestGhost(profile,trackId){const record=profile.best[trackId];return record?.ghost||profile.ghosts[trackId]||null;}
