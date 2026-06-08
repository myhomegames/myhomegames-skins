#!/usr/bin/env node
/**
 * Fail fast before release-it falls back to the GitHub web UI (long changelog URL).
 */

if (process.env.GITHUB_ACTIONS === "true") {
  process.exit(0);
}

const token = String(process.env.GITHUB_TOKEN || "").trim();
if (token) {
  process.exit(0);
}

console.error(`
ERROR: GITHUB_TOKEN is not set.

release-it needs a GitHub Personal Access Token to create the release via API
and upload .mhg-skin.zip assets. Without it, release-it opens the GitHub web UI
with the full changelog in the URL, which often fails with:

  "Your request URL is too long."

Create a token:
  https://github.com/settings/tokens
  → Generate new token (classic) → enable scope "repo"

Then run:

  export GITHUB_TOKEN=ghp_your_token_here
  npm run release

See DEVELOPMENT.md for details.
`);

process.exit(1);
