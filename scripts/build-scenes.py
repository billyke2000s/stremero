"""Makes the extra scenes (Starting soon, Be right back, Ending, Just Chatting) for every overlay the editor knows,
using the editor's own engine, so the main page and the editor always match.
Writes site/<Category>/<Overlay>/scenes/<scene>/ (overlay.html, styles.css, overlay.js, fields.json, START-HERE.txt, scene.json).

Needs Python Playwright with Chromium (pip install playwright && playwright install chromium). Run from the repo root
after changing an overlay or the editor's scene templates, then run node scripts/build-catalog.mjs:
    python3 scripts/build-scenes.py            # all overlays
    python3 scripts/build-scenes.py "Gothic Cathedral" "Blockcraft"
"""
import asyncio, json, os, sys, threading, functools, http.server, shutil
from playwright.async_api import async_playwright

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
SCENES = [('starting', 'Starting soon'), ('brb', 'Be right back'), ('ending', 'Ending'), ('chatting', 'Just Chatting')]
PORT = 8799

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    h = functools.partial(Quiet, directory=SITE)
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), h).serve_forever()

HELP = """{NAMEU} — {LABELU} SCENE (STREAMELEMENTS)

This is the "{LABEL}" scene of {NAME}. Give it its own StreamElements overlay and its own OBS scene.

INSTALL
1. In StreamElements create a new 1920 x 1080 overlay for this scene.
2. Add a Static/Custom > Custom Widget. Set it to 1920 x 1080 at X=0, Y=0.
3. Open the widget's code editor. Replace the HTML, CSS, JS and FIELDS tabs with the four
   boxes from the overlay site ("Copy to StreamElements"). Save.
4. In OBS make a "{LABEL}" scene and add the overlay URL as a Browser Source, 1920 x 1080,
   placed ABOVE your other sources.
{CAM}5. Test with StreamElements "Emulate" (follow, sub, tip, cheer, raid) and a real chat message.
{UNOFFICIAL}"""

async def main(only):
    threading.Thread(target=serve, daemon=True).start()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1600, 'height': 1000})
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
        await pg.goto(f'http://127.0.0.1:{PORT}/editor.html'); await pg.wait_for_function("() => typeof LIB !== 'undefined' && LIB && LIB.sources && LIB.sources.length && Object.keys(SRC).length")
        sources = await pg.evaluate("LIB.sources.map(s => ({id: s.id, name: s.name, path: s.path, forGame: s.forGame}))")
        n = 0
        for s in sources:
            if only and s['name'] not in only: continue
            folder = os.path.join(SITE, *s['path'].strip('/').split('/'))
            if not os.path.isdir(folder): print('missing folder for', s['name']); continue
            out_root = os.path.join(folder, 'scenes')
            if os.path.isdir(out_root): shutil.rmtree(out_root)
            for sid, label in SCENES:
                res = await pg.evaluate("""([id, sid]) => {
                    const sc = sceneFor(picksFor(id), sid);
                    sc.elements.forEach((e, i) => { e.id = 'p' + (i + 1); });
                    design = { v: 1, scene: sid, from: SRC[id].name, scenes: { main: designFromOverlay(id), [sid]: sc } };
                    const r = build(sc, false, { unified: true });
                    const cam = sc.elements.find(e => e.kind === 'cam');
                    return { html: r.html, css: r.css, js: r.js, fields: r.fields,
                             cam: cam ? [Math.round(cam.x), Math.round(cam.y), Math.round(cam.w), Math.round(cam.h)] : null };
                }""", [s['id'], sid])
                d = os.path.join(out_root, sid); os.makedirs(d)
                head = f"{s['name']} — {label} scene"
                html = res['html'].replace('My overlay (made in the overlay editor)', head, 1)
                css = res['css'].replace('My overlay (made in the overlay editor)', head, 1)
                F = res['fields']; F['widgetName']['value'] = f"{s['name']} ({label})"
                for k, f in F.items():          # every part placed in the scene starts switched on
                    if k.startswith('show') and f.get('type') == 'checkbox': f['value'] = True
                cam = res['cam']
                help_ = HELP.format(NAMEU=s['name'].upper(), LABELU=label.upper(), NAME=s['name'], LABEL=label, CAM=(
                    f"   Webcam: put your camera at X={cam[0]} Y={cam[1]} width={cam[2]} height={cam[3]} (1920 x 1080 canvas).\n" if cam else ''),
                    UNOFFICIAL=(f"\nUnofficial, fan-made style inspired by {s['forGame']}. Not affiliated with or endorsed by its makers.\n" if s['forGame'] else ''))
                files = {'overlay.html': html, 'styles.css': css, 'overlay.js': res['js'], 'fields.json': json.dumps(F, indent=2, ensure_ascii=False),
                         'START-HERE.txt': help_, 'scene.json': json.dumps({'id': sid, 'label': label, 'cam': cam}, indent=2)}
                for f, t in files.items():
                    with open(os.path.join(d, f), 'w', encoding='utf-8') as fh: fh.write(t)
            n += 1
        await b.close()
        if errs: print('page errors:', errs)
        print(f'scenes made for {n} overlays')

asyncio.run(main(set(sys.argv[1:])))
