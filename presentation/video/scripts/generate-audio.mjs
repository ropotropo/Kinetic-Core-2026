import fs from 'node:fs';
import path from 'node:path';
const seconds=88,sampleRate=48000,samples=seconds*sampleRate,data=Buffer.alloc(samples*2);
for(let i=0;i<samples;i++){const t=i/sampleRate,fade=Math.min(1,t/4,(seconds-t)/7),pulse=.5+.5*Math.sin(2*Math.PI*.11*t);const v=fade*(.028*Math.sin(2*Math.PI*55*t)+.012*Math.sin(2*Math.PI*82.4069*t)+.008*pulse*Math.sin(2*Math.PI*110*t));data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),i*2);}
const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(sampleRate,24);h.writeUInt32LE(sampleRate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);const out=path.resolve(import.meta.dirname,'../remotion/public/original-ambient.wav');fs.writeFileSync(out,Buffer.concat([h,data]));console.log(out);
