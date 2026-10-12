/* Paste into JS. No API key, external libraries or separate chat widget needed. */
(() => {
  'use strict';
  const CONFIG = {
    chatSeconds: 8, maxMessages: 5, alertSeconds: 6, followerGoal: 100,
    hideCommands: true, hiddenUsers: ['streamelements', 'nightbot'],
    currency: 'GBP' // Replaced by your StreamElements channel currency on load.
  };
  const $ = id => document.getElementById(id);
  const types = { follower: 'NEW FOLLOWER', subscriber: 'SUBSCRIBER', tip: 'FIELD SUPPORT', cheer: 'SIGNAL BOOST', raid: 'REINFORCEMENTS' };
  let currency = CONFIG.currency, alertTimer, gapTimer, busy = false;
  const queue = [], timers = new Map();
  const started = Date.now();
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const money = amount => { try { return new Intl.NumberFormat('en-GB', {style:'currency', currency}).format(number(amount)); } catch { return number(amount).toFixed(2); } };
  function fit() { $('overlay').style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; }
  function clock() {
    $('uptime').textContent = new Date(Date.now() - started).toISOString().slice(11,19);
    $('timestamp').textContent = new Date().toISOString().replace('T',' ').slice(0,19) + ' UTC';
  }
  function latest(type, event) {
    if (!event || !Object.prototype.hasOwnProperty.call(event, 'name')) return;
    let text = event.name || 'AWAITING SIGNAL';
    if (event.name && type === 'tip') text += ' / ' + money(event.amount);
    if (event.name && type === 'cheer') text += ' / ' + number(event.amount) + ' BITS';
    if (event.name && type === 'raid') text += ' / ' + number(event.amount);
    $(type).textContent = text;
  }
  function session(data = {}) {
    Object.keys(types).forEach(type => latest(type, data[type + '-latest']));
    if (data['follower-total']?.count != null) {
      const count = number(data['follower-total'].count);
      $('goal-count').textContent = `${count.toLocaleString()} / ${CONFIG.followerGoal.toLocaleString()}`;
      $('goal-fill').style.width = Math.min(100, count / CONFIG.followerGoal * 100) + '%';
    }
  }
  function removeMessage(node) {
    clearTimeout(timers.get(node)); timers.delete(node); node.remove();
    $('chat').classList.toggle('active', $('messages').children.length > 0);
  }
  function message(data = {}) {
    const name = String(data.displayName || data.nick || 'Viewer');
    const text = String(data.text || '').slice(0, 1000);
    if (!text || CONFIG.hiddenUsers.includes(String(data.nick || name).toLowerCase()) || (CONFIG.hideCommands && text.startsWith('!'))) return;
    const node = document.createElement('article'); node.className = 'message' + (data.isAction ? ' action' : '');
    node.dataset.msgId = String(data.msgId || data.tags?.id || '');
    node.dataset.userId = String(data.userId || data.tags?.['user-id'] || '');
    const head = document.createElement('div'); head.className = 'message-head';
    const user = document.createElement('span'); user.className = 'username'; user.textContent = name; head.append(user);
    const badges = Array.isArray(data.badges) ? data.badges : [];
    const role = badges.some(b => b.type === 'broadcaster') ? 'OPERATOR' : badges.some(b => b.type === 'moderator') ? 'MOD' : badges.some(b => b.type === 'subscriber') ? 'SUB' : '';
    if (role) { const badge = document.createElement('span'); badge.className='role'; badge.textContent=role; head.append(badge); }
    const body = document.createElement('div'); body.className = 'message-body';
    // Text nodes prevent chat/usernames from being interpreted as HTML.
    let cursor = 0;
    const emotes = Array.isArray(data.emotes) ? [...data.emotes].sort((a,b) => a.start-b.start) : [];
    for (const emote of emotes) {
      const start = Number(emote.start), end = Number(emote.end);
      const url = emote.urls?.['2'] || emote.urls?.['1'];
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < cursor || end < start || end >= text.length || !/^https:\/\//i.test(url || '')) continue;
      body.append(document.createTextNode(text.slice(cursor,start)));
      const img = document.createElement('img'); img.src = url; img.alt = text.slice(start,end+1); img.referrerPolicy='no-referrer';
      img.onerror = () => img.replaceWith(document.createTextNode(img.alt)); body.append(img); cursor=end+1;
    }
    body.append(document.createTextNode(text.slice(cursor))); node.append(head,body); $('messages').append(node);
    while ($('messages').children.length > CONFIG.maxMessages) removeMessage($('messages').firstElementChild);
    $('chat').classList.add('active');
    timers.set(node, setTimeout(() => { node.classList.add('leaving'); timers.set(node,setTimeout(() => removeMessage(node),400)); }, CONFIG.chatSeconds*1000));
  }
  function nextAlert() {
    if (busy || !queue.length) return;
    busy=true;
    const {type,event} = queue.shift();
    $('alert-label').textContent = 'INCOMING // ' + types[type];
    $('alert-name').textContent = event.bulkGifted ? (event.sender || event.name || 'Anonymous') : (event.name || 'Anonymous');
    let detail = {follower:'Operator joined the squad.',subscriber:'Support unit connected.',tip:`${money(event.amount)} received. Thank you for the support.`,cheer:`${number(event.amount)} bits received. Signal amplified.`,raid:`${number(event.amount)} viewers incoming. Welcome to the squad.`}[type];
    if (type === 'subscriber') {
      if (event.bulkGifted) detail = `${number(event.amount)} subscriptions gifted to the squad.`;
      else if (event.gifted) detail = `Subscription gifted by ${event.sender || 'Anonymous'}.`;
      else if (number(event.amount) > 1) detail = `${number(event.amount)} months of support. Welcome back.`;
    }
    $('alert-detail').textContent=detail;
    $('alert').style.setProperty('--alert-duration',CONFIG.alertSeconds+'s'); $('alert').classList.add('visible');
    alertTimer=setTimeout(finishAlert,CONFIG.alertSeconds*1000);
  }
  function finishAlert() {
    clearTimeout(alertTimer); clearTimeout(gapTimer); $('alert').classList.remove('visible');
    gapTimer=setTimeout(() => { busy=false; nextAlert(); },400);
  }
  window.addEventListener('onWidgetLoad', obj => {
    const f = obj.detail?.fieldData || {};   // settings from the StreamElements Fields panel
    ['chatSeconds', 'maxMessages', 'alertSeconds', 'followerGoal'].forEach(k => { if (Number(f[k]) > 0) CONFIG[k] = Number(f[k]); });
    if (typeof f.hideCommands === 'boolean') CONFIG.hideCommands = f.hideCommands;
    if (typeof f.hiddenUsers === 'string') CONFIG.hiddenUsers = f.hiddenUsers.split(/[\s,]+/).map(u => u.trim().toLowerCase()).filter(Boolean);
    currency = obj.detail?.currency?.code || CONFIG.currency;
    session(obj.detail?.session?.data || {});
  });
  window.addEventListener('onSessionUpdate', obj => session(obj.detail?.session || {}));
  window.addEventListener('onEventReceived', obj => {
    const {listener, event = {}} = obj.detail || {};
    if (listener === 'message') return message(event.data || {});
    if (listener === 'delete-message' || listener === 'delete-messages') {
      const data = event.data || event;
      const key = listener === 'delete-message' ? 'msgId' : 'userId';
      if (data[key] != null) [...$('messages').children].filter(n => n.dataset[key] === String(data[key])).forEach(removeMessage);
      return;
    }
    if (listener === 'event:skip') { finishAlert(); return; }
    const type = String(listener).replace(/-latest$/, '');
    if (!Object.prototype.hasOwnProperty.call(types,type) || listener !== type+'-latest') return;
    if ((type === 'cheer' || type === 'tip') && number(event.amount) <= 0) return; // malformed or empty amount
    latest(type,event);
    // Avoid replaying every individual gift after a community gift alert.
    if (type === 'subscriber' && (event.isCommunityGift || event.playedAsCommunityGift) && !event.bulkGifted) return;
    if (queue.length >= 50) queue.shift();
    queue.push({type,event}); nextAlert();
  });
  window.addEventListener('resize',fit); fit(); clock(); setInterval(clock,1000);
})();

/* ---- Appearance settings (StreamElements "Fields" panel) ----------------------------------
   Colours, your name and socials, background image with see-through game window + webcam,
   part positions (from the overlay site's Edit mode), show/hide switches, custom text,
   clock, animations and chat text size. All editable in the Fields panel without code. */
(() => {
  'use strict';
  const LOOK = {"root": "#overlay", "colors": ["--red", "--white", "--alert-bg", "--chat-head", "--chat-bg", "--stat-bg", "--goal-bg", "--game-frame"], "parts": {"chat": {"sel": "#chat", "on": true}, "alerts": {"sel": "#alert", "on": true}, "latest": {"sel": "#overlay>footer", "on": true}, "transition": {"sel": ".sx", "on": true}}, "cam": null, "game": [48, 110, 1452, 817]};
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
