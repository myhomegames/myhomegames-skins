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
  skins: CatalogSkin[];
};

type GitHubAsset = { name: string; browser_download_url: string };
type GitHubRelease = { tag_name: string; assets: GitHubAsset[] };

const GITHUB_JSON_ACCEPT = "application/vnd.github.v3+json";
const SKIN_ZIP_SUFFIX = ".mhg-skin.zip";

/** `<skinId>-<version>.mhg-skin.zip` (legacy: `<skinId>.mhg-skin.zip`). */
function parseSkinZipFileName(fileName: string): { id: string; version?: string } | null {
  if (!fileName.endsWith(SKIN_ZIP_SUFFIX)) return null;
  const base = fileName.slice(0, -SKIN_ZIP_SUFFIX.length);
  const versioned = base.match(/^(.+)-(\d+\.\d+\.\d+)$/);
  if (versioned) {
    return { id: versioned[1], version: versioned[2] };
  }
  return { id: base };
}

/**
 * Build catalog from release asset metadata (CORS-safe JSON from GitHub API).
 * Release asset downloads redirect to a CDN without ACAO, so we never fetch zip/json bodies in the browser.
 */
function catalogFromReleaseAssets(assets: GitHubAsset[]): CatalogSkin[] {
  const byName = new Map(assets.map((a) => [a.name, a]));

  const skins: CatalogSkin[] = [];
  for (const zipAsset of assets) {
    if (!zipAsset.name.endsWith(SKIN_ZIP_SUFFIX)) continue;
    const parsed = parseSkinZipFileName(zipAsset.name);
    if (!parsed) continue;
    const { id } = parsed;
    const snapshotAsset = byName.get(`${id}.jpg`) ?? byName.get(`snapshots/${id}.jpg`);
    skins.push({
      id,
      name: id,
      zip: zipAsset.name,
      downloadUrl: zipAsset.browser_download_url,
      snapshotUrl: snapshotAsset?.browser_download_url,
    });
  }
  return skins;
}

async function enrichSkinNames(
  skins: CatalogSkin[],
  owner: string,
  repo: string,
  ref: string
): Promise<CatalogSkin[]> {
  if (!ref) return skins;

  return Promise.all(
    skins.map(async (skin) => {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/skins/${encodeURIComponent(skin.id)}/skin.json`
        );
        if (!res.ok) return skin;
        const data = (await res.json()) as { name?: string };
        const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : skin.name;
        return { ...skin, name };
      } catch {
        return skin;
      }
    })
  );
}

export async function fetchCatalog(): Promise<SkinsCatalog> {
  const [owner, repo] = SKINS_GITHUB_REPO.split("/").map((s) => s.trim()).filter(Boolean);
  if (!owner || !repo) {
    throw new Error("Invalid VITE_SKINS_GITHUB_REPO");
  }

  const releaseRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    { headers: { Accept: GITHUB_JSON_ACCEPT } }
  );
  if (!releaseRes.ok) {
    throw new Error(`GitHub releases API: ${releaseRes.status}`);
  }

  const release = (await releaseRes.json()) as GitHubRelease;
  const tag = release.tag_name?.replace(/^v/i, "") ?? "";
  const ref = release.tag_name?.trim() || tag;
  const assets = release.assets ?? [];
  let skins = catalogFromReleaseAssets(assets);
  if (skins.length === 0) {
    throw new Error("No .mhg-skin.zip assets in latest release");
  }

  skins = await enrichSkinNames(skins, owner, repo, ref);

  return { version: tag || null, skins };
}
