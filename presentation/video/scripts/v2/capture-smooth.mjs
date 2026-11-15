import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.KC_PLAYWRIGHT_MODULE?pathToFileURL(process.env.KC_PLAYWRIGHT_MODULE).href:'playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..');
const scratch='work/kinetic-core-video-v2/capture';
const output=path.join(root,'remotion/public/footage-v2');
const bin=path.join(root,'remotion/node_modules/@remotion/compositor-darwin-arm64');
await fs.mkdir(output,{recursive:true});await fs.mkdir(scratch,{recursive:true});
const manifest={recordedAtUTC:new Date().toISOString(),url:'http://127.0.0.1:5188/',viewport:{width:1600,height:900},fps:30,method:'One screenshot after each controlled browser-clock frame. Existing RAF and fixed-step physics; no source edits, injected states or fabricated telemetry.',clips:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const writeManifest=()=>fs.writeFile(path.join(output,'capture-manifest-v2.json'),JSON.stringify(manifest,null,2));
async function fresh(){const context=await browser.newContext({viewport:manifest.viewport,deviceScaleFactor:1});const page=await context.newPage();await page.clock.install({time:new Date()});await page.goto(manifest.url,{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(500);const stamp=await page.evaluate(()=>Date.now());await page.clock.pauseAt(stamp+100);await page.clock.runFor(500);return {page,context};}
async function click(page,selector){await page.locator(selector).click({force:true,timeout:5000});}
async function mode(page,name){await click(page,'.app-header .mode-hub-trigger');await click(page,`[data-mode="${name}"]`);await page.clock.runFor(300);}
async function state(page){return page.evaluate(()=>({legacy:JSON.parse(window.render_game_to_text()),mission:JSON.parse(window.render_mission_to_text()),version:document.querySelector('.app-footer')?.innerText??'',scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));}
async function encode(name,framesDir){const file=path.join(output,name+'.mp4');const r=spawnSync(path.join(bin,'ffmpeg'),['-hide_banner','-v','error','-y','-framerate','30','-i',path.join(framesDir,'frame-%05d.jpg'),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-r','30','-an','-movflags','+faststart',file],{env:{...process.env,DYLD_LIBRARY_PATH:bin},encoding:'utf8'});if(r.status)throw Error(r.stderr);return file;}
async function capture(page,name,seconds,onFrame=async()=>{},detail=''){
 const dir=path.join(scratch,name);await fs.mkdir(dir,{recursive:true});const before=await state(page),count=Math.round(seconds*30),started=performance.now();
 for(let i=0;i<count;i++){await onFrame(i,page);await page.clock.runFor(i%3===2?34:33);await page.screenshot({path:path.join(dir,'frame-'+String(i).padStart(5,'0')+'.jpg'),type:'jpeg',quality:90,animations:'allow',caret:'hide'});if(i%60===0)console.log('FRAMES',name,i+'/'+count);}
 const after=await state(page),file=await encode(name,dir);const clip={name,file:path.relative(path.join(root,'remotion/public'),file),seconds,frames:count,fps:30,detail,before,after,captureWallSeconds:(performance.now()-started)/1000};manifest.clips.push(clip);await writeManifest();console.log('READY',name,seconds,JSON.stringify({legacyTime:after.legacy.telemetry?.time,missionPhase:after.mission?.phase}));return clip;
}
async function sceneDrag(page,selector,startX=.48,startY=.5){const b=await page.locator(selector).boundingBox();if(!b)throw Error('Missing scene '+selector);await page.mouse.move(b.x+b.width*startX,b.y+b.height*startY);await page.mouse.down();return {b,x:b.x+b.width*startX,y:b.y+b.height*startY};}
async function section(name,fn){let c;try{c=await fresh();await fn(c.page);}catch(e){manifest.errors.push({section:name,error:e.message});await writeManifest();console.error('FAILED',name,e.message);}finally{await c?.context.close();}}
await section('worlds',async page=>{
 await click(page,'#destination-button');await page.clock.runFor(300);
 await capture(page,'destinations',6,async i=>{if(i===30)await click(page,'[data-destination="europa"]');if(i===85)await click(page,'[data-destination="titan"]');if(i===135)await click(page,'[data-destination="moon"]');},'Actual destination selector; physical reference parameters and local-rehearsal boundaries remain visible.');
 await click(page,'#close-destination');await mode(page,'solar-system');await page.waitForTimeout(500);await page.clock.runFor(400);
 let drag=await sceneDrag(page,'.solar-explorer canvas');
 await capture(page,'solar-system',7,async i=>{if(i<55)await page.mouse.move(drag.x+i*2.3,drag.y+i*.15);if(i===55){await page.mouse.up();await page.locator('.solar-explorer [data-system]').selectOption({label:'Jupiter'},{force:true});await page.waitForTimeout(400);}if(i===95){await page.locator('.solar-explorer [data-body]').selectOption({label:'Europa'},{force:true});await page.waitForTimeout(500);drag=await sceneDrag(page,'.solar-explorer canvas');}if(i>95&&i<185)await page.mouse.move(drag.x+(i-95)*1.1,drag.y+(i-95)*.12);if(i===185)await page.mouse.up();},'Illustrative Solar System atlas; real UI selection of Jupiter/Europa and mouse camera orbit; not ephemeris or spacecraft flight.');
 await page.mouse.up();
});
await section('builder',async page=>{
 await mode(page,'workshop');const w=page.locator('.rocket-workshop');await w.locator('[data-action="preset"]').click({force:true});await w.locator('[data-slot="service-tank"]').click({force:true});await page.clock.runFor(400);const box=await sceneDrag(page,'.rocket-workshop .rw-scene canvas');
 await capture(page,'builder',12,async i=>{if(i<90)await page.mouse.move(box.x+i*1.4,box.y+i*.2);if(i===90)await page.mouse.up();if(i===105){const input=w.locator('[data-dimension="length"]');await input.fill('10');await input.press('Tab');}if(i===170){const input=w.locator('[data-dimension="radius"]');await input.fill('2.6');await input.press('Tab');}if(i===235){const input=w.locator('[data-dimension="length"]');await input.fill('7');await input.press('Tab');}if(i===290){const input=w.locator('[data-dimension="radius"]');await input.fill('2');await input.press('Tab');}},'Typed service-tank dimensions changed through normal controls: length7→10m, radius2→2.6m, then restored. Geometry, mass and delta-v are computed by the game.');
 await w.locator('[data-action="start"]').click({force:true});await page.clock.runFor(200);
 const mc=page.locator('.mission-control');
 await capture(page,'planner',5,async i=>{if(i===40)await mc.getByRole('button',{name:'Hadley approach / Apollo 15',exact:true}).click({force:true});if(i===95)await mc.getByRole('button',{name:'Taurus–Littrow approach / Apollo 17',exact:true}).click({force:true});},'Moon route planner; actual site selections, retained custom-craft mass/performance.');
});
await section('launch',async page=>{
 await mode(page,'moon-mission');const mc=page.locator('.mission-control');await mc.locator('[data-action="start"]').click({force:true});await page.clock.runFor(200);await mc.locator('[data-action="skip-rollout"]').click({force:true});await page.clock.runFor(5100);
 await capture(page,'liftoff',10,async()=>{},'Integrated Moon route: ordinary Skip to countdown, real powered ascent. Existing UI warp10× becomes active after actual first100m handover; no state injection.');
 const ready=mc.locator('[data-action="stage"].stage-ready');
 for(let i=0;i<200&&!await ready.isVisible();i++){await page.clock.runFor(100);}
 if(await ready.isVisible()){
  await capture(page,'staging',5,async i=>{if(i===25)await ready.click({force:true});},'Actual depleted-core pause followed by normal pilot Separate stage action; retained mass/geometry/fuel update physically.');
 }else{await capture(page,'staging',5,async()=>{},'Actual powered ascent and live navigation map; no stage-release claim because depletion had not been reached.');}
});
await section('docking',async page=>{
 await click(page,'#practice-button');await page.clock.runFor(300);let drag=await sceneDrag(page,'#flight-canvas',.6,.48);
 await capture(page,'docking-external',5,async i=>{if(i<70)await page.mouse.move(drag.x+i*1.6,drag.y+i*.1);if(i===70){await page.mouse.up();await page.keyboard.down('w');await page.keyboard.down('a');await page.keyboard.down('r');}if(i===130){await page.keyboard.up('a');await page.keyboard.up('r');}},'Separate70m terminal docking exercise; real mouse camera orbit and keyboard body-axis RCS.');
 await page.mouse.up();await click(page,'[data-docking-view="cockpit"]');
 await capture(page,'docking-cockpit',9,async i=>{if(i===100)await page.keyboard.up('w');if(i===130)await page.keyboard.down('Space');if(i===220)await page.keyboard.up('Space');},'Separate terminal exercise: real approach, finite RCS reserve, powered attitude hold and explicit Space braking. No capture outcome is fabricated.');
 await page.keyboard.up('w');await page.keyboard.up('a');await page.keyboard.up('r');await page.keyboard.up('Space');
});
await browser.close();await writeManifest();console.log('ALL CAPTURES FINISHED',manifest.clips.map(c=>c.name).join(','));
