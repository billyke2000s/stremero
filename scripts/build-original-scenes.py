"""Hand-made extra scenes for the two Originals (Bodycam, The Choicer Voicer), which the editor can't build.
Each scene is the overlay's own code plus a small scene layer in the same style. Run from the repo root, then
node scripts/build-catalog.mjs:    python3 scripts/build-original-scenes.py"""
import json, os, re, shutil

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
LABELS = {'starting': 'Starting soon', 'brb': 'Be right back', 'ending': 'Ending', 'chatting': 'Just Chatting'}
CHAT_CAM = [48, 176, 1216, 684]           # Just Chatting webcam: 16:9, big, left
GAME_FIELDS = ['gameX', 'gameY', 'gameW', 'gameH', 'gameRadius', 'gameFrame', 'c_game_frame']

# ----------------------------------------------------------------------------------------------- Bodycam
BC_TEXT = {'starting': ('STANDBY // FEED OFFLINE', 'STARTING SOON', 'OPERATOR EN ROUTE <b>•</b> STAND BY'),
           'brb': ('SIGNAL INTERRUPTED', 'BE RIGHT BACK', 'OPERATOR AWAY <b>•</b> HOLD POSITION'),
           'ending': ('TRANSMISSION ENDED', 'THANKS FOR WATCHING', 'OPERATOR SIGNING OFF <b>•</b> END OF FEED')}
BC_CSS = """
/* ---- scene: {label} ---- */
.scene-card{position:absolute;left:50%;top:330px;width:max-content;min-width:760px;transform:translateX(-50%);padding:34px 200px 30px 44px;background:linear-gradient(100deg,transparent 40%,#00000040),var(--alert-bg);border-left:6px solid var(--red);text-shadow:0 2px 3px #000}
.scene-card h1{font-size:104px;margin:18px 0 12px}
.scene-card .subline{font-size:15px;letter-spacing:2px}
.scene-bar{position:relative;height:3px;margin-top:26px;background:#ffffff26;overflow:hidden}
.scene-bar i{position:absolute;top:0;bottom:0;width:30%;background:var(--red);animation:scanbar 2.4s ease-in-out infinite}
.scene-static{position:absolute;inset:0;pointer-events:none;opacity:.06;background:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px);animation:flicker .18s steps(2) infinite}
@keyframes scanbar{0%{left:-30%}100%{left:100%}}
@keyframes flicker{50%{opacity:.03}}
"""
BC_CAM_CSS = """
/* ---- scene: Just Chatting (big webcam) ---- */
.scene-cam{position:absolute;left:%dpx;top:%dpx;width:%dpx;height:%dpx}
.scene-cam .br{position:absolute;width:46px;height:46px;border:4px solid var(--white);opacity:.95;filter:drop-shadow(0 0 2px #000) drop-shadow(0 1px 3px #000)}
.scene-cam .tl{left:-10px;top:-10px;border-right:0;border-bottom:0}.scene-cam .tr{right:-10px;top:-10px;border-left:0;border-bottom:0}
.scene-cam .bl{left:-10px;bottom:-10px;border-right:0;border-top:0}.scene-cam .bxr{right:-10px;bottom:-10px;border-left:0;border-top:0}
.scene-cam .cam-label{position:absolute;left:0;bottom:-34px;font:700 14px/1 'Courier New',monospace;letter-spacing:2px;color:var(--white);text-shadow:1px 2px 2px #000}
.scene-cam .cam-label .dot{width:9px;height:9px}
#chat{right:48px;bottom:220px;width:560px}
#messages{max-height:620px}
""" % tuple(CHAT_CAM)

def bodycam(sid):
    if sid == 'chatting':
        return (BC_CAM_CSS, '<div class="scene-cam" aria-label="Webcam frame"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br bxr"></i>'
                '<div class="cam-label"><i class="dot"></i> CAM 02 // DIRECT FEED</div></div>', CHAT_CAM)
    eb, title, sub = BC_TEXT[sid]
    css = BC_CSS.replace('{label}', LABELS[sid]) + ('#chat{display:none!important}\n' if sid == 'ending' else '')
    html = (f'<div class="scene-static" aria-hidden="true"></div><section class="scene-card"><div class="eyebrow"><i class="dot"></i> {eb}</div>'
            f'<h1>{title}</h1><div class="subline">{sub}</div><div class="scene-bar"><i></i></div></section>')
    return css, html, None

# ----------------------------------------------------------------------------------------------- The Choicer Voicer
CV_TEXT = {'starting': ('STARTING SOON', 'The show begins shortly — grab a seat!'),
           'brb': ('BE RIGHT BACK', 'Stay tuned — don’t touch that dial!'),
           'ending': ('THANKS FOR WATCHING', 'See you next show!')}
CV_CSS = """
/* ---- scene: {label} ---- */
#cam-slot{display:none!important}
.scene-sign{position:absolute;left:50%;top:310px;transform:translateX(-50%);min-width:900px;padding:46px 70px 40px;text-align:center;
  background:linear-gradient(160deg,var(--stage-mid),var(--stage-deep));border:6px solid var(--gold);border-radius:28px;
  box-shadow:0 0 0 8px var(--stage-deep),0 16px 50px rgba(0,0,0,.7),0 0 60px rgba(255,61,139,.35),0 0 36px rgba(255,197,49,.4)}
.scene-sign .lights{position:absolute;left:24px;right:24px;display:flex;justify-content:space-between}
.scene-sign .lights.top{top:10px}.scene-sign .lights.bot{bottom:10px}
.scene-sign .lights span{width:12px;height:12px;border-radius:50%;background:var(--gold-hot);box-shadow:0 0 10px var(--gold-hot);animation:blink 1s infinite}
.scene-sign .lights span:nth-child(even){animation-delay:.5s}
.scene-title{font-family:'Bungee',cursive;font-size:96px;line-height:1.05;color:var(--gold-hot);text-shadow:0 5px 0 #000,0 0 28px rgba(255,197,49,.6);white-space:nowrap}
.scene-sub{margin-top:14px;font-size:30px;font-weight:600;color:var(--text-soft)}
.scene-sub b{color:var(--magenta)}
"""
CV_CAM_CSS = """
/* ---- scene: Just Chatting (big webcam) ---- */
#cam-slot{left:%dpx;top:%dpx;width:%dpx;height:%dpx}
.cam-frame{border-width:8px;border-radius:24px}
.cam-nameplate{bottom:-34px;padding:10px 30px}.cam-name{font-size:26px}
#chat-wrap{right:48px;bottom:220px;width:560px;max-height:684px}
#alert-box{left:1586px;top:16px}
""" % tuple(CHAT_CAM)

def choicer(sid):
    if sid == 'chatting':
        return CV_CAM_CSS, '', CHAT_CAM + [24]
    title, sub = CV_TEXT[sid]
    lights = '<span></span>' * 13
    css = CV_CSS.replace('{label}', LABELS[sid]) + ('#chat-wrap{display:none!important}\n' if sid == 'ending' else '')
    html = (f'<section class="scene-sign"><div class="lights top">{lights}</div><div class="scene-title">{title}</div>'
            f'<div class="scene-sub">{sub}</div><div class="lights bot">{lights}</div></section>')
    return css, html, None

ORIGINALS = [('Bodycam', bodycam, '</main>', None), ('The Choicer Voicer', choicer, None, 'showCam')]

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
"""

for name, make, close_tag, cam_field in ORIGINALS:
    src = os.path.join(SITE, 'Originals', name)
    meta = json.load(open(os.path.join(src, 'overlay.json')))
    css_file = meta.get('css', 'styles.css')
    rd = lambda f: open(os.path.join(src, f), encoding='utf-8').read()
    html0, css0, js0, F0 = rd('overlay.html'), rd(css_file), rd('overlay.js'), json.loads(rd('fields.json'))
    out_root = os.path.join(src, 'scenes')
    if os.path.isdir(out_root): shutil.rmtree(out_root)
    for sid, label in LABELS.items():
        css_add, html_add, cam = make(sid)
        # html: scene layer goes inside the overlay's root, after everything else
        if close_tag: i = html0.rindex(close_tag)
        else: i = html0.rindex('</div>')
        html = html0[:i] + '  ' + html_add + '\n' + html0[i:]
        css = css0.rstrip() + '\n' + css_add
        # js: no game window in these scenes; webcam only in Just Chatting
        m = re.search(r'const LOOK = (\{.*?\});\n', js0)
        look = json.loads(m.group(1)); look['game'] = None; look['cam'] = cam
        if sid != 'chatting' and 'cam' in look['parts']: del look['parts']['cam']
        js = js0[:m.start(1)] + json.dumps(look) + js0[m.end(1):]
        F = {k: v for k, v in F0.items() if k not in GAME_FIELDS}
        if sid != 'chatting':
            F.pop('cutCam', None)
            if cam_field: F.pop(cam_field, None)
        if sid == 'ending': F.pop('showChat', None)
        F['widgetName']['value'] = f'{name} ({label})'
        d = os.path.join(out_root, sid); os.makedirs(d)
        help_ = HELP.format(NAMEU=name.upper(), LABELU=label.upper(), NAME=name, LABEL=label,
                            CAM=(f"   Webcam: put your camera at X={cam[0]} Y={cam[1]} width={cam[2]} height={cam[3]} (1920 x 1080 canvas).\n" if cam else ''))
        files = {'overlay.html': html, 'styles.css': css, 'overlay.js': js, 'fields.json': json.dumps(F, indent=2, ensure_ascii=False),
                 'START-HERE.txt': help_, 'scene.json': json.dumps({'id': sid, 'label': label, 'cam': cam[:4] if cam else None}, indent=2)}
        for f, t in files.items():
            with open(os.path.join(d, f), 'w', encoding='utf-8') as fh: fh.write(t)
    print('scenes made for', name)
