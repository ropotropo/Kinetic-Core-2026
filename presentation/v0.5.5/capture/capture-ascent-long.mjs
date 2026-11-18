import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {open,base,mode,click,still,capture,state,save,manifest} from './lib.mjs';
const {browser,page}=await open({width:1280,height:720});
try{
 const file=path.join(base,'source/checkpoint-prep/ascent-500m.json'),bytes=await fs.readFile(file),raw=JSON.parse(bytes);
 await page.evaluate(value=>localStorage.setItem('kinetic-core.integrated-mission.v1',JSON.stringify(value)),raw);await mode(page,'moon-mission');await click(page,'.mission-control [data-action="load-checkpoint"]');await page.clock.runFor(100);
 const mc=page.locator('.mission-control');if((await state(page)).mission.time!==raw.time)throw Error('Unexpected validated restore');
 await mc.locator('[data-power]').focus();await mc.locator('[data-power]').press('End');await click(page,'.mission-control [data-action="next"]');await page.clock.runFor(300);
 manifest.checkpointEntries??=[];manifest.checkpointEntries.push({name:'ascent-500m-long-take',file:'source/checkpoint-prep/ascent-500m.json',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),scope:'Exact unchanged solver-prepared physical checkpoint; normal UI Restore,100% ceiling and Resume. Not an uninterrupted browser playthrough.'});
 await capture(page,'ascent',7,async i=>{if(i===180)await still(page,'15-atmospheric-trail','Actual1× powered ascent, fixed Sun and persistent atmospheric plume in final7s source.');},'Final continuous7s take: exact-solver t11s entry restored,100% power and Resume selected normally. Actual1× physics, fuel and trail throughout.');
 const orbitBytes=await fs.readFile(path.join(base,'source/checkpoint-prep/lunar-orbit.json'));const orbit=JSON.parse(orbitBytes);await page.evaluate(value=>localStorage.setItem('kinetic-core.integrated-mission.v1',JSON.stringify(value)),orbit);await page.reload({waitUntil:'networkidle'});await page.clock.runFor(100);await mode(page,'moon-mission');await click(page,'.mission-control [data-action=\"load-checkpoint\"]');await mc.locator('[data-power]').focus();await mc.locator('[data-power]').press('End');await click(page,'.mission-control [data-action=\"next\"]');await page.clock.runFor(200);await still(page,'25-lunar-orbit-active','Actual lunar orbit resumed normally after validated solver-prepared checkpoint; no paused overlay.');
}catch(e){manifest.errors.push({section:'ascent-long',message:e.message});await save();console.error(e);process.exitCode=1;}finally{await browser.close();await save();}
