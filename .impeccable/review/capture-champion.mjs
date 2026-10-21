import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { TRACKS } from '../../src/tracks.js';
import { freshProfile } from '../../src/storage.js';

const output=fileURLToPath(new URL('./screenshots/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const order=[
  {driverId:'player',name:'你',rank:1,points:10,finishTime:95},
  {driverId:'pilot-peach',name:'桃团',rank:2,points:7,finishTime:96},
  {driverId:'pilot-blue',name:'蓝铃',rank:3,points:5,finishTime:97},
  {driverId:'pilot-acorn',name:'栗壳',rank:4,points:3,finishTime:98},
  {driverId:'pilot-sprout',name:'豆苗',rank:5,points:2,finishTime:99},
  {driverId:'pilot-birch',name:'白桦',rank:6,points:1,finishTime:100},
];
const profile=freshProfile();
profile.coins=113;
profile.totalRaces=9;
profile.tutorialSeen=true;
profile.championship={cup:2,track:3,complete:true,started:true,results:TRACKS.map(track=>({trackId:track.id,track:track.name,cup:track.cup,rank:1,points:10,time:95,standings:order}))};
const errors=[];
try{
  for(const size of [{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844}]){
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.name==='mobile',hasTouch:size.name==='mobile'});
    await context.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:'toy-parade-race-save-v1',value:JSON.stringify(profile)});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(`${size.name}: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`${size.name}: ${m.text()}`);});
    await page.goto('http://127.0.0.1:5175/',{waitUntil:'domcontentloaded'});
    const action=page.getByRole('button',{name:'查看冠军纪念章'});
    await action.waitFor({state:'visible'});
    await action.click();
    await page.getByRole('heading',{name:'巡游总冠军'}).waitFor({state:'visible'});
    assert.equal(await page.locator('.champion-standings li').count(),6,`${size.name}: final board lists six drivers`);
    assert.equal(await page.locator('.champion-route>div').count(),3,`${size.name}: final page lists all cups`);
    assert.match(await page.locator('.champion-standings li').first().innerText(),/你.*90/s,`${size.name}: player champion total is visible`);
    const dimensions=await page.evaluate('({w:innerWidth,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,h:innerHeight})');
    assert.ok(dimensions.scrollW<=dimensions.w,`${size.name}: no horizontal overflow`);
    await page.screenshot({path:join(output,`champion-${size.name}.png`)});
    await context.close();
  }
  assert.deepEqual(errors,[],'champion screen has no browser errors');
  console.log(JSON.stringify({sizes:3,drivers:6,cups:3,champion:'你 · 90 分',errors},null,2));
}finally{await browser.close();}
