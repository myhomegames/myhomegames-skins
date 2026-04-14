/**
 * Maintainer tool: writes skins/example-emerald/bundle.css
 * as a full stylesheet from the committed Plex skin (skins/plex/bundle.css) plus accent blocks.
 *
 * Run when skins/plex/bundle.css changes and you want to refresh the demo themes.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const PLEX_BUNDLE = path.join(REPO_ROOT, "skins", "plex", "bundle.css");

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
};

function main() {
  if (!fs.existsSync(PLEX_BUNDLE)) {
    console.error(`Missing ${PLEX_BUNDLE}`);
    process.exit(1);
  }
  const plex = fs.readFileSync(PLEX_BUNDLE, "utf8");
  for (const id of ["example-emerald"]) {
    const accent = ACCENT[id];
    if (!accent) continue;
    const out = path.join(REPO_ROOT, "skins", id, "bundle.css");
    const body = `${plex}\n\n${accent}`;
    fs.writeFileSync(out, body, "utf8");
    console.log(`Wrote ${out} (${(body.length / 1024).toFixed(1)} KB)`);
  }
}

main();
