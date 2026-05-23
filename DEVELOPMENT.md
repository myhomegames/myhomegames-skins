# Development — myhomegames-skins

## Creating releases

The project uses **`release-it`** (same workflow as **myhomegames-server**) to publish skin packages on **GitHub Releases**. The web app loads the catalog from the latest release; it does not host skin zips.

### Prerequisites

- Node.js 18+
- `npm install` at the repository root
- GitHub Personal Access Token with `repo` scope:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### Steps

1. Bump **`version`** in `package.json` (release-it uses `--no-increment`, so the version is not bumped automatically).
2. Commit and push your changes.
3. Run:

```bash
npm run release
```

This will:

1. Run **`npm run prep:release`** — builds `dist/release/zips/*.mhg-skin.zip`, snapshots, and **`dist/release/skins-built.json`** with `downloadUrl` / `snapshotUrl` pointing at the GitHub release assets.
2. Create a Git tag named after the version (e.g. `1.1.0`).
3. Create a GitHub release and attach:
   - all `.mhg-skin.zip` files under `dist/release/zips/`
   - `dist/release/skins-built.json`
   - preview images under `dist/release/snapshots/`

### Test the build without publishing

```bash
npm run prep:release
ls -la dist/release/zips/
cat dist/release/skins-built.json
```

### Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `MHG_SKINS_GITHUB_REPO` | `myhomegames/myhomegames-skins` | `owner/repo` used in manifest URLs |
| `GITHUB_REPOSITORY` | — | Used in CI (`owner/repo`) when set |
| `OUT_ZIPS` | (set by prep:release) | Passed through to `build-zips.mjs` |

## Local zip build (no release)

```bash
npm run zip
```

Output defaults to `studio/public/zips/` for the studio dev UI only.
