# Stremero: StreamElements overlays

The website is everything inside `site/`. Viewers pick an overlay, customise it, and copy it into StreamElements.

## Folders = categories

```
site/
  index.html, editor.html, app.js …   the website itself (files only, no folders)
  Originals/                          every folder here is a CATEGORY
    Bodycam/                          every folder inside a category is ONE OVERLAY
  Basic/
  Fancy/
  Ornate/
```

- **New category:** make a new folder inside `site/`.
- **New overlay:** make a folder inside a category with at least one `.html`, one `.css` and one `.js` file.
  - Optional files: `fields.json` (StreamElements Fields), `icon.png` (800 × 450 preview picture), `START-HERE.txt` (setup help) and `overlay.json` (webcam / game window positions and search tags).
- **Move or rename:** move or rename the folders. The folder name is what the site shows.
- **Hide something without deleting it:** start its folder name with `_` (for example `_drafts`).

`site/catalog.js` is the list the website reads. **Don't edit it by hand.** Cloudflare remakes it from the folders every time you push. To remake it yourself, run `node scripts/build-catalog.mjs`.

## Cloudflare Pages settings (Git integration)

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `node scripts/build-catalog.mjs` |
| Build output directory | `site` |

## The editor

`site/editor.html` can mix parts from the overlays made by the overlay generator. Those overlays have `"editor": true` in their `overlay.json`. Overlays you add by hand still appear in the gallery, but not in the editor's parts list.

## Scenes (Starting soon, Be right back, Ending, Just Chatting)

Every overlay has extra scenes in `<overlay>/scenes/<scene>/`. The site shows them as tabs above the preview.

- Overlays the editor knows: run `python3 scripts/build-scenes.py` (needs Python Playwright + Chromium). It uses the editor's own engine, so the site and the editor always match. Run it after changing an overlay or the editor's scene templates.
- The two Originals (hand-made): `python3 scripts/build-original-scenes.py`.
- Then run `node scripts/build-catalog.mjs` (Cloudflare also runs this on every push).

## Game-style overlays

The `Games` category is built from `scripts/game_themes.py` by `python3 scripts/build-game-overlays.py`. They are unofficial and style-only: no logos, characters or game art.

## Halloween collection

The Halloween link beside Browse opens `index.html?collection=halloween`. Its original themes are defined in `scripts/seasonal_themes.py` and built into `site/Halloween/`. Build individual themes with `python3 scripts/build-game-overlays.py "Pumpkin Hour" "Midnight Coven" "Widow Silk"`, then run `python3 scripts/add-transitions.py`, `node scripts/build-scenes-headless.mjs "Pumpkin Hour" "Midnight Coven" "Widow Silk"` and `node scripts/build-catalog.mjs`. The headless scene builder runs the editor’s same pure export engine in Node, so it needs no browser installation.

## Scene transitions

The top-menu **Transitions** gallery is at `site/transitions.html`. Its categories are **Movies** and **And the rest**. Click a card to open `site/preview.html`; **Play wipe** previews it with audio, and **Copy link to OBS** copies the clean autoplay URL. The first entry is Bat spin (2.1 seconds), using the supplied original audio embedded in its HTML.

The clean transition files live in `site/_transitions/`, which is excluded from the overlay catalog generator. In OBS, use the copied URL as a Browser Source, enable **Refresh browser when scene becomes active**, and enable **Control audio via OBS**. The normal website preview waits for Play; the clean OBS endpoint autoplays on loading. Audible autoplay in ordinary browsers remains subject to their autoplay policy.

Run `python scripts/check-transitions.py` to check the gallery, category filters, audio preview, copied link, final transparency, and mobile layout. This is also checked in GitHub Actions.

Every overlay and scene plays a short transition in its own style when it appears (curtains, light iris, pixel blocks, glitch strips, ink splats, shutter doors or diagonal bands). It is plain CSS inside the overlay, so it costs nothing: in OBS tick **Refresh browser when scene becomes active** on the Browser Source and use a ~300 ms Fade. Viewers can switch it off with **Show scene transition** in the Fields panel.

Styles and which overlay uses which are in `scripts/transitions.py`.

## Rebuilding everything (in this order)

```
python3 scripts/build-game-overlays.py      # Games category (if you changed scripts/game_themes.py)
python3 scripts/add-transitions.py          # adds the transition to every overlay + the editor library
python3 scripts/build-original-scenes.py    # scenes for the two Originals
python3 scripts/build-scenes.py             # scenes for everything the editor knows
node scripts/build-catalog.mjs
```

## Twitch kits and gallery pictures

- `python3 scripts/build-kits.py` and `python3 scripts/build-original-kits.py` make each overlay's Twitch panel headers and offline screen (`<overlay>/kit/`).
- `python3 scripts/build-scene-thumbs.py` makes the small scene pictures the gallery flicks through. Run it last, after any scene changes.
- `python3 scripts/check-site.py` checks everything. GitHub also runs it on every push: a red ✗ next to a commit means something broke.

