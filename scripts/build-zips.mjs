/**
 * Builds distributable .mhg-skin.zip files for each skin under skins/<id>/.
 *
 * Each skin must contain **skin.json** and **bundle.css** — a single, self-contained
 * theme (no merge with the web app’s default skin at zip time).
 *
 * Env:
 *   OUT_ZIPS — output directory (default: <repo>/dist/zips)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const OUT_ZIPS = process.env.OUT_ZIPS
  ? path.resolve(process.env.OUT_ZIPS)
  : path.join(REPO_ROOT, "dist", "zips");

function readSkinTitle(skinJsonPath) {
  try {
    const j = JSON.parse(fs.readFileSync(skinJsonPath, "utf8"));
    if (j && typeof j.name === "string" && j.name.trim()) return j.name.trim();
  } catch {
    /* ignore */
  }
  return null;
}

function zipSkinFolder(skinId, skinDir, outDir) {
  const skinJsonPath = path.join(skinDir, "skin.json");
  const bundlePath = path.join(skinDir, "bundle.css");
  if (!fs.existsSync(skinJsonPath)) {
    console.warn(`Skip ${skinId}: no skin.json`);
    return null;
  }
  if (!fs.existsSync(bundlePath)) {
    console.warn(`Skip ${skinId}: no bundle.css (each skin must ship a full stylesheet)`);
    return null;
  }
  const bundleCss = fs.readFileSync(bundlePath, "utf8");
  if (!String(bundleCss).trim()) {
    console.warn(`Skip ${skinId}: bundle.css is empty`);
    return null;
  }

  const zip = new AdmZip();
  zip.addFile("skin.json", Buffer.from(fs.readFileSync(skinJsonPath, "utf8"), "utf8"));
  zip.addFile("bundle.css", Buffer.from(bundleCss, "utf8"));

  fs.mkdirSync(outDir, { recursive: true });
  const zipName = `${skinId}.mhg-skin.zip`;
  const outFile = path.join(outDir, zipName);
  zip.writeZip(outFile);
  const kb = (bundleCss.length / 1024).toFixed(1);
  console.log(`Wrote ${outFile} (${kb} KB CSS)`);
  const title = readSkinTitle(skinJsonPath) || skinId;
  return { id: skinId, name: title, zip: zipName };
}

function main() {
  console.log(`OUT_ZIPS=${OUT_ZIPS}`);
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
    const entry = zipSkinFolder(name.name, dir, OUT_ZIPS);
    if (entry) manifest.push(entry);
  }
  const manifestPath = path.join(path.dirname(OUT_ZIPS), "skins-built.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ skins: manifest }, null, 2), "utf8");
  console.log(`Wrote ${manifestPath}`);
}

main();
