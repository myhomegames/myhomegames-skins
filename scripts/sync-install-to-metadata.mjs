/**
 * Copies each skins/<folder>/ (skin.json + bundle.css) into the server's * METADATA_PATH/skins/<uuid>/ layout — same result as POST /skins after upload.
 *
 * Env (first wins):
 *   MHG_METADATA_PATH — preferred for this repo
 *   METADATA_PATH — same as myhomegames-server
 *
 * If neither is set, exits 0 and prints a skip message (safe for CI / plain build).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SKINS = 24;

function isUuidSkinId(id) {
  return typeof id === "string" && UUID_RE.test(id);
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function countUuidSkinDirs(root) {
  if (!fs.existsSync(root)) return 0;
  return fs.readdirSync(root, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && isUuidSkinId(d.name)
  ).length;
}

function findExistingSkinIdByName(skinsDir, displayName) {
  const target = typeof displayName === "string" ? displayName.trim() : "";
  if (!target || !fs.existsSync(skinsDir)) return null;
  const matches = [];
  for (const ent of fs.readdirSync(skinsDir, { withFileTypes: true })) {
    if (!ent.isDirectory() || !isUuidSkinId(ent.name)) continue;
    const meta = readJsonFile(path.join(skinsDir, ent.name, "skin.json"), null);
    const n = meta && typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : "";
    if (n === target) matches.push(ent.name);
  }
  if (matches.length === 0) return null;
  matches.sort();
  return matches[0];
}

function readBundleCssFromSkinDir(skinDir) {
  const bundlePath = path.join(skinDir, "bundle.css");
  if (fs.existsSync(bundlePath)) {
    return fs.readFileSync(bundlePath, "utf8");
  }
  return null;
}

function syncSkinFolder(contentRoot, skinsDir) {
  const rawMeta = readJsonFile(path.join(contentRoot, "skin.json"), {});
  const meta =
    rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta) ? { ...rawMeta } : {};
  const metaName = typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : "";
  const name = metaName || path.basename(contentRoot) || "Skin";

  const cssProbe = readBundleCssFromSkinDir(contentRoot);
  if (cssProbe == null || !String(cssProbe).trim()) {
    console.warn(`Skip ${path.basename(contentRoot)}: missing or empty bundle.css`);
    return;
  }

  fs.mkdirSync(skinsDir, { recursive: true });

  const existingId = findExistingSkinIdByName(skinsDir, name);
  if (!existingId && countUuidSkinDirs(skinsDir) >= MAX_SKINS) {
    console.error(`Skip "${name}": server skins folder already has ${MAX_SKINS} skins (remove one or increase limit on server).`);
    return;
  }

  const id = existingId || crypto.randomUUID();
  const finalDir = path.join(skinsDir, id);
  if (fs.existsSync(finalDir)) {
    fs.rmSync(finalDir, { recursive: true, force: true });
  }
  fs.mkdirSync(finalDir, { recursive: true });

  for (const ent of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const src = path.join(contentRoot, ent.name);
    const dst = path.join(finalDir, ent.name);
    fs.cpSync(src, dst, { recursive: true });
  }

  const skinJsonPath = path.join(finalDir, "skin.json");
  const skinJson = {
    ...meta,
    name,
    id,
    installedAt: Date.now(),
  };
  fs.writeFileSync(skinJsonPath, JSON.stringify(skinJson, null, 2), "utf8");
  console.log(`Installed skin "${name}" → ${finalDir}`);
}

function main() {
  const metadataPath = process.env.MHG_METADATA_PATH || process.env.METADATA_PATH || "";
  if (!metadataPath.trim()) {
    console.log(
      "sync-install-to-metadata: skipped (set MHG_METADATA_PATH or METADATA_PATH to your server metadata directory)"
    );
    return;
  }

  const resolved = path.resolve(metadataPath.trim());
  if (!fs.existsSync(resolved)) {
    console.error(`sync-install-to-metadata: metadata path does not exist: ${resolved}`);
    process.exit(1);
  }

  const skinsSource = path.join(REPO_ROOT, "skins");
  if (!fs.existsSync(skinsSource)) {
    console.error("No skins/ directory in repo");
    process.exit(1);
  }

  const skinsDir = path.join(resolved, "skins");
  fs.mkdirSync(skinsDir, { recursive: true });

  for (const ent of fs.readdirSync(skinsSource, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith(".")) continue;
    const dir = path.join(skinsSource, ent.name);
    const jsonPath = path.join(dir, "skin.json");
    const bundlePath = path.join(dir, "bundle.css");
    if (!fs.existsSync(jsonPath) || !fs.existsSync(bundlePath)) {
      continue;
    }
    syncSkinFolder(dir, skinsDir);
  }
}

main();
