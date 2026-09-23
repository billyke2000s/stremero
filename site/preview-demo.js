/* PREVIEW ONLY — simulated StreamElements activity. Never paste this into StreamElements. */
(function () {
  'use strict';
  function emit(listener, event) { dispatchEvent(new CustomEvent('onEventReceived', { detail: { listener: listener, event: event } })); }
  var st = document.createElement('style');
  st.textContent = '[data-cam-hole]{outline:2px dashed rgba(255,255,255,.35);outline-offset:-2px}' +
    '[data-cam-hole]::after{content:"YOUR WEBCAM";position:absolute;inset:0;display:grid;place-items:center;font:600 22px Arial,sans-serif;letter-spacing:6px;color:rgba(255,255,255,.45);text-shadow:0 1px 3px #000}' +
    '[data-cam-hole]{position:absolute}' +
    '.has-bg>.game-frame{display:block!important}.has-bg:not(.frame-on) .game-box{box-shadow:none!important}' +
    '.has-bg [data-game-hole]{outline:2px dashed rgba(255,255,255,.55);outline-offset:-2px}' +
    '.has-bg [data-game-hole]::after{content:"YOUR GAME GOES HERE";position:absolute;inset:0;display:grid;place-items:center;font:700 28px Arial,sans-serif;letter-spacing:8px;color:rgba(0,0,0,.45);text-shadow:0 1px 0 rgba(255,255,255,.6)}';
  document.head.appendChild(st);
  var SESSION = { data: {
    'follower-total': { count: 72 }, 'follower-latest': { name: 'PixelPal' }, 'subscriber-latest': { name: 'NightOwl', amount: 3 },
    'tip-latest': { name: 'FrontRow', amount: 5 }, 'cheer-latest': { name: 'CosyCrew', amount: 250 }, 'raid-latest': { name: 'SquadGoals', amount: 24 } } };
  function load(fieldData) { dispatchEvent(new CustomEvent('onWidgetLoad', { detail: { currency: { code: 'GBP' }, fieldData: fieldData || {}, session: SESSION } })); }
  load(window.__FIELDS);
  var chats = [
    ['PixelPal', 'this overlay is so clean', '#9EF01A', ['subscriber']],
    ['NightOwl', 'Love the colours!', '#FF6B9A', ['moderator']],
    ['FrontRow', 'gg that was unreal', '#4CC9F0', []],
    ['Your cool name', 'Welcome in everyone!', '#FFD166', ['broadcaster']],
    ['CosyCrew', 'the alerts look amazing', '#C77DFF', ['vip']],
    ['SquadGoals', 'raid incoming later 👀', '#F4A261', ['subscriber']]
  ];
  var alerts = [
    ['follower-latest', { name: 'NewFriend' }],
    ['subscriber-latest', { name: 'NightOwl', amount: 1, tier: '1000' }],
    ['cheer-latest', { name: 'CosyCrew', amount: 500 }],
    ['subscriber-latest', { name: 'GiftGiver', sender: 'GiftGiver', amount: 5, bulkGifted: true, tier: '1000' }],
    ['tip-latest', { name: 'FrontRow', amount: 10 }],
    ['raid-latest', { name: 'SquadGoals', amount: 42 }],
    ['subscriber-latest', { name: 'Loyal', amount: 14, tier: '2000' }]
  ];
  var ci = 0, ai = 0, n = 0;
  function chat() { var c = chats[ci++ % chats.length]; n++; emit('message', { data: { displayName: c[0], nick: c[0].toLowerCase(), text: c[1], displayColor: c[2], msgId: 'demo' + n, userId: 'u' + (ci % chats.length), badges: c[3].map(function (t) { return { type: t, url: '' }; }), emotes: [] } }); }
  function alertNext() { var a = alerts[ai++ % alerts.length]; emit(a[0], a[1]); }
  setTimeout(chat, 300); setTimeout(chat, 1100); setTimeout(chat, 2000); setTimeout(alertNext, 900);
  setInterval(chat, 2600); setInterval(alertNext, 8000);

  /* ---- Edit mode (overlay site only): drag parts and the game window, resize the webcam / chat / boxes ---- */
  var ed = { on: false, root: null, layer: null, boxes: {}, drag: null, lock: true, names: {}, timer: null, sel: null };
  var RESIZE = { cam: 1, chat: 1, latest: 1, alerts: 1, text: 1, socials: 1, game: 1 };
  var es = document.createElement('style');
  es.textContent = '.ov-editing .alert{opacity:1!important;animation:none!important}.ov-editing .chat{opacity:1!important}' +
    '.ov-editing>.game-frame{display:block!important}.ov-editing [data-game-hole]{outline:2px dashed rgba(255,255,255,.7);outline-offset:-2px}' +
    '.ed-layer{position:absolute;left:0;top:0;width:1920px;height:1080px;z-index:2147483000;pointer-events:none;font:600 20px Arial,sans-serif}' +
    '.ed-box{position:absolute;pointer-events:auto;cursor:move;outline:3px dashed #3cf;outline-offset:-2px;background:rgba(51,204,255,.08);touch-action:none}' +
    '.ed-box{z-index:2}.ed-box.game{z-index:1;outline-color:#fc3;background:rgba(255,204,51,.05)}.ed-box.sel{z-index:3}.ed-box.sel{outline-style:solid;background:rgba(51,204,255,.16)}' +
    '.ed-box b{position:absolute;left:-3px;top:-34px;padding:4px 10px;background:#3cf;color:#012;white-space:nowrap;border-radius:4px 4px 0 0}' +
    '.ed-box.game b{background:#fc3;top:0;left:0;border-radius:0 0 4px 0}' +
    '.ed-box i{position:absolute;right:-12px;bottom:-12px;width:24px;height:24px;background:#3cf;border:3px solid #012;border-radius:50%;cursor:nwse-resize}.ed-box.game i{background:#fc3}';
  document.head.appendChild(es);
  function edRoot() { var b = document.querySelector('.bg-layer'); return b && b.parentElement; }
  function scaleOf(root) { var r = root.getBoundingClientRect(); return (r.width / root.offsetWidth) || 1; }
  function partEl(k) { return k === 'game' ? ed.root.querySelector('.game-box') : ed.root.querySelector('[data-part="' + k + '"]'); }
  function visible(el) { return el && el.offsetWidth > 0 && getComputedStyle(el).display !== 'none'; }
  function rectOf(el) {   // position in the overlay's own 1920x1080 pixels
    var R = ed.root.getBoundingClientRect(), r = el.getBoundingClientRect(), s = scaleOf(ed.root);
    return [Math.round((r.left - R.left) / s), Math.round((r.top - R.top) / s), Math.round(r.width / s), Math.round(r.height / s)];
  }
  function sync() {
    if (!ed.on) return;
    var keys = Array.prototype.map.call(ed.root.querySelectorAll('[data-part]'), function (e) { return e.getAttribute('data-part'); });
    keys.push('game');
    keys.forEach(function (k) {
      var el = partEl(k), box = ed.boxes[k];
      if (!visible(el)) { if (box) box.style.display = 'none'; return; }
      if (!box) {
        box = ed.boxes[k] = document.createElement('div'); box.className = 'ed-box' + (k === 'game' ? ' game' : ''); box.tabIndex = 0;
        box.setAttribute('role', 'button'); box.setAttribute('aria-label', 'Move ' + (ed.names[k] || k) + ' (arrow keys nudge, Shift for 10px)');
        var b = document.createElement('b'); b.textContent = ed.names[k] || k; box.appendChild(b);
        if (RESIZE[k]) { var h = document.createElement('i'); h.title = 'Drag to resize'; box.appendChild(h); }
        box.addEventListener('pointerdown', function (e) { start(e, k, e.target.tagName === 'I'); });
        box.addEventListener('keydown', function (e) { nudge(e, k); });
        box.addEventListener('focus', function () { select(k); });
        ed.layer.appendChild(box);
      }
      var r = rectOf(el);
      box.style.display = ''; box.style.left = r[0] + 'px'; box.style.top = r[1] + 'px'; box.style.width = r[2] + 'px'; box.style.height = r[3] + 'px';
    });
  }
  function select(k) { ed.sel = k; Object.keys(ed.boxes).forEach(function (n) { ed.boxes[n].classList.toggle('sel', n === k); }); }
  function place(k, el, x, y, w, h) {
    if (k === 'game') { Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); return; }
    Object.assign(el.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto', marginLeft: '0px', marginTop: '0px', width: w + 'px' });
    if (h) { el.style.height = h + 'px'; el.style.maxHeight = h + 'px'; }
  }
  function start(e, k, resize) {
    e.preventDefault(); e.stopPropagation(); select(k);
    var el = partEl(k); if (!el) return;
    var off = k === 'game' ? [el.offsetLeft, el.offsetTop] : [el.offsetLeft, el.offsetTop];
    ed.drag = { k: k, el: el, resize: resize, sx: e.clientX, sy: e.clientY, x: off[0], y: off[1], w: el.offsetWidth, h: el.offsetHeight,
      setH: resize || !!el.style.height, s: scaleOf(ed.root), id: e.pointerId, box: ed.boxes[k] };
    try { ed.boxes[k].setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  addEventListener('pointermove', function (e) {
    var d = ed.drag; if (!d || e.pointerId !== d.id) return;
    var dx = (e.clientX - d.sx) / d.s, dy = (e.clientY - d.sy) / d.s;
    if (d.resize) {
      var w = clamp(Math.round(d.w + dx), 80, 1920), h = clamp(Math.round(d.h + dy), 40, 1080);
      if (d.k === 'game' && ed.lock) h = Math.round(w * 9 / 16);
      d.nw = w; d.nh = h; place(d.k, d.el, d.x, d.y, w, d.setH ? h : 0);
    } else {
      var x = Math.round(d.x + dx), y = Math.round(d.y + dy);
      if (e.shiftKey) { x = Math.round(x / 24) * 24; y = Math.round(y / 24) * 24; }     // hold Shift to snap to a 24px grid
      x = clamp(x, -200, 1900); y = clamp(y, -200, 1060);
      d.nx = x; d.ny = y; place(d.k, d.el, x, y, d.w, d.setH ? d.h : 0);
    }
    sync();
  });
  function finish(k, el, setH) {
    var msg = { scope: 'overlay-demo', action: k === 'game' ? 'game-moved' : 'part-moved', part: k,
      rect: [el.offsetLeft, el.offsetTop, el.offsetWidth, setH ? el.offsetHeight : 0] };
    try { parent.postMessage(msg, '*'); } catch (err) { /* ignore */ }
  }
  function end(e) { var d = ed.drag; if (!d || e.pointerId !== d.id) return; ed.drag = null; if (d.nx != null || d.nw != null) finish(d.k, d.el, d.setH); }
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  function nudge(e, k) {
    var m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!m) return;
    e.preventDefault(); var el = partEl(k); if (!el) return; var n = e.shiftKey ? 10 : 1;
    place(k, el, el.offsetLeft + m[0] * n, el.offsetTop + m[1] * n, el.offsetWidth, el.style.height ? el.offsetHeight : 0);
    sync(); clearTimeout(ed.nt); ed.nt = setTimeout(function () { finish(k, el, !!el.style.height); }, 250);
  }
  function setEdit(on, opts) {
    ed.root = edRoot(); if (!ed.root) return;
    ed.on = !!on; ed.lock = !opts || opts.lock !== false; ed.names = (opts && opts.names) || ed.names;
    ed.root.classList.toggle('ov-editing', ed.on);
    if (ed.on && !ed.layer) { ed.layer = document.createElement('div'); ed.layer.className = 'ed-layer'; ed.root.appendChild(ed.layer); }
    if (ed.layer) ed.layer.style.display = ed.on ? '' : 'none';
    clearInterval(ed.timer);
    if (ed.on) { var a = document.getElementById('alert-name'); if (a && !a.textContent) { a.textContent = 'NewFriend'; } sync(); ed.timer = setInterval(function () { if (!ed.drag) sync(); }, 150); }
  }
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.scope !== 'overlay-demo') return;
    if (d.action === 'vars' && d.vars) Object.keys(d.vars).forEach(function (k) { if (/^--[\w-]+$/.test(k)) document.documentElement.style.setProperty(k, d.vars[k]); });
    if (d.action === 'text' && d.fields) Object.keys(d.fields).forEach(function (k) { document.querySelectorAll('[data-field="' + k.replace(/[^\w-]/g, '') + '"]').forEach(function (el) { el.textContent = d.fields[k]; }); });
    if (d.action === 'fields' && d.fieldData && typeof d.fieldData === 'object') load(d.fieldData);
    if (d.action === 'edit') setEdit(d.on, d);
    if (d.action === 'alert') alertNext();
    if (d.action === 'chat') chat();
    if (d.action === 'chat-line' && typeof d.text === 'string') { n++; emit('message', { data: { displayName: String(d.name || 'You').slice(0, 32), nick: 'you', text: d.text.slice(0, 300), displayColor: '#FFD166', msgId: 'demo' + n, userId: 'you', badges: [{ type: 'broadcaster', url: '' }], emotes: [] } }); }
  });
})();
