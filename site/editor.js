'use strict';
/* Overlay editor: a Canva-style canvas for StreamElements overlays.
   The design (a list of parts per scene) lives here in the page. The canvas is a sandboxed iframe that
   renders the real overlay code (chat, alerts and boxes run live); selection, handles and snap guides
   are drawn on top of it here. "Copy to StreamElements" turns the current scene into HTML/CSS/JS/Fields. */
const $ = id => document.getElementById(id);
function el(tag, props, ...kids) { const e = document.createElement(tag); Object.assign(e, props || {}); kids.forEach(k => k != null && e.append(k)); return e; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const swap = (t, a, b) => String(t || '').split(a).join(b);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = v => Math.round(v);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const idb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => { try { const r = indexedDB.open('overlay-site', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
  },
  async run(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', mode); const q = fn(tx.objectStore('files')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }); },
  get(k) { return this.run('readonly', s => s.get(k)).catch(() => null); },
  put(k, v) { return this.run('readwrite', s => s.put(v, k)).then(() => true).catch(() => false); },
  del(k) { return this.run('readwrite', s => s.delete(k)).catch(() => null); }
};
const toDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 4200); }

/* ------------------------------------------------------------------ constants */
const KINDS = {
  cam: { name: 'Webcam frame', single: true, slot: 'cam', part: 'cam' },
  chat: { name: 'Chat', single: true, slot: 'chat', part: 'chat' },
  alert: { name: 'Alert box', single: true, slot: 'alert', part: 'alerts' },
  stat: { name: 'Latest box', slot: 'latest', part: 'latest' },
  goal: { name: 'Follower goal', single: true, slot: 'latest', part: 'latest' },
  socials: { name: 'Socials', slot: 'latest', part: 'socials' },
  text: { name: 'Text', slot: 'latest', part: 'text' },
  title: { name: 'Title', slot: 'cam' },
  clock: { name: 'Clock', slot: 'latest', part: 'clock' },
  decor: { name: 'Decorations', slot: 'screen' },
  image: { name: 'Image' }
};
const STATS = { follower: 'Latest follower', subscriber: 'Latest sub', tip: 'Latest tip', cheer: 'Latest cheer', raid: 'Latest raid' };
const BASE_VARS = {   // colours each kind of part uses from the shared overlay code
  cam: ['--cam-border', '--nameplate-bg', '--text', '--accent'], chat: ['--chat-bg', '--chat-name', '--text', '--accent'],
  alert: ['--alert-bg', '--text', '--accent'], stat: ['--stat-bg', '--text', '--accent'], goal: ['--stat-bg', '--text', '--accent', '--goal-fill'],
  socials: ['--stat-bg', '--text', '--accent'], text: ['--stat-bg', '--text', '--accent'], title: ['--nameplate-bg', '--text', '--accent', '--cam-border'], clock: ['--stat-bg', '--text', '--accent'], decor: []
};
const SCENES = [['main', 'Gameplay'], ['starting', 'Starting soon'], ['brb', 'Be right back'], ['ending', 'Ending'], ['chatting', 'Just Chatting']];
const SCENE_TEXT = { starting: 'STARTING SOON', brb: 'BE RIGHT BACK', ending: 'THANKS FOR WATCHING' };
const SHARED = ['youtube', 'tiktok', 'twitch', 'bgOpacity', 'animations', 'chatScale', 'chatSeconds', 'maxMessages', 'useChatColours', 'hideCommands', 'hideLinks',
  'hiddenUsers', 'alertSeconds', 'alertFollower', 'alertSubscriber', 'alertGift', 'alertCheer', 'alertTip', 'alertRaid', 'minBits', 'minTip', 'minRaid', 'alertVolume', 'followerGoal', 'clock24'];
let CATS = ['All'];   // filled from the site's category folders

/* ------------------------------------------------------------------ state */
let LIB = null, SRC = {};
let design = null;          // { v, scene, scenes: { id: { elements: [], game: {...} | null } } }
let selId = null, playing = false, backdrop = 'grid';
let bgImage = '';           // shared background (preview only)
const imgCache = {};        // image id -> data URL (preview only)
let shared = store.get('overlay-shared') || {};
let streamerName = (typeof store.get('overlay-name') === 'string' && store.get('overlay-name')) || 'Your cool name';
const undoStack = [], redoStack = [];

const scene = () => design.scenes[design.scene];
const els = () => scene().elements;
const byId = id => els().find(e => e.id === id);
const selected = () => (selId ? byId(selId) : null);
const newId = () => 'e' + Math.random().toString(36).slice(2, 8);
function sharedVal(k, fb) { return k in shared ? shared[k] : fb; }
function setShared(k, v) { shared[k] = v; store.set('overlay-shared', shared); }

/* ------------------------------------------------------------------ design persistence + history */
function save() { store.set('overlay-editor', design); }
function snapshot() { return JSON.stringify(design); }
function commit(before) {          // call after a change, with the state from before it
  if (before && before !== snapshot()) { undoStack.push(before); if (undoStack.length > 120) undoStack.shift(); redoStack.length = 0; }
  save(); updateUndo();
}
function change(fn, opts) {         // one undoable change
  const before = snapshot(); fn(); commit(before);
  if (opts && opts.rerender) renderStage(); else if (opts && opts.patch) opts.patch();
  renderSelection(); renderRight(); renderLayers();
}
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); design = JSON.parse(undoStack.pop()); afterHistory(); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); design = JSON.parse(redoStack.pop()); afterHistory(); }
function afterHistory() { if (selId && !byId(selId)) selId = null; save(); updateUndo(); renderScenes(); renderStage(); renderSelection(); renderRight(); renderLayers(); }
function updateUndo() { $('undo').disabled = !undoStack.length; $('redo').disabled = !redoStack.length; }

/* ------------------------------------------------------------------ making parts */
const srcRect = (s, key) => (s.rects && s.rects[key]) ? s.rects[key].slice() : null;
function defaultRect(kind, stat) {
  return { cam: [48, 48, 480, 300], chat: [1462, 300, 410, 600], alert: [680, 48, 560, 110], stat: [48, 965, 296, 75], goal: [1576, 965, 296, 75],
    socials: [48, 380, 360, 110], text: [660, 24, 600, 60], title: [260, 330, 1400, 220], clock: [1740, 24, 132, 60], decor: [0, 0, 1920, 1080], image: [760, 340, 400, 400] }[kind];
}
function makeElement(kind, srcId, opts) {
  opts = opts || {};
  const s = SRC[srcId];
  const key = kind === 'stat' ? (opts.stat || 'follower') : kind;
  let r = (s && kind !== 'decor' && kind !== 'image' && srcRect(s, key)) || defaultRect(kind);
  if (kind === 'text' && opts.big) r = [360, 380, 1200, 200];
  const e = { id: newId(), kind, src: kind === 'image' ? null : srcId, x: r[0], y: r[1], w: Math.max(20, r[2]), h: Math.max(20, r[3]), rot: 0, s: 1, locked: false, hidden: false, colours: {} };
  if (kind === 'stat') e.stat = opts.stat || 'follower';
  if (kind === 'text') { e.text = opts.text || 'Your text here'; if (opts.big) e.s = 2.4; }
  if (kind === 'title') { e.text = opts.text || 'YOUR TITLE'; e.s = opts.s || 2.6; }
  if (kind === 'image') { e.img = opts.img; e.w = opts.w || 400; e.h = opts.h || 400; e.x = round(960 - e.w / 2); e.y = round(540 - e.h / 2); }
  return e;
}
function designFromOverlay(srcId) {
  const s = SRC[srcId];
  const list = [];
  if (s.screen && s.screen.trim()) list.push(makeElement('decor', srcId));
  list.push(makeElement('cam', srcId), makeElement('alert', srcId), makeElement('chat', srcId));
  const hide = s.hide || [];   // parts the original design doesn't have
  Object.keys(STATS).forEach(k => { if (!hide.includes(k)) list.push(makeElement('stat', srcId, { stat: k })); });
  if (!hide.includes('goal')) list.push(makeElement('goal', srcId));
  if (s.nativeSocials) list.push(makeElement('socials', srcId));
  if (s.showText) list.push(makeElement('text', srcId, { text: s.customText || 'Your text here' }));
  const g = s.game || LIB.game[s.layout] || [48, 150, 1390, 782];
  return { elements: list, game: { x: g[0], y: g[1], w: g[2], h: g[3], r: 0, frame: true, frameSrc: srcId, lock: true } };
}
function picksFromMain() {   // which overlay each part of the gameplay scene uses
  const main = design.scenes.main.elements;
  const pick = k => (main.find(e => e.kind === k) || {}).src;
  const first = pick('cam') || pick('alert') || pick('chat') || pick('decor') || LIB.sources[0].id;
  return { main: first, decor: pick('decor') || null, alert: pick('alert') || first, chat: pick('chat') || first, socials: pick('socials') || first, cam: pick('cam') || first, stat: pick('stat') || pick('goal') || first };
}
function picksFor(srcId) { return { main: srcId, decor: SRC[srcId].screen && SRC[srcId].screen.trim() ? srcId : null, alert: srcId, chat: srcId, socials: srcId, cam: srcId, stat: srcId }; }
const sized = (e, w, h, s) => Object.assign(e, { w: round(w), h: round(h), s: s || 1 });
function sceneFor(p, sceneId) {   // a whole scene in the style of the picked overlays (also used to make the main page's scenes)
  const list = [];
  if (p.decor) list.push(makeElement('decor', p.decor));
  const al = makeElement('alert', p.alert);
  if (sceneId === 'chatting') {   // Just Chatting: big webcam left, chat right, alerts on top
    const cam = makeElement('cam', p.cam), cs = 1216 / cam.w;
    sized(cam, 1216, cam.h * cs, cs); cam.x = 48; cam.y = 176; list.push(cam);
    const goal = makeElement('goal', p.stat), gs = Math.min(1.5, 560 / goal.w);
    sized(goal, goal.w * gs, goal.h * gs, gs); goal.x = 1872 - goal.w; goal.y = cam.y + cam.h - goal.h; list.push(goal);
    const ch = makeElement('chat', p.chat); ch.x = 1300; ch.y = cam.y; sized(ch, 572, goal.y - 28 - cam.y, 1.15); list.push(ch);
    al.x = round(Math.min(1872 - al.w, 1586 - al.w / 2)); al.y = 12; list.push(al);   // over the chat column, clear of name plates above the webcam
    return { elements: list, game: null };
  }
  const t = makeElement('title', p.main, { text: SCENE_TEXT[sceneId] }); list.push(t);
  const soc = makeElement('socials', p.socials);
  if (!SRC[p.socials].nativeSocials) sized(soc, 420, 130, 1.15);
  soc.x = round(960 - soc.w / 2); soc.y = t.y + t.h + 40; list.push(soc);
  if (sceneId === 'ending') {     // thank-you credits: the latest supporters in a row
    const row = Object.keys(STATS).map(k => makeElement('stat', p.stat, { stat: k }));
    const gap = 16, total = row.reduce((a, e) => a + e.w, 0) + gap * (row.length - 1);
    let x = round(960 - total / 2); row.forEach(e => { e.x = x; e.y = 1080 - 56 - e.h; x += e.w + gap; list.push(e); });
  } else {
    const ch = makeElement('chat', p.chat); sized(ch, 420, 440, 1); ch.x = 1920 - 48 - ch.w; ch.y = 1080 - 48 - ch.h; list.push(ch);
  }
  al.x = round(960 - al.w / 2); al.y = 40; list.push(al);
  return { elements: list, game: null };
}
function sceneFromTemplate(sceneId) { return sceneFor(picksFromMain(), sceneId); }

/* ------------------------------------------------------------------ code generation (used for the canvas AND the copy boxes) */
function varsFor(e) {
  if (e.kind === 'image') return [];
  const s = SRC[e.src]; const slot = KINDS[e.kind].slot;
  const used = new Set(BASE_VARS[e.kind] || []);
  const css = (s.css[slot] || '') + (s.decor[slot === 'latest' ? 'stat' : slot] || '') + (e.kind === 'decor' ? s.screen : '') + s.root;
  (css.match(/var\(--[\w-]+/g) || []).forEach(m => used.add(m.slice(4)));
  return s.vars.filter(v => used.has(v[0]));
}
function pieceHTML(e, forPreview) {
  const s = SRC[e.src], sub = t => swap(t, '__SRC__', 'src-' + (s ? s.id : ''));
  const c = s ? ' src-' + s.id : '';
  switch (e.kind) {
    case 'cam': return `<section class="cam${c}" aria-label="Webcam frame">${sub(s.decor.cam)}<div class="cam-hole" data-cam-hole></div><div class="nameplate">${sub(s.plate)}<span data-field="name">${esc(streamerName)}</span></div></section>`;
    case 'alert': return `<section id="alert" class="alert box${c}" aria-live="polite">${sub(s.decor.alert)}<div class="alert-icon" id="alert-icon"></div><div class="alert-copy"><div class="alert-kind" id="alert-kind"></div><div class="alert-name" id="alert-name"></div><div class="alert-detail" id="alert-detail"></div></div></section>`;
    case 'chat': return `<section id="chat" class="chat${c}" aria-label="Chat">${sub(s.decor.chat)}<div class="chat-title">${sub(s.head)}<span>${esc(s.chatTitle)}</span></div><div id="chat-list" class="chat-list"></div></section>`;
    case 'stat': return `<section class="latest${c}"><div class="stat box" data-stat="${e.stat}">${sub(s.decor.stat)}<label>${esc((s.statLabels && s.statLabels[e.stat]) || STATS[e.stat])}</label><strong data-latest="${e.stat}">—</strong></div></section>`;
    case 'goal': return `<section class="latest${c}"><div class="stat goal box">${sub(s.decor.stat)}<label>${esc(s.goalLabel)}</label><strong id="goal-count">0 / 100</strong><div class="goal-track"><div id="goal-fill"></div></div></div></section>`;
    case 'socials': {
      const v = k => esc(sharedVal(k, k === 'twitch' ? 'yourcoolname' : '@yourcoolname'));
      return `<section class="socials box${s.nativeSocials ? '' : ' extra'}${c}" aria-label="Socials">${s.nativeSocials ? sub(s.decor.socials) : ''}<div class="social"><em>YouTube</em><span data-field="youtube">${v('youtube')}</span></div><div class="social"><em>TikTok</em><span data-field="tiktok">${v('tiktok')}</span></div><div class="social"><em>Twitch</em><span data-field="twitch">${v('twitch')}</span></div></section>`;
    }
    case 'text': return `<section class="extra-text box extra${c}"><span class="ed-text">${esc(e.text || '')}</span></section>`;
    case 'title': {   // overlays with narrow plates (titleMax letters fit) shrink long titles to fit
      const n = String(e.text || '').length, fit = s.titleMax && n > s.titleMax ? `font-size:${(s.titleMax / n).toFixed(3)}em` : '';
      return `<section class="title-card${c}" aria-label="Title"><div class="nameplate">${sub(s.plate)}<span class="ed-text"${fit ? ` style="${fit}"` : ''}>${esc(e.text || '')}</span></div></section>`;
    }
    case 'clock': return `<section class="extra-clock box extra${c}"><span class="clock-time">00:00</span></section>`;
    case 'decor': return `<div class="decor-layer${c}" style="transform:scale(${(e.w / 1920).toFixed(5)},${(e.h / 1080).toFixed(5)})">${sub(s.screen)}</div>`;
    case 'image': return `<img class="user-img" data-img="${esc(e.img)}" alt=""${forPreview && imgCache[e.img] ? ` src="${imgCache[e.img]}" data-keep="1"` : ''}>`;
  }
  return '';
}
function wrapStyle(e, i) {
  return `left:${round(e.x)}px;top:${round(e.y)}px;width:${round(e.w)}px;height:${round(e.h)}px;z-index:${i + 1};` +
    (e.rot ? `transform:rotate(${+e.rot.toFixed(2)}deg);` : '') + (e.hidden ? 'display:none;' : '');
}
function innerStyle(e) { const s = e.kind === 'decor' ? 1 : e.s || 1; return `width:${+(e.w / s).toFixed(2)}px;height:${+(e.h / s).toFixed(2)}px;transform:scale(${+s.toFixed(4)})`; }
const EDITOR_CSS = `
/* ---- editor layout: every part is placed exactly where you put it ---- */
.el{position:absolute;transform-origin:50% 50%}
.el-in{position:absolute;left:0;top:0;transform-origin:0 0}
.el-in>section{position:absolute!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;max-height:none!important;margin:0!important}
.el-in>.latest{display:block!important}
.el-in>.chat{justify-content:flex-end}
.el-in>.latest>.stat{height:100%}
.el-in>.decor-layer{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
.el-in>.user-img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}
.extra-text .ed-text{white-space:pre-wrap}
/* ---- title: a big copy of the overlay's own name plate ---- */
.el-in>.title-card{display:flex!important;align-items:center;justify-content:center}
.title-card>.nameplate{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;margin:0!important;transform:none!important;z-index:1}
.title-card>.nameplate>span{max-width:none!important;overflow:visible!important}`;

/* scene transition: the style of the overlay the scene is mostly made from, in that overlay's colours */
function transitionFor(list, frameSrc, unified) {
  if (!LIB.transitions) return { html: '', css: '' };
  const count = {}; list.forEach(e => { if (e.src) count[e.src] = (count[e.src] || 0) + 1; });
  const top = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  const s = frameSrc || SRC[top] || LIB.sources[0];
  const [style, a, b, c] = s.transition || ['bands', 'var(--accent)', 'var(--nameplate-bg)', 'var(--text)'];
  const t = LIB.transitions[style] || LIB.transitions.bands;
  let vars = `--sx-a:${a};--sx-b:${b};--sx-c:${c}`;
  const e0 = list.find(e => e.src === s.id);
  if (!unified) {   // colours live on each part, not the overlay: give the transition that overlay's own values
    vars = s.vars.map(([n, , v]) => n + ':' + ((e0 && e0.colours[n]) || v)).join(';') + `;--sx-a:${a};--sx-b:${b};--sx-c:${c};--font-display:${s.fontDisplay}`;
  }
  return { html: `<div class="sx${!unified && e0 ? ' e-' + e0.id : ''}" aria-hidden="true" style="${esc(vars)}"><div class="sx-in">${t.html}</div></div>`,
           css: '/* ---- scene transition (' + style + ') ---- */' + LIB.transitionBase + t.css };
}
function build(sc, forPreview, opts) {
  const list = sc.elements;
  const used = [...new Set(list.map(e => e.src).filter(Boolean))].map(id => SRC[id]);
  const frameSrc = sc.game && sc.game.frameSrc && SRC[sc.game.frameSrc];
  if (frameSrc && !used.includes(frameSrc)) used.push(frameSrc);
  // shared colours: when every part comes from one overlay and none has its own colours, the whole scene uses one set of
  // colours (like the overlay's gameplay scene) instead of a separate set per part
  const unified = !!(opts && opts.unified) && used.length === 1 && list.every(e => e.kind === 'image' || !Object.keys(e.colours || {}).length);
  // HTML
  // SVG patterns/gradients take their colours from where they are defined, not where they are used, so each overlay's
  // definitions get that overlay's colours (and the e-<id> class, so the Fields colour settings reach them too)
  const defs = used.map(s => {
    if (!s.defs) return '';
    if (unified) return `<div class="src-defs" style="position:absolute;width:0;height:0;overflow:hidden">${swap(s.defs, '__SRC__', 'src-' + s.id)}</div>`;
    const e0 = list.find(e => e.src === s.id && e.kind !== 'image');
    const vars = s.vars.map(([n, , v]) => n + ':' + ((e0 && e0.colours[n]) || v)).join(';');
    return `<div class="src-defs${e0 ? ' e-' + e0.id : ''}" style="position:absolute;width:0;height:0;overflow:hidden;${vars}">${swap(s.defs, '__SRC__', 'src-' + s.id)}</div>`;
  }).join('');
  const sx = transitionFor(list, frameSrc, unified);
  const body = list.map((e, i) => `  <div class="el e-${e.id} k-${e.kind}${e.src ? ' src-' + e.src : ''}" data-el="${e.id}" style="${wrapStyle(e, i)}"><div class="el-in" style="${innerStyle(e)}">${pieceHTML(e, forPreview)}</div></div>`).join('\n');
  const html = `<!-- My overlay (made in the overlay editor) — paste ALL of this into the HTML tab of ONE StreamElements Custom Widget.
     The game window and the webcam hole are left completely empty (see-through). -->
<div id="ov" class="ov"><div class="bg-layer" aria-hidden="true"></div><div class="game-frame" aria-hidden="true"><div class="game-box" data-game-hole></div></div>${defs}
${body}
${sx.html}
</div>
`;
  // CSS: one colour block per part, so every part can have its own colours
  const colorSpecs = [], colourFields = {};
  let varsCss = '';
  if (frameSrc) varsCss += `.ov{${frameSrc.vars.map(v => `${v[0]}:${v[2]}`).join(';')}}\n`;
  if (sc.game) varsCss += `.ov{\n  --game-frame: ${sc.game.frameColour || '#ffffff'}; /* @color Game window frame @key c_game_frame */\n}\n`;
  if (unified) {
    const s = used[0];
    const lines = s.vars.filter(v => v[0] !== '--game-frame' || sc.game).map(([name, lab, value]) => {
      const key = 'c_' + name.slice(2).replace(/-/g, '_');
      if (name !== '--game-frame') { colorSpecs.push(name); colourFields[key] = { type: 'colorpicker', label: lab, value, group: 'Colours' }; }
      return name === '--game-frame' ? `  ${name}: ${value};` : `  ${name}: ${value}; /* @color ${lab} */`;
    });
    varsCss += `.ov{\n${lines.join('\n')}\n  --font-body: ${s.fontBody};\n  --font-display: ${s.fontDisplay};\n}\n`;
  }
  list.forEach((e, i) => {
    if (e.kind === 'image') return;
    if (unified) {
      const s = SRC[e.src];
      varsCss += `.el.e-${e.id}{font-family: var(--font-body);color: var(--text)}\n`;
      if (s.root) varsCss += `.el.e-${e.id}{${s.root}}\n`;
      return;
    }
    const s = SRC[e.src], vars = s.vars, rel = varsFor(e).map(v => v[0]);
    const label = partLabel(e, i);
    const lines = vars.map(([name, lab, value]) => {
      const val = e.colours[name] || value;
      if (!rel.includes(name)) return `  ${name}: ${val};`;
      const key = 'c_e' + e.id + '__' + name.slice(2).replace(/-/g, '_');
      colorSpecs.push('.e-' + e.id + '|' + name);
      colourFields[key] = { type: 'colorpicker', label: label + ': ' + lab, value: val, group: 'Colours' };
      return `  ${name}: ${val}; /* @color ${label}: ${lab} @key ${key} */`;
    });
    varsCss += `.el.e-${e.id}{\n${lines.join('\n')}\n  --font-body: ${s.fontBody};\n  --font-display: ${s.fontDisplay};\n  font-family: var(--font-body);\n  color: var(--text);\n}\n`;
    if (s.root) varsCss += `.el.e-${e.id}{${s.root}}\n`;
  });
  const slots = new Set();
  list.forEach(e => { if (e.src) slots.add(e.src + '|' + KINDS[e.kind].slot); });
  const pieceCss = [...slots].map(k => { const [id, slot] = k.split('|'); return `/* ${SRC[id].name}: ${slot} */\n` + swap(SRC[id].css[slot], '__SRC__', 'src-' + id); }).join('\n');
  const fonts = [...new Set(used.map(s => s.font).filter(Boolean))];
  const partsPresent = {};
  list.forEach(e => { const p = KINDS[e.kind].part; if (p) partsPresent[p] = true; });
  const PARTSEL = { chat: '#chat', alerts: '#alert', latest: '.latest', cam: '.cam', socials: '.socials', text: '.extra-text', clock: '.extra-clock' };
  partsPresent.transition = true;
  const PARTSEL_ALL = Object.assign({ transition: '.sx' }, PARTSEL);
  const lookParts = {}; Object.keys(partsPresent).forEach(k => { lookParts[k] = { sel: PARTSEL_ALL[k], on: true }; });
  const hideCss = Object.keys(lookParts).map(k => `.ov.hide-${k} ${lookParts[k].sel}{display:none!important}`).join('\n');
  const css = [`/* My overlay (made in the overlay editor) — paste ALL of this into the CSS tab of the same Custom Widget. */`,
    ...fonts.map(f => `@import url('${f}');`), LIB.baseCss, swap(LIB.lookCss.replace(/\/\* ---- show \/ hide switches ---- \*\/[\s\S]*?(?=\/\* ---- animations off)/, '/* ---- show / hide switches ---- */\n' + hideCss + '\n'), '', ''),
    EDITOR_CSS, '/* ---- colours (one block per part) ---- */', varsCss.trim(), '/* ---- animations ---- */', ...used.map(s => swap(s.keyframes, '__SRC__', 'src-' + s.id)),
    '/* ---- parts ---- */', pieceCss, sx.css, frameSrc ? '/* ---- game window frame ---- */\n' + swap(frameSrc.css.game, '__SRC__', 'src-' + frameSrc.id) : ''].join('\n') + '\n';
  // JS
  const alertEl = list.find(e => e.kind === 'alert'), chatEl = list.find(e => e.kind === 'chat');
  const labels = Object.assign({}, LIB.labels, alertEl ? SRC[alertEl.src].labels : {});
  const g = sc.game;
  const look = { root: '#ov', colors: ['.ov|--game-frame'].concat(colorSpecs), parts: lookParts, cam: 'auto', game: g ? [round(g.x), round(g.y), round(g.w), round(g.h)] : null };
  const js = swap(swap(swap(swap(LIB.engine, '{{TITLE}}', 'MY OVERLAY'), '{{LABELS}}', JSON.stringify(labels)), '{{MAX_MESSAGES}}', '5'),
    '{{CHAT_COLOURS}}', chatEl && SRC[chatEl.src].chatColours === false ? 'false' : 'true') + swap(LIB.look, '{{LOOK}}', JSON.stringify(look));
  // Fields
  const F = {};
  Object.keys(LIB.fields).forEach(k => {
    const f = JSON.parse(JSON.stringify(LIB.fields[k]));
    if (k === 'layout' || k === 'customText') return;
    const m = k.match(/^show([A-Z]\w*)$/); if (m && !partsPresent[m[1][0].toLowerCase() + m[1].slice(1)]) return;
    if (!g && /^game|^cutCam$/.test(k)) return;
    if (f.group === 'Show / hide' && !F.__c) { Object.assign(F, colourFields); if (g) F.c_game_frame = { type: 'colorpicker', label: 'Game window frame', value: g.frameColour || '#ffffff', group: 'Colours' }; F.__c = 1; }
    if (k in values()) f.value = values()[k];
    F[k] = f;
  });
  delete F.__c;
  F.widgetName.value = 'My overlay (' + SCENES.find(x => x[0] === design.scene)[1] + ')';
  if (!g) delete F.cutCam;
  const imgs = list.filter(e => e.kind === 'image');
  imgs.forEach((e, i) => { F['img_' + e.img] = { type: 'image-input', label: 'Image ' + (i + 1) + ' (upload the same picture you used on the site)', value: '', group: 'Images' }; });
  return { html, css, js, fields: F, imgs };
}
function values() {           // current setting values for the Fields box
  const v = {};
  SHARED.forEach(k => { if (k in shared) v[k] = shared[k]; });
  v.streamerName = streamerName;
  const g = scene().game;
  if (g) { v.gameX = round(g.x); v.gameY = round(g.y); v.gameW = round(g.w); v.gameH = round(g.h); v.gameRadius = g.r || 0; v.gameFrame = g.frame !== false; v.cutCam = g.cutCam !== false; }
  const chatEl = els().find(e => e.kind === 'chat'); if (chatEl && !('useChatColours' in shared)) v.useChatColours = SRC[chatEl.src].chatColours !== false;
  return v;
}
function partLabel(e, i) {
  const n = e.kind === 'stat' ? STATS[e.stat] : e.kind === 'text' ? 'Text “' + String(e.text || '').slice(0, 18) + '”' : e.kind === 'title' ? 'Title “' + String(e.text || '').slice(0, 18) + '”' : KINDS[e.kind].name;
  const same = els().filter(x => x.kind === e.kind && (e.kind !== 'stat' || x.stat === e.stat));
  return same.length > 1 ? n + ' ' + (same.indexOf(e) + 1) : n;
}

/* ------------------------------------------------------------------ the canvas (iframe) */
const RUNTIME = `(function(){
  var root=document.getElementById('ov'); var st=document.createElement('style');
  st.textContent='.stage-edit .sx.sx-play *{animation-play-state:running!important;animation-delay:var(--d,0s)!important}.stage-edit .sx.sx-play .sx-in{animation-delay:1.7s!important}.stage-edit *,.stage-edit *::before,.stage-edit *::after{animation-delay:-60s!important;animation-play-state:paused!important}.stage-drag *,.stage-drag *::before,.stage-drag *::after{transition:none!important}.stage-edit .alert{opacity:1!important;animation:none!important}.stage-edit .chat{opacity:1!important}.stage-edit>.game-frame{display:block!important}.stage-edit .game-box{outline:2px dashed rgba(255,255,255,.75);outline-offset:-2px}.stage-edit:not(.has-bg):not(.frame-on) .game-box{box-shadow:none!important}.stage-edit .game-box::after{content:"YOUR GAME GOES HERE";position:absolute;inset:0;display:grid;place-items:center;font:700 30px Arial,sans-serif;letter-spacing:8px;color:rgba(0,0,0,.4);text-shadow:0 1px 0 rgba(255,255,255,.6)}';
  document.head.appendChild(st);
  function prime(){var a=document.getElementById('alert-name');if(a&&!a.textContent){a.textContent='NewFriend';var k=document.getElementById('alert-kind');if(k)k.textContent='NEW FOLLOWER';var d=document.getElementById('alert-detail');if(d)d.textContent='just followed!';var ic=document.getElementById('alert-icon');if(ic)ic.textContent='\\u2665';}}
  var pend={},raf=0;
  function geom(d){var w=document.querySelector('[data-el="'+d.id+'"]');if(!w)return;var s=d.kind==='decor'?1:(d.s||1);
    w.style.translate='';w.style.left=d.x+'px';w.style.top=d.y+'px';w.style.width=d.w+'px';w.style.height=d.h+'px';w.style.transform=d.rot?'rotate('+d.rot+'deg)':'';w.style.display=d.hidden?'none':'';w.style.zIndex=d.z;
    var i=w.firstElementChild;i.style.width=(d.w/s)+'px';i.style.height=(d.h/s)+'px';i.style.transform='scale('+s+')';
    if(d.kind==='decor'){var L=i.firstElementChild;if(L)L.style.transform='scale('+(d.w/1920)+','+(d.h/1080)+')';}}
  function flush(){raf=0;var p=pend;pend={};Object.keys(p).forEach(function(k){var d=p[k];
    if(d.action==='move'){var w=document.querySelector('[data-el="'+d.id+'"]');if(w)w.style.translate=d.dx+'px '+d.dy+'px';}   /* moving: GPU only, no layout */
    else if(d.action==='game'){var b=document.querySelector('.game-box');if(b)Object.assign(b.style,{left:d.x+'px',top:d.y+'px',width:d.w+'px',height:d.h+'px'});}
    else{geom(d);if(d.kind==='cam'&&!root.classList.contains('stage-drag')&&window.__reload)window.__reload();}});}
  addEventListener('message',function(ev){var d=ev.data;if(!d||d.scope!=='overlay-editor')return;
    if(d.action==='edit'){root.classList.toggle('stage-edit',!!d.on);if(d.on)prime();}
    if(d.action==='geom'||d.action==='move'||d.action==='game'){pend[d.action==='game'?'#game':d.id]=d;if(!raf)raf=requestAnimationFrame(flush);}
    if(d.action==='dragstart'){root.classList.add('stage-drag');var ws=d.id==='game'?document.querySelector('.game-box'):document.querySelector('[data-el="'+d.id+'"]');if(ws)ws.style.willChange='translate';}
    if(d.action==='dragend'){pend={};if(raf){cancelAnimationFrame(raf);raf=0;}root.classList.remove('stage-drag');
      var we=d.id==='game'?document.querySelector('.game-box'):document.querySelector('[data-el="'+d.id+'"]');if(we){we.style.willChange='';we.style.translate='';}
      if(d.geom)geom(d.geom);if(d.geom&&d.geom.kind==='cam'&&window.__reload)window.__reload();}
    if(d.action==='vars'){var ts=[].slice.call(document.querySelectorAll('[data-el="'+d.id+'"],.src-defs.e-'+d.id+',.sx.e-'+d.id));ts.forEach(function(w2){Object.keys(d.vars).forEach(function(k){if(/^--[\\w-]+$/.test(k))w2.style.setProperty(k,d.vars[k]);});});}
    if(d.action==='transition'){var o=document.querySelector('.sx');if(o){var n2=o.cloneNode(true);n2.classList.add('sx-play');o.parentNode.replaceChild(n2,o);}}
    if(d.action==='text'){var w3=document.querySelector('[data-el="'+d.id+'"] .ed-text');if(w3)w3.textContent=d.text;}
  });
})();`;
let stageTimer = null, stageReady = false;
function stageDoc() {
  const b = build(scene(), true);
  const fields = Object.assign({}, values(), { bgImage: '', alertSound: '' });
  Object.keys(b.fields).forEach(k => { if (/^c_/.test(k)) fields[k] = b.fields[k].value; });
  return '<!doctype html><html><head><meta charset="utf-8"><base href="' + esc(new URL('.', location.href).href) + '"><style>' + b.css + '</style></head><body>' + b.html +
    '<script>' + b.js + '<\/script><script>window.__FIELDS=' + JSON.stringify(fields).replace(/</g, '\\u003c') + ';<\/script><script>' +
    DEMO.replace("load(window.__FIELDS);", "load(window.__FIELDS); window.__reload = function(){ load(window.__LAST || window.__FIELDS); };").replace("if (d.action === 'fields' && d.fieldData && typeof d.fieldData === 'object') load(d.fieldData);", "if (d.action === 'fields' && d.fieldData && typeof d.fieldData === 'object') { window.__LAST = d.fieldData; load(d.fieldData); }") +
    '<\/script><script>' + RUNTIME + '<\/script></body></html>';
}
let DEMO = '';
let playTransitionNext = false;   // play the scene transition when the canvas next loads (after switching scenes)
function renderStage() {           // full redraw (adding, removing, re-styling parts)
  clearTimeout(stageTimer);
  stageTimer = setTimeout(() => {
    const old = $('stage'), f = document.createElement('iframe');
    ['id', 'title', 'sandbox'].forEach(k => f.setAttribute(k, old.getAttribute(k)));
    stageReady = false;
    f.addEventListener('load', () => { stageReady = true; post({ action: 'edit', on: !playing }); pushFields(); if (playTransitionNext) { playTransitionNext = false; post({ action: 'transition' }); } });
    f.srcdoc = stageDoc();
    old.replaceWith(f);
  }, 30);
}
function post(msg) { try { $('stage').contentWindow.postMessage(Object.assign({ scope: 'overlay-editor' }, msg), '*'); } catch (e) { /* not ready */ } }
function postDemo(msg) { try { $('stage').contentWindow.postMessage(Object.assign({ scope: 'overlay-demo' }, msg), '*'); } catch (e) { /* not ready */ } }
function pushFields() {
  const b = build(scene(), true), f = Object.assign({}, values(), { bgImage, alertSound: '' });
  Object.keys(b.fields).forEach(k => { if (/^c_/.test(k)) f[k] = b.fields[k].value; });
  postDemo({ action: 'fields', fieldData: f });
}
function patchGeom(e) { const i = els().indexOf(e); post({ action: 'geom', id: e.id, kind: e.kind, x: round(e.x), y: round(e.y), w: round(e.w), h: round(e.h), rot: e.rot || 0, s: e.s || 1, hidden: !!e.hidden, z: i + 1 }); }

/* ------------------------------------------------------------------ selection box, handles, guides */
const canvasScale = () => $('canvas').clientWidth / 1920;
function renderSelection() {
  const layer = $('sel-layer');
  layer.querySelectorAll('.sel-box,.game-sel').forEach(n => n.remove());
  const e = selId === 'game' ? null : selected();
  const k = canvasScale();
  if (selId === 'game' && scene().game) {
    const g = scene().game, b = el('div', { className: 'sel-box game-sel' });
    Object.assign(b.style, { left: g.x * k + 'px', top: g.y * k + 'px', width: g.w * k + 'px', height: g.h * k + 'px' });
    b.append(el('span', { className: 'tag', textContent: 'Game window ' + round(g.w) + ' × ' + round(g.h) }));
    handles(b, true); layer.append(b);
  } else if (e) {
    const b = el('div', { className: 'sel-box' + (e.locked ? ' locked' : '') });
    Object.assign(b.style, { left: e.x * k + 'px', top: e.y * k + 'px', width: e.w * k + 'px', height: e.h * k + 'px', transform: e.rot ? `rotate(${e.rot}deg)` : '' });
    b.append(el('span', { className: 'tag', textContent: partLabel(e, els().indexOf(e)) + (e.locked ? ' (locked)' : '') }));
    if (!e.locked) handles(b, e.kind === 'cam');
    layer.append(b);
  }
  $('pos-readout').textContent = selId === 'game' && scene().game ? `Game window  X ${round(scene().game.x)}  Y ${round(scene().game.y)}  ${round(scene().game.w)} × ${round(scene().game.h)}`
    : e ? `${partLabel(e, 0)}  X ${round(e.x)}  Y ${round(e.y)}  ${round(e.w)} × ${round(e.h)}${e.rot ? '  ' + round(e.rot) + '°' : ''}` : 'Nothing selected: click a part on the canvas, or drag one in from the left.';
}
const HANDLES = [['nw', 0, 0, -1, -1], ['n', .5, 0, 0, -1], ['ne', 1, 0, 1, -1], ['e', 1, .5, 1, 0], ['se', 1, 1, 1, 1], ['s', .5, 1, 0, 1], ['sw', 0, 1, -1, 1], ['w', 0, .5, -1, 0]];
const CURSORS = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];
function handles(box, noRotate) {
  const rot = selId === 'game' ? 0 : (selected() || {}).rot || 0;
  HANDLES.forEach(([n, fx, fy, sx, sy]) => {
    const h = el('span', { className: 'h' + (sx && sy ? '' : ' edge' + (sx ? ' v' : '')) });
    h.dataset.h = n; h.style.left = fx * 100 + '%'; h.style.top = fy * 100 + '%';
    const ang = (Math.atan2(sy, sx) * 180 / Math.PI + rot + 360) % 180;
    h.style.cursor = CURSORS[Math.round(((ang + 45) % 180) / 45) % 4] || 'move';
    h.setAttribute('aria-hidden', 'true');
    h.addEventListener('pointerdown', ev => startResize(ev, sx, sy));
    box.append(h);
  });
  if (!noRotate) { const r = el('span', { className: 'rot', title: 'Drag to rotate (Shift: 15° steps)' }); r.addEventListener('pointerdown', startRotate); box.append(r); }
}
function clearGuides() { $('sel-layer').querySelectorAll('.guide').forEach(n => n.remove()); }
function showGuides(xs, ys) {
  clearGuides(); const k = canvasScale();
  xs.forEach(x => { const g = el('div', { className: 'guide v' }); g.style.left = x * k + 'px'; $('sel-layer').append(g); });
  ys.forEach(y => { const g = el('div', { className: 'guide h' }); g.style.top = y * k + 'px'; $('sel-layer').append(g); });
}
function snapLines(skipId) {
  const xs = [0, 960, 1920], ys = [0, 540, 1080];
  els().forEach(o => { if (o.id === skipId || o.hidden || o.rot) return; xs.push(o.x, o.x + o.w / 2, o.x + o.w); ys.push(o.y, o.y + o.h / 2, o.y + o.h); });
  const g = scene().game; if (g && skipId !== 'game') { xs.push(g.x, g.x + g.w / 2, g.x + g.w); ys.push(g.y, g.y + g.h / 2, g.y + g.h); }
  return { xs, ys };
}
function snap(vals, lines, tol) {   // vals: candidate edges; returns [offset, line] of the closest match
  let best = null;
  vals.forEach(v => lines.forEach(l => { const d = l - v; if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, l]; }));
  return best;
}

/* hit testing: topmost visible part under the pointer (rotated boxes included) */
function toModel(ev) { const r = $('canvas').getBoundingClientRect(), k = r.width / 1920; return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k }; }
function inside(e, p) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, a = -(e.rot || 0) * Math.PI / 180;
  const dx = p.x - cx, dy = p.y - cy, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= e.w / 2 && Math.abs(ly) <= e.h / 2;
}
function hit(p) {
  const list = els();
  for (let i = list.length - 1; i >= 0; i--) { const e = list[i]; if (!e.hidden && e.kind !== 'decor' && inside(e, p)) return e.id; }
  const g = scene().game; if (g && p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h) return 'game';
  // full-screen decorations are picked in the Layers list, so clicking empty space still deselects
  for (let i = list.length - 1; i >= 0; i--) { const e = list[i]; if (!e.hidden && e.kind === 'decor' && (e.w < 1880 || e.h < 1040) && inside(e, p)) return e.id; }
  return null;
}
function select(id) { selId = id; renderSelection(); renderRight(); renderLayers(); }

/* dragging */
let drag = null;
function target() { return selId === 'game' ? scene().game : selected(); }
$('sel-layer').addEventListener('pointerdown', ev => {
  if (ev.button !== 0 || ev.target.closest('.h,.rot')) return;
  const p = toModel(ev); const id = hit(p);
  select(id); $('sel-layer').focus({ preventScroll: true });
  const t = target(); if (!t || (t.locked)) return;
  drag = { mode: 'move', before: snapshot(), p0: p, x0: t.x, y0: t.y, id: ev.pointerId, moved: false };
  post({ action: 'dragstart', id: selId });
  $('sel-layer').setPointerCapture(ev.pointerId);
});
function startResize(ev, sx, sy) {
  ev.stopPropagation(); ev.preventDefault();
  const t = target(); if (!t) return;
  drag = { mode: 'resize', before: snapshot(), p0: toModel(ev), sx, sy, x0: t.x, y0: t.y, w0: t.w, h0: t.h, s0: t.s || 1, id: ev.pointerId, moved: false };
  post({ action: 'dragstart', id: selId });
  $('sel-layer').setPointerCapture(ev.pointerId);
}
function startRotate(ev) {
  ev.stopPropagation(); ev.preventDefault();
  const t = selected(); if (!t) return;
  drag = { mode: 'rotate', before: snapshot(), id: ev.pointerId, moved: false };
  post({ action: 'dragstart', id: selId });
  $('sel-layer').setPointerCapture(ev.pointerId);
}
let rafPending = false;
$('sel-layer').addEventListener('pointermove', ev => {
  if (!drag) { hover(ev); return; }
  if (ev.pointerId !== drag.id) return;
  const t = target(); if (!t) return;
  const p = toModel(ev), noSnap = ev.altKey, tol = 7 / canvasScale() * .5 + 3;
  const L = snapLines(selId);
  if (drag.mode === 'move') {
    let x = drag.x0 + p.x - drag.p0.x, y = drag.y0 + p.y - drag.p0.y;
    if (!drag.moved && Math.hypot(p.x - drag.p0.x, p.y - drag.p0.y) < 2) return;
    drag.moved = true;
    const gx = [], gy = [];
    if (!noSnap && !t.rot) {
      const sx = snap([x, x + t.w / 2, x + t.w], L.xs, tol); if (sx) { x += sx[0]; gx.push(sx[1]); }
      const sy = snap([y, y + t.h / 2, y + t.h], L.ys, tol); if (sy) { y += sy[0]; gy.push(sy[1]); }
    }
    t.x = clamp(x, -t.w + 20, 1900); t.y = clamp(y, -t.h + 20, 1060);
    showGuides(gx, gy);
  } else if (drag.mode === 'resize') {
    drag.moved = true;
    const rot = (selId === 'game' ? 0 : t.rot || 0) * Math.PI / 180;
    const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    const lx = dx * Math.cos(-rot) - dy * Math.sin(-rot), ly = dx * Math.sin(-rot) + dy * Math.cos(-rot);
    let w = drag.w0 + drag.sx * lx, h = drag.h0 + drag.sy * ly;
    const corner = drag.sx && drag.sy;
    const keep = selId === 'game' ? (t.lock !== false && corner) || ev.shiftKey : ev.shiftKey && corner;
    if (keep) { const r = drag.w0 / drag.h0; if (Math.abs(lx) * drag.h0 > Math.abs(ly) * drag.w0) h = w / r; else w = h * r; }
    if (selId === 'game' && t.lock !== false && !corner) { if (drag.sx) h = w * 9 / 16; else w = h * 16 / 9; }
    w = Math.max(20, w); h = Math.max(20, h);
    // snap the moving edges (unrotated only)
    const gx = [], gy = [];
    if (!noSnap && !rot && !keep) {
      if (drag.sx === 1) { const s = snap([drag.x0 + w], L.xs, tol); if (s) { w += s[0]; gx.push(s[1]); } }
      if (drag.sx === -1) { const s = snap([drag.x0 + drag.w0 - w], L.xs, tol); if (s) { w -= s[0]; gx.push(s[1]); } }
      if (drag.sy === 1) { const s = snap([drag.y0 + h], L.ys, tol); if (s) { h += s[0]; gy.push(s[1]); } }
      if (drag.sy === -1) { const s = snap([drag.y0 + drag.h0 - h], L.ys, tol); if (s) { h -= s[0]; gy.push(s[1]); } }
    }
    showGuides(gx, gy);
    // keep the opposite side still (works for rotated parts too)
    const cx0 = drag.x0 + drag.w0 / 2, cy0 = drag.y0 + drag.h0 / 2;
    const ox = drag.sx * (w - drag.w0) / 2, oy = drag.sy * (h - drag.h0) / 2;
    const cx = cx0 + ox * Math.cos(rot) - oy * Math.sin(rot), cy = cy0 + ox * Math.sin(rot) + oy * Math.cos(rot);
    t.w = w; t.h = h; t.x = cx - w / 2; t.y = cy - h / 2;
    if (keep && selId !== 'game' && t.kind !== 'decor' && t.kind !== 'image') t.s = clamp(drag.s0 * w / drag.w0, .2, 8);   // Shift+corner zooms the contents
    if (selId === 'game') { t.x = clamp(t.x, 0, 1900); t.y = clamp(t.y, 0, 1060); t.w = Math.min(t.w, 1920 - t.x); t.h = Math.min(t.h, 1080 - t.y); }
  } else if (drag.mode === 'rotate') {
    drag.moved = true;
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
    if (ev.shiftKey) a = Math.round(a / 15) * 15;
    else { const n = Math.round(a / 90) * 90; if (Math.abs(a - n) < 4) a = n; }
    t.rot = ((a % 360) + 360) % 360; if (t.rot > 180) t.rot -= 360;
  }
  if (!rafPending) { rafPending = true; requestAnimationFrame(() => { rafPending = false; live(); }); }
});
function live() {   // runs at most once per frame while dragging: cheap updates only
  const d = drag;
  if (selId === 'game') { const g = scene().game; post({ action: 'game', x: round(g.x), y: round(g.y), w: round(g.w), h: round(g.h) }); }
  else { const e = selected(); if (!e) return;
    if (d && d.mode === 'move') post({ action: 'move', id: e.id, dx: round(e.x - d.x0), dy: round(e.y - d.y0) });
    else patchGeom(e); }
  moveSelection();
}
function moveSelection() {   // move the existing selection box instead of rebuilding it
  const b = $('sel-layer').querySelector('.sel-box'); if (!b) return renderSelection();
  const t = target(); if (!t) return;
  const k = canvasScale();
  b.style.left = t.x * k + 'px'; b.style.top = t.y * k + 'px'; b.style.width = t.w * k + 'px'; b.style.height = t.h * k + 'px';
  b.style.transform = selId !== 'game' && t.rot ? `rotate(${t.rot}deg)` : '';
  $('pos-readout').textContent = `X ${round(t.x)}  Y ${round(t.y)}  ${round(t.w)} × ${round(t.h)}` + (selId !== 'game' && t.rot ? '  ' + round(t.rot) + '°' : '');
}
function endDrag(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag; drag = null; clearGuides();
  const e = selId === 'game' ? null : selected();
  post({ action: 'dragend', id: selId, geom: e ? { id: e.id, kind: e.kind, x: round(e.x), y: round(e.y), w: round(e.w), h: round(e.h), rot: e.rot || 0, s: e.s || 1, hidden: !!e.hidden, z: els().indexOf(e) + 1 } : null });
  if (d.moved) { commit(d.before); if (selId === 'game') pushFields(); renderSelection(); renderRight(); }
}
$('sel-layer').addEventListener('pointerup', endDrag);
$('sel-layer').addEventListener('pointercancel', endDrag);
function hover(ev) {
  const layer = $('sel-layer'); let hb = layer.querySelector('.hover-box');
  const id = hit(toModel(ev)); const e = id && id !== 'game' ? byId(id) : null;
  if (!e || id === selId) { if (hb) hb.remove(); layer.style.cursor = id ? 'move' : 'default'; return; }
  if (!hb) { hb = el('div', { className: 'hover-box' }); layer.append(hb); }
  const k = canvasScale();
  Object.assign(hb.style, { left: e.x * k + 'px', top: e.y * k + 'px', width: e.w * k + 'px', height: e.h * k + 'px', transform: e.rot ? `rotate(${e.rot}deg)` : '' });
  layer.style.cursor = e.locked ? 'default' : 'move';
}
$('sel-layer').addEventListener('pointerleave', () => { const hb = $('sel-layer').querySelector('.hover-box'); if (hb) hb.remove(); });
function fitCanvas() {   // biggest 16:9 canvas that fits the space
  const wrap = $('canvas-wrap'), cs = getComputedStyle(wrap);
  const aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const w = Math.max(160, Math.floor(ah > 50 ? Math.min(aw, ah * 16 / 9) : aw));
  $('canvas').style.width = w + 'px'; $('canvas').style.height = Math.round(w * 9 / 16) + 'px';
  renderSelection();
}
new ResizeObserver(fitCanvas).observe($('canvas-wrap'));

/* keyboard */
let clipboard = null;
document.addEventListener('keydown', ev => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  const mod = ev.ctrlKey || ev.metaKey;
  if (mod && ev.key.toLowerCase() === 'z' && !typing) { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
  if (mod && ev.key.toLowerCase() === 'y' && !typing) { ev.preventDefault(); redo(); return; }
  if (ev.key === 'Escape' && !$('picker').hidden) { closePicker(); return; }
  if (typing || $('code-dialog').open || $('modal').open) return;
  const e = selected();
  if (ev.key === 'Escape') { if (!$('picker').hidden) closePicker(); else select(null); return; }
  if (!e && selId !== 'game') return;
  const t = target();
  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (arrows && t && !t.locked) {
    ev.preventDefault(); const n = ev.shiftKey ? 10 : 1;
    const before = snapshot(); t.x += arrows[0] * n; t.y += arrows[1] * n;
    clearTimeout(nudgeT); nudgeT = setTimeout(() => {}, 0);
    live(); commit(before); renderRight(); return;
  }
  if (!e) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); removeEl(e.id); }
  else if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicate(e.id); }
  else if (mod && ev.key.toLowerCase() === 'c') { clipboard = JSON.parse(JSON.stringify(e)); toast('Copied ' + partLabel(e, 0) + '.'); }
  else if (mod && ev.key.toLowerCase() === 'v' && clipboard) { ev.preventDefault(); paste(); }
  else if (ev.key === ']') { ev.preventDefault(); arrange(e.id, mod ? 'front' : 'forward'); }
  else if (ev.key === '[') { ev.preventDefault(); arrange(e.id, mod ? 'back' : 'backward'); }
});
let nudgeT = null;

/* ------------------------------------------------------------------ actions */
function addElement(e, at) {
  const single = KINDS[e.kind].single && els().find(x => x.kind === e.kind);
  if (single) {   // only one of these per overlay: restyle the one you have, keep where it is
    change(() => { single.src = e.src; single.colours = {}; }, { rerender: true });
    select(single.id); toast(KINDS[e.kind].name + ' now uses the ' + SRC[e.src].name + ' style (an overlay can only have one ' + KINDS[e.kind].name.toLowerCase() + ').');
    return;
  }
  if (at) { e.x = round(at.x - e.w / 2); e.y = round(at.y - e.h / 2); }
  change(() => { if (e.kind === 'decor') els().unshift(e); else els().push(e); }, { rerender: true });
  select(e.id);
}
function removeEl(id) {
  const e = byId(id); if (!e) return;
  change(() => { scene().elements = els().filter(x => x.id !== id); selId = null; }, { rerender: true });
  toast(partLabel(e, 0) + ' removed. Ctrl+Z brings it back.');
}
function duplicate(id) {
  const e = byId(id); if (!e) return;
  if (KINDS[e.kind].single) { toast('An overlay can only have one ' + KINDS[e.kind].name.toLowerCase() + ', because StreamElements feeds it once.'); return; }
  const c = JSON.parse(JSON.stringify(e)); c.id = newId(); c.x += 30; c.y += 30; c.locked = false;
  change(() => { els().splice(els().indexOf(e) + 1, 0, c); }, { rerender: true }); select(c.id);
}
function paste() {
  const c = JSON.parse(JSON.stringify(clipboard)); c.id = newId(); c.x += 30; c.y += 30;
  addElement(c);
}
function arrange(id, how) {
  const list = els(), i = list.findIndex(x => x.id === id); if (i < 0) return;
  change(() => {
    const [e] = list.splice(i, 1);
    const j = how === 'front' ? list.length : how === 'back' ? 0 : how === 'forward' ? Math.min(list.length, i + 1) : Math.max(0, i - 1);
    list.splice(j, 0, e);
  }, { patch: () => list.forEach(patchGeom) });
}
function setProp(e, props, opts) {
  change(() => Object.assign(e, props), opts || { patch: () => patchGeom(e) });
}

/* ------------------------------------------------------------------ left: library */
let libCat = 'All', libQuery = '', openSrc = null;
function matches(s, q) {
  if (!q) return true;
  const hay = (s.name + ' ' + s.category + ' ' + (s.tags || '') + ' ' + (s.forGame || '')).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
const iconOf = s => s.path.split('/').filter(Boolean).map(encodeURIComponent).join('/') + '/icon.png';
function pieceTile(s, kind, label, opts) {
  const b = el('button', { type: 'button', className: 'piece', draggable: true, title: 'Add ' + label + ' from ' + s.name });
  const pic = el('i');
  const key = kind === 'stat' ? opts.stat : kind;
  const r = kind === 'decor' ? [0, 0, 1920, 1080] : srcRect(s, key);
  if (r) {   // show that part of the overlay's preview picture
    const tw = 124, th = 46, z = Math.min(tw / r[2], th / r[3]);
    pic.style.backgroundImage = `url("${iconOf(s)}"),repeating-conic-gradient(#d9d9d9 0 25%,#fff 0 50%)`;
    pic.style.backgroundSize = `${1920 * z}px ${1080 * z}px,8px 8px`;
    pic.style.backgroundPosition = `${-r[0] * z + (tw - r[2] * z) / 2}px ${-r[1] * z + (th - r[3] * z) / 2}px,0 0`;
    pic.style.backgroundRepeat = 'no-repeat,repeat';
  }
  b.append(pic, document.createTextNode(label));
  const make = () => makeElement(kind, s.id, opts);
  b.addEventListener('click', () => addElement(make()));
  b.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/plain', JSON.stringify({ src: s.id, kind, opts })); ev.dataTransfer.effectAllowed = 'copy'; });
  return b;
}
function renderLibrary() {
  const box = $('lib-list'); box.replaceChildren();
  LIB.sources.filter(s => (libCat === 'All' || s.category === libCat) && matches(s, libQuery)).forEach(s => {
    const wrap = el('div', { className: 'lib-ov' + (openSrc === s.id ? ' open' : '') });
    const head = el('button', { type: 'button' }, el('img', { src: iconOf(s), alt: '', loading: 'lazy' }), el('span', { textContent: s.name }, el('small', { textContent: s.forGame ? s.category + ' · ' + s.forGame + ' (unofficial)' : s.category })));
    head.setAttribute('aria-expanded', String(openSrc === s.id));
    head.addEventListener('click', () => { openSrc = openSrc === s.id ? null : s.id; renderLibrary(); });
    wrap.append(head);
    if (openSrc === s.id) {
      const grid = el('div', { className: 'lib-pieces' });
      const whole = el('button', { type: 'button', className: 'piece whole', textContent: '⧉ Use this whole overlay' });
      whole.addEventListener('click', () => useOverlay(s));
      grid.append(whole,
        pieceTile(s, 'cam', 'Webcam frame'), pieceTile(s, 'chat', 'Chat'), pieceTile(s, 'alert', 'Alert box'),
        ...Object.keys(STATS).map(k => pieceTile(s, 'stat', STATS[k], { stat: k })), pieceTile(s, 'goal', 'Follower goal'),
        pieceTile(s, 'socials', 'Socials'), pieceTile(s, 'title', 'Big title', { text: 'YOUR TITLE' }), pieceTile(s, 'text', 'Text', { text: 'Your text here' }), pieceTile(s, 'clock', 'Clock'));
      if (s.screen && s.screen.trim()) grid.append(pieceTile(s, 'decor', 'Decorations'));
      wrap.append(grid);
    }
    box.append(wrap);
  });
  if (!box.children.length) box.append(el('p', { className: 'hint', textContent: 'Nothing matches. Try a mood (cosy, neon, gold, horror), a colour or a game.' }));
}
$('lib-search').addEventListener('input', () => { libQuery = $('lib-search').value.trim(); renderLibrary(); });
function renderCats() {
  $('lib-cats').replaceChildren(...CATS.map(c => { const b = el('button', { type: 'button', textContent: c }); b.setAttribute('aria-pressed', String(c === libCat)); b.addEventListener('click', () => { libCat = c; renderCats(); renderLibrary(); }); return b; }));
}
// drop onto the canvas
$('canvas').addEventListener('dragover', ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; if (!$('canvas').querySelector('.drop-hint')) $('canvas').append(el('div', { className: 'drop-hint' })); });
$('canvas').addEventListener('dragleave', ev => { if (!$('canvas').contains(ev.relatedTarget)) { const h = $('canvas').querySelector('.drop-hint'); if (h) h.remove(); } });
$('canvas').addEventListener('drop', ev => {
  ev.preventDefault(); const h = $('canvas').querySelector('.drop-hint'); if (h) h.remove();
  let d; try { d = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch (e) { return; }
  const at = toModel(ev);
  if (d.img) { addImage(d.img, at); return; }
  if (!d.src || !SRC[d.src] || !KINDS[d.kind]) return;
  addElement(makeElement(d.kind, d.src, d.opts), d.kind === 'decor' ? null : at);
});
// tabs
['parts', 'uploads', 'layers'].forEach(t => $('tab-' + t).addEventListener('click', () => {
  ['parts', 'uploads', 'layers'].forEach(u => { $('tab-' + u).setAttribute('aria-selected', String(u === t)); $('pane-' + u).hidden = u !== t; });
}));

/* uploads */
async function listImages() { return store.get('overlay-editor-images') || []; }
async function renderImages() {
  const list = await listImages(), box = $('img-list'); box.replaceChildren();
  for (const im of list) {
    if (!imgCache[im.id]) { const blob = await idb.get('img:' + im.id); if (blob instanceof Blob) imgCache[im.id] = await toDataURL(blob); }
    if (!imgCache[im.id]) continue;
    const tile = el('div', { className: 'img-item', draggable: true, title: 'Add ' + im.name }, el('img', { src: imgCache[im.id], alt: im.name }));
    const del = el('button', { type: 'button', textContent: '✕', title: 'Delete this image' });
    del.addEventListener('click', async ev => {
      ev.stopPropagation();
      const usedIn = Object.values(design.scenes).some(sc => sc && sc.elements.some(e => e.img === im.id));
      if (usedIn) { toast('This image is on your design. Remove it from the canvas first.'); return; }
      await idb.del('img:' + im.id); store.set('overlay-editor-images', (await listImages()).filter(x => x.id !== im.id)); delete imgCache[im.id]; renderImages();
    });
    tile.append(del);
    tile.addEventListener('click', () => addImage(im.id));
    tile.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', JSON.stringify({ img: im.id })));
    box.append(tile);
  }
  if (!box.children.length) box.append(el('p', { className: 'hint', textContent: 'No images yet.' }));
}
function addImage(id, at) {
  const im = (store.get('overlay-editor-images') || []).find(x => x.id === id); if (!im) return;
  const r = Math.min(1, 600 / Math.max(im.w, im.h));
  addElement(makeElement('image', null, { img: id, w: round(im.w * r), h: round(im.h * r) }), at);
}
$('img-file').addEventListener('change', async () => {
  const files = [...($('img-file').files || [])]; $('img-file').value = '';
  const list = store.get('overlay-editor-images') || [];
  for (const f of files) {
    if (!/^image\//.test(f.type)) { toast(f.name + ' isn’t an image.'); continue; }
    if (f.size > 15 * 1024 * 1024) { toast(f.name + ' is over 15 MB. Use a smaller image.'); continue; }
    try {
      const bmp = await createImageBitmap(f);
      const id = 'i' + Math.random().toString(36).slice(2, 8);
      if (!(await idb.put('img:' + id, f))) { toast('This browser would not save the image.'); continue; }
      imgCache[id] = await toDataURL(f);
      list.push({ id, name: f.name.slice(0, 60), w: bmp.width, h: bmp.height });
    } catch (e) { toast(f.name + ' couldn’t be read.'); }
  }
  store.set('overlay-editor-images', list); renderImages();
});

/* layers */
let dragLayer = null;
function renderLayers() {
  const ol = $('layer-list'); ol.replaceChildren();
  const list = els();
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    const li = el('li', { className: e.id === selId ? 'sel' : '', draggable: true });
    const name = el('span', { textContent: partLabel(e, i) + (e.src ? ' · ' + SRC[e.src].name : '') });
    const eye = el('button', { type: 'button', textContent: e.hidden ? '◌' : '👁', title: e.hidden ? 'Show' : 'Hide' });
    eye.setAttribute('aria-label', (e.hidden ? 'Show ' : 'Hide ') + partLabel(e, i));
    eye.addEventListener('click', ev => { ev.stopPropagation(); setProp(e, { hidden: !e.hidden }); });
    const lock = el('button', { type: 'button', textContent: e.locked ? '🔒' : '🔓', title: e.locked ? 'Unlock' : 'Lock' });
    lock.setAttribute('aria-label', (e.locked ? 'Unlock ' : 'Lock ') + partLabel(e, i));
    lock.addEventListener('click', ev => { ev.stopPropagation(); setProp(e, { locked: !e.locked }); });
    li.append(name, eye, lock);
    li.addEventListener('click', () => select(e.id));
    li.addEventListener('dragstart', () => { dragLayer = e.id; });
    li.addEventListener('dragover', ev => { ev.preventDefault(); li.classList.add('drop'); });
    li.addEventListener('dragleave', () => li.classList.remove('drop'));
    li.addEventListener('drop', ev => {
      ev.preventDefault(); li.classList.remove('drop');
      if (!dragLayer || dragLayer === e.id) return;
      change(() => { const a = list.findIndex(x => x.id === dragLayer); const [m] = list.splice(a, 1); const b = list.findIndex(x => x.id === e.id); list.splice(b + 1, 0, m); }, { patch: () => list.forEach(patchGeom) });
    });
    ol.append(li);
  }
  if (scene().game) { const li = el('li', { className: selId === 'game' ? 'sel' : '' }, el('span', { textContent: 'Game window (always at the back)' })); li.addEventListener('click', () => select('game')); ol.append(li); }
}

/* ------------------------------------------------------------------ right: customise */
function field(label, input, extra) { const w = el('div', { className: 'field' }); const l = el('label', {}, document.createTextNode(label)); if (extra) l.append(extra); l.append(input); w.append(l); return w; }
function numberBox(label, value, onChange, opts) {
  const i = el('input', { type: 'number', value: round(value), step: 1 }); if (opts && opts.min != null) i.min = opts.min; if (opts && opts.max != null) i.max = opts.max;
  i.addEventListener('change', () => { const n = Number(i.value); if (Number.isFinite(n)) onChange(n); });
  const l = el('label', {}, document.createTextNode(label), i); return l;
}
function rangeBox(label, value, min, max, step, onInput, onCommit, fmt) {
  const r = el('input', { type: 'range', min, max, step, value }); const o = el('output', { textContent: fmt ? fmt(value) : value });
  r.addEventListener('input', () => { o.textContent = fmt ? fmt(+r.value) : r.value; onInput(+r.value); });
  r.addEventListener('change', () => onCommit && onCommit(+r.value));
  const w = el('div', { className: 'field' }, el('label', {}, document.createTextNode(label), el('div', { className: 'range' }, r, o))); return w;
}
function renderRight() {
  const box = $('ed-right'); box.replaceChildren();
  if (selId === 'game' && scene().game) return renderGame(box);
  const e = selected();
  if (!e) return renderSettings(box);
  const i = els().indexOf(e);
  box.append(el('h2', { textContent: partLabel(e, i) }), el('p', { className: 'sub', textContent: e.src ? 'Style: ' + SRC[e.src].name : 'Your image' }));
  // style (swap to another overlay's version of the same part)
  if (e.src) {
    const sel = el('select');
    CATS.slice(1).forEach(cat => {
      const og = el('optgroup', { label: cat });
      LIB.sources.filter(s => s.category === cat && (e.kind !== 'decor' || (s.screen && s.screen.trim()))).forEach(s => og.append(el('option', { value: s.id, textContent: s.name + (s.forGame ? ' (' + s.forGame + ')' : ''), selected: s.id === e.src })));
      sel.append(og);
    });
    sel.addEventListener('change', () => setProp(e, { src: sel.value, colours: {} }, { rerender: true }));
    box.append(field('Style (from any overlay)', sel));
  }
  if (e.kind === 'stat') {
    const t = el('select'); Object.keys(STATS).forEach(k => t.append(el('option', { value: k, textContent: STATS[k], selected: k === e.stat })));
    t.addEventListener('change', () => setProp(e, { stat: t.value }, { rerender: true }));
    box.append(field('Shows', t));
  }
  if (e.kind === 'text' || e.kind === 'title') {
    const ta = el('textarea', { rows: 3, maxLength: 200, value: e.text || '' });
    let before = null;
    ta.addEventListener('focus', () => { before = snapshot(); });
    ta.addEventListener('input', () => { e.text = ta.value; post({ action: 'text', id: e.id, text: ta.value }); renderLayers(); });
    ta.addEventListener('change', () => { commit(before); before = snapshot(); });
    box.append(field('Text', ta));
  }
  // position + size
  box.append(el('h3', { textContent: 'Position & size' }));
  const g4 = el('div', { className: 'grid4' },
    numberBox('X', e.x, v => setProp(e, { x: v })), numberBox('Y', e.y, v => setProp(e, { y: v })),
    numberBox('Width', e.w, v => setProp(e, { w: Math.max(20, v) })), numberBox('Height', e.h, v => setProp(e, { h: Math.max(20, v) })));
  box.append(g4);
  if (e.kind !== 'cam') {
    let before = null;
    box.append(rangeBox('Rotation', round(e.rot || 0), -180, 180, 1, v => { if (before == null) before = snapshot(); e.rot = v; patchGeom(e); renderSelection(); }, () => { commit(before); before = null; }, v => v + '°'));
  } else box.append(el('p', { className: 'hint', textContent: 'The webcam frame can’t be rotated: OBS puts your camera in a straight box, and the see-through hole follows this frame.' }));
  if (e.kind !== 'decor' && e.kind !== 'image') {
    let before = null;
    box.append(rangeBox('Text & contents size', Math.round((e.s || 1) * 100), 20, 400, 5, v => {
      if (before == null) before = snapshot(); e.s = v / 100; patchGeom(e);
    }, () => { commit(before); before = null; }, v => v + '%'));
  }
  const btnFit = el('button', { type: 'button', className: 'ghost', textContent: 'Reset size to the original' });
  btnFit.addEventListener('click', () => { const r = e.src ? srcRect(SRC[e.src], e.kind === 'stat' ? e.stat : e.kind) : null; const d = r || defaultRect(e.kind); setProp(e, { w: d[2], h: d[3], s: 1, rot: 0 }); });
  if (e.kind !== 'image') box.append(el('div', { className: 'btns' }, btnFit));
  // colours
  const vars = varsFor(e);
  if (vars.length) {
    // ornate overlays paint metal, velvet and jewels with shared patterns: those colours belong to every part from that overlay
    const shared = new Set(e.src && SRC[e.src].defs ? (SRC[e.src].defs.match(/var\(--[\w-]+/g) || []).map(m => m.slice(4)) : []);
    box.append(el('h3', { textContent: 'Colours' }), el('p', { className: 'hint', textContent: shared.size
      ? 'Tap a circle for the colour wheel, or type a hex code. Colours marked ⛓ (metal, velvet, jewels…) are shared by every part from ' + SRC[e.src].name + ', so changing one changes them all.'
      : 'Only this part changes. Tap a circle for the colour wheel, or type a hex code.' }));
    vars.forEach(([name, label, def]) => {
      const v = e.colours[name] || def;
      const row = el('button', { type: 'button', className: 'colour-row' }, el('span', { className: 'swatch' }), el('span', { className: 'l', textContent: label + (shared.has(name) ? ' ⛓' : '') }), el('code', { textContent: v }));
      row.querySelector('.swatch').style.setProperty('--c', v);
      row.addEventListener('click', () => openPicker({ title: label, value: v, def,
        apply: (hex, final) => { (shared.has(name) ? els().filter(x => x.src === e.src) : [e]).forEach(t => { t.colours[name] = hex; post({ action: 'vars', id: t.id, vars: { [name]: hex } }); }); row.querySelector('.swatch').style.setProperty('--c', hex); row.querySelector('code').textContent = hex; if (final) save(); },
        begin: () => snapshot(), end: b => commit(b) }, row));
      box.append(row);
    });
    const rc = el('button', { type: 'button', className: 'ghost', textContent: 'Reset colours' });
    rc.addEventListener('click', () => setProp(e, { colours: {} }, { rerender: true }));
    box.append(el('div', { className: 'btns' }, rc));
  }
  // arrange
  box.append(el('h3', { textContent: 'Arrange' }));
  const b = (t, f, title) => { const x = el('button', { type: 'button', className: 'ghost', textContent: t, title: title || '' }); x.addEventListener('click', f); return x; };
  box.append(el('div', { className: 'btns' },
    b('To front', () => arrange(e.id, 'front'), 'Ctrl+]'), b('Forward', () => arrange(e.id, 'forward'), ']'), b('Backward', () => arrange(e.id, 'backward'), '['), b('To back', () => arrange(e.id, 'back'), 'Ctrl+[')));
  box.append(el('div', { className: 'btns', style: 'margin-top:6px' },
    ...(KINDS[e.kind].single ? [] : [b('Duplicate', () => duplicate(e.id), 'Ctrl+D')]),
    b(e.locked ? 'Unlock' : 'Lock', () => setProp(e, { locked: !e.locked })), b(e.hidden ? 'Show' : 'Hide', () => setProp(e, { hidden: !e.hidden })),
    Object.assign(b('Delete', () => removeEl(e.id), 'Delete key'), { className: 'danger' })));
  if (e.kind === 'image') box.append(el('p', { className: 'hint', textContent: 'In StreamElements, upload this same picture in the widget’s Fields › Images, or it won’t show.' }));
}
function renderGame(box) {
  const g = scene().game;
  box.append(el('h2', { textContent: 'Game window' }), el('p', { className: 'sub', textContent: 'Where your game capture goes. It stays see-through; your background image is cut out here.' }));
  box.append(el('div', { className: 'grid4' },
    numberBox('X', g.x, v => { setProp(g, { x: clamp(v, 0, 1900) }, { patch: pushFields }); }), numberBox('Y', g.y, v => setProp(g, { y: clamp(v, 0, 1060) }, { patch: pushFields })),
    numberBox('Width', g.w, v => setProp(g, g.lock !== false ? { w: clamp(v, 20, 1920), h: round(clamp(v, 20, 1920) * 9 / 16) } : { w: clamp(v, 20, 1920) }, { patch: pushFields })),
    numberBox('Height', g.h, v => setProp(g, g.lock !== false ? { h: clamp(v, 20, 1080), w: round(clamp(v, 20, 1080) * 16 / 9) } : { h: clamp(v, 20, 1080) }, { patch: pushFields }))));
  const chk = (label, val, f) => { const i = el('input', { type: 'checkbox', checked: val }); i.addEventListener('change', () => f(i.checked)); return el('div', { className: 'field check' }, el('label', {}, i, document.createTextNode(label))); };
  box.append(chk('Keep 16:9', g.lock !== false, v => setProp(g, { lock: v }, { patch: pushFields })));
  box.append(chk('Frame around it (shows with a background image)', g.frame !== false, v => setProp(g, { frame: v }, { patch: pushFields })));
  const fs = el('select'); fs.append(el('option', { value: '', textContent: 'Simple line' }));
  LIB.sources.filter(s => s.css.game).forEach(s => fs.append(el('option', { value: s.id, textContent: s.name, selected: s.id === g.frameSrc })));
  fs.addEventListener('change', () => setProp(g, { frameSrc: fs.value || null }, { rerender: true }));
  box.append(field('Frame style', fs));
  const fc = el('button', { type: 'button', className: 'colour-row' }, el('span', { className: 'swatch' }), el('span', { className: 'l', textContent: 'Simple line colour' }), el('code', { textContent: g.frameColour || '#ffffff' }));
  fc.querySelector('.swatch').style.setProperty('--c', g.frameColour || '#ffffff');
  fc.addEventListener('click', () => openPicker({ title: 'Game window frame', value: g.frameColour || '#ffffff', def: '#ffffff',
    apply: (hex) => { g.frameColour = hex; fc.querySelector('.swatch').style.setProperty('--c', hex); fc.querySelector('code').textContent = hex; pushFields(); }, begin: () => snapshot(), end: b => commit(b) }, fc));
  box.append(fc);
  let before = null;
  box.append(rangeBox('Corner rounding', g.r || 0, 0, 80, 1, v => { if (before == null) before = snapshot(); g.r = v; pushFields(); }, () => { commit(before); before = null; }, v => v + 'px'));
  const b = (t, f) => { const x = el('button', { type: 'button', className: 'ghost', textContent: t }); x.addEventListener('click', f); return x; };
  box.append(el('h3', { textContent: 'Quick sizes' }), el('div', { className: 'btns' },
    b('Full screen', () => setProp(g, { x: 0, y: 0, w: 1920, h: 1080 }, { patch: pushFields })), b('Centre large', () => setProp(g, { x: 240, y: 135, w: 1440, h: 810 }, { patch: pushFields })),
    b('Centre small', () => setProp(g, { x: 480, y: 270, w: 960, h: 540 }, { patch: pushFields }))));
  box.append(el('h3', { textContent: 'Scene' }), el('div', { className: 'btns' }, Object.assign(b('Remove the game window from this scene', () => { change(() => { scene().game = null; selId = null; }, { rerender: true }); }), { className: 'danger' })));
}
function renderSettings(box) {
  box.append(el('h2', { textContent: 'Customise' }), el('p', { className: 'sub', textContent: 'Click a part on the canvas to change it. These settings are for the whole overlay.' }));
  // your details
  box.append(el('h3', { textContent: 'Your details' }));
  const name = el('input', { type: 'text', maxLength: 32, value: streamerName });
  name.addEventListener('change', () => {
    const v = name.value.trim();
    if (!/^[a-zA-Z0-9 _-]{1,32}$/.test(v)) { name.setCustomValidity('Use 1–32 letters, numbers, spaces, underscores or hyphens.'); name.reportValidity(); return; }
    name.setCustomValidity(''); streamerName = v; store.set('overlay-name', v); renderStage();
  });
  box.append(field('Your streamer name', name, el('span', { className: 'shared-tag', textContent: 'all overlays' })));
  [['youtube', 'YouTube handle', '@yourcoolname'], ['tiktok', 'TikTok handle', '@yourcoolname'], ['twitch', 'Twitch name', 'yourcoolname']].forEach(([k, lab, def]) => {
    const i = el('input', { type: 'text', maxLength: 31, value: sharedVal(k, ''), placeholder: def });
    i.addEventListener('change', () => {
      const v = i.value.trim();
      if (v && !/^@?[A-Za-z0-9._-]{1,30}$/.test(v)) { i.setCustomValidity('Letters, numbers, dots, dashes and underscores only.'); i.reportValidity(); return; }
      i.setCustomValidity(''); if (v) setShared(k, v); else { delete shared[k]; store.set('overlay-shared', shared); } renderStage();
    });
    box.append(field(lab, i, el('span', { className: 'shared-tag', textContent: 'all overlays' })));
  });
  // background
  box.append(el('h3', { textContent: 'Background image' }));
  const thumb = el('div', { className: 'bg-thumb' }); if (bgImage) thumb.style.backgroundImage = `url("${bgImage}")`;
  const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', className: 'sr-only', id: 'bg-file' });
  file.addEventListener('change', () => useBackground(file));
  const add = el('label', { className: 'button-like', htmlFor: 'bg-file', textContent: bgImage ? 'Change background' : 'Add background image', tabIndex: 0 });
  const rm = el('button', { type: 'button', className: 'danger', textContent: 'Remove' }); rm.hidden = !bgImage;
  rm.addEventListener('click', async () => { bgImage = ''; await idb.del('background'); pushFields(); renderRight(); toast('Background removed.'); });
  box.append(thumb, file, el('div', { className: 'btns' }, add, rm),
    el('p', { className: 'hint', textContent: 'Shown everywhere except the game window and webcam. Preview only: in StreamElements upload the same image in Fields › Background image.' }));
  let before = null;
  box.append(rangeBox('Background opacity', sharedVal('bgOpacity', 100), 0, 100, 1, v => { setShared('bgOpacity', v); pushFields(); }, () => {}, v => v + '%'));
  // game window
  box.append(el('h3', { textContent: 'Game window' }));
  if (scene().game) { const gb = el('button', { type: 'button', className: 'ghost', textContent: 'Edit the game window' }); gb.addEventListener('click', () => select('game')); box.append(el('div', { className: 'btns' }, gb)); }
  else { const gb = el('button', { type: 'button', className: 'ghost', textContent: 'Add a game window to this scene' }); gb.addEventListener('click', () => { change(() => { scene().game = { x: 240, y: 135, w: 1440, h: 810, r: 0, frame: true, frameSrc: null, lock: true }; }, { rerender: true }); select('game'); }); box.append(el('div', { className: 'btns' }, gb)); }
  // behaviour (chat, alerts, goal) from the StreamElements Fields
  const groups = {};
  Object.keys(LIB.fields).forEach(k => { const f = LIB.fields[k]; if (['Chat', 'Alerts', 'Goal'].includes(f.group) || k === 'animations' || k === 'chatScale' || k === 'clock24') (groups[f.group === 'Show / hide' ? 'Look' : f.group] = groups[f.group === 'Show / hide' ? 'Look' : f.group] || []).push(k); });
  Object.keys(groups).forEach(g => {
    box.append(el('h3', { textContent: g }));
    groups[g].forEach(k => { const c = settingControl(k, LIB.fields[k]); if (c) box.append(c); });
  });
  box.append(el('p', { className: 'hint', textContent: 'Settings marked “all overlays” are shared with every overlay on this site. Everything here is also in the StreamElements Fields panel after you paste the 4th box.' }));
}
function settingControl(k, def) {
  const v = sharedVal(k, def.value), tag = el('span', { className: 'shared-tag', textContent: 'all overlays' });
  const setV = x => { if (JSON.stringify(x) === JSON.stringify(def.value)) { delete shared[k]; store.set('overlay-shared', shared); } else setShared(k, x); pushFields(); };
  if (def.type === 'checkbox') { const i = el('input', { type: 'checkbox', checked: !!v }); i.addEventListener('change', () => setV(i.checked)); return el('div', { className: 'field check' }, el('label', {}, i, document.createTextNode(def.label), tag)); }
  if (def.type === 'number' || def.type === 'slider') {
    if (def.type === 'slider') return rangeBox(def.label, v, def.min, def.max, def.step || 1, x => setV(x), null);
    const i = el('input', { type: 'number', value: v }); if (def.min != null) i.min = def.min; if (def.max != null) i.max = def.max;
    i.addEventListener('change', () => { let n = Number(i.value); if (!Number.isFinite(n)) return; if (def.min != null) n = Math.max(def.min, n); if (def.max != null) n = Math.min(def.max, n); i.value = n; setV(n); });
    return field(def.label, i, tag);
  }
  if (def.type === 'text') { const i = el('input', { type: 'text', value: v, maxLength: 300 }); i.addEventListener('change', () => setV(i.value)); return field(def.label, i, tag); }
  if (def.type === 'sound-input') return el('p', { className: 'hint', textContent: def.label + ': upload it in StreamElements (Fields), so your code stays small.' });
  return null;
}
async function useBackground(input) {
  const f = input.files && input.files[0]; input.value = ''; if (!f) return;
  if (!/^image\//.test(f.type)) { toast('That file isn’t an image.'); return; }
  try {
    const bmp = await createImageBitmap(f), scale = Math.min(1, Math.max(1920 / bmp.width, 1080 / bmp.height));
    const c = el('canvas', { width: round(bmp.width * scale), height: round(bmp.height * scale) }); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
    bgImage = await toDataURL(blob); await idb.put('background', blob); pushFields(); renderRight();
    toast('Background added for every overlay on this site.');
  } catch (e) { toast('That image couldn’t be read.'); }
}

/* ------------------------------------------------------------------ colour wheel */
const pk = { h: 0, s: 0, v: 1, a: 1, o: null, anchor: null, before: null, drawn: false };
function parseHex(v) { const m = String(v || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i); if (!m) return null; let h = m[1]; if (h.length === 3) h = h.split('').map(c => c + c).join(''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }; }
function toHex(c) { const p = n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0'); return '#' + p(c.r) + p(c.g) + p(c.b) + (c.a < .999 ? p(c.a * 255) : ''); }
function rgbToHsv({ r, g, b }) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx }; }
function hsvToRgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 }; }
function drawWheel() {
  const c = $('wheel'), ctx = c.getContext('2d'), n = c.width, R = n / 2, img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x - R + .5, dy = y - R + .5, d = Math.hypot(dx, dy), i = (y * n + x) * 4; if (d > R) continue; const c2 = hsvToRgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, d / R, 1); img.data[i] = c2.r; img.data[i + 1] = c2.g; img.data[i + 2] = c2.b; img.data[i + 3] = d > R - 1 ? (R - d) * 255 : 255; }
  ctx.putImageData(img, 0, 0); pk.drawn = true;
}
const pkColour = () => { const c = hsvToRgb(pk.h, pk.s, pk.v); return toHex({ r: c.r, g: c.g, b: c.b, a: pk.a }); };
function pkSync(fromInput) {
  const R = 100, rad = pk.s * R, ang = pk.h * Math.PI / 180;
  $('wheel-dot').style.left = (R + rad * Math.cos(ang)) + 'px'; $('wheel-dot').style.top = (R + rad * Math.sin(ang)) + 'px';
  $('wheel').style.filter = 'brightness(' + Math.max(.15, pk.v) + ')'; $('val').value = Math.round(pk.v * 100); $('alpha').value = Math.round((1 - pk.a) * 100);
  const hex = pkColour(); $('picker-swatch').style.setProperty('--c', hex); if (!fromInput) $('hex-input').value = hex;
}
function pkApply(hex) { if (pk.o) pk.o.apply(hex); clearTimeout(pkApply.t); pkApply.t = setTimeout(save, 300); }
function openPicker(o, anchor) {
  closePicker();
  if (!pk.drawn) drawWheel();
  pk.o = o; pk.anchor = anchor; pk.before = o.begin ? o.begin() : null;
  const c = parseHex(o.value) || { r: 255, g: 255, b: 255, a: 1 }; Object.assign(pk, rgbToHsv(c), { a: c.a });
  $('picker-title').textContent = o.title; $('hex-error').textContent = '';
  const p = $('picker'); p.hidden = false;
  const r = anchor.getBoundingClientRect();
  p.style.left = clamp(r.left - p.offsetWidth - 12, 8, innerWidth - p.offsetWidth - 8) + 'px'; p.style.top = clamp(r.top - 40, 8, innerHeight - p.offsetHeight - 8) + 'px';
  pkSync(); $('wheel').focus();
}
function closePicker() {
  if ($('picker').hidden) return; $('picker').hidden = true;
  if (pk.o && pk.o.end) pk.o.end(pk.before); pk.o = null; save();
}
function wheelAt(ev) { const r = $('wheel').getBoundingClientRect(), R = r.width / 2, dx = ev.clientX - r.left - R, dy = ev.clientY - r.top - R; pk.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; pk.s = Math.min(1, Math.hypot(dx, dy) / R); if (pk.v < .05) pk.v = 1; pkSync(); pkApply(pkColour()); }
$('wheel').addEventListener('pointerdown', ev => { ev.preventDefault(); $('wheel').setPointerCapture(ev.pointerId); wheelAt(ev); });
$('wheel').addEventListener('pointermove', ev => { if ($('wheel').hasPointerCapture(ev.pointerId)) wheelAt(ev); });
$('val').addEventListener('input', () => { pk.v = $('val').value / 100; pkSync(); pkApply(pkColour()); });
$('alpha').addEventListener('input', () => { pk.a = 1 - $('alpha').value / 100; pkSync(); pkApply(pkColour()); });
$('hex-input').addEventListener('input', () => { const c = parseHex($('hex-input').value); if (!c) { $('hex-error').textContent = 'Use a hex code like #ff00aa (or #ff00aa80 for see-through).'; return; } $('hex-error').textContent = ''; Object.assign(pk, rgbToHsv(c), { a: c.a }); pkSync(true); pkApply(toHex(c)); });
$('picker-reset').addEventListener('click', () => { const c = parseHex(pk.o.def); Object.assign(pk, rgbToHsv(c), { a: c.a }); pkSync(); pkApply(pk.o.def); });
$('picker-close').addEventListener('click', closePicker);
document.addEventListener('pointerdown', ev => { if (!$('picker').hidden && !$('picker').contains(ev.target) && !ev.target.closest('.colour-row')) closePicker(); });

/* ------------------------------------------------------------------ scenes, top bar, dialogs */
const sceneName = () => SCENES.find(s => s[0] === design.scene)[1];
function renderScenes() {
  $('scene-tabs').replaceChildren(...SCENES.map(([id, name]) => {
    const b = el('button', { type: 'button', textContent: name }); b.setAttribute('aria-selected', String(id === design.scene));
    b.addEventListener('click', () => {
      if (id === design.scene) return;
      closePicker();
      if (!design.scenes[id]) { const before = snapshot(); design.scenes[id] = sceneFromTemplate(id); design.scene = id; commit(before); toast(name + ' scene made from your gameplay style. Change anything you like.'); }
      else { design.scene = id; save(); }
      selId = null; playTransitionNext = true; renderScenes(); renderStage(); renderSelection(); renderRight(); renderLayers();
    });
    return b;
  }));
}
function modal(title, text, actions) {
  $('modal-title').textContent = title; $('modal-text').textContent = text;
  $('modal-actions').replaceChildren(...actions.map(([label, cls, f]) => { const b = el('button', { type: 'button', className: cls || '', textContent: label }); b.addEventListener('click', () => { $('modal').close(); if (f) f(); }); return b; }));
  $('modal').showModal();
}
function confirmReplace(title, text, yes) { modal(title, text, [['Cancel', 'ghost'], ['Replace', 'primary', yes]]); }
function sceneFromOverlay(srcId, sceneId) { return sceneId === 'main' ? designFromOverlay(srcId) : sceneFor(picksFor(srcId), sceneId); }
function useOverlay(s) {   // picking a whole overlay: just this scene, or every scene
  const only = () => change(() => { design.scenes[design.scene] = sceneFromOverlay(s.id, design.scene); selId = null; }, { rerender: true });
  const all = () => change(() => {
    SCENES.forEach(([id]) => { design.scenes[id] = sceneFromOverlay(s.id, id); });
    design.from = s.name; selId = null;
  }, { rerender: true });
  modal('Use ' + s.name + '?',
    'Change just your “' + sceneName() + '” scene to ' + s.name + ', or change the whole overlay so every scene (Gameplay, Starting soon, Be right back, Ending and Just Chatting) uses ' + s.name + '. You can press Undo afterwards.',
    [['Cancel', 'ghost'], ['Only “' + sceneName() + '”', '', () => { only(); toast(sceneName() + ' now uses ' + s.name + '.'); }],
     ['Whole overlay', 'primary', () => { playTransitionNext = true; all(); renderScenes(); toast('Every scene now uses ' + s.name + '.'); }]]);
}
$('undo').addEventListener('click', undo); $('redo').addEventListener('click', redo);
$('play').addEventListener('click', () => {
  playing = !playing; $('play').setAttribute('aria-pressed', String(playing)); $('play').textContent = playing ? '■ Stop preview' : '▶ Preview';
  post({ action: 'edit', on: !playing }); if (playing) { postDemo({ action: 'alert' }); toast('Preview: chat and alerts play like they will on stream.'); }
});
const BACKDROPS = [['grid', '▦ Grid'], ['game', '▣ Sample game'], ['dark', '■ Dark']];
$('backdrop').addEventListener('click', () => { const i = (BACKDROPS.findIndex(b => b[0] === backdrop) + 1) % BACKDROPS.length; backdrop = BACKDROPS[i][0]; $('canvas').dataset.backdrop = backdrop; $('backdrop').textContent = BACKDROPS[i][1]; });
$('new-design').addEventListener('click', () => {
  const opts = LIB.sources.slice(0, 1);
  modal('Start a new design?', 'Your current design (all scenes) is replaced. To start from a particular overlay, open Parts, pick an overlay and press “Use this whole overlay”.',
    [['Cancel', 'ghost'], ['Blank canvas', '', () => { const before = snapshot(); design = freshDesign(null); commit(before); afterHistory(); }], ['Start from ' + opts[0].name, 'primary', () => { const before = snapshot(); design = freshDesign(opts[0].id); commit(before); afterHistory(); }]]);
});
function freshDesign(srcId) {
  const main = srcId ? designFromOverlay(srcId) : { elements: [], game: { x: 240, y: 135, w: 1440, h: 810, r: 0, frame: true, frameSrc: null, lock: true } };
  return { v: 1, scene: 'main', from: srcId ? SRC[srcId].name : '', scenes: { main } };
}
// copy to StreamElements
$('copy').addEventListener('click', () => {
  closePicker();
  const b = build(scene(), false), F = JSON.stringify(b.fields, null, 2);
  const cam = els().find(e => e.kind === 'cam'), g = scene().game;
  $('code-sub').textContent = 'Scene: ' + sceneName() + ' · ' + els().length + ' parts';
  const notes = [];
  if (b.imgs.length) notes.push('Your ' + b.imgs.length + ' image' + (b.imgs.length > 1 ? 's are' : ' is') + ' not in this code (that keeps it small). After pasting, upload the same picture' + (b.imgs.length > 1 ? 's' : '') + ' in the widget’s Fields › Images.');
  if (bgImage) notes.push('Upload your background in Fields › Background & game window › Background image.');
  if (design.scene !== 'main') notes.push('This is your “' + sceneName() + '” scene: put it in its own StreamElements overlay and OBS scene.');
  $('code-notes').textContent = notes.join(' ');
  const code = [['HTML', 'HTML tab', b.html], ['CSS', 'CSS tab', b.css], ['JavaScript', 'JS tab', b.js], ['Fields', 'FIELDS tab', F]];
  $('code-panels').replaceChildren(...code.map(([label, tab, text]) => {
    const copy = el('button', { type: 'button', className: 'primary', textContent: 'Copy ' + label });
    const area = el('textarea', { readOnly: true, spellcheck: false, value: text }); area.setAttribute('aria-label', label + ' code');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(area.value); copy.textContent = 'Copied!'; $('copy-status').textContent = label + ' copied. Paste it into the ' + tab + '.'; setTimeout(() => { copy.textContent = 'Copy ' + label; }, 2000); }
      catch (e) { area.focus(); area.select(); $('copy-status').textContent = 'Press Ctrl+C (Cmd+C on Mac) to copy the selected ' + label + ' code.'; }
    });
    return el('section', { className: 'code-panel' }, el('div', { className: 'code-heading' }, el('h3', { textContent: label + ' · paste into the ' + tab }), copy), area);
  }));
  const helpRaw = `SETUP
1. In StreamElements create a 1920 x 1080 overlay${design.scene !== 'main' ? ' for your "' + sceneName() + '" scene' : ''}.
2. Add a Static/Custom > Custom Widget. Set it to 1920 x 1080 at X=0, Y=0.
3. Open its code editor and replace the HTML, CSS, JS and FIELDS tabs with the four boxes. Save.
4. Add the overlay URL to OBS as a Browser Source, 1920 x 1080, ABOVE your game and webcam.
${cam ? `5. Webcam: put your camera at X=${round(cam.x)} Y=${round(cam.y)} width=${round(cam.w)} height=${round(cam.h)} (1920 x 1080 canvas).\n` : ''}${g ? `6. Game capture: X=${round(g.x)} Y=${round(g.y)} width=${round(g.w)} height=${round(g.h)}.\n` : ''}7. Test with StreamElements "Emulate" (follow, sub, tip, cheer, raid) and a real chat message before going live.

The game window and webcam hole are see-through. Colours (per part), background image, chat and alert settings are all in the Fields panel.
${Object.values(design.scenes).some(sc => sc && sc.elements.some(e => e.src && SRC[e.src].forGame)) ? 'Some parts come from unofficial game-themed overlays: not made by or affiliated with any game developer or publisher.\n' : ''}`;
  $('res-slot').replaceChildren(OverlayRes.picker(r => { $('code-help').textContent = OverlayRes.text(helpRaw, r); }));
  $('copy-status').textContent = '';
  $('code-dialog').showModal();
});
$('close-code').addEventListener('click', () => $('code-dialog').close());

/* ------------------------------------------------------------------ start */
(async function start() {
  $('ed-right').append(el('p', { className: 'hint', textContent: 'Loading the parts library…' }));
  try {
    [LIB, DEMO] = await Promise.all([fetch('parts.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('preview-demo.js', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '')]);
  } catch (e) { $('ed-right').replaceChildren(el('p', { textContent: 'The editor could not load its parts. Check your connection and refresh.' })); return; }
  // only offer parts from overlays that are still in the site's folders (wherever their category folder is now)
  const onSite = window.OVERLAYS || [];
  LIB.sources = LIB.sources.filter(s => { const o = onSite.find(x => x.editor && x.name === s.name); if (o) { s.path = o.path; s.category = o.category; } return !!o; });
  if (!LIB.sources.length) { $('ed-right').replaceChildren(el('p', { textContent: 'No overlays that the editor can use were found in the site folders.' })); return; }
  CATS = ['All', ...new Set(LIB.sources.map(s => s.category))];
  LIB.sources.forEach(s => { SRC[s.id] = s; });
  const blob = await idb.get('background'); if (blob instanceof Blob) bgImage = await toDataURL(blob);
  for (const im of store.get('overlay-editor-images') || []) { const b = await idb.get('img:' + im.id); if (b instanceof Blob) imgCache[im.id] = await toDataURL(b); }
  const saved = store.get('overlay-editor');
  const valid = saved && saved.scenes && saved.scenes.main && Array.isArray(saved.scenes.main.elements) &&
    Object.values(saved.scenes).every(sc => !sc || sc.elements.every(e => KINDS[e.kind] && (e.kind === 'image' || SRC[e.src])));
  design = valid ? saved : freshDesign(LIB.sources[0].id);
  if (!design.scenes[design.scene]) design.scene = 'main';
  save();
  const from = new URLSearchParams(location.search).get('from');
  const fromSrc = from && LIB.sources.find(s => s.name === from || s.path.replace(/\/$/, '') === from);
  renderCats(); renderLibrary(); renderImages(); renderScenes(); renderStage(); renderSelection(); renderRight(); renderLayers(); updateUndo();
  history.replaceState(null, '', 'editor.html');
  if (fromSrc) {
    const load = () => { const before = snapshot(); design = freshDesign(fromSrc.id); commit(before); afterHistory(); openSrc = fromSrc.id; renderLibrary(); toast('Opened ' + fromSrc.name + '. Click any part to change it.'); };
    if (valid && saved.from !== fromSrc.name && saved.scenes.main.elements.length) modal('Open ' + fromSrc.name + ' in the editor?', 'This replaces the design you were working on. You can press Undo to get it back.', [['Keep my design', 'ghost'], ['Open ' + fromSrc.name, 'primary', load]]);
    else load();
  }
})();
