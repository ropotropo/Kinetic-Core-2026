"""Create original short narration using a standard, non-impersonating TTS voice."""
from pathlib import Path
import asyncio, json
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'video/public/audio/voice-clips'
async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    plan=json.loads((ROOT/'source/voice-beats.json').read_text())
    semaphore=asyncio.Semaphore(2)
    async def create(beat):
        async with semaphore:
            comm=edge_tts.Communicate(beat['text'],plan['voice'],rate=plan['rate'],pitch='-2Hz',boundary='SentenceBoundary')
            meta=[]
            with (OUT/(beat['id']+'.mp3')).open('wb') as stream:
                async for chunk in comm.stream():
                    if chunk['type']=='audio':stream.write(chunk['data'])
                    else:meta.append(chunk)
            (OUT/(beat['id']+'.json')).write_text(json.dumps({'text':beat['text'],'voice':plan['voice'],'rate':plan['rate'],'boundaries':meta,'genericPreset':True,'celebrityImitation':False},indent=2)+'\n')
            print('VOICE',beat['id'],flush=True)
    await asyncio.gather(*(create(beat) for beat in plan['beats']))
asyncio.run(main())
