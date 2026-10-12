"""Adds (or refreshes) the scene transition in every overlay's gameplay files and in the editor library (parts.json).
Safe to run again: it replaces its own marked block. Run from the repo root, then rebuild the scenes:
    python3 scripts/add-transitions.py && python3 scripts/build-original-scenes.py && python3 scripts/build-scenes.py && node scripts/build-catalog.mjs"""
import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import transitions as T

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
H0, H1 = '<!-- scene-transition -->', '<!-- /scene-transition -->'
C0, C1 = '/* >>> scene transition */', '/* <<< scene transition */'

def strip(text, a, b):
    i = text.find(a)
    if i < 0: return text
    j = text.index(b, i) + len(b)
    return text[:i].rstrip(' ') + text[j:].lstrip('\n')

def sx_html(style, a, b, c):
    inner, _ = T.block(style)
    return (f'{H0}<div class="sx" aria-hidden="true" style="--sx-a:{a};--sx-b:{b};--sx-c:{c}"><div class="sx-in">{inner}</div></div>{H1}')

def add_field(F):
    F = collections.OrderedDict((k, v) for k, v in F.items() if k != 'showTransition')
    out = collections.OrderedDict(); done = False
    keys = list(F)
    last_show = max([i for i, k in enumerate(keys) if k.startswith('show')] or [-1])
    for i, k in enumerate(keys):
        out[k] = F[k]
        if i == last_show and not done: out['showTransition'] = dict(T.FIELD); done = True
    if not done: out['showTransition'] = dict(T.FIELD)
    return out

cats = [d for d in os.listdir(SITE) if os.path.isdir(os.path.join(SITE, d)) and not d.startswith(('.', '_'))]
n = 0
for cat in cats:
    for name in sorted(os.listdir(os.path.join(SITE, cat))):
        d = os.path.join(SITE, cat, name)
        if not os.path.isdir(d) or name.startswith(('.', '_')) or not os.path.exists(os.path.join(d, 'overlay.html')): continue
        meta = json.load(open(os.path.join(d, 'overlay.json'))) if os.path.exists(os.path.join(d, 'overlay.json')) else {}
        css_f = meta.get('css') or 'styles.css'
        rd = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
        html0, css0, js0 = rd('overlay.html'), rd(css_f), rd('overlay.js')
        style, a, b, c = T.for_overlay(name, cat)
        _, css_block = T.block(style)
        # html: inside the overlay's root element, last
        html = strip(html0, H0, H1).rstrip()
        close = '</main>' if html.endswith('</main>') else '</div>'
        i = html.rindex(close)
        html = html[:i] + '  ' + sx_html(style, a, b, c) + '\n' + html[i:] + '\n'
        css = strip(css0, C0, C1).rstrip() + '\n' + C0 + css_block + C1 + '\n'
        m = re.search(r'const LOOK = (\{.*?\});\n', js0)
        look = json.loads(m.group(1)); look['parts']['transition'] = {'sel': '.sx', 'on': True}
        js = js0[:m.start(1)] + json.dumps(look) + js0[m.end(1):]
        F = json.loads(rd('fields.json'), object_pairs_hook=collections.OrderedDict)
        fields = json.dumps(add_field(F), indent=2, ensure_ascii=False)
        if os.path.exists(os.path.join(d, 'preview.html')):
            pv = rd('preview.html')
            for old, new in ((css0, css), (html0, html), (js0, js)):
                if old.strip() in pv: pv = pv.replace(old.strip(), new.strip())
                else: print('  preview.html of', name, 'did not contain the current file; skipped that part')
            open(os.path.join(d, 'preview.html'), 'w', encoding='utf-8').write(pv)
        hp = os.path.join(d, 'START-HERE.txt')
        if os.path.exists(hp):
            h = rd('START-HERE.txt'); k = h.find('SCENE TRANSITION\n')
            if k >= 0: h = h[:k].rstrip() + '\n'
            open(hp, 'w', encoding='utf-8').write(h.rstrip() + '\n\n' + T.HELP_NOTE + '\n')
        for f, t in ((('overlay.html'), html), (css_f, css), ('overlay.js', js), ('fields.json', fields)):
            open(os.path.join(d, f), 'w', encoding='utf-8').write(t)
        n += 1

# editor library
pp = os.path.join(SITE, 'parts.json'); P = json.load(open(pp, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
P['transitionBase'] = T.BASE_CSS
P['transitions'] = {k: {'html': v[0], 'css': v[1]} for k, v in T.STYLES.items()}
for s in P['sources']: s['transition'] = list(T.for_overlay(s['name'], s['category']))
P['fields'] = add_field(P['fields'])
json.dump(P, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'transition added to {n} overlays and the editor library')
