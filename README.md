# MyHomeGames Skins

Example UI skins for **[MyHomeGames Web](https://github.com/myhomegames/myhomegames-web)** and tooling to build **`.mhg-skin.zip`** archives. Installed skins are stored on the server under `METADATA_PATH/content/skins/`. Full documentation: **[SKINS.md](SKINS.md)**.

## Requirements

- **Node.js 18+**
- **`npm run zip`** only needs this repository (each skin already has a committed **`bundle.css`**).
- To **regenerate** the two Plex-based demo `bundle.css` files after **myhomegames-web** changes, clone **myhomegames-web** next to this repo (or set **`MYHOMEGAMES_WEB`**) and run **`npm run refresh-example-bundles`**.

## Quick start

The studio’s `predev` / `prebuild` hooks run `scripts/build-zips.mjs`, which uses **`adm-zip` from the repository root**. Install dependencies at the root **before** building or running `studio/` only.

```bash
# Install zip script dependency (adm-zip)
cd myhomegames-skins
npm install

# Build archives only → dist/zips/*.mhg-skin.zip
npm run zip

# Studio (React): generates public/zips + skins-built.json, then Vite build → studio/dist/
npm install --prefix studio
npm run build --prefix studio
```

### Studio dev server

```bash
cd studio
npm install
npm run dev
```

`predev` runs the zip step first (packages each skin’s committed **`bundle.css`** + `skin.json`). Open the printed URL to download built archives from the UI.

## Included example skins

| Folder | Description |
|--------|-------------|
| `skins/empty/` | Minimal **`bundle.css`** (no theme rules) — same idea as the old built-in “Empty” skin removed from the web app. |
| `skins/example-emerald/` | Full **`bundle.css`** (self-contained) with emerald accents on header and cover hover. |
| `skins/example-amber/` | Full **`bundle.css`** with warm amber accents. |

Every skin ships only:

- **`skin.json`** — metadata shown in the web app after install.
- **`bundle.css`** — **complete** theme for that skin. Nothing is merged with the web default at zip time.

To add a skin, create `skins/<your-id>/` with those two files, then run **`npm run zip`** or **`npm run build`** from `studio/`.

## How the zip is built

`scripts/build-zips.mjs`:

1. For each `skins/<id>/` with **`skin.json`** and **`bundle.css`**, copies them into `<id>.mhg-skin.zip` (no CSS processing — the archive is a full replacement theme for the web app).
2. Writes **`skins-built.json`** next to the zips (manifest for the studio UI).

`scripts/refresh-example-bundles.mjs` (maintainers): rebuilds **`skins/example-emerald/bundle.css`** and **`skins/example-amber/bundle.css`** from the current **myhomegames-web** Plex tree plus fixed accent snippets. Run when the Plex baseline changes.

Environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `OUT_ZIPS` | `dist/zips` under this repo | Output directory for zips + sibling `skins-built.json` |
| `MYHOMEGAMES_WEB` | `../myhomegames-web` | Only for **`npm run refresh-example-bundles`** |

## License

Apache-2.0 (same family as MyHomeGames web/server).
