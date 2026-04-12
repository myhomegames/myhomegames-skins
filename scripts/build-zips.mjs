/**
 * Builds distributable .mhg-skin.zip files for each skin under skins/<id>/.
 * Each skin must contain skin.json and tweak.css (optional empty).
 * bundle.css inside the zip = concatenated Plex theme from myhomegames-web + tweak.
 *
 * Env:
 *   MYHOMEGAMES_WEB — path to myhomegames-web repo (default: ../../myhomegames-web from this script)
 *   OUT_ZIPS        — output directory (default: <repo>/dist/zips)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const DEFAULT_WEB = path.join(REPO_ROOT, "..", "myhomegames-web");
const MYHOMEGAMES_WEB = process.env.MYHOMEGAMES_WEB
  ? path.resolve(process.env.MYHOMEGAMES_WEB)
  : DEFAULT_WEB;

const OUT_ZIPS = process.env.OUT_ZIPS
  ? path.resolve(process.env.OUT_ZIPS)
  : path.join(REPO_ROOT, "dist", "zips");

const BUNDLE_TS = path.join(MYHOMEGAMES_WEB, "src", "skins", "plex", "bundle.ts");
const PLEX_ROOT = path.join(MYHOMEGAMES_WEB, "src", "skins", "plex");

function readPlexCssOrder() {
  if (!fs.existsSync(BUNDLE_TS)) {
    console.error(`Missing bundle.ts — set MYHOMEGAMES_WEB (got: ${MYHOMEGAMES_WEB})`);
    process.exit(1);
  }
  const src = fs.readFileSync(BUNDLE_TS, "utf8");
  const re = /from\s+"(\.\/[^"]+\.css)\?raw"/g;
  const files = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    files.push(m[1]);
  }
  if (files.length === 0) {
    console.error("No CSS imports found in bundle.ts");
    process.exit(1);
  }
  return files;
}

function concatPlexBundle() {
  const rels = readPlexCssOrder();
  const parts = [];
  for (const rel of rels) {
    const abs = path.join(PLEX_ROOT, rel.replace(/^\.\//, ""));
    if (!fs.existsSync(abs)) {
      console.error(`Missing CSS file: ${abs}`);
      process.exit(1);
    }
    parts.push(`/* --- ${rel} --- */\n`);
    parts.push(fs.readFileSync(abs, "utf8"));
  }
  return parts.join("\n\n");
}

function readSkinTitle(skinJsonPath) {
  try {
    const j = JSON.parse(fs.readFileSync(skinJsonPath, "utf8"));
    if (j && typeof j.name === "string" && j.name.trim()) return j.name.trim();
  } catch {
    /* ignore */
  }
  return null;
}

function zipSkinFolder(skinId, skinDir, plexCss, outDir) {
  const skinJsonPath = path.join(skinDir, "skin.json");
  const tweakPath = path.join(skinDir, "tweak.css");
  if (!fs.existsSync(skinJsonPath)) {
    console.warn(`Skip ${skinId}: no skin.json`);
    return null;
  }
  const tweak = fs.existsSync(tweakPath) ? fs.readFileSync(tweakPath, "utf8") : "";
  const bundleCss = `${plexCss}\n\n/* ========== skin: ${skinId} (tweak) ========== */\n${tweak}`;

  const zip = new AdmZip();
  zip.addFile("skin.json", Buffer.from(fs.readFileSync(skinJsonPath, "utf8"), "utf8"));
  zip.addFile("bundle.css", Buffer.from(bundleCss, "utf8"));

  fs.mkdirSync(outDir, { recursive: true });
  const zipName = `${skinId}.mhg-skin.zip`;
  const outFile = path.join(outDir, zipName);
  zip.writeZip(outFile);
  console.log(`Wrote ${outFile} (${(bundleCss.length / 1024).toFixed(1)} KB CSS)`);
  const title = readSkinTitle(skinJsonPath) || skinId;
  return { id: skinId, name: title, zip: zipName };
}

function main() {
  console.log(`MYHOMEGAMES_WEB=${MYHOMEGAMES_WEB}`);
  console.log(`OUT_ZIPS=${OUT_ZIPS}`);
  const plexCss = concatPlexBundle();
  const skinsRoot = path.join(REPO_ROOT, "skins");
  if (!fs.existsSync(skinsRoot)) {
    console.error("No skins/ directory");
    process.exit(1);
  }
  fs.mkdirSync(OUT_ZIPS, { recursive: true });
  /** @type {{ id: string; name: string; zip: string }[]} */
  const manifest = [];
  for (const name of fs.readdirSync(skinsRoot, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name.startsWith(".")) continue;
    const dir = path.join(skinsRoot, name.name);
    const entry = zipSkinFolder(name.name, dir, plexCss, OUT_ZIPS);
    if (entry) manifest.push(entry);
  }
  const manifestPath = path.join(path.dirname(OUT_ZIPS), "skins-built.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ skins: manifest }, null, 2), "utf8");
  console.log(`Wrote ${manifestPath}`);
}

main();
