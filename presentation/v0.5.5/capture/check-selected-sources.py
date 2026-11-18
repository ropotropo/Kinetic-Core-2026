from pathlib import Path
import importlib.util,json,subprocess,os,hashlib
base=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('cadence_check',base/'capture/cadence-check.py');qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
rows=[]
for name,crop in [('ascent','900:300:180:140'),('stage-release','900:300:180:140'),('moon-descent','900:300:180:140'),('docking','1000:200:300:240'),('cockpit','1000:200:300:240')]:
 data=qa.analyze(base/f'video/public/footage/{name}.mp4',name,crop);summary=qa.summarize(data,0,float(data['metadata']['format']['duration']));rows.append({'name':name,'crop':crop,'sha256':data['sourceSha256'],'summary':summary});print(name,json.dumps(summary),flush=True)
(base/'capture/source-cadence-summary.json').write_text(json.dumps(rows,indent=2))
