"""Twitch kit (5 panel headers + offline screen) for the two hand-made Originals, in their own style.
Needs Python Playwright + Chromium. Run from the repo root:  python3 scripts/build-original-kits.py && node scripts/build-catalog.mjs"""
import asyncio, os, io
from playwright.async_api import async_playwright
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
PANELS = [('about', 'ABOUT ME'), ('schedule', 'SCHEDULE'), ('rules', 'RULES'), ('socials', 'SOCIALS'), ('support', 'SUPPORT ME')]

BODYCAM = {
 'css': """@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
body{margin:0;background:transparent;font-family:Arial,sans-serif}
.p{display:inline-flex;align-items:center;gap:14px;margin:20px;padding:18px 34px 18px 22px;background:linear-gradient(100deg,transparent 40%,#00000040),#0c0a0af0;border-left:6px solid #d92127;color:#f3f1ee;font:400 48px/1 'Anton',Impact,'Arial Narrow',sans-serif;letter-spacing:.5px}
.p i{width:12px;height:12px;border-radius:50%;background:#d92127;flex:0 0 auto}
.p small{font:700 13px 'Courier New',monospace;letter-spacing:2px;color:#a9a7a5;align-self:flex-end;margin-bottom:4px}
.off{position:relative;width:1920px;height:1080px;background:radial-gradient(ellipse at 50% 45%,#2a2626,#070606 75%);color:#f1f0ec;overflow:hidden}
.off::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,#ffffff0d 0 1px,transparent 1px 3px)}
.off .c{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:46px 220px 40px 56px;background:#0c0a0af0;border-left:8px solid #d92127}
.off .e{font:700 18px 'Courier New',monospace;letter-spacing:3px}.off .e i{display:inline-block;width:12px;height:12px;border-radius:50%;background:#d92127;margin-right:10px}
.off h1{font:400 132px/1 'Anton',Impact,'Arial Narrow',sans-serif;margin:22px 0 14px;transform:scaleX(1.1);transform-origin:left;white-space:nowrap}
.off .s{font:16px 'Courier New',monospace;letter-spacing:3px;color:#d4d1cd}.off .s b{color:#d92127}
.off .tl,.off .tr{position:absolute;top:40px;font:700 26px 'Courier New',monospace}.off .tl{left:56px}.off .tr{right:56px;color:#d92127}""",
 'panel': lambda t: f'<div class="p"><i></i>{t}<small>// BC-01</small></div>',
 'offline': '<div class="off"><div class="tl">BODYCAM // FEED OFFLINE</div><div class="tr">● NO SIGNAL</div><div class="c"><div class="e"><i></i>TRANSMISSION ENDED</div><h1>CURRENTLY OFFLINE</h1><div class="s">OPERATOR OFF DUTY <b>•</b> SEE YOU SOON</div></div></div>',
}
CHOICER = {
 'css': """@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Poppins:wght@600;700&display=swap');
body{margin:0;background:transparent}
.p{position:relative;display:inline-block;margin:24px;padding:22px 42px 18px;background:linear-gradient(160deg,#241246,#140a24);border:5px solid #ffc531;border-radius:22px;
  box-shadow:0 0 0 6px #140a24,0 0 26px rgba(255,197,49,.45);font:44px/1 'Bungee',Impact,sans-serif;color:#ffe486;text-shadow:0 4px 0 #000}
.p .l{position:absolute;left:18px;right:18px;top:5px;display:flex;justify-content:space-between}
.p .l span{width:8px;height:8px;border-radius:50%;background:#ffe486;box-shadow:0 0 8px #ffe486}
.off{position:relative;width:1920px;height:1080px;background:radial-gradient(ellipse at 50% 40%,#3a1d6e,#140a24 70%);overflow:hidden}
.off .sign{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:60px 90px 52px;text-align:center;background:linear-gradient(160deg,#241246,#140a24);
  border:8px solid #ffc531;border-radius:36px;box-shadow:0 0 0 10px #140a24,0 0 80px rgba(255,61,139,.4),0 0 50px rgba(255,197,49,.5)}
.off .l{position:absolute;left:28px;right:28px;display:flex;justify-content:space-between}.off .l.t{top:12px}.off .l.b{bottom:12px}
.off .l span{width:14px;height:14px;border-radius:50%;background:#ffe486;box-shadow:0 0 12px #ffe486}
.off h1{margin:0;font:120px/1.05 'Bungee',Impact,sans-serif;color:#ffe486;text-shadow:0 6px 0 #000,0 0 30px rgba(255,197,49,.6);white-space:nowrap}
.off p{margin:18px 0 0;font:700 36px 'Poppins',sans-serif;color:#efe6ff}.off p b{color:#ff3d8b}""",
 'panel': lambda t: '<div class="p"><div class="l">' + '<span></span>' * 9 + f'</div>{t}</div>',
 'offline': '<div class="off"><div class="sign"><div class="l t">' + '<span></span>' * 15 + '</div><h1>CURRENTLY OFFLINE</h1><p>The show’s off air — <b>see you soon!</b></p><div class="l b">' + '<span></span>' * 15 + '</div></div></div>',
}

def fit(png):
    im = Image.open(io.BytesIO(png)).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    im.thumbnail((304, 92), Image.LANCZOS)
    out = Image.new('RGBA', (320, 100), (0, 0, 0, 0)); out.paste(im, ((320 - im.width) // 2, (100 - im.height) // 2), im); return out

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        FS = os.environ.get('FONTSOURCE_DIR', '')
        if FS:   # offline machines: serve the fonts from a local @fontsource folder
            css = ''.join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url(data:font/woff2;base64,{__import__('base64').b64encode(open(os.path.join(FS, k, 'files', f'{k}-latin-{w}-normal.woff2'), 'rb').read()).decode()})}}"
                          for n, k, w in (('Anton', 'anton', 400), ('Bungee', 'bungee', 400), ('Poppins', 'poppins', 600), ('Poppins', 'poppins', 700)) if os.path.exists(os.path.join(FS, k, 'files', f'{k}-latin-{w}-normal.woff2')))
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=css))
        for name, T in (('Bodycam', BODYCAM), ('The Choicer Voicer', CHOICER)):
            out = os.path.join(SITE, 'Originals', name, 'kit'); os.makedirs(out, exist_ok=True)
            for key, label in PANELS:
                await pg.set_content(f'<!doctype html><html><head><style>{T["css"]}</style></head><body>{T["panel"](label)}</body></html>')
                await pg.wait_for_timeout(500)
                el = await pg.query_selector('.p'); bb = await el.bounding_box(); pad = 30
                png = await pg.screenshot(clip={'x': max(0, bb['x'] - pad), 'y': max(0, bb['y'] - pad), 'width': bb['width'] + 2 * pad, 'height': bb['height'] + 2 * pad}, omit_background=True)
                fit(png).save(os.path.join(out, f'panel-{key}.png'), optimize=True)
            await pg.set_content(f'<!doctype html><html><head><style>{T["css"]}</style></head><body>{T["offline"]}</body></html>'); await pg.wait_for_timeout(700)
            Image.open(io.BytesIO(await pg.screenshot(clip={'x': 0, 'y': 0, 'width': 1920, 'height': 1080}))).convert('RGB').save(os.path.join(out, 'offline.jpg'), quality=86, optimize=True)
            print('kit made for', name)
        await b.close()
asyncio.run(main())
