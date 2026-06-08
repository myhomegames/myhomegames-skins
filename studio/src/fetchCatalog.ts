/** GitHub repo for skin releases (override at build time via VITE_SKINS_GITHUB_REPO). */
const SKINS_GITHUB_REPO =
  (import.meta.env.VITE_SKINS_GITHUB_REPO as string | undefined)?.trim() || "myhomegames/myhomegames-skins";

export type CatalogSkin = {
  id: string;
  name: string;
  zip: string;
  downloadUrl: string;
  snapshotUrl?: string;
};

export type SkinsCatalog = {
  version: string | null;
  source: "release" | "local";
  skins: CatalogSkin[];
};

type RawManifest = {
  version?: string;
  repository?: string;
  skins?: Array<{
    id?: string;
    name?: string;
    zip?: string;
    downloadUrl?: string;
    snapshotUrl?: string;
    snapshot?: string;
  }>;
};

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = { tag_name: string; assets: GitHubAsset[] };

function normalizeSkin(
  entry: NonNullable<RawManifest["skins"]>[number],
  tag: string,
  ownerRepo: string
): CatalogSkin | null {
  if (!entry || typeof entry !== "object") return null;
  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  const name = typeof entry.name === "string" ? entry.name.trim() : id;
  const zip = typeof entry.zip === "string" ? entry.zip.trim() : id ? `${id}.mhg-skin.zip` : "";
  if (!id || !zip) return null;

  let downloadUrl = typeof entry.downloadUrl === "string" ? entry.downloadUrl.trim() : "";
  if (!downloadUrl) {
    downloadUrl = `https://github.com/${ownerRepo}/releases/download/${tag}/zips/${encodeURIComponent(zip)}`;
  }

  let snapshotUrl =
    typeof entry.snapshotUrl === "string" && entry.snapshotUrl.trim()
      ? entry.snapshotUrl.trim()
      : undefined;
  if (!snapshotUrl && typeof entry.snapshot === "string" && entry.snapshot.trim()) {
    const snap = entry.snapshot.trim();
    snapshotUrl = /^https?:\/\//i.test(snap)
      ? snap
      : `https://github.com/${ownerRepo}/releases/download/${tag}/${snap.replace(/^\.?\//, "")}`;
  }

  return { id, name, zip, downloadUrl, snapshotUrl };
}

export async function fetchReleaseCatalog(): Promise<SkinsCatalog> {
  const [owner, repo] = SKINS_GITHUB_REPO.split("/").map((s) => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    throw new Error("Invalid VITE_SKINS_GITHUB_REPO");
  }

  const releaseRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!releaseRes.ok) {
    throw new Error(`GitHub releases API: ${releaseRes.status}`);
  }

  const release = (await releaseRes.json()) as GitHubRelease;
  const tag = release.tag_name?.replace(/^v/i, "") ?? "";
  const manifestAsset = (release.assets || []).find((a) => a.name === "skins-built.json");
  if (!manifestAsset?.browser_download_url) {
    throw new Error("skins-built.json not found in latest release");
  }

  const manifestRes = await fetch(manifestAsset.browser_download_url);
  if (!manifestRes.ok) {
    throw new Error(`Manifest download: ${manifestRes.status}`);
  }

  const manifest = (await manifestRes.json()) as RawManifest;
  const ownerRepo =
    typeof manifest.repository === "string" && manifest.repository.includes("/")
      ? manifest.repository
      : SKINS_GITHUB_REPO;
  const version =
    (typeof manifest.version === "string" && manifest.version.trim()) || tag || null;
  const skins = (manifest.skins || [])
    .map((entry) => normalizeSkin(entry, tag || version || "", ownerRepo))
    .filter((s): s is CatalogSkin => s !== null);

  return { version, source: "release", skins };
}

/** Local manifest from `npm run dev` prep (studio/public only). */
export async function fetchLocalCatalog(): Promise<SkinsCatalog> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}skins-built.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as RawManifest;
  const skins = (data.skins || []).map((entry) => {
    if (!entry?.id) return null;
    const zip = entry.zip || `${entry.id}.mhg-skin.zip`;
    const snap = entry.snapshot?.trim();
    let snapshotUrl: string | undefined;
    if (snap) {
      snapshotUrl = /^https?:\/\//i.test(snap) ? snap : `${base}${snap.replace(/^\.?\//, "")}`;
    }
    return {
      id: entry.id,
      name: entry.name || entry.id,
      zip,
      downloadUrl: `${base}zips/${encodeURIComponent(zip)}`,
      snapshotUrl,
    } satisfies CatalogSkin;
  }).filter((s): s is CatalogSkin => s !== null);

  return { version: null, source: "local", skins };
}

export async function fetchCatalog(): Promise<SkinsCatalog> {
  try {
    return await fetchReleaseCatalog();
  } catch (releaseErr) {
    if (!import.meta.env.DEV) throw releaseErr;
    return fetchLocalCatalog();
  }
}
