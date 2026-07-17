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
 * Zip download URLs come from release assets. Snapshot previews use raw.githubusercontent.com
 * (release CDN serves octet-stream/attachment, which browsers won't show in <img>).
 */
function catalogFromReleaseAssets(assets: GitHubAsset[]): CatalogSkin[] {
  const skins: CatalogSkin[] = [];
  for (const zipAsset of assets) {
    if (!zipAsset.name.endsWith(SKIN_ZIP_SUFFIX)) continue;
    const fileName = zipAsset.name.includes("/")
      ? zipAsset.name.slice(zipAsset.name.lastIndexOf("/") + 1)
      : zipAsset.name;
    const parsed = parseSkinZipFileName(fileName);
    if (!parsed) continue;
    skins.push({
      id: parsed.id,
      name: parsed.id,
      zip: fileName,
      downloadUrl: zipAsset.browser_download_url,
    });
  }
  return skins;
}

function rawSkinFileUrl(owner: string, repo: string, ref: string, skinId: string, relativePath: string): string {
  const clean = relativePath.trim().replace(/^\.\//, "");
  const parts = clean.split("/").filter(Boolean).map(encodeURIComponent);
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/skins/${encodeURIComponent(skinId)}/${parts.join("/")}`;
}

async function enrichSkinsFromRepo(
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
        const data = (await res.json()) as { name?: string; snapshot?: string };
        const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : skin.name;
        const snapshotRel =
          typeof data.snapshot === "string" && data.snapshot.trim() ? data.snapshot.trim() : null;
        const snapshotUrl = snapshotRel
          ? rawSkinFileUrl(owner, repo, ref, skin.id, snapshotRel)
          : undefined;
        return { ...skin, name, snapshotUrl };
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

  skins = await enrichSkinsFromRepo(skins, owner, repo, ref);

  return { version: tag || null, skins };
}
