const POINTS_BY_PLACE=[10,7,5,3,2,1];

export const CUP_COUNT=3;
export const TRACKS_PER_CUP=3;
export const CUP_UNLOCK_POINTS=9;
export const TOTAL_UNLOCK_POINTS=18;

export function raceStandings(order=[]){
  return order.map((racer,index)=>({
    driverId:racer.driverId||racer.name||`driver-${index+1}`,
    name:racer.name||'玩具车手',
    rank:index+1,
    points:POINTS_BY_PLACE[index]||0,
    finishTime:Number.isFinite(racer.finishTime)?racer.finishTime:null,
  }));
}

export function aggregateStandings(results=[]){
  const totals=new Map();
  for(const race of results){
    const entries=Array.isArray(race.standings)&&race.standings.length?race.standings:[{driverId:'player',name:'你',rank:race.rank||6,points:race.points||0}];
    for(const row of entries){
      const id=row.driverId||row.name||'driver';
      const total=totals.get(id)||{driverId:id,name:row.name||'玩具车手',points:0,wins:0,podiums:0,bestRank:6,races:0};
      const place=Math.max(1,Math.min(6,Number(row.rank)||6));
      total.points+=Math.max(0,Number(row.points)||0);
      total.wins+=place===1?1:0;
      total.podiums+=place<=3?1:0;
      total.bestRank=Math.min(total.bestRank,place);
      total.races+=1;
      totals.set(id,total);
    }
  }
  return [...totals.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||b.podiums-a.podiums||a.bestRank-b.bestRank||a.name.localeCompare(b.name,'zh-Hans-CN'));
}

function normalizeChampionship(championship={}){
  const cup=Math.max(0,Math.min(CUP_COUNT-1,Math.trunc(Number(championship.cup)||0)));
  const maxTrack=championship.complete?TRACKS_PER_CUP:TRACKS_PER_CUP-1;
  const track=Math.max(0,Math.min(maxTrack,Math.trunc(Number(championship.track)||0)));
  return {...championship,cup,track,results:Array.isArray(championship.results)?championship.results.slice():[],complete:!!championship.complete,replayNeeded:!!championship.replayNeeded};
}

export function cupPoints(results=[],cup=0){
  return results.filter(result=>result.cup===cup).reduce((sum,result)=>sum+(Number(result.points)||0),0);
}

export function isCupUnlocked(championship,cup){
  const state=normalizeChampionship(championship);
  if(cup<=0)return true;
  if(cup===1)return cupPoints(state.results,0)>=CUP_UNLOCK_POINTS;
  if(cup===2)return cupPoints(state.results,0)+cupPoints(state.results,1)>=TOTAL_UNLOCK_POINTS;
  return false;
}

export function championshipTrackIndex(championship,tracks){
  const state=normalizeChampionship(championship);
  if(state.complete)return null;
  const first=tracks.findIndex(track=>track.cup===state.cup);
  if(first<0)return null;
  return first+Math.min(state.track,TRACKS_PER_CUP-1);
}

export function beginChampionship(championship,tracks){
  const state=normalizeChampionship(championship);
  if(state.complete)return {championship:state,trackIndex:null,complete:true};
  if(!isCupUnlocked(state,state.cup)){state.cup=0;state.track=0;state.replayNeeded=false;}
  if(state.track===0&&state.replayNeeded)state.replayNeeded=false;
  state.started=true;
  return {championship:state,trackIndex:championshipTrackIndex(state,tracks),complete:false};
}

export function recordChampionshipResult(championship,track,result,{advance=true}={}){
  const state=normalizeChampionship(championship);
  const entry={trackId:track.id,track:track.name,cup:track.cup,rank:result.rank,points:result.points,time:result.elapsed,standings:result.standings};
  const existing=state.results.findIndex(item=>item.trackId===entry.trackId);
  if(existing<0)state.results.push(entry);
  else{
    const previous=state.results[existing];
    const previousTime=Number.isFinite(previous.time)?previous.time:Infinity;
    const currentTime=Number.isFinite(entry.time)?entry.time:Infinity;
    if(entry.points>previous.points||(entry.points===previous.points&&currentTime<previousTime))state.results[existing]=entry;
  }

  // Re-running a completed station may improve its stored score, but must not
  // move the active tournament cursor a second time.
  if(!advance||state.complete||track.cup!==state.cup)return state;
  state.track=Math.min(TRACKS_PER_CUP,state.track+1);
  if(state.track<TRACKS_PER_CUP)return state;

  if(state.cup===CUP_COUNT-1){
    state.complete=true;
    state.replayNeeded=false;
    return state;
  }

  if(cupPoints(state.results,state.cup)>=CUP_UNLOCK_POINTS){
    state.cup++;
    state.track=0;
    state.replayNeeded=false;
  }else{
    state.track=0;
    state.replayNeeded=true;
  }
  return state;
}

export function championshipResultsPhase(championship,raceCup){
  const state=normalizeChampionship(championship);
  if(state.complete)return 'complete';
  if(state.cup!==raceCup)return 'next-cup';
  if(state.replayNeeded&&state.track===0)return 'replay';
  return 'continue';
}

export function championshipOutcome(results=[]){
  const standings=aggregateStandings(results);
  const playerIndex=standings.findIndex(row=>row.driverId==='player');
  return {standings,playerPlace:playerIndex<0?standings.length+1:playerIndex+1,winner:standings[0]||null,playerWon:standings[0]?.driverId==='player'};
}
