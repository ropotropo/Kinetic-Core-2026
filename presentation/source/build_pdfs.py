"""Build the two final presentation PDFs. Requires reportlab and Pillow."""
from pathlib import Path
import json, os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
W,H=1280,720
fontdir=Path('/System/Library/Fonts/Supplemental')
regular=os.environ.get('KC_FONT_REGULAR',str(fontdir/'Arial.ttf'))
bold=os.environ.get('KC_FONT_BOLD',str(fontdir/'Arial Bold.ttf'))
pdfmetrics.registerFont(TTFont('KC',regular));pdfmetrics.registerFont(TTFont('KC-Bold',bold))
data=json.loads((ROOT/'source/content.json').read_text())
assets=json.loads((ROOT/'source/assets.json').read_text())

def lines(s,size,width,font='KC'):
    out=[];line=''
    for word in s.split():
        candidate=(line+' '+word).strip()
        if line and pdfmetrics.stringWidth(candidate,font,size)>width:out.append(line);line=word
        else:line=candidate
    if line:out.append(line)
    return out
def txt(c,s,x,y,size=22,width=1152,bold=False,color='#f5f5f7',leading=None):
    font='KC-Bold' if bold else 'KC';c.setFont(font,size);c.setFillColor(HexColor(color));leading=leading or size*1.25
    for row in lines(s,size,width,font):c.drawString(x,H-y-size,row);y+=leading
    return y
def pic(c,key,x,y,w,h,cover=False):
    p=ROOT/'assets'/assets[key];iw,ih=Image.open(p).size
    scale=max(w/iw,h/ih) if cover else min(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale
    c.saveState();clip=c.beginPath();clip.rect(x,H-y-h,w,h);c.clipPath(clip,stroke=0,fill=0)
    c.drawImage(ImageReader(str(p)),x+(w-dw)/2,H-y-h+(h-dh)/2,dw,dh,mask='auto');c.restoreState()
def footer(c,i,total):
    txt(c,'Kinetic Core',64,682,10,color='#a1a1a8');txt(c,f'{i} / {total}',1170,682,10,width=60,color='#a1a1a8')
def head(c,s):
    end=txt(c,s['title'],64,46,40,bold=True,leading=45)
    txt(c,s['lead'],64,max(108,end+10),23,color='#a1a1a8')
def points(c,items,x,y,width=430,size=23,gap=24):
    for s in items:y=txt(c,s,x,y,size,width=width)+gap

for lang in ['en','uk']:
    output=ROOT/('Kinetic-Core-EN.pdf' if lang=='en' else 'Kinetic-Core-UA.pdf')
    c=canvas.Canvas(str(output),pagesize=(W,H),pageCompression=1)
    c.setTitle('Kinetic Core - NASA Space Apps Challenge 2026'+(' - Ukrainian' if lang=='uk' else ' - English'))
    c.setAuthor('Mykyta Borisov');c.setSubject('Fourteen-slide, 280-second project presentation. Seven complete-screen game captures and documented educational physics model.')
    slides=data[lang]
    sequence=data['sequence']
    for slide_number,entry in enumerate(sequence,1):
        i=entry['infoIndex'];s=slides[i-1]
        c.setFillColor(HexColor('#000000'));c.rect(0,0,W,H,fill=1,stroke=0)
        if entry.get('imageKey'):
            pic(c,entry['imageKey'],0,0,W,H)
            c.showPage();continue
        if i==1:
            pic(c,'hero',0,0,W,H,True)
            txt(c,'NASA Space Apps Challenge 2026',64,64,18,bold=True)
            txt(c,'Kinetic',64,218,86,bold=True);txt(c,'Core',64,303,86,bold=True)
            txt(c,s['points'][0],64,429,24,width=540)
            txt(c,s['points'][1],64,518,20,bold=True,width=520)
        elif i==2:
            head(c,s);points(c,s['points'],64,248,350,26,38);pic(c,'planner',450,192,766,430)
        elif i==3:
            head(c,s);pic(c,'builder',64,174,1152,420)
            for j,t in enumerate(s['points']):txt(c,t,64+j*392,614,19,width=360)
        elif i==4:
            head(c,s);pic(c,'rollout',64,206,552,360);pic(c,'approach',664,206,552,360)
            for j,t in enumerate(s['points']):txt(c,t,64+j*392,601,19,width=360)
        elif i==5:
            head(c,s);pic(c,'success',64,202,732,420);pic(c,'docking',836,212,380,370)
            txt(c,s['points'][0],64,627,18,width=730)
            txt(c,s['points'][1],836,602,18,width=380)
            txt(c,s['points'][2],836,638,13,width=380,color='#a1a1a8')
        elif i==6:
            head(c,s)
            labels=['Gravity','Propellant flow','Ideal delta-v'] if lang=='en' else ['Гравітація','Витрата пального','Ідеальна дельта-v']
            equations=['a = -μr / |r|³','ṁ = T / (Isp × g0)','Δv = Isp × g0 × ln(m0/mf)']
            for j in range(3):
                y=208+j*133
                txt(c,labels[j],64,y,17,color='#a1a1a8');txt(c,equations[j],64,y+29,31,width=650,bold=True)
            points(c,s['points'],792,219,424,23,30)
            limit='Educational model: 2D patched-conic lunar flight; docking is a separate local 3D exercise.' if lang=='en' else 'Навчальна модель: місячний політ у 2D за методом спряжених конік; стикування є окремою локальною 3D-вправою.'
            txt(c,limit,64,627,14,width=1152,color='#a1a1a8')
        elif i==7:
            pic(c,'logo',760,124,414,414)
            txt(c,'Thank you' if lang=='en' else 'Дякую за увагу',64,195,62,width=690,bold=True)
            txt(c,'Kinetic Core',64,304,38,bold=True)
            txt(c,s['points'][0],64,375,23,width=680,color='#a1a1a8')
        footer(c,slide_number,len(sequence));c.showPage()
    c.save();print(output)
    notes=[]
    for i,entry in enumerate(sequence,1):
        s=entry['notes'][lang]
        notes.append(f"## {i}. {s['title']} ({entry['seconds']} s)\n\n{s['speech']}\n")
    (ROOT/'source'/f'speaker-notes-{lang}.md').write_text('# Kinetic Core - 280-second rehearsal\n\n'+'\n'.join(notes))
