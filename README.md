# MyHomeGames skins

Example UI skins for **[MyHomeGames Web](https://github.com/myhomegames/myhomegames-web)** and tooling to build **`.mhg-skin.zip`** archives. Installed skins are stored on the server under `METADATA_PATH/content/skins/`. Full documentation: **[SKINS.md](SKINS.md)**.

## Requirements

- **Node.js 18+**
- Clone this repo **next to** `myhomegames-web` so the default path resolves:

```
your-workspace/
  myhomegames-web/     # Plex CSS source (src/skins/plex/)
  myhomegames-skins/   # this repo
```

If your layout differs, set **`MYHOMEGAMES_WEB`** to the absolute path of the web repository when running the zip script.

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

`predev` runs the zip step first (concatenates Plex CSS from `myhomegames-web` + each skin’s `tweak.css`). Open the printed URL to download built archives from the UI.

## Included example skins

| Folder | Description |
|--------|-------------|
| `skins/example-emerald/` | Full Plex base + emerald / Spotify-style accents on the header and cover hover outline. |
| `skins/example-amber/` | Full Plex base + warm amber accents (closer to classic Plex gold). |

Each skin has:

- **`skin.json`** — `name` (and optional `description`, `version`) shown in the web app after install.
- **`tweak.css`** — CSS appended **after** the entire Plex bundle so overrides win in the cascade.

To add a skin, create `skins/<your-id>/` with those two files, then run `npm run zip` or `npm run build` from `studio/`.

## How the zip is built

`scripts/build-zips.mjs`:

1. Parses `myhomegames-web/src/skins/plex/bundle.ts` for `from "./…css?raw"` import order (same order as the app bundle).
2. Reads every file from `myhomegames-web/src/skins/plex/` and concatenates them into one string.
3. For each `skins/<id>/`, appends `tweak.css`, writes `bundle.css` + `skin.json` into a zip named `<id>.mhg-skin.zip`.
4. Writes **`skins-built.json`** next to the zips (manifest for the studio UI).

Environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `MYHOMEGAMES_WEB` | `../myhomegames-web` relative to **this** repo root | Path to the web checkout |
| `OUT_ZIPS` | `dist/zips` under this repo | Output directory for zips + sibling `skins-built.json` |

## License

Apache-2.0 (same family as MyHomeGames web/server).
