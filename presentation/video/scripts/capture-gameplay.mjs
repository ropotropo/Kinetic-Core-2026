import {pathToFileURL} from 'node:url';
const playwrightModule=process.env.KC_PLAYWRIGHT_MODULE;
const {chromium}=await import(playwrightModule?pathToFileURL(playwrightModule).href:'playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'remotion/public/footage');
const scratch=path.resolve(root,'../../../work/kinetic-core-video');
await fs.mkdir(output,{recursive:true});await fs.mkdir(scratch,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const manifest={recordedAtUTC:new Date().toISOString(),url:'http://127.0.0.1:5188/',build:'Kinetic Core v0.4.4 dist',viewport:{width:1600,height:900},method:'Actual game render, ordinary UI and keyboard inputs; read-only state hooks for shot logging. No state injection.',clips:[]};
async function record(name,actions){const ctx=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:output,size:{width:1600,height:900}}});const page=await ctx.newPage();const began=Date.now();const entry={name,source:name+'.webm',events:[],errors:[]};const mark=(label,state)=>{const event={seconds:(Date.now()-began)/1000,label,state};entry.events.push(event);console.log(name,JSON.stringify(event));};page.on('pageerror',e=>entry.errors.push(e.message));await page.goto(manifest.url,{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(5000);try{await actions(page,mark);}catch(e){entry.error=e.message;console.error(name,e.message);}const video=page.video();entry.wallDurationSeconds=(Date.now()-began)/1000;await ctx.close();const raw=await video.path();await fs.rename(raw,path.join(output,name+'.webm'));manifest.clips.push(entry);await fs.writeFile(path.join(root,'capture-manifest.json'),JSON.stringify(manifest,null,2));console.log('RECORDED',name,entry.wallDurationSeconds);}
await record('builder-launch',async(page,mark)=>{
 await page.locator('.app-header .mode-hub-trigger').click();await page.locator('[data-mode="workshop"]').click();await page.waitForTimeout(1500);const w=page.locator('.rocket-workshop');mark('Workshop ready');
 const slot=w.locator('button[data-slot]').first();if(await slot.count()){await slot.click();const input=w.locator('[data-dimension="length"]');if(await input.isEnabled()){const old=Number(await input.inputValue());await input.fill(String(Math.round((old+.1)*100)/100));await input.press('Tab');mark('Dimension changed through workshop input');}}
 const box=await w.locator('.rw-scene canvas').boundingBox();if(box){await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);await page.mouse.down();for(let i=0;i<25;i++){await page.mouse.move(box.x+box.width*.55+i*6,box.y+box.height*.5+i*.7);await page.waitForTimeout(60);}await page.mouse.up();}await page.waitForTimeout(4000);mark('Workshop detail');
 await w.locator('[data-action="start"]').click();await page.waitForTimeout(5000);mark('Moon mission planner');const mc=page.locator('.mission-control');await mc.locator('[data-action="start"]').click();mark('Integrated mission start');
 let prior='';const until=Date.now()+85000;while(Date.now()<until){const m=await page.evaluate(()=>JSON.parse(window.render_mission_to_text()));if(m?.phase!==prior){prior=m?.phase;mark('Mission phase '+prior,{time:m?.time,phase:m?.phase});await page.screenshot({path:path.join(scratch,'review','mission-'+prior+'.png')});}const stage=mc.locator('[data-action="stage"].stage-ready');if(await stage.isVisible()){await stage.click();mark('Pilot stage separation');}if(m?.phase==='orbit'){await mc.locator('[data-action="depart"]').click();mark('Plan lunar departure');}if(['failed','landed'].includes(m?.phase)){await page.waitForTimeout(5000);break;}await page.waitForTimeout(500);}mark('Mission clip end');
});
await record('docking',async(page,mark)=>{
 await page.locator('#practice-button').click();await page.waitForTimeout(1500);mark('Separate manual docking exercise');
 await page.locator('[data-docking-view="cockpit"]').click();await page.waitForTimeout(2000);await page.keyboard.down('w');await page.keyboard.down('a');await page.keyboard.down('r');await page.waitForTimeout(7000);await page.keyboard.up('a');await page.keyboard.up('r');await page.waitForTimeout(12000);await page.keyboard.up('w');await page.keyboard.down('Space');await page.waitForTimeout(6000);await page.keyboard.up('Space');mark('Powered RCS braking',await page.evaluate(()=>JSON.parse(window.render_game_to_text())));
 await page.locator('[data-docking-view="chase"]').click();await page.waitForTimeout(6000);mark('External docking detail');
});
await browser.close();console.log('CAPTURE COMPLETE');
