import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const moduleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function finalizeCurrent({root=moduleRoot,build=process.env.KC_BUILD_DIR||path.resolve(root,'../../work/kinetic-core-presentation-2026-11-15')}={}){
 const runtime=process.env.RUNTIME_NODE_MODULES;
if(!runtime)throw new Error('Set RUNTIME_NODE_MODULES to the presentation runtime node_modules directory.');
 process.env.RUNTIME_NODE_MODULES=runtime;
 const skill=process.env.KC_PRESENTATION_SKILL;
 if(!skill)throw new Error('Set KC_PRESENTATION_SKILL to the presentation skill directory.');
 const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');const validated=path.join(build,'validated',stamp);const receipts=path.join(build,'validation-receipts',stamp);await fs.mkdir(validated,{recursive:true});await fs.mkdir(receipts,{recursive:true});
 for(const cfg of [{name:'covers-16x9',count:2,size:'18288000,10287000'},{name:'poster-2x3',count:1,size:'20574000,30861000'},{name:'kinetic-core-presentation-draft',count:7,size:'18288000,10287000',nativeTable:6}]){
  const tables=cfg.nativeTable?[cfg.nativeTable]:[];
  const result=await finalizePresentation({workspaceDir:path.resolve(root,'../..'),candidatePath:path.join(build,cfg.name+'-candidate.pptx'),finalPath:path.join(validated,cfg.name+'.pptx'),pythonExecutable:process.env.RUNTIME_PYTHON||'python3',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),explicitTotalSlideCount:cfg.count,requiredNativeTableOwnerSlides:tables,layoutArgs:['--expected-slide-size-emu',cfg.size,'--validate-heading-fit',...tables.flatMap(n=>['--require-native-table-slide',String(n)])],fontPolicy:{basis:'design',families:['Helvetica Neue']},verifyArtifactToolImport:true,receiptPath:path.join(receipts,cfg.name+'.validation.json')});
  const dest=path.join(root,cfg.name+'.pptx');try{await fs.copyFile(dest,path.join(validated,cfg.name+'-previous.pptx'))}catch(e){if(e.code!=='ENOENT')throw e}await fs.copyFile(result.finalPath,dest);console.log(JSON.stringify({file:dest,slides:cfg.count,structure:result.packageIntegrity.status,layoutFindings:result.presentationLayout.findingCount,importPassed:result.firstPartyImport.passed}));
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await finalizeCurrent();
