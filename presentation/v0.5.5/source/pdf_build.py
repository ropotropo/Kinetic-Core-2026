"""Versioned KC PDFs and poster. Requires ReportLab, Pillow and local Sharp.

Run with the bundled Codex Python or another environment containing those
libraries. The project source and exact screenshot mapping remain editable.
No legacy presentation artifact is read as an output or overwritten.
"""
from pathlib import Path
import argparse
import base64
import json
import os
import subprocess

from PIL import Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source'
W, H, SAFE = 1600, 900, 80
INK, MUTED, BLACK = '#f5f5f7', '#a1a1a8', '#000000'
FONTDIR = Path('/System/Library/Fonts/Supplemental')
REGULAR = Path(os.environ.get('KC_FONT_REGULAR', str(FONTDIR / 'Arial.ttf')))
BOLD = Path(os.environ.get('KC_FONT_BOLD', str(FONTDIR / 'Arial Bold.ttf')))
pdfmetrics.registerFont(TTFont('KC', str(REGULAR)))
pdfmetrics.registerFont(TTFont('KC-Bold', str(BOLD)))
CONTENT = json.loads((SOURCE / 'pdf-content.json').read_text())
ASSETS = json.loads((SOURCE / 'pdf-assets.json').read_text())
LAYOUT = []


def asset_path(key):
    file = ASSETS[key].get('file')
    if not file:
        raise ValueError(f'Actual frozen-build capture not assigned: {key}')
    path = ROOT / file
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def wrap(text, size, width, font='KC'):
    rows = []
    for para in text.split('\n'):
        row = ''
        for word in para.split():
            candidate = (row + ' ' + word).strip()
            if row and pdfmetrics.stringWidth(candidate, font, size) > width:
                rows.append(row)
                row = word
            else:
                row = candidate
        rows.append(row)
    return rows


def text(c, value, x, top, size, width, bold=False, color=INK, leading=None):
    font = 'KC-Bold' if bold else 'KC'
    leading = leading or size * 1.2
    rows = wrap(value, size, width, font)
    c.setFillColor(HexColor(color))
    c.setFont(font, size)
    for index, row in enumerate(rows):
        if pdfmetrics.stringWidth(row, font, size) > width + .01:
            raise ValueError(f'Text wider than its field: {row}')
        c.drawString(x, H - top - size - index * leading, row)
    bottom = top + size + max(0, len(rows) - 1) * leading
    LAYOUT.append(dict(text=value, x=x, top=top, bottom=bottom, width=width, size=size, rows=len(rows)))
    return bottom


def picture(c, key, x=0, top=0, width=W, height=H, cover=False):
    path = asset_path(key)
    with Image.open(path) as image:
        iw, ih = image.size
    factor = max(width / iw, height / ih) if cover else min(width / iw, height / ih)
    dw, dh = iw * factor, ih * factor
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, H - top - height, width, height)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(ImageReader(str(path)), x + (width - dw) / 2,
                H - top - height + (height - dh) / 2, dw, dh, mask='auto')
    c.restoreState()


def footer(c, page, count):
    text(c, 'Kinetic Core', SAFE, 850, 15, 650, color=MUTED)
    text(c, f'{page} / {count}', 1435, 850, 15, 85, color=MUTED)


def statement(c, slide):
    title_end = text(c, slide['title'], SAFE, 108, 68, 1435, bold=True, leading=74)
    lead_end = text(c, slide.get('lead', ''), SAFE, title_end + 42, 34, 1400, color=MUTED, leading=42)
    y = max(420, lead_end + 110)
    for point in slide.get('points', []):
        y = text(c, point, SAFE, y, 35, 1400, leading=43) + 39
    if y > 820:
        raise ValueError(f'Statement exceeds content area: {slide["title"]} ({y})')


def equation(c, chunks, x, top, size=43):
    """Native text with explicit subscript placement, including g0/m0/mf.

    Arial lacks Unicode subscript zero; smaller baseline-shifted ASCII glyphs
    preserve the exact mathematical meaning without missing-glyph boxes.
    """
    c.setFillColor(HexColor(INK))
    cursor = x
    for value, relative_size, rise in chunks:
        point_size = size * relative_size
        c.setFont('KC-Bold', point_size)
        c.drawString(cursor, H - top - size + rise, value)
        cursor += pdfmetrics.stringWidth(value, 'KC-Bold', point_size)
    if cursor > 1030:
        raise ValueError('Equation extends beyond its column')


def physics(c, slide, lang):
    text(c, slide['title'], SAFE, 80, 64, 1440, bold=True)
    text(c, slide['lead'], SAFE, 183, 33, 1440, color=MUTED)
    formula_rows = [
        [('a', 1, 0), ('g', .56, -9), (' = -μ r / |r|³', 1, 0)],
        [('ṁ', 1, 0), ('prop', .52, -9), (' = T / (I', 1, 0), ('sp', .52, -9), (' × g', 1, 0), ('0', .52, -9), (')', 1, 0)],
        [('Δv = I', 1, 0), ('sp', .52, -9), (' × g', 1, 0), ('0', .52, -9), (' × ln(m', 1, 0), ('0', .52, -9), ('/m', 1, 0), ('f', .52, -9), (')', 1, 0)],
    ]
    for label, chunks, y in zip(slide['points'], formula_rows, [290, 455, 620]):
        text(c, label, SAFE, y, 22, 950, color=MUTED)
        equation(c, chunks, SAFE, y + 43)
    text(c, 'SI', 1170, 319, 88, 300, bold=True)
    text(c, 'kg  m  s  N', 1170, 437, 31, 350, color=MUTED)
    labels = ['Finite propellant', 'Double precision'] if lang == 'en' else ['Обмежене пальне', 'Подвійна точність']
    text(c, labels[0], 1170, 557, 28, 350)
    text(c, labels[1], 1170, 612, 28, 350)


def notes(lang):
    rows = [f'# Kinetic Core v0.5.5 - {CONTENT["totalSeconds"]}-second rehearsal',
            '', 'Sole game author: Mykyta Borisov.',
            f'Frozen source: `{CONTENT["frozenCommit"]}`.',
            '', 'Technical notes are not slide copy. They retain assumptions and capture/source provenance.', '']
    elapsed = 0
    for i, entry in enumerate(CONTENT['slides'], 1):
        copy = entry[lang]
        end = elapsed + entry['seconds']
        title = copy['title'].replace('\n', ' ')
        rows += [f'## {i}. {title} ({entry["seconds"]} s; {elapsed:03d}-{end:03d} s)', '', copy['speech'], '']
        for note in entry.get('technicalNotes', []):
            rows += [f'- {note}']
        if entry.get('imageKey'):
            item = ASSETS[entry['imageKey']]
            rows += [f'- Image: `{item.get("file")}`. {item["role"]}.']
        rows += ['']
        elapsed = end
    assert elapsed == 280
    (SOURCE / f'pdf-speaker-notes-{lang}.md').write_text('\n'.join(rows) + '\n')


def poster():
    image64 = base64.b64encode(asset_path('hero').read_bytes()).decode()
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440" role="img" aria-labelledby="poster-title">
  <title id="poster-title">Kinetic Core</title>
  <metadata>Approved portrait reused unchanged. Sole game author Mykyta Borisov. Layout is editable; source photograph provenance is retained in presentation technical records.</metadata>
  <defs><linearGradient id="shade"><stop stop-color="#000000" stop-opacity=".18"/><stop offset=".6" stop-color="#000000" stop-opacity="0"/></linearGradient></defs>
  <rect width="2560" height="1440" fill="#000000"/>
  <image width="2560" height="1440" preserveAspectRatio="xMidYMid slice" href="data:image/png;base64,{image64}"/>
  <rect width="2560" height="1440" fill="url(#shade)"/>
  <g fill="#f5f5f7" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif">
    <text x="128" y="162" font-size="36" font-weight="500">NASA Space Apps Challenge 2026</text>
    <text x="128" y="636" font-size="192" font-weight="700" letter-spacing="-8">Kinetic</text>
    <text x="128" y="821" font-size="192" font-weight="700" letter-spacing="-8">Core</text>
    <text x="128" y="964" font-size="41">Space Mission Design Game</text>
    <text x="128" y="1065" font-size="42" font-weight="500">Created by Mykyta Borisov</text>
    <text x="128" y="1320" font-size="25" fill="#a1a1a8">v0.5.5</text>
  </g>
</svg>'''
    svg_path = SOURCE / 'pdf-poster.svg'
    svg_path.write_text(svg)
    out = ROOT / 'Kinetic-Core-v0.5.5-poster.png'
    node = os.environ.get('KC_NODE', '/Users/andrkrupenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
    sharp = os.environ.get('KC_SHARP_MODULE', '/Users/andrkrupenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')
    script = 'const sharp=require(process.argv[1]);sharp(process.argv[2]).png().toFile(process.argv[3]).then(()=>console.log(process.argv[3])).catch(e=>{console.error(e);process.exit(1)});'
    subprocess.run([node, '-e', script, sharp, str(svg_path), str(out)], check=True)
    thumbnail = ROOT / 'Kinetic-Core-v0.5.5-thumbnail.jpg'
    with Image.open(out) as image:
        image.convert('RGB').resize((1280, 720), Image.Resampling.LANCZOS).save(
            thumbnail, quality=92, optimize=True, subsampling=0)
    if thumbnail.stat().st_size >= 2_000_000:
        raise ValueError('YouTube thumbnail exceeds 2 MB')
    print(thumbnail)
    return out


def build(lang):
    for entry in CONTENT['slides']:
        if entry.get('imageKey'):
            asset_path(entry['imageKey'])
    suffix = 'EN' if lang == 'en' else 'UA'
    output = ROOT / f'Kinetic-Core-v0.5.5-{suffix}.pdf'
    c = canvas.Canvas(str(output), pagesize=(W, H), pageCompression=1)
    c.setTitle(f'Kinetic Core v0.5.5 - {"English" if lang == "en" else "Ukrainian"}')
    c.setAuthor('Mykyta Borisov')
    c.setSubject('18-slide, 280-second presentation of the frozen v0.5.5 game. Technical notes preserve the educational model and capture boundaries.')
    for number, entry in enumerate(CONTENT['slides'], 1):
        global LAYOUT
        LAYOUT = []
        copy = entry[lang]
        c.bookmarkPage(entry['id'])
        c.addOutlineEntry(copy['title'].replace('\n', ' '), entry['id'])
        c.setFillColor(HexColor(BLACK))
        c.rect(0, 0, W, H, fill=1, stroke=0)
        kind = entry['kind']
        if kind == 'screenshot':
            picture(c, entry['imageKey'])
        elif kind == 'cover':
            picture(c, 'hero', cover=True)
            text(c, CONTENT['event'], SAFE, 78, 26, 900, bold=True)
            text(c, 'Kinetic', SAFE, 258, 120, 720, bold=True, leading=116)
            text(c, 'Core', SAFE, 374, 120, 720, bold=True, leading=116)
            text(c, copy['lead'], SAFE, 550, 30, 760)
            text(c, copy['points'][0], SAFE, 636, 29, 750, bold=True)
            text(c, 'v0.5.5', SAFE, 825, 17, 400, color=MUTED)
        elif kind == 'physics':
            physics(c, copy, lang)
            footer(c, number, len(CONTENT['slides']))
        elif kind == 'closing':
            picture(c, 'logo', 1070, 220, 390, 390)
            text(c, copy['title'], SAFE, 245, 78, 1000, bold=True)
            text(c, copy['lead'], SAFE, 378, 58, 1000, bold=True)
            text(c, copy['points'][0], SAFE, 497, 31, 930, color=MUTED)
            footer(c, number, len(CONTENT['slides']))
        else:
            statement(c, copy)
            footer(c, number, len(CONTENT['slides']))
        for block in LAYOUT:
            if block['bottom'] > H - 20:
                raise ValueError(f'Out-of-bounds text page {number}: {block["text"]}')
        c.showPage()
    c.save()
    notes(lang)
    print(output)
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--poster-only', action='store_true')
    args = parser.parse_args()
    assert len(CONTENT['slides']) == 18
    assert sum(s['seconds'] for s in CONTENT['slides']) == 280
    poster()
    if not args.poster_only:
        for lang in ('en', 'uk'):
            build(lang)


if __name__ == '__main__':
    main()
