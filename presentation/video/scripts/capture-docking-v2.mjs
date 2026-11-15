import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.KC_PLAYWRIGHT_MODULE?pathToFileURL(process.env.KC_PLAYWRIGHT_MODULE).href:'playwright');
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root='Nick';
const out=root+'/Hakaton2026/presentation/video/remotion/public/footage-v2';
const scratch=root+'/work/kinetic-core-video-v2/root-capture/docking';
const bin=root+'/Hakaton2026/presentation/video/remotion/node_modules/@remotion/compositor-darwin-arm64';
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1600,height:900}});
const p=await context.newPage();await p.clock.install({time:new Date()});
await p.goto('http://127.0.0.1:5188/',{waitUntil:'networkidle',timeout:60000});await p.waitForTimeout(500);
const stamp=await p.evaluate(()=>Date.now());await p.clock.pauseAt(stamp+100);
await p.locator('#practice-button').click({force:true});await p.clock.runFor(200);
const before=await p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const clips=[];
async function capture(name,frames,actions){
 const dir=scratch+'/'+name;await fs.mkdir(dir,{recursive:true});
 for(let i=0;i<frames;i++){
  await actions(i);await p.clock.runFor(i%3===2?34:33);
  await p.screenshot({path:path.join(dir,`frame-${String(i).padStart(4,'0')}.jpg`),type:'jpeg',quality:90,animations:'allow'});
  if(i%60===0)console.log(name,i+'/'+frames);
 }
 execFileSync(bin+'/ffmpeg',['-v','error','-y','-framerate','30','-i',dir+'/frame-%04d.jpg','-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-an','-movflags','+faststart',out+'/'+name+'.mp4'],{env:{...process.env,DYLD_LIBRARY_PATH:bin}});
 clips.push({file:name+'.mp4',frames,fps:30,seconds:frames/30,after:await p.evaluate(()=>JSON.parse(window.render_game_to_text()))});
 console.log('READY',name);
}
await capture('root-docking-external',150,async i=>{
 if(i===0)await p.keyboard.down('w');
 if(i===30)await p.keyboard.down('a');
 if(i===50)await p.keyboard.up('a');
 if(i===80)await p.keyboard.up('w');
});
await p.locator('[data-docking-view="cockpit"]').click({force:true});await p.clock.runFor(200);
await capture('root-docking-cockpit',270,async i=>{
 if(i===0)await p.keyboard.down('w');
 if(i===90)await p.keyboard.up('w');
 if(i===120)await p.keyboard.down('Space');
 if(i===220)await p.keyboard.up('Space');
});
await p.keyboard.up('w');await p.keyboard.up('a');await p.keyboard.up('Space');
await fs.writeFile(out+'/docking-provenance-v2.json',JSON.stringify({url:'http://127.0.0.1:5188/',method:'Ordinary docking practice UI, keyboard RCS and cockpit view; browser clock stepped33/33/34ms; one rendered screenshot per1/30s; no state injection or physics edits',before,clips,outcomeClaim:'Separate terminal exercise; no soft-capture success is claimed'},null,2));
await context.close();await browser.close();console.log('DOCKING READY');
