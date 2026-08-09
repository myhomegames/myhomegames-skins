/**
 * Copies each skins/<folder>/ (skin.json + bundle.css) into the server's * METADATA_PATH/skins/<uuid>/ layout — same result as POST /skins after upload.
 *
 * Env (first wins; also loaded from repo-root `.env` if unset in the shell):
 *   MHG_METADATA_PATH — preferred for this repo
 *   METADATA_PATH — same as myhomegames-server
 *
 * If neither is set, exits 0 and prints a skip message (safe for CI / plain build).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { loadRepoEnv, REPO_ROOT } from "./load-repo-env.mjs";

loadRepoEnv();

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
  /** @type {{ abs: string; rel: string }[]} */
  const files = [];
  function walk(dir, base = "") {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith(".")) continue;
      const abs = path.join(dir, ent.name);
      const rel = base ? `${base}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".css")) files.push({ abs, rel });
    }
  }
  walk(skinDir);
  if (files.length === 0) return null;
  const rank = (rel) => {
    const n = String(rel || "").replace(/\\/g, "/");
    if (n === "bundle.css") return [0, n];
    if (n === "components.css" || n.startsWith("components/")) return [1, n];
    if (n === "pages.css" || n.startsWith("pages/")) return [2, n];
    return [3, n];
  };
  files.sort((a, b) => {
    const ra = rank(a.rel);
    const rb = rank(b.rel);
    if (ra[0] !== rb[0]) return ra[0] - rb[0];
    return ra[1].localeCompare(rb[1]);
  });
  const css = files.map((f) => fs.readFileSync(f.abs, "utf8")).join("\n\n");
  return String(css).trim() ? css : null;
}

function syncSkinFolder(contentRoot, skinsDir) {
  const rawMeta = readJsonFile(path.join(contentRoot, "skin.json"), {});
  const meta =
    rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta) ? { ...rawMeta } : {};
  const metaName = typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : "";
  const name = metaName || path.basename(contentRoot) || "Skin";

  const cssProbe = readBundleCssFromSkinDir(contentRoot);
  if (cssProbe == null || !String(cssProbe).trim()) {
    console.warn(`Skip ${path.basename(contentRoot)}: missing or empty CSS`);
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
      "sync-install-to-metadata: skipped (set MHG_METADATA_PATH or METADATA_PATH in .env or the environment)"
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
    if (!fs.existsSync(jsonPath)) {
      continue;
    }
    if (!readBundleCssFromSkinDir(dir)) {
      continue;
    }
    syncSkinFolder(dir, skinsDir);
  }
}

main();
