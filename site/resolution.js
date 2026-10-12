/* "Your OBS resolution" picker for the copy windows (overlay page + editor): 1080p, 1440p or 4K.
   Overlays are designed at 1920 x 1080 and scale themselves to the browser source, so only the numbers people type into
   OBS change (browser source size, webcam and game positions). All three are 16:9, so nothing moves, it just scales. */
(function () {
  'use strict';
  const RES = [
    { id: '1080', label: '1920 × 1080 (1080p)', w: 1920, h: 1080 },
    { id: '1440', label: '2560 × 1440 (1440p)', w: 2560, h: 1440 },
    { id: '2160', label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
  ];
  const KEY = 'overlay-resolution';
  const get = () => { let id = '1080'; try { id = localStorage.getItem(KEY) || id; } catch (e) { /* private mode */ } return RES.find(r => r.id === id) || RES[0]; };
  const set = id => { try { localStorage.setItem(KEY, id); } catch (e) { /* private mode */ } };
  const rect = (r, res) => r.map(v => Math.round(v * res.h / 1080));   // 1080p -> 1440p is x4/3, -> 4K is x2
  // rewrite the "X=.. Y=.. width=.. height=.." lines and canvas sizes in an overlay's setup text
  function text(t, res) {
    if (!t || res.id === '1080') return t;
    return t.replace(/X=(\d+)(\s+)Y=(\d+)(\s+)width=(\d+)(\s+)height=(\d+)/g, (m, x, a, y, b, w, c, h) => {
      const n = rect([+x, +y, +w, +h], res);
      return `X=${n[0]}${a}Y=${n[1]}${b}width=${n[2]}${c}height=${n[3]}`;
    }).replace(/(Browser Source,\s*)1920 x 1080/gi, `$1${res.w} x ${res.h}`)
      .replace(/1920 x 1080 canvas/g, `${res.w} x ${res.h} canvas`)
      .replace(/on a 1920 × 1080 canvas/g, `on a ${res.w} × ${res.h} canvas`);
  }
  // the picker itself; onChange(res) runs now and whenever it changes
  function picker(onChange) {
    const wrap = document.createElement('div'); wrap.className = 'res-picker';
    const label = document.createElement('label'); label.textContent = 'Your OBS resolution';
    const sel = document.createElement('select'); sel.id = 'res-select'; label.htmlFor = sel.id;
    RES.forEach(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.label; sel.append(o); });
    const note = document.createElement('p'); note.className = 'res-note';
    const show = () => {
      const r = get(); sel.value = r.id;
      note.textContent = r.id === '1080'
        ? 'In OBS, set this overlay’s Browser Source to 1920 × 1080.'
        : `In OBS, set this overlay’s Browser Source to ${r.w} × ${r.h}. The webcam and game numbers in the setup steps are worked out for ${r.w} × ${r.h}. ` +
          'If the overlay looks small or sits in the top-left corner, set the Browser Source back to 1920 × 1080 and use right-click › Transform › Fit to screen.';
      onChange(r);
    };
    sel.addEventListener('change', () => { set(sel.value); show(); });
    wrap.append(label, sel, note); show();
    return wrap;
  }
  window.OverlayRes = { RES, get, set, rect, text, picker };
})();
