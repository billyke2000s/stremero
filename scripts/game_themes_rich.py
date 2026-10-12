"""Richer versions of four game themes (replacing the plain ones in game_themes.py by id).
Unofficial, style only: no logos, characters, official fonts or game art. Shapes are drawn here as SVG/CSS."""
import math, random
GF = 'https://fonts.googleapis.com/css2?family='

# ============================================================================================ Rift Legends (League of Legends)
RL_DEFS = ('<defs><linearGradient id="rl-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0e6d2"/><stop offset=".4" stop-color="#c8aa6e"/>'
           '<stop offset=".75" stop-color="#a07c3c"/><stop offset="1" stop-color="#5b4318"/></linearGradient>'
           '<radialGradient id="rl-gem" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#e4fffd"/><stop offset=".45" style="stop-color:var(--magic)"/>'
           '<stop offset="1" stop-color="#003c50"/></radialGradient></defs>')
def rl_corner(cls):
    return (f'<svg class="rl-corner {cls}" viewBox="0 0 90 90" aria-hidden="true">{RL_DEFS}'
            '<path d="M4 86 V26 L26 4 H86 V13 H30 L13 30 V86 Z" fill="url(#rl-gold)" stroke="#010a13" stroke-width="1.6"/>'
            '<path d="M21 86 V34 L34 21 H86" fill="none" stroke="#c8aa6e" stroke-width="1.4" opacity=".75"/>'
            '<path d="M40 13 H62 L58 18 H44 Z M13 40 V62 L18 58 V44 Z" fill="#c8aa6e" opacity=".9"/>'
            '<polygon points="24,7 34,13 34,25 24,31 14,25 14,13" fill="url(#rl-gem)" stroke="#f0e6d2" stroke-width="1.6"/>'
            '<polygon points="24,12 29,15 29,22 24,25 19,22 19,15" fill="none" stroke="#e4fffd" stroke-width=".8" opacity=".8"/></svg>')
RL_CREST = ('<svg class="rl-crest" viewBox="0 0 220 56" aria-hidden="true">' + RL_DEFS +
            '<path d="M110 6 L70 22 L18 20 L56 30 L14 40 L72 38 L110 50 L148 38 L206 40 L164 30 L202 20 L150 22 Z" fill="url(#rl-gold)" stroke="#010a13" stroke-width="1.5"/>'
            '<path d="M110 14 L82 26 L110 42 L138 26 Z" fill="#010a13" stroke="#c8aa6e" stroke-width="1.5"/>'
            '<polygon points="110,17 124,26 110,37 96,26" fill="url(#rl-gem)" stroke="#e4fffd" stroke-width="1"/></svg>')
RL_RING = ('<svg class="rl-ring" viewBox="0 0 120 120" aria-hidden="true">'
           '<circle cx="60" cy="60" r="54" fill="none" style="stroke:var(--accent)" stroke-width="1.5" stroke-dasharray="3 7"/>'
           '<circle cx="60" cy="60" r="46" fill="none" style="stroke:var(--magic)" stroke-width="2" stroke-dasharray="40 10 6 10" opacity=".85"/>'
           + ''.join(f'<rect x="58.5" y="2" width="3" height="9" style="fill:var(--accent)" transform="rotate({a} 60 60)"/>' for a in range(0, 360, 45)) + '</svg>')
def rl_blade(cls):
    return (f'<svg class="rl-blade {cls}" viewBox="0 0 70 130" aria-hidden="true">{RL_DEFS}'
            '<path d="M66 8 L30 30 L4 65 L30 100 L66 122 L52 92 L40 65 L52 38 Z" fill="url(#rl-gold)" stroke="#010a13" stroke-width="1.5"/>'
            '<path d="M58 30 L46 65 L58 100" fill="none" style="stroke:var(--magic)" stroke-width="2.5" opacity=".9"/></svg>')
random.seed(11)
RL_MOTES = ''.join(f'<i class="rl-mote" style="left:{random.choice([random.randint(560, 1400), random.randint(1480, 1900)])}px;'
                   f'animation-delay:-{random.uniform(0, 14):.1f}s;animation-duration:{random.uniform(9, 16):.1f}s"></i>' for _ in range(16))
RIFT = dict(
  id='riftlegends', name='Rift Legends', forGame='League of Legends', layout='classic',
  tags='league of legends lol moba rift summoner hextech gold teal fantasy esports',
  font=GF + 'Cinzel:wght@600;700;900&family=Barlow:wght@500;600;700&display=swap',
  fontBody="'Barlow',Arial,sans-serif", fontDisplay="'Cinzel',Georgia,serif",
  vars=[['--accent', 'Gold', '#c8aa6e'], ['--magic', 'Hextech glow', '#0ac8b9'], ['--text', 'Text', '#f0e6d2'], ['--cam-border', 'Webcam border', '#c8aa6e'],
        ['--nameplate-bg', 'Name plate', '#010a13f0'], ['--alert-bg', 'Alert box', '#010a13f2'], ['--chat-bg', 'Chat messages', '#010a13d9'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#0ac8b9'], ['--stat-bg', 'Latest boxes', '#010a13e6'],
        ['--goal-fill', 'Goal bar', '#0ac8b9'], ['--game-frame', 'Game window frame', '#c8aa6e']],
  labels={'follower': 'NEW SUMMONER', 'subscriber': 'LEGEND ASCENDS', 'gift': 'LOOT DROPPED', 'cheer': 'BUFF ACQUIRED', 'tip': 'GOLD EARNED', 'raid': 'ALLIES INCOMING'},
  chatTitle='ALL CHAT',
  screen=RL_MOTES,
  decor={'cam': rl_corner('tl') + rl_corner('tr') + rl_corner('bl') + rl_corner('br') + RL_CREST + '<i class="rl-energy"></i><i class="rl-energy b"></i>',
         'alert': rl_blade('l') + rl_blade('r') + '<i class="rl-sweep"></i>' + RL_RING, 'chat': '', 'stat': '<i class="rl-gemtop"></i>'},
  css={
'screen': """
.rl-mote{position:absolute;bottom:-10px;width:6px;height:6px;border-radius:50%;background:radial-gradient(circle,#e4fffd,var(--magic) 50%,transparent 72%);
  box-shadow:0 0 10px 2px var(--magic);opacity:0;animation:riftlegends-rise 12s linear infinite}
""",
'cam': """
.cam{--ring:5px;border:5px solid transparent;border-image:linear-gradient(135deg,#f0e6d2,var(--cam-border) 30%,#785a28 55%,var(--cam-border) 80%,#f0e6d2) 1;
  box-shadow:0 0 0 3px #010a13,0 0 0 6px var(--cam-border),0 0 0 8px #010a13,0 0 30px #0ac8b955,inset 0 0 0 2px #010a13}
.rl-corner{position:absolute;width:104px;height:104px;z-index:3;filter:drop-shadow(0 0 6px #0ac8b966)}
.rl-corner.tl{left:-22px;top:-22px}.rl-corner.tr{right:-22px;top:-22px;transform:scaleX(-1)}
.rl-corner.bl{left:-22px;bottom:-22px;transform:scaleY(-1)}.rl-corner.br{right:-22px;bottom:-22px;transform:scale(-1,-1)}
.rl-crest{position:absolute;left:50%;top:-48px;width:240px;height:62px;margin-left:-120px;z-index:4;filter:drop-shadow(0 3px 4px #000c)}
.rl-energy{position:absolute;left:90px;right:90px;top:-5px;height:3px;overflow:hidden;z-index:2}
.rl-energy.b{top:auto;bottom:-5px}
.rl-energy::after{content:"";position:absolute;top:0;bottom:0;width:90px;left:-90px;background:linear-gradient(90deg,transparent,#e4fffd,var(--magic),transparent);animation:riftlegends-run 3.2s linear infinite}
.rl-energy.b::after{animation-delay:-1.6s}
.nameplate{left:50%;bottom:-40px;transform:translateX(-50%);z-index:5;font:700 17px var(--font-display);letter-spacing:.16em;text-transform:uppercase;color:var(--text);
  background:linear-gradient(180deg,#0a1a24,var(--nameplate-bg));padding:8px 30px;border:2px solid var(--accent);
  clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%);box-shadow:inset 0 0 14px #0ac8b944}
""",
'alert': """
.alert{padding:18px 34px 18px 30px;border:2px solid var(--accent);overflow:visible;
  clip-path:polygon(18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px),0 18px);
  box-shadow:inset 0 0 0 4px #010a13,inset 0 0 0 5px #785a28,inset 0 0 50px #0ac8b926}
.rl-blade{position:absolute;top:50%;width:46px;height:86px;margin-top:-43px;z-index:2;filter:drop-shadow(0 0 6px #0ac8b955)}
.rl-blade.l{left:-6px}.rl-blade.r{right:-6px;transform:scaleX(-1)}
.rl-sweep{position:absolute;top:0;bottom:0;width:120px;left:-140px;background:linear-gradient(100deg,transparent,#f0e6d240,transparent);animation:riftlegends-sweep 2.8s ease-in-out infinite;pointer-events:none}
.rl-ring{position:absolute;left:30px;top:50%;width:92px;height:92px;margin:-46px 0 0 -12px;animation:riftlegends-spin 9s linear infinite;pointer-events:none}
.alert-icon{position:relative;width:68px;height:68px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);
  background:radial-gradient(circle,var(--magic) 0 22%,#0a323c 50%,var(--accent) 51% 56%,#010a13 57%);color:#f0e6d2;font-size:24px;text-shadow:0 0 8px var(--magic)}
.alert-kind{font:700 14px var(--font-display);letter-spacing:.3em;color:var(--magic)}
.alert-name{font:900 34px var(--font-display);letter-spacing:.04em;background:linear-gradient(180deg,#f0e6d2,#c8aa6e 60%,#785a28);-webkit-background-clip:text;background-clip:text;color:transparent}
.alert-detail{font:600 16px var(--font-body);color:#a09b8c}
""",
'chat': """
.chat-title{font:700 13px var(--font-display);letter-spacing:.32em;color:var(--accent);padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid;border-image:linear-gradient(90deg,#c8aa6e,transparent) 1}
.msg{position:relative;padding:8px 14px 8px 18px;font-size:18px;border-left:2px solid var(--accent)}
.msg::before{content:"";position:absolute;left:-6px;top:12px;width:10px;height:10px;transform:rotate(45deg);background:var(--magic);box-shadow:0 0 6px var(--magic)}
.msg-head{font:600 15px var(--font-body)}
.msg-role{background:var(--accent);color:#010a13}
""",
'latest': """
.stat{padding:12px 16px 11px;border:1px solid #c8aa6e88;clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%,0 10px);
  background-image:linear-gradient(180deg,#c8aa6e33,transparent 40%);box-shadow:inset 0 2px 0 var(--accent)}
.rl-gemtop{position:absolute;left:50%;top:-1px;width:16px;height:9px;margin-left:-8px;background:var(--magic);clip-path:polygon(0 0,100% 0,50% 100%);box-shadow:0 0 8px var(--magic)}
.stat label{font:700 11px var(--font-display);letter-spacing:.2em;color:var(--accent)}
.stat strong{font:600 19px var(--font-body);margin-top:3px}
.goal-track{height:7px;border-radius:0;background:#010a13;border:1px solid #785a28}
#goal-fill{border-radius:0;box-shadow:0 0 10px var(--magic)}
"""},
  keyframes='@keyframes riftlegends-sweep{0%{left:-140px}60%,100%{left:110%}}@keyframes riftlegends-spin{to{transform:rotate(360deg)}}'
            '@keyframes riftlegends-run{to{left:100%}}@keyframes riftlegends-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-700px);opacity:0}}',
)

# ============================================================================================ Tactical Ops (Counter-Strike)
TO_RADAR = ('<div class="to-radar"><svg viewBox="0 0 200 200" aria-hidden="true">'
            '<circle cx="100" cy="100" r="96" fill="#0f1a12cc" stroke="#f0b42999" stroke-width="2"/>'
            '<circle cx="100" cy="100" r="64" fill="none" stroke="#f0b42944" stroke-width="1.5"/><circle cx="100" cy="100" r="32" fill="none" stroke="#f0b42944" stroke-width="1.5"/>'
            '<path d="M100 4 V196 M4 100 H196" stroke="#f0b42933" stroke-width="1.5"/>'
            '<path d="M40 60 h40 v30 h-40z M120 120 h44 v26 h-44z M118 40 h30 v50 h-30z" fill="#f0b42918" stroke="#f0b42955"/>'
            '<circle cx="132" cy="70" r="4" fill="#5d79ae"/><circle cx="70" cy="132" r="4" fill="#5d79ae"/><circle cx="150" cy="140" r="4" fill="#e04848"/>'
            '<path d="M100 92 L106 108 L100 104 L94 108 Z" fill="#fff"/></svg><i class="to-sweep"></i><b>RADAR</b></div>')
TO_SCREW = '<i class="to-screw" style="top:{t}"></i>'
TO_HEADING = ('<div class="to-heading">' + ''.join(f'<span>{x}</span>' for x in ['NW', '330', '345', 'N', '15', '30', 'NE', '60', '75', 'E']) + '</div>')
TO_RETICLE = ('<svg class="to-reticle" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" fill="none" style="stroke:var(--accent)" stroke-width="3"/>'
              '<path d="M32 2 V18 M32 46 V62 M2 32 H18 M46 32 H62" style="stroke:var(--accent)" stroke-width="3"/><circle cx="32" cy="32" r="3" fill="#ff4d4d"/></svg>')
TACTICAL = dict(
  id='tacticalops', name='Tactical Ops', forGame='Counter-Strike', layout='topbar',
  tags='counter-strike counter strike cs cs2 csgo fps tactical shooter military esports hud radar',
  font=GF + 'Saira+Stencil+One&family=Saira+Condensed:wght@500;600;700;800&display=swap',
  fontBody="'Saira Condensed',Arial,sans-serif", fontDisplay="'Saira Stencil One',Impact,sans-serif",
  vars=[['--accent', 'HUD yellow', '#f0b429'], ['--text', 'Text', '#f1f1ee'], ['--cam-border', 'Webcam border', '#f0b429'],
        ['--nameplate-bg', 'Name plate', '#101318f0'], ['--alert-bg', 'Alert box', '#101318e6'], ['--chat-bg', 'Chat messages', '#101318cc'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#8fb3ff'], ['--stat-bg', 'Latest boxes', '#101318d9'],
        ['--goal-fill', 'Goal bar', '#f0b429'], ['--team', 'Team colour', '#5d79ae'], ['--steel', 'Steel plates', '#3b424c'], ['--game-frame', 'Game window frame', '#f0b429']],
  labels={'follower': 'NEW RECRUIT', 'subscriber': 'SQUAD MEMBER', 'gift': 'GEAR DROPPED', 'cheer': 'HEADSHOT!', 'tip': 'BOUNTY PAID', 'raid': 'SQUAD INCOMING'},
  chatTitle='TEAM CHAT',
  screen=TO_RADAR,
  decor={'cam': ('<i class="to-cr tl"></i><i class="to-cr tr"></i><i class="to-cr bl"></i><i class="to-cr br"></i>'
                 '<div class="to-plate l">' + ''.join(TO_SCREW.format(t=t) for t in ('10px', 'calc(100% - 22px)')) + '<b>CAM-01</b></div>'
                 '<div class="to-plate r">' + ''.join(TO_SCREW.format(t=t) for t in ('10px', 'calc(100% - 22px)')) + '<em></em><em></em><em></em><em></em></div>'
                 + TO_HEADING + '<i class="to-rec">● REC</i><i class="to-tick t"></i><i class="to-tick b"></i><i class="to-tick l"></i><i class="to-tick r"></i>'),
         'alert': TO_RETICLE + '<i class="to-hz"></i><i class="to-kill"></i>', 'chat': '', 'stat': '<i class="to-ammo"></i>'},
  css={
'screen': """
.to-radar{position:absolute;left:48px;top:140px;width:220px;height:220px}
.to-radar svg{position:absolute;inset:0;width:100%;height:100%}
.to-sweep{position:absolute;left:50%;top:50%;width:106px;height:106px;transform-origin:0 0;border-radius:0 0 106px 0;
  background:conic-gradient(from 90deg at 0 0,#f0b42955,transparent 70deg);animation:tacticalops-sweep 3.6s linear infinite}
.to-radar b{position:absolute;left:0;right:0;bottom:-24px;text-align:center;font:700 13px var(--font-body);letter-spacing:.3em;color:var(--accent)}
""",
'cam': """
.cam{--ring:3px;border:2px solid #f1f1ee33;box-shadow:0 0 0 1px #000a,0 10px 30px #0009}
.to-cr{position:absolute;width:38px;height:38px;border:5px solid var(--cam-border);z-index:2}
.to-cr.tl{left:-9px;top:-9px;border-right:0;border-bottom:0}.to-cr.tr{right:-9px;top:-9px;border-left:0;border-bottom:0}
.to-cr.bl{left:-9px;bottom:-9px;border-right:0;border-top:0}.to-cr.br{right:-9px;bottom:-9px;border-left:0;border-top:0}
.to-tick{position:absolute;background:var(--cam-border);opacity:.85}
.to-tick.t{left:50%;top:-12px;width:3px;height:16px;margin-left:-1px}.to-tick.b{left:50%;bottom:-12px;width:3px;height:16px;margin-left:-1px}
.to-tick.l{top:50%;left:-12px;height:3px;width:16px;margin-top:-1px}.to-tick.r{top:50%;right:-12px;height:3px;width:16px;margin-top:-1px}
.to-plate{position:absolute;top:24px;bottom:24px;width:26px;background:linear-gradient(90deg,#596270,var(--steel) 40%,#22272e);border:1px solid #000;box-shadow:inset 0 1px 0 #ffffff33}
.to-plate.l{left:-40px}.to-plate.r{right:-40px}
.to-screw{position:absolute;left:6px;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#d9dde3,#6b7480 60%,#2a2f36);box-shadow:0 1px 1px #000}
.to-screw::after{content:"";position:absolute;left:2px;right:2px;top:5px;height:2px;background:#2a2f36;transform:rotate(-35deg)}
.to-screw:first-child{margin-top:0}
.to-plate b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);font:12px var(--font-display);letter-spacing:.24em;color:var(--accent);white-space:nowrap}
.to-plate em{display:block;width:12px;height:8px;margin:0 auto 5px;background:var(--accent);opacity:.25}
.to-plate em:nth-of-type(1){margin-top:56px;opacity:.95}.to-plate em:nth-of-type(2){opacity:.8}.to-plate em:nth-of-type(3){opacity:.55}
.to-heading{position:absolute;left:60px;right:60px;bottom:-38px;height:24px;display:flex;justify-content:space-between;align-items:flex-end;
  font:600 13px/1 var(--font-body);color:#f1f1eebb;background:repeating-linear-gradient(90deg,#f1f1ee66 0 1px,transparent 1px 12px) bottom/100% 6px no-repeat}
.to-heading span{padding-bottom:9px}.to-heading span:nth-child(4){color:var(--accent);font-weight:800}
.to-rec{position:absolute;right:0;top:-32px;font:700 15px var(--font-body);letter-spacing:.14em;color:#ff4d4d;font-style:normal;text-shadow:0 1px 2px #000;animation:tacticalops-blink 1.6s steps(1) infinite}
.nameplate{left:-9px;top:-48px;font:20px var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:#101318;background:var(--accent);padding:5px 18px 4px;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)}
""",
'alert': """
.alert{padding:14px 26px 14px 92px;border-left:6px solid #ff4d4d;overflow:hidden;box-shadow:0 8px 24px #000a;
  background-image:linear-gradient(90deg,#ff4d4d22,transparent 40%)}
.to-reticle{position:absolute;left:20px;top:50%;width:56px;height:56px;margin-top:-28px;animation:tacticalops-aim 2.4s ease-in-out infinite}
.to-hz{position:absolute;left:0;right:0;top:0;height:5px;background:repeating-linear-gradient(-45deg,var(--accent) 0 10px,#101318 10px 20px)}
.to-kill{position:absolute;right:16px;top:50%;width:34px;height:34px;margin-top:-17px;border:3px solid #ff4d4d;border-radius:50%;opacity:.8}
.to-kill::before,.to-kill::after{content:"";position:absolute;left:50%;top:50%;width:22px;height:3px;margin:-1.5px 0 0 -11px;background:#ff4d4d;transform:rotate(45deg)}
.to-kill::after{transform:rotate(-45deg)}
.alert-icon{display:none}
.alert-kind{font:700 15px var(--font-body);letter-spacing:.3em;color:#ff4d4d}
.alert-name{font:34px var(--font-display);letter-spacing:.06em;text-transform:uppercase}
.alert-detail{font:700 17px var(--font-body);color:#7ee07e;letter-spacing:.04em}
""",
'chat': """
.chat-title{font:16px var(--font-display);letter-spacing:.2em;color:var(--accent);margin-bottom:8px}
.msg{padding:6px 12px;font:600 19px var(--font-body);border-left:3px solid var(--team);background-image:linear-gradient(90deg,#5d79ae22,transparent 60%)}
.msg-user::before{content:"(Team) ";color:var(--team);font-weight:600}
.msg-head{font:700 16px var(--font-body);letter-spacing:.04em}
.msg-role{background:var(--accent);color:#101318;border-radius:0}
""",
'latest': """
.stat{padding:8px 14px 9px;border-bottom:3px solid var(--accent);clip-path:polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px));
  background-image:linear-gradient(180deg,#ffffff0d,transparent)}
.to-ammo{position:absolute;right:10px;top:10px;width:30px;height:10px;background:repeating-linear-gradient(90deg,var(--accent) 0 3px,transparent 3px 6px);opacity:.6}
.stat label{font:700 12px var(--font-body);letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.stat strong{font:700 20px var(--font-body);letter-spacing:.02em}
.goal-track{height:8px;border-radius:0;background:repeating-linear-gradient(90deg,#f1f1ee22 0 7px,transparent 7px 9px)}
#goal-fill{border-radius:0;background:repeating-linear-gradient(90deg,var(--goal-fill) 0 7px,transparent 7px 9px)}
"""},
  keyframes='@keyframes tacticalops-blink{0%{opacity:1}50%{opacity:.25}}@keyframes tacticalops-sweep{to{transform:rotate(360deg)}}'
            '@keyframes tacticalops-aim{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(45deg) scale(.86)}}',
)

# ============================================================================================ Sunset Heist (GTA V)
def palm(x, h, flip):
    s = -1 if flip else 1
    fronds = ''.join(f'<path d="M0 0 Q{s*a*0.6:.0f} {-40 + b} {s*a:.0f} {b}" />' for a, b in ((120, 20), (90, 40), (130, -10), (70, 60), (60, -40), (110, 50)))
    fronds += ''.join(f'<path d="M0 0 Q{-s*a*0.6:.0f} {-40 + b} {-s*a:.0f} {b}" />' for a, b in ((100, 30), (70, 55), (110, -5), (55, -35)))
    return (f'<g transform="translate({x} 1080)"><path d="M0 0 Q{s*14} {-h*0.5:.0f} {s*30} {-h}" fill="none" stroke="#0b0710" stroke-width="16" stroke-linecap="round"/>'
            f'<g transform="translate({s*30} {-h})" fill="none" stroke="#0b0710" stroke-width="13" stroke-linecap="round">{fronds}</g></g>')
random.seed(5)
_bx, SKY = 0, []
while _bx < 1920:
    w = random.randint(40, 110); h = random.randint(30, 120)
    if _bx + w < 20 or _bx > 540: SKY.append(f'<rect x="{_bx}" y="{1080 - h}" width="{w}" height="{h}"/>')   # keep the webcam clear
    _bx += w + random.randint(-6, 4)
SH_SCREEN = ('<svg class="sh-city" viewBox="0 0 1920 1080" preserveAspectRatio="none" aria-hidden="true">'
             '<defs><linearGradient id="sh-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3d" stop-opacity="0"/>'
             '<stop offset=".6" stop-color="#ff3e8a" stop-opacity=".25"/><stop offset="1" stop-color="#ff8a3d" stop-opacity=".55"/></linearGradient></defs>'
             '<rect x="540" y="860" width="1380" height="220" fill="url(#sh-glow)"/>'
             '<g fill="#0b0710" opacity=".85">' + ''.join(SKY) + '</g>' + palm(1700, 330, False) + palm(1835, 260, True) + palm(1585, 210, False) + '</svg>')
SUNSET = dict(
  id='sunsetheist', name='Sunset Heist', forGame='GTA V', layout='rail',
  tags='gta gta v gta 5 grand theft auto rp roleplay open world crime heist sunset city phone',
  font=GF + 'Anton&family=Chakra+Petch:wght@500;600;700&display=swap',
  fontBody="'Chakra Petch',Arial,sans-serif", fontDisplay="'Anton',Impact,sans-serif",
  vars=[['--accent', 'Accent pink', '#ff3e8a'], ['--sunset', 'Sunset orange', '#ff8a3d'], ['--text', 'Text', '#ffffff'], ['--cam-border', 'Phone body', '#141418'],
        ['--nameplate-bg', 'Name plate', '#000000d9'], ['--alert-bg', 'Alert band', '#000000cc'], ['--chat-bg', 'Chat messages', '#2a2a30e6'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#ffb347'], ['--stat-bg', 'Latest boxes', '#000000a6'],
        ['--goal-fill', 'Goal bar', '#3ddc84'], ['--cash', 'Cash green', '#3ddc84'], ['--game-frame', 'Game window frame', '#ffffff']],
  labels={'follower': 'NEW CREW MEMBER', 'subscriber': 'MADE IT BIG', 'gift': 'CARE PACKAGE', 'cheer': 'CASH BONUS', 'tip': 'PAYDAY', 'raid': 'THE CREW ROLLS IN'},
  chatTitle='MESSAGES',
  screen=SH_SCREEN,
  decor={'cam': ('<i class="sh-btn v1"></i><i class="sh-btn v2"></i><i class="sh-btn pw"></i><i class="sh-lens"></i><i class="sh-speaker"></i>'
                 '<i class="sh-glare"></i><i class="sh-stars">★★★★★</i>'),
         'alert': '<i class="sh-band"></i>', 'chat': '', 'stat': ''},
  css={
'screen': """
.sh-city{position:absolute;left:0;top:0;width:1920px;height:1080px}
""",
'cam': """
.cam{--ring:20px;border:20px solid var(--cam-border);border-radius:38px;
  box-shadow:0 0 0 2px #3a3a44,0 0 0 4px #0008,inset 0 0 0 2px #000,0 20px 40px #000c}
.sh-btn{position:absolute;height:5px;background:linear-gradient(#55555f,#26262c);border-radius:3px 3px 0 0}
.sh-btn.v1{top:-27px;left:70px;width:44px}.sh-btn.v2{top:-27px;left:124px;width:44px}.sh-btn.pw{top:-27px;right:90px;width:60px}
.sh-lens{position:absolute;left:-14px;top:50%;width:9px;height:9px;margin-top:-4px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#4a6ad0,#0a0a12 70%)}
.sh-speaker{position:absolute;right:-13px;top:50%;width:4px;height:46px;margin-top:-23px;border-radius:3px;background:#2a2a32}
.sh-glare{position:absolute;inset:0;border-radius:18px;pointer-events:none;box-shadow:inset 0 0 0 1px #ffffff14}
.sh-stars{position:absolute;right:4px;top:-62px;font:30px/1 Arial,sans-serif;letter-spacing:4px;color:#ffffff38;font-style:normal;text-shadow:0 2px 3px #000}
.sh-stars::first-letter{color:#fff}
.nameplate{left:6px;top:-66px;font:30px var(--font-display);letter-spacing:.05em;text-transform:uppercase;color:#fff;background:none;padding:0;
  text-shadow:3px 3px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
""",
'alert': """
.alert{padding:12px 40px;justify-content:center;text-align:center;background:linear-gradient(90deg,transparent,var(--alert-bg) 18%,var(--alert-bg) 82%,transparent);overflow:visible}
.sh-band{position:absolute;left:12%;right:12%;bottom:0;height:3px;background:linear-gradient(90deg,transparent,var(--sunset),var(--accent),transparent)}
.alert-icon{display:none}
.alert-copy{text-align:center}
.alert-kind{font:44px/1 var(--font-display);letter-spacing:.03em;color:#ffcc33;text-transform:uppercase;
  text-shadow:3px 3px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,0 0 18px #ff8a3d88}
.alert-name{font:30px var(--font-display);letter-spacing:.04em;text-transform:uppercase;color:#fff;margin-top:4px;text-shadow:2px 2px 0 #000}
.alert-detail{font:700 16px var(--font-body);color:var(--cash);letter-spacing:.06em;text-transform:uppercase}
""",
'chat': """
.chat-title{font:22px var(--font-display);letter-spacing:.1em;color:#fff;text-shadow:2px 2px 0 #000;margin-bottom:8px}
.msg{padding:8px 14px;font:600 18px var(--font-body);border-radius:18px 18px 18px 4px;box-shadow:0 2px 6px #0007}
.msg:nth-child(odd){background:#2f6fe8e6;border-radius:18px 18px 4px 18px}
.msg-head{font:700 15px var(--font-body)}
.msg-role{background:var(--accent);color:#fff;border-radius:8px}
""",
'latest': """
.stat{padding:6px 14px 8px;text-align:right;background:linear-gradient(270deg,var(--stat-bg),transparent)}
.stat label{font:600 12px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:#ffffffbb}
.stat strong{font:26px/1.1 var(--font-display);letter-spacing:.03em;color:#fff;text-shadow:2px 2px 0 #000,-1px -1px 0 #000}
.goal strong,#goal-count{color:var(--cash)}
.goal-track{height:8px;border-radius:0;background:#ffffff26}
#goal-fill{border-radius:0}
"""},
  keyframes='',
)

# ============================================================================================ Realm of Heroes (World of Warcraft)
RH_BOSS = ('<svg class="rh-boss {c}" viewBox="0 0 60 60" aria-hidden="true"><defs><radialGradient id="rh-g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3c4"/>'
           '<stop offset=".45" style="stop-color:var(--accent)"/><stop offset="1" stop-color="#5a3d0e"/></radialGradient>'
           '<radialGradient id="rh-j" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffd1d1"/><stop offset=".5" style="stop-color:var(--gem)"/><stop offset="1" stop-color="#3a0606"/></radialGradient></defs>'
           '<path d="M30 2 L38 12 L52 8 L48 22 L58 30 L48 38 L52 52 L38 48 L30 58 L22 48 L8 52 L12 38 L2 30 L12 22 L8 8 L22 12 Z" fill="url(#rh-g)" stroke="#2a1a06" stroke-width="1.5"/>'
           '<circle cx="30" cy="30" r="10" fill="url(#rh-j)" stroke="#2a1a06" stroke-width="1.5"/></svg>')
RH_CREST = ('<svg class="rh-crest" viewBox="0 0 120 110" aria-hidden="true"><defs><linearGradient id="rh-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8e8ee"/><stop offset="1" stop-color="#7a7d88"/></linearGradient>'
            '<linearGradient id="rh-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" style="stop-color:var(--accent)"/><stop offset="1" stop-color="#6b4e1a"/></linearGradient></defs>'
            '<path d="M14 14 L106 96 M106 14 L14 96" stroke="url(#rh-s)" stroke-width="8" stroke-linecap="round"/>'
            '<path d="M8 8 h14 v6 h-14z M98 8 h14 v6 h-14z" fill="url(#rh-g2)"/>'
            '<path d="M60 10 L92 22 V54 Q92 84 60 102 Q28 84 28 54 V22 Z" fill="#3a0d12" stroke="url(#rh-g2)" stroke-width="6"/>'
            '<path d="M60 26 L76 34 V54 Q76 72 60 84 Q44 72 44 54 V34 Z" fill="none" stroke="url(#rh-g2)" stroke-width="2.5" opacity=".9"/>'
            '<path d="M60 38 L64 50 L76 50 L66 57 L70 69 L60 62 L50 69 L54 57 L44 50 L56 50 Z" fill="url(#rh-g2)"/></svg>')
REALM = dict(
  id='realmofheroes', name='Realm of Heroes', forGame='World of Warcraft', layout='rail',
  tags='world of warcraft wow mmo mmorpg fantasy quest raid guild azeroth gold stone parchment',
  font=GF + 'Cinzel:wght@700;900&family=Spectral:wght@500;600;700&display=swap',
  fontBody="'Spectral',Georgia,serif", fontDisplay="'Cinzel',Georgia,serif",
  vars=[['--accent', 'Gold trim', '#d4a83a'], ['--stone', 'Stone', '#5d5a55'], ['--gem', 'Gems', '#c0222e'], ['--text', 'Text', '#f8ecc8'],
        ['--cam-border', 'Webcam border', '#d4a83a'], ['--nameplate-bg', 'Name plate', '#1a1209f2'], ['--parchment', 'Quest scroll', '#efdcac'],
        ['--chat-bg', 'Chat messages', '#0d0904d9'], ['--chat-name', 'Chat names (no Twitch colour)', '#a335ee'], ['--guild', 'Guild chat text', '#40ff40'],
        ['--stat-bg', 'Latest boxes', '#140e07eb'], ['--goal-fill', 'Goal bar', '#8e2bd9'], ['--quest', 'Quest yellow', '#ffd100'], ['--game-frame', 'Game window frame', '#d4a83a']],
  labels={'follower': 'QUEST ACCEPTED', 'subscriber': 'LEVEL UP!', 'gift': 'LOOT ROLLED', 'cheer': 'ACHIEVEMENT EARNED', 'tip': 'GOLD LOOTED', 'raid': 'A RAID GROUP ARRIVES'},
  chatTitle='GUILD CHAT',
  decor={'cam': ('<i class="rh-stone"></i>' + RH_BOSS.format(c='tl') + RH_BOSS.format(c='tr') + RH_BOSS.format(c='bl') + RH_BOSS.format(c='br') + RH_CREST),
         'alert': '<i class="rh-roll l"></i><i class="rh-roll r"></i>', 'chat': '', 'stat': ''},
  css={
'cam': """
.cam{--ring:3px;border:0;box-shadow:0 0 0 3px var(--cam-border),inset 0 0 0 1px #000}
.rh-stone{position:absolute;inset:-26px;padding:23px;border-radius:6px;pointer-events:none;
  background:radial-gradient(circle at 20% 30%,#ffffff14 0 2px,transparent 3px) 0 0/23px 19px,radial-gradient(circle at 70% 60%,#00000033 0 3px,transparent 4px) 0 0/31px 27px,
  linear-gradient(135deg,#7d7a74,var(--stone) 40%,#3e3c38);
  box-shadow:inset 0 2px 0 #ffffff26,inset 0 -3px 0 #0006,0 0 0 2px var(--cam-border),0 0 0 4px #1a1209,0 14px 30px #000c;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.rh-boss{position:absolute;width:46px;height:46px;z-index:3;filter:drop-shadow(0 2px 3px #000)}
.rh-boss.tl{left:-38px;top:-38px}.rh-boss.tr{right:-38px;top:-38px}.rh-boss.bl{left:-38px;bottom:-38px}.rh-boss.br{right:-38px;bottom:-38px}
.rh-crest{position:absolute;left:50%;top:-86px;width:96px;height:88px;margin-left:-48px;z-index:4;filter:drop-shadow(0 4px 4px #000c)}
.nameplate{left:50%;bottom:-44px;transform:translateX(-50%);z-index:5;font:700 18px var(--font-display);letter-spacing:.1em;color:var(--quest);background:var(--nameplate-bg);
  padding:6px 26px;border:2px solid var(--accent);border-radius:4px;text-shadow:0 1px 2px #000;box-shadow:0 0 0 2px #1a1209,0 4px 10px #000a}
""",
'alert': """
.alert{padding:14px 64px;border-radius:2px;overflow:visible;color:#3a2410;
  background:radial-gradient(ellipse at 30% 40%,#fff6dc66,transparent 60%),radial-gradient(ellipse at 80% 70%,#b8955533,transparent 55%),linear-gradient(180deg,var(--parchment),#d8bd82);
  box-shadow:inset 0 0 22px #8a6a2c88,0 10px 26px #000b}
.rh-roll{position:absolute;top:-10px;bottom:-10px;width:30px;border-radius:15px;
  background:linear-gradient(90deg,#5a3a14,#c49a52 35%,#f2d898 50%,#a07434 70%,#4a2e0e);box-shadow:0 4px 8px #0008}
.rh-roll.l{left:-14px}.rh-roll.r{right:-14px}
.alert-icon{width:58px;height:58px;border-radius:50%;color:#ffd7b0;font-size:24px;
  background:radial-gradient(circle at 35% 30%,#e04a4a,#9c1414 55%,#5a0808);box-shadow:0 0 0 4px #9c141455,0 3px 4px #0007,inset 0 -3px 5px #0006}
.alert-kind{font:900 15px var(--font-display);letter-spacing:.18em;color:#8a1a10}
.alert-name{font:900 32px var(--font-display);color:#2a1606}
.alert-detail{font:italic 600 17px var(--font-body);color:#5a3a1a}
""",
'chat': """
.chat-title{font:900 15px var(--font-display);letter-spacing:.18em;color:var(--quest);margin-bottom:8px;text-shadow:0 1px 2px #000}
.msg{padding:6px 12px;font:600 18px var(--font-body);border-radius:3px;background-image:linear-gradient(90deg,#00000055,transparent)}
.msg-user::before{content:"[Guild] ";color:var(--guild)}
.msg-body{color:var(--guild)}
.msg-head{font:700 15px var(--font-body)}
.msg-role{background:var(--accent);color:#1a1209}
""",
'latest': """
.latest{counter-reset:slot}
.stat{counter-increment:slot;padding:9px 14px 9px 52px;border:2px solid var(--accent);border-radius:5px;
  background:linear-gradient(180deg,#2a1f12,var(--stat-bg));box-shadow:inset 0 0 0 2px #000,inset 0 0 14px #000,0 2px 6px #000a}
.stat::before{content:counter(slot);position:absolute;left:7px;top:50%;width:34px;height:34px;margin-top:-17px;display:grid;place-items:center;
  font:700 15px var(--font-display);color:#fff;border:2px solid #8a6a2c;border-radius:4px;background:radial-gradient(circle at 35% 30%,#4a3a22,#120c05);text-shadow:0 1px 2px #000}
.stat label{font:900 11px var(--font-display);letter-spacing:.16em;color:var(--quest)}
.stat strong{font:600 19px var(--font-body);margin-top:2px}
.goal-track{height:10px;border-radius:2px;background:#000;border:1px solid #d4a83a88}
#goal-fill{border-radius:0;background:linear-gradient(180deg,#c77dff,var(--goal-fill) 50%,#5a1590)}
"""},
  keyframes='',
)

REPLACE = {t['id']: t for t in (RIFT, TACTICAL, SUNSET, REALM)}
