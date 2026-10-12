"""Checks the whole site before it goes live. Fails (exit code 1) if anything is wrong.
  - every overlay and every scene opens on the overlay site with no script errors and isn't blank
  - nothing is drawn over the middle of any webcam opening
  - the files the catalog points at exist (thumbnails, scenes, Twitch kits)
  - every overlay opens in the editor without errors
Needs Python Playwright + Chromium, numpy and Pillow. Run from the repo root:  python3 scripts/check-site.py
GitHub runs this on every push (.github/workflows/check.yml)."""
import asyncio, json, os, re, sys, io, threading, functools, http.server, urllib.parse
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
PORT = 8796
problems = []

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass
def serve():
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Quiet, directory=SITE)).serve_forever()

def check_files(cat):
    for it in cat:
        base = os.path.join(SITE, *it['path'].strip('/').split('/'))
        for f in [it['html'], it['css'], it['js']] + [x for x in (it['fields'], it['help'], it['icon']) if x]:
            if not os.path.exists(os.path.join(base, f)): problems.append(f'{it["name"]}: missing {f}')
        for sc in it['scenes']:
            d = os.path.join(base, 'scenes', sc['id'])
            for f in ['overlay.html', 'styles.css', 'overlay.js'] + ([sc['thumb']] if sc.get('thumb') else []):
                if not os.path.exists(os.path.join(d, f)): problems.append(f'{it["name"]} / {sc["id"]}: missing {f}')
        if it['editor'] and len(it['scenes']) < 4: problems.append(f'{it["name"]}: only {len(it["scenes"])} extra scenes (expected 4)')
        kit = it.get('kit')
        if kit:
            for k in kit['panels']:
                if not os.path.exists(os.path.join(base, 'kit', f'panel-{k}.png')): problems.append(f'{it["name"]}: missing kit panel {k}')

async def check_pages(cat):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1300})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))   # speed: fonts don't change layout checks
        n = 0
        for it in cat:
            for sc in [None] + [s['id'] for s in it['scenes']]:
                errs.clear(); where = f'{it["name"]} / {sc or "gameplay"}'
                q = 'overlay=' + urllib.parse.quote(it['path'].rstrip('/')) + ('&scene=' + sc if sc else '')
                await pg.goto(f'http://127.0.0.1:{PORT}/index.html?' + q); await pg.wait_for_timeout(2300)   # after the scene transition
                fr = await (await pg.query_selector('#preview')).content_frame()
                await fr.evaluate("""()=>{const s=document.createElement('style');s.textContent='html,body{background:#ff0000!important}[data-cam-hole]{outline:none!important}[data-cam-hole]::after{display:none!important}';document.head.appendChild(s);}""")
                await pg.add_style_tag(content='.live-badge,.player-controls{display:none!important}')
                await pg.wait_for_timeout(300)
                a = np.array(Image.open(io.BytesIO(await (await pg.query_selector('#preview')).screenshot())).convert('RGB')).astype(int)
                k = a.shape[1] / 1920
                drawn = (np.abs(a[..., 0] - 255) + a[..., 1] + a[..., 2]) > 12
                if drawn.mean() < 0.003: problems.append(f'{where}: looks blank')
                cam = it['cam'] if not sc else next(s['cam'] for s in it['scenes'] if s['id'] == sc)
                if cam:
                    x, y, w, h = cam[:4]
                    mid = drawn[int((y + h * .2) * k):int((y + h * .8) * k), int((x + w * .2) * k):int((x + w * .8) * k)]
                    if mid.mean() > 0.002: problems.append(f'{where}: {mid.mean() * 100:.1f}% of the webcam middle is covered')
                if errs: problems.append(f'{where}: script error {errs[:2]}')
                n += 1
        ed = await b.new_page(viewport={'width': 1600, 'height': 1000}); eerrs = []; ed.on('pageerror', lambda e: eerrs.append(str(e)))
        await ed.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        for it in [c for c in cat if c['editor']]:
            eerrs.clear()
            await ed.goto(f'http://127.0.0.1:{PORT}/editor.html?from=' + urllib.parse.quote(it['name'])); await ed.wait_for_timeout(1500)
            ok = await ed.evaluate("()=>typeof design!=='undefined' && design && design.scenes && design.scenes.main.elements.length>0")
            if not ok: problems.append(f'editor: {it["name"]} did not open')
            if eerrs: problems.append(f'editor: {it["name"]}: script error {eerrs[:2]}')
        await b.close()
        return n

def main():
    cat = json.loads(re.search(r'window.OVERLAYS=(.*);\s*$', open(os.path.join(SITE, 'catalog.js'), encoding='utf-8').read(), re.S).group(1))
    check_files(cat)
    threading.Thread(target=serve, daemon=True).start()
    n = asyncio.run(check_pages(cat))
    print(f'checked {len(cat)} overlays, {n} scenes on the overlay site, and the editor')
    if problems:
        print('\nPROBLEMS:'); print('\n'.join(' - ' + x for x in problems)); sys.exit(1)
    print('no problems found')

main()
