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
