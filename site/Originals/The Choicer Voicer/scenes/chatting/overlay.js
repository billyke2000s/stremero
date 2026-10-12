/* ===================================================================
   THE CHOICER VOICER — StreamElements Overlay  (JS tab)

   Handles:
     • Chat  (auto-disappears; mod deletions and bans remove messages)
     • Followers
     • Subscriptions (new / resub / gift / community gift)
     • Cheers (bits)
     • Raids
     • Tips (donations, shown in your StreamElements currency)

   No extra fields required. These optional Fields are supported; paste
   this into the widget's "Fields" tab if you want them editable in the
   StreamElements UI (otherwise the defaults in CFG below are used):

   {
     "chatLife":      { "type": "number", "label": "Chat seconds on screen", "value": 8 },
     "alertDuration": { "type": "number", "label": "Alert seconds on screen", "value": 6 },
     "minBits":       { "type": "number", "label": "Minimum bits to alert",  "value": 1 },
     "minTip":        { "type": "number", "label": "Minimum tip to alert",   "value": 1 }
   }
   ================================================================= */

/* ---------- config (filled from Fields if present) ---------- */
const CFG = {
  chatLife: 8,          // seconds a chat message stays
  alertDuration: 6,     // seconds an alert stays on screen
  minBits: 1,
  minTip: 1,
  maxAlertsQueued: 50,  // oldest queued alerts are dropped beyond this
  hideCommands: true,   // hide chat messages starting with !
  hiddenUsers: ['streamelements', 'nightbot', 'moobot', 'fossabot'] // lowercase
};
let currency = 'USD';   // replaced by your StreamElements currency on load

/* ---------- element refs ---------- */
const chatList   = document.getElementById('chat-list');
const alertBox   = document.getElementById('alert-box');
const alertBadge = document.getElementById('alert-badge');
const alertTitle = document.getElementById('alert-title');
const alertSub   = document.getElementById('alert-sub');

/* ---------- small helpers ---------- */
const num = v => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const str = v => (v == null ? '' : String(v));
function money(amount){
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency }).format(num(amount)); }
  catch { return num(amount).toFixed(2); }
}
function cleanTier(tier){
  const t = str(tier).toLowerCase();
  if (t === 'prime') return 'Prime';
  return { '1000':'1', '2000':'2', '3000':'3' }[t] || '1';
}
/* Parts are [text] or [text, true] (highlighted). Built with text nodes,
   so names and messages can never be interpreted as HTML. */
function fill(el, parts){
  el.replaceChildren();
  for (const [text, hl] of parts){
    if (hl){ const s = document.createElement('span'); s.className = 'hl'; s.textContent = text; el.append(s); }
    else el.append(document.createTextNode(text));
  }
}

/* ---------- alert queue (so alerts don't overlap) ---------- */
const alertQueue = [];
let alertBusy = false, showTimer = null, hideTimer = null;

function enqueueAlert(badge, title, sub){
  if (alertQueue.length >= CFG.maxAlertsQueued) alertQueue.shift();
  alertQueue.push({ badge, title, sub });
  if (!alertBusy) runQueue();
}

function runQueue(){
  if (alertQueue.length === 0){ alertBusy = false; return; }
  alertBusy = true;
  const { badge, title, sub } = alertQueue.shift();
  alertBadge.textContent = badge;
  fill(alertTitle, title);
  fill(alertSub, sub);
  alertBox.classList.remove('hide');
  alertBox.classList.add('show');
  showTimer = setTimeout(endAlert, CFG.alertDuration * 1000);
}

function endAlert(){
  clearTimeout(showTimer); clearTimeout(hideTimer);
  if (!alertBusy) return;
  alertBox.classList.remove('show');
  alertBox.classList.add('hide');
  hideTimer = setTimeout(() => {
    alertBox.classList.remove('hide');
    runQueue();                 // next in line
  }, 500);                      // matches alertOut duration
}

/* ===================================================================
   CHAT — built entirely with DOM nodes; removed after it fades.
   ================================================================= */
function addChatMessage(data = {}){
  const nick = str(data.displayName || data.nick || 'chatter');
  const text = str(data.text).slice(0, 500);
  if (!text) return;
  if (CFG.hiddenUsers.includes(str(data.nick || nick).toLowerCase())) return;
  if (CFG.hideCommands && text.startsWith('!')) return;

  const msg = document.createElement('div');
  msg.className = 'chat-msg';
  msg.dataset.msgId  = str(data.msgId || data.tags?.id);
  msg.dataset.userId = str(data.userId || data.tags?.['user-id']);

  const user = document.createElement('span');
  user.className = 'chat-user';
  if (/^#[0-9a-f]{3,8}$/i.test(str(data.displayColor))) user.style.color = data.displayColor;

  const badges = Array.isArray(data.badges) ? data.badges : [];
  const safeBadges = badges.filter(b => /^https:\/\//i.test(str(b && b.url)));
  if (safeBadges.length){
    const wrap = document.createElement('span');
    wrap.className = 'chat-badges';
    for (const b of safeBadges){
      const img = document.createElement('img');
      img.src = b.url; img.alt = ''; img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.remove();
      wrap.append(img);
    }
    user.append(wrap);
  }
  user.append(document.createTextNode(nick));

  const body = document.createElement('span');
  body.className = 'chat-text';
  renderEmotes(body, text, data.emotes);

  msg.append(user, body);
  chatList.appendChild(msg);

  // Remove after entrance + life + fade so the DOM stays clean
  msg._timer = setTimeout(() => msg.remove(), CFG.chatLife * 1000 + 1200);

  // Safety cap: never keep more than 30 nodes
  while (chatList.children.length > 30) removeMsg(chatList.firstElementChild);
}

function removeMsg(node){ clearTimeout(node._timer); node.remove(); }

/* Emotes are placed by their start/end positions from StreamElements,
   so an emote name inside another word or another emote is never touched. */
function renderEmotes(el, text, emotes){
  const list = (Array.isArray(emotes) ? emotes : [])
    .map(e => ({ start:Number(e.start), end:Number(e.end), name:str(e.name),
                 url: str((e.urls && (e.urls['4'] || e.urls['2'] || e.urls['1'])) || e.gif) }))
    .filter(e => Number.isInteger(e.start) && Number.isInteger(e.end) && e.end >= e.start && e.end < text.length && /^https:\/\//i.test(e.url))
    .sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const e of list){
    if (e.start < cursor) continue;               // overlapping data: skip
    el.append(document.createTextNode(text.slice(cursor, e.start)));
    const img = document.createElement('img');
    img.className = 'emote'; img.src = e.url; img.alt = text.slice(e.start, e.end + 1);
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.replaceWith(document.createTextNode(img.alt));
    el.append(img);
    cursor = e.end + 1;
  }
  el.append(document.createTextNode(text.slice(cursor)));
}

/* ===================================================================
   STREAMELEMENTS EVENT LISTENERS
   ================================================================= */

// Load config from Fields (fired once on widget load)
window.addEventListener('onWidgetLoad', function (obj){
  const d = (obj && obj.detail) || {};
  const f = d.fieldData || {};
  const pos = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  CFG.chatLife      = pos(f.chatLife, CFG.chatLife);
  CFG.alertDuration = pos(f.alertDuration, CFG.alertDuration);
  if (f.minBits != null) CFG.minBits = num(f.minBits);
  if (f.minTip  != null) CFG.minTip  = num(f.minTip);
  if (d.currency && d.currency.code) currency = d.currency.code;

  // keep the CSS chat lifetime in sync with the field value
  document.documentElement.style.setProperty('--chat-life', CFG.chatLife + 's');
});

// Main event stream
window.addEventListener('onEventReceived', function (obj){
  const detail   = (obj && obj.detail) || {};
  const listener = detail.listener;
  const event    = detail.event || {};
  if (!listener) return;

  switch (listener){

    /* ---------- CHAT ---------- */
    case 'message':
      addChatMessage(event.data || {});
      break;

    case 'delete-message': {
      const id = str((event.data || event).msgId);
      if (id) [...chatList.children].filter(n => n.dataset.msgId === id).forEach(removeMsg);
      break;
    }
    case 'delete-messages': {
      const id = str((event.data || event).userId);
      if (id) [...chatList.children].filter(n => n.dataset.userId === id).forEach(removeMsg);
      break;
    }

    /* ---------- "Skip alert" button in the activity feed ---------- */
    case 'event:skip':
      endAlert();
      break;

    /* ---------- FOLLOWER ---------- */
    case 'follower-latest':
      enqueueAlert('❤',
        [['NEW '], ['FOLLOWER', true]],
        [[str(event.name) || 'Someone', true], [' joined the show!']]);
      break;

    /* ---------- SUBSCRIBER ---------- */
    case 'subscriber-latest': {
      // Community gift: one alert for the initial event, not one per recipient
      if (event.bulkGifted){
        enqueueAlert('🎁',
          [[str(event.sender || event.name) || 'Someone', true], [' GIFTED']],
          [[`${num(event.amount)} subs to the audience!`]]);
        break;
      }
      if (event.isCommunityGift || event.playedAsCommunityGift) break;
      // single gift
      if (event.gifted){
        enqueueAlert('🎁',
          [['GIFTED '], ['SUB', true]],
          [[`${str(event.sender) || 'Someone'} → `], [str(event.name) || 'Someone', true]]);
        break;
      }
      // resub
      if (num(event.amount) > 1){
        enqueueAlert('⭐',
          [[str(event.name) || 'Someone', true], [' RESUBBED']],
          [[`${num(event.amount)} months • Tier ${cleanTier(event.tier)}`]]);
        break;
      }
      // brand-new sub
      enqueueAlert('⭐',
        [['NEW '], ['SUB', true]],
        [[str(event.name) || 'Someone', true], [` • Tier ${cleanTier(event.tier)}`]]);
      break;
    }

    /* ---------- CHEER / BITS ---------- */
    case 'cheer-latest':
      if (num(event.amount) < CFG.minBits) break;
      enqueueAlert('💎',
        [[String(num(event.amount)), true], [' BITS']],
        [['from '], [str(event.name) || 'Someone', true]]);
      break;

    /* ---------- TIP / DONATION ---------- */
    case 'tip-latest':
      if (num(event.amount) < CFG.minTip) break;
      enqueueAlert('💰',
        [[str(event.name) || 'Someone', true], [' TIPPED']],
        [[money(event.amount), true], [' — thank you!']]);
      break;

    /* ---------- RAID ---------- */
    case 'raid-latest':
      enqueueAlert('🚀',
        [['RAID!', true]],
        [[str(event.name) || 'Someone', true], [` brought ${num(event.amount)} viewers!`]]);
      break;

    default:
      break;
  }
});

/* ---------- scale the 1920x1080 layout to the browser-source size ---------- */
function fitOverlay(){
  const el = document.getElementById('cv-overlay');
  if (el) el.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080) || 1})`;
}
window.addEventListener('resize', fitOverlay);
fitOverlay();

/* ===================================================================
   OPTIONAL — quick local test.
   Uncomment to preview an alert + chat without going live.
   ================================================================= */
// enqueueAlert('❤', [['NEW '], ['FOLLOWER', true]], [['TestUser', true], [' joined the show!']]);
// addChatMessage({ displayName:'TestChatter', displayColor:'#ff4fa3', text:'hello from the studio!' });

/* ---- Appearance settings (StreamElements "Fields" panel) ----------------------------------
   Colours, your name and socials, background image with see-through game window + webcam,
   part positions (from the overlay site's Edit mode), show/hide switches, custom text,
   clock, animations and chat text size. All editable in the Fields panel without code. */
(() => {
  'use strict';
  const LOOK = {"root": "#cv-overlay", "colors": ["--stage-deep", "--stage-mid", "--panel", "--gold", "--gold-hot", "--magenta", "--cyan", "--text", "--text-soft", "--game-frame"], "parts": {"chat": {"sel": "#chat-wrap", "on": true}, "alerts": {"sel": "#alert-box", "on": true}, "cam": {"sel": "#cam-slot", "on": true}}, "cam": [48, 176, 1216, 684, 24], "game": null};
  const root = document.querySelector(LOOK.root);
  if (!root) return;
  const colourOK = v => typeof v === 'string' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|transparent)$/i.test(v.trim());
  const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const on = (v, fb) => (v === undefined || v === null || v === '' ? fb : v === true || v === 'true' || v === 1 || v === '1');

  // background layer + game window frame go first, so they are painted UNDER everything else
  let bg = root.querySelector('.bg-layer');
  if (!bg) { bg = document.createElement('div'); bg.className = 'bg-layer'; bg.setAttribute('aria-hidden', 'true'); root.insertBefore(bg, root.firstChild); }
  let frame = root.querySelector('.game-frame');
  if (!frame) { frame = document.createElement('div'); frame.className = 'game-frame'; frame.setAttribute('aria-hidden', 'true'); bg.after(frame); }
  let box = frame.querySelector('.game-box');
  if (!box) { box = document.createElement('div'); box.className = 'game-box'; box.setAttribute('data-game-hole', ''); frame.appendChild(box); }
  Object.keys(LOOK.parts).forEach(k => { const el = root.querySelector(LOOK.parts[k].sel); if (el) el.setAttribute('data-part', k); });

  function holeMask(holes) {
    const cut = holes.map(h => `<rect x="${h[0]}" y="${h[1]}" width="${h[2]}" height="${h[3]}" rx="${h[4] || 0}" fill="black"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><mask id="m"><rect width="1920" height="1080" fill="white"/>${cut}</mask><rect width="1920" height="1080" fill="black" mask="url(#m)"/></svg>`;
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function parseLayout(v) {
    if (v && typeof v === 'object') return v;
    try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  let clockTimer = null, use24 = true;
  function tick() {
    const d = new Date(); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
    let t = use24 ? String(h).padStart(2, '0') + ':' + m : ((h % 12) || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
    root.querySelectorAll('.clock-time').forEach(el => { el.textContent = t; });
  }

  function apply(f) {
    f = f || {};
    // colours (a colour can belong to the whole overlay or to one part: "selector|--name")
    LOOK.colors.forEach(spec => {
      const bar = spec.indexOf('|'), sel = bar > 0 ? spec.slice(0, bar) : null, name = bar > 0 ? spec.slice(bar + 1) : spec;
      const key = 'c_' + (sel ? sel.replace(/[^a-z0-9]+/gi, '') + '__' : '') + name.slice(2).replace(/-/g, '_');
      const targets = sel ? [...(root.matches(sel) ? [root] : []), ...root.querySelectorAll(sel)] : [root];
      const v = f[key];
      targets.forEach(target => { if (colourOK(v)) target.style.setProperty(name, v.trim()); else target.style.removeProperty(name); });
    });
    // your name, socials and custom text (text only, never HTML)
    const text = { name: f.streamerName, youtube: f.youtube, tiktok: f.tiktok, twitch: f.twitch, customText: f.customText };
    Object.keys(text).forEach(k => {
      const v = typeof text[k] === 'string' ? text[k].trim().slice(0, 80) : '';
      if (v) root.querySelectorAll('[data-field="' + k + '"]').forEach(el => { el.textContent = v; });
    });
    // show / hide parts
    Object.keys(LOOK.parts).forEach(k => root.classList.toggle('hide-' + k, !on(f['show' + k[0].toUpperCase() + k.slice(1)], LOOK.parts[k].on)));
    // part positions from Edit mode: {"part": [x, y, width, height]} in 1920x1080 pixels (width/height 0 = unchanged)
    const layout = parseLayout(f.layout);
    let cam = LOOK.cam === 'auto' ? null : LOOK.cam ? LOOK.cam.slice() : null;
    const PROPS = ['left', 'top', 'right', 'bottom', 'marginLeft', 'marginTop', 'width', 'height', 'maxHeight'];
    Object.keys(LOOK.parts).forEach(k => {
      const el = root.querySelector(LOOK.parts[k].sel); if (!el) return;
      PROPS.forEach(s => { el.style[s] = ''; });
      const p = layout[k];
      if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(+p[0]) || !Number.isFinite(+p[1])) return;
      const before = [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
      const x = Math.max(-400, Math.min(1920, Math.round(+p[0]))), y = Math.max(-400, Math.min(1080, Math.round(+p[1])));
      const w = Math.max(0, Math.min(1920, Math.round(+p[2] || 0))), h = Math.max(0, Math.min(1080, Math.round(+p[3] || 0)));
      Object.assign(el.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto', marginLeft: '0px', marginTop: '0px' });
      if (w >= 40 || before[2] > 0) el.style.width = (w >= 40 ? w : before[2]) + 'px';           // keep the size it had, so stretched strips do not collapse
      if (h >= 40) { el.style.height = h + 'px'; el.style.maxHeight = h + 'px'; }
      if (k === 'cam' && cam) {                                    // the webcam hole moves and resizes with its frame
        cam[0] += x - before[0]; cam[1] += y - before[1];
        if (w >= 40) cam[2] += w - before[2];
        if (h >= 40) cam[3] += h - before[3];
      }
    });
    if (LOOK.cam === 'auto') {   // editor designs: the webcam hole is wherever its frame was placed
      const hole = root.querySelector('[data-cam-hole]');
      if (hole && hole.offsetWidth) {
        const R = root.getBoundingClientRect(), r = hole.getBoundingClientRect(), s = (R.width / 1920) || 1;
        cam = [Math.round((r.left - R.left) / s), Math.round((r.top - R.top) / s), Math.round(r.width / s), Math.round(r.height / s), 8];
      }
    }
    root.dataset.cam = cam ? cam.slice(0, 4).join(',') : '';
    // your own images (uploaded in StreamElements: Fields > Images)
    root.querySelectorAll('img[data-img]').forEach(im => {
      const v = f['img_' + im.getAttribute('data-img')];
      const ok = typeof v === 'string' && /^(https:\/\/|data:image\/)/i.test(v.trim());
      if (ok) im.src = v.trim(); else if (!im.getAttribute('data-keep')) im.removeAttribute('src');
      im.style.visibility = ok || im.getAttribute('src') ? '' : 'hidden';
    });
    // game window (where your game capture goes)
    const g = LOOK.game || [0, 0, 0, 0], hasGame = !!LOOK.game;   // scenes like "Starting soon" have no game window
    box.style.display = hasGame ? '' : 'none';
    const gx = Math.max(0, Math.min(1900, num(f.gameX, g[0]))), gy = Math.max(0, Math.min(1060, num(f.gameY, g[1])));
    const gw = Math.max(20, Math.min(1920 - gx, num(f.gameW, g[2]))), gh = Math.max(20, Math.min(1080 - gy, num(f.gameH, g[3])));
    Object.assign(box.style, { left: gx + 'px', top: gy + 'px', width: gw + 'px', height: gh + 'px', borderRadius: num(f.gameRadius, 0) + 'px' });
    const camShown = !LOOK.parts.cam || on(f.showCam, LOOK.parts.cam.on);
    const camCut = cam && camShown && on(f.cutCam, true);
    const fmask = camCut ? holeMask([cam]) : 'none';   // the frame line is never drawn across the webcam
    frame.style.webkitMaskImage = fmask; frame.style.maskImage = fmask;
    // background image: shown everywhere EXCEPT the game window and the webcam hole
    const img = typeof f.bgImage === 'string' ? f.bgImage.trim() : '';
    const useBg = !!img && /^(https:\/\/|data:image\/)/i.test(img);
    root.classList.toggle('has-bg', useBg);
    if (useBg) {
      bg.style.backgroundImage = 'url("' + img.replace(/["\\\n\r]/g, '') + '")';
      const holes = hasGame ? [[gx, gy, gw, gh, num(f.gameRadius, 0)]] : [];
      if (camCut) holes.push(cam);
      const mask = holeMask(holes);
      bg.style.webkitMaskImage = mask; bg.style.maskImage = mask;
      bg.style.opacity = String(Math.max(0, Math.min(100, num(f.bgOpacity, 100))) / 100);
    } else { bg.style.backgroundImage = 'none'; }
    root.classList.toggle('frame-on', hasGame && on(f.gameFrame, true));
    root.classList.toggle('no-anim', !on(f.animations, true));
    root.style.setProperty('--chat-zoom', String(Math.max(0.6, Math.min(2, num(f.chatScale, 100) / 100))));
    // clock
    use24 = on(f.clock24, true);
    clearInterval(clockTimer);
    if (root.querySelector('.clock-time')) { tick(); clockTimer = setInterval(tick, 1000); }
  }
  addEventListener('onWidgetLoad', obj => apply(obj && obj.detail && obj.detail.fieldData));
})();
