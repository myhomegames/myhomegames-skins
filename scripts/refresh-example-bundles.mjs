/**
 * Maintainer tool: writes skins/example-emerald/bundle.css and skins/example-amber/bundle.css
 * as a full stylesheet by concatenating the current Plex tree from myhomegames-web plus
 * the example accent blocks (not used at zip time — shipped skins are only bundle.css).
 *
 * Run when the Plex baseline in myhomegames-web changes and you want to refresh the demos.
 *
 *   MYHOMEGAMES_WEB=/path/to/myhomegames-web node scripts/refresh-example-bundles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const DEFAULT_WEB = path.join(REPO_ROOT, "..", "myhomegames-web");
const MYHOMEGAMES_WEB = process.env.MYHOMEGAMES_WEB
  ? path.resolve(process.env.MYHOMEGAMES_WEB)
  : DEFAULT_WEB;

const BUNDLE_TS = path.join(MYHOMEGAMES_WEB, "src", "skins", "plex", "bundle.ts");
const PLEX_ROOT = path.join(MYHOMEGAMES_WEB, "src", "skins", "plex");

const ACCENT = {
  "example-emerald": `/* example-emerald accents */
.mhg-header-container {
  background: linear-gradient(90deg, #0c1812 0%, #0d0d0d 55%);
  border-bottom: 2px solid #1db954;
}

.cover-hover-effect:hover,
*:hover > .cover-hover-effect {
  outline-color: #1db954;
}
`,
  "example-amber": `/* example-amber accents */
.mhg-header-container {
  background: linear-gradient(90deg, #1a1208 0%, #0d0d0d 55%);
  border-bottom: 2px solid #e5a00d;
}

.cover-hover-effect:hover,
*:hover > .cover-hover-effect {
  outline-color: #f5b041;
}
`,
};

function readPlexCssOrder() {
  const src = fs.readFileSync(BUNDLE_TS, "utf8");
  const re = /from\s+"(\.\/[^"]+\.css)\?raw"/g;
  const files = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    files.push(m[1]);
  }
  return files;
}

function concatPlexBundle() {
  const rels = readPlexCssOrder();
  const parts = [];
  for (const rel of rels) {
    const abs = path.join(PLEX_ROOT, rel.replace(/^\.\//, ""));
    parts.push(`/* --- ${rel} --- */\n`);
    parts.push(fs.readFileSync(abs, "utf8"));
  }
  return parts.join("\n\n");
}

function main() {
  if (!fs.existsSync(BUNDLE_TS)) {
    console.error(`Missing ${BUNDLE_TS} — set MYHOMEGAMES_WEB`);
    process.exit(1);
  }
  const plex = concatPlexBundle();
  for (const id of ["example-emerald", "example-amber"]) {
    const accent = ACCENT[id];
    if (!accent) continue;
    const out = path.join(REPO_ROOT, "skins", id, "bundle.css");
    const body = `${plex}\n\n${accent}`;
    fs.writeFileSync(out, body, "utf8");
    console.log(`Wrote ${out} (${(body.length / 1024).toFixed(1)} KB)`);
  }
}

main();
