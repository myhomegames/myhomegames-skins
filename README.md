# MyHomeGames Skins

Example UI skins for **[MyHomeGames Web](https://github.com/myhomegames/myhomegames-web)** and tooling to build **`.mhg-skin.zip`** archives. Installed skins are stored on the server under `METADATA_PATH/skins/`. Full documentation: **[SKINS.md](SKINS.md)**.

## Requirements

- **Node.js 18+**

## Quick start

```bash
cd myhomegames-skins
npm install

# GitHub release (official distribution for the web app)
# Bump version in package.json first, then:
npm run release

# Studio site (GitHub Pages build)
npm install --prefix studio
npm run build --prefix studio
```

### Studio dev server

```bash
cd studio
npm install
npm run dev
```

The dev server lists skins from the **latest GitHub release** (same as the published studio site).

## Skin folder contract

Every skin folder under `skins/<id>/` ships only:

- **`skin.json`** — metadata shown in the web app after install.
- **`bundle.css`** — **complete** theme for that skin. Nothing is merged with the web default at zip time.

To add a skin, create `skins/<your-id>/` with those two files, then publish with **`npm run release`**.

### Faster local iteration (no new tooling)

If the server’s metadata directory is on your machine, you can **symlink** `METADATA_PATH/skins/<uuid>` to `myhomegames-skins/skins/<your-id>/` after a one-time install, then edit `bundle.css` in this repo and **reload the browser**. See **[SKINS.md — symlink a repo folder](SKINS.md#live-ish-iteration-symlink-a-repo-folder-into-the-server-skins-directory)** for step-by-step instructions (macOS, Linux, Windows).

## GitHub releases

Official **`.mhg-skin.zip`** packages are published with **`npm run release`** (see **[DEVELOPMENT.md](DEVELOPMENT.md)**). The **studio** site (build in `studio/` → `docs/`) lists skins from the latest GitHub release and links to each **`downloadUrl`** — not from bundled zips in Pages.

## License

Apache-2.0 (same family as MyHomeGames web/server).
