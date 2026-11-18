import {open,mode,click,still,capture,dragStart,save,manifest} from './lib.mjs';
const {browser,page}=await open();
try{
 await mode(page,'manual-docking');await page.clock.runFor(500);await still(page,'10-docking-external','Separate terminal docking practice, real relative-state telemetry and powered attitude hold.');
 const p=await dragStart(page,'#flight-canvas');
 await capture(page,'docking',4,async i=>{if(i<50)await page.mouse.move(p.x+i*1.2,p.y+i*.12);if(i===50){await page.mouse.up();await page.keyboard.down('w');await page.keyboard.down('a');}if(i===100)await page.keyboard.up('a');},'Separate terminal docking practice; ordinary camera orbit and manual body-axis RCS translation. No capture outcome claimed.');
 await page.mouse.up();await click(page,'[data-docking-view="cockpit"]');await page.clock.runFor(300);await page.locator('#flight-canvas').focus();await page.keyboard.down('w');await still(page,'11-docking-cockpit','Actual craft-attitude-mounted cockpit; real range/closing/lateral instruments, illustrative interior.');
 await capture(page,'cockpit',5,async i=>{if(i===60)await page.keyboard.up('w');if(i===80)await page.keyboard.down('Space');if(i===125)await page.keyboard.up('Space');},'Mounted cockpit during real manual RCS approach and Space braking; finite propellant and attitude-hold use. No terminal capture is fabricated.');
 await page.keyboard.up('w');await page.keyboard.up('a');await page.keyboard.up('Space');
}catch(e){manifest.errors.push({section:'docking',message:e.message});await save();console.error(e);process.exitCode=1;}finally{await browser.close();await save();}
