# Themes (skins)

This document lives in **myhomegames-skins** and describes how MyHomeGames **web**, **server**, and **skin archives** fit together. For building example zips from Plex + `tweak.css`, see also the root **[README.md](README.md)** in this repository.

The web app applies **one active skin at a time**: a single CSS string is injected into a `<style id="mhg-active-skin-bundle">` element in the document head.

- **Built-in** theme (**Plex**) ships inside the **myhomegames-web** bundle.
- **Installed** themes live on the **MyHomeGames server** under **`${METADATA_PATH}/content/skins/<uuid>/`**. They are uploaded as **ZIP archives** from **Settings → Appearance**, and the UI loads their CSS via the HTTP API.

The active skin id is stored in the browser under `localStorage` key `mhg_active_skin_id` (built-in id `builtin-plex`, or a **UUID** for server-installed skins). While the app runs, `document.documentElement.dataset.mhgSkin` is `plex` or `server`.

---

## Installing a skin (Settings)

1. Build a valid **`.zip`** (or **`.mhg-skin.zip`**) as described below (or use **`npm run zip`** / **`npm run build`** in this repo to produce archives from Plex + `tweak.css`).
2. Open **Settings → Appearance** in the web app.
3. Optionally set a **display name** (overrides `skin.json` name for the list).
4. Click **Choose archive** and upload the zip. The server extracts it into `content/skins/<new-uuid>/` and selects the new skin.

**Auth**: Upload and delete require the same API token as other write operations (`X-Auth-Token`: dev token or Twitch token). Listing and downloading CSS use the same rules as other metadata routes (`optionalToken`: if Twitch login is enabled in server settings, a token is required).

**Limits** (server, `routes/skins.js`):

- At most **24** UUID skin directories under `content/skins`.
- Zip upload size limit **30 MB**.

**Removal**: **Remove** next to a server skin calls `DELETE /skins/:id` and deletes that folder. The built-in Plex skin cannot be removed.

**Full replacement**: Active server skin CSS **replaces** the entire Plex bundle (same as before). Your archive should contain a complete theme (usually starting from the Plex `bundle.ts` output, or the merge produced by **`scripts/build-zips.mjs`** in this repo).

---

## Archive layout

The zip must contain **`skin.json`** in one of these places:

- At the **root** of the archive, or  
- Inside a **single** top-level folder (e.g. `MyTheme/skin.json` — no extra sibling files at archive root).

**`skin.json`** (minimum):

```json
{ "name": "My theme" }
```

**CSS** (next to `skin.json` in that folder):

- Prefer **`bundle.css`** (single concatenated file), or  
- Any **`.css`** files in that tree; if `bundle.css` is missing, all `.css` files are concatenated in **sorted relative path** order (deterministic, but order may not match Plex — prefer `bundle.css`).

After install, the server writes an updated `skin.json` including `id` (UUID) and `installedAt`.

---

## HTTP API (server)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/skins` | optional | `{ "skins": [ { "id", "name" } ] }` from disk |
| `GET` | `/skins/:id/bundle.css` | optional | Full CSS for that skin |
| `POST` | `/skins` | required | Multipart field **`archive`** (file); optional **`displayName`** |
| `DELETE` | `/skins/:id` | required | Remove `content/skins/:id` |

Skin ids are **UUIDs** (v4-style folder names).

---

## Example skins and build tooling (this repository)

**myhomegames-skins** includes:

- **`skins/example-emerald/`** and **`skins/example-amber/`** — each with `skin.json` + `tweak.css` (accents on top of the full Plex bundle).
- **`scripts/build-zips.mjs`** — reads **`myhomegames-web/src/skins/plex/bundle.ts`** import order, concatenates Plex CSS, appends `tweak.css`, writes **`.mhg-skin.zip`** files.
- **`studio/`** — small React + Vite app: run **`npm run dev`** or **`npm run build`** from `studio/` (after **`npm install`** at this repo root) to regenerate zips and download them from the studio UI.

Clone **myhomegames-skins** next to **myhomegames-web** so the default path to the Plex tree resolves (or set **`MYHOMEGAMES_WEB`**).

---

## Creating a skin

1. **Baseline**: concatenate the Plex skin from **`myhomegames-web`** `src/skins/plex/bundle.ts` (stable import order) into `bundle.css`, or copy the tree from `src/skins/plex/`. Alternatively use **this repo** to merge Plex + `tweak.css` automatically at zip time (`npm run zip`).
2. Add **`skin.json`** with a display `name`.
3. Zip the folder contents (root contains `skin.json` + `bundle.css`, or one wrapper folder with those files).
4. Install via Settings, or copy the extracted folder manually into `METADATA_PATH/content/skins/<uuid>/` and ensure `skin.json` + CSS are present (uuid must match the folder name if you want the id to stay stable; the UI lists whatever valid UUID folders exist).

### New built-in skin in the web repository

If the theme should ship inside the web app (no server zip), add another bundled skin in **myhomegames-web**: new folder under `src/skins/`, `bundle.ts`, extend `skinIds.ts`, `skinRuntime.ts`, `SkinContext.tsx`, and `main.tsx`.

---

## Reference files

| Topic | Location |
|-------|-----------|
| Server routes + extract | `myhomegames-server/routes/skins.js` |
| Metadata dir creation | `myhomegames-server/server.js` (`ensureMetadataDirectories`) |
| Client API | `myhomegames-web/src/skins/skinApi.ts` |
| Provider | `myhomegames-web/src/contexts/SkinContext.tsx` |
| Apply CSS + `data-mhg-skin` | `myhomegames-web/src/skins/skinRuntime.ts` |
| Active id in browser | `myhomegames-web/src/skins/skinStorage.ts` |
| Built-in / server id helpers | `myhomegames-web/src/skins/skinIds.ts` |
| Settings UI | `myhomegames-web/src/components/settings/SettingsSkinSection.tsx` |
| Zip build + examples | **This repo**: `scripts/build-zips.mjs`, `skins/*/` |

---

## Troubleshooting

- **Blank UI after selecting a server skin** — `bundle.css` (or merged CSS) is incomplete; switch back to **Plex** in Settings.
- **401 / empty list** — log in (or disable Twitch requirement in server settings) so `GET /skins` succeeds.
- **Upload errors** — ensure `skin.json` exists, paths inside the zip do not use `..`, and you are under the max skin count.
