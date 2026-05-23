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
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
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

function runBuildZips() {
  const script = path.join(REPO_ROOT, "scripts", "build-zips.mjs");
  const result = spawnSync(process.execPath, [script], {
    cwd: REPO_ROOT,
    env: { ...process.env, OUT_ZIPS },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function enhanceManifest(version, ownerRepo) {
  const manifestPath = path.join(RELEASE_ROOT, "skins-built.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Missing ${manifestPath} — build-zips did not produce a manifest`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const skins = Array.isArray(raw.skins) ? raw.skins : [];

  const enhanced = skins.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const id = typeof entry.id === "string" ? entry.id : "";
    const zip = typeof entry.zip === "string" ? entry.zip : `${id}.mhg-skin.zip`;
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
  runBuildZips();
  enhanceManifest(version, ownerRepo);
}

main();
