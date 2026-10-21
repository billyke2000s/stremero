"""Original Halloween themes. Built alongside game themes; no external artwork required."""
from copy import deepcopy
from game_themes_rich import TACTICAL

PUMPKIN = '<svg viewBox="0 0 160 120" aria-hidden="true"><path d="M82 28Q70 4 99 5L91 31" fill="#577b3a"/><path d="M80 30C8 0-18 115 59 113Q80 124 101 113C178 115 152 0 80 30Z" fill="#d86b1a" stroke="#ffad43" stroke-width="3"/><path d="M78 32Q40 65 64 111M85 32Q120 65 96 111" fill="none" stroke="#8a3c15" stroke-width="3"/><path d="M30 63L60 48L57 73ZM101 48L133 63L104 73ZM39 86L58 91L68 84L80 96L94 84L104 91L121 85L107 103L54 103Z" fill="#ffe497"/></svg>'
BATS = '<svg viewBox="0 0 240 120" aria-hidden="true"><path d="M8 28Q30 8 52 26L58 10L67 23L79 10L80 28Q104 9 129 26Q103 28 101 54Q79 41 64 69Q49 43 30 54Q33 30 8 28Z" fill="#ae91e4"/><path d="M128 75Q147 54 166 76L170 63L179 72L188 62L190 77Q210 59 232 75Q211 78 211 97Q191 90 180 112Q166 91 149 98Q150 80 128 75Z" fill="#7455a9"/></svg>'
WEB = '<svg viewBox="0 0 180 180" aria-hidden="true"><g fill="none" stroke="#d6d0dc" stroke-width="2" opacity=".7"><path d="M0 0L180 0M0 0L166 69M0 0L127 127M0 0L69 166M0 0V180M40 0Q32 15 37 15Q25 25 28 28Q15 32 15 37Q0 32 0 40M85 0Q65 32 78 32Q55 55 60 60Q32 65 32 78Q0 65 0 85M135 0Q109 45 125 52Q90 90 95 95Q45 109 52 125Q0 109 0 135"/></g><path d="M125 52V103" stroke="#d6d0dc"/><ellipse cx="125" cy="110" rx="8" ry="11" fill="#d6d0dc"/><path d="M119 106L109 98M119 111L106 109M131 106L141 98M131 111L144 109M120 116L110 124M130 116L140 124" stroke="#d6d0dc" stroke-width="2"/></svg>'
THEMES=[]
for id_, name, accent, team, motif, style in [
 ('pumpkinhour','Pumpkin Hour','#ffad43','#b6cf75',PUMPKIN,'pumpkin'),
 ('midnightcoven','Midnight Coven','#bb96ef','#83d4ce',BATS,'coven'),
 ('widowsilk','Widow Silk','#ded4e9','#c84455',WEB,'web')]:
 t=deepcopy(TACTICAL)
 t.update(id=id_,name=name,category='Halloween',forGame='an original Halloween theme',tags='halloween spooky horror october seasonal '+style,
  font='https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Barlow:wght@400;600;700&display=swap',
  fontBody="'Barlow',Arial,sans-serif",fontDisplay="'Cinzel',Georgia,serif",chatTitle='AFTER DARK',
  labels={'follower':'A NEW SOUL','subscriber':'JOINED THE COVEN','gift':'A LITTLE MAGIC','cheer':'SPIRIT ENERGY','tip':'SWEET OFFERING','raid':'THE HORDE ARRIVES'})
 for v in t['vars']:
  if v[0]=='--accent': v[1]='Magic glow'
  elif v[0]=='--cam-border': v[1]='Webcam border'
  elif v[0]=='--team': v[1]='Secondary accent'
  if v[0] in ('--accent','--cam-border','--goal-fill'): v[2]=accent
  elif v[0] in ('--team','--chat-name'): v[2]=team
  elif v[0] in ('--nameplate-bg','--alert-bg','--chat-bg','--stat-bg'): v[2]='#1b1424ed'
 t['screen']='<div class="hw-scene-mark">'+motif+'</div>'
 t['decor']={'cam':'<div class="hw-motif '+style+'">'+motif+'</div>','alert':'','chat':'','stat':''}
 t['css']['screen']='.hw-scene-mark{position:absolute;left:28px;top:150px;width:200px;height:150px;opacity:.8}.hw-scene-mark svg{width:100%;height:100%}'
 t['css']['cam']='''
.cam{--ring:3px;border:2px solid var(--cam-border);border-radius:8px;box-shadow:0 0 24px #0008}
.hw-motif{position:absolute;right:-30px;top:-78px;width:156px;height:118px;pointer-events:none;z-index:3}
.hw-motif svg{width:100%;height:100%}.hw-motif.web{right:auto;left:-2px;top:-2px;width:100px;height:100px;transform:translate(-75%,-75%)}
.nameplate{left:12px;right:12px;top:auto;bottom:-42px;padding:10px 18px;text-align:center;background:var(--nameplate-bg);border-bottom:2px solid var(--accent);border-radius:0 0 16px 16px;font:700 18px var(--font-display);color:var(--text);transform:none;letter-spacing:.06em}
'''
 t['css']['alert']+='\n.alert{border-radius:16px 3px 16px 3px;box-shadow:0 0 24px #0008}.alert-name{font:700 28px var(--font-display)}\n'
 t['css']['chat']+='\n.msg-user::before{content:""}.chat-title{font-family:var(--font-display)}.msg{border-radius:0 12px 12px 0}\n'
 if style=='pumpkin':
  t['css']['cam']+='\n.cam{border-radius:18px;box-shadow:0 0 28px #ff9d2425}.nameplate{border-radius:0 0 20px 20px}\n'
 elif style=='coven':
  t['css']['cam']+='\n.cam{outline:1px solid var(--team);outline-offset:7px}.nameplate{border-radius:0;letter-spacing:.14em}.hw-motif{right:-20px;top:-105px;width:240px}\n'
 else:
  t['css']['cam']+='\n.cam{border-radius:0;outline:1px solid #ded4e944;outline-offset:6px}.nameplate{border-radius:0;border-bottom:3px solid var(--team)}\n'
 THEMES.append(t)
