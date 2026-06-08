import { useEffect, useState } from "react";
import "./App.css";
import { fetchCatalog, type SkinsCatalog } from "./fetchCatalog";

export default function App() {
  const [catalog, setCatalog] = useState<SkinsCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCatalog();
        if (!cancelled) setCatalog(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load catalog");
          setCatalog(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="studio">
      <header className="studio__hero">
        <h1>MyHomeGames skins</h1>
        <p className="studio__lead">
          Example themes for MyHomeGames Web. Each archive contains a full <code>bundle.css</code> plus{" "}
          <code>skin.json</code> — install from the main app under Settings → Appearance.
        </p>
      </header>

      <section className="studio__section">
        <h2>Download skins</h2>
        <p className="studio__hint">
          Official packages are published with <code>npm run release</code> on{" "}
          <a href="https://github.com/myhomegames/myhomegames-skins/releases">GitHub Releases</a>. This page lists
          the latest release and links to each <code>.mhg-skin.zip</code>.
        </p>
        {loading && <p className="studio__hint">Loading catalog…</p>}
        {error && (
          <p className="studio__error">Could not load the skin catalog ({error}).</p>
        )}
        {catalog && (
          <>
            <p className="studio__hint">
              Release <strong>{catalog.version ?? "latest"}</strong> on GitHub.
            </p>
            <ul className="studio__cards">
              {catalog.skins.map((s) => (
                <li key={s.id} className="studio__card">
                  {s.snapshotUrl && (
                    <img
                      className="studio__snapshot"
                      src={s.snapshotUrl}
                      alt={`${s.name} snapshot`}
                      loading="lazy"
                    />
                  )}
                  <h3>{s.name}</h3>
                  <p className="studio__id">{s.id}</p>
                  <a className="studio__dl" href={s.downloadUrl} download={s.zip}>
                    Download {s.zip}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="studio__section">
        <h2>Repository layout</h2>
        <ul className="studio__list">
          <li>
            <code>skins/&lt;id&gt;/skin.json</code> — display name and metadata
          </li>
          <li>
            <code>skins/&lt;id&gt;/bundle.css</code> — complete theme for that skin (required)
          </li>
          <li>
            <code>npm run release</code> — builds zips and publishes to GitHub Releases
          </li>
        </ul>
      </section>
    </div>
  );
}
