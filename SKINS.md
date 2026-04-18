# Themes (skins)

This document lives in **myhomegames-skins** and describes how MyHomeGames **web**, **server**, and **skin archives** fit together. For zip build tooling, see **[README.md](README.md)**.

The web app applies **one active skin at a time**: a single CSS string is injected into a `<style id="mhg-active-skin-bundle">` element in the document head.

- Theme source files live in **myhomegames-skins** under `skins/<id>/`, and they are packaged as `.mhg-skin.zip` like any other skin; **myhomegames-web** does **not** bundle or auto-install themes — users install a zip from **Settings → Appearance**.
- **Installed** themes live on the **MyHomeGames server** under **`${METADATA_PATH}/skins/<uuid>/`**. They are uploaded as **ZIP archives** from **Settings → Appearance**, and the UI loads their CSS via the HTTP API.

The active skin id is stored in the browser under `localStorage` key `mhg_active_skin_id` (a **UUID** for the selected server skin, or empty when none is selected). While the app runs, `document.documentElement.dataset.mhgSkin` is **`server`** or **`none`**.

---

## Installing a skin (Settings)

1. Build a valid **`.zip`** (or **`.mhg-skin.zip`**) with **`skin.json`** and a single, complete **`bundle.css`** (see **myhomegames-skins** `npm run zip`, or pack manually).
2. Open **Settings → Appearance** in the web app.
3. Optionally set a **display name** (overrides `skin.json` name for the list).
4. Click **Choose archive** and upload the zip. The server extracts it into **`${METADATA_PATH}/skins/<new-uuid>/`** and selects the new skin.

**Auth**: Upload and delete require the same API token as other write operations (`X-Auth-Token`: dev token or Twitch token). Listing and downloading CSS use the same rules as other metadata routes (`optionalToken`: if Twitch login is enabled in server settings, a token is required).

**Limits** (server, `routes/skins.js`):

- At most **24** UUID skin directories under **`${METADATA_PATH}/skins/`**.
- Zip upload size limit **30 MB**.

**Removal**: **Remove** next to a server skin calls `DELETE /skins/:id` and deletes that folder. If you remove every skin, the web app clears theme CSS until you install a new archive.

**Full replacement**: An installed skin’s **`bundle.css`** **replaces** the previous theme CSS while that skin is active. It must be a **complete** theme (not a partial override unless you inlined a full baseline yourself).

---

## Archive layout

The zip must contain **`skin.json`** in one of these places:

- At the **root** of the archive, or  
- Inside a **single** top-level folder (e.g. `MyTheme/skin.json` — no extra sibling files at archive root).

**`skin.json`** (minimum):

```json
{ "name": "My theme" }
```

**`skin.json`** (`web` flags, optional):

```json
{
  "name": "My theme",
  "web": {
    "persistentLibraryShell": true,
    "collectionsShortcutList": true,
    "libraryPagesVerticalList": true
  }
}
```

`web` is optional. All flags default to `false` if missing. Unknown keys are ignored.

- `persistentLibraryShell`: keeps header + libraries bar mounted while main content changes via nested routes.
- `collectionsShortcutList`: shows collection shortcut buttons in the libraries bar.
- `libraryPagesVerticalList`: forces libraries pages list in vertical mode (no narrow combobox fallback).

**CSS** (next to `skin.json` in that folder):

- Prefer **`bundle.css`** as one file containing the **entire** theme, or  
- Any **`.css`** files in that tree; if `bundle.css` is missing, the server concatenates all `.css` files in **sorted relative path** order (still a full replacement — order matters).

After install, the server writes an updated `skin.json` including `id` (UUID) and `installedAt`.

---

## HTTP API (server)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/skins` | optional | `{ "skins": [ { "id", "name" } ] }` from disk |
| `GET` | `/skins/:id/bundle.css` | optional | Full CSS for that skin |
| `POST` | `/skins` | required | Multipart field **`archive`** (file); optional **`displayName`** |
| `DELETE` | `/skins/:id` | required | Remove **`${METADATA_PATH}/skins/:id`** |

Skin ids are **UUIDs** (v4-style folder names).

---

## Build tooling (this repository)

**myhomegames-skins** includes:

- **`skins/<id>/`** — one folder per skin, each with committed **`bundle.css`** + **`skin.json`**.
- **`scripts/build-zips.mjs`** — zips **`skin.json`** + **`bundle.css`** per folder.
- **`studio/`** — React + Vite UI: **`npm run dev`** / **`npm run build`** from `studio/` (after **`npm install`** at this repo root) to rebuild zips and download them.

---

## Creating a skin

1. Author a **complete** **`bundle.css`** for your theme (replace the whole UI, not a partial override unless you inlined a full baseline yourself).
2. Add **`skin.json`** with a display `name`.
3. Zip the two files (root or single top-level folder), or use **`npm run zip`** in **myhomegames-skins** with `skins/<your-id>/`.
4. Install via Settings, or copy the extracted folder manually into `METADATA_PATH/skins/<uuid>/`.

### Live-ish iteration: symlink a repo folder into the server skins directory

You can point the server at a skin folder **inside this repository** so you edit `bundle.css` (and `skin.json`) on disk and only **reload the browser** to see changes—no zip rebuild or re-upload on every save.

**How it works:** the server reads `bundle.css` from disk on each `GET /skins/:id/bundle.css`. If the UUID directory under **`${METADATA_PATH}/skins/`** is a **symbolic link** to `myhomegames-skins/skins/<your-id>/`, those reads follow the link. The web app fetches that URL when you load or re-select the skin, so a **full page refresh** (or switching away from the skin and back) picks up edits.

**Steps (typical):**

1. **Install once** from Settings (upload a zip built from `skins/<your-id>/`, or any valid starter zip). Note the skin’s **UUID** (folder name under metadata, or the id shown in the API / list).
2. **Stop** the MyHomeGames server (recommended so nothing holds files open while you replace the folder).
3. **Remove** the real directory `METADATA_PATH/skins/<uuid>/` (back it up if it contains work you care about).
4. **Create a symlink** whose **name is still `<uuid>`** (the app identifies skins by folder name), pointing at your working copy in this repo:

   ```bash
   # macOS / Linux — use absolute paths
   ln -s /absolute/path/to/myhomegames-skins/skins/<your-id> \
     /absolute/path/to/METADATA_PATH/skins/<uuid>
   ```

   On **Windows** (Developer Mode or admin, NTFS): `mklink /D "...\skins\<uuid>" "...\myhomegames-skins\skins\<your-id>"` (path under **`METADATA_PATH`**).

5. **Start** the server again. In the web app, ensure that skin is **selected** (Settings → Appearance).
6. Edit **`skins/<your-id>/bundle.css`** in **myhomegames-skins**; save, then **reload the page** in the browser to refetch CSS.

**Notes:**

- This is **not** hot module replacement: one refresh (or skin toggle) per edit batch is enough.
- Do **not** re-upload a zip for the same UUID while the path is a symlink unless you know the server will replace the link with a real directory again.
- The folder name on disk **must** stay the UUID; your human-readable id stays only under `skins/<your-id>/` in this repo.

### Theme without server zips (rare)

If a theme must ship entirely inside **myhomegames-web** (no zip install), add a dedicated CSS injection path and wire it through `SkinContext` / `skinRuntime` / `main.tsx`. The normal path is: ship themes as zips from **myhomegames-skins** and install them on the server.

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
| Server skin id helper | `myhomegames-web/src/skins/skinIds.ts` |
| Settings UI | `myhomegames-web/src/components/settings/SettingsSkinSection.tsx` |
| Zip build | **This repo**: `scripts/build-zips.mjs`, `skins/*/` |

---

## Troubleshooting

- **Upgrading from older servers** — skins used to live under **`${METADATA_PATH}/content/skins/`**. They are now under **`${METADATA_PATH}/skins/`**. Move each UUID folder up one level (or merge) and remove the old `content/skins` directory when done.

- **Blank UI after selecting a server skin** — `bundle.css` is incomplete; in Settings choose **None** (or another skin), or install a full theme zip.
- **401 / empty list** — log in (or disable Twitch requirement in server settings) so `GET /skins` succeeds.
- **Upload errors** — ensure `skin.json` exists, paths inside the zip do not use `..`, and you are under the max skin count.
