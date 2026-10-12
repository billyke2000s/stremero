'use strict';
/* Overlay gallery: preview on a transparency grid, customise (built from each overlay's
   StreamElements Fields), then copy HTML / CSS / JS / Fields into StreamElements. */
const $ = id => document.getElementById(id);
const overlays = window.OVERLAYS || [];
// categories are the folders of the site (catalog.js is made from them), in the order the folder scan gives
const CATEGORIES = ['All', ...new Set(overlays.map(o => o.category))];
const HANDLE_KEYS = ['youtube', 'tiktok', 'twitch'];
const SKIP_GENERIC = ['widgetName', 'streamerName', 'youtube', 'tiktok', 'twitch', 'bgImage', 'bgOpacity', 'gameX', 'gameY', 'gameW', 'gameH', 'gameRadius', 'gameFrame', 'cutCam'];
const ANNOTATION = /^([ \t]*)(--[\w-]+)[ \t]*:[ \t]*([^;]+?)[ \t]*;[ \t]*\/\*[ \t]*@(color)[ \t]+([^*@]+?)[ \t]*(?:@key[ \t]+(\w+)[ \t]*)?\*\//gm;
/* Settings that are the same on every overlay: set them once and every overlay uses them.
   Colours, the game window and part positions stay separate for each overlay. */
const SHARED = ['youtube', 'tiktok', 'twitch', 'customText', 'clock24', 'bgOpacity', 'animations', 'chatScale', 'chatSeconds', 'maxMessages',
  'useChatColours', 'hideCommands', 'hideLinks', 'hiddenUsers', 'alertSeconds', 'alertFollower', 'alertSubscriber', 'alertGift', 'alertCheer',
  'alertTip', 'alertRaid', 'minBits', 'minTip', 'minRaid', 'alertVolume', 'followerGoal'];
const ALIAS = { chatLife: 'chatSeconds', alertDuration: 'alertSeconds' };   // the two original overlays use older names
const sharedKey = k => ALIAS[k] || k;
const isShared = k => SHARED.includes(sharedKey(k));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

let shared = (() => { const v = store.get('overlay-shared'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; })();
let selected = null, files = null, fieldDefs = {};
let values = {};                 // current setting values (same keys as the StreamElements Fields)
let bgImage = '';                // background image for the preview only (never put into the code)
let streamerName = sanitiseName(store.get('overlay-name')) || 'Your cool name';

/* Background image store: IndexedDB holds big images (localStorage is only ~5 MB). */
const bgStore = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('overlay-site', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async run(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', mode); const q = fn(tx.objectStore('files')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); },
  save(blob) { return this.run('readwrite', s => s.put(blob, 'background')).then(() => true).catch(() => false); },
  load() { return this.run('readonly', s => s.get('background')).catch(() => null); },
  clear() { return this.run('readwrite', s => s.delete('background')).catch(() => null); }
};
const blobToDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
let bgReady = null;   // loads the saved background once per visit
function loadSavedBackground() {
  if (!bgReady) bgReady = (async () => {
    const old = store.get('overlay-bg');                      // move an older localStorage copy across
    if (typeof old === 'string' && /^data:image\//.test(old)) { try { await bgStore.save(await (await fetch(old)).blob()); } catch (e) { /* ignore */ } store.del('overlay-bg'); }
    const blob = await bgStore.load();
    if (blob instanceof Blob && /^image\//.test(blob.type)) bgImage = await blobToDataURL(blob);
  })().catch(() => {});
  return bgReady;
}

function sanitiseName(v) { return typeof v === 'string' && /^[a-zA-Z0-9 _-]{1,32}$/.test(v) ? v : null; }
function escapeHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function basePath(item) { return item.path.split('/').filter(Boolean).map(encodeURIComponent).join('/') + '/'; }
function linkTo(item, scene) { const b = item.base || item; return 'index.html?overlay=' + encodeURIComponent(b.path.replace(/\/$/, '')) + (scene && scene !== 'main' ? '&scene=' + encodeURIComponent(scene) : ''); }
/* an overlay's extra scene (Starting soon, Be right back, Ending, Just Chatting), opened like its own overlay */
function sceneItem(item, id) {
  const sc = (item.scenes || []).find(x => x.id === id);
  if (!sc) return item;
  return Object.assign({}, item, { base: item, scene: sc.id, sceneLabel: sc.label, key: item.name + ' · ' + sc.id,
    path: item.path + 'scenes/' + sc.id + '/', html: 'overlay.html', css: 'styles.css', js: 'overlay.js', fields: sc.fields, help: sc.help,
    cam: sc.cam, game: [0, 0, 0, 0] });
}
const storeKey = item => item.key || item.name;
function notify(message) { $('status').textContent = message; $('status').hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => { $('status').hidden = true; }, 5500); }
function el(tag, props, ...kids) { const e = document.createElement(tag); Object.assign(e, props || {}); kids.forEach(k => e.append(k)); return e; }

/* ------------------------------------------------------------------ gallery */
function thumb(item, className) {
  if (!item.icon) return el('div', { className: className + ' fallback', textContent: item.name.slice(0, 2).toUpperCase() });
  const img = el('img', { className, alt: '', loading: 'lazy', src: basePath(item) + encodeURIComponent(item.icon) });
  img.onerror = () => img.replaceWith(el('div', { className: className + ' fallback', textContent: item.name.slice(0, 2).toUpperCase() }));
  return img;
}
function matches(item, q) {
  if (!q) return true;
  const hay = (item.name + ' ' + item.category + ' ' + (item.tags || '')).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
/* where the background would show on an overlay: everything except its game window and webcam hole */
function holesFor(item) {
  const saved = store.get('overlay-values:' + item.name) || {};
  const g = ['gameX', 'gameY', 'gameW', 'gameH'].map((k, i) => Number.isFinite(saved[k]) ? saved[k] : item.game[i]);
  const holes = [[g[0], g[1], g[2], g[3], Number.isFinite(saved.gameRadius) ? saved.gameRadius : 0]];
  const cam = camFor(item, saved);
  if (cam && saved.cutCam !== false && saved.showCam !== false) holes.push([cam[0], cam[1], cam[2], cam[3], 8]);
  return holes;
}
function camFor(item, saved) {
  if (!item.cam) return null;
  let layout = {}; try { layout = JSON.parse((saved || {}).layout || '{}') || {}; } catch (e) { /* ignore */ }
  const p = layout.cam;
  if (!Array.isArray(p) || p.length < 2) return item.cam;
  return [Math.round(+p[0]), Math.round(+p[1]), +p[2] >= 40 ? Math.round(+p[2]) : item.cam[2], +p[3] >= 40 ? Math.round(+p[3]) : item.cam[3]];
}
function holeMaskURL(holes) {
  const cut = holes.map(h => `<rect x="${h[0]}" y="${h[1]}" width="${h[2]}" height="${h[3]}" rx="${h[4] || 0}" fill="black"/>`).join('');
  return 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><mask id="m"><rect width="1920" height="1080" fill="white"/>${cut}</mask><rect width="1920" height="1080" fill="black" mask="url(#m)"/></svg>`) + '")';
}
let bgURL = '';   // one object URL shared by every gallery card (not 60 copies of a big data URL)
async function refreshBgURL() {
  if (bgURL) { URL.revokeObjectURL(bgURL); bgURL = ''; }
  const blob = await bgStore.load().catch(() => null);
  if (blob instanceof Blob && /^image\//.test(blob.type)) bgURL = URL.createObjectURL(blob);
}
function cardBackground(item) {
  const layer = el('div', { className: 'thumb-bg' });
  layer.setAttribute('aria-hidden', 'true');
  const mask = holeMaskURL(holesFor(item));
  layer.style.backgroundImage = 'url("' + bgURL + '")';
  layer.style.webkitMaskImage = mask; layer.style.maskImage = mask;
  const op = Number.isFinite(shared.bgOpacity) ? shared.bgOpacity : 100;
  layer.style.opacity = String(Math.max(0, Math.min(100, op)) / 100);
  return layer;
}
function buildGallery() {
  const groups = {};
  overlays.forEach(o => { (groups[o.category] = groups[o.category] || []).push(o); });
  const saved = store.get('overlay-filter');
  let active = CATEGORIES.includes(saved) ? saved : 'All', query = '';
  const renderGrid = () => {
    $('grid').replaceChildren();
    const list = overlays.filter(o => (active === 'All' || o.category === active) && matches(o, query));
    if (active === 'All' && !query) {
      $('grid').append(el('a', { className: 'card build-card', href: 'editor.html' },
        el('div', { className: 'thumbnail build-thumb' }, el('span', { textContent: '✚' }), el('strong', { textContent: 'Open the editor' })),
        el('h2', { textContent: 'Build your own in the editor' }), el('p', { textContent: 'Drag parts from any overlay onto your canvas, move, resize and recolour them' })));
    }
    list.forEach(item => {
      const image = el('div', { className: 'thumbnail' });
      if (bgURL) image.append(cardBackground(item));
      image.append(thumb(item, ''), el('span', { className: 'tag', textContent: item.category }));
      const card = el('a', { className: 'card', href: linkTo(item) }, image, el('h2', { textContent: item.name }),
        el('p', { textContent: (item.fields ? 'StreamElements · Background image · Name + socials' : 'StreamElements overlay') + (item.scenes && item.scenes.length ? ' · ' + (item.scenes.length + 1) + ' scenes' : '') }));
      $('grid').append(card); scenePreview(card, item);
    });
    $('empty').hidden = list.length > 0;
    $('empty').textContent = query ? 'Nothing matches “' + query + '”. Try a colour or a mood (cosy, neon, gold, horror).' : 'No overlays yet.';
    [...$('filters').children].forEach(b => b.dataset.cat && b.setAttribute('aria-pressed', String(b.dataset.cat === active)));
  };
  $('filters').replaceChildren();
  CATEGORIES.forEach(cat => {
    const count = cat === 'All' ? overlays.length : overlays.filter(o => o.category === cat).length;
    if (!count) return;
    const b = el('button', { type: 'button', className: 'chip', textContent: cat + ' · ' + count }); b.dataset.cat = cat;
    b.addEventListener('click', () => { active = cat; store.set('overlay-filter', cat); renderGrid(); });
    $('filters').append(b);
  });
  $('search').oninput = () => { query = $('search').value.trim(); renderGrid(); };
  buildGallery.render = renderGrid;
  renderGrid();
  updateBgBar();
}
/* gallery cards: ‹ › arrows step through the overlay's scenes (only when tapped; the card itself still opens the overlay) */
function scenePreview(card, item) {
  const box = card.querySelector('.thumbnail'), img = box && box.querySelector('img');
  const shots = (item.scenes || []).filter(s => s.thumb).map(s => ({ src: basePath(item) + 'scenes/' + encodeURIComponent(s.id) + '/' + s.thumb, label: s.label, id: s.id }));
  if (!img || !shots.length) return;
  const all = [{ src: img.src, label: 'Gameplay', id: 'main' }].concat(shots);
  let i = 0;
  const chip = el('span', { className: 'scene-chip', textContent: 'Gameplay · 1/' + all.length });
  const show = k => {
    i = (k + all.length) % all.length; img.src = all[i].src;
    chip.textContent = all[i].label + ' · ' + (i + 1) + '/' + all.length;
    card.href = linkTo(item, all[i].id);   // opening the card goes to the scene you're looking at
  };
  const arrow = (cls, label, step) => {
    const b = el('button', { type: 'button', className: 'scene-arrow ' + cls, textContent: cls === 'prev' ? '‹' : '›' });
    b.setAttribute('aria-label', label + ' scene of ' + item.name);
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); show(i + step); });
    return b;
  };
  box.append(chip, arrow('prev', 'Previous', -1), arrow('next', 'Next', 1));
}
function updateBgBar() {
  $('gallery-bg-thumb').style.backgroundImage = bgURL ? 'url("' + bgURL + '")' : '';
  $('gallery-bg-remove').hidden = !bgURL;
  $('gallery-bg-add').textContent = bgURL ? 'Change background' : 'Add background image';
  $('gallery-bg-text').textContent = bgURL ? 'Your background is shown on every preview, cut out where each overlay’s game window and webcam go.' : 'No background. Previews show the see-through grid. Add an image to see it behind every overlay.';
}
async function backgroundChanged() {
  await refreshBgURL();
  if (!$('gallery').hidden && buildGallery.render) buildGallery.render();
  updateBgBar();
}

/* ------------------------------------------------------------------ files + code generation */
async function loadFiles(item) {
  const get = (name, optional) => fetch(basePath(item) + encodeURIComponent(name), { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(name); return r.text(); })
    .catch(e => { if (optional) return ''; throw e; });
  const [html, css, js, help, fields, demo] = await Promise.all([get(item.html), get(item.css), get(item.js),
    item.help ? get(item.help, true) : '', item.fields ? get(item.fields) : '{}', fetch('preview-demo.js', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').catch(() => '')]);
  return { html, css, js, help, fields: JSON.parse(fields), demo };
}
const varOf = key => '--' + key.slice(2).replace(/_/g, '-');   // c_alert_bg -> --alert-bg
function okFor(def, v) {
  return def.type === 'colorpicker' ? !!parseHex(v) : def.type === 'checkbox' ? typeof v === 'boolean'
    : (def.type === 'number' || def.type === 'slider') ? Number.isFinite(v) : typeof v === 'string';
}
function val(key) {
  if (key in values) return values[key];
  const d = fieldDefs[key];
  if (d && isShared(key) && sharedKey(key) in shared && okFor(d, shared[sharedKey(key)])) return shared[sharedKey(key)];
  return d ? d.value : undefined;
}
function allValues() { const out = {}; Object.keys(fieldDefs).forEach(k => { out[k] = val(k); }); out.streamerName = streamerName; return out; }
function buildCSS() {
  // bake the chosen colours into the CSS defaults too, so it looks right even without the Fields
  return files.css.replace(ANNOTATION, (m, indent, name, value, kind, label, ownKey) => {
    const key = ownKey || 'c_' + name.slice(2).replace(/-/g, '_');
    const v = values[key];
    return parseHex(v) ? `${indent}${name}: ${v}; /* @color ${label}${ownKey ? ' @key ' + ownKey : ''} */` : m;
  });
}
function buildFields() {
  const out = JSON.parse(JSON.stringify(fieldDefs));
  Object.keys(out).forEach(k => { if (k !== 'bgImage' && k !== 'alertSound' && out[k].type !== 'hidden') out[k].value = val(k); });
  if (out.layout) out.layout.value = typeof values.layout === 'string' ? values.layout : '{}';
  if (out.streamerName) out.streamerName.value = streamerName;
  return JSON.stringify(out, null, 2);
}
function personalise(text) {
  let out = text.replace(/\{\{STREAMER_NAME\}\}|Your cool name|obskyra/gi, streamerName);
  HANDLE_KEYS.concat('customText').forEach(k => {
    const v = fieldDefs[k] ? val(k) : null;
    if (typeof v !== 'string' || !v) return;
    out = out.replace(new RegExp('(<span data-field="' + k + '">)[^<]*(</span>)', 'g'), (m, a, b) => a + escapeHTML(v) + b);
  });
  return out;
}
function previewFields() { const f = allValues(); f.bgImage = bgImage; f.alertSound = ''; return f; }
function renderPreview() {
  if (!files) return;
  const base = new URL(basePath(selected), location.href).href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const initial = allValues(); initial.bgImage = ''; initial.alertSound = '';   // the (large) background is sent after load
  const doc = '<!doctype html><html><head><meta charset="utf-8"><base href="' + base + '"><style>' + buildCSS() + '</style></head><body>' +
    personalise(files.html) + '<script>' + files.js + '<\/script><script>window.__FIELDS=' + JSON.stringify(initial).replace(/</g, '\\u003c') +
    '<\/script><script>' + personalise(files.demo) + '<\/script></body></html>';
  // a fresh iframe each time: re-using one would add an entry to the browser's Back history on every redraw
  const old = $('preview'), frame = document.createElement('iframe');
  ['id', 'title', 'sandbox', 'allow'].forEach(k => frame.setAttribute(k, old.getAttribute(k)));
  frame.addEventListener('load', () => { if (bgImage) pushFields(); });
  frame.srcdoc = doc;
  old.replaceWith(frame);
}
function pushFields() {
  cancelAnimationFrame(pushFields.raf);
  pushFields.raf = requestAnimationFrame(() => {
    try { $('preview').contentWindow.postMessage({ scope: 'overlay-demo', action: 'fields', fieldData: previewFields() }, '*'); } catch (e) { /* not ready */ }
  });
}
function setValue(key, v, quiet) {
  const def = fieldDefs[key];
  if (isShared(key)) {   // shared: goes to every overlay
    delete values[key];
    if (def && JSON.stringify(def.value) === JSON.stringify(v)) delete shared[sharedKey(key)]; else shared[sharedKey(key)] = v;
    store.set('overlay-shared', shared);
  } else if (def && JSON.stringify(def.value) === JSON.stringify(v)) delete values[key]; else values[key] = v;
  pushFields();
  clearTimeout(setValue.t); setValue.t = setTimeout(save, 250);
  if (!quiet) updateGameInfo();
}
function save() { store.set('overlay-values:' + storeKey(selected), values); }

/* ------------------------------------------------------------------ colour maths */
function parseHex(v) {
  const m = String(v == null ? '' : v).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return null;
  let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
}
function toHex(c) {
  const p = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return '#' + p(c.r) + p(c.g) + p(c.b) + (c.a < 0.999 ? p(c.a * 255) : '');
}
function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function hsvToRgb(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

/* ------------------------------------------------------------------ colour wheel */
const picker = { key: null, h: 0, s: 0, v: 1, a: 1, anchor: null, drawn: false };
function drawWheel() {
  const c = $('wheel'), ctx = c.getContext('2d'), size = c.width, R = size / 2, img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - R + .5, dy = y - R + .5, d = Math.sqrt(dx * dx + dy * dy), i = (y * size + x) * 4;
    if (d > R) continue;
    const rgb = hsvToRgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, d / R, 1);
    img.data[i] = rgb.r; img.data[i + 1] = rgb.g; img.data[i + 2] = rgb.b; img.data[i + 3] = d > R - 1 ? (R - d) * 255 : 255;
  }
  ctx.putImageData(img, 0, 0); picker.drawn = true;
}
function pickerColour() { const rgb = hsvToRgb(picker.h, picker.s, picker.v); return toHex({ r: rgb.r, g: rgb.g, b: rgb.b, a: picker.a }); }
function syncPickerUI(fromHexInput) {
  const R = $('wheel').width / 2, rad = picker.s * R, ang = picker.h * Math.PI / 180;
  $('wheel-dot').style.left = (R + rad * Math.cos(ang)) + 'px'; $('wheel-dot').style.top = (R + rad * Math.sin(ang)) + 'px';
  $('wheel').style.filter = 'brightness(' + Math.max(.15, picker.v) + ')';
  $('val').value = Math.round(picker.v * 100); $('alpha').value = Math.round((1 - picker.a) * 100);
  const hex = pickerColour();
  $('picker-swatch').style.setProperty('--c', hex);
  if (!fromHexInput) $('hex-input').value = hex;
}
function applyColour(hex) {
  if (!picker.key) return;
  setValue(picker.key, hex, true);
  const row = document.querySelector('[data-key="' + picker.key + '"]');
  if (row) { row.querySelector('.swatch').style.setProperty('--c', hex); row.querySelector('code').textContent = hex; }
}
function openPicker(key, anchor) {
  if (!picker.drawn) drawWheel();
  picker.key = key; picker.anchor = anchor;
  const c = parseHex(val(key)) || { r: 255, g: 255, b: 255, a: 1 };
  Object.assign(picker, rgbToHsv(c), { a: c.a });
  $('picker-title').textContent = fieldDefs[key].label; $('hex-error').textContent = '';
  const p = $('picker'); p.hidden = false;
  const r = anchor.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  if (innerWidth < 600) { p.style.left = Math.max(8, (innerWidth - w) / 2) + 'px'; p.style.top = Math.max(8, innerHeight - h - 12) + 'px'; }
  else { p.style.left = Math.min(innerWidth - w - 12, Math.max(12, r.left)) + 'px'; p.style.top = Math.min(innerHeight - h - 12, Math.max(70, r.bottom + 8)) + 'px'; }
  syncPickerUI(); $('wheel').focus();
}
function closePicker() { if ($('picker').hidden) return; $('picker').hidden = true; if (picker.anchor) picker.anchor.focus(); picker.key = null; }
function wheelAt(e) {
  const r = $('wheel').getBoundingClientRect(), R = r.width / 2;
  const dx = e.clientX - r.left - R, dy = e.clientY - r.top - R;
  picker.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; picker.s = Math.min(1, Math.sqrt(dx * dx + dy * dy) / R);
  if (picker.v < .05) picker.v = 1;
  syncPickerUI(); applyColour(pickerColour());
}
$('wheel').addEventListener('pointerdown', e => { e.preventDefault(); $('wheel').setPointerCapture(e.pointerId); wheelAt(e); });
$('wheel').addEventListener('pointermove', e => { if ($('wheel').hasPointerCapture(e.pointerId)) wheelAt(e); });
$('wheel').addEventListener('keydown', e => {
  const k = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] }[e.key];
  if (!k) return; e.preventDefault();
  picker.h = (picker.h + k[0] + 360) % 360; picker.s = Math.max(0, Math.min(1, picker.s + k[1]));
  syncPickerUI(); applyColour(pickerColour());
});
$('val').addEventListener('input', () => { picker.v = $('val').value / 100; syncPickerUI(); applyColour(pickerColour()); });
$('alpha').addEventListener('input', () => { picker.a = 1 - $('alpha').value / 100; syncPickerUI(); applyColour(pickerColour()); });
$('hex-input').addEventListener('input', () => {
  const c = parseHex($('hex-input').value);
  if (!c) { $('hex-error').textContent = 'Use a hex code like #ff00aa, or #ff00aa80 to make it see-through.'; return; }
  $('hex-error').textContent = '';
  Object.assign(picker, rgbToHsv(c), { a: c.a }); syncPickerUI(true); applyColour(toHex(c));
});
$('picker-reset').addEventListener('click', () => {
  const def = fieldDefs[picker.key].value, c = parseHex(def);
  Object.assign(picker, rgbToHsv(c), { a: c.a }); syncPickerUI(); applyColour(def);
});
$('picker-close').addEventListener('click', closePicker);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('picker').hidden) closePicker(); });
document.addEventListener('pointerdown', e => { if (!$('picker').hidden && !$('picker').contains(e.target) && !e.target.closest('.colour-row')) closePicker(); });

/* ------------------------------------------------------------------ customise panel (built from the Fields) */
function control(key, def) {
  const id = 'set-' + key, wrap = el('div', { className: 'field' + (isShared(key) ? ' shared' : '') });
  const label = el('label', { htmlFor: id, textContent: def.label });
  if (isShared(key)) label.append(el('span', { className: 'shared-tag', textContent: 'all overlays', title: 'Changing this changes it on every overlay' }));
  let input;
  if (def.type === 'checkbox') {
    input = el('input', { type: 'checkbox', id, checked: !!val(key) });
    input.addEventListener('change', () => setValue(key, input.checked));
    wrap.classList.add('field-check'); wrap.append(input, label); return wrap;
  }
  if (def.type === 'slider' || def.type === 'number') {
    input = el('input', { type: def.type === 'slider' ? 'range' : 'number', id, value: val(key) });
    if (def.min != null) input.min = def.min; if (def.max != null) input.max = def.max; if (def.step != null) input.step = def.step;
    const out = el('output', { textContent: def.type === 'slider' ? val(key) : '' }); out.htmlFor = id;
    input.addEventListener('input', () => {
      let n = Number(input.value); if (!Number.isFinite(n)) return;
      if (def.min != null) n = Math.max(def.min, n); if (def.max != null) n = Math.min(def.max, n);
      out.textContent = def.type === 'slider' ? n : ''; setValue(key, n);
    });
    wrap.append(label, def.type === 'slider' ? el('div', { className: 'range-row' }, input, out) : input); return wrap;
  }
  if (def.type === 'text') {
    input = el('input', { type: 'text', id, value: val(key) || '', maxLength: 200, autocomplete: 'off', spellcheck: false });
    input.addEventListener('input', () => setValue(key, input.value));
    wrap.append(label, input); return wrap;
  }
  if (def.type === 'sound-input' || def.type === 'image-input') {
    wrap.append(label, el('p', { className: 'small', textContent: 'Upload this in StreamElements (Fields panel). Files are hosted by StreamElements, so your code stays small.' }));
    return wrap;
  }
  return null;
}
function buildCustomise() {
  // your details: socials (name is edited under the player)
  const fl = $('field-list'); fl.replaceChildren();
  HANDLE_KEYS.filter(k => fieldDefs[k]).forEach(k => {
    const id = 'field-' + k;
    const input = el('input', { id, maxLength: 31, autocomplete: 'off', spellcheck: false, placeholder: fieldDefs[k].value, value: val(k) !== fieldDefs[k].value ? val(k) : '' });
    input.addEventListener('input', () => {
      const v = input.value.trim();
      if (v && !/^@?[A-Za-z0-9._-]{1,30}$/.test(v)) { input.setCustomValidity('Letters, numbers, dots, dashes and underscores only (1–30).'); input.reportValidity(); return; }
      input.setCustomValidity(''); setValue(k, v || fieldDefs[k].value);
    });
    fl.append(el('div', { className: 'field shared' }, el('label', { htmlFor: id, textContent: fieldDefs[k].label }, el('span', { className: 'shared-tag', textContent: 'all overlays' })), input));
  });
  fl.append(el('p', { className: 'small', textContent: 'Your streamer name is set by clicking your name under the player. Your name, socials, chat, alert and goal settings are shared: set them once and every overlay uses them. Colours, the game window and positions are saved per overlay.' }));

  // colours
  const cl = $('colour-list'); cl.replaceChildren();
  Object.keys(fieldDefs).filter(k => fieldDefs[k].type === 'colorpicker').forEach(k => {
    const v = val(k);
    const row = el('button', { type: 'button', className: 'colour-row' },
      el('span', { className: 'swatch' }), el('span', { className: 'colour-label', textContent: fieldDefs[k].label }), el('code', { textContent: v }));
    row.dataset.key = k; row.querySelector('.swatch').style.setProperty('--c', v); row.setAttribute('aria-label', 'Change colour: ' + fieldDefs[k].label);
    row.addEventListener('click', () => openPicker(k, row));
    cl.append(row);
  });

  // background + game window, parts
  buildBackground();

  // everything else, grouped like the StreamElements Fields panel
  const gl = $('group-list'); gl.replaceChildren();
  const groups = {};
  Object.keys(fieldDefs).forEach(k => {
    const d = fieldDefs[k];
    if (SKIP_GENERIC.includes(k) || d.type === 'colorpicker' || d.type === 'hidden' || !d.group || k === 'customText' || k === 'clock24' || k === 'showText' || k === 'showClock') return;
    (groups[d.group] = groups[d.group] || []).push(k);
  });
  Object.keys(groups).forEach(g => {
    const box = el('div', { className: 'field-list' });
    groups[g].forEach(k => { const c = control(k, fieldDefs[k]); if (c) box.append(c); });
    gl.append(el('div', { className: 'custom-block' }, el('h3', { textContent: g }), box));
  });
}
function buildBackground() {
  const gl = $('game-list'); gl.replaceChildren();
  const hasGame = !!fieldDefs.gameX;
  $('game-default').parentElement.hidden = !hasGame;
  if (!hasGame) {
    if (fieldDefs.bgOpacity) { const c = control('bgOpacity', fieldDefs.bgOpacity); if (c) gl.append(c); }
    updateGameInfo();
    $('bg-thumb').style.backgroundImage = bgImage ? 'url("' + bgImage + '")' : '';
    $('bg-remove').hidden = !bgImage; $('bg-add').textContent = bgImage ? 'Change background' : 'Add background image';
    return;
  }
  const g = selected.game;
  const sliders = [['gameX', 'X', 1920], ['gameY', 'Y', 1080], ['gameW', 'Width', 1920], ['gameH', 'Height', 1080]];
  sliders.forEach(([k, lab, max]) => {
    const id = 'set-' + k;
    const range = el('input', { type: 'range', id, min: 0, max, step: 1, value: val(k) });
    const num = el('input', { type: 'number', min: 0, max, value: val(k), className: 'num' }); num.setAttribute('aria-label', 'Game window ' + lab + ' in pixels');
    const sync = (v, from) => {
      v = Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
      range.value = v; num.value = v; setValue(k, v);
      if (from !== 'lock' && $('lock169').checked && (k === 'gameW' || k === 'gameH')) {
        const other = k === 'gameW' ? 'gameH' : 'gameW', ov = k === 'gameW' ? Math.round(v * 9 / 16) : Math.round(v * 16 / 9);
        const o = document.getElementById('set-' + other); o.value = ov; o.nextElementSibling.value = ov; setValue(other, ov);
      }
    };
    range.addEventListener('input', () => sync(range.value)); num.addEventListener('change', () => sync(num.value));
    gl.append(el('div', { className: 'field' }, el('label', { htmlFor: id, textContent: 'Game window ' + lab + ' (px)' }), el('div', { className: 'range-row' }, range, num)));
  });
  ['gameRadius', 'gameFrame', 'cutCam', 'bgOpacity'].forEach(k => { if (fieldDefs[k]) { const c = control(k, fieldDefs[k]); if (c) gl.append(c); } });
  updateGameInfo();
  $('bg-thumb').style.backgroundImage = bgImage ? 'url("' + bgImage + '")' : '';
  $('bg-remove').hidden = !bgImage; $('bg-add').textContent = bgImage ? 'Change background' : 'Add background image';
}
function updateGameInfo() {
  if (!selected) return;
  const cam = camFor(selected, values);
  if (!fieldDefs.gameX) { $('game-info').textContent = 'This scene has no game window.' + (cam && val('showCam') !== false ? ' Webcam: X ' + cam[0] + ', Y ' + cam[1] + ', ' + cam[2] + ' × ' + cam[3] + ' on a 1920 × 1080 canvas.' : ''); return; }
  $('game-info').textContent = 'Put your game capture at X ' + val('gameX') + ', Y ' + val('gameY') + ', ' + val('gameW') + ' × ' + val('gameH') +
    ' on a 1920 × 1080 canvas' + (cam && val('showCam') !== false ? '. Webcam: X ' + cam[0] + ', Y ' + cam[1] + ', ' + cam[2] + ' × ' + cam[3] : '') + '.';
}


function setGame(x, y, w, h) {
  [['gameX', x], ['gameY', y], ['gameW', w], ['gameH', h]].forEach(([k, v]) => setValue(k, v, true));
  buildBackground(); pushFields();
}
$('game-default').addEventListener('click', () => setGame(...selected.game));
$('game-full').addEventListener('click', () => setGame(0, 0, 1920, 1080));
$('game-centre').addEventListener('click', () => setGame(240, 135, 1440, 810));
async function useBackgroundFile(input) {
  const file = input.files && input.files[0]; input.value = '';
  if (!file) return;
  if (!/^image\//.test(file.type)) { notify('That file isn’t an image. Choose a PNG or JPG.'); return; }
  if (file.size > 60 * 1024 * 1024) { notify('That image is over 60 MB. Choose a smaller one.'); return; }
  const keep = { x: scrollX, y: scrollY };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, Math.max(1920 / bmp.width, 1080 / bmp.height));   // never bigger than needed to cover 1920x1080
    const c = el('canvas', { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    // keep PNG only if the image really has see-through pixels; otherwise a high-quality JPEG is far smaller
    const probe = el('canvas', { width: 96, height: 54 }); const pc = probe.getContext('2d'); pc.drawImage(c, 0, 0, 96, 54);
    const px = pc.getImageData(0, 0, 96, 54).data; let alpha = false;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
    const blob = await new Promise(res => c.toBlob(res, alpha ? 'image/png' : 'image/jpeg', 0.92));
    bgImage = await blobToDataURL(blob);
    const saved = await bgStore.save(blob);
    if (bmp.width < 1600 || Math.abs(bmp.width / bmp.height - 16 / 9) > .05) notify('Background added. Tip: a 1920 × 1080 (16:9) image fits best. This one is ' + bmp.width + ' × ' + bmp.height + '.');
    else notify(saved ? 'Background added and saved in this browser for every overlay. In StreamElements, upload the same image in Fields › Background image.'
                      : 'Background added for this visit (this browser would not save it).');
    if (selected) { buildBackground(); pushFields(); }
    await backgroundChanged();
  } catch (e) { notify('That image couldn’t be read. Try a PNG or JPG.'); }
  scrollTo(keep.x, keep.y);   // never jump the page
}
async function removeBackground() {
  bgImage = ''; await bgStore.clear();
  if (selected) { buildBackground(); pushFields(); }
  await backgroundChanged();
  notify('Background removed from every preview.');
}
$('bg-file').addEventListener('change', () => useBackgroundFile($('bg-file')));
$('gallery-bg-file').addEventListener('change', () => useBackgroundFile($('gallery-bg-file')));
$('bg-remove').addEventListener('click', removeBackground);
$('gallery-bg-remove').addEventListener('click', removeBackground);
$('reset-all').addEventListener('click', () => {
  values = {}; save(); closePicker(); buildCustomise(); renderPreview(); notify('Colours, game window and layout reset for this overlay. Shared settings and your background are kept.');
});

/* ------------------------------------------------------------------ watch page */
function loadValues(name) {
  const saved = store.get('overlay-values:' + name), out = {};
  if (saved && typeof saved === 'object') Object.keys(saved).forEach(k => {
    const d = fieldDefs[k]; if (!d) return; const v = saved[k];
    if (isShared(k)) { if (!(sharedKey(k) in shared) && okFor(d, v)) { shared[sharedKey(k)] = v; store.set('overlay-shared', shared); } return; }  // older per-overlay copy -> shared
    if (okFor(d, v)) out[k] = v;
  });
  return out;
}
let loadToken = 0;
async function openOverlay(item) {
  const token = ++loadToken;
  // save any pending change to the overlay we're leaving NOW, before `selected` switches,
  // otherwise the delayed save writes the old overlay's colours under the new overlay's name
  if (setValue.t && selected) { clearTimeout(setValue.t); setValue.t = 0; save(); }
  selected = item; files = null; closePicker();
  if ($('code-dialog').open) $('code-dialog').close();
  document.querySelectorAll('.side-link').forEach(a => { const on = a.title === item.name; a.classList.toggle('selected', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('gallery').hidden = true; $('watch').hidden = false; $('brand').textContent = item.name; document.title = item.name + ' — Stremero';
  $('stream-title').textContent = item.name + (item.sceneLabel ? ' · ' + item.sceneLabel : '') + '';
  renderSceneTabs(item); renderKit(item);
  let loaded;
  try { [loaded] = await Promise.all([loadFiles(item), loadSavedBackground()]); }
  catch (e) { notify('This overlay could not be loaded. If you opened the site from your computer, upload it to Cloudflare Pages or use a local web server.'); return; }
  if (token !== loadToken) return;   // another overlay was clicked meanwhile
  files = loaded;
  fieldDefs = files.fields || {};
  values = loadValues(storeKey(item));
  buildCustomise(); renderPreview(); setName(streamerName, true);
  $('open-editor').hidden = !item.editor;
  $('open-editor').href = 'editor.html?from=' + encodeURIComponent(item.name);
}
function renderSceneTabs(item) {
  const base = item.base || item, nav = $('scene-tabs');
  if (!base.scenes || !base.scenes.length) { nav.hidden = true; nav.replaceChildren(); return; }
  nav.hidden = false;
  nav.replaceChildren(...[{ id: 'main', label: 'Gameplay' }].concat(base.scenes).map(sc => {
    const on = (item.scene || 'main') === sc.id;
    const a = el('a', { href: linkTo(base, sc.id), textContent: sc.label, className: 'scene-tab' + (on ? ' on' : '') });
    if (on) a.setAttribute('aria-current', 'page');
    return a;
  }));
}
function renderKit(item) {
  const base = item.base || item, kit = base.kit;
  $('kit').hidden = !kit || (!kit.panels.length && !kit.offline);
  if ($('kit').hidden) return;
  const dir = basePath(base) + 'kit/', slug = base.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const LABEL = { about: 'About me', schedule: 'Schedule', rules: 'Rules', socials: 'Socials', support: 'Support me' };
  $('kit-panels').replaceChildren(...kit.panels.map(k => el('a', { className: 'kit-item', href: dir + 'panel-' + k + '.png', download: slug + '-panel-' + k + '.png', title: 'Download the ' + LABEL[k] + ' panel (320 × 100)' },
    el('img', { src: dir + 'panel-' + k + '.png', alt: LABEL[k] + ' panel', loading: 'lazy', width: 320, height: 100 }), el('span', { textContent: '⬇ ' + LABEL[k] }))));
  $('kit-offline').replaceChildren(...(kit.offline ? [el('a', { className: 'kit-item wide', href: dir + kit.offline, download: slug + '-offline.jpg', title: 'Download the offline screen (1920 × 1080)' },
    el('img', { src: dir + kit.offline, alt: 'Offline screen', loading: 'lazy', width: 1920, height: 1080 }), el('span', { textContent: '⬇ Offline screen (1920 × 1080)' }))] : []));
}
function setName(name, quiet) {
  streamerName = name; store.set('overlay-name', name);
  if (document.activeElement !== $('name-input')) $('name-input').value = name;
  if (!quiet) pushFields();
}
$('name-input').addEventListener('input', () => {
  const v = $('name-input').value.trim();
  if (!v) return;                                   // keep the last good name while the box is empty
  if (!sanitiseName(v)) { $('name-input').setCustomValidity('Use 1–32 letters, numbers, spaces, underscores or hyphens.'); $('name-input').reportValidity(); return; }
  $('name-input').setCustomValidity(''); setName(v);
});
$('name-input').addEventListener('blur', () => { $('name-input').value = streamerName; $('name-input').setCustomValidity(''); });
$('restart').addEventListener('click', () => renderPreview());
const BACKDROPS = ['grid', 'game', 'dark'];
$('backdrop').addEventListener('click', () => {
  const next = BACKDROPS[(BACKDROPS.indexOf($('player').dataset.backdrop) + 1) % BACKDROPS.length];
  $('player').dataset.backdrop = next;
  notify({ game: 'Sample game background.', grid: 'Transparency grid: anything showing the grid is see-through.', dark: 'Plain dark background.' }[next]);
});
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('player').requestFullscreen) await $('player').requestFullscreen(); else notify('Fullscreen is not available in this browser.'); }
  catch (e) { notify('Your browser could not enter fullscreen.'); }
});


/* ------------------------------------------------------------------ copy dialog */
$('use-overlay').addEventListener('click', () => {
  if (!selected || !files) return;
  closePicker();
  const code = [['HTML', 'HTML tab', personalise(files.html)], ['CSS', 'CSS tab', buildCSS()], ['JavaScript', 'JS tab', files.js], ['Fields', 'FIELDS tab', buildFields()]];
  $('code-title').textContent = 'Use ' + selected.name + (selected.sceneLabel ? ' · ' + selected.sceneLabel : '');
  const changed = Object.keys(values).length;
  $('code-name').textContent = 'Personalised for ' + streamerName + (changed ? ' · ' + changed + ' setting' + (changed > 1 ? 's' : '') + ' changed' : '');
  $('size-note').hidden = !bgImage;
  $('size-note').textContent = 'Your background image is not in this code (that keeps it small). After pasting, open the widget’s settings in StreamElements and upload the same image under “Background & game window › Background image”.';
  $('code-panels').replaceChildren();
  code.forEach(([label, tab, text]) => {
    const copy = el('button', { type: 'button', textContent: 'Copy ' + label });
    const area = el('textarea', { readOnly: true, spellcheck: false, value: text }); area.setAttribute('aria-label', label + ' code');
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(area.value);
        copy.textContent = 'Copied!'; $('copy-status').textContent = label + ' copied. Paste it into the ' + tab + ' in StreamElements.';
        setTimeout(() => { copy.textContent = 'Copy ' + label; }, 2000);
      } catch (e) {
        area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
        $('copy-status').textContent = 'Automatic copying is unavailable. The ' + label + ' code is selected: press Ctrl+C (Cmd+C on Mac), then paste into the ' + tab + '.';
      }
    });
    $('code-panels').append(el('section', { className: 'code-panel' }, el('div', { className: 'code-heading' }, el('h3', { textContent: label + ' · paste into the ' + tab }), copy), area));
  });
  $('overlay-instructions').textContent = files.help || 'No extra instructions were supplied for this overlay.';
  $('copy-status').textContent = '';
  $('code-dialog').showModal();
});
$('close-code').addEventListener('click', () => $('code-dialog').close());

/* ------------------------------------------------------------------ navigation (no page reloads) */
function route(push) {
  const params = new URLSearchParams(location.search), name = params.get('overlay');
  if (params.get('custom')) { location.replace('editor.html'); return; }
  const item = overlays.find(o => o.path.replace(/\/$/, '') === name) || overlays.find(o => o.name === name) || null;   // old links used just the name
  if (item) {
    const fromGallery = !$('watch').hidden ? false : true;
    openOverlay(sceneItem(item, params.get('scene')));
    if (fromGallery) scrollTo(0, 0);        // opening from the gallery starts at the player; switching overlays keeps your place
  } else {
    selected = null; $('watch').hidden = true; $('gallery').hidden = false; $('brand').textContent = 'Stremero'; document.title = 'Stremero: free stream overlays';
    if (buildGallery.render) buildGallery.render();
    document.querySelectorAll('.side-link').forEach(a => { a.classList.remove('selected'); a.removeAttribute('aria-current'); });
    if (name) notify('That overlay was not found. Choose one from the collection.');
  }
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="index.html"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // let new-tab clicks work normally
  const url = new URL(a.getAttribute('href'), location.href);
  if (url.pathname !== location.pathname && !/index\.html$/.test(url.pathname)) return;
  e.preventDefault();
  if (url.search === location.search) return;
  history.pushState(null, '', url.pathname.endsWith('index.html') ? 'index.html' + url.search : url.href);
  route(true);
});
addEventListener('popstate', () => route(false));

/* ------------------------------------------------------------------ start */
function start() {
  buildGallery();
  route(false);
  loadSavedBackground().then(backgroundChanged);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
