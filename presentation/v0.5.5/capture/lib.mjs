import {chromium} from '/Users/andrkrupenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
export const repo=path.resolve(import.meta.dirname,'../../..');
export const base=path.resolve(import.meta.dirname,'..');
export const scratch='/Users/andrkrupenko/Documents/ChatGPT/Nick/work/kinetic-core-v055-media/capture';
export const footage=path.join(base,'video/public/footage'),screens=path.join(base,'assets/screens');
const bin='/Users/andrkrupenko/Documents/ChatGPT/Nick/Hakaton2026/presentation/video/remotion/node_modules/@remotion/compositor-darwin-arm64';
export const manifest={version:'0.5.5',commit:'559a56eab08abfaca62001704c188be71e9f6dab',url:'http://127.0.0.1:5195/',dateUTC:new Date().toISOString(),fps:30,method:'One screenshot for each controlled browser-clock output frame; ordinary game RAF and unchanged fixed-step solver. No fabricated telemetry, state setters or injected outcomes.',sources:[],clips:[],stills:[],actions:[],errors:[]};
try { const prior=JSON.parse(await fs.readFile(path.join(base,'capture/manifest.json'),'utf8')); if(prior.commit===manifest.commit){for(const key of ['sources','clips','stills','actions','errors'])manifest[key]=prior[key]??[];} } catch {}
export async function save(){await fs.writeFile(path.join(base,'capture/manifest.json'),JSON.stringify(manifest,null,2));}
export async function open(viewport={width:1600,height:900}){
 await fs.mkdir(footage,{recursive:true});await fs.mkdir(screens,{recursive:true});await fs.mkdir(scratch,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'/Users/andrkrupenko/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(10000);await page.clock.install({time:new Date()});
 page.on('pageerror',e=>{manifest.errors.push({type:'pageerror',message:e.message});});
 await page.goto(manifest.url,{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);
 const scripts=await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean));
 for(const url of scripts){const bytes=Buffer.from(await(await fetch(url)).arrayBuffer());manifest.sources.push({url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
 if(!scripts.some(s=>s.endsWith('index-B-KR9n_I.js')))throw Error('Unexpected source bundle '+scripts.join(','));
 const n=await page.evaluate(()=>Date.now());await page.clock.pauseAt(n+100);await page.clock.runFor(100);await save();return {browser,context,page};
}
export async function state(page){return page.evaluate(()=>({legacy:JSON.parse(window.render_game_to_text()),mission:JSON.parse(window.render_mission_to_text()),visible:document.querySelector('dialog[open]')?.className??document.querySelector('.solar-explorer:not([hidden])')?.className??'game',version:document.querySelector('.app-footer')?.innerText}));}
export async function click(page,selector){await page.locator(selector).click({force:true});manifest.actions.push({atUTC:new Date().toISOString(),click:selector});}
export async function mode(page,id){if(!await page.locator('.mode-hub-dialog[open]').count()){const home=page.locator('#home-button');if(await home.isVisible())await home.click({force:true});else await page.locator('.mode-hub-trigger:visible').first().click({force:true});}await click(page,`[data-mode="${id}"]:visible`);await page.clock.runFor(100);}
export async function still(page,id,purpose){await page.screenshot({path:path.join(screens,id+'.png'),timeout:20000});manifest.stills.push({id,file:'assets/screens/'+id+'.png',purpose,viewport:page.viewportSize(),state:await state(page)});await save();console.log('STILL',id);}
export async function capture(page,id,seconds,onFrame=async()=>{},detail=''){
 const dir=path.join(scratch,id);await fs.mkdir(dir,{recursive:true});const before=await state(page),frames=Math.round(seconds*30);
 for(let i=0;i<frames;i++){await onFrame(i);await page.clock.runFor(i%3===2?34:33);await page.screenshot({path:path.join(dir,'frame-'+String(i).padStart(5,'0')+'.jpg'),type:'jpeg',quality:92,timeout:20000,animations:'allow',caret:'hide'});if(i%60===0)console.log('FRAME',id,i,frames);}
 const after=await state(page),output=path.join(footage,id+'.mp4');const r=spawnSync(path.join(bin,'ffmpeg'),['-hide_banner','-v','error','-y','-framerate','30','-i',path.join(dir,'frame-%05d.jpg'),'-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-r','30','-an','-movflags','+faststart',output],{env:{...process.env,DYLD_LIBRARY_PATH:bin},encoding:'utf8'});if(r.status)throw Error(r.stderr);
 manifest.clips.push({id,file:'video/public/footage/'+id+'.mp4',frames,fps:30,seconds,viewport:page.viewportSize(),detail,before,after});await save();console.log('READY',id,seconds);return output;
}
export async function dragStart(page,selector){const b=await page.locator(selector).boundingBox();if(!b)throw Error('Missing canvas');const p={x:b.x+b.width*.52,y:b.y+b.height*.52};await page.mouse.move(p.x,p.y);await page.mouse.down();return p;}
