"""Game-inspired overlay themes (unofficial, style only: no logos, characters, official fonts or game art).
Each theme is written once here; scripts/build-game-overlays.py turns it into the site folder AND the editor entry.
CSS is written plain; the builder scopes it for the editor automatically. Use ::before/::after freely, but no other
pseudo-classes, no @media, and prefix keyframe names with the theme id so they never clash."""

GF = 'https://fonts.googleapis.com/css2?family='

THEMES = [
# --------------------------------------------------------------------------------------------- League of Legends
dict(
  id='riftlegends', name='Rift Legends', forGame='League of Legends', layout='classic',
  tags='league of legends lol moba rift summoner hextech gold teal fantasy esports',
  font=GF + 'Cinzel:wght@600;700;900&family=Barlow:wght@500;600;700&display=swap',
  fontBody="'Barlow',Arial,sans-serif", fontDisplay="'Cinzel',Georgia,serif",
  vars=[['--accent', 'Gold', '#c8aa6e'], ['--text', 'Text', '#f0e6d2'], ['--cam-border', 'Webcam border', '#c8aa6e'],
        ['--nameplate-bg', 'Name plate', '#010a13f0'], ['--alert-bg', 'Alert box', '#010a13f2'], ['--chat-bg', 'Chat messages', '#010a13d9'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#0ac8b9'], ['--stat-bg', 'Latest boxes', '#010a13e0'],
        ['--goal-fill', 'Goal bar', '#0ac8b9'], ['--magic', 'Magic glow', '#0ac8b9'], ['--game-frame', 'Game window frame', '#c8aa6e']],
  labels={'follower': 'NEW SUMMONER', 'subscriber': 'LEGEND ASCENDS', 'gift': 'LOOT DROPPED', 'cheer': 'BUFF ACQUIRED',
          'tip': 'GOLD EARNED', 'raid': 'ALLIES INCOMING'},
  chatTitle='ALL CHAT',
  decor={'cam': '<i class="rl-gem tl"></i><i class="rl-gem tr"></i><i class="rl-gem bl"></i><i class="rl-gem br"></i><i class="rl-crest"></i>',
         'alert': '<i class="rl-sweep"></i>', 'chat': ''},
  css={
'cam': """
.cam{--ring:6px;border:2px solid var(--cam-border);outline:1px solid #c8aa6e66;outline-offset:5px;box-shadow:0 0 0 1px #010a13,0 0 24px #0ac8b933,inset 0 0 0 1px #785a28}
.rl-gem{position:absolute;width:16px;height:16px;transform:rotate(45deg);background:linear-gradient(135deg,#f0e6d2,#c8aa6e 45%,#785a28);border:2px solid #010a13;box-shadow:0 0 10px #0ac8b9aa;z-index:2}
.rl-gem::after{content:"";position:absolute;inset:3px;background:var(--magic);box-shadow:0 0 6px var(--magic)}
.rl-gem.tl{left:-10px;top:-10px}.rl-gem.tr{right:-10px;top:-10px}.rl-gem.bl{left:-10px;bottom:-10px}.rl-gem.br{right:-10px;bottom:-10px}
.rl-crest{position:absolute;left:50%;top:-14px;width:120px;height:14px;margin-left:-60px;background:linear-gradient(90deg,transparent,#c8aa6e 30%,#f0e6d2 50%,#c8aa6e 70%,transparent);clip-path:polygon(0 100%,12% 0,88% 0,100% 100%)}
.nameplate{left:50%;bottom:-36px;transform:translateX(-50%);font:700 17px var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--text);background:var(--nameplate-bg);padding:7px 26px;border:1px solid var(--accent);clip-path:polygon(12px 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,12px 100%,0 50%);box-shadow:inset 0 0 12px #0ac8b933}
""",
'alert': """
.alert{padding:18px 30px;border:2px solid var(--accent);overflow:hidden;clip-path:polygon(18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px),0 18px);box-shadow:inset 0 0 0 4px #010a13,inset 0 0 0 5px #785a28,inset 0 0 40px #0ac8b922}
.rl-sweep{position:absolute;top:0;bottom:0;width:120px;left:-140px;background:linear-gradient(100deg,transparent,#f0e6d24d,transparent);animation:riftlegends-sweep 2.6s ease-in-out infinite;pointer-events:none}
.alert-icon{width:68px;height:68px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:radial-gradient(circle,#0ac8b9 0 22%,#0a323c 50%,#c8aa6e 51% 56%,#010a13 57%);color:#f0e6d2;font-size:24px;text-shadow:0 0 8px #0ac8b9}
.alert-kind{font:700 14px var(--font-display);letter-spacing:.28em;color:var(--magic)}
.alert-name{font:900 34px var(--font-display);letter-spacing:.04em;background:linear-gradient(180deg,#f0e6d2,#c8aa6e 60%,#785a28);-webkit-background-clip:text;background-clip:text;color:transparent}
.alert-detail{font:600 16px var(--font-body);color:#a09b8c}
""",
'chat': """
.chat-title{font:700 13px var(--font-display);letter-spacing:.32em;color:var(--accent);padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid;border-image:linear-gradient(90deg,#c8aa6e,transparent) 1}
.msg{padding:8px 14px;font-size:18px;border-left:2px solid var(--accent);box-shadow:inset 1px 0 0 #010a13}
.msg-head{font:600 15px var(--font-body)}
.msg-role{background:var(--accent);color:#010a13}
""",
'latest': """
.stat{padding:11px 16px;border:1px solid #c8aa6e88;box-shadow:inset 0 0 0 3px #010a13,inset 0 0 0 4px #785a2866}
.stat::before{content:"";position:absolute;left:50%;top:-6px;width:10px;height:10px;margin-left:-5px;transform:rotate(45deg);background:var(--accent);border:2px solid #010a13}
.stat label{font:700 11px var(--font-display);letter-spacing:.2em;color:var(--accent)}
.stat strong{font:600 19px var(--font-body);margin-top:3px}
.goal-track{height:7px;border-radius:0;background:#010a13;border:1px solid #785a28}
#goal-fill{border-radius:0;box-shadow:0 0 10px var(--magic)}
"""},
  keyframes='@keyframes riftlegends-sweep{0%{left:-140px}60%,100%{left:110%}}',
),
# --------------------------------------------------------------------------------------------- Counter-Strike
dict(
  id='tacticalops', name='Tactical Ops', forGame='Counter-Strike', layout='topbar',
  tags='counter-strike counter strike cs cs2 csgo fps tactical shooter military esports',
  font=GF + 'Saira+Stencil+One&family=Saira+Condensed:wght@500;600;700;800&display=swap',
  fontBody="'Saira Condensed',Arial,sans-serif", fontDisplay="'Saira Stencil One',Impact,sans-serif",
  vars=[['--accent', 'Accent', '#f0b429'], ['--text', 'Text', '#f1f1ee'], ['--cam-border', 'Webcam border', '#f0b429'],
        ['--nameplate-bg', 'Name plate', '#101318f0'], ['--alert-bg', 'Alert box', '#101318f2'], ['--chat-bg', 'Chat messages', '#101318cc'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#8fb3ff'], ['--stat-bg', 'Latest boxes', '#101318d9'],
        ['--goal-fill', 'Goal bar', '#f0b429'], ['--team', 'Team colour', '#5d79ae'], ['--game-frame', 'Game window frame', '#f0b429']],
  labels={'follower': 'NEW RECRUIT', 'subscriber': 'SQUAD MEMBER', 'gift': 'GEAR DROPPED', 'cheer': 'HEADSHOT!',
          'tip': 'BOUNTY PAID', 'raid': 'SQUAD INCOMING'},
  chatTitle='TEAM CHAT',
  decor={'cam': '<i class="to-cr tl"></i><i class="to-cr tr"></i><i class="to-cr bl"></i><i class="to-cr br"></i><i class="to-hz"></i><i class="to-rec">● LIVE</i>',
         'alert': '<i class="to-hz a"></i>', 'chat': ''},
  css={
'cam': """
.cam{--ring:3px;border:2px solid #f1f1ee33;box-shadow:0 0 0 1px #000a}
.to-cr{position:absolute;width:34px;height:34px;border:4px solid var(--cam-border);z-index:2}
.to-cr.tl{left:-8px;top:-8px;border-right:0;border-bottom:0}.to-cr.tr{right:-8px;top:-8px;border-left:0;border-bottom:0}
.to-cr.bl{left:-8px;bottom:-8px;border-right:0;border-top:0}.to-cr.br{right:-8px;bottom:-8px;border-left:0;border-top:0}
.to-hz{position:absolute;left:44px;right:44px;bottom:-14px;height:8px;background:repeating-linear-gradient(-45deg,var(--accent) 0 10px,#101318 10px 20px);opacity:.9}
.to-rec{position:absolute;right:0;top:-34px;font:700 14px var(--font-body);letter-spacing:.14em;color:#ff4d4d;font-style:normal;text-shadow:0 1px 2px #000;animation:tacticalops-blink 1.6s steps(1) infinite}
.nameplate{left:-8px;top:-46px;font:20px var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:#101318;background:var(--accent);padding:5px 16px 4px;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)}
""",
'alert': """
.alert{padding:16px 26px;border-left:6px solid var(--accent);overflow:hidden;box-shadow:0 8px 24px #000a}
.to-hz.a{left:0;right:0;top:0;bottom:auto;height:5px;opacity:1}
.alert-icon{width:58px;height:58px;color:#101318;background:var(--accent);font-size:28px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
.alert-kind{font:700 15px var(--font-body);letter-spacing:.3em;color:var(--accent)}
.alert-name{font:34px var(--font-display);letter-spacing:.06em;text-transform:uppercase}
.alert-detail{font:600 17px var(--font-body);color:#b9bcc4;letter-spacing:.04em}
""",
'chat': """
.chat-title{font:16px var(--font-display);letter-spacing:.2em;color:var(--accent);margin-bottom:8px}
.msg{padding:6px 12px;font:600 19px var(--font-body);border-left:3px solid var(--team)}
.msg-head{font:700 16px var(--font-body);letter-spacing:.04em}
.msg-role{background:var(--accent);color:#101318;border-radius:0}
""",
'latest': """
.stat{padding:8px 14px;border-bottom:3px solid var(--accent);clip-path:polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))}
.stat label{font:700 12px var(--font-body);letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
.stat strong{font:700 20px var(--font-body);letter-spacing:.02em}
.goal-track{height:8px;border-radius:0;background:repeating-linear-gradient(90deg,#f1f1ee22 0 7px,transparent 7px 9px)}
#goal-fill{border-radius:0;background:repeating-linear-gradient(90deg,var(--goal-fill) 0 7px,transparent 7px 9px)}
"""},
  keyframes='@keyframes tacticalops-blink{0%{opacity:1}50%{opacity:.25}}',
),
# --------------------------------------------------------------------------------------------- GTA V
dict(
  id='sunsetheist', name='Sunset Heist', forGame='GTA V', layout='rail',
  tags='gta gta v gta 5 grand theft auto rp roleplay open world crime heist sunset city',
  font=GF + 'Anton&family=Chakra+Petch:wght@500;600;700&display=swap',
  fontBody="'Chakra Petch',Arial,sans-serif", fontDisplay="'Anton',Impact,sans-serif",
  vars=[['--accent', 'Accent', '#ff3e8a'], ['--text', 'Text', '#ffffff'], ['--cam-border', 'Webcam border', '#ffffff'],
        ['--nameplate-bg', 'Name plate', '#000000d9'], ['--alert-bg', 'Alert box', '#000000d0'], ['--chat-bg', 'Chat messages', '#000000b3'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#ffb347'], ['--stat-bg', 'Latest boxes', '#000000bf'],
        ['--goal-fill', 'Goal bar', '#3ddc84'], ['--cash', 'Cash green', '#3ddc84'], ['--sunset', 'Sunset orange', '#ff8a3d'],
        ['--game-frame', 'Game window frame', '#ffffff']],
  labels={'follower': 'NEW CREW MEMBER', 'subscriber': 'MADE IT BIG', 'gift': 'CARE PACKAGE', 'cheer': 'CASH BONUS',
          'tip': 'PAYDAY', 'raid': 'THE CREW ROLLS IN'},
  chatTitle='MESSAGES',
  decor={'cam': '<i class="sh-stars">★★★★★</i><i class="sh-radar"><b></b></i><i class="sh-sun"></i>',
         'alert': '<i class="sh-band"></i>', 'chat': ''},
  css={
'cam': """
.cam{--ring:5px;border:5px solid var(--cam-border);box-shadow:0 0 0 2px #000,0 12px 30px #000b}
.sh-sun{position:absolute;left:-5px;right:-5px;bottom:-12px;height:7px;background:linear-gradient(90deg,var(--sunset),var(--accent),#7b3fe4)}
.sh-stars{position:absolute;right:0;top:-38px;font:28px/1 Arial,sans-serif;letter-spacing:4px;color:#ffffff40;font-style:normal;text-shadow:0 2px 3px #000}
.sh-stars::first-letter{color:#fff}
.sh-radar{position:absolute;right:-116px;bottom:-4px;width:92px;height:92px;border-radius:50%;border:4px solid #000;background:radial-gradient(circle,#3a4a3a 0 30%,#253025 31% 60%,#1a221a 61%);box-shadow:0 0 0 3px #ffffffcc,0 6px 14px #000a;overflow:hidden;z-index:2}
.sh-radar b{position:absolute;left:50%;top:50%;width:46px;height:46px;transform-origin:0 0;background:conic-gradient(from 0deg,#3ddc8466,transparent 60deg);animation:sunsetheist-sweep 3s linear infinite}
.sh-radar::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;background:#fff;clip-path:polygon(50% 0,100% 100%,50% 75%,0 100%)}
.nameplate{left:-5px;top:-44px;font:26px var(--font-display);letter-spacing:.06em;text-transform:uppercase;color:#fff;background:none;padding:0;text-shadow:3px 3px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
""",
'alert': """
.alert{padding:16px 28px;overflow:hidden;border-top:3px solid var(--sunset);box-shadow:0 10px 30px #000c}
.sh-band{position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,var(--sunset),var(--accent),#7b3fe4)}
.alert-icon{width:60px;height:60px;border-radius:50%;background:var(--cash);color:#000;font-size:28px;box-shadow:0 0 0 3px #000,0 0 0 5px #fff}
.alert-kind{font:22px var(--font-display);letter-spacing:.08em;color:var(--sunset);text-shadow:2px 2px 0 #000}
.alert-name{font:40px var(--font-display);letter-spacing:.03em;text-transform:uppercase;color:#fff;text-shadow:3px 3px 0 #000}
.alert-detail{font:700 17px var(--font-body);color:var(--cash)}
""",
'chat': """
.chat-title{font:20px var(--font-display);letter-spacing:.1em;color:#fff;text-shadow:2px 2px 0 #000;margin-bottom:8px}
.msg{padding:8px 14px;font:600 18px var(--font-body);border-radius:16px 16px 16px 4px}
.msg-head{font:700 15px var(--font-body)}
.msg-role{background:var(--accent);color:#fff;border-radius:8px}
""",
'latest': """
.stat{padding:9px 14px;border-left:4px solid var(--accent)}
.stat label{font:600 12px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:#ffffffaa}
.stat strong{font:22px var(--font-display);letter-spacing:.04em;color:#fff}
.goal-track{height:8px;border-radius:0;background:#ffffff26}
#goal-fill{border-radius:0}
#goal-count::before{content:"$ ";color:var(--cash)}
"""},
  keyframes='@keyframes sunsetheist-sweep{to{transform:rotate(360deg)}}',
),
# --------------------------------------------------------------------------------------------- Valorant
dict(
  id='agentprotocol', name='Agent Protocol', forGame='Valorant', layout='corner',
  tags='valorant val tactical shooter fps agent red esports riot',
  font=GF + 'Teko:wght@500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap',
  fontBody="'Barlow Condensed',Arial,sans-serif", fontDisplay="'Teko',Impact,sans-serif",
  vars=[['--accent', 'Accent', '#ff4655'], ['--text', 'Text', '#ece8e1'], ['--cam-border', 'Webcam border', '#ece8e1'],
        ['--nameplate-bg', 'Name plate', '#ff4655'], ['--alert-bg', 'Alert box', '#0f1923f2'], ['--chat-bg', 'Chat messages', '#0f1923d9'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#ff8c96'], ['--stat-bg', 'Latest boxes', '#0f1923e6'],
        ['--goal-fill', 'Goal bar', '#ff4655'], ['--ally', 'Second colour', '#17e5b4'], ['--game-frame', 'Game window frame', '#ff4655']],
  labels={'follower': 'AGENT RECRUITED', 'subscriber': 'CONTRACT SIGNED', 'gift': 'SUPPLY DROP', 'cheer': 'ULT READY',
          'tip': 'CREDITS RECEIVED', 'raid': 'SQUAD ENTERING'},
  chatTitle='TEAM COMMS',
  decor={'cam': '<i class="ap-slash"></i><i class="ap-ticks"></i><i class="ap-corner"></i>',
         'alert': '<i class="ap-bar"></i><i class="ap-bar b2"></i>', 'chat': ''},
  css={
'cam': """
.cam{--ring:4px;border:2px solid var(--cam-border);box-shadow:inset 0 0 0 2px #0f1923,0 0 0 1px #0f1923}
.ap-corner{position:absolute;right:-14px;top:-14px;width:44px;height:44px;background:linear-gradient(225deg,var(--accent) 0 50%,transparent 50%)}
.ap-slash{position:absolute;left:-14px;bottom:-14px;width:44px;height:44px;background:linear-gradient(45deg,var(--accent) 0 50%,transparent 50%)}
.ap-ticks{position:absolute;left:44px;bottom:-14px;width:90px;height:10px;background:repeating-linear-gradient(90deg,var(--cam-border) 0 3px,transparent 3px 9px);opacity:.8}
.nameplate{right:24px;bottom:-38px;font:600 22px/1 var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:#0f1923;background:var(--nameplate-bg);padding:9px 20px 5px;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}
""",
'alert': """
.alert{padding:14px 30px 14px 26px;overflow:hidden;clip-path:polygon(0 0,calc(100% - 26px) 0,100% 26px,100% 100%,26px 100%,0 calc(100% - 26px));border-left:5px solid var(--accent)}
.ap-bar{position:absolute;right:30px;top:0;width:6px;height:100%;background:var(--accent);transform:skewX(-20deg);opacity:.9}
.ap-bar.b2{right:46px;opacity:.45}
.alert-icon{width:58px;height:58px;color:#0f1923;background:var(--accent);font-size:26px;clip-path:polygon(25% 0,100% 0,75% 100%,0 100%)}
.alert-kind{font:700 15px var(--font-body);letter-spacing:.32em;color:var(--accent)}
.alert-name{font:600 46px/1 var(--font-display);letter-spacing:.04em;text-transform:uppercase;margin-top:4px}
.alert-detail{font:600 16px var(--font-body);letter-spacing:.06em;color:#ece8e1aa;text-transform:uppercase}
""",
'chat': """
.chat-title{font:600 22px/1 var(--font-display);letter-spacing:.18em;color:var(--text);margin-bottom:8px;padding-left:12px;border-left:4px solid var(--accent)}
.msg{padding:6px 12px;font:600 18px var(--font-body);border-left:2px solid #ece8e133}
.msg-head{font:700 15px var(--font-body);letter-spacing:.06em;text-transform:uppercase}
.msg-role{background:var(--ally);color:#0f1923;border-radius:0}
""",
'latest': """
.stat{padding:8px 14px;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);border-top:3px solid var(--accent)}
.stat label{font:700 12px var(--font-body);letter-spacing:.24em;text-transform:uppercase;color:var(--accent)}
.stat strong{font:600 26px/1.1 var(--font-display);letter-spacing:.04em;text-transform:uppercase}
.goal-track{height:6px;border-radius:0;background:#ece8e11f}
#goal-fill{border-radius:0}
"""},
  keyframes='',
),
# --------------------------------------------------------------------------------------------- World of Warcraft
dict(
  id='realmofheroes', name='Realm of Heroes', forGame='World of Warcraft', layout='rail',
  tags='world of warcraft wow mmo mmorpg fantasy quest raid guild azeroth gold stone',
  font=GF + 'Cinzel:wght@700;900&family=Spectral:wght@500;600;700&display=swap',
  fontBody="'Spectral',Georgia,serif", fontDisplay="'Cinzel',Georgia,serif",
  vars=[['--accent', 'Gold trim', '#d4a83a'], ['--text', 'Text', '#f8ecc8'], ['--cam-border', 'Webcam border', '#d4a83a'],
        ['--nameplate-bg', 'Name plate', '#1a1209f2'], ['--alert-bg', 'Alert box', '#110b06f2'], ['--chat-bg', 'Chat messages', '#0d0904d9'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#a335ee'], ['--stat-bg', 'Latest boxes', '#140e07eb'],
        ['--goal-fill', 'Goal bar', '#8e2bd9'], ['--quest', 'Quest yellow', '#ffd100'], ['--game-frame', 'Game window frame', '#d4a83a']],
  labels={'follower': 'QUEST ACCEPTED', 'subscriber': 'LEVEL UP!', 'gift': 'LOOT ROLLED', 'cheer': 'ACHIEVEMENT EARNED',
          'tip': 'GOLD LOOTED', 'raid': 'A RAID GROUP ARRIVES'},
  chatTitle='GUILD CHAT',
  decor={'cam': '<i class="rh-rivet tl"></i><i class="rh-rivet tr"></i><i class="rh-rivet bl"></i><i class="rh-rivet br"></i><i class="rh-plate"></i>',
         'alert': '<i class="rh-glow"></i>', 'chat': ''},
  css={
'cam': """
.cam{--ring:12px;border:12px solid transparent;border-image:linear-gradient(180deg,#5c4a33,#2c2318 40%,#4a3b29 60%,#211a12) 1;box-shadow:0 0 0 2px var(--accent),inset 0 0 0 2px var(--accent),0 10px 30px #000c}
.rh-rivet{position:absolute;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3c4,#d4a83a 40%,#6b4e1a 75%);box-shadow:0 2px 3px #000;z-index:2}
.rh-rivet.tl{left:-17px;top:-17px}.rh-rivet.tr{right:-17px;top:-17px}.rh-rivet.bl{left:-17px;bottom:-17px}.rh-rivet.br{right:-17px;bottom:-17px}
.rh-plate{position:absolute;left:50%;top:-30px;width:70px;height:26px;margin-left:-35px;background:linear-gradient(180deg,#e9c66b,#8a6420);clip-path:polygon(15% 0,85% 0,100% 100%,0 100%);box-shadow:0 2px 3px #000}
.nameplate{left:50%;bottom:-44px;transform:translateX(-50%);font:700 18px var(--font-display);letter-spacing:.1em;color:var(--quest);background:var(--nameplate-bg);padding:6px 22px;border:2px solid var(--accent);border-radius:4px;text-shadow:0 1px 2px #000;box-shadow:0 4px 10px #000a}
""",
'alert': """
.alert{padding:16px 28px;border:3px solid var(--accent);border-radius:6px;overflow:hidden;box-shadow:inset 0 0 0 2px #000,inset 0 0 30px #d4a83a22,0 10px 30px #000c}
.rh-glow{position:absolute;left:-20%;right:-20%;top:-60%;height:120%;background:radial-gradient(closest-side,#ffd10033,transparent);animation:realmofheroes-pulse 2.4s ease-in-out infinite;pointer-events:none}
.alert-icon{width:62px;height:62px;border-radius:6px;border:2px solid var(--accent);background:radial-gradient(circle,#3a2a10,#0d0904);color:var(--quest);font:900 34px var(--font-display);text-shadow:0 0 10px #ffd100aa}
.alert-kind{font:900 15px var(--font-display);letter-spacing:.2em;color:var(--quest);text-shadow:0 1px 2px #000}
.alert-name{font:900 34px var(--font-display);color:#fff;text-shadow:0 2px 3px #000}
.alert-detail{font:italic 600 17px var(--font-body);color:#d8c7a0}
""",
'chat': """
.chat-title{font:900 15px var(--font-display);letter-spacing:.18em;color:var(--quest);margin-bottom:8px;text-shadow:0 1px 2px #000}
.msg{padding:7px 12px;font:600 18px var(--font-body);border:1px solid #d4a83a55;border-radius:4px}
.msg-head{font:700 15px var(--font-body)}
.msg-role{background:var(--accent);color:#1a1209}
""",
'latest': """
.stat{padding:9px 14px;border:2px solid var(--accent);border-radius:5px;box-shadow:inset 0 0 0 2px #000}
.stat label{font:900 11px var(--font-display);letter-spacing:.16em;color:var(--quest)}
.stat strong{font:600 19px var(--font-body);margin-top:2px}
.goal-track{height:10px;border-radius:2px;background:#000;border:1px solid #d4a83a88}
#goal-fill{border-radius:0;background:linear-gradient(180deg,#c77dff,var(--goal-fill) 50%,#5a1590)}
"""},
  keyframes='@keyframes realmofheroes-pulse{0%,100%{opacity:.5}50%{opacity:1}}',
),
# --------------------------------------------------------------------------------------------- Minecraft
dict(
  id='blockcraft', name='Blockcraft', forGame='Minecraft', layout='corner',
  tags='minecraft mc blocks pixel sandbox survival craft cube grass dirt',
  font=GF + 'Pixelify+Sans:wght@400;600;700&family=VT323&display=swap',
  fontBody="'VT323','Courier New',monospace", fontDisplay="'Pixelify Sans','Courier New',monospace",
  vars=[['--accent', 'Accent', '#80ff20'], ['--text', 'Text', '#ffffff'], ['--cam-border', 'Webcam border', '#5d9c3a'],
        ['--nameplate-bg', 'Name plate', '#000000b3'], ['--alert-bg', 'Alert box', '#212121f2'], ['--chat-bg', 'Chat messages', '#00000080'],
        ['--chat-name', 'Chat names (no Twitch colour)', '#ffff55'], ['--stat-bg', 'Latest boxes', '#8b8b8bf2'],
        ['--goal-fill', 'Goal bar', '#80ff20'], ['--dirt', 'Dirt colour', '#866043'], ['--game-frame', 'Game window frame', '#5d9c3a']],
  labels={'follower': 'NEW PLAYER JOINED', 'subscriber': 'DIAMONDS FOUND!', 'gift': 'LOOT CHEST OPENED', 'cheer': 'XP COLLECTED',
          'tip': 'EMERALDS TRADED', 'raid': 'A WHOLE VILLAGE ARRIVES'},
  chatTitle='CHAT',
  decor={'cam': '<i class="bc-grass"></i><i class="bc-dirt"></i>', 'alert': '', 'chat': ''},
  css={
'cam': """
.cam{--ring:14px;border:14px solid var(--dirt);image-rendering:pixelated;box-shadow:0 0 0 3px #3b2a1d;
  border-image:repeating-linear-gradient(90deg,#866043 0 14px,#6b4c34 14px 28px,#9a7352 28px 42px,#79563b 42px 56px) 14}
.bc-grass{position:absolute;left:-17px;right:-17px;top:-23px;height:16px;background:repeating-linear-gradient(90deg,#5d9c3a 0 8px,#4a8a2a 8px 16px,#6fb043 16px 24px,#55932f 24px 32px);box-shadow:0 3px 0 #3b6e22,0 -3px 0 #2e5419;z-index:2}
.bc-dirt{position:absolute;left:-17px;right:-17px;bottom:-20px;height:6px;background:#3b2a1d}
.nameplate{left:50%;top:-58px;transform:translateX(-50%);font:600 24px var(--font-display);color:#fff;background:var(--nameplate-bg);padding:2px 12px;text-shadow:3px 3px 0 #3f3f3f}
""",
'alert': """
.alert{padding:12px 20px;border:4px solid #555;border-radius:0;box-shadow:inset 0 0 0 2px #000,inset 4px 4px 0 2px #6b6b6b;image-rendering:pixelated}
.alert-icon{width:56px;height:56px;background:#8b8b8b;border:3px solid;border-color:#373737 #fff #fff #373737;color:#3fffd2;font-size:30px;text-shadow:2px 2px 0 #0a4}
.alert-kind{font:600 20px var(--font-display);color:#ffff55;text-shadow:2px 2px 0 #3f3f15}
.alert-name{font:700 32px var(--font-display);color:#fff;text-shadow:3px 3px 0 #3f3f3f}
.alert-detail{font:24px var(--font-body);color:#ddd}
""",
'chat': """
.chat-title{font:600 18px var(--font-display);color:#fff;text-shadow:2px 2px 0 #3f3f3f;margin-bottom:6px}
.msg{padding:2px 10px;font:24px/1.15 var(--font-body);text-shadow:2px 2px 0 #3f3f3f;border-radius:0}
.msg-head{font:24px var(--font-body)}
.msg-user::before{content:"<"}.msg-user::after{content:">"}
.msg-role{background:#55ff55;color:#000;border-radius:0;font-family:var(--font-display)}
""",
'latest': """
.stat{padding:6px 12px;border:3px solid;border-color:#fff #373737 #373737 #fff;box-shadow:0 0 0 2px #000;border-radius:0}
.stat label{font:600 13px var(--font-display);color:#3f3f3f;letter-spacing:.04em}
.stat strong{font:26px/1 var(--font-body);color:#fff;text-shadow:2px 2px 0 #3f3f3f}
.goal-track{height:10px;border-radius:0;background:#1d1d1d;border:2px solid #000}
#goal-fill{border-radius:0;background:repeating-linear-gradient(90deg,var(--goal-fill) 0 18px,#4ca010 18px 20px);box-shadow:inset 0 2px 0 #c6ff8f}
"""},
  keyframes='',
),
]
