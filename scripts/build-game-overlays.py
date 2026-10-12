"""Builds every theme in scripts/game_themes.py into site/Games/<Name>/ and adds/updates it in site/parts.json.
Each overlay is made from a Fancy overlay with the same layout (same shared code, same positions), with only the
theme parts swapped: colours, fonts, wording, decorations and the theme CSS. Run from the repo root:
    python3 scripts/build-game-overlays.py && node scripts/build-catalog.mjs"""
import json, re, copy, shutil, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from game_themes import THEMES

SITE, CATEGORY = 'site/', 'Games'
BASE_FOR_LAYOUT = {'classic': 'Fancy/Starship HUD', 'topbar': 'Fancy/Liquid Chrome', 'rail': 'Fancy/Mecha Armor', 'corner': 'Fancy/Aurora'}
P = json.load(open(SITE + 'parts.json', encoding='utf-8'))
SRC = {s['name']: s for s in P['sources']}
SCOPE = ':where(.__SRC__,.__SRC__ *)'

def unscope(css): return css.replace(SCOPE, '').replace('-__SRC__', '')

def scope(css):
    """plain CSS -> editor CSS: insert the scope after the first compound selector of every selector."""
    out = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sels, body = m.group(1).strip(), m.group(2)
        scoped = []
        for sel in sels.split(','):
            sel = sel.strip()
            mm = re.match(r'([#.]?[\w-]+(?:[.#][\w-]+)*)(.*)$', sel)
            scoped.append(mm.group(1) + SCOPE + mm.group(2))
        out.append(','.join(scoped) + '{' + body + '}')
    return '\n' + '\n'.join(out) + '\n'

def theme_css(t):
    return ''.join(t['css'][k] for k in ('cam', 'alert', 'chat', 'latest')) + '\n' + t['keyframes'] + '\n'

def root_block(t):
    lines = [f"  {k}: {v}; /* @color {label} */" for k, label, v in t['vars']]
    lines += [f"  --font-body: {t['fontBody']};", f"  --font-display: {t['fontDisplay']};"]
    return ':root{\n' + '\n'.join(lines) + '\n}'

def section_swap(html, open_re, end_marker, new_inner):
    m = re.search(open_re, html); j = html.index(end_marker, m.end())
    return html[:m.end()] + '\n    ' + new_inner + '\n    ' + html[j:]

built = []
for t in THEMES:
    base_dir = SITE + BASE_FOR_LAYOUT[t['layout']] + '/'
    base_name = BASE_FOR_LAYOUT[t['layout']].split('/')[1]
    base = SRC[base_name]
    out = SITE + CATEGORY + '/' + t['name'] + '/'
    if os.path.exists(out): shutil.rmtree(out)
    shutil.copytree(base_dir, out)
    rd = lambda f: open(base_dir + f, encoding='utf-8').read()
    css0, html0, js0 = rd('styles.css'), rd('overlay.html'), rd('overlay.js')

    # ---- styles.css: header + font + :root + the base's shared code (unchanged) + this theme's CSS
    starts = [css0.find(unscope(v).strip()[:120]) for v in base['css'].values() if v.strip()]
    theme_start = min(i for i in starts if i > 0)
    shared = css0[css0.index('}', css0.index(':root{')) + 1:theme_start]
    if base['root'].strip():                       # the base's own extra variables are not used by the theme
        shared = shared.replace('.ov{' + base['root'] + '}\n', '').replace('.ov{' + base['root'] + '}', '')
    css = (f"/* {t['name']} — paste ALL of this into the CSS tab of the same Custom Widget.\n"
           f"   Unofficial, fan-made style inspired by {t['forGame']}. Not affiliated with or endorsed by its makers.\n"
           f"   Colours can be changed on the overlay site or in the Fields panel. These are the defaults. */\n"
           f"@import url('{t['font']}');\n" + root_block(t) + shared.rstrip() + '\n' + theme_css(t))

    # ---- overlay.html: swap decorations, chat title, name
    html = html0.replace(base_name, t['name'])
    html = section_swap(html, r'<section id="cam" class="cam"[^>]*>', '<div class="cam-hole"', t['decor']['cam'])
    html = section_swap(html, r'<section id="alert" class="alert box"[^>]*>', '<div class="alert-icon"', t['decor']['alert'])
    html = section_swap(html, r'<section id="chat" class="chat"[^>]*>', '<div class="chat-title">', t['decor']['chat'])
    html = re.sub(r'(<div class="chat-title"><span>)[^<]*(</span>)', r'\g<1>' + t['chatTitle'] + r'\2', html)

    # ---- overlay.js: wording
    labels = dict(P['labels']); labels.update(t['labels'])
    js = re.sub(r'const LABELS = \{[^\n]*\};', 'const LABELS = ' + json.dumps(labels, ensure_ascii=False) + ';', js0)
    assert js != js0, 'labels not replaced'
    js = js.replace(base_name, t['name'])

    # ---- fields.json: this theme's colours replace the base's
    F = json.load(open(base_dir + 'fields.json', encoding='utf-8'))
    newF = {}
    for k, v in F.items():
        if k.startswith('c_'):
            if not any(x.startswith('c_') for x in newF):
                for var, label, val in t['vars']:
                    newF['c_' + var[2:].replace('-', '_')] = {'type': 'colorpicker', 'label': label, 'value': val, 'group': 'Colours'}
            continue
        newF[k] = v
    newF['widgetName']['value'] = t['name']

    # ---- preview.html: same template, new contents
    pv = rd('preview.html')
    for old, new in ((css0, css), (html0, html), (js0, js)):
        assert old.strip() in pv; pv = pv.replace(old.strip(), new.strip())
    pv = pv.replace(base_name, t['name'])

    help_ = rd('START-HERE.txt').replace(base_name.upper(), t['name'].upper()).replace(base_name, t['name'])
    help_ = help_.replace('(FANCY)', '(GAMES)').replace('\n', f"\n\nUnofficial, fan-made style inspired by {t['forGame']}. Not affiliated with or endorsed by its makers.\nNo game logos, characters or artwork are used.\n", 1)
    oj = json.load(open(base_dir + 'overlay.json')); oj['tags'] = t['tags']

    files = {'styles.css': css, 'overlay.html': html, 'overlay.js': js, 'preview.html': pv, 'START-HERE.txt': help_,
             'fields.json': json.dumps(newF, indent=2, ensure_ascii=False), 'overlay.json': json.dumps(oj, indent=2)}
    for f, txt in files.items(): open(out + f, 'w', encoding='utf-8').write(txt)
    if os.path.exists(out + 'icon.png'): os.remove(out + 'icon.png')    # base's picture is wrong; rendered later

    # ---- editor entry
    s = copy.deepcopy(base)
    s.update(id=t['id'], name=t['name'], category=CATEGORY, path=CATEGORY + '/' + t['name'] + '/', tags=t['tags'],
             forGame=t['forGame'], layout=t['layout'], font=t['font'], fontBody=t['fontBody'], fontDisplay=t['fontDisplay'],
             vars=[list(v) for v in t['vars']], root='', labels=dict(t['labels']), chatTitle=t['chatTitle'],
             plate='', head='', screen='', defs='', nativeSocials=False,
             decor={'cam': t['decor']['cam'], 'alert': t['decor']['alert'], 'chat': t['decor']['chat'], 'stat': '', 'socials': ''},
             css={'cam': scope(t['css']['cam']), 'chat': scope(t['css']['chat']), 'alert': scope(t['css']['alert']),
                  'latest': scope(t['css']['latest']), 'screen': '', 'game': ''},
             keyframes=t['keyframes'])
    P['sources'] = [x for x in P['sources'] if x['id'] != t['id']] + [s]
    built.append(t['name'])

json.dump(P, open(SITE + 'parts.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('built:', ', '.join(built))
