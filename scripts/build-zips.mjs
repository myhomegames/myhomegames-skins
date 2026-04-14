/**
 * Builds distributable .mhg-skin.zip files for each skin under skins/<id>/.
 *
 * Each skin must contain **skin.json** and **bundle.css** — a single, self-contained
 * theme (no merge with the web app’s default skin at zip time).
 *
 * Env:
 *   OUT_ZIPS — output directory (default: <repo>/studio/public/zips)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const OUT_ZIPS = process.env.OUT_ZIPS
  ? path.resolve(process.env.OUT_ZIPS)
  : path.join(REPO_ROOT, "studio", "public", "zips");

function cleanBuildOutputs(outDir) {
  const parentDir = path.dirname(outDir);
  const snapshotsDir = path.join(parentDir, "snapshots");
  const manifestPath = path.join(parentDir, "skins-built.json");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(snapshotsDir, { recursive: true, force: true });
  fs.rmSync(manifestPath, { force: true });
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

function readSkinJson(skinJsonPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(skinJsonPath, "utf8"));
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return {};
}

function resolveManifestSnapshot(snapshotValue, skinId, skinDir, outDir) {
  if (typeof snapshotValue !== "string" || !snapshotValue.trim()) return null;
  const rawValue = snapshotValue.trim();
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  const sourcePath = path.resolve(skinDir, rawValue);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skip snapshot for ${skinId}: ${rawValue} not found`);
    return null;
  }
  const snapshotsDir = path.join(path.dirname(outDir), "snapshots");
  fs.mkdirSync(snapshotsDir, { recursive: true });
  const extension = path.extname(sourcePath) || ".png";
  const safeExt = extension.replace(/[^a-zA-Z0-9.]/g, "") || ".png";
  const outName = `${skinId}${safeExt}`;
  fs.copyFileSync(sourcePath, path.join(snapshotsDir, outName));
  return `snapshots/${outName}`;
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
  const skinJson = readSkinJson(skinJsonPath);
  zip.addFile("skin.json", Buffer.from(fs.readFileSync(skinJsonPath, "utf8"), "utf8"));
  zip.addFile("bundle.css", Buffer.from(bundleCss, "utf8"));
  if (typeof skinJson.snapshot === "string" && skinJson.snapshot.trim()) {
    const snapshotPath = path.resolve(skinDir, skinJson.snapshot.trim());
    if (fs.existsSync(snapshotPath)) {
      const snapshotZipPath = skinJson.snapshot.trim().replace(/^\.?\//, "");
      zip.addFile(snapshotZipPath, fs.readFileSync(snapshotPath));
    } else {
      console.warn(`Skip zip snapshot for ${skinId}: ${skinJson.snapshot} not found`);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const zipName = `${skinId}.mhg-skin.zip`;
  const outFile = path.join(outDir, zipName);
  zip.writeZip(outFile);
  const kb = (bundleCss.length / 1024).toFixed(1);
  console.log(`Wrote ${outFile} (${kb} KB CSS)`);
  const title = readSkinTitle(skinJsonPath) || skinId;
  const snapshot = resolveManifestSnapshot(skinJson.snapshot, skinId, skinDir, outDir);
  return snapshot ? { id: skinId, name: title, zip: zipName, snapshot } : { id: skinId, name: title, zip: zipName };
}

function main() {
  console.log(`OUT_ZIPS=${OUT_ZIPS}`);
  const skinsRoot = path.join(REPO_ROOT, "skins");
  if (!fs.existsSync(skinsRoot)) {
    console.error("No skins/ directory");
    process.exit(1);
  }
  cleanBuildOutputs(OUT_ZIPS);
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
