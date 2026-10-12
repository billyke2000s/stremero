// Reads the folders in site/ and writes site/catalog.js (the list of overlays the website shows).
//
//   site/<Category>/<Overlay>/      every folder directly inside site/ is a category,
//                                   every folder inside a category is one overlay.
//
// Cloudflare Pages runs this on every deploy (build command: node scripts/build-catalog.mjs,
// build output directory: site). You can also run it yourself: node scripts/build-catalog.mjs
// No packages needed. Folders starting with "." or "_" are ignored.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const FIRST = ['Originals', 'Basic', 'Fancy', 'Ornate'];   // these categories come first, any others follow A-Z
const skip = n => n.startsWith('.') || n.startsWith('_');
const dirs = p => fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory() && !skip(d.name)).map(d => d.name);
const files = p => fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);
const pick = (list, want, ext) => (list.includes(want) ? want : list.find(f => f.toLowerCase().endsWith(ext)) || null);
const warn = [];

const categories = dirs(root).sort((a, b) => {
  const ia = FIRST.indexOf(a), ib = FIRST.indexOf(b);
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  return a.localeCompare(b);
});
// extra scenes (Starting soon, Be right back, Ending, Just Chatting) live in <overlay>/scenes/<id>/ with a scene.json
const SCENE_ORDER = ['starting', 'brb', 'ending', 'chatting'];
function scenesOf(dir) {
  const root = path.join(dir, 'scenes');
  if (!fs.existsSync(root)) return [];
  return dirs(root).map(id => {
    const d = path.join(root, id), fl = files(d);
    if (!fl.includes('overlay.html') || !fl.includes('styles.css') || !fl.includes('overlay.js')) { warn.push(`skipped scene ${d}: needs overlay.html, styles.css and overlay.js`); return null; }
    let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(d, 'scene.json'), 'utf8')); } catch (e) { /* label falls back to the folder name */ }
    return { id, label: meta.label || id, cam: meta.cam || null, fields: fl.includes('fields.json') ? 'fields.json' : '', help: fl.includes('START-HERE.txt') ? 'START-HERE.txt' : '' };
  }).filter(Boolean).sort((a, b) => (SCENE_ORDER.indexOf(a.id) + 1 || 99) - (SCENE_ORDER.indexOf(b.id) + 1 || 99));
}
const list = [];
for (const category of categories) {
  for (const name of dirs(path.join(root, category)).sort((a, b) => a.localeCompare(b))) {
    const dir = path.join(root, category, name), fl = files(dir);
    let meta = {};
    if (fl.includes('overlay.json')) {
      try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'overlay.json'), 'utf8')); } catch (e) { warn.push(`${category}/${name}/overlay.json is not valid JSON: ${e.message}`); }
    }
    const html = meta.html || pick(fl, 'overlay.html', '.html'), css = meta.css || pick(fl, 'styles.css', '.css'), js = meta.js || pick(fl, 'overlay.js', '.js');
    if (!html || !css || !js) { warn.push(`skipped ${category}/${name}: needs an .html, a .css and a .js file`); continue; }
    let game = meta.game || null;
    if (!game && fl.includes('fields.json')) {   // fall back to the game window saved in the StreamElements fields
      try { const f = JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')); if (f.gameX) game = ['gameX', 'gameY', 'gameW', 'gameH'].map(k => Number(f[k] && f[k].value) || 0); } catch (e) { /* ignore */ }
    }
    list.push({
      name, category, path: category + '/' + name + '/', html, css, js,
      fields: fl.includes('fields.json') ? 'fields.json' : '', help: fl.includes('START-HERE.txt') ? 'START-HERE.txt' : '',
      icon: fl.includes('icon.png') ? 'icon.png' : '', cam: meta.cam || null, game: game || [0, 0, 1920, 1080],
      parts: meta.parts || {}, tags: meta.tags || '', layout: meta.layout || '', editor: !!meta.editor,
      scenes: scenesOf(dir),
    });
  }
}
fs.writeFileSync(path.join(root, 'catalog.js'), '// Made by scripts/build-catalog.mjs from the folders in site/. Do not edit by hand.\nwindow.OVERLAYS=' + JSON.stringify(list) + ';\n');
console.log(`catalog.js: ${list.length} overlays in ${categories.length} categories (${categories.join(', ')})`);
warn.forEach(w => console.warn('warning: ' + w));
