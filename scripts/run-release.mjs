#!/usr/bin/env node
/**
 * Wrapper for release-it.
 * Enables NODE_DEBUG so release-it passes a valid Octokit logger (avoids log:null crash).
 * Runs in CI mode (--ci) so prompts are skipped, same as myhomegames-server.
 */

import { spawnSync } from "node:child_process";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

if (!process.env.NODE_DEBUG?.includes("release-it")) {
  process.env.NODE_DEBUG = [process.env.NODE_DEBUG, "release-it:config"]
    .filter(Boolean)
    .join(",");
}

const check = spawnSync("node", ["scripts/check-github-token.mjs"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (check.status !== 0) {
  process.exit(check.status ?? 1);
}

const result = spawnSync(
  "npx",
  ["release-it", "--no-increment", "--ci", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
