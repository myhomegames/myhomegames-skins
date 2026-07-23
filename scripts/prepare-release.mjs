/**
 * Build skin zips and a release manifest with GitHub download URLs for release-it assets.
 *
 * Output (under dist/release/):
 *   zips/*.mhg-skin.zip
 *   snapshots/*
 *   skins-built.json — catalog for myhomegames-web (downloadUrl per skin)
 */

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { loadRepoEnv, REPO_ROOT } from "./load-repo-env.mjs";

loadRepoEnv();

const RELEASE_ROOT = path.join(REPO_ROOT, "dist", "release");
const OUT_ZIPS = path.join(RELEASE_ROOT, "zips");

function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  const version = typeof pkg.version === "string" ? pkg.version.trim() : "";
  if (!version) throw new Error("package.json version is missing");
  return version;
}

function resolveGithubRepo() {
  const fromEnv = process.env.MHG_SKINS_GITHUB_REPO || process.env.GITHUB_REPOSITORY || "";
  const trimmed = fromEnv.trim();
  if (trimmed.includes("/")) return trimmed;
  return "myhomegames/myhomegames-skins";
}

function releaseAssetUrl(ownerRepo, tag, assetPath) {
  const normalized = assetPath.replace(/^\.?\//, "");
  return `https://github.com/${ownerRepo}/releases/download/${tag}/${normalized}`;
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

function readSkinVersion(skinJson) {
  const version = skinJson && typeof skinJson.version === "string" ? skinJson.version.trim() : "";
  if (!version || !/^\d+\.\d+\.\d+/.test(version)) return null;
  return version.split("-")[0];
}

/** Published archive name: `<skinId>-<version>.mhg-skin.zip` */
function buildSkinZipFileName(skinId, version) {
  return `${skinId}-${version}.mhg-skin.zip`;
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

function resolveManifestSnapshot(snapshotValue, skinId, skinDir) {
  if (typeof snapshotValue !== "string" || !snapshotValue.trim()) return null;
  const rawValue = snapshotValue.trim();
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  const sourcePath = path.resolve(skinDir, rawValue);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skip snapshot for ${skinId}: ${rawValue} not found`);
    return null;
  }
  const snapshotsDir = path.join(RELEASE_ROOT, "snapshots");
  fs.mkdirSync(snapshotsDir, { recursive: true });
  const extension = path.extname(sourcePath) || ".png";
  const safeExt = extension.replace(/[^a-zA-Z0-9.]/g, "") || ".png";
  const outName = `${skinId}${safeExt}`;
  fs.copyFileSync(sourcePath, path.join(snapshotsDir, outName));
  return `snapshots/${outName}`;
}

function zipSkinFolder(skinId, skinDir) {
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

  const skinJson = readSkinJson(skinJsonPath);
  const skinVersion = readSkinVersion(skinJson);
  if (!skinVersion) {
    console.warn(`Skip ${skinId}: skin.json version must be a semver string (e.g. 1.0.0)`);
    return null;
  }

  const zip = new AdmZip();
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

  fs.mkdirSync(OUT_ZIPS, { recursive: true });
  const zipName = buildSkinZipFileName(skinId, skinVersion);
  const outFile = path.join(OUT_ZIPS, zipName);
  zip.writeZip(outFile);
  const kb = (bundleCss.length / 1024).toFixed(1);
  console.log(`Wrote ${outFile} (${kb} KB CSS)`);
  const title = readSkinTitle(skinJsonPath) || skinId;
  const snapshot = resolveManifestSnapshot(skinJson.snapshot, skinId, skinDir);
  const base = { id: skinId, name: title, version: skinVersion, zip: zipName };
  return snapshot ? { ...base, snapshot } : base;
}

function buildReleaseZips() {
  const skinsRoot = path.join(REPO_ROOT, "skins");
  if (!fs.existsSync(skinsRoot)) {
    console.error("No skins/ directory");
    process.exit(1);
  }

  /** @type {{ id: string; name: string; zip: string; snapshot?: string }[]} */
  const manifest = [];
  for (const name of fs.readdirSync(skinsRoot, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name.startsWith(".")) continue;
    const dir = path.join(skinsRoot, name.name);
    const entry = zipSkinFolder(name.name, dir);
    if (entry) manifest.push(entry);
  }

  const manifestPath = path.join(RELEASE_ROOT, "skins-built.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ skins: manifest }, null, 2), "utf8");
  console.log(`Wrote ${manifestPath}`);
}

function enhanceManifest(version, ownerRepo) {
  const manifestPath = path.join(RELEASE_ROOT, "skins-built.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Missing ${manifestPath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const skins = Array.isArray(raw.skins) ? raw.skins : [];

  const enhanced = skins.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const id = typeof entry.id === "string" ? entry.id : "";
    const version = typeof entry.version === "string" ? entry.version.trim() : "";
    const zip =
      typeof entry.zip === "string"
        ? entry.zip
        : version
          ? buildSkinZipFileName(id, version)
          : `${id}.mhg-skin.zip`;
    const downloadUrl = releaseAssetUrl(ownerRepo, version, `zips/${zip}`);
    const out = { ...entry, zip, downloadUrl };
    if (typeof entry.snapshot === "string" && entry.snapshot.trim()) {
      const snap = entry.snapshot.trim();
      if (/^https?:\/\//i.test(snap)) {
        out.snapshotUrl = snap;
      } else {
        out.snapshotUrl = releaseAssetUrl(ownerRepo, version, snap);
      }
    }
    return out;
  });

  const payload = {
    version,
    repository: ownerRepo,
    skins: enhanced,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${manifestPath} (${enhanced.length} skins, tag ${version})`);
}

function main() {
  const version = readPackageVersion();
  const ownerRepo = resolveGithubRepo();
  fs.rmSync(RELEASE_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUT_ZIPS, { recursive: true });
  console.log(`Preparing release ${version} → ${RELEASE_ROOT}`);
  console.log(`GitHub repo: ${ownerRepo}`);
  buildReleaseZips();
  enhanceManifest(version, ownerRepo);
}

main();
