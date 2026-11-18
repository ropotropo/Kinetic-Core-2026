import './mode-hub.css';
import { version as GAME_VERSION } from '../package.json';
import { KC_MARKUP } from './brand.js';
import { icon } from './ui-icons.js';
import { createHomeMoon } from './home-moon.js';
import { MILESTONES, readProgress, saveMilestone, readLandingCounts, createLandingRecorder, LANDING_COUNTS_KEY } from './player-progress.js';
const PREVIEW='assets/kc-moon-preview.jpg';
const MODES=Object.freeze([
  {id:'moon-mission',name:'Moon expedition',note:'Earth launch to lunar touchdown',symbol:'moon',group:'mission'},
  {id:'workshop',name:'Rocket workshop',note:'Build and tune your spacecraft',symbol:'wrench',group:'mission'},
  {id:'manual-docking',name:'Docking',note:'Align, approach and capture the port',symbol:'dock',group:'practice'},
  {id:'surface-landing',name:'Surface landing',note:'Choose a world. Bring the lander down.',symbol:'land',group:'practice'},
  {id:'earth-launch',name:'Earth launch',note:'Lift off, stage and reach orbit',symbol:'rocket',group:'practice'},
  {id:'solar-system',name:'Solar System atlas',note:'Explore planets and moons',symbol:'orbit',group:'explore'},
  {id:'online-earth',name:'Earth free flight',note:'Fly over real terrain · internet required',symbol:'globe',group:'explore'}
]);
let activeHub=null;
function guardKeys(event){
  if(!activeHub?.isOpen())return;
  if(event.type==='keydown')activeHub.keyboard?.();
  event.stopImmediatePropagation();
  if(event.type==='keydown'&&event.code==='Escape'){event.preventDefault();if(!event.repeat)activeHub.close();}
  else if(event.type==='keydown'&&['ArrowDown','ArrowUp','Home','End'].includes(event.code)){event.preventDefault();activeHub.moveFocus(event.code);}
}
for(const event of ['keydown','keyup','keypress'])window.addEventListener(event,guardKeys,{capture:true});
export function installModeHub({onOpen=()=>{},onClose=()=>{},onSelect=()=>{},initialMode='earth-launch'}={}){
  if(![onOpen,onClose,onSelect].every(fn=>typeof fn==='function'))throw new TypeError('Mode hub callbacks must be functions.');
  const dialog=document.createElement('dialog');dialog.className='mode-hub-dialog';dialog.setAttribute('aria-labelledby','mode-hub-title');
  dialog.innerHTML=`<header class="mh-header"><div class="mh-brand"><span>${KC_MARKUP}</span><strong>Kinetic Core</strong><small class="mh-build" aria-label="Version ${GAME_VERSION}">v${GAME_VERSION}</small></div><button type="button" class="kc-tool mh-close" aria-label="Return to game">${icon('close')}</button></header><div class="mh-scroll"><section class="mh-expedition"><div class="mh-moon" aria-hidden="true"><img class="mh-moon-fallback" src="${PREVIEW}" alt="" width="800" height="720"><canvas class="mh-moon-canvas" aria-hidden="true"></canvas></div><div class="mh-expedition-copy"><p class="mh-section-label">Your next mission</p><h1 id="mode-hub-title">Make it<br>to the Moon.</h1><p class="mh-description">Your spacecraft. Every critical moment.</p><ol class="mh-route" aria-label="Moon expedition route"><li>Launch</li><li>Transfer</li><li>Orbit</li><li>Land</li></ol><div class="mh-primary-actions"><button type="button" class="kc-action kc-action-primary" data-mode="moon-mission">Prepare expedition ${icon('chevron-right')}</button><button type="button" class="kc-action" data-mode="workshop">${icon('wrench')} Build a spacecraft</button></div></div></section><section class="mh-practice"><div class="mh-section-heading"><h2>Practice a maneuver</h2><p>Separate exercises. Start close to the action.</p></div><div class="mh-practice-list"></div></section><section class="mh-explore"><h2>Explore</h2><div class="mh-explore-list"></div></section><section class="mh-flight-log"><h2>Your flight log</h2><ul aria-label="Completed flight milestones"></ul><p>Milestones are saved on this device.</p></section></div><footer class="mh-footer"><span>Created by Mykyta Borisov</span><button type="button" class="mh-guide">How to play</button><button class="mh-return" type="button">Return to view ${icon('back')}</button></footer>`;
  document.body.append(dialog);
  const homeMoon=createHomeMoon(dialog.querySelector('.mh-moon'));
  const abort=new AbortController(),triggers=new Set(),wrappers=new Set();
  const listen=(node,event,fn,opts={})=>node.addEventListener(event,fn,{...opts,signal:abort.signal});
  let current=initialMode,openNow=false,destroyed=false,previousFocus;
  const practice=dialog.querySelector('.mh-practice-list'),explore=dialog.querySelector('.mh-explore-list');
  for(const mode of MODES.filter(mode=>['practice','explore'].includes(mode.group))){
    const b=document.createElement('button');b.type='button';b.dataset.mode=mode.id;b.className='mh-mode';
    b.innerHTML=`<span class="mh-mode-symbol">${icon(mode.symbol)}</span><span class="mh-mode-copy"><strong>${mode.name}</strong><small>${mode.note}</small></span>${icon('chevron-right')}`;
    (mode.group==='practice'?practice:explore).append(b);
  }
  for(const b of dialog.querySelectorAll('[data-mode]'))listen(b,'click',()=>{const next=b.dataset.mode;close();setCurrent(next);onSelect(next);});
  function renderProgress(){
    const progress=readProgress();const list=dialog.querySelector('.mh-flight-log ul');list.replaceChildren();
    for(const [id,label]of Object.entries(MILESTONES)){const li=document.createElement('li');li.className=progress[id]?'is-complete':'';li.setAttribute('aria-label',`${progress[id]?'Completed':'Not yet completed'}: ${label}`);li.innerHTML=`<span>${progress[id]?icon('check'):'<span class="mh-pending"></span>'}</span><span>${label}</span>`;list.append(li);}
    const counts=readLandingCounts(),total=Object.values(counts).reduce((sum,count)=>sum+BigInt(count),0n);
    dialog.querySelector('.mh-flight-log>p').textContent=total>0n?`${total.toLocaleString('en-US')} confirmed landing${total===1n?'':'s'} · Milestones are saved on this device.`:'Milestones are saved on this device.';
  }
  const recordConfirmedLanding=createLandingRecorder();
  listen(document,'kc:milestone',event=>{
    const saved=saveMilestone(event.detail?.id),world=recordConfirmedLanding(event.detail);
    if(saved||world)renderProgress();
    if(world)document.dispatchEvent(new CustomEvent('kc:landing-progress',{detail:{world,count:readLandingCounts()[world]}}));
  });
  listen(document,'kc:landing-progress',renderProgress);
  listen(window,'storage',event=>{if(event.key===null||event.key===LANDING_COUNTS_KEY||event.key==='kinetic-core.player-milestones.v1')renderProgress();});
  function setCurrent(mode){
    current=MODES.some(item=>item.id===mode)?mode:null;
    for(const button of dialog.querySelectorAll('[data-mode]')){const selected=button.dataset.mode===current;button.classList.toggle('is-current',selected);if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');}
    for(const trigger of triggers)trigger.title=current?`Missions · ${MODES.find(mode=>mode.id===current).name}`:'Choose mission or practice';
  }
  function moveFocus(key){const buttons=[...dialog.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);const next=key==='Home'?0:key==='End'?buttons.length-1:key==='ArrowDown'?(index+1)%buttons.length:(index-1+buttons.length)%buttons.length;buttons[next]?.focus();}
  const controller={isOpen:()=>openNow,close,moveFocus,keyboard(){dialog.dataset.focusOrigin='keyboard';}};
  function open(){if(destroyed||openNow)return;previousFocus=document.activeElement;dialog.dataset.focusOrigin=previousFocus?.matches?.(':focus-visible')?'keyboard':'pointer';onOpen();dialog.showModal();openNow=true;homeMoon.setOpen(true);activeHub=controller;renderProgress();setCurrent(current);dialog.querySelector('[data-mode="moon-mission"]').focus({preventScroll:true});}
  function close(){if(!openNow)return;openNow=false;homeMoon.setOpen(false);if(activeHub===controller)activeHub=null;dialog.close();try{onClose();}finally{if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}}
  function addTrigger(host){if(host.querySelector(':scope>.mode-hub-trigger'))return;const trigger=document.createElement('button');trigger.type='button';trigger.className='mode-hub-trigger';trigger.innerHTML=`${icon('missions')}<span>Missions</span>`;trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-label','Choose mission or practice');listen(trigger,'click',open);host.prepend(trigger);triggers.add(trigger);}
  function mountTriggers(){
    for(const host of document.querySelectorAll('.app-header .header-actions,.mc-header nav,.rw-header-actions'))addTrigger(host);
    for(const header of document.querySelectorAll('.solar-explorer>header,.earth-online>header,.rollout-header')){
      let host=header.querySelector(':scope>.mode-hub-header-actions');if(!host){host=document.createElement('div');host.className='mode-hub-header-actions';for(const button of [...header.children].filter(node=>node.tagName==='BUTTON'))host.append(button);header.append(host);wrappers.add(host);}addTrigger(host);
    }
  }
  listen(dialog,'pointerdown',()=>{dialog.dataset.focusOrigin='pointer';});
  listen(dialog.querySelector('.mh-guide'),'click',()=>{close();document.getElementById('guide-button')?.click();});
  listen(dialog.querySelector('.mh-close'),'click',close);listen(dialog.querySelector('.mh-return'),'click',close);
  listen(dialog,'cancel',event=>{event.preventDefault();close();});listen(dialog,'close',()=>{if(openNow)close();});
  listen(document,'kc:show-home',open);
  listen(document,'kc:open-mode',event=>{const id=event.detail?.id;if(!MODES.some(mode=>mode.id===id))return;close();setCurrent(id);onSelect(id);});
  const observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('header,dialog,section')||node.querySelector('header')))))mountTriggers();});mountTriggers();observer.observe(document.body,{childList:true,subtree:true});
  setCurrent(current);queueMicrotask(open);
  return{open,close,setCurrent,isOpen:()=>openNow,destroy(){close();destroyed=true;homeMoon.dispose();observer.disconnect();abort.abort();for(const trigger of triggers)trigger.remove();for(const wrapper of wrappers){while(wrapper.firstChild)wrapper.parentNode?.insertBefore(wrapper.firstChild,wrapper);wrapper.remove();}dialog.remove();}};
}
