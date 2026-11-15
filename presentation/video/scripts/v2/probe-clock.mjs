import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.KC_PLAYWRIGHT_MODULE?pathToFileURL(process.env.KC_PLAYWRIGHT_MODULE).href:'playwright');
import fs from 'node:fs/promises';
const scratch='work/kinetic-core-video-v2/capture/probe';await fs.mkdir(scratch,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.KC_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--use-angle=swiftshader','--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});const page=await context.newPage();
await page.clock.install({time:new Date()});await page.goto('http://127.0.0.1:5188/',{waitUntil:'networkidle',timeout:60000});await page.waitForTimeout(500);
const stamp=await page.evaluate(()=>Date.now());await page.clock.pauseAt(stamp+100);
await page.locator('#practice-button').click({force:true});await page.clock.runFor(200);
await page.keyboard.down('w');
const before=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));const began=performance.now();
for(let i=0;i<60;i++){await page.clock.runFor(i%3===2?34:33);await page.screenshot({path:scratch+'/frame-'+String(i).padStart(4,'0')+'.jpg',type:'jpeg',quality:85,animations:'allow'});}
const after=await page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const result={method:'Controlled browser clock and ordinary RAF; no state injection, no physics edits, no advanceTime hook',frames:60,expectedSimulationAdvance:2,before,after,wallSeconds:(performance.now()-began)/1000};await fs.writeFile(scratch+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({frames:60,wallSeconds:result.wallSeconds,beforeTime:before.telemetry.time,afterTime:after.telemetry.time,beforeRange:before.telemetry.range,afterRange:after.telemetry.range}));
await context.close();await browser.close();
