import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS} from '../src/tracks.js';
import {freshProfile} from '../src/storage.js';
import {
  beginChampionship,
  championshipOutcome,
  championshipResultsPhase,
  championshipTrackIndex,
  cupPoints,
  isCupUnlocked,
  raceStandings,
  recordChampionshipResult,
} from '../src/championship.js';

const POINTS=[10,7,5,3,2,1];
const DRIVER_IDS=['player','peach','blue','chestnut','bean','wood'];
const DRIVER_NAMES=['你','桃桃汽水','蓝莓船长','栗子队长','小豆包','木木师傅'];

function resultForRank(rank,elapsed=120){
  const playerIndex=rank-1;
  const rivals=DRIVER_IDS.slice(1);
  const order=[...rivals.slice(0,playerIndex),DRIVER_IDS[0],...rivals.slice(playerIndex)];
  const standings=raceStandings(order.map((driverId)=>({driverId,name:DRIVER_NAMES[DRIVER_IDS.indexOf(driverId)]})));
  return {rank,points:POINTS[rank-1],elapsed,standings};
}

function freshChampionship(){return freshProfile().championship;}
function roundTrip(state){return JSON.parse(JSON.stringify(state));}

test('tournament advances through all three cups and nine stations, including saved resume state',()=>{
  let state=freshChampionship();
  for(let station=0;station<TRACKS.length;station++){
    const next=beginChampionship(state,TRACKS);
    assert.equal(next.trackIndex,station,`station ${station+1} should resume at its own route`);
    assert.equal(next.complete,false);
    state=recordChampionshipResult(next.championship,TRACKS[next.trackIndex],resultForRank(1,100+station));
    state=roundTrip(state);
    if(station===2){assert.equal(state.cup,1);assert.equal(state.track,0);assert.equal(state.replayNeeded,false);assert.equal(isCupUnlocked(state,1),true);assert.equal(isCupUnlocked(state,2),true);}
    if(station===5){assert.equal(state.cup,2);assert.equal(state.track,0);assert.equal(isCupUnlocked(state,2),true);}
  }
  assert.equal(state.complete,true);
  assert.equal(state.cup,2);
  assert.equal(state.track,3);
  assert.equal(state.results.length,9);
  assert.equal(new Set(state.results.map(row=>row.trackId)).size,9);
  assert.equal(championshipTrackIndex(state,TRACKS),null);
  assert.equal(beginChampionship(state,TRACKS).complete,true);
  const outcome=championshipOutcome(state.results);
  assert.equal(outcome.playerWon,true);
  assert.equal(outcome.playerPlace,1);
  assert.equal(outcome.winner.points,90);
  assert.equal(outcome.winner.races,9);
  assert.deepEqual([0,1,2].map(cup=>cupPoints(state.results,cup)),[30,30,30]);
});

test('low cup points restart the cup, replace improved station results, and unlock the next cup',()=>{
  let state=freshChampionship();
  for(let station=0;station<3;station++){
    const next=beginChampionship(state,TRACKS);
    assert.equal(next.trackIndex,station);
    state=recordChampionshipResult(next.championship,TRACKS[next.trackIndex],resultForRank(6,200+station));
  }
  assert.equal(state.cup,0);
  assert.equal(state.track,0);
  assert.equal(state.replayNeeded,true);
  assert.equal(cupPoints(state.results,0),3);
  assert.equal(isCupUnlocked(state,1),false);
  assert.equal(championshipResultsPhase(state,0),'replay');

  const replay=beginChampionship(roundTrip(state),TRACKS);
  assert.equal(replay.trackIndex,0);
  assert.equal(replay.championship.replayNeeded,false);
  state=replay.championship;
  for(let station=0;station<3;station++){
    const next=beginChampionship(state,TRACKS);
    assert.equal(next.trackIndex,station);
    state=recordChampionshipResult(next.championship,TRACKS[next.trackIndex],resultForRank(2,150+station));
  }
  assert.equal(state.cup,1);
  assert.equal(state.track,0);
  assert.equal(state.replayNeeded,false);
  assert.equal(cupPoints(state.results,0),21);
  assert.equal(state.results.length,3,'replays replace results instead of duplicating stations');
  assert.equal(isCupUnlocked(state,1),true);
  assert.equal(championshipResultsPhase(state,0),'next-cup');
  assert.equal(beginChampionship(roundTrip(state),TRACKS).trackIndex,3);
});

test('cup two stays locked until combined cup points reach eighteen',()=>{
  const state={...freshChampionship(),results:[
    {trackId:TRACKS[0].id,cup:0,points:7},
    {trackId:TRACKS[1].id,cup:0,points:2},
    {trackId:TRACKS[2].id,cup:0,points:0},
    {trackId:TRACKS[3].id,cup:1,points:7},
    {trackId:TRACKS[4].id,cup:1,points:1},
  ]};
  assert.equal(isCupUnlocked(state,1),true);
  assert.equal(isCupUnlocked(state,2),false,'17 combined points are not enough');
  state.results.push({trackId:TRACKS[5].id,cup:1,points:1});
  assert.equal(isCupUnlocked(state,2),true,'18 combined points unlock the third cup');
});

test('rematching a station may improve its score without skipping the next station',()=>{
  let state=freshChampionship();
  state=recordChampionshipResult(state,TRACKS[0],resultForRank(5,180));
  assert.equal(state.track,1);
  state=recordChampionshipResult(state,TRACKS[0],resultForRank(2,160),{advance:false});
  assert.equal(state.track,1);
  assert.equal(state.results.length,1);
  assert.equal(state.results[0].points,7);
  assert.equal(beginChampionship(state,TRACKS).trackIndex,1);
});

test('final standings show a non-champion correctly after all nine stations',()=>{
  let state=freshChampionship();
  for(let station=0;station<TRACKS.length;station++){
    const next=beginChampionship(state,TRACKS);
    state=recordChampionshipResult(next.championship,TRACKS[next.trackIndex],resultForRank(2,100+station));
  }
  assert.equal(state.complete,true);
  const outcome=championshipOutcome(state.results);
  assert.equal(outcome.playerWon,false);
  assert.equal(outcome.playerPlace,2);
  assert.equal(outcome.winner.driverId,'peach');
  assert.equal(outcome.winner.points,90);
});
