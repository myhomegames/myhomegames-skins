# Development — myhomegames-skins

## Creating releases

The project uses **`release-it`** (same workflow as **myhomegames-server**) to publish skin packages on **GitHub Releases**. The web app loads the catalog from the latest release; it does not host skin zips.

### Prerequisites

- Node.js 18+
- `npm install` at the repository root
- **GitHub Personal Access Token** with `repo` scope (recommended for automated releases)

Without `GITHUB_TOKEN`, `release-it` falls back to opening the GitHub “new release” page in the browser with the entire changelog in the URL. For large histories that URL may exceed GitHub’s limit (**“Your request URL is too long”**), and skin zips are **not** uploaded automatically in that mode.

1. Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)** → scope **`repo`**.
2. Export it (or copy `.env.example` to `.env` and set the value there — `.env` is gitignored):

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

Never commit the token to the repository.

### Steps

1. Bump **`version`** in `package.json` (release-it uses `--no-increment`, so the version is not bumped automatically).
2. Commit and push your changes.
3. Run:

```bash
npm run release
```

`npm run release` uses `scripts/run-release.mjs`, which sets `NODE_DEBUG=release-it:config` to work around a release-it/Octokit bug (`log: null` → *Cannot read properties of null (reading 'debug')*). GitHub config uses `skipChecks: true` for the same compatibility reason.

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
| `GITHUB_TOKEN` | — | Recommended for `npm run release` (PAT with `repo` scope; API upload) |
| `MHG_SKINS_GITHUB_REPO` | `myhomegames/myhomegames-skins` | `owner/repo` used in manifest URLs |
| `GITHUB_REPOSITORY` | — | Used in CI (`owner/repo`) when set |
| `OUT_ZIPS` | (set by prep:release) | Passed through to `build-zips.mjs` |

## Local zip build (no release)

```bash
npm run zip
```

Output defaults to `studio/public/zips/` for the studio dev UI only.
