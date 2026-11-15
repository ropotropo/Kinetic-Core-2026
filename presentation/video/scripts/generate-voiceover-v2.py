"""English narration via the public Edge TTS service. Install edge-tts==7.3.1."""
from pathlib import Path
import asyncio
import json
import os
import subprocess
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'remotion/public/audio-v2'
VOICE = 'en-US-ChristopherNeural'

async def main():
    OUT.mkdir(parents=True,exist_ok=True)
    text = (ROOT/'narration-v2-en.txt').read_text().strip()
    voice = edge_tts.Communicate(text, VOICE, rate='+2%', pitch='-2Hz', boundary='SentenceBoundary')
    boundaries = []
    with (OUT/'voiceover-en.mp3').open('wb') as f:
        async for chunk in voice.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])
            else:
                boundaries.append(chunk)
    metadata = {'provider':'Microsoft Edge online TTS via edge-tts 7.3.1','voice':VOICE,'rate':'+2%','pitch':'-2Hz','text':text,'boundaries':boundaries,'impersonation':False}
    (OUT/'voiceover-en.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print('Generated',OUT/'voiceover-en.mp3',flush=True)

asyncio.run(main())
