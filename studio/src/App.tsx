import { useEffect, useState } from "react";
import "./App.css";

type Manifest = {
  skins: { id: string; name: string; zip: string }[];
};

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}skins-built.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Manifest;
        if (!cancelled) setManifest(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load manifest");
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
          Example themes and a small studio app. Archives are built from the live Plex CSS tree in{" "}
          <code>myhomegames-web</code> plus per-skin <code>tweak.css</code>.
        </p>
      </header>

      <section className="studio__section">
        <h2>Built archives</h2>
        <p className="studio__hint">
          Run <code>npm run dev</code> or <code>npm run build</code> from <code>studio/</code> to generate{" "}
          <code>public/zips/*.mhg-skin.zip</code>. Install them from the main app: Settings → Appearance → Choose
          archive.
        </p>
        {error && <p className="studio__error">Could not load skins-built.json ({error}). Run prep first.</p>}
        {manifest && (
          <ul className="studio__cards">
            {manifest.skins.map((s) => (
              <li key={s.id} className="studio__card">
                <h3>{s.name}</h3>
                <p className="studio__id">{s.id}</p>
                <a className="studio__dl" href={`${import.meta.env.BASE_URL}zips/${encodeURIComponent(s.zip)}`} download>
                  Download {s.zip}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="studio__section">
        <h2>Repository layout</h2>
        <ul className="studio__list">
          <li>
            <code>skins/&lt;id&gt;/skin.json</code> — display name and metadata
          </li>
          <li>
            <code>skins/&lt;id&gt;/tweak.css</code> — overrides appended after the full Plex bundle
          </li>
          <li>
            <code>scripts/build-zips.mjs</code> — reads <code>myhomegames-web/src/skins/plex/bundle.ts</code> import
            order, concatenates CSS, writes zip + <code>skins-built.json</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
