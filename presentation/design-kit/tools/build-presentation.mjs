import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.RUNTIME_NODE_MODULES;
if(!runtime)throw new Error('Set RUNTIME_NODE_MODULES to the presentation runtime node_modules directory.');
const {Presentation,PresentationFile}=await import(pathToFileURL(path.join(runtime,'@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const build=process.env.KC_BUILD_DIR||path.resolve(root,'../../work/kinetic-core-presentation-2026-11-15');
await fs.mkdir(build,{recursive:true});await fs.mkdir(path.join(root,'deck-previews'),{recursive:true});
const data=JSON.parse(await fs.readFile(path.join(root,'presentation-content.json'),'utf8'));
await fs.writeFile(path.join(root,'presentation-content.js'),'window.KC_PROJECT = '+JSON.stringify(data)+';\n');
const font='Helvetica Neue';
const noLine={fill:'none',width:0};
function text(s,name,content,x,y,w,h,size=32,bold=false,color='#f5f5f7',wrap='square'){
 const a=s.shapes.add({name,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:noLine});a.text=content;a.text.style={fontSize:size,typeface:font,bold,color,insets:0,verticalAlignment:'top',wrap,autoFit:'none'};return a;
}
async function image(s,relative,x,y,w,h,fit='contain',alt=''){
 const f=path.resolve(root,relative);if(!f.startsWith(root+path.sep))throw Error('Image path escapes design kit.');const bytes=await fs.readFile(f);const ext=path.extname(f).toLowerCase();
 s.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg',fit,alt,position:{left:x,top:y,width:w,height:h}});
}
function page(s,i){text(s,'Project footer','Kinetic Core',96,994,900,32,22,false,'#a1a1a8');text(s,'Page number',`${i} / 7`,1700,994,124,32,22,false,'#a1a1a8')}
async function shot(s,id,x,y,w,h){const slot=data.screenshots.find(x=>x.id===id);if(!slot||slot.status==='missing'){s.shapes.add({name:'Missing screenshot field',geometry:'rect',position:{left:x,top:y,width:w,height:h},fill:'#0a0a0b',line:{fill:'#303034',width:1}});text(s,'Missing screenshot',slot?.label||id,x+32,y+h/2-35,w-64,90,28,false,'#a1a1a8');return}await image(s,slot.preferredFile,x,y,w,h,'contain',slot.alt||slot.label)}
function referenceText(ids){const slots=ids.map(id=>data.screenshots.find(s=>s.id===id));return slots.map(s=>(s?.status==='final'?'Final capture':'Reference capture')+(s?.provenance?.build?', '+s.provenance.build:s?.status==='reference'?' from v0.4':'')+(s?.provenance?.commit?' ('+s.provenance.commit.slice(0,7)+')':'')).join('; ')}
async function cover(p,variant,portrait=false){const s=p.slides.add();s.background.fill='#000000';const w=portrait?2160:1920,h=portrait?3240:1080,m=portrait?108:96;await image(s,`assets/mykyta-anamorphic-${variant}-v5.png`,0,0,w,h,'cover','Fresh anamorphic lunar portrait of Mykyta Borisov with Kinetic Core mission patch');s.shapes.add({name:'Subtle lower contrast',geometry:'rect',position:{left:0,top:h*.82,width:w,height:h*.18},fill:{type:'gradient',gradientKind:'linear',angleDeg:90,stops:[{offset:0,color:{type:'rgb',value:'#000000',transform:{opacity:0}}},{offset:100000,color:{type:'rgb',value:'#000000',transform:{opacity:.65}}}]},line:noLine});const sz=portrait?162:144,top=portrait?226:320; text(s,'Event','NASA Space Apps Challenge 2026',m,m,1700,64,portrait?31.5:28,true);text(s,'Project title line 1','Kinetic',m,top,portrait?877.5:780,sz*1.2,sz,true);text(s,'Project title line 2','Core',m,top+sz*.94,portrait?877.5:780,sz*1.2,sz,true);const cy=top+sz*1.88+46;text(s,'Challenge','Space Mission Design Game',m,cy,1700,64,portrait?36:32);const credit=text(s,'Sole author','Created by Mykyta Borisov',m,cy+(portrait?86:99),1700,64,portrait?31.5:28);credit.text.get('Mykyta Borisov').bold=true;s.speakerNotes.text='Sole author: Mykyta Borisov. Fresh fictional AI-generated cover using original identity portrait and Kinetic Core logo only, built-in image_gen, 15 November 2026. No prior scene used. Anamorphic cinema aesthetic, optical LED streaks and film grain. No visible provenance caption per user request. Event: https://www.spaceappschallenge.org/2026/ .';return s}
async function writePreview(p,s,relative,scale=1){const blob=await p.export({slide:s,format:'png',scale});await fs.writeFile(path.join(root,relative),new Uint8Array(await blob.arrayBuffer()))}
const covers=Presentation.create({slideSize:{width:1920,height:1080}});
for(const v of ['shadowline','sunlit']){const s=await cover(covers,v);await writePreview(covers,s,`covers/cover-${v}-3840x2160.png`,2);const b=await covers.export({slide:s,format:'png',scale:.5});await fs.writeFile(path.join(build,v+'-preview.png'),new Uint8Array(await b.arrayBuffer()))}
await (await PresentationFile.exportPptx(covers)).save(path.join(build,'covers-16x9-candidate.pptx'));
const poster=Presentation.create({slideSize:{width:2160,height:3240}});const ps=await cover(poster,'portrait',true);await writePreview(poster,ps,'covers/cover-portrait-2160x3240.png');await (await PresentationFile.exportPptx(poster)).save(path.join(build,'poster-2x3-candidate.pptx'));
const deck=Presentation.create({slideSize:{width:1920,height:1080}});
for(const [i,content] of data.slides.entries()){
 let s;if(content.id==='cover'){s=await cover(deck,data.selectedCover||'shadowline')}else{s=deck.slides.add();s.background.fill='#000000';text(s,'Slide topic',content.title,96,96,1728,100,content.id==='closing'?96:64,true);text(s,'Lead',content.lead,96,content.id==='closing'?240:200,content.id==='closing'?600:1728,92,36,false,'#a1a1a8');
 if(['concept','docking'].includes(content.id)){for(let k=0;k<content.body.length;k++)text(s,'Feature '+k,content.body[k],96,310+k*174,570,150,32);await shot(s,content.shots[0],752,300,1072,602);text(s,'Capture provenance',referenceText(content.shots),96,944,1728,40,22,false,'#a1a1a8')}
 if(content.id==='builder'){await shot(s,'builder',96,278,1728,536);content.body.forEach((t,k)=>text(s,'Feature '+k,t,96+k*592,846,544,108,26,false,'#c2c2c9'))}
 if(content.id==='mission'){await shot(s,'earth-orbit',96,286,832,480);await shot(s,'moon-touchdown',992,286,832,480);text(s,'Earth view','Earth orbit',96,790,832,40,26);text(s,'Moon view','Moon touchdown',992,790,832,40,26);text(s,'Earth provenance',referenceText(['earth-orbit']),96,831,832,35,22,false,'#a1a1a8');text(s,'Moon provenance',referenceText(['moon-touchdown']),992,831,832,35,22,false,'#a1a1a8');content.body.forEach((t,k)=>text(s,'Mission point '+k,t,96+k*592,870,544,100,24,false,'#c2c2c9'))}
 if(content.id==='physics'){
  const values=[['Model','Implementation','Defined numerical check'],...data.physicsRows.map(r=>[r.topic,r.model,r.check])];const table=s.tables.add({rows:values.length,columns:3,left:96,top:294,width:1728,height:500,columnWidths:[270,560,898],values});table.styleOptions={headerRow:true,bandedRows:false};table.borders.assign({fill:'#303034',width:1});
  for(let row=0;row<values.length;row++){table.rows[row].height=row===0?60:110;for(let col=0;col<3;col++){const cell=table.getCell(row,col);cell.fill='#000000';cell.text.style={typeface:font,fontSize:row===0?23:25,bold:row===0,color:row===0?'#a1a1a8':'#f5f5f7',insets:{left:14,right:14,top:12,bottom:12},wrap:'square',autoFit:'none'};}}
  text(s,'Validation scope',content.body.join(' '),96,850,1728,118,23,false,'#a1a1a8');
 }
 if(content.id==='closing'){for(let k=0;k<content.body.length;k++)text(s,'Closing point '+k,content.body[k],96,370+k*142,620,126,28);await shot(s,'europa',800,295,1024,554);const dl=text(s,'Demo link',data.links.demo?'Open final demo':'Final demo link pending',96,858,700,50,25,false,'#9bcaff');if(data.links.demo)dl.text.get('Open final demo').link={uri:data.links.demo,isExternal:true};const rl=text(s,'Repository link','Source repository',96,920,700,40,25,false,'#9bcaff');if(data.links.repository)rl.text.get('Source repository').link={uri:data.links.repository,isExternal:true};text(s,'Rehearsal scope','Europa local rehearsal, separate from the Moon transfer.',800,882,1024,66,24,false,'#a1a1a8')}
 page(s,i+1);
 }
 s.speakerNotes.text=content.notes+'\n\nEvidence IDs: '+content.evidenceIds.join(', ')+'.\nRecorded source snapshot: '+data.release.commit+' with uncommitted changes; final build freeze pending. Source evidence: math-evidence.json. NASA rocket equation: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/ . NASA Isp: https://www.grc.nasa.gov/www/BGH/specimp.html . JPL parameters: https://ssd.jpl.nasa.gov/astro_par.html .';
 await writePreview(deck,s,`deck-previews/slide-${i+1}.png`,.5);await fs.writeFile(path.join(build,`slide-${i+1}.layout.json`),await (await s.export({format:'layout'})).text());
}
await (await PresentationFile.exportPptx(deck)).save(path.join(build,'kinetic-core-presentation-draft-candidate.pptx'));
console.log('Rendered 3 current cover PNGs, 7 deck previews and 3 editable draft packages.');

const {finalizeCurrent}=await import('./finalize-presentation.mjs');await finalizeCurrent({root,build});
