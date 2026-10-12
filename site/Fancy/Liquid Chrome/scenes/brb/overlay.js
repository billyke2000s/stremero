/* ===================================================================
   MY OVERLAY — StreamElements Custom Widget (JS tab)
   Paste ALL of this into the JS tab. No API keys or libraries needed.

   Handles: fading chat (emotes, badges, mod deletions/bans), queued
   follow / sub / resub / gift / community-gift / bits / tip / raid
   alerts, latest-event boxes and a follower goal.

   Settings: paste the "Fields" box from the overlay site into the widget's
   FIELDS tab. Then colours, your name, background image, sounds, filters and
   show/hide switches can all be changed in StreamElements without code.
   The values below are only used if a setting is missing.
   ================================================================= */
(() => {
  'use strict';
  const CONFIG = {
    chatSeconds: 10,      // seconds before a chat message fades out
    maxMessages: 5,       // most chat messages on screen at once
    alertSeconds: 6,      // seconds each alert stays on screen
    followerGoal: 100,    // follower goal target
    minBits: 1,           // smallest cheer that triggers an alert
    minTip: 1,            // smallest tip that triggers an alert
    hideCommands: true,   // hide chat messages starting with !
    hiddenUsers: ['streamelements', 'nightbot', 'moobot', 'fossabot', 'streamlabs'], // lowercase
    useChatColours: true, // colour usernames with each chatter's Twitch colour
    hideLinks: false,     // hide chat messages that contain links
    minRaid: 1,           // smallest raid that triggers an alert
    alerts: { follower: true, subscriber: true, gift: true, cheer: true, tip: true, raid: true },
    alertSound: '',       // https link to a sound (set it in Fields: Alert sound)
    alertVolume: 50       // 0-100
  };
  const LABELS = {"follower":"NEW FOLLOWER","subscriber":"NEW SUBSCRIBER","gift":"GIFTED SUBS","cheer":"CHEER","tip":"TIP","raid":"RAID","followerText":"just followed!","subText":"just subscribed","resubText":"months subscribed","giftText":"gifted by","giftBombText":"subs gifted to the community!","cheerText":"bits cheered!","tipText":"tipped. Thank you!","raidText":"raiders incoming!","empty":"—","host":"HOST","mod":"MOD","sub":"SUB"};

  const $ = id => document.getElementById(id);
  const root = $('ov');
  const chatBox = $('chat'), chatList = $('chat-list');
  const alertBox = $('alert');
  let currency = 'USD';
  const queue = [];
  let busy = false, showTimer = null, hideTimer = null;

  const num = v => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
  const str = v => (v == null ? '' : String(v));
  const money = a => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num(a)); } catch (e) { return num(a).toFixed(2); } };
  const setText = (el, t) => { if (el) el.textContent = t; };
  const tierName = t => ({ '1000': 'Tier 1', '2000': 'Tier 2', '3000': 'Tier 3', prime: 'Prime' })[str(t).toLowerCase()] || 'Tier 1';

  /* ---------- scale the 1920x1080 layout to the browser-source size ---------- */
  function fit() { if (root) root.style.transform = 'scale(' + (Math.min(innerWidth / 1920, innerHeight / 1080) || 1) + ')'; }
  addEventListener('resize', fit); fit();

  /* ---------- latest-event boxes + goal ---------- */
  function latest(type, ev) {
    if (!ev || !Object.prototype.hasOwnProperty.call(ev, 'name')) return;
    let t = str(ev.name) || LABELS.empty;
    if (ev.name && type === 'tip') t += ' · ' + money(ev.amount);
    if (ev.name && type === 'cheer') t += ' · ' + num(ev.amount) + ' bits';
    if (ev.name && type === 'raid') t += ' · ' + num(ev.amount);
    document.querySelectorAll('[data-latest="' + type + '"]').forEach(el => { el.textContent = t; });
  }
  function goal(count) {
    const target = Math.max(1, num(CONFIG.followerGoal));
    const c = num(count);
    setText($('goal-count'), c.toLocaleString() + ' / ' + target.toLocaleString());
    const fill = $('goal-fill'); if (fill) fill.style.width = Math.min(100, c / target * 100) + '%';
  }
  function session(data) {
    data = data || {};
    ['follower', 'subscriber', 'tip', 'cheer', 'raid'].forEach(t => latest(t, data[t + '-latest']));
    if (data['follower-total'] && data['follower-total'].count != null) goal(data['follower-total'].count);
  }

  /* ---------- chat (built with DOM nodes: chat can never inject HTML) ---------- */
  function removeMsg(node) { clearTimeout(node._t); node.remove(); if (chatBox) chatBox.classList.toggle('active', chatList.children.length > 0); }
  function addMessage(d) {
    d = d || {};
    const name = str(d.displayName || d.nick || 'viewer');
    const text = str(d.text).slice(0, 500);
    if (!text || !chatList) return;
    if (CONFIG.hiddenUsers.indexOf(str(d.nick || name).toLowerCase()) !== -1) return;
    if (CONFIG.hideCommands && text.charAt(0) === '!') return;
    if (CONFIG.hideLinks && /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|gg|tv|io|co|uk|me|ly|xyz)\b/i.test(text)) return;

    const msg = document.createElement('div');
    msg.className = 'msg' + (d.isAction ? ' action' : '');
    msg.dataset.msgId = str(d.msgId || (d.tags && d.tags.id));
    msg.dataset.userId = str(d.userId || (d.tags && d.tags['user-id']));
    if (CONFIG.useChatColours && /^#[0-9a-f]{6}$/i.test(str(d.displayColor))) msg.style.setProperty('--user-colour', d.displayColor);

    const head = document.createElement('div'); head.className = 'msg-head';
    const badges = (Array.isArray(d.badges) ? d.badges : []).filter(b => b && /^https:\/\//i.test(str(b.url)));
    if (badges.length) {
      const wrap = document.createElement('span'); wrap.className = 'msg-badges';
      badges.forEach(b => { const i = document.createElement('img'); i.src = b.url; i.alt = ''; i.referrerPolicy = 'no-referrer'; i.onerror = () => i.remove(); wrap.append(i); });
      head.append(wrap);
    }
    const user = document.createElement('span'); user.className = 'msg-user'; user.textContent = name; head.append(user);
    const types = (Array.isArray(d.badges) ? d.badges : []).map(b => b && b.type);
    const role = types.indexOf('broadcaster') !== -1 ? LABELS.host : types.indexOf('moderator') !== -1 ? LABELS.mod : types.indexOf('vip') !== -1 ? 'VIP' : types.indexOf('subscriber') !== -1 ? LABELS.sub : '';
    if (role) { const r = document.createElement('span'); r.className = 'msg-role'; r.textContent = role; head.append(r); }

    const body = document.createElement('div'); body.className = 'msg-body';
    // Emotes are placed by position, so emote names inside words are never touched.
    const emotes = (Array.isArray(d.emotes) ? d.emotes : [])
      .map(e => ({ s: Number(e.start), e: Number(e.end), url: str((e.urls && (e.urls['4'] || e.urls['2'] || e.urls['1'])) || e.gif) }))
      .filter(e => Number.isInteger(e.s) && Number.isInteger(e.e) && e.e >= e.s && e.e < text.length && /^https:\/\//i.test(e.url))
      .sort((a, b) => a.s - b.s);
    let cur = 0;
    emotes.forEach(e => {
      if (e.s < cur) return;
      body.append(document.createTextNode(text.slice(cur, e.s)));
      const img = document.createElement('img'); img.className = 'emote'; img.src = e.url; img.alt = text.slice(e.s, e.e + 1); img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.replaceWith(document.createTextNode(img.alt));
      body.append(img); cur = e.e + 1;
    });
    body.append(document.createTextNode(text.slice(cur)));

    msg.append(head, body);
    chatList.append(msg);
    if (chatBox) chatBox.classList.add('active');
    while (chatList.children.length > CONFIG.maxMessages) removeMsg(chatList.firstElementChild);
    msg._t = setTimeout(() => { msg.classList.add('leaving'); msg._t = setTimeout(() => removeMsg(msg), 600); }, num(CONFIG.chatSeconds) * 1000);
  }

  /* ---------- alerts (queued, one at a time) ---------- */
  function enqueue(kind, icon, name, detail) {
    if (!CONFIG.alerts[kind]) return;
    if (queue.length >= 50) queue.shift();
    queue.push({ kind, icon, name, detail });
    if (!busy) next();
  }
  function next() {
    if (!queue.length || !alertBox) { busy = false; return; }
    busy = true;
    const a = queue.shift();
    alertBox.dataset.kind = a.kind;
    setText($('alert-kind'), LABELS[a.kind] || a.kind);
    setText($('alert-icon'), a.icon);
    setText($('alert-name'), a.name);
    setText($('alert-detail'), a.detail);
    alertBox.style.setProperty('--alert-seconds', CONFIG.alertSeconds + 's');
    alertBox.classList.remove('hide');
    void alertBox.offsetWidth; // restart CSS animations
    alertBox.classList.add('show');
    showTimer = setTimeout(finish, num(CONFIG.alertSeconds) * 1000);
    playSound();
  }
  function playSound() {
    if (!/^https:\/\//i.test(CONFIG.alertSound)) return;
    try { const a = new Audio(CONFIG.alertSound); a.volume = Math.max(0, Math.min(1, num(CONFIG.alertVolume) / 100)); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* sound blocked or missing */ }
  }
  function finish() {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    if (!busy) return;
    alertBox.classList.remove('show'); alertBox.classList.add('hide');
    hideTimer = setTimeout(() => { alertBox.classList.remove('hide'); next(); }, 600);
  }
  function alertFor(type, ev) {
    const who = str(ev.name) || 'Someone';
    if (type === 'follower') return enqueue('follower', '♥', who, LABELS.followerText);
    if (type === 'subscriber') {
      if (ev.bulkGifted) return enqueue('gift', '✦', str(ev.sender || ev.name) || 'Someone', num(ev.amount) + ' ' + LABELS.giftBombText);
      if (ev.isCommunityGift || ev.playedAsCommunityGift) return; // already covered by the community-gift alert
      if (ev.gifted) return enqueue('gift', '✦', who, LABELS.giftText + ' ' + (str(ev.sender) || 'Someone'));
      if (num(ev.amount) > 1) return enqueue('subscriber', '★', who, num(ev.amount) + ' ' + LABELS.resubText + ' · ' + tierName(ev.tier));
      return enqueue('subscriber', '★', who, LABELS.subText + ' · ' + tierName(ev.tier));
    }
    if (type === 'cheer') { if (num(ev.amount) < Math.max(1, CONFIG.minBits)) return; return enqueue('cheer', '◆', who, num(ev.amount) + ' ' + LABELS.cheerText); }
    if (type === 'tip') { if (num(ev.amount) <= 0 || num(ev.amount) < CONFIG.minTip) return; return enqueue('tip', '✚', who, money(ev.amount) + ' ' + LABELS.tipText); }
    if (type === 'raid') { if (num(ev.amount) < CONFIG.minRaid) return; return enqueue('raid', '➤', who, num(ev.amount) + ' ' + LABELS.raidText); }
  }

  /* ---------- StreamElements events ---------- */
  addEventListener('onWidgetLoad', obj => {
    const d = (obj && obj.detail) || {};
    const f = d.fieldData || {};
    const pos = (v, fb) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fb);
    CONFIG.chatSeconds = pos(f.chatSeconds, CONFIG.chatSeconds);
    CONFIG.alertSeconds = pos(f.alertSeconds, CONFIG.alertSeconds);
    CONFIG.followerGoal = pos(f.followerGoal, CONFIG.followerGoal);
    CONFIG.maxMessages = Math.round(pos(f.maxMessages, CONFIG.maxMessages));
    if (f.minBits != null && f.minBits !== '') CONFIG.minBits = num(f.minBits);
    if (f.minTip != null && f.minTip !== '') CONFIG.minTip = num(f.minTip);
    if (f.minRaid != null && f.minRaid !== '') CONFIG.minRaid = num(f.minRaid);
    const bool = (v, fb) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : fb);
    CONFIG.hideCommands = bool(f.hideCommands, CONFIG.hideCommands);
    CONFIG.hideLinks = bool(f.hideLinks, CONFIG.hideLinks);
    CONFIG.useChatColours = bool(f.useChatColours, CONFIG.useChatColours);
    if (typeof f.hiddenUsers === 'string') CONFIG.hiddenUsers = f.hiddenUsers.split(/[\s,]+/).map(u => u.trim().toLowerCase()).filter(Boolean);
    Object.keys(CONFIG.alerts).forEach(k => { CONFIG.alerts[k] = bool(f['alert' + k[0].toUpperCase() + k.slice(1)], CONFIG.alerts[k]); });
    if (typeof f.alertSound === 'string') CONFIG.alertSound = f.alertSound.trim();
    if (f.alertVolume != null && f.alertVolume !== '') CONFIG.alertVolume = num(f.alertVolume);
    if (d.currency && d.currency.code) currency = d.currency.code;
    goal(0);
    session(d.session && d.session.data);
  });
  addEventListener('onSessionUpdate', obj => session(obj && obj.detail && obj.detail.session));
  addEventListener('onEventReceived', obj => {
    const detail = (obj && obj.detail) || {};
    const listener = str(detail.listener), ev = detail.event || {};
    if (listener === 'message') return addMessage(ev.data);
    if (listener === 'delete-message' || listener === 'delete-messages') {
      const data = ev.data || ev, key = listener === 'delete-message' ? 'msgId' : 'userId';
      if (data[key] != null && chatList) Array.prototype.slice.call(chatList.children).filter(n => n.dataset[key] === str(data[key])).forEach(removeMsg);
      return;
    }
    if (listener === 'event:skip') return finish();
    const m = listener.match(/^(follower|subscriber|cheer|tip|raid)-latest$/);
    if (!m) return;
    if ((m[1] === 'cheer' || m[1] === 'tip') && num(ev.amount) <= 0) return; // malformed amount
    latest(m[1], ev);
    alertFor(m[1], ev);
  });
})();

/* ---- Appearance settings (StreamElements "Fields" panel) ----------------------------------
   Colours, your name and socials, background image with see-through game window + webcam,
   part positions (from the overlay site's Edit mode), show/hide switches, custom text,
   clock, animations and chat text size. All editable in the Fields panel without code. */
(() => {
  'use strict';
  const LOOK = {"root":"#ov","colors":[".ov|--game-frame","--accent","--text","--cam-border","--nameplate-bg","--alert-bg","--chat-bg","--chat-name","--stat-bg","--goal-fill","--chrome-hi","--chrome-lo"],"parts":{"socials":{"sel":".socials","on":true},"chat":{"sel":"#chat","on":true},"alerts":{"sel":"#alert","on":true},"transition":{"sel":".sx","on":true}},"cam":"auto","game":null};
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
