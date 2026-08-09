# Themes (skins)

This document lives in **myhomegames-skins** and describes how MyHomeGames **web**, **server**, and **skin archives** fit together. For zip build tooling, see **[README.md](README.md)**.

The web app applies **one active skin at a time**: a single CSS string is injected into a `<style id="mhg-active-skin-bundle">` element in the document head.

- Theme source files live in **myhomegames-skins** under `skins/<id>/`, and they are packaged as `.mhg-skin.zip` like any other skin; **myhomegames-web** does **not** bundle or auto-install themes — users install a zip from **Settings → Appearance**.
- **Installed** themes live on the **MyHomeGames server** under **`${METADATA_PATH}/skins/<uuid>/`**. They are uploaded as **ZIP archives** from **Settings → Appearance**, and the UI loads their CSS via the HTTP API.

The active skin id is stored in the browser under `localStorage` key `mhg_active_skin_id` (a **UUID** for the selected server skin, or empty when none is selected). While the app runs, `document.documentElement.dataset.mhgSkin` is **`server`** or **`none`**.

---

## Downloading official skins (studio site)

Published **`.mhg-skin.zip`** files live on **[GitHub Releases](https://github.com/myhomegames/myhomegames-skins/releases)** (`npm run release` — see **[DEVELOPMENT.md](DEVELOPMENT.md)**). The **studio** site (GitHub Pages build under `docs/`) lists skins from the latest release and links to each archive’s **`downloadUrl`**.

## Installing a skin (Settings)

1. Download a **`.mhg-skin.zip`** from the studio site (or [GitHub Releases](https://github.com/myhomegames/myhomegames-skins/releases)).
2. Open **Settings → Appearance** in the web app.
3. Click **Choose archive** and upload the zip. The server extracts it into **`${METADATA_PATH}/skins/<new-uuid>/`** and selects the new skin.

**Auth**: API routes are open by default. Skin upload/delete use the same `optionalToken` middleware as other write operations (no login required).

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
    "libraryPagesVerticalList": true,
    "headerTitleFilter": true,
    "disableAlphabetNavigator": true,
    "sidebarSearchPopup": true,
    "ownedGamesFirstInGamesSidebar": true
  }
}
```

`web` is optional. All flags default to `false` if missing. Unknown keys are ignored.

- `persistentLibraryShell`: keeps header + libraries bar mounted while main content changes via nested routes.
- `collectionsShortcutList`: shows collection shortcut buttons in the libraries bar.
- `libraryPagesVerticalList`: forces libraries pages list in vertical mode (no narrow combobox fallback).
- `headerTitleFilter`: replaces the header global search with a **title filter** that narrows the current page’s lists as the user types: games (library, tag games, collection/developer/publisher detail, recommended), collection-like grids (collections, developers, publishers, sub/parent sections on detail), and tag index pages (categories, platforms, etc.). When `false`, the normal search box is shown.
- `disableAlphabetNavigator`: when `true`, hides the A–Z sidebar navigator on library, tag games, collection-like lists, and tag index pages that normally show it.
- `sidebarSearchPopup`: when `true`, adds a **Search** row in the main libraries sidebar (vertical list) that opens a modal with the global **SearchBar** (games, collections, developers, publishers). Use with skins that set `headerTitleFilter` so global search still has an entry point. If the key is **omitted** but `headerTitleFilter` is `true`, the web app treats `sidebarSearchPopup` as `true` unless you set `"sidebarSearchPopup": false` explicitly.
- `ownedGamesFirstInGamesSidebar`: when `true`, removes the main games library (`library`) from the **top** sidebar list and renders it as the **first row** under the collections-shortcuts block (the block whose heading skins often restyle as “Games”), with the label **Owned games**. Use with `collectionsShortcutList` for GOG-style sidebars.
- `detailBackdropLayout`: when `true`, the web app marks the game/catalog detail backdrop with `data-mhg-background-layout="detail"` (and a phone scroll-fade CSS variable). Skin CSS decides the visual layout; without matching rules the portal stays full-bleed.
- `staticInlineTagListOnTvPhone`: when `true`, on Smart TV and narrow/phone viewports `InlineTagList` items are not navigable and the “and more” truncation is off (all tags shown).
- `tvSummaryOverlay`: when `true`, on Smart TV activating the game/catalog detail Summary opens a full-screen overlay (full-height cover + full description + GameInfoBlock) instead of expanding the text in place.
- `tvStarRatingOverlay`: when `true`, on Smart TV the detail star rating is a single focus target; OK opens a full-screen overlay (title + interactive stars + Done) instead of editing stars in place.
- `tvDetailSummaryBeforeActions`: when `true`, on Smart TV game/catalog/collection-like detail the Summary is rendered above the Play/actions row (TV focus ladder follows that order).
- `tvRecommendedBrowsePreview`: when `true`, on Smart TV Recommended (horizontal strips) a top panel shows the focused game’s detail through Summary; the first cover is auto-selected and the panel updates as the remote moves between covers.
- `tvHideAppHeader`: when `true`, on Smart TV the app header (logo / search / settings) is not rendered; skin CSS should collapse the usual 64px top offsets (`html[data-mhg-tv-hide-app-header="1"]`) so content shifts up.
- `phoneDetailBackBesideBackground`: when `true`, on phone game/catalog detail a **Back** control is shown beside the hide/show background toggle in the libraries bar actions.
- `disableTitleTooltips`: when `true`, hover tooltips are not shown.

**CSS** (next to `skin.json` in that folder):

- Prefer a small **`bundle.css`** (shell / tokens / layout / global TV focus) plus optional companions:
  - **`components/`** — numbered widget styles (`001-….css`, …) loaded after `bundle.css`
  - **`pages/`** — page-level blocks (`001-AddGamePage.css`, …) loaded after components
- Legacy: a single monolithic **`bundle.css`**, or any set of **`.css`** files.
- On `GET /skins/:id/bundle.css` the server **concatenates** all `.css` files in load order:
  `bundle.css` → `components/**` → `pages/**` → other `.css` (sorted within each group).
  The response is still a full theme replacement — order matters.

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
- **`scripts/prepare-release.mjs`** — builds zips and **`skins-built.json`** under `dist/release/` for **`npm run release`**.
- **`studio/`** — React + Vite catalog UI: lists the latest GitHub release (`npm run dev` / `npm run build` in `studio/`).

---

## Creating a skin

1. Author theme CSS as **`bundle.css`** plus optional **`components/`** and **`pages/`** (complete UI replacement when concatenated).
2. Add **`skin.json`** with a display `name`.
3. Zip the folder (root or single top-level folder), or publish via **`npm run release`** in **myhomegames-skins**.
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

## CSS file codes registry

Component and page CSS files use **stable numeric codes** as filename prefixes. The same code always identifies the same component/page across all skins — this makes it easy to find and compare the same style across different themes.

**Components** (`components/` — codes start at `001`):

| Code | Name |
|------|------|
| 001 | `collections__EditCollectionLikeModal` |
| 002 | `common__AddGame` |
| 003 | `common__BackgroundManager` |
| 004 | `common__DropdownMenu` |
| 005 | `common__InlineTagList` |
| 006 | `common__LaunchModal` |
| 007 | `common__ScrollableGamesSection` |
| 008 | `common__ScrollableGamesSectionNav` |
| 009 | `common__StarRating` |
| 010 | `common__Summary` |
| 011 | `common__TagEditor` |
| 012 | `common__Tooltip` |
| 013 | `common__virtualized-common` |
| 014 | `companies__CompanyProfileBlock` |
| 015 | `filters__FilterPopup` |
| 016 | `games__AddToCollectionDropdown` |
| 017 | `games__AddToCollectionModal` |
| 018 | `games__AdditionalExecutablesDropdown` |
| 019 | `games__AgeRatings` |
| 020 | `games__Cover` |
| 021 | `games__EditGameModal` |
| 022 | `games__GameDetail` |
| 023 | `games__GameInfoBlock` |
| 024 | `games__GameSearchModal` |
| 025 | `games__GamesList` |
| 026 | `games__GamesListDetail` |
| 027 | `games__GamesListPageContent` |
| 028 | `games__GamesListTable` |
| 029 | `games__GamesListToolbar` |
| 030 | `games__ManageInstallationModal` |
| 031 | `games__MediaGallery` |
| 032 | `games__SimilarGamesList` |
| 033 | `games__TableRow` |
| 034 | `games__VirtualizedGamesList` |
| 035 | `games__VirtualizedGamesListDetail` |
| 036 | `games__VirtualizedGamesListTable` |
| 037 | `games__WebsitesList` |
| 038 | `games__edit__EditGameMediaTab` |
| 039 | `games__edit__FranchiseSeriesEditor` |
| 040 | `layout__LibrariesBar` |
| 041 | `layout__ProfileDropdown` |
| 042 | `layout__UpdateNotification` |
| 043 | `lists__CollectionsList` |
| 044 | `lists__TagList` |
| 045 | `lists__VirtualizedCollectionsList` |
| 060 | `lists__VirtualizedTagList` |
| 061 | `games__VirtualizedHorizontalGamesStrip` |
| 046 | `search__SearchBar` |
| 047 | `search__SearchResultsList` |
| 048 | `tags__EditTagModal` |
| 049 | `toolbar__SortPopup` |
| 050 | `ui__AlphabetNavigator` |
| 051 | `ui__BackgroundToggle` |
| 052 | `ui__CoverSizeSlider` |
| 053 | `ui__MainGamesToggle` |
| 054 | `ui__NewGamesToggle` |
| 055 | `ui__ViewModeSelector` |
| 056 | `games__GameStarRatingOverlay` |
| 057 | `games__RecommendedBrowsePreview` |
| 058 | `ui__DetailBackButton` |
| 059 | `ui__SmartTvClock` |

**Pages** (`pages/` — codes start at `001`, independent from components):

| Code | Name |
|------|------|
| 001 | `AddGamePage` |
| 002 | `CatalogGameDetailPage` |
| 003 | `HomePage` |
| 004 | `LibraryItemDetail` |
| 005 | `LoginPage` |
| 006 | `ProfilePage` |
| 007 | `SearchResultsPage` |
| 008 | `SettingsPage` |

A skin only needs to include files for the components/pages it actually styles. New components/pages should be assigned the next available code in that folder and added to this table.

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
| Zip build / release | **This repo**: `scripts/prepare-release.mjs`, `skins/*/` |

---

## Troubleshooting

- **Upgrading from older servers** — skins used to live under **`${METADATA_PATH}/content/skins/`**. They are now under **`${METADATA_PATH}/skins/`**. Move each UUID folder up one level (or merge) and remove the old `content/skins` directory when done.

- **Blank UI after selecting a server skin** — `bundle.css` is incomplete; in Settings choose **None** (or another skin), or install a full theme zip.
- **401 / empty list** — log in (or disable Twitch requirement in server settings) so `GET /skins` succeeds.
- **Upload errors** — ensure `skin.json` exists, paths inside the zip do not use `..`, and you are under the max skin count.
