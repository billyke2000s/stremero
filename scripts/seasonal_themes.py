"""Original Halloween themes. Built alongside game themes; no external artwork required."""
from copy import deepcopy
from game_themes_rich import TACTICAL

def lantern(slot):
 # Separate paint servers for screen and camera; the original drawing stays editable SVG.
 return f'''<svg viewBox="0 0 320 260" aria-hidden="true"><defs>
 <radialGradient id="ph-skin-{slot}" cx="38%" cy="30%" r="76%"><stop stop-color="#8f431f"/><stop offset=".55" stop-color="#492014"/><stop offset="1" stop-color="#100f0c"/></radialGradient>
 <radialGradient id="ph-fire-{slot}" cx="50%" cy="65%" r="80%"><stop stop-color="#fff2b0"/><stop offset=".35" stop-color="#ffb13e"/><stop offset="1" stop-color="#be3c10"/></radialGradient></defs>
 <g fill="none" stroke="#39402b" stroke-width="5" stroke-linecap="round"><path d="M106 219C42 251 10 216 32 183C51 155 69 184 51 196C27 214 14 173 31 146M214 214C281 253 316 208 284 181C261 162 248 190 269 199C291 207 305 173 290 150"/><path d="M37 169L17 158M48 215L39 234M274 218L285 236M289 169L309 162"/></g>
 <path d="M152 63C157 40 137 22 162 7L181 9C155 34 179 37 172 63" fill="#343b24" stroke="#555336" stroke-width="3"/>
 <path d="M158 62C100 34 40 65 39 129C18 203 90 245 155 234C210 250 296 223 282 149C292 80 225 37 170 62Z" fill="url(#ph-skin-{slot})" stroke="#a4552922" stroke-width="2"/>
 <g fill="none" stroke="#190f0c" stroke-width="5" opacity=".8"><path d="M137 62C82 97 90 203 130 232M179 62C229 97 230 203 187 233M158 67C131 103 130 204 155 234M76 75C43 119 48 190 83 219M242 77C273 127 265 194 230 226"/></g>
 <g fill="none" stroke="#b5632f" stroke-width="1.5" opacity=".4"><path d="M128 72C94 113 99 181 121 213M184 74C212 114 216 182 196 214M75 96C58 139 63 177 79 199"/></g>
 <g fill="#140b08" stroke="#9d4e22" stroke-width="2"><path d="M74 106L139 129L128 153L89 144Z"/><path d="M247 103L179 130L189 154L233 140Z"/><path d="M156 145L144 172L171 167Z"/><path d="M77 169L111 183L122 171L145 189L158 174L178 190L198 172L207 182L244 162L227 202L209 198L195 215L176 205L159 222L141 206L126 216L108 201L94 203Z"/></g>
 <g fill="url(#ph-fire-{slot})" class="ph-fire"><path d="M84 114L132 132L125 145L95 138Z"/><path d="M237 112L186 133L192 146L226 134Z"/><path d="M157 153L151 166L164 163Z"/><path d="M86 178L111 191L122 182L144 199L158 186L178 201L198 183L207 191L233 174L222 194L209 190L194 206L176 197L159 211L142 197L127 207L110 193L99 195Z"/></g>
 <path d="M61 103L70 94L66 122M255 155L264 171L254 185M111 66L119 75L113 88" fill="none" stroke="#b8733e55" stroke-width="2"/>
 </svg>'''
PUMPKIN = lantern('screen')
VINES = '<svg class="ph-vines" viewBox="0 0 520 70" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#4c4b31" stroke-width="3"><path d="M2 65C-8 20 21 2 58 20C94 39 91 2 133 12C182 26 205 9 260 17C324 28 345 5 385 17C433 36 477 1 501 22L518 65"/><path d="M43 15L38 4M98 22L106 8M174 19L183 4M327 20L337 5M436 21L448 9M489 14L482 2"/></g></svg>'

BATS = '<svg viewBox="0 0 240 120" aria-hidden="true"><path d="M8 28Q30 8 52 26L58 10L67 23L79 10L80 28Q104 9 129 26Q103 28 101 54Q79 41 64 69Q49 43 30 54Q33 30 8 28Z" fill="#ae91e4"/><path d="M128 75Q147 54 166 76L170 63L179 72L188 62L190 77Q210 59 232 75Q211 78 211 97Q191 90 180 112Q166 91 149 98Q150 80 128 75Z" fill="#7455a9"/></svg>'
WEB = '<svg viewBox="0 0 180 180" aria-hidden="true"><g fill="none" stroke="#d6d0dc" stroke-width="2" opacity=".7"><path d="M0 0L180 0M0 0L166 69M0 0L127 127M0 0L69 166M0 0V180M40 0Q32 15 37 15Q25 25 28 28Q15 32 15 37Q0 32 0 40M85 0Q65 32 78 32Q55 55 60 60Q32 65 32 78Q0 65 0 85M135 0Q109 45 125 52Q90 90 95 95Q45 109 52 125Q0 109 0 135"/></g><path d="M125 52V103" stroke="#d6d0dc"/><ellipse cx="125" cy="110" rx="8" ry="11" fill="#d6d0dc"/><path d="M119 106L109 98M119 111L106 109M131 106L141 98M131 111L144 109M120 116L110 124M130 116L140 124" stroke="#d6d0dc" stroke-width="2"/></svg>'
THEMES=[]
for id_, name, accent, team, motif, style in [
 ('pumpkinhour','Pumpkin Hour','#dc8a42','#9a9b6b',PUMPKIN,'pumpkin'),
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
  t['chatTitle']='THE WITCHING HOUR'
  for v in t['vars']:
   if v[0] in ('--nameplate-bg','--alert-bg','--chat-bg','--stat-bg'): v[2]='#15130fee'
  t['decor']['cam']='<div class="hw-motif pumpkin">'+lantern('cam')+'</div>'+VINES
  t['css']['screen']+='.hw-scene-mark{left:22px;top:142px;width:220px;height:179px;opacity:1;filter:drop-shadow(0 12px 18px #0009)}'
  t['css']['cam']+='''
.cam{--ring:2px;border:1px solid #765034;border-radius:2px;box-shadow:0 0 0 4px #15130f,0 0 0 5px #3c3024,0 8px 26px #000a}
.hw-motif.pumpkin{right:-16px;top:-58px;width:145px;height:118px;filter:drop-shadow(0 5px 8px #000b)}
.ph-vines{position:absolute;left:-18px;top:-26px;width:calc(100% + 36px);height:62px;pointer-events:none;z-index:2}
.ph-fire{filter:drop-shadow(0 0 5px #ed7017)}
.nameplate{left:-5px;right:-5px;bottom:-43px;border:1px solid #5b3b25;border-top:2px solid var(--accent);border-radius:1px;background:linear-gradient(90deg,#17130f,#282016,#17130f);font:600 17px var(--font-display);letter-spacing:.11em;color:#ead6bb;box-shadow:0 8px 20px #0007}
'''
  t['css']['alert']+='''
.alert{border:1px solid #785032;border-left:3px solid var(--accent);border-right:1px solid #785032;border-radius:1px;background-image:radial-gradient(ellipse at 0 50%,#b65a1720,transparent 70%);box-shadow:0 6px 24px #0009}
.alert-kind{color:var(--accent);letter-spacing:.2em}.alert-name{color:#ead6bb}
'''
  t['css']['chat']+='\n.msg{border-left:1px solid #69492e;border-radius:1px;background-image:linear-gradient(90deg,#70431e12,transparent)}.chat-title{background:#18150fee;border-left:2px solid var(--accent);color:#d6b185;font-size:12px;letter-spacing:.14em}\n'
  t['css']['latest']+='\n.stat{border-top:1px solid #65472e;border-bottom:1px solid #332a20;background-image:linear-gradient(180deg,#70431e15,transparent);box-shadow:0 4px 14px #0008}.stat label{color:#bb9868}.stat strong{color:#e2d5c1}\n'
 elif style=='coven':
  t['css']['cam']+='\n.cam{outline:1px solid var(--team);outline-offset:7px}.nameplate{border-radius:0;letter-spacing:.14em}.hw-motif{right:-20px;top:-105px;width:240px}\n'
 else:
  t['css']['cam']+='\n.cam{border-radius:0;outline:1px solid #ded4e944;outline-offset:6px}.nameplate{border-radius:0;border-bottom:3px solid var(--team)}\n'
 THEMES.append(t)
