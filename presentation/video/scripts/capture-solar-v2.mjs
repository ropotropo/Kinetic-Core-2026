import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.KC_PLAYWRIGHT_MODULE?pathToFileURL(process.env.KC_PLAYWRIGHT_MODULE).href:'playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root='Nick';
const out=root+'/Hakaton2026/presentation/video/remotion/public/footage-v2';
const scratch=root+'/work/kinetic-core-video-v2/root-capture/solar';
const bin=root+'/Hakaton2026/presentation/video/remotion/node_modules/@remotion/compositor-darwin-arm64';
await fs.mkdir(scratch,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1600,height:900}});
const p=await context.newPage();await p.clock.install({time:new Date()});
await p.goto('http://127.0.0.1:5188/',{waitUntil:'networkidle',timeout:60000});
const direct=p.locator('button:visible').filter({hasText:/^Explore Solar System$/}).first();
if(await direct.count())await direct.click({force:true});
else{await p.locator('button:visible').filter({hasText:/^Modes$/}).first().click({force:true});await p.locator('[data-mode="solar-system"]:visible').click({force:true});}
await p.waitForTimeout(1600);
await p.screenshot({path:scratch+'/initial.png'});
console.log('Solar opened',await p.locator('[data-system]').isVisible());
const stamp=await p.evaluate(()=>Date.now());await p.clock.pauseAt(stamp+100);
const events=[];
for(let i=0;i<240;i++){
 if(i===45){await p.locator('[data-system]').selectOption({label:'Jupiter'},{force:true});events.push({frame:i,action:'Choose Jupiter system'});}
 if(i===110){await p.locator('[data-body]').selectOption({label:'Europa'},{force:true});events.push({frame:i,action:'Focus Europa'});}
 if(i===175){await p.locator('[data-system]').selectOption({label:'Earth'},{force:true});await p.locator('[data-body]').selectOption({label:'Moon'},{force:true});events.push({frame:i,action:'Choose Earth system and focus Moon'});}
 await p.clock.runFor(i%3===2?34:33);
 await p.screenshot({path:path.join(scratch,`frame-${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:90,animations:'allow'});
 if(i%60===0)console.log('Solar frames',i);
}
await fs.writeFile(out+'/solar-system-provenance.json',JSON.stringify({url:'http://127.0.0.1:5188/',method:'Actual Solar System UI; ordinary select controls, controlled browser clock; one screenshot per1/30s, no generated gameplay or physics edits',frames:240,fps:30,events},null,2));
await context.close();await browser.close();
execFileSync(bin+'/ffmpeg',['-v','error','-y','-framerate','30','-i',scratch+'/frame-%04d.jpg','-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-an','-movflags','+faststart',out+'/solar-system.mp4'],{env:{...process.env,DYLD_LIBRARY_PATH:bin}});
console.log('SOLAR READY',out+'/solar-system.mp4');
