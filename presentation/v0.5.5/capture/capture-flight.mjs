import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {open,base,mode,click,still,capture,state,save,manifest} from './lib.mjs';
const {browser,page}=await open({width:1280,height:720});
const mc=()=>page.locator('.mission-control');
async function load(name){
 const file=path.join(base,'source/checkpoint-prep',name+'.json'),bytes=await fs.readFile(file);const raw=JSON.parse(bytes);
 await page.evaluate(value=>localStorage.setItem('kinetic-core.integrated-mission.v1',JSON.stringify(value)),raw);
 await page.reload({waitUntil:'networkidle'});await page.clock.runFor(100);await mode(page,'moon-mission');await click(page,'.mission-control [data-action="load-checkpoint"]');await page.clock.runFor(100);
 const observed=await state(page);if(!observed.mission||observed.mission.phase!==raw.phase)throw Error('Checkpoint restore did not validate '+name);
 manifest.checkpointEntries??=[];manifest.checkpointEntries.push({name,file:path.relative(base,file),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),scope:'Continuously solver-prepared staging entry point from exact frozen game functions. Loaded using normal UI Restore and its validation. This is not evidence of an uninterrupted browser playthrough.',restoredMission:observed.mission});await save();console.log('RESTORED',name,raw.phase,raw.time);
 return raw;
}
async function power(){await mc().locator('[data-power]').focus();await mc().locator('[data-power]').press('End');}
async function resume(){await power();const next=mc().locator('[data-action="next"]');if(await next.isVisible()&&/Resume/.test(await next.innerText()))await next.click({force:true});else if(await mc().locator('[data-action="pause"]').getAttribute('aria-label')==='Resume')await mc().locator('[data-action="pause"]').click({force:true});await page.clock.runFor(100);}
try{
 await mode(page,'moon-mission');await click(page,'.mission-control [data-action="start"]');await page.clock.runFor(100);await still(page,'12-rollout-pad','Actual new integrated rollout, detailed pad hardware and transporter.');
 await capture(page,'rollout',4,async i=>{if(i===85)await still(page,'13-detailed-pad','Detailed pad during actual ground rollout.');},'Fresh integrated Moon mission. Actual presentation rollout carries the assembled spacecraft to the detailed pad; no flight progress timer is substituted for physics.');
 await load('ascent-500m');await resume();await page.clock.runFor(300);await still(page,'14-ascent-trail','New atmospheric ascent, real altitude/velocity/fuel and fixed scenario solar lighting.');
 await capture(page,'ascent',5,async i=>{if(i===120)await still(page,'15-atmospheric-trail','Actual thrust-driven atmospheric trail on v0.5.5.');},'Exact-solver-prepared launch entry restored and resumed through controls. Actual1× powered ascent, genuine propellant use and atmospheric trail; not proof of a full uninterrupted flight.');
 await load('core-depleted');await power();await still(page,'16-stage-depleted','Physically depleted booster, real manual release action and1× hold.');
 await capture(page,'stage-release',8,async i=>{if(i===0)await click(page,'.mission-control [data-action="next"]');if(i===50)await still(page,'17-manual-stage-release','Actual normal manual booster release; retained upper stage, new nose/aft camera beat.');},'Physical booster depletion entry from exact solver, validated normal UI Restore. Manual Separate booster click triggers real stageIndex0→1, mass/fuel/attachment changes and new separation camera event. No stage field or outcome is written.');
 await load('earth-moon-transfer');await power();await still(page,'18-lunar-transfer','Actual continuously computed transfer state in the frozen game; staged capture entry, not a full browser run.');
 await load('lunar-orbit');await power();await still(page,'19-lunar-orbit','Validated actual bound lunar orbit state; source-backed entry for staged media capture.');
 await load('moon-below-30m');await resume();await still(page,'20-lunar-descent','Integrated Moon expedition final descent with true remaining spacecraft/fuel and powered guidance.');
 await capture(page,'moon-descent',8,async i=>{if(i===105)await still(page,'21-descent-plume','Applied physical descent thrust and plume, real altitude/vertical/pad offset.');},'Integrated lunar expedition descent from exact-solver-prepared precontact checkpoint, validated by normal UI restore. Actual1× guidance and finite fuel during recording.');
 await load('moon-below-3m');await resume();
 await capture(page,'moon-contact',9,async i=>{const m=JSON.parse(await page.evaluate(()=>window.render_mission_to_text()));if(m.phase==='failed')throw Error('Actual contact failed: '+m.failure);if(m.phase==='landed'&&i===210)await still(page,'22-confirmed-contact','Actual freshly observed browser contact and measured impact; not the solver reference outcome.');},'Starts above the Moon surface. Actual new-build1× integration independently crosses physical contact during recording. No landed state or impact values injected.');
 const landed=(await state(page)).mission;if(landed.phase!=='landed')throw Error('No real contact observed by end of clip');manifest.actualBrowserContact={time:landed.time,impact:landed.impact,event:landed.event};await save();
 await still(page,'22-confirmed-contact','Actual freshly observed browser touchdown with contact speeds.');await mc().getByRole('button',{name:'Watch flag ceremony',exact:true}).click({force:true});
 await capture(page,'moon-flag',10,async i=>{if(i===285)await still(page,'23-kc-flag','Actual post-touchdown KC ceremony after independently observed browser contact.');},'Normal Watch flag ceremony button after actual physical touchdown; procedural crew/flag sequence, not deeper surface/science gameplay.');
}catch(e){manifest.errors.push({section:'flight',message:e.message});await save();console.error(e);process.exitCode=1;}finally{await browser.close();await save();}
