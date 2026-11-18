import {open,click,mode,still,capture,dragStart,save,manifest} from './lib.mjs';
const {browser,page}=await open();
try{
 await click(page,'#home-button');await page.clock.runFor(300);await still(page,'01-missions-home','New real lit slow-rotating Moon, exact version and sole author.');
 await capture(page,'home',4,async()=>{},'Mission home with actual rotating Moon; decorative rotation is not an astronomical ephemeris.');
 await mode(page,'solar-system');await page.clock.runFor(500);await still(page,'02-solar-atlas','New Solar System body globe rail, survey-only gate visible.');
 const solar=page.locator('.solar-explorer');await solar.locator('[data-system]').selectOption('Earth',{force:true});await page.clock.runFor(200);await solar.locator('[data-world-name="Moon"]').click({force:true});await page.clock.runFor(200);await still(page,'03-world-moon','Moon globe rail and exact local-landing availability gate.');
 const drag=await dragStart(page,'.solar-explorer canvas');
 await capture(page,'worlds',7,async i=>{if(i<55)await page.mouse.move(drag.x+i*.8,drag.y+i*.12);if(i===55){await page.mouse.up();await solar.locator('[data-system]').selectOption('Jupiter',{force:true});}if(i===90)await solar.locator('[data-world-name="Europa"]').click({force:true});if(i===150)await still(page,'04-world-europa','Europa selection, local exercise gate and globe rail.');},'Actual Earth/Moon and Jupiter/Europa atlas selections. Schematic sizes/positions; landing button opens a separate local exercise.');
 await page.mouse.up();
}catch(e){manifest.errors.push({section:'UI',message:e.message});await save();console.error(e);process.exitCode=1;}finally{await browser.close();await save();}
