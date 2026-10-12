"""Makes a small picture (thumb.jpg, 480x270) of every extra scene, for the gallery's scene previews.
Renders each scene exactly as the overlay site shows it (with an alert showing), on black.
Needs Python Playwright + Chromium. Run from the repo root, then node scripts/build-catalog.mjs:
    python3 scripts/build-scene-thumbs.py                 # all
    python3 scripts/build-scene-thumbs.py "Ink Turf"      # just these overlays
Fonts come from Google Fonts. If this machine can't reach them, set FONTSOURCE_DIR to a node_modules/@fontsource folder."""
import asyncio, json, os, re, sys, threading, functools, http.server, urllib.parse, io
from playwright.async_api import async_playwright
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
PORT = 8798
FS = os.environ.get('FONTSOURCE_DIR', '')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass
def serve():
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), functools.partial(Quiet, directory=SITE)).serve_forever()

def font_css(url):
    out = ''
    for fam in urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('family', []):
        name, _, spec = fam.partition(':'); pkg = name.lower().replace(' ', '-')
        for w in re.findall(r'\d{3}', spec) or ['400']:
            f = f'{pkg}-latin-{w}-normal.woff2'
            if os.path.exists(os.path.join(FS, pkg, 'files', f)):
                out += f"@font-face{{font-family:'{name}';font-weight:{w};src:url(http://127.0.0.1:{PORT}/__f/{pkg}/{f})}}"
    return out

async def main(only):
    threading.Thread(target=serve, daemon=True).start()
    cat = json.loads(re.search(r'window.OVERLAYS=(.*);\s*$', open(os.path.join(SITE, 'catalog.js'), encoding='utf-8').read(), re.S).group(1))
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1400})
        if FS:
            async def route(r):
                u = r.request.url
                if 'fonts.googleapis.com' in u: await r.fulfill(status=200, content_type='text/css', body=font_css(u))
                elif '/__f/' in u:
                    pkg, f = u.split('/__f/')[1].split('/')
                    await r.fulfill(status=200, content_type='font/woff2', body=open(os.path.join(FS, pkg, 'files', f), 'rb').read())
                else: await r.continue_()
            await pg.route('**/*', route)
        await pg.add_init_script("try{localStorage.clear()}catch(e){}")
        n = 0
        for it in cat:
            if only and it['name'] not in only: continue
            for sc in it['scenes']:
                q = 'overlay=' + urllib.parse.quote(it['path'].rstrip('/')) + '&scene=' + sc['id']
                await pg.goto(f'http://127.0.0.1:{PORT}/index.html?' + q); await pg.wait_for_timeout(2400)   # after the transition
                await pg.add_style_tag(content='.live-badge,.player-controls{display:none!important}')
                fr = await (await pg.query_selector('#preview')).content_frame()
                await fr.evaluate("""()=>{const s=document.createElement('style');s.textContent='html,body{background:#000!important}[data-cam-hole]{outline:none!important}[data-cam-hole]::after{display:none!important}.sx{display:none!important}';document.head.appendChild(s);
                  const a=document.querySelector('#alert,#alert-box');if(a){a.classList.remove('hide');a.classList.add('show','visible');}}""")
                await pg.wait_for_timeout(900)
                png = await (await pg.query_selector('#preview')).screenshot()
                im = Image.open(io.BytesIO(png)).convert('RGB').resize((480, 270), Image.LANCZOS)
                im.save(os.path.join(SITE, *it['path'].strip('/').split('/'), 'scenes', sc['id'], 'thumb.jpg'), quality=82, optimize=True)
                n += 1
        await b.close()
    print(f'made {n} scene pictures')

asyncio.run(main(set(sys.argv[1:])))
