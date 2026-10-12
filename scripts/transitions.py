"""Scene transitions: a themed cover that wipes away when a scene appears (page load).
In OBS, tick "Refresh browser when scene becomes active" on the overlay's Browser Source, and use a short
Fade (about 300 ms) as the OBS transition: the old scene fades into the overlay's transition, which then reveals
the new scene. Everything is plain CSS (no video files), using the overlay's own colours:
  --sx-a  bright/accent colour     --sx-b  main panel colour     --sx-c  text colour
Only long-supported CSS is used, because OBS's built-in browser can be older than desktop Chrome."""
import random

BASE_CSS = """
/* ---- scene transition: plays once when the scene appears (switch it off with "Show scene transition") ---- */
.sx{position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147480000;pointer-events:none}
.sx-in{--d:1.7s;position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;animation:sx-gone .01s linear 1.7s forwards}
.sx .sx-in *{position:absolute;animation-delay:var(--d,0s)}
.sx-name{left:0;right:0;top:50%;margin-top:-50px;height:100px;line-height:100px;text-align:center;white-space:nowrap;overflow:hidden;
  font-family:var(--font-display,Impact,Arial,sans-serif);font-size:76px;letter-spacing:.06em;text-transform:uppercase;color:var(--sx-c);
  text-shadow:0 4px 16px rgba(0,0,0,.45);animation:sx-name .9s ease forwards;z-index:5;--d:0s}
.hide-transition .sx{display:none!important}
@keyframes sx-gone{to{visibility:hidden}}
@keyframes sx-name{0%,40%{opacity:1;transform:scale(1)}65%,100%{opacity:0;transform:scale(1.08)}}
"""

def _cells():
    out = []
    for y in range(9):
        for x in range(16):
            c = 'var(--sx-a)' if (x + y) % 2 else 'var(--sx-b)'
            out.append(f'<i class="sx-px" style="left:{x*120}px;top:{y*120}px;background:{c};--d:{0.42 + (x + y) * 0.022:.3f}s"></i>')
    return ''.join(out)

def _strips():
    random.seed(4); out = []
    for i in range(12):
        side = 'l' if i % 2 else 'r'
        out.append(f'<i class="sx-gl {side}" style="top:{i*90}px;--d:{0.45 + random.random() * 0.25:.2f}s"></i>')
    return ''.join(out)

NAME = '<b class="sx-name" data-field="name">Your cool name</b>'
STYLES = {
'bands': ('<i class="sx-band b1" style="--d:.45s"></i><i class="sx-band b2" style="--d:.52s"></i><i class="sx-band b3" style="--d:.59s"></i>' + NAME, """
.sx-band{top:-12%;bottom:-12%;transform:skewX(-14deg);animation:sx-band .7s cubic-bezier(.7,0,.3,1) forwards}
.sx-band.b1{left:-12%;width:52%;background:var(--sx-b)}
.sx-band.b2{left:36%;width:30%;background:var(--sx-a)}
.sx-band.b3{left:62%;width:60%;background:var(--sx-b)}
@keyframes sx-band{to{transform:skewX(-14deg) translateX(240%)}}
"""),
'curtain': ('<i class="sx-cur l" style="--d:.5s"></i><i class="sx-cur r" style="--d:.5s"></i>' + NAME, """
.sx-cur{top:0;bottom:0;width:51%;animation:sx-cur-l .85s cubic-bezier(.65,0,.35,1) forwards;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 22px,transparent 22px 48px,rgba(0,0,0,.35) 48px 74px,transparent 74px 96px),var(--sx-b)}
.sx-cur.l{left:0;box-shadow:inset -12px 0 0 var(--sx-a),inset -16px 0 0 rgba(0,0,0,.5)}
.sx-cur.r{right:0;animation-name:sx-cur-r;box-shadow:inset 12px 0 0 var(--sx-a),inset 16px 0 0 rgba(0,0,0,.5)}
@keyframes sx-cur-l{to{transform:translateX(-104%)}}
@keyframes sx-cur-r{to{transform:translateX(104%)}}
"""),
'iris': ('<i class="sx-iris" style="--d:.45s"></i>' + NAME, """
.sx-iris{left:50%;top:50%;width:0;height:0;border-radius:50%;
  box-shadow:0 0 0 6px var(--sx-a),0 0 40px 18px var(--sx-a),0 0 0 2600px var(--sx-b);animation:sx-iris .85s cubic-bezier(.6,0,.4,1) forwards}
@keyframes sx-iris{to{width:2400px;height:2400px;margin:-1200px 0 0 -1200px}}
"""),
'pixels': (_cells() + NAME, """
.sx-px{width:121px;height:121px;animation:sx-px .3s steps(3) forwards}
@keyframes sx-px{to{transform:scale(0)}}
"""),
'glitch': (_strips() + '<i class="sx-scan"></i>' + NAME, """
.sx-gl{left:0;width:1920px;height:91px;background:var(--sx-b);box-shadow:inset 0 -3px 0 var(--sx-a);animation:sx-gl-l .38s steps(4) forwards}
.sx-gl.r{animation-name:sx-gl-r}
.sx-scan{left:0;top:0;width:1920px;height:1080px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 2px,transparent 2px 5px);animation:sx-fade .2s linear forwards;--d:.6s}
@keyframes sx-gl-l{40%{transform:translateX(-3%)}100%{transform:translateX(-106%)}}
@keyframes sx-gl-r{40%{transform:translateX(3%)}100%{transform:translateX(106%)}}
@keyframes sx-fade{to{opacity:0}}
"""),
'shutter': ('<i class="sx-sh t" style="--d:.5s"></i><i class="sx-sh b" style="--d:.5s"></i>' + NAME, """
.sx-sh{left:0;width:1920px;height:541px;animation:sx-up .6s cubic-bezier(.7,0,.3,1) forwards;
  background:repeating-linear-gradient(-45deg,rgba(0,0,0,.22) 0 22px,transparent 22px 44px),var(--sx-b)}
.sx-sh.t{top:0;border-bottom:10px solid var(--sx-a)}
.sx-sh.b{bottom:0;border-top:10px solid var(--sx-a);animation-name:sx-down}
.sx-sh~.sx-name{margin-top:-180px}
@keyframes sx-up{to{transform:translateY(-104%)}}
@keyframes sx-down{to{transform:translateY(104%)}}
"""),
'splat': ('<i class="sx-blob" style="left:-260px;top:-300px;background:var(--sx-a);--d:.45s"></i><i class="sx-blob" style="left:520px;top:-380px;background:var(--sx-b);--d:.5s"></i>'
          '<i class="sx-blob" style="left:1100px;top:-260px;background:var(--sx-a);--d:.55s"></i><i class="sx-blob" style="left:-300px;top:420px;background:var(--sx-b);--d:.52s"></i>'
          '<i class="sx-blob" style="left:440px;top:300px;background:var(--sx-a);--d:.58s"></i><i class="sx-blob" style="left:1180px;top:360px;background:var(--sx-b);--d:.48s"></i>' + NAME, """
.sx-blob{width:1100px;height:1050px;border-radius:52% 48% 57% 43%/48% 55% 45% 52%;animation:sx-drop .7s cubic-bezier(.6,0,.6,1) forwards}
@keyframes sx-drop{to{transform:translateY(160%) scaleY(1.25)}}
"""),
}

def block(style):
    html, css = STYLES[style]
    return html, BASE_CSS + css

# which style each overlay uses, and its colours: (style, --sx-a, --sx-b, --sx-c) as CSS values
FANCY = ('var(--accent)', 'var(--nameplate-bg)', 'var(--text)')
ORNATE = ('var(--metal)', 'var(--velvet)', 'var(--metal-hi)')
MAP = {
  'Bodycam': ('glitch', 'var(--red)', '#0c0a0a', 'var(--white)'),
  'The Choicer Voicer': ('curtain', 'var(--gold)', 'var(--stage-mid)', 'var(--gold-hot)'),
  'Clean Slate': ('bands',) + FANCY, 'Comic Pop': ('iris',) + FANCY, 'Cosy Cafe': ('bands',) + FANCY, 'Esports Pro': ('shutter',) + FANCY,
  'Frosted Glass': ('bands', 'var(--accent)', '#1d2433', 'var(--text)'), 'Neon Outline': ('glitch',) + FANCY, 'Pixel Quest': ('pixels',) + FANCY,
  'Soft Pastel': ('iris', 'var(--accent)', '#fdeff6', 'var(--accent)'), 'Sunset Wave': ('bands',) + FANCY, 'Terminal': ('glitch',) + FANCY,
  'Arcade Cabinet': ('pixels',) + FANCY, 'Aurora': ('bands',) + FANCY, 'Cyber Glitch': ('glitch',) + FANCY, 'Fantasy Quest': ('curtain',) + FANCY,
  'Holo Prism': ('bands',) + FANCY, 'Liquid Chrome': ('shutter',) + FANCY, 'Mecha Armor': ('shutter',) + FANCY, 'Starship HUD': ('glitch',) + FANCY,
  'Synthwave Horizon': ('bands',) + FANCY, 'VHS Horror': ('glitch',) + FANCY,
  'Heavenly Glory': ('iris', 'var(--metal-hi)', 'var(--velvet)', 'var(--metal-hi)'),
  'Rift Legends': ('iris', 'var(--magic)', 'var(--nameplate-bg)', 'var(--accent)'), 'Tactical Ops': ('shutter',) + FANCY,
  'Sunset Heist': ('bands', 'var(--accent)', '#000000', 'var(--text)'), 'Agent Protocol': ('shutter', 'var(--accent)', '#0f1923', 'var(--text)'),
  'Realm of Heroes': ('curtain',) + FANCY, 'Blockcraft': ('pixels', 'var(--accent)', 'var(--dirt)', 'var(--text)'),
  'Ink Turf': ('splat', 'var(--accent)', 'var(--ink-b)', 'var(--text)'),
}
def for_overlay(name, category):
    if name in MAP: return MAP[name]
    if category == 'Ornate': return ('curtain',) + ORNATE
    return ('bands',) + FANCY

FIELD = {'type': 'checkbox', 'label': 'Show scene transition (plays when the scene appears)', 'value': True, 'group': 'Show / hide'}

HELP_NOTE = """SCENE TRANSITION
This overlay plays a short transition in its own style when the scene appears.
In OBS: open the overlay's Browser Source properties and tick
"Refresh browser when scene becomes active". For the smoothest switch, set the
OBS scene transition to "Fade" at about 300 ms. Turn it off with
"Show scene transition" in the widget's Fields panel."""
