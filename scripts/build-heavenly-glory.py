"""Builds site/Ornate/Heavenly Glory from Silver Cathedral's frame + heavenly extras,
and adds it to the editor's parts library (parts.json). Run from repo root."""
import json, re, copy, shutil, math, os, random

SITE = 'site/'
SRC_NAME, NEW_NAME, NEW_ID = 'Silver Cathedral', 'Heavenly Glory', 'heavenlyglory'
SRC_DIR, NEW_DIR = SITE + 'Ornate/' + SRC_NAME + '/', SITE + 'Ornate/' + NEW_NAME + '/'
TAGS = 'heavenly heaven christian evangelical church faith angel wings halo clouds light gold white'

COLOURS = {'--metal': '#f0cd6e', '--metal-hi': '#fffdf2', '--metal-lo': '#b0842c', '--bead': '#ffffff',
           '--jewel': '#9ad8ff', '--jewel-hi': '#ffffff', '--jewel-2': '#ffffff', '--velvet': '#24508f',
           '--velvet-hi': '#6c9be0', '--text': '#ffffff', '--accent': '#ffe6a3', '--chat-bg': '#1d4380e6',
           '--chat-name': '#ffe6a3', '--goal-fill': '#ffd76a'}
LABELS = {'A NEW PILGRIM': 'A NEW SOUL JOINS', 'ORDAINED': 'BLESSED', 'ALMS BESTOWED': 'GIFTS OF GRACE',
          'OFFERING': 'HALLELUJAH', 'TITHE': 'A BLESSING', 'THE PROCESSION': 'THE MULTITUDE ARRIVES'}
CHAT_TITLE = ('The Nave', 'The Fellowship')

# ------------------------------------------------------------------ angel wing (SVG, drawn once, mirrored)
def wing_svg(cls, mirror):
    random.seed(7)
    feathers = []
    S, C, T = (212, 110), (150, 18), (52, 26)     # shoulder, arm control point, wing tip (wing spreads left)
    def arm(t):
        return ((1-t)**2*S[0] + 2*(1-t)*t*C[0] + t*t*T[0], (1-t)**2*S[1] + 2*(1-t)*t*C[1] + t*t*T[1])
    def feather(rx, ry, angle, length, width, fill):
        a = math.radians(angle)
        tx, ty = rx + math.cos(a) * length, ry + math.sin(a) * length       # tip
        nx, ny = -math.sin(a) * width, math.cos(a) * width                  # normal
        mx, my = rx + math.cos(a) * length * .45, ry + math.sin(a) * length * .45
        return (f'<path d="M{rx:.1f},{ry:.1f} Q{mx+nx:.1f},{my+ny:.1f} {tx:.1f},{ty:.1f} '
                f'Q{mx-nx*.7:.1f},{my-ny*.7:.1f} {rx:.1f},{ry:.1f}Z" fill="{fill}" '
                f'stroke="#d9b45a" stroke-width="1.1" stroke-opacity=".6"/>')
    # three layers hanging from the arm: long primaries, mid coverts, small coverts (back to front)
    for n, (lo, hi), w, fill, tmin in ((13, (52, 150), 11, 'url(#hv-fea)', 0.0),
                                        (11, (34, 78), 10, 'url(#hv-fea2)', 0.05),
                                        (9, (18, 38), 9, '#ffffff', 0.1)):
        for i in range(n):
            t = tmin + (1 - tmin) * i / (n - 1)
            rx, ry = arm(t)
            feathers.append(feather(rx, ry, 100 + 78 * t, lo + (hi - lo) * t ** 1.25, w + 3 * t, fill))
    # the arm itself: a soft gold-white ridge along the top edge
    p = [arm(k / 20) for k in range(21)]
    feathers.append('<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in p) +
                    '" fill="none" stroke="#fffaf0" stroke-width="7" stroke-linecap="round"/>')
    feathers.append('<path d="M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in p) +
                    '" fill="none" stroke="#e8c46a" stroke-width="2" stroke-linecap="round" opacity=".8"/>')
    tr = ' transform="translate(220,0) scale(-1,1)"' if mirror else ''
    return (f'<svg class="hv-wing {cls}" width="220" height="200" viewBox="0 0 220 200" overflow="visible" aria-hidden="true">'
            f'<g class="hv-wing-g"{tr}>' + ''.join(feathers) + '</g></svg>')

WING_DEFS = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
             '<linearGradient id="hv-fea" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffdf6"/>'
             '<stop offset=".7" stop-color="#ffffff"/><stop offset="1" stop-color="#fff1c9"/></linearGradient>'
             '<linearGradient id="hv-fea2" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffffff"/>'
             '<stop offset="1" stop-color="#f6ecd2"/></linearGradient></defs></svg>')

# ------------------------------------------------------------------ extra HTML
random.seed(3)
motes = []
for i in range(26):
    side = i % 2
    x = random.randint(8, 56) if i % 4 == 0 else random.randint(1400, 1905)   # never through the webcam (x 72-552)
    dx = random.randint(-30, 8) if x < 100 else random.randint(-60, 60)
    motes.append(f'<i class="hv-mote" style="left:{x}px;--d:{random.uniform(11,20):.1f}s;--x:{dx}px;'
                 f'--s:{random.uniform(.5,1.2):.2f};animation-delay:-{random.uniform(0,20):.1f}s"></i>')
clouds = ''.join(f'<i class="hv-cloud c{i}"></i>' for i in range(1, 8))
SCREEN_HTML = ('<div class="hv-sky" aria-hidden="true"><i class="hv-beam b3"></i><i class="hv-beam b4"></i>' + clouds + ''.join(motes) + '</div>')
CAM_HTML = ('<div class="hv-glory" aria-hidden="true"><i></i></div><div class="hv-halo" aria-hidden="true"></div>')
ALERT_HTML = (WING_DEFS + '<div class="hv-burst" aria-hidden="true"></div>' +
              wing_svg('left', False) + wing_svg('right', True))

# ------------------------------------------------------------------ extra CSS (unique hv- names, safe to mix in the editor)
SCREEN_CSS = """
/* ---- Heavenly Glory: light from above, clouds, rising light ---- */
.hv-sky{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;pointer-events:none;z-index:0}
.hv-beam{position:absolute;top:-120px;width:230px;height:640px;transform-origin:50% 0;pointer-events:none;
  background:linear-gradient(90deg,#fff6dc00,#fff6dc38 50%,#fff6dc00);filter:blur(7px);
  -webkit-mask-image:linear-gradient(#000 0%,#0008 45%,#0000 85%);mask-image:linear-gradient(#000 0%,#0008 45%,#0000 85%);
  animation:hv-shimmer 9s ease-in-out infinite}
.hv-beam.b3{right:-40px;transform:rotate(17deg);animation-delay:-5s}
.hv-beam.b4{right:150px;width:130px;transform:rotate(12deg);animation-delay:-7s}
.hv-cloud{position:absolute;width:560px;height:210px;pointer-events:none;filter:blur(9px);opacity:.62;
  background:radial-gradient(closest-side at 26% 64%,#fff 0,#fff0 100%),radial-gradient(closest-side at 50% 44%,#fff 0,#fff0 100%),
    radial-gradient(closest-side at 74% 60%,#fff 0,#fff0 100%),radial-gradient(closest-side at 50% 80%,#fffaf0 0,#fffaf000 100%);
  animation:hv-drift 48s ease-in-out infinite alternate}
.hv-cloud.c1{left:-200px;bottom:-110px}.hv-cloud.c2{left:260px;bottom:-140px;animation-delay:-12s}
.hv-cloud.c3{left:720px;bottom:-150px;animation-delay:-24s;opacity:.5}.hv-cloud.c4{left:1180px;bottom:-140px;animation-delay:-6s}
.hv-cloud.c5{left:1600px;bottom:-110px;animation-delay:-30s}
.hv-cloud.c6{left:-230px;top:730px;width:420px;height:170px;opacity:.45;animation-delay:-18s}
.hv-cloud.c7{right:-220px;top:180px;width:420px;height:170px;opacity:.45;animation-delay:-36s}
.hv-mote{position:absolute;bottom:-12px;width:7px;height:7px;border-radius:50%;opacity:0;pointer-events:none;
  background:radial-gradient(circle,#fff 0,#fff3c4 45%,#fff3c400 72%);box-shadow:0 0 10px 3px #fff1c070;
  animation:hv-rise var(--d,15s) linear infinite}
@keyframes hv-shimmer{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes hv-drift{from{translate:-40px 0}to{translate:40px -6px}}
@keyframes hv-rise{0%{transform:translate(0,0) scale(var(--s,1));opacity:0}12%{opacity:.95}80%{opacity:.7}
  100%{transform:translate(var(--x,20px),-1080px) scale(var(--s,1));opacity:0}}
"""
CAM_CSS = """
/* ---- Heavenly Glory: glory rays (never over the webcam) + halo ---- */
.hv-glory{position:absolute;left:50%;top:50%;width:1000px;height:1000px;margin:-500px 0 0 -500px;pointer-events:none;z-index:0;
  clip-path:polygon(evenodd,0 0,1000px 0,1000px 1000px,0 1000px,0 0,260px 350px,740px 350px,740px 650px,260px 650px,260px 350px)}
.hv-glory>i{position:absolute;inset:0;border-radius:50%;
  background:repeating-conic-gradient(from 0deg,#fff4d24a 0 3.5deg,#fff4d200 3.5deg 11deg);
  -webkit-mask-image:radial-gradient(circle,#000 22%,#0000 54%);mask-image:radial-gradient(circle,#000 22%,#0000 54%);
  animation:hv-spin 120s linear infinite}
.hv-halo{position:absolute;left:50%;top:-86px;width:156px;height:36px;margin-left:-78px;border-radius:50%;z-index:7;pointer-events:none;
  border:5px solid #fff7dc;box-shadow:0 0 16px 5px #ffe39acc,inset 0 0 10px 3px #ffe39aaa,0 0 42px 14px #fff3c455;
  animation:hv-float 5.5s ease-in-out infinite}
@keyframes hv-spin{to{transform:rotate(360deg)}}
@keyframes hv-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
"""
ALERT_CSS = """
/* ---- Heavenly Glory: angel wings + light burst on alerts ---- */
.hv-burst{position:absolute;left:-140px;right:-140px;top:-90px;bottom:-90px;pointer-events:none;z-index:0;
  background:radial-gradient(closest-side,#fff6d690,#fff6d630 55%,#fff6d600);animation:hv-pulse 2.6s ease-in-out infinite}
.hv-wing{position:absolute;top:-32px;pointer-events:none;z-index:0;filter:drop-shadow(0 0 10px #fff6d8b0) drop-shadow(0 3px 4px #0005)}
.hv-wing.left{left:-200px}.hv-wing.right{right:-200px}
.hv-wing-g{transform-box:view-box}
.hv-wing.left .hv-wing-g{transform-origin:212px 110px;animation:hv-flap-l 3.4s ease-in-out infinite}
.hv-wing.right .hv-wing-g{transform-origin:8px 110px;animation:hv-flap-r 3.4s ease-in-out infinite}
@keyframes hv-flap-l{0%,100%{rotate:-4deg}50%{rotate:7deg}}
@keyframes hv-flap-r{0%,100%{rotate:4deg}50%{rotate:-7deg}}
@keyframes hv-pulse{0%,100%{opacity:.7;transform:scale(.97)}50%{opacity:1;transform:scale(1.03)}}
"""
MOVE_CSS = "\n/* Heavenly Glory: alert sits 200px right of centre so its wings clear the webcam */\n#alert.alert{left:1160px}\n"
EXTRA_CSS = SCREEN_CSS + CAM_CSS + ALERT_CSS + MOVE_CSS

# ------------------------------------------------------------------ helpers
def recolour(text):
    for k, v in COLOURS.items():
        text = re.sub(r'(\n\s*' + re.escape(k) + r':\s*)#[0-9a-fA-F]{3,8}(;\s*/\*\s*@color)', r'\g<1>' + v + r'\2', text)
    return text
def relabel(text):
    for a, b in LABELS.items(): text = text.replace('"' + a + '"', '"' + b + '"')
    return text.replace('>' + CHAT_TITLE[0] + '<', '>' + CHAT_TITLE[1] + '<')
def insert_html(text):
    n = 0
    m = re.search(r'<svg class="orn screen-orn"', text); text = text[:m.start()] + SCREEN_HTML + text[m.start():]; n += 1
    m = re.search(r'<section id="cam" class="cam"[^>]*>', text); text = text[:m.end()] + CAM_HTML + text[m.end():]; n += 1
    m = re.search(r'<section id="alert" class="alert box"[^>]*>', text); text = text[:m.end()] + ALERT_HTML + text[m.end():]; n += 1
    return text, n

# ------------------------------------------------------------------ build the folder
if os.path.exists(NEW_DIR): shutil.rmtree(NEW_DIR)
shutil.copytree(SRC_DIR, NEW_DIR)
for f in ['overlay.html', 'styles.css', 'overlay.js', 'fields.json', 'preview.html', 'START-HERE.txt']:
    p = NEW_DIR + f; t = open(p, encoding='utf-8').read().replace(SRC_NAME, NEW_NAME)
    if f in ('styles.css', 'preview.html'): t = recolour(t)
    if f in ('overlay.js', 'preview.html', 'overlay.html'): t = relabel(t)
    if f in ('overlay.html', 'preview.html'): t, n = insert_html(t); assert n == 3, f
    if f == 'styles.css': t = t.rstrip() + '\n' + EXTRA_CSS
    if f == 'preview.html':      # css is inlined: add extras at the end of the overlay's <style> (the one holding :root)
        i = t.index(':root{'); j = t.index('</style>', i); t = t[:j] + EXTRA_CSS + t[j:]
    open(p, 'w', encoding='utf-8').write(t)
fp = NEW_DIR + 'fields.json'; F = json.load(open(fp, encoding='utf-8'))
for k, v in COLOURS.items():
    key = 'c_' + k[2:].replace('-', '_')
    if key in F: F[key]['value'] = v
json.dump(F, open(fp, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
oj = json.load(open(NEW_DIR + 'overlay.json')); oj['tags'] = TAGS
json.dump(oj, open(NEW_DIR + 'overlay.json', 'w'), indent=2)

# ------------------------------------------------------------------ add to the editor library
P = json.load(open(SITE + 'parts.json', encoding='utf-8')); S = P['sources']
S[:] = [s for s in S if s['name'] != NEW_NAME]
i = [j for j, s in enumerate(S) if s['name'] == SRC_NAME][0]
s = copy.deepcopy(S[i])
s.update(id=NEW_ID, name=NEW_NAME, path='Ornate/' + NEW_NAME + '/', tags=TAGS, chatTitle=CHAT_TITLE[1])
for row in s['vars']:
    if row[0] in COLOURS: row[2] = COLOURS[row[0]]
for k, v in list(s['labels'].items()):
    if v in LABELS: s['labels'][k] = LABELS[v]
s['screen'] = SCREEN_HTML + s['screen']
s['decor']['cam'] = CAM_HTML + s['decor']['cam']
s['decor']['alert'] = ALERT_HTML + s['decor']['alert']
s['decor'] = json.loads(json.dumps(s['decor']).replace('>' + CHAT_TITLE[0] + '<', '>' + CHAT_TITLE[1] + '<'))
s['css']['screen'] = s['css']['screen'] + SCREEN_CSS
s['css']['cam'] = s['css']['cam'] + CAM_CSS
s['css']['alert'] = s['css']['alert'] + ALERT_CSS
s['rects']['alert'] = [810, 40, 700, 156]
S.insert(i + 1, s)
json.dump(P, open(SITE + 'parts.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('built', NEW_DIR, '| editor sources:', len(S))
