/**
 * Runs before dev/build: produces studio/public/zips/*.mhg-skin.zip and skins-built.json
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outZips = path.resolve(__dirname, "..", "public", "zips");

const r = spawnSync(process.execPath, [path.join(repoRoot, "scripts", "build-zips.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
  env: { ...process.env, OUT_ZIPS: outZips },
});
if (r.status !== 0) process.exit(r.status ?? 1);
