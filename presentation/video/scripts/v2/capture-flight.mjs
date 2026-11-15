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
const manifest={recordedAtUTC:new Date().toISOString(),url:'http://127.0.0.1:5188/',viewport:{width:1280,height:720},fps:30,method:'One screenshot after each controlled browser-clock frame. Existing RAF and fixed-step physics; no source edits, injected states or fabricated telemetry.',clips:[],errors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const writeManifest=()=>fs.writeFile(path.join(output,'capture-flight-manifest.json'),JSON.stringify(manifest,null,2));
async function fresh(){const context=await browser.newContext({viewport:manifest.viewport,deviceScaleFactor:1});const page=await context.newPage();await page.clock.install({time:new Date()});await page.goto(manifest.url,{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(1000);const stamp=await page.evaluate(()=>Date.now());await page.clock.pauseAt(stamp+100);await page.clock.runFor(500);return {page,context};}
async function click(page,selector){await page.locator(selector).click({force:true,timeout:5000});}
async function mode(page,name){await click(page,'button.mode-hub-trigger:visible');await click(page,`[data-mode="${name}"]`);await page.clock.runFor(300);}
async function state(page){return page.evaluate(()=>({legacy:JSON.parse(window.render_game_to_text()),mission:JSON.parse(window.render_mission_to_text()),version:document.querySelector('.app-footer')?.innerText??'',scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));}
async function encode(name,framesDir){const file=path.join(output,name+'.mp4');const r=spawnSync(path.join(bin,'ffmpeg'),['-hide_banner','-v','error','-y','-framerate','30','-i',path.join(framesDir,'frame-%05d.jpg'),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-r','30','-an','-movflags','+faststart',file],{env:{...process.env,DYLD_LIBRARY_PATH:bin},encoding:'utf8'});if(r.status)throw Error(r.stderr);return file;}
async function capture(page,name,seconds,onFrame=async()=>{},detail=''){
 const dir=path.join(scratch,name);await fs.mkdir(dir,{recursive:true});const before=await state(page),count=Math.round(seconds*30),started=performance.now();
 for(let i=0;i<count;i++){await onFrame(i,page);await page.clock.runFor(i%3===2?34:33);await page.screenshot({path:path.join(dir,'frame-'+String(i).padStart(5,'0')+'.jpg'),type:'jpeg',quality:90,timeout:10000,animations:'allow',caret:'hide'});if(i%60===0)console.log('FRAMES',name,i+'/'+count);}
 const after=await state(page),file=await encode(name,dir);const clip={name,file:path.relative(path.join(root,'remotion/public'),file),seconds,frames:count,fps:30,detail,before,after,captureWallSeconds:(performance.now()-started)/1000};manifest.clips.push(clip);await writeManifest();console.log('READY',name,seconds,JSON.stringify({legacyTime:after.legacy.telemetry?.time,missionPhase:after.mission?.phase}));return clip;
}
async function sceneDrag(page,selector,startX=.48,startY=.5){const b=await page.locator(selector).boundingBox();if(!b)throw Error('Missing scene '+selector);await page.mouse.move(b.x+b.width*startX,b.y+b.height*startY);await page.mouse.down();return {b,x:b.x+b.width*startX,y:b.y+b.height*startY};}
async function section(name,fn){if(!['launch'].includes(name))return;let c;try{console.log('START',name);c=await fresh();console.log('FRESH',name,await c.page.title());await fn(c.page);}catch(e){manifest.errors.push({section:name,error:e.message});await writeManifest();console.error('FAILED',name,e.message);}finally{await c?.context.close();}}
await section('launch',async page=>{
 await mode(page,'moon-mission');const mc=page.locator('.mission-control');await mc.locator('[data-action="start"]').click({force:true});await page.clock.runFor(200);await mc.locator('[data-action="skip-rollout"]').click({force:true});await page.clock.runFor(5100);
 await capture(page,'liftoff',10,async()=>{},'Integrated Moon route: ordinary Skip to countdown, real powered ascent. Existing UI warp10× becomes active after actual first100m handover; no state injection.');
});
await browser.close();await writeManifest();console.log('ALL CAPTURES FINISHED',manifest.clips.map(c=>c.name).join(','));
