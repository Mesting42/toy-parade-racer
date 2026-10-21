import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const output=fileURLToPath(new URL('./screenshots/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const sizes=[
  {name:'desktop',width:1440,height:900,mobile:false,touch:false},
  {name:'tablet',width:768,height:1024,mobile:true,touch:true},
  {name:'mobile',width:390,height:844,mobile:true,touch:true},
  {name:'landscape',width:844,height:390,mobile:true,touch:true},
];
const reports=[];
try{
  for(const size of sizes){
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,isMobile:size.mobile,hasTouch:size.touch});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('http://127.0.0.1:5175/',{waitUntil:'domcontentloaded'});
    const skip=page.getByRole('button',{name:'跳过教学'});
    if(await skip.count())await skip.click();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(2000);
    await page.screenshot({path:join(output,`${size.name}-home.png`)});
    const home=await page.evaluate("({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,brand:document.querySelector('.brand-badge img')?.naturalWidth})");
    assert.ok(home.scrollW<=home.w,`${size.name} home has horizontal overflow`);
    if(size.name==='mobile'){
      await page.getByRole('button',{name:/选择赛道/}).click();
      await page.screenshot({path:join(output,'mobile-select.png')});
      const solo=await page.getByRole('button',{name:'主菜单',exact:true}).count();
      assert.equal(solo,1,'mobile selection renders its back action');
      assert.equal(await page.getByText('电脑车手',{exact:true}).count(),1,'quick race keeps its opponent selection controls');
      await page.getByRole('button',{name:'主菜单',exact:true}).click();
    }
    await page.getByRole('button',{name:/选择赛道/}).click();
    await page.getByRole('button',{name:'驶入赛道'}).click();
    await page.waitForTimeout(3800);
    const race=await page.evaluate("({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,touchDisplay:getComputedStyle(document.querySelector('.touch-controls')).display,touchRect:document.querySelector('.touch-controls').getBoundingClientRect().toJSON(),leftRect:document.querySelector('.race-bottom-left').getBoundingClientRect().toJSON(),rightRect:document.querySelector('.race-bottom-right').getBoundingClientRect().toJSON()})");
    assert.ok(race.scrollW<=race.w,`${size.name} race has horizontal overflow`);
    if(size.touch)assert.equal(race.touchDisplay,'flex',`${size.name} should show touch controls`);
    if(!size.touch)assert.equal(race.touchDisplay,'none',`${size.name} should keep touch controls out of the keyboard layout`);
    assert.ok(race.touchRect.top>=race.leftRect.bottom||race.touchRect.bottom<=race.leftRect.top,`${size.name} controls overlap speed/drift HUD`);
    assert.ok(race.touchRect.top>=race.rightRect.bottom||race.touchRect.bottom<=race.rightRect.top,`${size.name} controls overlap the item HUD`);
    await page.screenshot({path:join(output,`${size.name}-race.png`)});
    assert.deepEqual(errors,[],`${size.name} browser errors`);
    reports.push({name:size.name,home,race,errors});
    await context.close();
  }
}finally{await browser.close();}
console.log(JSON.stringify(reports,null,2));
