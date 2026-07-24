#!/usr/bin/env node
/**
 * Warn when GITHUB_TOKEN is missing — release-it falls back to the GitHub web UI.
 */

import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

if (process.env.GITHUB_ACTIONS === "true") {
  process.exit(0);
}

const token = String(process.env.GITHUB_TOKEN || "").trim();
if (token) {
  process.exit(0);
}

console.warn(`
WARNING: GITHUB_TOKEN is not set.

release-it will open the GitHub "new release" page in the browser instead of using
the API. Skin zips are not uploaded automatically in that mode, and a long changelog
in the URL may fail with "Your request URL is too long."

Recommended:
  https://github.com/settings/tokens → Generate new token (classic) → scope "repo"
  Put GITHUB_TOKEN=ghp_... in .env (or export it), then:
  npm run release

See DEVELOPMENT.md for details.
`);
