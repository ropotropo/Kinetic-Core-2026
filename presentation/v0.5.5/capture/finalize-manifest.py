from pathlib import Path
import json,hashlib,subprocess,os,urllib.parse
base=Path(__file__).resolve().parent.parent
repo=base.parent.parent
capture=base/'capture'
manifest=json.loads((capture/'manifest.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(capture/'attempt-history.json').write_text(json.dumps(manifest,indent=2))
for key in ['clips','stills']:
 selected={}
 for row in manifest[key]:selected[row['id']]=row
 manifest[key]=list(selected.values())
manifest['sources']=list({(row['url'],row['sha256']):row for row in manifest['sources']}.values())
for row in manifest['sources']:
 relative=urllib.parse.urlparse(row['url']).path.lstrip('/')
 row['matchedFrozenDist']=sha(repo/'dist'/relative)==row['sha256']
 assert row['matchedFrozenDist'],row
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==manifest['commit']
assert json.loads((repo/'package.json').read_text())['version']=='0.5.5'
subprocess.run(['git','diff','--exit-code',manifest['commit'],'--','src','public','package.json','package-lock.json','dist'],cwd=repo,check=True,capture_output=True)
manifest['sourceIntegrity']={'verifiedCommit':manifest['commit'],'gameTrackedChanges':False,'files':[]}
for rel in ['package.json','dist/index.html','src/physics.js','src/lunar-mission.js','src/ascent-guidance.js','src/mission-control.js','src/scene.js','src/celestial.js']:
 p=repo/rel;manifest['sourceIntegrity']['files'].append({'file':rel,'sha256':sha(p)})
for p in sorted((repo/'dist/assets').glob('index-*')):
 if p.suffix in ['.js','.css']:manifest['sourceIntegrity']['files'].append({'file':str(p.relative_to(repo)),'sha256':sha(p)})
bin=Path('/Users/andrkrupenko/Documents/ChatGPT/Nick/Hakaton2026/presentation/video/remotion/node_modules/@remotion/compositor-darwin-arm64');env={**os.environ,'DYLD_LIBRARY_PATH':str(bin)}
checks=[]
for row in manifest['clips']:
 p=base/row['file'];probe=json.loads(subprocess.check_output([str(bin/'ffprobe'),'-v','error','-show_entries','format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames','-of','json',str(p)],env=env));video=probe['streams'][0]
 assert video['r_frame_rate']=='30/1' and int(video['nb_frames'])==row['frames'],row['id']
 assert abs(float(probe['format']['duration'])-row['seconds'])<.001,row['id']
 row['sha256']=sha(p);row['bytes']=p.stat().st_size;checks.append({'id':row['id'],'file':row['file'],'sha256':row['sha256'],'probe':probe})
for row in manifest['stills']:
 p=base/row['file'];row['sha256']=sha(p);row['bytes']=p.stat().st_size
manifest['historicalAttemptErrors']=manifest.pop('errors',[])
manifest['selectedCaptureErrors']=[]
manifest['contactSourceMapping']={'file':'video/public/footage/moon-contact.mp4','lastDescentFrame':139,'firstContactFrame':140,'firstContactPTS':140/30,'confirmationVisibleByFrame':143,'confirmationPTS':143/30,'safeConfirmedRange':[5,9],'safeVisibleFlagRange':{'file':'video/public/footage/moon-flag.mp4','range':[5,10]}}
manifest['limitations']=['Solver-prepared staged entry points do not establish an uninterrupted human browser playthrough.','Docking is a separate terminal exercise; the atlas is schematic and outer-world gates open local rehearsals.','Decoded recorded-video cadence is not real-device GPU/thermal acceptance.','Surface geometry, fictional hardware and post-contact crew/flag are illustrative; no sampling or return gameplay is claimed.']
(capture/'manifest.json').write_text(json.dumps(manifest,indent=2))
(capture/'container-validation.json').write_text(json.dumps({'commit':manifest['commit'],'clips':checks,'stills':len(manifest['stills']),'all30fps':True,'gameSourceUnchanged':True},indent=2))
print('VERIFIED',len(checks),'clips;',len(manifest['stills']),'stills; source bundle',manifest['sources'][0]['sha256'])
