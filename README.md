# MyHomeGames Skins

Example UI skins for **[MyHomeGames Web](https://github.com/myhomegames/myhomegames-web)** and tooling to build **`.mhg-skin.zip`** archives. Installed skins are stored on the server under `METADATA_PATH/skins/`. Full documentation: **[SKINS.md](SKINS.md)**.

## Requirements

- **Node.js 18+**
- **`npm run zip`** zips every `skins/<id>/` that has **`skin.json`** + **`bundle.css`** (same layout for **Plex** and every other skin).
- To **regenerate** the example accent themes after you edit **`skins/plex/bundle.css`**, run **`npm run refresh-example-bundles`**.

## Quick start

The studio’s `predev` / `prebuild` hooks run `scripts/build-zips.mjs`, which uses **`adm-zip` from the repository root**. Install dependencies at the root **before** building or running `studio/` only.

```bash
# Install zip script dependency (adm-zip)
cd myhomegames-skins
npm install

# Build archives only → studio/public/zips/*.mhg-skin.zip
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

|Folder|Description|
|------|-----------|
| `skins/plex/` | **Reference Plex theme** — committed **`bundle.css`** + **`skin.json`**, same as other skins. Shipped as **`plex.mhg-skin.zip`**. |
| `skins/empty/` | Minimal **`bundle.css`** (no theme rules) — same idea as the old built-in “Empty” skin removed from the web app. |
| `skins/example-emerald/` | Full **`bundle.css`** (self-contained) with emerald accents on header and cover hover. |

Every skin ships only:

- **`skin.json`** — metadata shown in the web app after install.
- **`bundle.css`** — **complete** theme for that skin. Nothing is merged with the web default at zip time.

To add a skin, create `skins/<your-id>/` with those two files, then run **`npm run zip`** or **`npm run build`** from `studio/`.

### Faster local iteration (no new tooling)

If the server’s metadata directory is on your machine, you can **symlink** `METADATA_PATH/skins/<uuid>` to `myhomegames-skins/skins/<your-id>/` after a one-time install, then edit `bundle.css` in this repo and **reload the browser**. See **[SKINS.md — symlink a repo folder](SKINS.md#live-ish-iteration-symlink-a-repo-folder-into-the-server-skins-directory)** for step-by-step instructions (macOS, Linux, Windows).

## How the zip is built

`scripts/build-zips.mjs`:

1. For each `skins/<id>/` with **`skin.json`** and **`bundle.css`**, copies them into `<id>.mhg-skin.zip` (no CSS processing — the archive is a full replacement theme for the web app).
2. Writes **`skins-built.json`** next to the zips (manifest for the studio UI).

`scripts/refresh-example-bundles.mjs` (maintainers): rebuilds **`skins/example-emerald/bundle.css`** from **`skins/plex/bundle.css`** plus fixed accent snippets. Run when the Plex baseline changes.

Environment variables:

|Variable|Default|Meaning|
|--------|-------|-------|
|`OUT_ZIPS`|`studio/public/zips` under this repo|Output directory for zips + sibling `skins-built.json`|

## License

Apache-2.0 (same family as MyHomeGames web/server).
