"""Makes each overlay's Twitch kit: 5 panel headers (320x100 PNG, see-through around the plate) and an offline screen
(1920x1080 JPG), all in the overlay's own style. Written to site/<Category>/<Overlay>/kit/ and listed by build-catalog.mjs.
Needs Python Playwright + Chromium. Run from the repo root (set FONTSOURCE_DIR if Google Fonts can't be reached):
    python3 scripts/build-kits.py ["Overlay name" ...] && node scripts/build-catalog.mjs"""
import asyncio, json, os, re, sys, io, threading, functools, http.server, urllib.parse
from playwright.async_api import async_playwright
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
PORT = 8797
FS = os.environ.get('FONTSOURCE_DIR', '')
PANELS = [('about', 'ABOUT ME'), ('schedule', 'SCHEDULE'), ('rules', 'RULES'), ('socials', 'SOCIALS'), ('support', 'SUPPORT ME')]
OFFLINE = ('CURRENTLY OFFLINE', 'SEE YOU SOON')

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

def fit_panel(png):
    """crop to the drawn plate, then fit it into 320x100 (see-through around it)"""
    im = Image.open(io.BytesIO(png)).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    im.thumbnail((304, 92), Image.LANCZOS)
    out = Image.new('RGBA', (320, 100), (0, 0, 0, 0)); out.paste(im, ((320 - im.width) // 2, (100 - im.height) // 2), im)
    return out

def doc(css, html):
    return (f'<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:{PORT}/"><style>{css}</style>'
            '<style>.sx{display:none!important}html,body{margin:0;background:transparent}[data-cam-hole]::after{display:none}</style></head>'
            f'<body>{html}</body></html>')

async def main(only):
    threading.Thread(target=serve, daemon=True).start()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ed = await b.new_page(viewport={'width': 1600, 'height': 1000})
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        if FS:
            async def route(r):
                u = r.request.url
                if 'fonts.googleapis.com' in u: await r.fulfill(status=200, content_type='text/css', body=font_css(u))
                elif '/__f/' in u:
                    pkg, f = u.split('/__f/')[1].split('/')
                    await r.fulfill(status=200, content_type='font/woff2', body=open(os.path.join(FS, pkg, 'files', f), 'rb').read())
                else: await r.continue_()
            await pg.route('**/*', route)
        await ed.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        await ed.goto(f'http://127.0.0.1:{PORT}/editor.html')
        await ed.wait_for_function("() => typeof LIB !== 'undefined' && LIB && LIB.sources && Object.keys(SRC).length")
        sources = await ed.evaluate("LIB.sources.map(s => ({id: s.id, name: s.name, path: s.path}))")
        n = 0
        for s in sources:
            if only and s['name'] not in only: continue
            out = os.path.join(SITE, *s['path'].strip('/').split('/'), 'kit'); os.makedirs(out, exist_ok=True)
            # panels: one big title per panel, stacked
            r = await ed.evaluate("""([id, labels]) => {
                const els = labels.map((t, i) => { const e = makeElement('title', id, { text: t }); Object.assign(e, { id: 'p' + i, x: 0, y: i * 216, w: 1920, h: 216, s: 2 }); return e; });
                const sc = { elements: els, game: null }; design = { v: 1, scene: 'starting', scenes: { main: { elements: [], game: null }, starting: sc } };
                return build(sc, false, { unified: true }); }""", [s['id'], [l for _, l in PANELS]])
            await pg.set_content(doc(r['css'], r['html'])); await pg.wait_for_timeout(700)
            for i, (key, _) in enumerate(PANELS):
                box = await pg.evaluate("""i => { const w = document.querySelector('[data-el="p' + i + '"] .nameplate'); let L=1e9,T=1e9,R=-1e9,B=-1e9;
                    [w, ...w.querySelectorAll('*')].forEach(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; L=Math.min(L,r.left);T=Math.min(T,r.top);R=Math.max(R,r.right);B=Math.max(B,r.bottom); });
                    return [L, T, R - L, B - T]; }""", i)
                pad = 12
                png = await pg.screenshot(clip={'x': max(0, box[0] - pad), 'y': max(0, box[1] - pad), 'width': box[2] + 2 * pad, 'height': box[3] + 2 * pad}, omit_background=True)
                fit_panel(png).save(os.path.join(out, f'panel-{key}.png'), optimize=True)
            # offline screen: the overlay's decorations, a big title and a smaller line, on the overlay's own dark colour
            r = await ed.evaluate("""([id, a, b]) => {
                const S = SRC[id], els = [];
                if (S.screen && S.screen.trim()) els.push(Object.assign(makeElement('decor', id), { id: 'd' }));
                els.push(Object.assign(makeElement('title', id, { text: a }), { id: 't1', x: 160, y: 330, w: 1600, h: 260, s: 2.9 }));
                els.push(Object.assign(makeElement('title', id, { text: b }), { id: 't2', x: 360, y: 640, w: 1200, h: 130, s: 1.25 }));
                const sc = { elements: els, game: null }; design = { v: 1, scene: 'ending', scenes: { main: { elements: [], game: null }, ending: sc } };
                const r = build(sc, false, { unified: true }); r.bg = (S.transition || [])[2] || 'var(--nameplate-bg)'; return r; }""", [s['id'], OFFLINE[0], OFFLINE[1]])
            css = r['css'] + f"\nbody{{background:#000}}#ov{{background:radial-gradient(ellipse at 50% 44%,rgba(255,255,255,.12),rgba(0,0,0,.6) 75%),{r['bg']}}}"
            await pg.set_content(doc(css, r['html'])); await pg.wait_for_timeout(900)
            png = await pg.screenshot(clip={'x': 0, 'y': 0, 'width': 1920, 'height': 1080})
            Image.open(io.BytesIO(png)).convert('RGB').save(os.path.join(out, 'offline.jpg'), quality=86, optimize=True)
            n += 1
        await b.close()
    print(f'kits made for {n} overlays')

asyncio.run(main(set(sys.argv[1:])))
